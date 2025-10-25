/**
 * iBabs Service - OAuth Token Management
 * Handles OAuth authentication and token refresh for iBabs API
 * Beacon 6.1 dependency
 */

import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"

export interface IBabsConfig {
  baseUrl: string
  clientId: string
  clientSecret: string
  redirectUri?: string
}

export interface IBabsTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  expires_at?: number
}

export interface IBabsMeeting {
  id: string
  title: string
  date: string
  location?: string
  status: string
  agenda_items?: IBabsAgendaItem[]
}

export interface IBabsAgendaItem {
  id: string
  number: string
  title: string
  description?: string
}

export interface IBabsActionItem {
  id: string
  title: string
  description?: string
  assigned_to?: string
  due_date?: string
  status: string
  meeting_id: string
}

export class IBabsService {
  private client: AxiosInstance
  private config: IBabsConfig
  private tokens: IBabsTokens | null = null
  private integrationId: string

  constructor(config: IBabsConfig, integrationId: string) {
    this.config = config
    this.integrationId = integrationId

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    })

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken()
        if (this.tokens?.access_token) {
          config.headers.Authorization = `Bearer ${this.tokens.access_token}`
        }
        logger.info(`iBabs API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        logger.error("iBabs API Request Error:", error)
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`iBabs API Response: ${response.status} ${response.config.url}`)
        return response
      },
      async (error) => {
        logger.error("iBabs API Response Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          data: error.response?.data,
        })

        // Handle token expiration
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true
          await this.refreshAccessToken()
          return this.client.request(error.config)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * Initialize tokens from database
   */
  async initialize(): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT credentials_encrypted FROM integrations WHERE id = $1 AND type = 'ibabs'`,
        [this.integrationId]
      )

      if (result.rows.length > 0 && result.rows[0].credentials_encrypted) {
        const credentials = JSON.parse(
          Buffer.from(result.rows[0].credentials_encrypted, "base64").toString()
        )
        this.tokens = credentials.tokens
        logger.info("iBabs tokens loaded from database")
      }
    } catch (error) {
      logger.error("Failed to load iBabs tokens:", error)
    }
  }

  /**
   * Authenticate with iBabs OAuth
   */
  async authenticate(authCode?: string): Promise<IBabsTokens> {
    try {
      const tokenUrl = `${this.config.baseUrl}/oauth2/token`
      
      const params = new URLSearchParams()
      
      if (authCode) {
        // Exchange authorization code for tokens
        params.append("grant_type", "authorization_code")
        params.append("code", authCode)
        params.append("redirect_uri", this.config.redirectUri || "")
      } else {
        // Client credentials flow
        params.append("grant_type", "client_credentials")
      }
      
      params.append("client_id", this.config.clientId)
      params.append("client_secret", this.config.clientSecret)

      const response = await axios.post(tokenUrl, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      })

      this.tokens = {
        ...response.data,
        expires_at: Date.now() + (response.data.expires_in * 1000),
      }

      // Store tokens in database
      await this.storeTokens()

      logger.info("iBabs authentication successful")
      return this.tokens
    } catch (error: any) {
      logger.error("iBabs authentication failed:", error)
      throw new Error(
        `iBabs authentication failed: ${error.response?.data?.error_description || error.message}`
      )
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      logger.warn("No refresh token available, re-authenticating")
      await this.authenticate()
      return
    }

    try {
      const tokenUrl = `${this.config.baseUrl}/oauth2/token`
      
      const params = new URLSearchParams()
      params.append("grant_type", "refresh_token")
      params.append("refresh_token", this.tokens.refresh_token)
      params.append("client_id", this.config.clientId)
      params.append("client_secret", this.config.clientSecret)

      const response = await axios.post(tokenUrl, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      })

      this.tokens = {
        ...response.data,
        expires_at: Date.now() + (response.data.expires_in * 1000),
      }

      // Store updated tokens
      await this.storeTokens()

      logger.info("iBabs access token refreshed")
    } catch (error: any) {
      logger.error("Failed to refresh iBabs token:", error)
      throw new Error(
        `Failed to refresh token: ${error.response?.data?.error_description || error.message}`
      )
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.tokens) {
      await this.initialize()
    }

    if (!this.tokens) {
      throw new Error("No iBabs tokens available. Please authenticate first.")
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = this.tokens.expires_at || 0
    const now = Date.now()
    const bufferTime = 5 * 60 * 1000 // 5 minutes

    if (expiresAt - now < bufferTime) {
      logger.info("iBabs token expired or expiring soon, refreshing...")
      await this.refreshAccessToken()
    }
  }

  /**
   * Store tokens in database
   */
  private async storeTokens(): Promise<void> {
    try {
      const credentialsEncrypted = Buffer.from(
        JSON.stringify({ tokens: this.tokens })
      ).toString("base64")

      await pool.query(
        `UPDATE integrations SET credentials_encrypted = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [credentialsEncrypted, this.integrationId]
      )

      logger.info("iBabs tokens stored in database")
    } catch (error) {
      logger.error("Failed to store iBabs tokens:", error)
    }
  }

  /**
   * Get upcoming meetings
   */
  async getUpcomingMeetings(daysAhead: number = 30): Promise<IBabsMeeting[]> {
    try {
      const startDate = new Date().toISOString()
      const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

      const response = await this.client.get("/v1/meetings", {
        params: {
          start_date: startDate,
          end_date: endDate,
          status: "scheduled",
        },
      })

      return response.data.meetings || []
    } catch (error: any) {
      logger.error("Failed to get iBabs meetings:", error)
      throw new Error(
        `Failed to get meetings: ${error.response?.data?.message || error.message}`
      )
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string): Promise<IBabsMeeting> {
    try {
      const response = await this.client.get(`/v1/meetings/${meetingId}`)
      return response.data
    } catch (error: any) {
      logger.error(`Failed to get iBabs meeting ${meetingId}:`, error)
      throw new Error(
        `Failed to get meeting: ${error.response?.data?.message || error.message}`
      )
    }
  }

  /**
   * Upload document to meeting
   */
  async uploadDocument(
    meetingId: string,
    document: {
      title: string
      content: Buffer
      contentType: string
      agendaItem?: string
      classification?: string
      accessControl?: string[]
    }
  ): Promise<{ documentId: string; url: string }> {
    try {
      const formData = new FormData()
      const blob = new Blob([document.content], { type: document.contentType })
      
      formData.append("file", blob, `${document.title}.pdf`)
      formData.append("title", document.title)
      
      if (document.agendaItem) {
        formData.append("agenda_item", document.agendaItem)
      }
      if (document.classification) {
        formData.append("classification", document.classification)
      }
      if (document.accessControl) {
        formData.append("access_control", JSON.stringify(document.accessControl))
      }

      const response = await this.client.post(
        `/v1/meetings/${meetingId}/documents`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )

      logger.info(`Document uploaded to iBabs meeting ${meetingId}`)
      return {
        documentId: response.data.id,
        url: response.data.url,
      }
    } catch (error: any) {
      logger.error(`Failed to upload document to iBabs meeting ${meetingId}:`, error)
      throw new Error(
        `Failed to upload document: ${error.response?.data?.message || error.message}`
      )
    }
  }

  /**
   * Get action items from a meeting
   */
  async getActionItems(meetingId: string): Promise<IBabsActionItem[]> {
    try {
      const response = await this.client.get(`/v1/meetings/${meetingId}/actions`)
      return response.data.actions || []
    } catch (error: any) {
      logger.error(`Failed to get iBabs action items for meeting ${meetingId}:`, error)
      throw new Error(
        `Failed to get action items: ${error.response?.data?.message || error.message}`
      )
    }
  }

  /**
   * Test connection to iBabs
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getUpcomingMeetings(7)
      return true
    } catch (error) {
      logger.error("iBabs connection test failed:", error)
      return false
    }
  }
}
