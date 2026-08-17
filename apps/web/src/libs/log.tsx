import { createContext, use } from 'react';

export type LogData = { id: string; dt: string; level: LogLevel; value: string };
export type LogLevel = 'info' | 'warn' | 'error';

export const LogContext = createContext<LogData[]>([]);
export const useLogContext = () => use(LogContext);
