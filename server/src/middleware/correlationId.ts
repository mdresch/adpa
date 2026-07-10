import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { asyncLocalStorage } from '../infrastructure/logger';

/**
 * Middleware to handle Correlation IDs (x-correlation-id).
 * Uses AsyncLocalStorage to make the ID available throughout the request lifecycle without passing it manually.
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || (req.headers['x-request-id'] as string) || randomUUID();
  
  // Attach to response headers so the frontend can track it
  res.setHeader('x-correlation-id', correlationId);

  // Run the entire request context inside the AsyncLocalStorage scope
  asyncLocalStorage.run(correlationId, () => {
    next();
  });
};

export default correlationIdMiddleware;
