import type { BluetoothLE } from './bt/types';
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
  cellStatus: CellData;
  devFlags: Pick<DeviceFlags, 'isBalancing' | 'balancerStatus'>;
  packStatus: Pick<BatteryPackStatus, 'totalVoltage' | 'balancingCurrent'>;
}

export interface BMSConfig {
  adapter: BluetoothLE;
  protocol?: DeviceProtocol;
  pollInterval?: number; // ms, default 2000
  maxNoResponseCount?: number; // default 10
}

export type ConnectionState = {
  error: null | string;
  isConnected: boolean;
  isConnecting: boolean;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type BMSListener = (data: { bms: BMSStatus; state: ConnectionState }) => void;
