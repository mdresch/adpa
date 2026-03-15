import { logger as baseLogger, childLogger as baseChildLogger } from '../infrastructure/logger';
import pino from 'pino';

/**
 * FlexibleLogMethod enables both:
 * 1. Standard Pino: logger.info(obj, msg)
 * 2. Legacy Winston: logger.info(msg, obj)
 */
type FlexibleLogMethod = {
  (msg: string, ...args: any[]): void;
  (obj: object, msg?: string, ...args: any[]): void;
  (msg: string, obj: object, ...args: any[]): void;
};

/**
 * FlexibleLogger interface extends Pino's Logger but with the bridge signatures
 */
export interface FlexibleLogger extends Omit<pino.Logger, 'info' | 'error' | 'warn' | 'debug' | 'trace' | 'fatal' | 'child'> {
  info: FlexibleLogMethod;
  error: FlexibleLogMethod;
  warn: FlexibleLogMethod;
  debug: FlexibleLogMethod;
  trace: FlexibleLogMethod;
  fatal: FlexibleLogMethod;
  child(bindings: pino.Bindings): FlexibleLogger;
}

/**
 * wrap implementation uses a Proxy to intercept calls and handle argument swapping
 */
const wrap = (log: any): FlexibleLogger => {
  return new Proxy(log, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === 'function' && ['info', 'error', 'warn', 'debug', 'trace', 'fatal'].includes(prop as string)) {
        return (first: any, second: any, ...args: any[]) => {
          // If Winston style: (message: string, meta: object)
          if (typeof first === 'string' && second && typeof second === 'object' && !(second instanceof Error)) {
            return value.call(target, second, first, ...args);
          }
          // If Winston style with Error: (message: string, error: Error)
          if (typeof first === 'string' && second instanceof Error) {
             return value.call(target, second, first, ...args);
          }
          return value.call(target, first, second, ...args);
        };
      }
      if (prop === 'child') {
        return (bindings: any) => wrap(target.child(bindings));
      }
      return value;
    }
  });
};

const logger = wrap(baseLogger);
const childLogger = (meta: Record<string, any>) => wrap(baseChildLogger(meta));

export { logger, childLogger };
export default logger;
