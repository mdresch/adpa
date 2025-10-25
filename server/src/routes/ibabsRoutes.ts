/**
 * iBabs OAuth Routes
 * 
 * Handles OAuth 2.0 authentication endpoints for iBabs board portal integration.
 */

import express, { Request, Response } from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import { ibabsService } from "../services/ibabsService"

const router = express.Router()

/**
 * Start OAuth flow - Generate authorization URL
 * GET /api/ibabs/auth/start
 * 
 * Only admins can connect iBabs integration
 */
router.get("/auth/start", 
  authenticateToken,
  requirePermission("integrations.manage"),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: "User not authenticated" 
        })
      }
      
      log.info("Starting iBabs OAuth flow", { userId })
      
      const authorizationUrl = await ibabsService.getAuthorizationUrl(userId)
      
      res.json({
        success: true,
        authorizationUrl
      })
    } catch (error: any) {
      log.error("Failed to start OAuth flow", { error: error.message })
      res.status(500).json({
        success: false,
        error: "Failed to start OAuth flow",
        details: error.message
      })
    }
  }
)

/**
 * OAuth callback handler
 * GET /api/ibabs/auth/callback
 * 
 * Handles the OAuth callback from iBabs
 */
router.get("/auth/callback", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  
  try {
    const { code, state, error, error_description } = req.query
    
    // Check for OAuth errors
    if (error) {
      log.error("OAuth error from iBabs", { error, error_description })
      return res.status(400).json({
        success: false,
        error: error_description || error || "OAuth authorization failed"
      })
    }
    
    // Validate required parameters
    if (!code || !state) {
      log.error("Missing code or state parameter", { code: !!code, state: !!state })
      return res.status(400).json({
        success: false,
        error: "Missing authorization code or state parameter"
      })
    }
    
    log.info("Processing iBabs OAuth callback")
    
    // Handle callback and exchange code for tokens
    const userId = await ibabsService.handleCallback(code as string, state as string)
    
    // Redirect to success page (frontend)
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/integrations/ibabs?status=success`)
  } catch (error: any) {
    log.error("OAuth callback failed", { error: error.message })
    
    // Redirect to error page (frontend)
    const errorMessage = encodeURIComponent(error.message || "OAuth callback failed")
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/integrations/ibabs?status=error&message=${errorMessage}`)
  }
})

/**
 * Get connection status
 * GET /api/ibabs/auth/status
 * 
 * Regular users can view connection status
 */
router.get("/auth/status",
  authenticateToken,
  requirePermission("integrations.read"),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated"
        })
      }
      
      log.debug("Getting iBabs connection status", { userId })
      
      const status = await ibabsService.getConnectionStatus(userId)
      
      res.json({
        success: true,
        ...status
      })
    } catch (error: any) {
      log.error("Failed to get connection status", { error: error.message })
      res.status(500).json({
        success: false,
        error: "Failed to get connection status",
        details: error.message
      })
    }
  }
)

/**
 * Disconnect iBabs and revoke access
 * DELETE /api/ibabs/auth/disconnect
 * 
 * Only admins can disconnect iBabs integration
 */
router.delete("/auth/disconnect",
  authenticateToken,
  requirePermission("integrations.manage"),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const userId = (req as any).user?.id
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated"
        })
      }
      
      log.info("Disconnecting iBabs", { userId })
      
      await ibabsService.revokeAccess(userId)
      
      res.json({
        success: true,
        message: "iBabs connection removed successfully"
      })
    } catch (error: any) {
      log.error("Failed to disconnect iBabs", { error: error.message })
      
      // Return 404 if connection not found
      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "iBabs connection not found"
        })
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to disconnect iBabs",
        details: error.message
      })
    }
  }
)

export default router
