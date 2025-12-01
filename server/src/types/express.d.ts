/**
 * Express Request Type Extensions
 * Adds custom properties to Express Request interface
 */

import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
        name?: string
        permissions?: string[]
      }
      requestId?: string
    }
  }
}

export {}

