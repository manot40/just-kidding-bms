import type { BluetoothLE } from './ble/types';
import type { DeviceProtocol } from './manager/const';

export interface BatteryPackStatus {
  totalVoltage: number; // V
  current: number; // A
  heatingCurrent: number; // A
  balancingCurrent: number; // A
  power: number; // W
  chargingPower: number; // W
  dischargingPower: number; // W
  stateOfCharge: number; // %
  stateOfHealth: number; // %
  capacityRemaining: number; // Ah
  fullChargeCapacity: number; // Ah
  chargingCycles: number;
  totalChargingCycleCapacity: number; // Ah
}

export interface CellData {
  type: 'LFP' | 'Li-ion' | 'LTO';
  cells: CellDetail[];
  minCellVoltage: number;
  maxCellVoltage: number;
  deltaCellVoltage: number;
  averageCellVoltage: number;
  minVoltageCell: number;
  maxVoltageCell: number;
}

export interface CellDetail {
  voltage: number; // V
  resistance: number; // Ohm
}

export interface DeviceFlags {
  isBalancing: boolean;
  isCharging: boolean;
  isDischarging: boolean;
  isPrecharging: boolean;
  isHeating: boolean;
  /** Bitmask */
  balancerStatus: number;
}

export interface DeviceStatus {
  deviceModel: string;
  hardwareVersion: string;
  softwareVersion: string;
  serialNumber: string;
  manufacturingDate: string;
  powerOnCount: number;
  totalRuntime: number;
}

export interface TemperatureData {
  sensor1: number; // °C
  sensor2: number; // °C
  sensor3?: number; // °C (JK02_32S)
  sensor4?: number; // °C (JK02_32S)
  sensor5?: number; // °C (JK02_32S)
  mosfet?: number; // °C
}

export interface BMSStatus {
  // Cell data
  cellStatus: CellData;
  // Status Flags
  devFlags: DeviceFlags;
  // Device info
  devStatus: DeviceStatus;
  // Battery pack status
  packStatus: BatteryPackStatus;
  // Temperatures
  temperatures: TemperatureData;
  // Errors
  errors: string[];
  errorsBitmask: number;
  // JK02_32S extras
  batteryType?: string;
  chargeStatus?: string;
  emergencyTimeCountdown?: number;
  dryContact1?: boolean;
  dryContact2?: boolean;
}

export interface JK04Status {
  cellStatus: Omit<CellData, 'type'>;
  devFlags: Pick<DeviceFlags, 'isBalancing' | 'balancerStatus'>;
  packStatus: Pick<BatteryPackStatus, 'totalVoltage' | 'balancingCurrent'>;
}

export interface BMSConfig {
  /** BluetoothLE adapter to use */
  ble: BluetoothLE;
  /**
   * Device protocol hint for first-connect data parsing
   * @default DeviceProtocol.JK02_24S
   */
  protocolHint?: DeviceProtocol;
  /**
   * Data polling interval, in milliseconds
   * @default 2000
   */
  pollInterval?: number;
  /**
   * Max acceptable unresponsive response count
   * before BLE connection completely dropped
   * @default 10
   */
  maxNoResponseCount?: number;
}

export type ConnectionState = {
  error: null | string;
  isConnected: boolean;
  isConnecting: boolean;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type BMSListener = (data: { bms: BMSStatus; state: ConnectionState }) => void;
