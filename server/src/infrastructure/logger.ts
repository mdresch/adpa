import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// 1. Create the storage for the Correlation ID
export const asyncLocalStorage = new AsyncLocalStorage<string>();

// 2. Configure Pino
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: (process.env.NODE_ENV === 'development' && !process.env.NEXT_RUNTIME) ? {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss Z' }
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
