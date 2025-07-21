import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"

export interface SharePointSite {
  id: string
  name: string
  displayName: string
  webUrl: string
  description?: string
  createdDateTime: string
  lastModifiedDateTime: string
  siteCollection?: {
    hostname: string
  }
}

export interface SharePointList {
  id: string
  name: string
  displayName: string
  description?: string
  webUrl: string
  createdDateTime: string
  lastModifiedDateTime: string
  list?: {
    template: string
    contentTypesEnabled: boolean
  }
}

export interface SharePointFile {
  id: string
  name: string
  webUrl: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  file?: {
    mimeType: string
    hashes?: {
      sha1Hash?: string
      sha256Hash?: string
    }
  }
  createdBy?: {
    user?: {
      displayName: string
      email: string
    }
  }
  lastModifiedBy?: {
    user?: {
      displayName: string
      email: string
    }
  }
  parentReference?: {
    driveId: string
    driveType: string
    path: string
  }
}

export interface SharePointPermission {
  id: string
  roles: string[]
  grantedToIdentities?: Array<{
    user?: {
      displayName: string
      email: string
      id: string
    }
    group?: {
      displayName: string
      email: string
      id: string
    }
  }>
  inheritedFrom?: {
    driveId: string
    id: string
    path: string
  }
}

export interface SharePointDrive {
  id: string
  name: string
  description?: string
  driveType: string
  webUrl: string
  createdDateTime: string
  lastModifiedDateTime: string
  quota?: {
    total: number
    used: number
    remaining: number
    state: string
  }
  owner?: {
    user?: {
      displayName: string
      email: string
    }
    group?: {
      displayName: string
      email: string
    }
  }
}

export interface GraphAPIConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  scope?: string
}

/**
 * Microsoft Graph API client for SharePoint integration
 */
export class SharePointGraphClient {
  private client: AxiosInstance
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null
  private config: GraphAPIConfig

  constructor(config: GraphAPIConfig) {
    this.config = {
      ...config,
      scope: config.scope || "https://graph.microsoft.com/.default"
    }

    this.client = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken()
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`
        }
        logger.info(`SharePoint Graph API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        logger.error("SharePoint Graph API Request Error:", error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`SharePoint Graph API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        logger.error("SharePoint Graph API Response Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          data: error.response?.data,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return // Token is still valid
    }

    await this.authenticate()
  }

  /**
   * Authenticate with Microsoft Graph API using client credentials
   */
  private async authenticate(): Promise<void> {
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`
      
      const params = new URLSearchParams()
      params.append("client_id", this.config.clientId)
      params.append("client_secret", this.config.clientSecret)
      params.append("scope", this.config.scope!)
      params.append("grant_type", "client_credentials")

      const response = await axios.post(tokenUrl, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      this.accessToken = response.data.access_token
      const expiresIn = response.data.expires_in || 3600
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000) // Refresh 1 minute early

      logger.info("SharePoint Graph API authentication successful")
    } catch (error) {
      logger.error("SharePoint Graph API authentication failed:", error)
      throw new Error(`Authentication failed: ${error.response?.data?.error_description || error.message}`)
    }
  }

  /**
   * Test the connection to Microsoft Graph API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/sites?$top=1")
      return response.status === 200
    } catch (error) {
      logger.error("SharePoint connection test failed:", error)
      return false
    }
  }

  /**
   * Get all SharePoint sites
   */
  async getSites(search?: string, limit: number = 25): Promise<SharePointSite[]> {
    try {
      let url = "/sites"
      const params: string[] = []
      
      if (search) {
        url = `/sites?search=${encodeURIComponent(search)}`
      }
      
      if (limit) {
        params.push(`$top=${limit}`)
      }

      if (params.length > 0) {
        url += (url.includes("?") ? "&" : "?") + params.join("&")
      }

      const response = await this.client.get(url)
      return response.data.value || []
    } catch (error) {
      logger.error("Failed to get SharePoint sites:", error)
      throw new Error(`Failed to get sites: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Get a specific SharePoint site by ID
   */
  async getSite(siteId: string): Promise<SharePointSite> {
    try {
      const response = await this.client.get(`/sites/${siteId}`)
      return response.data
    } catch (error) {
      logger.error(`Failed to get SharePoint site ${siteId}:`, error)
      throw new Error(`Failed to get site: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Get document libraries (drives) for a site
   */
  async getSiteDrives(siteId: string): Promise<SharePointDrive[]> {
    try {
      const response = await this.client.get(`/sites/${siteId}/drives`)
      return response.data.value || []
    } catch (error) {
      logger.error(`Failed to get drives for site ${siteId}:`, error)
      throw new Error(`Failed to get drives: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Get files from a drive
   */
  async getDriveFiles(
    driveId: string, 
    folderId: string = "root",
    limit: number = 100
  ): Promise<SharePointFile[]> {
    try {
      const response = await this.client.get(
        `/drives/${driveId}/items/${folderId}/children?$top=${limit}&$expand=thumbnails`
      )
      return response.data.value || []
    } catch (error) {
      logger.error(`Failed to get files from drive ${driveId}:`, error)
      throw new Error(`Failed to get files: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Download a file from SharePoint
   */
  async downloadFile(driveId: string, fileId: string): Promise<Buffer> {
    try {
      const response = await this.client.get(`/drives/${driveId}/items/${fileId}/content`, {
        responseType: "arraybuffer",
      })
      return Buffer.from(response.data)
    } catch (error) {
      logger.error(`Failed to download file ${fileId}:`, error)
      throw new Error(`Failed to download file: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Upload a file to SharePoint
   */
  async uploadFile(
    driveId: string,
    fileName: string,
    content: Buffer,
    parentFolderId: string = "root"
  ): Promise<SharePointFile> {
    try {
      // For files larger than 4MB, we should use resumable upload
      if (content.length > 4 * 1024 * 1024) {
        return await this.uploadLargeFile(driveId, fileName, content, parentFolderId)
      }

      const response = await this.client.put(
        `/drives/${driveId}/items/${parentFolderId}:/${fileName}:/content`,
        content,
        {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to upload file ${fileName}:`, error)
      throw new Error(`Failed to upload file: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Upload large files using resumable upload
   */
  private async uploadLargeFile(
    driveId: string,
    fileName: string,
    content: Buffer,
    parentFolderId: string = "root"
  ): Promise<SharePointFile> {
    try {
      // Create upload session
      const sessionResponse = await this.client.post(
        `/drives/${driveId}/items/${parentFolderId}:/${fileName}:/createUploadSession`,
        {
          item: {
            "@microsoft.graph.conflictBehavior": "replace",
            name: fileName,
          },
        }
      )

      const uploadUrl = sessionResponse.data.uploadUrl
      const chunkSize = 320 * 1024 // 320KB chunks

      // Upload in chunks
      for (let start = 0; start < content.length; start += chunkSize) {
        const end = Math.min(start + chunkSize, content.length)
        const chunk = content.slice(start, end)

        const response = await axios.put(uploadUrl, chunk, {
          headers: {
            "Content-Length": chunk.length.toString(),
            "Content-Range": `bytes ${start}-${end - 1}/${content.length}`,
          },
        })

        if (response.status === 201 || response.status === 200) {
          return response.data // Upload complete
        }
      }

      throw new Error("Upload failed - no final response received")
    } catch (error) {
      logger.error(`Failed to upload large file ${fileName}:`, error)
      throw new Error(`Failed to upload large file: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Get file permissions
   */
  async getFilePermissions(driveId: string, fileId: string): Promise<SharePointPermission[]> {
    try {
      const response = await this.client.get(`/drives/${driveId}/items/${fileId}/permissions`)
      return response.data.value || []
    } catch (error) {
      logger.error(`Failed to get permissions for file ${fileId}:`, error)
      throw new Error(`Failed to get permissions: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Search for files across SharePoint
   */
  async searchFiles(query: string, siteId?: string, limit: number = 25): Promise<SharePointFile[]> {
    try {
      let url = `/search/query`
      const searchRequest = {
        requests: [
          {
            entityTypes: ["driveItem"],
            query: {
              queryString: query,
            },
            from: 0,
            size: limit,
          },
        ],
      }

      if (siteId) {
        searchRequest.requests[0].query.queryString += ` AND path:"${siteId}"`
      }

      const response = await this.client.post(url, searchRequest)
      const searchResults = response.data.value?.[0]?.hitsContainers?.[0]?.hits || []
      
      return searchResults.map((hit: any) => hit.resource).filter((item: any) => item.file)
    } catch (error) {
      logger.error("Failed to search SharePoint files:", error)
      throw new Error(`Failed to search files: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Get user's OneDrive
   */
  async getMyDrive(): Promise<SharePointDrive> {
    try {
      const response = await this.client.get("/me/drive")
      return response.data
    } catch (error) {
      logger.error("Failed to get user's OneDrive:", error)
      throw new Error(`Failed to get OneDrive: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Get files from user's OneDrive
   */
  async getMyDriveFiles(folderId: string = "root", limit: number = 100): Promise<SharePointFile[]> {
    try {
      const response = await this.client.get(
        `/me/drive/items/${folderId}/children?$top=${limit}&$expand=thumbnails`
      )
      return response.data.value || []
    } catch (error) {
      logger.error("Failed to get OneDrive files:", error)
      throw new Error(`Failed to get OneDrive files: ${error.response?.data?.error?.message || error.message}`)
    }
  }
}
