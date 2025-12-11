import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"

export interface NotionConfig {
  apiKey: string
  version?: string
}

export interface NotionDatabase {
  id: string
  title: Array<{ plain_text: string }>
  description?: Array<{ plain_text: string }>
  url: string
  created_time: string
  last_edited_time: string
  properties: Record<string, any>
  parent: {
    type: string
    page_id?: string
    workspace?: boolean
  }
}

export interface NotionPage {
  id: string
  url: string
  created_time: string
  last_edited_time: string
  archived: boolean
  properties: Record<string, any>
  parent: {
    type: string
    database_id?: string
    page_id?: string
    workspace?: boolean
  }
}

export interface NotionBlock {
  id: string
  type: string
  created_time: string
  last_edited_time: string
  has_children: boolean
  [key: string]: any
}

export interface NotionUser {
  id: string
  name: string
  avatar_url?: string
  type: string
  person?: {
    email: string
  }
}

export interface NotionSearchResult {
  object: string
  id: string
  parent?: any
  title?: Array<{ plain_text: string }>
  properties?: Record<string, any>
  url?: string
  created_time: string
  last_edited_time: string
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

export interface IntegrationProvider {
  name: string
  authenticate(): Promise<boolean>
  syncDocuments(): Promise<Document[]>
  getPermissions(): Promise<any[]>
}

/**
 * Notion API Client for document sync integration
 */
export class NotionClient {
  private client: AxiosInstance
  private config: NotionConfig

  constructor(config: NotionConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error("Access token required")
    }

    this.config = {
      ...config,
      version: config.version || "2022-06-28"
    }

    this.client = axios.create({
      baseURL: "https://api.notion.com/v1",
      timeout: 30000,
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": this.config.version!,
      },
    })

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`[NOTION] API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        logger.error("[NOTION] Request error:", error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`[NOTION] API Response: ${response.status}`)
        return response
      },
      (error) => {
        logger.error("[NOTION] Response error:", {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Test connection to Notion API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/users/me")
      logger.info("[NOTION] Connection test successful", { user: response.data.name })
      return true
    } catch (error) {
      logger.error("[NOTION] Connection test failed:", error)
      return false
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<NotionUser> {
    const response = await this.client.get("/users/me")
    return response.data
  }

  /**
   * Search for pages and databases
   */
  async search(query?: string, filter?: { property: string; value: string }, pageSize: number = 100): Promise<{
    results: NotionSearchResult[]
    has_more: boolean
    next_cursor: string | null
  }> {
    const body: any = { page_size: pageSize }
    
    if (query) {
      body.query = query
    }
    
    if (filter) {
      body.filter = filter
    }

    const response = await this.client.post("/search", body)
    return response.data
  }

  /**
   * Get all pages accessible by the integration
   */
  async getAllPages(startCursor?: string): Promise<{
    results: NotionSearchResult[]
    has_more: boolean
    next_cursor: string | null
  }> {
    const body: any = {
      filter: { property: "object", value: "page" },
      page_size: 100
    }

    if (startCursor) {
      body.start_cursor = startCursor
    }

    const response = await this.client.post("/search", body)
    return response.data
  }

  /**
   * Get all databases accessible by the integration
   */
  async getAllDatabases(startCursor?: string): Promise<{
    results: NotionSearchResult[]
    has_more: boolean
    next_cursor: string | null
  }> {
    const body: any = {
      filter: { property: "object", value: "database" },
      page_size: 100
    }

    if (startCursor) {
      body.start_cursor = startCursor
    }

    const response = await this.client.post("/search", body)
    return response.data
  }

  /**
   * Get a specific page by ID
   */
  async getPage(pageId: string): Promise<NotionPage> {
    const response = await this.client.get(`/pages/${pageId}`)
    return response.data
  }

  /**
   * Get a specific database by ID
   */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    const response = await this.client.get(`/databases/${databaseId}`)
    return response.data
  }

  /**
   * Query a database
   */
  async queryDatabase(databaseId: string, filter?: any, sorts?: any[], pageSize: number = 100, startCursor?: string): Promise<{
    results: NotionPage[]
    has_more: boolean
    next_cursor: string | null
  }> {
    const body: any = { page_size: pageSize }

    if (filter) {
      body.filter = filter
    }
    if (sorts) {
      body.sorts = sorts
    }
    if (startCursor) {
      body.start_cursor = startCursor
    }

    const response = await this.client.post(`/databases/${databaseId}/query`, body)
    return response.data
  }

  /**
   * Get blocks (content) of a page
   */
  async getBlockChildren(blockId: string, pageSize: number = 100, startCursor?: string): Promise<{
    results: NotionBlock[]
    has_more: boolean
    next_cursor: string | null
  }> {
    const params: any = { page_size: pageSize }
    if (startCursor) {
      params.start_cursor = startCursor
    }

    const response = await this.client.get(`/blocks/${blockId}/children`, { params })
    return response.data
  }

  /**
   * Get all blocks (content) of a page recursively
   */
  async getAllBlockChildren(blockId: string): Promise<NotionBlock[]> {
    const allBlocks: NotionBlock[] = []
    let hasMore = true
    let cursor: string | undefined

    while (hasMore) {
      const response = await this.getBlockChildren(blockId, 100, cursor)
      allBlocks.push(...response.results)
      hasMore = response.has_more
      cursor = response.next_cursor || undefined
    }

    // Recursively get children for blocks that have them
    for (const block of allBlocks) {
      if (block.has_children) {
        const children = await this.getAllBlockChildren(block.id)
        ;(block as any).children = children
      }
    }

    return allBlocks
  }

  /**
   * Convert Notion blocks to Markdown
   */
  blocksToMarkdown(blocks: NotionBlock[]): string {
    const lines: string[] = []

    for (const block of blocks) {
      const line = this.blockToMarkdown(block)
      if (line !== null) {
        lines.push(line)
      }
    }

    return lines.join("\n\n")
  }

  /**
   * Convert a single Notion block to Markdown
   */
  private blockToMarkdown(block: NotionBlock): string | null {
    const type = block.type
    const content = block[type]

    if (!content) return null

    switch (type) {
      case "paragraph":
        return this.richTextToMarkdown(content.rich_text)

      case "heading_1":
        return `# ${this.richTextToMarkdown(content.rich_text)}`

      case "heading_2":
        return `## ${this.richTextToMarkdown(content.rich_text)}`

      case "heading_3":
        return `### ${this.richTextToMarkdown(content.rich_text)}`

      case "bulleted_list_item":
        let bulletText = `- ${this.richTextToMarkdown(content.rich_text)}`
        if ((block as any).children) {
          const childMarkdown = this.blocksToMarkdown((block as any).children)
          bulletText += "\n" + childMarkdown.split("\n").map(l => "  " + l).join("\n")
        }
        return bulletText

      case "numbered_list_item":
        let numberedText = `1. ${this.richTextToMarkdown(content.rich_text)}`
        if ((block as any).children) {
          const childMarkdown = this.blocksToMarkdown((block as any).children)
          numberedText += "\n" + childMarkdown.split("\n").map(l => "   " + l).join("\n")
        }
        return numberedText

      case "to_do":
        const checked = content.checked ? "[x]" : "[ ]"
        return `- ${checked} ${this.richTextToMarkdown(content.rich_text)}`

      case "toggle":
        let toggleText = `<details>\n<summary>${this.richTextToMarkdown(content.rich_text)}</summary>\n`
        if ((block as any).children) {
          toggleText += this.blocksToMarkdown((block as any).children)
        }
        toggleText += "\n</details>"
        return toggleText

      case "code":
        const language = content.language || ""
        return `\`\`\`${language}\n${this.richTextToMarkdown(content.rich_text)}\n\`\`\``

      case "quote":
        return `> ${this.richTextToMarkdown(content.rich_text)}`

      case "callout":
        const emoji = content.icon?.emoji || "💡"
        return `> ${emoji} ${this.richTextToMarkdown(content.rich_text)}`

      case "divider":
        return "---"

      case "table_of_contents":
        return "[TOC]"

      case "image":
        const imageUrl = content.type === "external" ? content.external?.url : content.file?.url
        const caption = content.caption ? this.richTextToMarkdown(content.caption) : "image"
        return `![${caption}](${imageUrl})`

      case "video":
        const videoUrl = content.type === "external" ? content.external?.url : content.file?.url
        return `[Video](${videoUrl})`

      case "file":
        const fileUrl = content.type === "external" ? content.external?.url : content.file?.url
        const fileName = content.name || "file"
        return `[${fileName}](${fileUrl})`

      case "pdf":
        const pdfUrl = content.type === "external" ? content.external?.url : content.file?.url
        return `[PDF](${pdfUrl})`

      case "bookmark":
        return `[Bookmark](${content.url})`

      case "link_preview":
        return `[Link](${content.url})`

      case "equation":
        return `$$${content.expression}$$`

      case "table":
        // Tables need special handling with rows
        return null // Will be handled separately

      case "column_list":
      case "column":
        // Columns don't translate well to markdown
        if ((block as any).children) {
          return this.blocksToMarkdown((block as any).children)
        }
        return null

      case "synced_block":
        if ((block as any).children) {
          return this.blocksToMarkdown((block as any).children)
        }
        return null

      case "child_page":
        return `📄 **Subpage:** ${content.title}`

      case "child_database":
        return `📊 **Database:** ${content.title}`

      case "embed":
        return `[Embed](${content.url})`

      default:
        logger.debug(`[NOTION] Unknown block type: ${type}`)
        return null
    }
  }

  /**
   * Convert Notion rich text to Markdown
   */
  private richTextToMarkdown(richText: Array<{ plain_text: string; annotations?: any; href?: string }>): string {
    if (!richText || richText.length === 0) return ""

    return richText.map(text => {
      let result = text.plain_text || ""
      const annotations = text.annotations || {}

      if (annotations.code) {
        result = `\`${result}\``
      }
      if (annotations.bold) {
        result = `**${result}**`
      }
      if (annotations.italic) {
        result = `*${result}*`
      }
      if (annotations.strikethrough) {
        result = `~~${result}~~`
      }
      if (annotations.underline) {
        result = `<u>${result}</u>`
      }
      if (text.href) {
        result = `[${result}](${text.href})`
      }

      return result
    }).join("")
  }

  /**
   * Extract title from a page
   */
  getPageTitle(page: NotionPage | NotionSearchResult): string {
    // Try to get title from properties
    if (page.properties) {
      for (const [key, value] of Object.entries(page.properties)) {
        if ((value as any).type === "title" && (value as any).title) {
          return (value as any).title.map((t: any) => t.plain_text).join("")
        }
      }
    }

    // Try to get from title array (search results)
    if ((page as any).title) {
      return (page as any).title.map((t: any) => t.plain_text).join("")
    }

    return "Untitled"
  }
}

/**
 * Options for syncing documents from Notion
 */
export interface NotionSyncOptions {
  projectId?: string      // Target project for imported documents
  companyId?: string      // Company/tenant for imported documents
  authorId?: string       // Owner of imported documents
  databaseId?: string     // Specific database to sync (optional)
}

/**
 * Notion Integration for ADPA
 */
export class NotionIntegration implements IntegrationProvider {
  public name = "notion"
  private client: NotionClient
  private integrationId: string
  private syncOptions: NotionSyncOptions

  constructor(config: NotionConfig, integrationId: string, syncOptions?: NotionSyncOptions) {
    this.client = new NotionClient(config)
    this.integrationId = integrationId
    this.syncOptions = syncOptions || {}
  }

  /**
   * Update sync options (for setting project/company context)
   */
  setSyncOptions(options: NotionSyncOptions): void {
    this.syncOptions = { ...this.syncOptions, ...options }
  }

  /**
   * Test authentication with Notion API
   */
  async authenticate(): Promise<boolean> {
    try {
      const isConnected = await this.client.testConnection()
      if (isConnected) {
        const user = await this.client.getCurrentUser()
        logger.info(`[NOTION] Authentication successful for: ${user.name}`)
        return true
      }
      return false
    } catch (error) {
      logger.error("[NOTION] Authentication failed:", error)
      return false
    }
  }

  /**
   * Full sync of all documents from Notion to ADPA
   */
  async syncDocuments(): Promise<Document[]> {
    try {
      logger.info("[NOTION] Starting full document sync...")
      
      const syncedDocuments: Document[] = []
      let totalPages = 0
      let totalDatabases = 0

      // Sync all pages
      let hasMore = true
      let cursor: string | undefined

      while (hasMore) {
        const pagesResponse = await this.client.getAllPages(cursor)
        logger.info(`[NOTION] Found ${pagesResponse.results.length} pages`)
        
        for (const page of pagesResponse.results) {
          try {
            const document = await this.syncPage(page.id)
            if (document) {
              syncedDocuments.push(document)
              totalPages++
            }
          } catch (pageError) {
            logger.error(`[NOTION] Failed to sync page ${page.id}:`, pageError)
            continue
          }
        }

        hasMore = pagesResponse.has_more
        cursor = pagesResponse.next_cursor || undefined
      }

      // Sync all databases (as metadata documents)
      hasMore = true
      cursor = undefined

      while (hasMore) {
        const dbResponse = await this.client.getAllDatabases(cursor)
        logger.info(`[NOTION] Found ${dbResponse.results.length} databases`)

        for (const db of dbResponse.results) {
          try {
            // Sync database metadata
            await this.syncDatabaseMetadata(db.id)
            
            // Sync database entries as documents
            const dbDocuments = await this.syncDatabaseEntries(db.id)
            syncedDocuments.push(...dbDocuments)
            totalDatabases++
          } catch (dbError) {
            logger.error(`[NOTION] Failed to sync database ${db.id}:`, dbError)
            continue
          }
        }

        hasMore = dbResponse.has_more
        cursor = dbResponse.next_cursor || undefined
      }

      logger.info(`[NOTION] Full sync completed. Pages: ${totalPages}, Databases: ${totalDatabases}, Total documents: ${syncedDocuments.length}`)

      // Update integration last_sync timestamp
      await this.updateSyncStatus(syncedDocuments.length)

      return syncedDocuments
    } catch (error) {
      logger.error("[NOTION] Document sync failed:", error)
      throw error
    }
  }

  /**
   * Sync a single page from Notion
   */
  async syncPage(pageId: string): Promise<Document | null> {
    try {
      const page = await this.client.getPage(pageId)
      const title = this.client.getPageTitle(page)

      // Get page content
      const blocks = await this.client.getAllBlockChildren(pageId)
      const content = this.client.blocksToMarkdown(blocks)

      // Check if document already exists
      const existingDoc = await pool.query(
        `SELECT id FROM documents WHERE external_id = $1 AND external_source = 'notion'`,
        [pageId]
      )

      const documentId = existingDoc.rows.length > 0 ? existingDoc.rows[0].id : null

      if (documentId) {
        // Update existing document (don't change project/company/author)
        await pool.query(
          `UPDATE documents 
           SET name = $1, content = $2, updated_at = NOW(), 
               external_last_modified = $3, sync_status = 'synced'
           WHERE id = $4`,
          [title, content, page.last_edited_time, documentId]
        )
        logger.debug(`[NOTION] Updated existing document: ${title}`)
        return { id: documentId, title, content }
      } else {
        // Create new document with project/company/created_by from sync options
        // Store content as plain markdown text
        const result = await pool.query(
          `INSERT INTO documents (name, content, status, external_id, external_source, external_url, external_last_modified, sync_status, project_id, company_id, created_by)
           VALUES ($1, $2, 'active', $3, 'notion', $4, $5, 'synced', $6, $7, $8)
           RETURNING id`,
          [
            title, 
            content,  // Store as plain markdown, not JSON wrapped
            pageId, 
            page.url, 
            page.last_edited_time,
            this.syncOptions.projectId || null,
            this.syncOptions.companyId || null,
            this.syncOptions.authorId || null
          ]
        )
        logger.debug(`[NOTION] Created new document: ${title} (project: ${this.syncOptions.projectId || 'none'}, company: ${this.syncOptions.companyId || 'none'})`)
        return { id: result.rows[0].id, title, content }
      }
    } catch (error) {
      logger.error(`[NOTION] Failed to sync page ${pageId}:`, error)
      return null
    }
  }

  /**
   * Sync database metadata
   */
  async syncDatabaseMetadata(databaseId: string): Promise<void> {
    try {
      const database = await this.client.getDatabase(databaseId)
      const title = database.title.map(t => t.plain_text).join("")

      // Store database metadata for reference
      await pool.query(
        `INSERT INTO notion_databases (id, title, description, properties, last_synced)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = $2, description = $3, properties = $4, last_synced = NOW()`,
        [
          databaseId,
          title,
          database.description?.map(d => d.plain_text).join("") || null,
          JSON.stringify(database.properties)
        ]
      )
    } catch (error) {
      logger.error(`[NOTION] Failed to sync database metadata ${databaseId}:`, error)
    }
  }

  /**
   * Sync all entries from a database
   */
  async syncDatabaseEntries(databaseId: string): Promise<Document[]> {
    const documents: Document[] = []
    let hasMore = true
    let cursor: string | undefined

    while (hasMore) {
      const response = await this.client.queryDatabase(databaseId, undefined, undefined, 100, cursor)

      for (const entry of response.results) {
        const doc = await this.syncPage(entry.id)
        if (doc) {
          documents.push(doc)
        }
      }

      hasMore = response.has_more
      cursor = response.next_cursor || undefined
    }

    return documents
  }

  /**
   * Get permissions (Notion doesn't expose granular permissions via API)
   */
  async getPermissions(): Promise<any[]> {
    logger.info("[NOTION] Notion API does not expose granular permissions")
    return []
  }

  /**
   * Update sync status in integrations table
   */
  private async updateSyncStatus(documentCount: number): Promise<void> {
    try {
      await pool.query(
        `UPDATE integrations 
         SET last_sync = NOW(), 
             sync_status = 'completed',
             configuration = jsonb_set(
               COALESCE(configuration, '{}'::jsonb),
               '{last_sync_count}',
               $1::text::jsonb
             )
         WHERE id = $2`,
        [documentCount.toString(), this.integrationId]
      )
    } catch (error) {
      logger.error("[NOTION] Failed to update sync status:", error)
    }
  }
}

export default NotionIntegration
