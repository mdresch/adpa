import { Request, Response, NextFunction } from 'express';
import { DBGuard } from '../modules/infrastructure/DBGuard';

export const dbCircuitBreakerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (DBGuard.isOpen()) {
    // Return HTTP 503 instantly when the circuit breaker is open
    return res.status(503).json({
      error: 'Service Unavailable: Database Circuit Breaker Open'
    });
  }
  next();
};
