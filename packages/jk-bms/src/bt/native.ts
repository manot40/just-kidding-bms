import type { BluetoothLE, Device as UnifiedDevice, Characteristic, NotificationCallback } from './types';

import { Buffer } from 'buffer';
import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

export class NativeBluetoothLE implements BluetoothLE {
  private manager: BleManager;
  private deviceCache = new Map<string, Device>();
  private subscriptions = new Map<string, Subscription>();

  constructor() {
    this.manager = new BleManager();
  }

  async requestAndConnectDevice(serviceUuids: string[]): Promise<UnifiedDevice> {
    return new Promise((resolve, reject) => {
      this.manager.startDeviceScan(serviceUuids, null, async (error, device) => {
        if (error || !device) {
          this.manager.stopDeviceScan();
          return reject(error);
        }

        this.manager.stopDeviceScan();

        try {
          const connectedDevice = await device.connect();
          await connectedDevice.discoverAllServicesAndCharacteristics();

          this.deviceCache.set(connectedDevice.id, connectedDevice);

          resolve({
            id: connectedDevice.id,
            name: connectedDevice.name || 'Unknown RN Device',
          });
        } catch (connectError) {
          reject(connectError);
        }
      });
    });
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    await this.manager.cancelDeviceConnection(deviceId);
    this.deviceCache.delete(deviceId);
  }

  async getCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<Characteristic> {
    // BLE-PLX requires discovering services before accessing characteristics.
    // If requestAndConnectDevice was used, this is already done.
    return { deviceId, serviceUuid, characteristicUuid };
  }

  async writeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    data: Buffer
  ): Promise<void> {
    const device = this.deviceCache.get(deviceId);
    if (!device) throw new Error('Device not connected');

    const base64Data = data.toString('base64');
    await device.writeCharacteristicWithResponseForService(serviceUuid, characteristicUuid, base64Data);
  }

  async startNotification(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    onData: NotificationCallback
  ): Promise<void> {
    const cacheKey = `${deviceId}:${serviceUuid}:${characteristicUuid}`;

    const subscription = this.manager.monitorCharacteristicForDevice(
      deviceId,
      serviceUuid,
      characteristicUuid,
      (error, characteristic) => {
        if (error) {
          console.error('Notification Error:', error);
          return;
        }
        if (characteristic?.value) {
          const buffer = Buffer.from(characteristic.value, 'base64');
          onData(buffer);
        }
      }
    );

    this.subscriptions.set(cacheKey, subscription);
  }

  async stopNotification(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<void> {
    const cacheKey = `${deviceId}:${serviceUuid}:${characteristicUuid}`;
    const subscription = this.subscriptions.get(cacheKey);

    if (subscription) {
      subscription.remove();
      this.subscriptions.delete(cacheKey);
    }
  }
}
