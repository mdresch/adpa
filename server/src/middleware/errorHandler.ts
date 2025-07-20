import type { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  })

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development"

  res.status(500).json({
    error: "Internal server error",
    ...(isDevelopment && { details: error.message, stack: error.stack }),
  })
}
