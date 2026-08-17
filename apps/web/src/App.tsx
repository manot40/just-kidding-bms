import './App.css';

import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';

import { useRef, useMemo } from 'react';

import { useBMS } from '@manot40/jk-bms/react';
import { WebBluetoothLE } from '@manot40/jk-bms/ble-web';

import { useLogContext } from './libs/log';

function App() {
  const bt = useRef(new WebBluetoothLE());
  const logs = useLogContext();

  const { state, bms, connect, disconnect } = useBMS({ adapter: bt.current });

  const disabled = useMemo(() => !('bluetooth' in navigator), []);

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div style={{ maxWidth: '24rem', padding: '1rem' }}>
          <h1>Get started</h1>
          <div style={{ overflow: 'auto', maxHeight: '12rem' }}>
            <code>{JSON.stringify(bms, null, 2)}</code>
          </div>
        </div>
        <button
          type="button"
          className="counter"
          disabled={disabled || state.isConnecting}
          onClick={state.isConnected ? disconnect : connect}>
          {state.isConnected ? 'Disconnect' : 'Scan'} BMS
        </button>
      </section>

      <div className="ticks"></div>

      {logs.length > 0 && (
        <section id="next-steps">
          <div id="docs">
            <div style={{ overflow: 'auto', maxHeight: '12rem' }}>
              <code style={{ display: 'flex', flexDirection: 'column' }}>
                {logs.map((log) => (
                  <div key={log.id}>
                    <span
                      style={{
                        color: log.level == 'error' ? 'red' : log.level == 'warn' ? 'yellow' : 'blue',
                      }}>
                      [{log.level.toUpperCase()}]
                    </span>{' '}
                    [{log.dt}] {log.value}
                  </div>
                ))}
              </code>
            </div>
          </div>
        </section>
      )}

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  );
}

export default App;
