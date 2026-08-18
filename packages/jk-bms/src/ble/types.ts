import type { Buffer } from 'buffer';

export interface Device {
  id: string;
  name: string | null;
}

export interface Characteristic {
  serviceUuid: string;
  characteristicUuid: string;
  deviceId: string;
}

export type NotificationCallback = (data: Buffer) => void;

export interface BluetoothLE {
  /**
   * Web: Prompts user to select a device.
   * RN: Scans for devices and returns the first one matching the service, or takes a UI callback.
   */
  requestAndConnectDevice(serviceUuids: string[]): Promise<Device>;

  disconnectDevice(deviceId: string): Promise<void>;

  getCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<Characteristic>;

  writeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    data: Buffer
  ): Promise<void>;

  startNotification(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    onData: NotificationCallback
  ): Promise<void>;

  stopNotification(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<void>;
}
