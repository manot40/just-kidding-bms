import type { BMSConfig, BMSStatus, ConnectionState } from './types';

import { BMSManager } from './manager';
import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseBMSResult {
  bms: BMSStatus;
  state: ConnectionState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  requestCellInfo: () => Promise<void>;
  requestDeviceInfo: () => Promise<void>;
  requestLogbook: () => Promise<void>;
}

/**
 * React hook to interact with JK-BMS via BLE
 *
 * @example
 * const { status, connect, disconnect } = useBMS({ adapter: new WebBluetoothLE() });
 *
 * useEffect(() => {
 *   connect();
 *   return () => disconnect();
 * }, []);
 */
export function useBMS(config: BMSConfig): UseBMSResult {
  const managerRef = useRef<BMSManager | null>(null);

  const [bms, setBms] = useState<BMSStatus>(BMSManager.getInitialStatus());
  const [state, setState] = useState<ConnectionState>({
    error: null,
    isConnected: false,
    isConnecting: false,
  });

  useEffect(() => {
    const manager = (managerRef.current ??= new BMSManager(config));

    const unsubscribe = manager.addListener(({ bms, state }) => {
      setBms(bms);
      setState(state);
    });

    return () => {
      unsubscribe();
      manager.destroy();
      managerRef.current = null;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    await managerRef.current?.connect();
  }, []);

  const disconnect = useCallback(async () => {
    await managerRef.current?.disconnect();
  }, []);

  const requestCellInfo = useCallback(async () => {
    await managerRef.current?.requestCellInfo();
  }, []);

  const requestDeviceInfo = useCallback(async () => {
    await managerRef.current?.requestDeviceInfo();
  }, []);

  const requestLogbook = useCallback(async () => {
    await managerRef.current?.requestLogbook();
  }, []);

  return {
    bms,
    state,
    connect,
    disconnect,
    requestCellInfo,
    requestDeviceInfo,
    requestLogbook,
  };
}
