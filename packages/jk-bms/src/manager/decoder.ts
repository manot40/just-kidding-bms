import type { BMSStatus, CellDetail, DeviceStatus, JK04Status } from './types';

import { Buffer } from 'buffer';
import { DeviceProtocol, ERRORS_JK02_TABLE, MIN_RESPONSE_SIZE } from './const';

/**
 * Build a request frame (20 bytes)
 * Header: AA 55 90 EB
 */
export function buildFrame(address: number, value: number, length: number): Buffer {
  const frame = Buffer.alloc(20);
  frame[0] = 0xaa;
  frame[1] = 0x55;
  frame[2] = 0x90;
  frame[3] = 0xeb;
  frame[4] = address;
  frame[5] = length;
  frame.writeUInt32LE(value, 6);
  // bytes 10-18 are padding (0x00)
  frame[19] = crc(frame.subarray(0, 19));
  return frame;
}

/** Simple checksum: sum of all bytes */
export function crc(data: Uint8Array<ArrayBuffer>): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) & 0xff;
  }
  return sum;
}

/** Check if buffer starts with response preamble */
export function isResponsePreamble(data: Buffer): boolean {
  return data.length >= 4 && data[0] === 0x55 && data[1] === 0xaa && data[2] === 0xeb && data[3] === 0x90;
}

/** Parse little-endian 16-bit from buffer */
function get16bit(data: Buffer, offset: number): number {
  return data.readUInt16LE(offset);
}

/** Parse little-endian 32-bit from buffer */
function get32bit(data: Buffer, offset: number): number {
  return data.readUInt32LE(offset);
}

/** Parse IEEE 754 float from 4 bytes */
function getFloat(data: Buffer, offset: number): number {
  return data.readFloatLE(offset);
}

/** Parse signed 32-bit little-endian */
function getInt32bit(data: Buffer, offset: number): number {
  return data.readInt32LE(offset);
}

/** Parse signed 16-bit little-endian */
function getInt16bit(data: Buffer, offset: number): number {
  return data.readInt16LE(offset);
}

/** Decode error bitmask to string array */
function decodeErrors(bitmask: number, bits: number): string[] {
  const errors: string[] = [];
  for (let i = 0; i < bits; i++) {
    if ((bitmask & (1 << i)) === 0) continue;
    const label = i < ERRORS_JK02_TABLE.length ? ERRORS_JK02_TABLE[i] : null;
    if (label) errors.push(label);
  }
  return errors;
}

/** Read null-terminated ASCII string from buffer */
function readString(data: Buffer, offset: number, maxLen: number): string {
  let end = offset;
  while (end < offset + maxLen && data[end] !== 0x00) end++;
  return data.toString('ascii', offset, end);
}

/** Format total runtime to human readable string */
export function formatTotalRuntime(seconds: number): string {
  const years = Math.floor(seconds / (24 * 3600 * 365));
  seconds %= 24 * 3600 * 365;
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  return parts.join(' ') || '0h';
}

/** Decode JK02 cell info frame (0x02) */
export function decodeJK02CellInfo(data: Buffer, protocol: DeviceProtocol): Omit<BMSStatus, 'devStatus'> {
  const is32S = protocol === DeviceProtocol.JK02_32S;
  const isJK02 = [DeviceProtocol.JK02_24S, DeviceProtocol.JK02_32S].includes(protocol);

  if (!isJK02) throw new Error('Protocol is not of JK02!');

  /** @modified used to be: `is32S ? 16 : 0` */
  const offset = 16;
  const cells = 24 + (is32S ? 8 : 0);
  const cellData: CellDetail[] = [];

  let minCellVoltage = 100.0;
  let maxCellVoltage = -100.0;
  let averageCellVoltage = 0.0;
  let minVoltageCell = 0;
  let maxVoltageCell = 0;
  let cellsEnabled = 0;

  // Parse cell voltages (offset 6, 2 bytes per cell, 0.001V)
  // Parse cell resistances (offset 64+offset, 2 bytes per cell, 0.001Ohm)
  for (let i = 0; i < cells; i++) {
    const voltage = get16bit(data, i * 2 + 6) * 0.001;
    const resistance = get16bit(data, i * 2 + 64 + offset) * 0.001;

    cellData.push({ voltage, resistance });

    if (voltage > 0) {
      averageCellVoltage += voltage;
      cellsEnabled++;
    }
    if (voltage > 0 && voltage < minCellVoltage) {
      minCellVoltage = voltage;
      minVoltageCell = i + 1;
    }
    if (voltage > maxCellVoltage) {
      maxCellVoltage = voltage;
      maxVoltageCell = i + 1;
    }
  }

  if (cellsEnabled > 0) {
    averageCellVoltage /= cellsEnabled;
  }

  const offset2 = offset * 2;
  const offsetOpt = (is32S ? 16 : 0) * 2;

  // Total voltage at 118 + offset2 (4 bytes, 0.001V)
  const totalVoltage = get32bit(data, 118 + offset2) * 0.001;

  // Current at 126 + offset2 (signed 32-bit, 0.001A)
  const current = getInt32bit(data, 126 + offset2) * 0.001;

  // Power = V * I
  const power = totalVoltage * current;
  const chargingPower = Math.max(0, power);
  const dischargingPower = Math.abs(Math.min(0, power));

  // Temperatures
  const tempSensor1 = getInt16bit(data, 130 + offset2) * 0.1;
  const tempSensor2 = getInt16bit(data, 132 + offset2) * 0.1;

  let mosfetTemp: number | undefined;
  let errorsBitmask: number;
  let errors: string[];

  if (is32S) {
    // JK02_32S: errors at 134+offset2 (32-bit)
    errorsBitmask = get32bit(data, 134 + offset2);
    errors = decodeErrors(errorsBitmask, 32);
  } else {
    /** @modified JK02_24S: MOS temp at 134+offset2 */
    mosfetTemp = getInt16bit(data, 222 + offset2) * 0.1;
    // Errors at 136+offset2 (16-bit)
    errorsBitmask = get16bit(data, 136 + offset2);
    errors = decodeErrors(errorsBitmask, 16);
  }

  // Balancing current at 138+offset2
  const balancingCurrent = getInt16bit(data, 138 + offset2) * 0.001;

  // Balancer status at 140+offset2
  const balancerStatus = data[140 + offset2];
  const isBalancing = balancerStatus !== 0x00;

  // SOC at 141+offset2
  const stateOfCharge = data[141 + offset2];

  // Capacity remaining at 142+offset2
  const capacityRemaining = get32bit(data, 142 + offset2) * 0.001;

  // Full charge capacity at 146+offset2
  const fullChargeCapacity = get32bit(data, 146 + offset2) * 0.001;

  // Charging cycles at 150+offset2
  const chargingCycles = get32bit(data, 150 + offset2);

  // Total charging cycle capacity at 154+offset2
  const totalChargingCycleCapacity = get32bit(data, 154 + offset2) * 0.001;

  // SOH at 158+offset2
  const stateOfHealth = data[158 + offset2];

  // Total runtime at 162+offset2
  // const totalRuntime = get32bit(data, 162 + offset2);

  // @modified MOSFET states at 166-168+offset2
  const isCharging = data[166 + offsetOpt] !== 0x00;
  const isDischarging = data[167 + offsetOpt] !== 0x00;
  const isPrecharging = data[168 + offsetOpt] !== 0x00;

  // Heating at 183+offset2
  const isHeating = data[183 + offset2] !== 0x00;

  // Heating current at 204+offset2
  const heatingCurrent = getInt16bit(data, 204 + offset2) * 0.001;

  const result: Omit<BMSStatus, 'devStatus'> = {
    cellStatus: {
      cells: cellData,
      minCellVoltage,
      maxCellVoltage,
      deltaCellVoltage: maxCellVoltage - minCellVoltage,
      averageCellVoltage,
      minVoltageCell,
      maxVoltageCell,
    },

    packStatus: {
      totalVoltage,
      current,
      power,
      balancingCurrent,
      heatingCurrent,
      chargingPower,
      dischargingPower,
      stateOfCharge,
      stateOfHealth,
      capacityRemaining,
      fullChargeCapacity,
      chargingCycles,
      totalChargingCycleCapacity,
    },

    devFlags: {
      isBalancing,
      isCharging,
      isDischarging,
      isPrecharging,
      isHeating,
      balancerStatus,
    },

    temperatures: {
      sensor1: tempSensor1,
      sensor2: tempSensor2,
      mosfet: mosfetTemp,
    },

    errors,
    errorsBitmask,
  };

  // JK02_32S specific fields
  if (is32S) {
    result.temperatures = {
      ...result.temperatures!,
      sensor3: getInt16bit(data, 222 + offset2) * 0.1,
      sensor4: getInt16bit(data, 224 + offset2) * 0.1,
      sensor5: getInt16bit(data, 226 + offset2) * 0.1,
    };

    const batteryTypeId = data[243 + offset2];
    const batteryTypes = ['LFP', 'Li-ion', 'LTO'];
    result.batteryType = batteryTypes[batteryTypeId] || `Unknown (${batteryTypeId})`;

    const chargeStatusId = data[248 + offset2];
    const chargeStatuses = ['Bulk', 'Absorption', 'Float'];
    result.chargeStatus = chargeStatuses[chargeStatusId] || `Unknown (${chargeStatusId})`;

    result.emergencyTimeCountdown = get16bit(data, 186 + offset2);
    result.dryContact1 = (data[249 + offset2] & 0x02) !== 0;
    result.dryContact2 = (data[249 + offset2] & 0x04) !== 0;
  }

  return result;
}

/** Decode JK04 cell info frame (0x02) */
export function decodeJK04CellInfo(data: Buffer): JK04Status {
  const cells = 24;
  const cellData: CellDetail[] = [];
  let minCellVoltage = 100.0;
  let maxCellVoltage = -100.0;
  let averageCellVoltage = 0.0;
  let minVoltageCell = 0;
  let maxVoltageCell = 0;
  let cellsEnabled = 0;
  let totalVoltage = 0.0;

  // Cell voltages: 4 bytes per cell, IEEE float, offset 6
  // Cell resistances: 4 bytes per cell, IEEE float, offset 102
  for (let i = 0; i < cells; i++) {
    const voltage = getFloat(data, i * 4 + 6);
    const resistance = getFloat(data, i * 4 + 102);

    cellData.push({ voltage, resistance });
    totalVoltage += voltage;

    if (voltage > 0) {
      averageCellVoltage += voltage;
      cellsEnabled++;
    }
    if (voltage > 0 && voltage < minCellVoltage) {
      minCellVoltage = voltage;
      minVoltageCell = i + 1;
    }
    if (voltage > maxCellVoltage) {
      maxCellVoltage = voltage;
      maxVoltageCell = i + 1;
    }
  }

  if (cellsEnabled > 0) {
    averageCellVoltage /= cellsEnabled;
  }

  const isBalancing = data[220] !== 0x00;
  const balancerStatus = data[220];
  const balancingCurrent = getFloat(data, 222);
  // const totalRuntime = get32bit(data, 286);

  return {
    cellStatus: {
      cells: cellData,
      minCellVoltage,
      maxCellVoltage,
      deltaCellVoltage: maxCellVoltage - minCellVoltage,
      averageCellVoltage,
      minVoltageCell,
      maxVoltageCell,
    },
    packStatus: {
      totalVoltage,
      balancingCurrent,
    },
    devFlags: {
      isBalancing,
      balancerStatus,
    },
  };
}

/**
 * Decode device info frame (0x03)
 */
export function decodeDeviceInfo(data: Buffer): DeviceStatus {
  const deviceModel = readString(data, 6, 16);
  const hardwareVersion = readString(data, 22, 8);
  const softwareVersion = readString(data, 30, 8);
  const uptime = get32bit(data, 38);
  const powerOnCount = get32bit(data, 42);
  // const deviceName = readString(data, 46, 16);
  // const passcode = readString(data, 62, 16);

  let manufacturingDate = '';
  if (data[78] !== 0x00) {
    manufacturingDate = '20' + readString(data, 78, 6);
  }

  const serialNumber = readString(data, 86, 11);

  return {
    deviceModel,
    hardwareVersion,
    softwareVersion,
    powerOnCount,
    manufacturingDate,
    serialNumber,
    totalRuntime: uptime,
  };
}

/** Decode settings frame (0x01) - optional, returns raw settings object */
export function decodeSettings(data: Buffer, protocolVersion: DeviceProtocol): Record<string, number> {
  const is32S = protocolVersion === DeviceProtocol.JK02_32S;
  const settings: Record<string, number> = {};

  settings.smartSleepVoltage = get32bit(data, 6) * 0.001;
  settings.cellUVP = get32bit(data, 10) * 0.001;
  settings.cellUVPR = get32bit(data, 14) * 0.001;
  settings.cellOVP = get32bit(data, 18) * 0.001;
  settings.cellOVPR = get32bit(data, 22) * 0.001;
  settings.balanceTriggerVoltage = get32bit(data, 26) * 0.001;
  settings.powerOffVoltage = get32bit(data, 46) * 0.001;
  settings.maxChargeCurrent = get32bit(data, 50) * 0.001;
  settings.maxDischargeCurrent = get32bit(data, 62) * 0.001;
  settings.maxBalanceCurrent = get32bit(data, 78) * 0.001;
  settings.chargeOTP = get32bit(data, 82) * 0.1;
  settings.dischargeOTP = get32bit(data, 90) * 0.1;
  settings.mosOTP = getInt32bit(data, 106) * 0.1;
  settings.cellCount = get32bit(data, 114);

  if (is32S) {
    settings.heatingStartTemp = data[284];
    settings.heatingStopTemp = data[285];
  }

  return settings;
}

/** Determine frame type from assembled response */
export function getFrameType(data: Uint8Array<ArrayBuffer>): number {
  if (data.length < 5) return -1;
  return data[4];
}

/**
 * Validate CRC of assembled frame
 */
export function validateCrc(data: Uint8Array<ArrayBuffer>): boolean {
  if (data.length < MIN_RESPONSE_SIZE) return false;
  const frameSize = 300; // Fixed frame size per C++ implementation
  const computed = crc(data.subarray(0, frameSize - 1));
  const remote = data[frameSize - 1];
  return computed === remote;
}
