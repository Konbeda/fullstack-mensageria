import pino, { type Logger, type LoggerOptions } from 'pino';

export type { Logger };

export function createLogger(name: string, level = 'info'): Logger {
  const options: LoggerOptions = { name, level };
  return pino(options);
}
