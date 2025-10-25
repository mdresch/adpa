/**
 * iBabs OAuth Service
 * 
 * Handles OAuth 2.0 authentication flow for iBabs board portal integration.
 * Provides methods for authorization, token exchange, refresh, and revocation.
 */

import crypto from "crypto"
import { pool } from "../database/connection"
import { logger, childLogger } from "../utils/logger"

const log = childLogger({ component: "ibabsService" })

/**
 * OAuth configuration from environment variables
 */
const IBABS_CONFIG = {
  clientId: process.env.IBABS_CLIENT_ID || "",
  clientSecret: process.env.IBABS_CLIENT_SECRET || "",
  redirectUri: process.env.IBABS_REDIRECT_URI || "http://localhost:5000/api/ibabs/auth/callback",
  authUrl: process.env.IBABS_AUTH_URL || "https://api.ibabs.eu/oauth/authorize",
  tokenUrl: process.env.IBABS_TOKEN_URL || "https://api.ibabs.eu/oauth/token",
  scope: "read write meetings documents"
}

/**
 * OAuth state storage for CSRF protection
 * In production, this should be stored in Redis with TTL
 */
const stateStore = new Map<string, { userId: string; createdAt: number }>()

/**
 * Generate a secure random state parameter for CSRF protection
 */
function generateState(userId: string): string {
  const state = crypto.randomBytes(32).toString("hex")
  stateStore.set(state, { userId, createdAt: Date.now() })
  
  // Clean up old states (older than 10 minutes)
  for (const [key, value] of stateStore.entries()) {
    if (Date.now() - value.createdAt > 10 * 60 * 1000) {
      stateStore.delete(key)
    }
  }
  
  return state
}

/**
 * Validate and consume a state parameter
 */
function validateState(state: string): string | null {
  const stateData = stateStore.get(state)
  if (!stateData) {
    return null
  }
  
  // Check if state is expired (10 minutes)
  if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
    stateStore.delete(state)
    return null
  }
  
  // Consume the state (one-time use)
  stateStore.delete(state)
  return stateData.userId
}

/**
 * Encode token using base64 for storage consistency (not encryption)
 * In production, use proper encryption library for security
 */
function encryptToken(token: string): string {
  return Buffer.from(token).toString("base64")
}

/**
 * Decode token from base64
 */
function decryptToken(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf8")
}

export class IbabsService {
  /**
   * Generate OAuth authorization URL
   * 
   * @param userId - User ID requesting authorization
   * @returns Authorization URL to redirect user to
   */
  async getAuthorizationUrl(userId: string): Promise<string> {
    log.info("Generating iBabs authorization URL", { userId })
    
    if (!IBABS_CONFIG.clientId) {
      throw new Error("iBabs client ID not configured")
    }
    
    const state = generateState(userId)
    
    const params = new URLSearchParams({
      client_id: IBABS_CONFIG.clientId,
      redirect_uri: IBABS_CONFIG.redirectUri,
      response_type: "code",
      scope: IBABS_CONFIG.scope,
      state
    })
    
    const authUrl = `${IBABS_CONFIG.authUrl}?${params.toString()}`
    log.debug("Generated authorization URL", { userId, state })
    
    return authUrl
  }
  
  /**
   * Handle OAuth callback and exchange code for tokens
   * 
   * @param code - Authorization code from iBabs
   * @param state - State parameter for CSRF protection
   * @returns User ID if successful
   */
  async handleCallback(code: string, state: string): Promise<string> {
    log.info("Handling iBabs OAuth callback", { state })
    
    // Validate state parameter
    const userId = validateState(state)
    if (!userId) {
      log.error("Invalid or expired state parameter", { state })
      throw new Error("Invalid or expired state parameter")
    }
    
    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(code)
    
    // Store tokens in database
    await this.storeTokens(userId, tokenResponse)
    
    log.info("iBabs OAuth callback handled successfully", { userId })
    return userId
  }
  
  /**
   * Exchange authorization code for access and refresh tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<any> {
    log.debug("Exchanging authorization code for tokens")
    
    if (!IBABS_CONFIG.clientId || !IBABS_CONFIG.clientSecret) {
      throw new Error("iBabs OAuth credentials not configured")
    }
    
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: IBABS_CONFIG.clientId,
      client_secret: IBABS_CONFIG.clientSecret,
      redirect_uri: IBABS_CONFIG.redirectUri
    })
    
    const response = await fetch(IBABS_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    })
    
    if (!response.ok) {
      const error = await response.text()
      log.error("Token exchange failed", { status: response.status, error })
      throw new Error(`Token exchange failed: ${error}`)
    }
    
    const tokenData = await response.json()
    log.debug("Token exchange successful")
    
    return tokenData
  }
  
  /**
   * Store OAuth tokens in database
   */
  private async storeTokens(userId: string, tokenData: any): Promise<void> {
    log.debug("Storing OAuth tokens", { userId })
    
    const encryptedAccessToken = encryptToken(tokenData.access_token)
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
    
    // Upsert connection (update if exists, insert if not)
    await pool.query(
      `INSERT INTO ibabs_connections (user_id, access_token, refresh_token, token_type, expires_at, scope)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_type = EXCLUDED.token_type,
         expires_at = EXCLUDED.expires_at,
         scope = EXCLUDED.scope,
         updated_at = NOW()`,
      [
        userId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenData.token_type || "Bearer",
        expiresAt,
        tokenData.scope || IBABS_CONFIG.scope
      ]
    )
    
    log.info("OAuth tokens stored successfully", { userId, expiresAt })
  }
  
  /**
   * Get valid access token for user (refresh if expired)
   * 
   * @param userId - User ID
   * @returns Valid access token
   */
  async getAccessToken(userId: string): Promise<string> {
    log.debug("Getting access token", { userId })
    
    const result = await pool.query(
      `SELECT access_token, refresh_token, expires_at FROM ibabs_connections WHERE user_id = $1`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      throw new Error("iBabs connection not found")
    }
    
    const connection = result.rows[0]
    const expiresAt = new Date(connection.expires_at)
    
    // Check if token is expired or will expire in next 5 minutes
    if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      log.info("Access token expired or expiring soon, refreshing", { userId })
      await this.refreshAccessToken(userId)
      
      // Get refreshed token
      const refreshedResult = await pool.query(
        `SELECT access_token FROM ibabs_connections WHERE user_id = $1`,
        [userId]
      )
      
      return decryptToken(refreshedResult.rows[0].access_token)
    }
    
    return decryptToken(connection.access_token)
  }
  
  /**
   * Refresh expired access token
   * 
   * @param userId - User ID
   */
  async refreshAccessToken(userId: string): Promise<void> {
    log.info("Refreshing iBabs access token", { userId })
    
    const result = await pool.query(
      `SELECT refresh_token FROM ibabs_connections WHERE user_id = $1`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      throw new Error("iBabs connection not found")
    }
    
    const refreshToken = decryptToken(result.rows[0].refresh_token)
    
    // Exchange refresh token for new access token
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: IBABS_CONFIG.clientId,
      client_secret: IBABS_CONFIG.clientSecret
    })
    
    const response = await fetch(IBABS_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    })
    
    if (!response.ok) {
      const error = await response.text()
      log.error("Token refresh failed", { userId, status: response.status, error })
      throw new Error(`Token refresh failed: ${error}`)
    }
    
    const tokenData = await response.json()
    
    // Update tokens in database
    await this.storeTokens(userId, tokenData)
    
    log.info("Access token refreshed successfully", { userId })
  }
  
  /**
   * Revoke iBabs access and delete tokens
   * 
   * @param userId - User ID
   */
  async revokeAccess(userId: string): Promise<void> {
    log.info("Revoking iBabs access", { userId })
    
    // Delete connection from database
    const result = await pool.query(
      `DELETE FROM ibabs_connections WHERE user_id = $1 RETURNING id`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      throw new Error("iBabs connection not found")
    }
    
    log.info("iBabs access revoked successfully", { userId })
  }
  
  /**
   * Get connection status for user
   * 
   * @param userId - User ID
   * @returns Connection status or null if not connected
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean
    expiresAt?: Date
    scope?: string
  }> {
    log.debug("Getting connection status", { userId })
    
    const result = await pool.query(
      `SELECT expires_at, scope FROM ibabs_connections WHERE user_id = $1`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      return { connected: false }
    }
    
    const connection = result.rows[0]
    
    return {
      connected: true,
      expiresAt: new Date(connection.expires_at),
      scope: connection.scope
    }
  }
}

// Export singleton instance
export const ibabsService = new IbabsService()
