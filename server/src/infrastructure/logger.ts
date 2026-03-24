import { pino } from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// 1. Create the storage for the Correlation ID
export const asyncLocalStorage = new AsyncLocalStorage<string>();

// 2. Configure Pino
const isDev = process.env.NODE_ENV === 'development' && !process.env.NEXT_RUNTIME;

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev ? {
    targets: [
      {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss Z' },
        level: process.env.LOG_LEVEL || 'info'
      },
      {
        target: 'pino/file',
        options: { destination: 'd:/Source/adpa/server/logs/server.log', mkdir: true },
        level: process.env.LOG_LEVEL || 'info'
      }
    ]
  } : undefined,
  // 3. Automatically inject the correlation ID into EVERY log
  mixin() {
    const correlationId = asyncLocalStorage.getStore();
    return correlationId ? { correlationId } : {};
  }
});

// For backward compatibility and specialized child logging
export function childLogger(meta: Record<string, any>) {
  return logger.child({ ...meta });
}
