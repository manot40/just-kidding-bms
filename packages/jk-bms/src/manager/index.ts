import type { BluetoothLE, Device } from '../bt/types';
import type { BMSConfig, BMSListener, BMSStatus, ConnectionState, ConnectionStatus } from '../types';

import { Buffer } from 'buffer';

import {
  buildFrame,
  isResponsePreamble,
  validateCrc,
  decodeJK02CellInfo,
  decodeJK04CellInfo,
  decodeDeviceInfo,
  getFrameType,
} from './decoder';

import {
  Command,
  DeviceProtocol,
  FrameType,
  JK_BMS_SERVICE_UUID,
  JK_BMS_CHARACTERISTIC_UUID,
  MIN_RESPONSE_SIZE,
  MAX_RESPONSE_SIZE,
} from './const';

export class BMSManager {
  static readonly serviceUUID = JK_BMS_SERVICE_UUID;
  static readonly characteristicUUID = JK_BMS_CHARACTERISTIC_UUID;

  private state: ConnectionState;
  private status: BMSStatus;
  private device: Device | null = null;
  private adapter: BluetoothLE;

  private connStatus: ConnectionStatus = 'disconnected';
  private frameBuffer: Buffer = Buffer.alloc(0);
  private statusNotificationReceived = false;
  private noResponseCount = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<BMSListener> = new Set();

  constructor(private config: BMSConfig) {
    this.state = { isConnected: false, isConnecting: false, error: null };
    this.status = BMSManager.getInitialStatus();
    this.adapter = config.adapter;
  }

  static getInitialStatus(): BMSStatus {
    return {
      cellStatus: {
        cells: [],
        minCellVoltage: 0,
        maxCellVoltage: 0,
        deltaCellVoltage: 0,
        averageCellVoltage: 0,
        minVoltageCell: 0,
        maxVoltageCell: 0,
      },

      packStatus: {
        totalVoltage: 0,
        current: 0,
        power: 0,
        chargingPower: 0,
        dischargingPower: 0,
        stateOfCharge: 0,
        stateOfHealth: 0,
        capacityRemaining: 0,
        fullChargeCapacity: 0,
        chargingCycles: 0,
        totalChargingCycleCapacity: 0,
        balancingCurrent: 0,
        heatingCurrent: 0,
      },

      devFlags: {
        isBalancing: false,
        isCharging: false,
        isDischarging: false,
        isPrecharging: false,
        isHeating: false,
        balancerStatus: 0,
      },

      devStatus: {
        deviceModel: '',
        hardwareVersion: '',
        softwareVersion: '',
        serialNumber: '',
        manufacturingDate: '',
        powerOnCount: 0,
        totalRuntime: 0,
      },

      errors: [],
      errorsBitmask: 0,
      temperatures: { sensor1: 0, sensor2: 0 },
    };
  }

  // --- Public API ---

  public addListener(listener: BMSListener): () => void {
    this.listeners.add(listener);
    listener({ bms: this.status, state: { ...this.state } });
    return () => this.listeners.delete(listener);
  }

  public async connect(): Promise<void> {
    if (this.connStatus === 'connecting' || this.connStatus === 'connected') {
      return;
    }

    this.setConnectionState('connecting', null);
    this.statusNotificationReceived = false;

    try {
      // Connect to device using the Unified Web Adapter
      // The browser will prompt the user to select the BMS
      this.device = await this.adapter.requestAndConnectDevice([BMSManager.serviceUUID]);

      // Setup notification monitoring using the Unified interface
      await this.setupNotifications();

      this.setConnectionState('connected');
      this.noResponseCount = 0;

      // Request device info first
      await this.requestDeviceInfo();

      // Start polling
      this.startPolling();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      this.setConnectionState('error', message);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    this.stopPolling();

    if (this.device) {
      try {
        await this.adapter.stopNotification(
          this.device.id,
          BMSManager.serviceUUID,
          BMSManager.characteristicUUID
        );
        await this.adapter.disconnectDevice(this.device.id);
      } catch {
        // Ignore disconnect errors
      }
      this.device = null;
    }

    this.frameBuffer = Buffer.alloc(0);
    this.statusNotificationReceived = false;
    this.setConnectionState('disconnected');
  }

  public async requestCellInfo(): Promise<void> {
    await this.writeCommand(Command.CellInfo);
  }

  public async requestDeviceInfo(): Promise<void> {
    await this.writeCommand(Command.DeviceInfo);
  }

  public async requestLogbook(): Promise<void> {
    await this.writeCommand(Command.LogBook);
  }

  public isConnected(): boolean {
    return this.connStatus === 'connected';
  }

  public getStatus(): BMSStatus {
    return { ...this.status };
  }

  public destroy(): void {
    this.disconnect();
  }

  // --- Private Methods ---

  private setConnectionState(state: ConnectionStatus, error?: string | null) {
    this.connStatus = state;

    const newState = {
      ...this.state,
      isConnected: state === 'connected',
      isConnecting: state === 'connecting',
    };
    if (typeof error !== 'undefined') newState.error = error;

    this.state = newState;
    this.emit();
  }

  private emit() {
    const currentStatus = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener({ bms: currentStatus, state: { ...this.state } });
      } catch (e) {
        console.error('BMS listener error:', e);
      }
    });
  }

  private async setupNotifications(): Promise<void> {
    if (!this.device) return;

    try {
      await this.adapter.startNotification(
        this.device.id,
        BMSManager.serviceUUID,
        BMSManager.characteristicUUID,
        (data) => this.handleNotification(data)
      );
    } catch (error) {
      console.error('Notification setup error:', error);
      this.handleDisconnect();
    }
  }

  private handleNotification(data: Buffer) {
    if (this.frameBuffer.length > MAX_RESPONSE_SIZE) {
      console.warn('Frame buffer overflow, resetting');
      this.frameBuffer = Buffer.alloc(0);
    }

    if (isResponsePreamble(data)) {
      this.frameBuffer = Buffer.alloc(0);
    }

    this.frameBuffer = Buffer.concat([this.frameBuffer, data]);

    if (this.frameBuffer.length >= MIN_RESPONSE_SIZE) {
      if (!validateCrc(this.frameBuffer)) {
        console.warn('CRC check failed');
        this.frameBuffer = Buffer.alloc(0);
        return;
      }

      this.decodeFrame(this.frameBuffer);
      this.frameBuffer = Buffer.alloc(0);
    }
  }

  private decodeFrame(data: Buffer) {
    this.noResponseCount = 0;

    const device = this.config.protocol ?? DeviceProtocol.JK02_24S;
    const frameType = getFrameType(data);

    switch (frameType) {
      case FrameType.Settings:
        break;

      case FrameType.CellInfo:
        let cellInfo: Partial<BMSStatus>;
        if (device === DeviceProtocol.JK04) {
          cellInfo = decodeJK04CellInfo(data) as BMSStatus;
        } else {
          cellInfo = decodeJK02CellInfo(data, device);
        }

        this.status = { ...this.status, ...cellInfo };
        this.statusNotificationReceived = true;
        this.emit();
        break;

      case FrameType.DeviceInfo:
        const devStatus = decodeDeviceInfo(data);
        this.status = { ...this.status, devStatus };
        this.emit();
        break;

      case FrameType.LogBook:
        break;

      default:
        console.warn('Unsupported frame type:', frameType);
    }
  }

  private async writeCommand(address: number, value = 0x00000000, length = 0x00): Promise<void> {
    if (!this.device) return;

    const frame = buildFrame(address, value, length);

    try {
      await this.adapter.writeCharacteristic(
        this.device.id,
        BMSManager.serviceUUID,
        BMSManager.characteristicUUID,
        frame
      );
    } catch (error) {
      console.error('Failed to write command:', (error as Error).message);
      // If writing fails, it often means the device disconnected abruptly
      this.handleDisconnect();
    }
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.config.pollInterval || 2000);
    this.poll();
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll() {
    if (this.connStatus !== 'connected') return;

    this.noResponseCount++;
    if (this.noResponseCount >= (this.config.maxNoResponseCount || 20)) {
      this.setConnectionState('error', 'No response from BMS');
      this.handleDisconnect();
      return;
    }

    if (!this.statusNotificationReceived || this.noResponseCount > 0) {
      try {
        await this.requestCellInfo();
      } catch (e) {
        console.error('Poll request failed:', e);
      }
    }
  }

  private handleDisconnect() {
    this.stopPolling();
    this.setConnectionState('disconnected');
    this.frameBuffer = Buffer.alloc(0);
    this.statusNotificationReceived = false;
  }
}
