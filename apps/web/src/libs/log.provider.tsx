import { useCallback, useEffect, useState } from 'react';
import { LogContext, type LogData, type LogLevel } from './log';

const oriConsole = globalThis.console;

const LogProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogData[]>([]);

  const commonLogger = useCallback(
    (level: LogLevel) =>
      (...data: any[]) =>
        setLogs((logs) => [
          {
            id: crypto.randomUUID(),
            dt: new Date().toISOString(),
            level,
            value: data.map((v) => (typeof v == 'string' ? v : JSON.stringify(v))).join(' '),
          },
          ...logs,
        ]),
    []
  );

  useEffect(() => {
    globalThis.console = {
      ...oriConsole,
      log: commonLogger('info'),
      info: commonLogger('info'),
      warn: commonLogger('warn'),
      error: commonLogger('error'),
    };

    return () => {
      globalThis.console = oriConsole;
    };
  }, [commonLogger]);

  return <LogContext value={logs}>{children}</LogContext>;
};

export default LogProvider;
