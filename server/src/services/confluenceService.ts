import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"
import { marked } from "marked"

export interface ConfluenceConfig {
  baseUrl: string
  username: string
  apiToken: string
  cloudId?: string
}

export interface ConfluenceSpace {
  id: string
  key: string
  name: string
  description?: string
  type: string
  status: string
  homepageId?: string
  _links?: {
    webui: string
  }
}

export interface ConfluencePage {
  id: string
  type: string
  status: string
  title: string
  space: {
    id: string
    key: string
    name: string
  }
  body?: {
    storage?: {
      value: string
      representation: string
    }
    view?: {
      value: string
      representation: string
    }
  }
  version: {
    number: number
    when: string
    by: {
      displayName: string
      email?: string
    }
  }
  _links?: {
    webui: string
    edit: string
  }
}

export interface ConfluenceUser {
  accountId: string
  displayName: string
  email?: string
  profilePicture?: {
    path: string
  }
}

export class ConfluenceService {
  private client: AxiosInstance
  private config: ConfluenceConfig

  constructor(config: ConfluenceConfig) {
    this.config = config
    // Ensure the base URL includes /wiki for Confluence Cloud instances
    const baseUrl = config.baseUrl.includes('/wiki')
      ? `${config.baseUrl}/rest/api`
      : `${config.baseUrl}/wiki/rest/api`

    this.client = axios.create({
      baseURL: baseUrl,
      auth: {
        username: config.username,
        password: config.apiToken,
      },
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    })

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`Confluence API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        logger.error("Confluence API Request Error:", error)
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => {
        logger.info(`Confluence API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        logger.error("Confluence API Response Error:", {
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
   * Test the connection to Confluence
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/space", {
        params: { limit: 1 }
      })
      return response.status === 200
    } catch (error) {
      logger.error("Confluence connection test failed:", error)
      return false
    }
  }

  /**
   * Get all spaces accessible to the user
   */
  async getSpaces(limit: number = 50, start: number = 0): Promise<{
    results: ConfluenceSpace[]
    size: number
    start: number
    limit: number
    _links?: any
  }> {
    try {
      const response = await this.client.get("/space", {
        params: {
          limit,
          start,
          expand: "description,homepage,metadata.labels",
        },
      })

      return response.data
    } catch (error) {
      logger.error("Failed to get Confluence spaces:", error)
      throw new Error(`Failed to get spaces: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get a specific space by key
   */
  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    try {
      const response = await this.client.get(`/space/${spaceKey}`, {
        params: {
          expand: "description,homepage,metadata.labels",
        },
      })

      return response.data
    } catch (error) {
      logger.error(`Failed to get Confluence space ${spaceKey}:`, error)
      throw new Error(`Failed to get space: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get pages from a specific space
   */
  async getSpacePages(
    spaceKey: string,
    limit: number = 25,
    start: number = 0
  ): Promise<{
    results: ConfluencePage[]
    size: number
    start: number
    limit: number
  }> {
    try {
      const response = await this.client.get("/content", {
        params: {
          spaceKey,
          type: "page",
          status: "current",
          limit,
          start,
          expand: "space,body.storage,body.view,version,ancestors",
        },
      })

      return response.data
    } catch (error) {
      logger.error(`Failed to get pages for space ${spaceKey}:`, error)
      throw new Error(`Failed to get pages: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get a specific page by ID
   */
  async getPage(pageId: string): Promise<ConfluencePage> {
    try {
      const response = await this.client.get(`/content/${pageId}`, {
        params: {
          expand: "space,body.storage,body.view,version,ancestors,children.page",
        },
      })

      return response.data
    } catch (error) {
      logger.error(`Failed to get Confluence page ${pageId}:`, error)
      throw new Error(`Failed to get page: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create a new page in Confluence
   */
  async createPage(
    spaceKey: string,
    title: string,
    content: string,
    parentId?: string
  ): Promise<ConfluencePage> {
    try {
      const pageData: any = {
        type: "page",
        title,
        space: {
          key: spaceKey,
        },
        body: {
          storage: {
            value: content,
            representation: "storage",
          },
        },
      }

      if (parentId) {
        pageData.ancestors = [{ id: parentId }]
      }

      const response = await this.client.post("/content", pageData)
      return response.data
    } catch (error) {
      logger.error("Failed to create Confluence page:", error)
      throw new Error(`Failed to create page: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Update an existing page
   */
  async updatePage(
    pageId: string,
    title: string,
    content: string,
    version: number
  ): Promise<ConfluencePage> {
    try {
      const pageData = {
        id: pageId,
        type: "page",
        title,
        body: {
          storage: {
            value: content,
            representation: "storage",
          },
        },
        version: {
          number: version + 1,
        },
      }

      const response = await this.client.put(`/content/${pageId}`, pageData)
      return response.data
    } catch (error) {
      logger.error(`Failed to update Confluence page ${pageId}:`, error)
      throw new Error(`Failed to update page: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Delete a page
   */
  async deletePage(pageId: string): Promise<void> {
    try {
      await this.client.delete(`/content/${pageId}`)
    } catch (error) {
      logger.error(`Failed to delete Confluence page ${pageId}:`, error)
      throw new Error(`Failed to delete page: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Search for content in Confluence
   */
  async searchContent(
    query: string,
    spaceKey?: string,
    limit: number = 25,
    start: number = 0
  ): Promise<{
    results: ConfluencePage[]
    size: number
    start: number
    limit: number
  }> {
    try {
      let cql = `text ~ "${query}" AND type = page`
      if (spaceKey) {
        cql += ` AND space = "${spaceKey}"`
      }

      const response = await this.client.get("/content/search", {
        params: {
          cql,
          limit,
          start,
          expand: "space,body.view,version",
        },
      })

      return response.data
    } catch (error) {
      logger.error("Failed to search Confluence content:", error)
      throw new Error(`Failed to search content: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<ConfluenceUser> {
    try {
      const response = await this.client.get("/user/current")
      return response.data
    } catch (error) {
      logger.error("Failed to get current Confluence user:", error)
      throw new Error(`Failed to get user: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Convert Confluence storage format to plain text/markdown
   */
  convertStorageToMarkdown(storageContent: string): string {
    // Basic conversion from Confluence storage format to Markdown
    // This is a simplified version - you might want to use a proper parser
    let markdown = storageContent

    // Convert basic HTML tags to Markdown
    markdown = markdown
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1")
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1")
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1")
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1")
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<ul[^>]*>/gi, "")
      .replace(/<\/ul>/gi, "")
      .replace(/<ol[^>]*>/gi, "")
      .replace(/<\/ol>/gi, "")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1")

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, "")

    // Clean up extra whitespace
    markdown = markdown.replace(/\n\s*\n\s*\n/g, "\n\n").trim()

    return markdown
  }

  /**
   * Convert Markdown to Confluence storage format
   * Uses marked library for proper conversion including tables, code blocks, links, etc.
   */
  convertMarkdownToStorage(markdown: string): string {
    try {
      // Configure marked with GFM (GitHub Flavored Markdown) for table support
      // GFM is enabled by default in marked v11, but we explicitly set it
      marked.setOptions({
        gfm: true,
        breaks: false // Don't convert line breaks to <br>
      })

      // Convert Markdown to HTML using marked (synchronous parse)
      let html = marked(markdown) as string

      // Post-process HTML for Confluence compatibility
      html = this.postProcessHtmlForConfluence(html)

      return html
    } catch (error) {
      logger.error('Failed to convert markdown to Confluence storage format', {
        error: error instanceof Error ? error.message : String(error)
      })
      // Fallback to basic conversion if marked fails
      return this.fallbackMarkdownConversion(markdown)
    }
  }

  /**
   * Post-process HTML to ensure Confluence compatibility
   */
  private postProcessHtmlForConfluence(html: string): string {
    // Ensure tables have proper structure (Confluence requires tbody)
    html = html.replace(
      /<table>/g,
      '<table><tbody>'
    )
    html = html.replace(
      /<\/table>/g,
      '</tbody></table>'
    )

    // Ensure table rows are properly closed
    html = html.replace(
      /<tr([^>]*)>/g,
      '<tr$1>'
    )

    // Clean up empty paragraphs that might cause issues
    html = html.replace(/<p>\s*<\/p>/g, '')

    // Ensure code blocks are properly formatted
    // Confluence uses <code> for inline and <pre><code> for blocks
    html = html.replace(
      /<pre><code class="language-(\w+)">/g,
      '<pre><code class="language-$1">'
    )

    // Ensure links have proper format
    html = html.replace(
      /<a href="([^"]+)"([^>]*)>/g,
      '<a href="$1"$2>'
    )

    // Ensure images are properly formatted
    html = html.replace(
      /<img src="([^"]+)" alt="([^"]*)"([^>]*)>/g,
      '<img src="$1" alt="$2"$3 />'
    )

    // Ensure blockquotes are properly formatted
    html = html.replace(
      /<blockquote>/g,
      '<blockquote><p>'
    )
    html = html.replace(
      /<\/blockquote>/g,
      '</p></blockquote>'
    )

    // Clean up any double tbody tags
    html = html.replace(/<tbody><tbody>/g, '<tbody>')
    html = html.replace(/<\/tbody><\/tbody>/g, '</tbody>')

    return html
  }

  /**
   * Fallback conversion if marked library fails
   */
  private fallbackMarkdownConversion(markdown: string): string {
    logger.warn('Using fallback markdown conversion')
    let storage = markdown

    // Basic conversions
    storage = storage
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
      .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
      .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.*$)/gim, "<li>$1</li>")

    // Wrap list items in ul tags
    storage = storage.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")

    // Convert paragraphs
    const paragraphs = storage.split("\n\n")
    storage = paragraphs
      .map((p) => {
        if (p.trim() && !p.includes("<h") && !p.includes("<ul") && !p.includes("<li")) {
          return `<p>${p.trim()}</p>`
        }
        return p
      })
      .join("\n")

    return storage
  }
}
