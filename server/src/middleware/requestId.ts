import { v4 as uuidv4 } from 'uuid'
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id']?.toString() || uuidv4()
  req.requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}

export default requestIdMiddleware
