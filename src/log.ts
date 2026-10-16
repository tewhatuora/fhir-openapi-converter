/**
 * Logging used by the generator. It has no Node dependencies so the generator
 * can run in a browser; the CLI registers its winston logger with `setLog`.
 */
type LogFn = (message: string, ...meta: unknown[]) => void;

export interface Log {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

const noop: LogFn = () => {};
let current: Log = { debug: noop, info: noop, warn: noop, error: noop };

export const setLog = (log: Log): void => {
  current = log;
};

export const log: Log = {
  debug: (message, ...meta) => current.debug(message, ...meta),
  info: (message, ...meta) => current.info(message, ...meta),
  warn: (message, ...meta) => current.warn(message, ...meta),
  error: (message, ...meta) => current.error(message, ...meta),
};
