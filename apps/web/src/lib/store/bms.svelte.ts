import { BMSManager, type ConnectionState as ConnState } from '@manot40/jk-bms';
import { WebBluetoothLE } from '@manot40/jk-bms/ble-web';

import { browser } from '$app/env';

export type ConnectionState = ConnState & { hasConnected: boolean };

let listener: (() => void) | undefined;
const DEFAULT_CONN: ConnectionState = {
  error: null,
  isConnected: false,
  isConnecting: false,
  hasConnected: false,
};

export const ble = new WebBluetoothLE();
export const manager = new BMSManager({ ble });
export const status = $state(BMSManager.getInitialStatus());
export const conn = $state({ ...DEFAULT_CONN });

export function cleanup() {
  listener?.();
  Object.assign(status, DEFAULT_CONN);
  Object.keys(conn).forEach((key) => delete conn[key as keyof typeof conn]);
}

if (browser) {
  listener = manager.addListener(({ bms, state }) => {
    conn.hasConnected ||= state.isConnected;
    Object.assign(status, bms);
    Object.assign(conn, state);
  });
}
