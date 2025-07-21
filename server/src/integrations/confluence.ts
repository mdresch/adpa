import { ConfluenceService, ConfluenceConfig, ConfluenceSpace, ConfluencePage } from "../services/confluenceService"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"

export interface IntegrationProvider {
  name: string
  authenticate(): Promise<boolean>
  syncDocuments(): Promise<any[]>
  uploadDocument(doc: any): Promise<string>
  getPermissions(): Promise<any[]>
}

export interface Document {
  id: string
  title: string
  content: string
  project_id?: string
  framework?: string
  status?: string
  created_by?: string
}

export class ConfluenceIntegration implements IntegrationProvider {
  public name = "confluence"
  private service: ConfluenceService
  private integrationId: string

  constructor(config: ConfluenceConfig, integrationId: string) {
    this.service = new ConfluenceService(config)
    this.integrationId = integrationId
  }

  /**
   * Test authentication with Confluence
   */
  async authenticate(): Promise<boolean> {
    try {
      const isConnected = await this.service.testConnection()
      if (isConnected) {
        const user = await this.service.getCurrentUser()
        logger.info(`Confluence authentication successful for user: ${user.displayName}`)
        return true
      }
      return false
    } catch (error) {
      logger.error("Confluence authentication failed:", error)
      return false
    }
  }

  /**
   * Sync documents from Confluence spaces to ADPA
   */
  async syncDocuments(): Promise<Document[]> {
    try {
      logger.info("Starting Confluence document sync...")
      
      const syncedDocuments: Document[] = []
      
      // Get all accessible spaces
      const spacesResponse = await this.service.getSpaces(50, 0)
      logger.info(`Found ${spacesResponse.results.length} Confluence spaces`)

      for (const space of spacesResponse.results) {
        try {
          // Get pages from each space
          const pagesResponse = await this.service.getSpacePages(space.key, 25, 0)
          logger.info(`Processing ${pagesResponse.results.length} pages from space: ${space.name}`)

          for (const page of pagesResponse.results) {
            try {
              // Get full page content
              const fullPage = await this.service.getPage(page.id)
              
              // Convert Confluence content to ADPA document
              const document = await this.convertConfluencePageToDocument(fullPage, space)
              
              if (document) {
                syncedDocuments.push(document)
                
                // Store sync metadata
                await this.storeSyncMetadata(document.id, fullPage.id, space.key)
              }
            } catch (pageError) {
              logger.error(`Failed to sync page ${page.id}:`, pageError)
              continue
            }
          }
        } catch (spaceError) {
          logger.error(`Failed to sync space ${space.key}:`, spaceError)
          continue
        }
      }

      logger.info(`Confluence sync completed. Synced ${syncedDocuments.length} documents`)
      return syncedDocuments

    } catch (error) {
      logger.error("Confluence document sync failed:", error)
      throw new Error(`Sync failed: ${error.message}`)
    }
  }

  /**
   * Upload/Export an ADPA document to Confluence
   */
  async uploadDocument(doc: Document): Promise<string> {
    try {
      logger.info(`Uploading document ${doc.id} to Confluence...`)

      // Get the target space from integration configuration
      const spaceKey = await this.getTargetSpaceKey()
      
      if (!spaceKey) {
        throw new Error("No target space configured for Confluence integration")
      }

      // Convert ADPA document content to Confluence storage format
      const confluenceContent = this.service.convertMarkdownToStorage(doc.content)

      // Check if this document was previously synced from Confluence
      const existingMapping = await this.getSyncMetadata(doc.id)

      let confluencePage: ConfluencePage

      if (existingMapping) {
        // Update existing page
        const existingPage = await this.service.getPage(existingMapping.confluence_page_id)
        confluencePage = await this.service.updatePage(
          existingPage.id,
          doc.title,
          confluenceContent,
          existingPage.version.number
        )
        logger.info(`Updated existing Confluence page: ${confluencePage.id}`)
      } else {
        // Create new page
        confluencePage = await this.service.createPage(
          spaceKey,
          doc.title,
          confluenceContent
        )
        logger.info(`Created new Confluence page: ${confluencePage.id}`)
        
        // Store sync metadata for future updates
        await this.storeSyncMetadata(doc.id, confluencePage.id, spaceKey)
      }

      // Return the Confluence page URL
      const baseUrl = await this.getConfluenceBaseUrl()
      return `${baseUrl}${confluencePage._links?.webui || `/pages/${confluencePage.id}`}`

    } catch (error) {
      logger.error(`Failed to upload document ${doc.id} to Confluence:`, error)
      throw new Error(`Upload failed: ${error.message}`)
    }
  }

  /**
   * Get permissions for the current user
   */
  async getPermissions(): Promise<any[]> {
    try {
      const user = await this.service.getCurrentUser()
      const spaces = await this.service.getSpaces(100, 0)

      const permissions = spaces.results.map(space => ({
        resource: `space:${space.key}`,
        resourceName: space.name,
        permissions: ["read", "write"], // Simplified - Confluence API doesn't easily expose granular permissions
        user: user.displayName,
      }))

      return permissions
    } catch (error) {
      logger.error("Failed to get Confluence permissions:", error)
      throw new Error(`Failed to get permissions: ${error.message}`)
    }
  }

  /**
   * Search for content in Confluence
   */
  async searchContent(query: string, spaceKey?: string): Promise<ConfluencePage[]> {
    try {
      const searchResponse = await this.service.searchContent(query, spaceKey, 25, 0)
      return searchResponse.results
    } catch (error) {
      logger.error("Confluence search failed:", error)
      throw new Error(`Search failed: ${error.message}`)
    }
  }

  /**
   * Get all spaces accessible to the user
   */
  async getSpaces(): Promise<ConfluenceSpace[]> {
    try {
      const spacesResponse = await this.service.getSpaces(100, 0)
      return spacesResponse.results
    } catch (error) {
      logger.error("Failed to get Confluence spaces:", error)
      throw new Error(`Failed to get spaces: ${error.message}`)
    }
  }

  /**
   * Import a specific Confluence page as an ADPA document
   */
  async importPage(pageId: string, projectId?: string): Promise<Document> {
    try {
      const page = await this.service.getPage(pageId)
      const space = await this.service.getSpace(page.space.key)
      
      const document = await this.convertConfluencePageToDocument(page, space, projectId)
      
      if (document) {
        await this.storeSyncMetadata(document.id, page.id, space.key)
        return document
      }
      
      throw new Error("Failed to convert Confluence page to document")
    } catch (error) {
      logger.error(`Failed to import Confluence page ${pageId}:`, error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }

  /**
   * Convert Confluence page to ADPA document format
   */
  private async convertConfluencePageToDocument(
    page: ConfluencePage, 
    space: ConfluenceSpace,
    projectId?: string
  ): Promise<Document | null> {
    try {
      // Convert Confluence storage format to Markdown
      const content = page.body?.storage?.value || ""
      const markdownContent = this.service.convertStorageToMarkdown(content)

      // Create or find project for this space
      const adpaProjectId = projectId || await this.findOrCreateProject(space)

      // Create document in ADPA database
      const documentId = await this.createAdpaDocument({
        title: page.title,
        content: markdownContent,
        project_id: adpaProjectId,
        framework: "CONFLUENCE", // Mark as imported from Confluence
        status: "imported",
        metadata: {
          confluence_page_id: page.id,
          confluence_space_key: space.key,
          confluence_space_name: space.name,
          confluence_version: page.version.number,
          confluence_url: page._links?.webui,
          imported_at: new Date().toISOString(),
          last_modified_by: page.version.by.displayName,
        }
      })

      return {
        id: documentId,
        title: page.title,
        content: markdownContent,
        project_id: adpaProjectId,
        framework: "CONFLUENCE",
        status: "imported",
      }

    } catch (error) {
      logger.error("Failed to convert Confluence page to document:", error)
      return null
    }
  }

  /**
   * Find or create an ADPA project for a Confluence space
   */
  private async findOrCreateProject(space: ConfluenceSpace): Promise<string> {
    try {
      // Check if project already exists for this space
      const existingProject = await pool.query(
        `SELECT id FROM projects WHERE metadata->>'confluence_space_key' = $1`,
        [space.key]
      )

      if (existingProject.rows.length > 0) {
        return existingProject.rows[0].id
      }

      // Create new project for this space
      const projectResult = await pool.query(
        `
        INSERT INTO projects (id, name, description, framework, status, metadata, created_by)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          `Confluence: ${space.name}`,
          space.description || `Imported from Confluence space: ${space.key}`,
          "CONFLUENCE",
          "active",
          JSON.stringify({
            confluence_space_key: space.key,
            confluence_space_id: space.id,
            confluence_space_name: space.name,
            integration_id: this.integrationId,
            imported_at: new Date().toISOString(),
          }),
          null, // System import
        ]
      )

      return projectResult.rows[0].id
    } catch (error) {
      logger.error("Failed to find or create project for Confluence space:", error)
      throw error
    }
  }

  /**
   * Create an ADPA document in the database
   */
  private async createAdpaDocument(docData: any): Promise<string> {
    try {
      const result = await pool.query(
        `
        INSERT INTO documents (id, name, content, project_id, framework, status, metadata, created_by)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
          docData.title,
          JSON.stringify({ markdown: docData.content }), // Store content as JSON with markdown field
          docData.project_id,
          docData.framework,
          docData.status,
          JSON.stringify(docData.metadata),
          null, // System import
        ]
      )

      return result.rows[0].id
    } catch (error) {
      logger.error("Failed to create ADPA document:", error)
      throw error
    }
  }

  /**
   * Store sync metadata for tracking
   */
  private async storeSyncMetadata(adpaDocId: string, confluencePageId: string, spaceKey: string): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO integration_sync_metadata (integration_id, adpa_document_id, external_id, external_type, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (integration_id, adpa_document_id) 
        DO UPDATE SET external_id = $3, metadata = $5, updated_at = CURRENT_TIMESTAMP
        `,
        [
          this.integrationId,
          adpaDocId,
          confluencePageId,
          "confluence_page",
          JSON.stringify({
            space_key: spaceKey,
            synced_at: new Date().toISOString(),
          })
        ]
      )
    } catch (error) {
      logger.error("Failed to store sync metadata:", error)
      // Don't throw - this is not critical for the sync operation
    }
  }

  /**
   * Get sync metadata for a document
   */
  private async getSyncMetadata(adpaDocId: string): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT * FROM integration_sync_metadata WHERE integration_id = $1 AND adpa_document_id = $2`,
        [this.integrationId, adpaDocId]
      )

      if (result.rows.length > 0) {
        return {
          confluence_page_id: result.rows[0].external_id,
          space_key: result.rows[0].metadata.space_key,
        }
      }

      return null
    } catch (error) {
      logger.error("Failed to get sync metadata:", error)
      return null
    }
  }

  /**
   * Get target space key from integration configuration
   */
  private async getTargetSpaceKey(): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT configuration FROM integrations WHERE id = $1`,
        [this.integrationId]
      )

      if (result.rows.length > 0) {
        const config = result.rows[0].configuration
        return config.target_space_key || null
      }

      return null
    } catch (error) {
      logger.error("Failed to get target space key:", error)
      return null
    }
  }

  /**
   * Get Confluence base URL from integration configuration
   */
  private async getConfluenceBaseUrl(): Promise<string> {
    try {
      const result = await pool.query(
        `SELECT configuration FROM integrations WHERE id = $1`,
        [this.integrationId]
      )

      if (result.rows.length > 0) {
        const config = result.rows[0].configuration
        return config.base_url || "https://your-domain.atlassian.net"
      }

      return "https://your-domain.atlassian.net"
    } catch (error) {
      logger.error("Failed to get Confluence base URL:", error)
      return "https://your-domain.atlassian.net"
    }
  }
}
