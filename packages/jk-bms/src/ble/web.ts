import type { BluetoothLE, Device, Characteristic, NotificationCallback } from './types';

import { Buffer } from 'buffer';

export class WebBluetoothLE implements BluetoothLE {
  private deviceCache = new Map<string, BluetoothDevice>();
  private characteristicCache = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private notificationListeners = new Map<string, (event: Event) => void>();

  async requestAndConnectDevice(serviceUuids: string[]): Promise<Device> {
    const device = await navigator.bluetooth.requestDevice({
      filters: serviceUuids.map((uuid) => ({ services: [uuid] })),
    });

    if (!device.gatt) throw new Error('GATT server not found on device');

    await device.gatt.connect();
    this.deviceCache.set(device.id, device);

    return { id: device.id, name: device.name || 'Unknown Web Device' };
  }

  async getCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<Characteristic> {
    const device = this.deviceCache.get(deviceId);
    if (!device?.gatt?.connected) throw new Error('Device not connected');

    const service = await device.gatt.getPrimaryService(serviceUuid);
    const characteristic = await service.getCharacteristic(characteristicUuid);

    // Cache the characteristic for easier notification management
    const cacheKey = `${deviceId}:${serviceUuid}:${characteristicUuid}`;
    this.characteristicCache.set(cacheKey, characteristic);

    return { deviceId, serviceUuid, characteristicUuid };
  }

  async writeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    data: Buffer
  ): Promise<void> {
    const cacheKey = `${deviceId}:${serviceUuid}:${characteristicUuid}`;
    let characteristic = this.characteristicCache.get(cacheKey);

    if (!characteristic) {
      await this.getCharacteristic(deviceId, serviceUuid, characteristicUuid);
      characteristic = this.characteristicCache.get(cacheKey)!;
    }

    await characteristic.writeValueWithResponse(data.buffer);
  }

  async startNotification(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    onData: NotificationCallback
  ): Promise<void> {
    const cacheKey = `${deviceId}:${serviceUuid}:${characteristicUuid}`;
    let characteristic = this.characteristicCache.get(cacheKey);

    if (!characteristic) {
      await this.getCharacteristic(deviceId, serviceUuid, characteristicUuid);
      characteristic = this.characteristicCache.get(cacheKey)!;
    }

    await characteristic.startNotifications();

    const listener = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (target.value) {
        const dv = target.value as DataView<ArrayBuffer>;
        const buffer = Buffer.from(dv.buffer, dv.byteOffset, dv.byteLength);
        onData(buffer);
      }
    };

    characteristic.addEventListener('characteristicvaluechanged', listener);
    this.notificationListeners.set(cacheKey, listener);
  }

  async stopNotification(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<void> {
    const cacheKey = `${deviceId}:${serviceUuid}:${characteristicUuid}`;
    const characteristic = this.characteristicCache.get(cacheKey);
    const listener = this.notificationListeners.get(cacheKey);

    if (characteristic && listener) {
      await characteristic.stopNotifications();
      characteristic.removeEventListener('characteristicvaluechanged', listener);
      this.characteristicCache.delete(cacheKey);
      this.notificationListeners.delete(cacheKey);
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.deviceCache.get(deviceId);
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
  }
}
