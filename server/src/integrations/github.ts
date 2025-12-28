import { GitHubService, GitHubConfig, GitHubContent, GitHubPullRequest, GitHubIssue } from "../services/githubService"
import { IntegrationProvider, Document } from "./confluence"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { v4 as uuidv4 } from "uuid"

export interface GitHubTemplate {
  id: string
  name: string
  path: string
  content: string
  sha: string
  framework: string
  variables: any[]
  lastModified: string
  version: string
}

export interface GitHubSyncOptions {
  syncTemplates?: boolean
  syncDocuments?: boolean
  createPullRequests?: boolean
  trackIssues?: boolean
  targetBranch?: string
  templatePath?: string
}

export class GitHubIntegration implements IntegrationProvider {
  name = "GitHub"
  private service: GitHubService
  private integrationId: string

  constructor(config: GitHubConfig, integrationId: string) {
    this.service = new GitHubService(config)
    this.integrationId = integrationId
  }

  /**
   * Test authentication with GitHub
   */
  async authenticate(): Promise<boolean> {
    try {
      const isConnected = await this.service.testConnection()
      if (isConnected) {
        logger.info("GitHub authentication successful")
        return true
      } else {
        logger.error("GitHub authentication failed")
        return false
      }
    } catch (error) {
      logger.error("GitHub authentication error:", error)
      return false
    }
  }

  /**
   * Sync templates from GitHub repository
   */
  async syncDocuments(): Promise<Document[]> {
    try {
      logger.info("Starting GitHub template synchronization")
      const syncedTemplates: Document[] = []

      // Get repository information
      const repo = await this.service.getRepository()
      logger.info(`Syncing templates from repository: ${repo.full_name}`)

      // Get templates from the templates directory
      const templatesPath = "templates"
      let contents: GitHubContent[]

      try {
        const response = await this.service.getContents(templatesPath)
        contents = Array.isArray(response) ? response : [response]
      } catch (error) {
        logger.warn(`Templates directory not found at ${templatesPath}, creating empty sync`)
        return []
      }

      // Process each template file
      for (const item of contents) {
        if (item.type === "file" && (item.name.endsWith(".md") || item.name.endsWith(".json"))) {
          try {
            // Get file content
            const fileContent = await this.service.getContents(item.path)
            if (!Array.isArray(fileContent) && fileContent.content) {
              const content = Buffer.from(fileContent.content, "base64").toString("utf-8")
              
              // Convert GitHub template to ADPA document
              const document = await this.convertGitHubTemplateToDocument(item, content, repo.full_name)
              
              if (document) {
                syncedTemplates.push(document)
                
                // Store sync metadata
                await this.storeSyncMetadata(document.id, item.sha, item.path)
              }
            }
          } catch (fileError) {
            logger.error(`Failed to sync template ${item.path}:`, fileError)
            continue
          }
        }
      }

      logger.info(`Successfully synced ${syncedTemplates.length} templates from GitHub`)
      return syncedTemplates
    } catch (error) {
      logger.error("GitHub template sync failed:", error)
      throw new Error(`Template sync failed: ${error.message}`)
    }
  }

  /**
   * Upload/commit a document to GitHub
   */
  async uploadDocument(doc: Document, projectSettings?: any): Promise<string> {
    try {
      logger.info(`Uploading document ${doc.title} to GitHub`)

      // Determine file path based on document type
      const filePath = this.getDocumentPath(doc)
      
      // Convert document content to markdown or JSON
      const content = this.convertDocumentToGitHubFormat(doc)
      
      // Create commit message
      const commitMessage = `Update ${doc.title} via ADPA`

      // Check if file already exists to get SHA for update
      let existingSha: string | undefined
      try {
        const existingFile = await this.service.getContents(filePath)
        if (!Array.isArray(existingFile)) {
          existingSha = existingFile.sha
        }
      } catch (error) {
        // File doesn't exist, will create new
      }

      // Create or update the file
      const result = await this.service.createOrUpdateFile(
        filePath,
        content,
        commitMessage,
        undefined, // Use default branch
        existingSha
      )

      // Store sync metadata
      await this.storeSyncMetadata(doc.id, result.content.sha, filePath)

      logger.info(`Successfully uploaded document ${doc.title} to GitHub at ${filePath}`)
      return result.content.html_url
    } catch (error) {
      logger.error(`Failed to upload document ${doc.title} to GitHub:`, error)
      throw new Error(`Upload failed: ${error.message}`)
    }
  }

  /**
   * Get permissions (not applicable for GitHub, return empty array)
   */
  async getPermissions(): Promise<any[]> {
    return []
  }

  /**
   * Create a pull request for document changes
   */
  async createPullRequest(
    title: string,
    description: string,
    sourceBranch: string,
    targetBranch: string = "main"
  ): Promise<GitHubPullRequest> {
    try {
      const pullRequest = await this.service.createPullRequest(
        title,
        description,
        sourceBranch,
        targetBranch
      )
      
      logger.info(`Created pull request #${pullRequest.number}: ${title}`)
      return pullRequest
    } catch (error) {
      logger.error("Failed to create pull request:", error)
      throw new Error(`Pull request creation failed: ${error.message}`)
    }
  }

  /**
   * Get pull requests
   */
  async getPullRequests(state: "open" | "closed" | "all" = "open"): Promise<GitHubPullRequest[]> {
    try {
      return await this.service.listPullRequests(state)
    } catch (error) {
      logger.error("Failed to get pull requests:", error)
      throw new Error(`Failed to get pull requests: ${error.message}`)
    }
  }

  /**
   * Get issues
   */
  async getIssues(state: "open" | "closed" | "all" = "open"): Promise<GitHubIssue[]> {
    try {
      return await this.service.listIssues(state)
    } catch (error) {
      logger.error("Failed to get issues:", error)
      throw new Error(`Failed to get issues: ${error.message}`)
    }
  }

  /**
   * Get a specific issue by number
   */
  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    try {
      const issue = await this.service.getIssue(issueNumber)
      logger.info(`Retrieved issue #${issueNumber}: ${issue.title}`)
      return issue
    } catch (error) {
      logger.error(`Failed to get issue #${issueNumber}:`, error)
      throw new Error(`Failed to get issue: ${error.message}`)
    }
  }

  /**
   * Pick up an issue for processing
   * This method fetches the issue, extracts information, and optionally creates a processing job
   */
  async pickUpIssue(
    issueNumber: number,
    options?: {
      createJob?: boolean
      assignToUser?: string
      addComment?: boolean
    }
  ): Promise<{
    issue: GitHubIssue
    processingMetadata?: {
      jobId?: string
      extractedInfo?: {
        title: string
        description: string
        labels: string[]
        priority?: string
        estimatedEffort?: string
      }
    }
  }> {
    try {
      logger.info(`Picking up issue #${issueNumber} for processing`)
      
      // Get the issue details
      const issue = await this.service.getIssue(issueNumber)
      
      if (issue.state === "closed") {
        logger.warn(`Issue #${issueNumber} is already closed`)
        throw new Error(`Cannot process closed issue #${issueNumber}`)
      }

      // Extract information from the issue
      const extractedInfo = {
        title: issue.title,
        description: issue.body || "",
        labels: issue.labels.map((label: any) => label.name || label),
        priority: this.extractPriority(issue),
        estimatedEffort: this.extractEstimatedEffort(issue),
      }

      // Store processing metadata in database
      const processingMetadata: any = {
        extractedInfo,
        pickedUpAt: new Date().toISOString(),
        integrationId: this.integrationId,
      }

      // Optionally create a background job for processing
      if (options?.createJob) {
        // This would integrate with the job queue system
        // For now, we'll just log it
        logger.info(`Would create processing job for issue #${issueNumber}`)
        // TODO: Integrate with Bull queue if needed
        // const job = await queueService.addJob('process-github-issue', { issueNumber, issue })
        // processingMetadata.jobId = job.id
      }

      // Store issue processing record
      await this.storeIssueProcessingRecord(issueNumber, issue, processingMetadata)

      logger.info(`Successfully picked up issue #${issueNumber} for processing`)
      
      return {
        issue,
        processingMetadata,
      }
    } catch (error) {
      logger.error(`Failed to pick up issue #${issueNumber}:`, error)
      throw new Error(`Failed to pick up issue: ${error.message}`)
    }
  }

  /**
   * Extract priority from issue labels or content
   */
  private extractPriority(issue: GitHubIssue): string {
    const priorityLabels = ["priority:critical", "priority:high", "priority:medium", "priority:low"]
    const labels = issue.labels.map((label: any) => (label.name || label).toLowerCase())
    
    for (const priority of priorityLabels) {
      if (labels.includes(priority)) {
        return priority.split(":")[1]
      }
    }
    
    // Check title/body for priority keywords
    const content = `${issue.title} ${issue.body || ""}`.toLowerCase()
    if (content.includes("critical") || content.includes("urgent")) return "high"
    if (content.includes("low priority") || content.includes("nice to have")) return "low"
    
    return "medium"
  }

  /**
   * Extract estimated effort from issue labels or content
   */
  private extractEstimatedEffort(issue: GitHubIssue): string {
    const effortLabels = ["effort:small", "effort:medium", "effort:large", "effort:xlarge"]
    const labels = issue.labels.map((label: any) => (label.name || label).toLowerCase())
    
    for (const effort of effortLabels) {
      if (labels.includes(effort)) {
        return effort.split(":")[1]
      }
    }
    
    // Check body for effort estimates
    const body = (issue.body || "").toLowerCase()
    if (body.includes("1-2 hours") || body.includes("small")) return "small"
    if (body.includes("1-2 days") || body.includes("medium")) return "medium"
    if (body.includes("1 week") || body.includes("large")) return "large"
    if (body.includes("2+ weeks") || body.includes("xlarge")) return "xlarge"
    
    return "medium"
  }

  /**
   * Store issue processing record in database
   */
  private async storeIssueProcessingRecord(
    issueNumber: number,
    issue: GitHubIssue,
    metadata: any
  ): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO integration_sync_metadata (
          integration_id,
          adpa_document_id,
          external_id,
          external_type,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (integration_id, external_id, external_type)
        DO UPDATE SET metadata = $5, updated_at = CURRENT_TIMESTAMP
      `,
        [
          this.integrationId,
          null, // No document ID for issue processing
          `issue-${issueNumber}`,
          "github_issue_processing",
          JSON.stringify({
            issueNumber,
            issueTitle: issue.title,
            issueUrl: issue.html_url,
            ...metadata,
          }),
        ]
      )
    } catch (error) {
      logger.error("Failed to store issue processing record:", error)
      // Don't throw - this is metadata storage, not critical
    }
  }

  /**
   * Create an issue
   */
  async createIssue(
    title: string,
    description: string,
    labels?: string[],
    assignees?: string[]
  ): Promise<GitHubIssue> {
    try {
      const issue = await this.service.createIssue(title, description, labels, assignees)
      logger.info(`Created issue #${issue.number}: ${title}`)
      return issue
    } catch (error) {
      logger.error("Failed to create issue:", error)
      throw new Error(`Issue creation failed: ${error.message}`)
    }
  }

  /**
   * Get version history for a template
   */
  async getTemplateVersionHistory(templatePath: string): Promise<any[]> {
    try {
      const commits = await this.service.getFileCommitHistory(templatePath)
      return commits.map(commit => ({
        version: commit.sha.substring(0, 7),
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        message: commit.commit.message,
        sha: commit.sha,
        url: commit.html_url
      }))
    } catch (error) {
      logger.error(`Failed to get version history for ${templatePath}:`, error)
      throw new Error(`Version history retrieval failed: ${error.message}`)
    }
  }

  /**
   * Convert GitHub template to ADPA document
   */
  private async convertGitHubTemplateToDocument(
    gitHubFile: GitHubContent,
    content: string,
    repoName: string
  ): Promise<Document | null> {
    try {
      // Parse template metadata from content
      const { metadata, body } = this.parseTemplateContent(content)
      
      // Determine framework from metadata or file path
      const framework = metadata.framework || this.inferFrameworkFromPath(gitHubFile.path)
      
      const documentId = uuidv4()
      
      // Create document in database
      const result = await pool.query(
        `
        INSERT INTO documents (id, name, content, template_id, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          documentId,
          metadata.title || gitHubFile.name,
          JSON.stringify({
            type: "template",
            content: body,
            metadata: {
              ...metadata,
              source: "github",
              repository: repoName,
              path: gitHubFile.path,
              sha: gitHubFile.sha
            }
          }),
          null, // template_id
          "published",
          null // created_by (system)
        ]
      )

      return {
        id: result.rows[0].id,
        title: result.rows[0].name,
        content: body,
        framework,
        status: result.rows[0].status,
        created_by: result.rows[0].created_by
      }
    } catch (error) {
      logger.error(`Failed to convert GitHub template ${gitHubFile.path}:`, error)
      return null
    }
  }

  /**
   * Parse template content to extract metadata and body
   */
  private parseTemplateContent(content: string): { metadata: any; body: string } {
    // Check if content starts with YAML frontmatter
    if (content.startsWith("---")) {
      const parts = content.split("---")
      if (parts.length >= 3) {
        try {
          // Parse YAML frontmatter (simplified - in production use a YAML parser)
          const yamlContent = parts[1].trim()
          const metadata = this.parseSimpleYaml(yamlContent)
          const body = parts.slice(2).join("---").trim()
          return { metadata, body }
        } catch (error) {
          logger.warn("Failed to parse YAML frontmatter:", error)
        }
      }
    }

    // If no frontmatter, try to extract title from first line
    const lines = content.split("\n")
    const firstLine = lines[0]
    if (firstLine.startsWith("# ")) {
      return {
        metadata: { title: firstLine.substring(2).trim() },
        body: lines.slice(1).join("\n").trim()
      }
    }

    return { metadata: {}, body: content }
  }

  /**
   * Simple YAML parser for frontmatter (basic implementation)
   */
  private parseSimpleYaml(yamlContent: string): any {
    const metadata: any = {}
    const lines = yamlContent.split("\n")
    
    for (const line of lines) {
      const colonIndex = line.indexOf(":")
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
        const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, "")
        metadata[key] = value
      }
    }
    
    return metadata
  }

  /**
   * Infer framework from file path
   */
  private inferFrameworkFromPath(path: string): string {
    if (path.includes("togaf")) return "togaf"
    if (path.includes("zachman")) return "zachman"
    if (path.includes("feaf")) return "feaf"
    if (path.includes("sabsa")) return "sabsa"
    return "custom"
  }

  /**
   * Get document path in GitHub repository
   */
  private getDocumentPath(doc: Document): string {
    const framework = doc.framework || "custom"
    const sanitizedTitle = doc.title.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()
    return `templates/${framework}/${sanitizedTitle}.md`
  }

  /**
   * Convert document to GitHub format (Markdown with frontmatter)
   */
  private convertDocumentToGitHubFormat(doc: Document): string {
    const frontmatter = [
      "---",
      `title: "${doc.title}"`,
      `framework: "${doc.framework || 'custom'}"`,
      `status: "${doc.status || 'draft'}"`,
      `created_at: "${new Date().toISOString()}"`,
      "---",
      ""
    ].join("\n")

    return frontmatter + doc.content
  }

  /**
   * Store sync metadata
   */
  private async storeSyncMetadata(documentId: string, externalId: string, externalPath: string): Promise<void> {
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
          documentId,
          externalId,
          "github_file",
          JSON.stringify({ path: externalPath })
        ]
      )
    } catch (error) {
      logger.error("Failed to store sync metadata:", error)
    }
  }
}
