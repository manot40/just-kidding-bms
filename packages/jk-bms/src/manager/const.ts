export const JK_BMS_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
export const JK_BMS_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

export const MIN_RESPONSE_SIZE = 300;
export const MAX_RESPONSE_SIZE = 384 + 16;

export enum Command {
  CellInfo = 0x96,
  DeviceInfo = 0x97,
  LogBook = 0xa1,
}

export enum DeviceProtocol {
  JK04 = 0x01,
  JK02_24S = 0x02,
  JK02_32S = 0x03,
}

export enum FrameType {
  Settings = 0x01,
  CellInfo = 0x02,
  DeviceInfo = 0x03,
  LogBook = 0x05,
}

export enum FrameVersion {
  JK02_24S = 0x02,
  JK02_32S = 0x03,
}

export const ERRORS_JK02_TABLE: (string | null)[] = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null, // 0-7
  null,
  null,
  null,
  'MOS over temperature protection',
  'MOS over-temperature protection is released',
  'Abnormal current sensor',
  'Abnormal release of current sensor',
  'Abnormal coprocessor communication',
  'Abnormal cancellation of coprocessor communication',
  'Cell overcharge protection',
  'Cell overcharge protection is released',
  'Battery overcharge protection',
  'Battery overcharge protection is released',
  'Charge overcurrent protection',
  'Charge overcurrent protection is released',
  'Charge short circuit protection',
  'Charge short circuit protection is released',
  'Charge over temperature protection',
  'Charge over temperature protection is released',
  'Charge low temperature protection',
  'Charge low temperature protection is released',
  'Cell undervoltage protection',
  'Cell undervoltage protection is released',
  'Battery undervoltage protection',
  'Battery undervoltage protection is released',
  'Discharge overcurrent protection',
  'Discharge overcurrent protection is released',
  'Discharge short circuit protection',
  'Discharge short circuit protection released',
  'Discharge over temperature protection',
  'Discharge over-temperature protection is released',
];
