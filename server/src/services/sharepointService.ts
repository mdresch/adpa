import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { 
  SharePointGraphClient, 
  SharePointSite, 
  SharePointFile, 
  SharePointDrive,
  SharePointPermission,
  GraphAPIConfig 
} from "../integrations/sharepoint"

export interface SharePointIntegrationConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  defaultSiteId?: string
  syncEnabled: boolean
  autoSync: boolean
  syncInterval?: number // in minutes
}

export interface SyncResult {
  success: boolean
  syncedFiles: number
  syncedFolders: number
  errors: string[]
  lastSyncTime: Date
}

export interface SharePointDocument {
  id: string
  name: string
  content: any
  sharepoint_file_id: string
  sharepoint_drive_id: string
  sharepoint_site_id?: string
  file_size: number
  mime_type: string
  web_url: string
  created_at: Date
  updated_at: Date
  last_modified_by?: string
  permissions?: SharePointPermission[]
}

/**
 * SharePoint integration service
 */
export class SharePointService {
  private graphClient: SharePointGraphClient | null = null
  private config: SharePointIntegrationConfig | null = null

  /**
   * Initialize the service with configuration
   */
  async initialize(config: SharePointIntegrationConfig): Promise<void> {
    try {
      this.config = config
      
      const graphConfig: GraphAPIConfig = {
        tenantId: config.tenantId,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      }

      this.graphClient = new SharePointGraphClient(graphConfig)
      
      logger.info("SharePoint service initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize SharePoint service:", error)
      throw new Error(`SharePoint service initialization failed: ${error.message}`)
    }
  }

  /**
   * Test the connection to SharePoint
   */
  async testConnection(): Promise<boolean> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.testConnection()
    } catch (error) {
      logger.error("SharePoint connection test failed:", error)
      return false
    }
  }

  /**
   * Get all SharePoint sites
   */
  async getSites(search?: string, limit: number = 25): Promise<SharePointSite[]> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.getSites(search, limit)
    } catch (error) {
      logger.error("Failed to get SharePoint sites:", error)
      throw error
    }
  }

  /**
   * Get document libraries for a site
   */
  async getSiteDrives(siteId: string): Promise<SharePointDrive[]> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.getSiteDrives(siteId)
    } catch (error) {
      logger.error(`Failed to get drives for site ${siteId}:`, error)
      throw error
    }
  }

  /**
   * Get files from a document library
   */
  async getDriveFiles(driveId: string, folderId: string = "root", limit: number = 100): Promise<SharePointFile[]> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.getDriveFiles(driveId, folderId, limit)
    } catch (error) {
      logger.error(`Failed to get files from drive ${driveId}:`, error)
      throw error
    }
  }

  /**
   * Sync documents from SharePoint to ADPA
   */
  async syncDocuments(
    siteId?: string, 
    driveId?: string, 
    projectId?: string
  ): Promise<SyncResult> {
    if (!this.graphClient || !this.config) {
      throw new Error("SharePoint service not initialized")
    }

    const result: SyncResult = {
      success: false,
      syncedFiles: 0,
      syncedFolders: 0,
      errors: [],
      lastSyncTime: new Date(),
    }

    try {
      logger.info("Starting SharePoint document sync...")

      // Get sites to sync
      let sitesToSync: SharePointSite[] = []
      if (siteId) {
        const site = await this.graphClient.getSite(siteId)
        sitesToSync = [site]
      } else if (this.config.defaultSiteId) {
        const site = await this.graphClient.getSite(this.config.defaultSiteId)
        sitesToSync = [site]
      } else {
        sitesToSync = await this.graphClient.getSites(undefined, 10)
      }

      for (const site of sitesToSync) {
        try {
          await this.syncSiteDocuments(site, driveId, projectId, result)
        } catch (error) {
          logger.error(`Failed to sync site ${site.id}:`, error)
          result.errors.push(`Site ${site.name}: ${error.message}`)
        }
      }

      result.success = result.errors.length === 0
      logger.info(`SharePoint sync completed. Files: ${result.syncedFiles}, Errors: ${result.errors.length}`)

      return result
    } catch (error) {
      logger.error("SharePoint sync failed:", error)
      result.errors.push(error.message)
      return result
    }
  }

  /**
   * Sync documents from a specific site
   */
  private async syncSiteDocuments(
    site: SharePointSite,
    driveId?: string,
    projectId?: string,
    result?: SyncResult
  ): Promise<void> {
    if (!this.graphClient) return

    try {
      // Get drives for the site
      let drivesToSync: SharePointDrive[] = []
      if (driveId) {
        // Get specific drive info (we'll need to implement this)
        const drives = await this.graphClient.getSiteDrives(site.id)
        const targetDrive = drives.find(d => d.id === driveId)
        if (targetDrive) {
          drivesToSync = [targetDrive]
        }
      } else {
        drivesToSync = await this.graphClient.getSiteDrives(site.id)
      }

      for (const drive of drivesToSync) {
        try {
          await this.syncDriveDocuments(site, drive, projectId, result)
        } catch (error) {
          logger.error(`Failed to sync drive ${drive.id}:`, error)
          if (result) {
            result.errors.push(`Drive ${drive.name}: ${error.message}`)
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to get drives for site ${site.id}:`, error)
      throw error
    }
  }

  /**
   * Sync documents from a specific drive
   */
  private async syncDriveDocuments(
    site: SharePointSite,
    drive: SharePointDrive,
    projectId?: string,
    result?: SyncResult
  ): Promise<void> {
    if (!this.graphClient) return

    try {
      const files = await this.graphClient.getDriveFiles(drive.id, "root", 100)

      for (const file of files) {
        try {
          if (file.file) { // Only process files, not folders
            await this.syncFile(site, drive, file, projectId)
            if (result) {
              result.syncedFiles++
            }
          } else {
            // It's a folder
            if (result) {
              result.syncedFolders++
            }
          }
        } catch (error) {
          logger.error(`Failed to sync file ${file.name}:`, error)
          if (result) {
            result.errors.push(`File ${file.name}: ${error.message}`)
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to get files from drive ${drive.id}:`, error)
      throw error
    }
  }

  /**
   * Sync a single file from SharePoint
   */
  private async syncFile(
    site: SharePointSite,
    drive: SharePointDrive,
    file: SharePointFile,
    projectId?: string
  ): Promise<void> {
    try {
      // Check if file already exists in our database
      const existingFile = await pool.query(
        "SELECT id, updated_at FROM documents WHERE sharepoint_file_id = $1",
        [file.id]
      )

      const fileLastModified = new Date(file.lastModifiedDateTime)
      
      if (existingFile.rows.length > 0) {
        const existingUpdated = new Date(existingFile.rows[0].updated_at)
        if (fileLastModified <= existingUpdated) {
          // File hasn't been modified, skip
          return
        }
      }

      // Download file content if it's a supported type
      let content = null
      if (this.isSupportedFileType(file.file?.mimeType)) {
        try {
          const fileBuffer = await this.graphClient!.downloadFile(drive.id, file.id)
          content = {
            type: "file",
            data: fileBuffer.toString("base64"),
            mimeType: file.file?.mimeType,
            size: file.size,
          }
        } catch (error) {
          logger.warn(`Failed to download file content for ${file.name}:`, error)
          // Continue without content
        }
      }

      // Get file permissions
      let permissions: SharePointPermission[] = []
      try {
        permissions = await this.graphClient!.getFilePermissions(drive.id, file.id)
      } catch (error) {
        logger.warn(`Failed to get permissions for ${file.name}:`, error)
      }

      // Create or update document in ADPA
      const documentData = {
        name: file.name,
        content: content || {
          type: "sharepoint_reference",
          sharepoint_file_id: file.id,
          sharepoint_drive_id: drive.id,
          sharepoint_site_id: site.id,
          web_url: file.webUrl,
        },
        project_id: projectId,
        sharepoint_file_id: file.id,
        sharepoint_drive_id: drive.id,
        sharepoint_site_id: site.id,
        file_size: file.size,
        mime_type: file.file?.mimeType || "application/octet-stream",
        web_url: file.webUrl,
        created_by: null, // We'll need to map SharePoint users to ADPA users
        created_at: new Date(file.createdDateTime),
        updated_at: fileLastModified,
        metadata: {
          sharepoint: {
            site: {
              id: site.id,
              name: site.name,
              webUrl: site.webUrl,
            },
            drive: {
              id: drive.id,
              name: drive.name,
              driveType: drive.driveType,
            },
            permissions: permissions,
            createdBy: file.createdBy,
            lastModifiedBy: file.lastModifiedBy,
          },
        },
      }

      if (existingFile.rows.length > 0) {
        // Update existing document
        await pool.query(
          `UPDATE documents SET 
           name = $1, content = $2, file_size = $3, mime_type = $4, 
           web_url = $5, updated_at = $6, metadata = $7
           WHERE sharepoint_file_id = $8`,
          [
            documentData.name,
            JSON.stringify(documentData.content),
            documentData.file_size,
            documentData.mime_type,
            documentData.web_url,
            documentData.updated_at,
            JSON.stringify(documentData.metadata),
            file.id,
          ]
        )
      } else {
        // Create new document
        await pool.query(
          `INSERT INTO documents (
            id, name, content, project_id, sharepoint_file_id, sharepoint_drive_id, 
            sharepoint_site_id, file_size, mime_type, web_url, created_by, 
            created_at, updated_at, metadata
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )`,
          [
            documentData.name,
            JSON.stringify(documentData.content),
            documentData.project_id,
            documentData.sharepoint_file_id,
            documentData.sharepoint_drive_id,
            documentData.sharepoint_site_id,
            documentData.file_size,
            documentData.mime_type,
            documentData.web_url,
            documentData.created_by,
            documentData.created_at,
            documentData.updated_at,
            JSON.stringify(documentData.metadata),
          ]
        )
      }

      logger.info(`Synced SharePoint file: ${file.name}`)
    } catch (error) {
      logger.error(`Failed to sync file ${file.name}:`, error)
      throw error
    }
  }

  /**
   * Check if file type is supported for content extraction
   */
  private isSupportedFileType(mimeType?: string): boolean {
    if (!mimeType) return false

    const supportedTypes = [
      "text/plain",
      "text/markdown",
      "application/json",
      "application/xml",
      "text/xml",
      "text/csv",
      // Add more supported types as needed
    ]

    return supportedTypes.includes(mimeType) || mimeType.startsWith("text/")
  }

  /**
   * Upload a document to SharePoint
   */
  async uploadDocument(
    driveId: string,
    fileName: string,
    content: Buffer,
    parentFolderId: string = "root"
  ): Promise<SharePointFile> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.uploadFile(driveId, fileName, content, parentFolderId)
    } catch (error) {
      logger.error(`Failed to upload document ${fileName}:`, error)
      throw error
    }
  }

  /**
   * Search for files in SharePoint
   */
  async searchFiles(query: string, siteId?: string, limit: number = 25): Promise<SharePointFile[]> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.searchFiles(query, siteId, limit)
    } catch (error) {
      logger.error("Failed to search SharePoint files:", error)
      throw error
    }
  }

  /**
   * Get user's OneDrive
   */
  async getMyDrive(): Promise<SharePointDrive> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.getMyDrive()
    } catch (error) {
      logger.error("Failed to get OneDrive:", error)
      throw error
    }
  }

  /**
   * Get files from user's OneDrive
   */
  async getMyDriveFiles(folderId: string = "root", limit: number = 100): Promise<SharePointFile[]> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.getMyDriveFiles(folderId, limit)
    } catch (error) {
      logger.error("Failed to get OneDrive files:", error)
      throw error
    }
  }

  /**
   * Get file permissions
   */
  async getFilePermissions(driveId: string, fileId: string): Promise<SharePointPermission[]> {
    if (!this.graphClient) {
      throw new Error("SharePoint service not initialized")
    }

    try {
      return await this.graphClient.getFilePermissions(driveId, fileId)
    } catch (error) {
      logger.error(`Failed to get permissions for file ${fileId}:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const sharepointService = new SharePointService()
