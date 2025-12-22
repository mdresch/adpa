import { JiraService, JiraConfig, JiraIssue, CreateJiraIssueRequest } from "../services/jiraService"
import { IntegrationProvider, Document } from "./confluence" // Reuse the interface
import { logger } from "../utils/logger"
import { pool } from "../database/connection"

export interface JiraIntegrationConfig extends JiraConfig {
  defaultProjectKey?: string
  defaultIssueType?: string
  defaultPriority?: string
  autoCreateIssues?: boolean
  linkConfluencePages?: boolean
}

export class JiraIntegration implements IntegrationProvider {
  private service: JiraService
  private config: JiraIntegrationConfig
  private integrationId: string

  constructor(config: JiraIntegrationConfig, integrationId: string) {
    this.config = config
    this.integrationId = integrationId
    this.service = new JiraService({
      baseUrl: config.baseUrl,
      email: config.email,
      apiToken: config.apiToken,
      projectKey: config.defaultProjectKey
    })
  }

  async authenticate(): Promise<boolean> {
    try {
      return await this.service.testConnection()
    } catch (error) {
      logger.error("Jira authentication failed:", error)
      return false
    }
  }

  async syncDocuments(): Promise<Document[]> {
    // Jira doesn't sync documents in the traditional sense
    // This could be used to sync issues as documents if needed
    logger.info("Jira integration doesn't sync documents")
    return []
  }

  async uploadDocument(doc: Document): Promise<string> {
    // Not applicable for Jira
    throw new Error("Jira integration doesn't support document upload")
  }

  async getPermissions(): Promise<any[]> {
    try {
      // Check if we can access the default project
      if (this.config.defaultProjectKey) {
        await this.service.getProject(this.config.defaultProjectKey)
        return [{ project: this.config.defaultProjectKey, permission: "read" }]
      }
      return []
    } catch (error) {
      logger.error("Failed to get Jira permissions:", error)
      return []
    }
  }

  /**
   * Create or link a Jira issue for a generated document
   */
  async createOrLinkIssueForDocument(
    documentId: string,
    documentTitle: string,
    projectId: string,
    confluenceUrl?: string
  ): Promise<{ issueKey: string; issueUrl: string; created: boolean }> {
    try {
      const projectKey = this.config.defaultProjectKey
      if (!projectKey) {
        throw new Error("No default project key configured for Jira integration")
      }

      // First, try to find an existing issue with similar title
      let issue = await this.service.findIssueByTitle(projectKey, documentTitle)
      let created = false

      if (!issue) {
        // Create a new issue
        const createRequest: CreateJiraIssueRequest = {
          summary: `Document: ${documentTitle}`,
          description: `Generated document from ADPA project.\n\nDocument ID: ${documentId}\nProject ID: ${projectId}`,
          issueType: this.config.defaultIssueType || "Task",
          projectKey: projectKey,
          priority: this.config.defaultPriority,
          labels: ["adpa-generated", "document"]
        }

        issue = await this.service.createIssue(createRequest)
        created = true
        logger.info(`Created new Jira issue ${issue.key} for document ${documentId}`)
      } else {
        logger.info(`Found existing Jira issue ${issue.key} for document ${documentId}`)
      }

      // Add Confluence page URL as remote link if provided
      if (confluenceUrl && this.config.linkConfluencePages) {
        try {
          await this.service.addRemoteLink(
            issue.key,
            confluenceUrl,
            `Confluence Page: ${documentTitle}`
          )
          logger.info(`Added Confluence link to Jira issue ${issue.key}`)
        } catch (linkError) {
          logger.warn(`Failed to add Confluence link to Jira issue ${issue.key}:`, linkError)
        }
      }

      // Store the linkage in our database
      await this.storeLinkage(documentId, issue.key, issue.url, projectId)

      return {
        issueKey: issue.key,
        issueUrl: issue.url,
        created
      }
    } catch (error) {
      logger.error(`Failed to create/link Jira issue for document ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Get linked Jira issue for a document
   */
  async getLinkedIssue(documentId: string): Promise<{ issueKey: string; issueUrl: string } | null> {
    try {
      const result = await pool.query(
        `SELECT jira_issue_key, jira_issue_url 
         FROM document_jira_links 
         WHERE document_id = $1 AND integration_id = $2`,
        [documentId, this.integrationId]
      )

      if (result.rows.length > 0) {
        return {
          issueKey: result.rows[0].jira_issue_key,
          issueUrl: result.rows[0].jira_issue_url
        }
      }

      return null
    } catch (error) {
      logger.error(`Failed to get linked Jira issue for document ${documentId}:`, error)
      return null
    }
  }

  /**
   * Update Jira issue when document is regenerated
   */
  async updateIssueForDocumentRegeneration(
    documentId: string,
    newVersion: string,
    changeDescription?: string
  ): Promise<void> {
    try {
      const linkedIssue = await this.getLinkedIssue(documentId)
      if (!linkedIssue) {
        logger.info(`No linked Jira issue found for document ${documentId}`)
        return
      }

      const comment = `Document regenerated to version ${newVersion}${changeDescription ? `\n\nChanges: ${changeDescription}` : ""}`
      await this.service.addComment(linkedIssue.issueKey, comment)
      
      logger.info(`Updated Jira issue ${linkedIssue.issueKey} for document regeneration`)
    } catch (error) {
      logger.error(`Failed to update Jira issue for document ${documentId} regeneration:`, error)
      // Don't throw - this is a nice-to-have feature
    }
  }

  private async storeLinkage(
    documentId: string,
    issueKey: string,
    issueUrl: string,
    projectId: string
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO document_jira_links 
         (document_id, jira_issue_key, jira_issue_url, integration_id, project_id, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (document_id, integration_id) 
         DO UPDATE SET 
           jira_issue_key = EXCLUDED.jira_issue_key,
           jira_issue_url = EXCLUDED.jira_issue_url,
           updated_at = CURRENT_TIMESTAMP`,
        [documentId, issueKey, issueUrl, this.integrationId, projectId]
      )
    } catch (error) {
      logger.error("Failed to store Jira linkage:", error)
      throw error
    }
  }
}