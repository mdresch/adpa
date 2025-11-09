/**
 * Comprehensive Error Handler Middleware
 * 
 * Centralized error handling for all routes with detailed logging and user-friendly responses
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  
  // Default error
  let error = {
    statusCode: 500,
    message: 'Internal server error',
    isOperational: false
  };

  // Handle known errors
  if (err instanceof AppError) {
    error = {
      statusCode: err.statusCode,
      message: err.message,
      isOperational: err.isOperational
    };
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError') {
    error = {
      statusCode: 400,
      message: err.message,
      isOperational: true
    };
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Invalid token',
      isOperational: true
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Token expired',
      isOperational: true
    };
  }

  // Handle database errors
  if (err.name === 'SequelizeValidationError') {
    error = {
      statusCode: 400,
      message: 'Validation error',
      isOperational: true
    };
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    error = {
      statusCode: 409,
      message: 'Resource already exists',
      isOperational: true
    };
  }

  // Log error
  if (error.statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      url: req.url,
      method: req.method,
      statusCode: error.statusCode
    });
  }

  // Send response
  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      statusCode: error.statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    }
  });
}

// ============================================================================
// ASYNC HANDLER WRAPPER
// ============================================================================

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// NOT FOUND HANDLER
// ============================================================================

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`Route ${req.url}`);
  next(error);
}
