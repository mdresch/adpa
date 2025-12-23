import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { JiraIntegration, JiraIntegrationConfig } from "../integrations/jira"

export interface JiraLinkageConfig {
  enabled: boolean
  integrationId?: string
  autoCreateIssues?: boolean
  linkConfluencePages?: boolean
  defaultIssueType?: string
  defaultPriority?: string
}

export class JiraLinkageService {
  /**
   * Check if Jira linkage is enabled globally
   */
  async isJiraLinkageEnabled(): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'jira_linkage_enabled' LIMIT 1`
      )
      
      if (result.rows.length === 0) {
        return false
      }
      
      return result.rows[0].setting_value === 'true'
    } catch (error) {
      logger.error("Failed to check Jira linkage setting:", error)
      return false
    }
  }

  /**
   * Enable or disable Jira linkage globally
   */
  async setJiraLinkageEnabled(enabled: boolean, updatedBy: string): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
         VALUES ('jira_linkage_enabled', $1, 'Enable/disable automatic Jira issue linkage for generated documents', $2)
         ON CONFLICT (setting_key) 
         DO UPDATE SET 
           setting_value = EXCLUDED.setting_value,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [enabled.toString(), updatedBy]
      )
      
      logger.info(`Jira linkage ${enabled ? 'enabled' : 'disabled'} by ${updatedBy}`)
    } catch (error) {
      logger.error("Failed to set Jira linkage setting:", error)
      throw error
    }
  }

  /**
   * Get the default Jira integration for linkage
   */
  async getDefaultJiraIntegration(): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'default_jira_integration_id' LIMIT 1`
      )
      
      if (result.rows.length === 0) {
        return null
      }
      
      return result.rows[0].setting_value
    } catch (error) {
      logger.error("Failed to get default Jira integration:", error)
      return null
    }
  }

  /**
   * Set the default Jira integration for linkage
   */
  async setDefaultJiraIntegration(integrationId: string, updatedBy: string): Promise<void> {
    try {
      // Verify the integration exists and is active
      const integrationCheck = await pool.query(
        `SELECT id, name FROM integrations WHERE id = $1 AND type = 'jira' AND is_active = true`,
        [integrationId]
      )
      
      if (integrationCheck.rows.length === 0) {
        throw new Error("Jira integration not found or inactive")
      }
      
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
         VALUES ('default_jira_integration_id', $1, 'Default Jira integration for document linkage', $2)
         ON CONFLICT (setting_key) 
         DO UPDATE SET 
           setting_value = EXCLUDED.setting_value,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [integrationId, updatedBy]
      )
      
      logger.info(`Default Jira integration set to ${integrationCheck.rows[0].name} by ${updatedBy}`)
    } catch (error) {
      logger.error("Failed to set default Jira integration:", error)
      throw error
    }
  }

  /**
   * Get Jira linkage configuration
   */
  async getJiraLinkageConfig(): Promise<JiraLinkageConfig> {
    try {
      const enabled = await this.isJiraLinkageEnabled()
      const integrationId = await this.getDefaultJiraIntegration()
      
      // Get additional settings
      const settingsResult = await pool.query(
        `SELECT setting_key, setting_value 
         FROM system_settings 
         WHERE setting_key IN ('jira_auto_create_issues', 'jira_link_confluence_pages', 'jira_default_issue_type', 'jira_default_priority')`
      )
      
      const settings: Record<string, string> = {}
      settingsResult.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value
      })
      
      return {
        enabled,
        integrationId: integrationId || undefined,
        autoCreateIssues: settings.jira_auto_create_issues === 'true',
        linkConfluencePages: settings.jira_link_confluence_pages === 'true',
        defaultIssueType: settings.jira_default_issue_type || 'Task',
        defaultPriority: settings.jira_default_priority || 'Medium'
      }
    } catch (error) {
      logger.error("Failed to get Jira linkage config:", error)
      return {
        enabled: false,
        autoCreateIssues: false,
        linkConfluencePages: false,
        defaultIssueType: 'Task',
        defaultPriority: 'Medium'
      }
    }
  }

  /**
   * Update Jira linkage configuration
   */
  async updateJiraLinkageConfig(config: Partial<JiraLinkageConfig>, updatedBy: string): Promise<void> {
    try {
      const updates: Array<{ key: string; value: string; description: string }> = []
      
      if (config.enabled !== undefined) {
        updates.push({
          key: 'jira_linkage_enabled',
          value: config.enabled.toString(),
          description: 'Enable/disable automatic Jira issue linkage for generated documents'
        })
      }
      
      if (config.autoCreateIssues !== undefined) {
        updates.push({
          key: 'jira_auto_create_issues',
          value: config.autoCreateIssues.toString(),
          description: 'Automatically create Jira issues for new documents'
        })
      }
      
      if (config.linkConfluencePages !== undefined) {
        updates.push({
          key: 'jira_link_confluence_pages',
          value: config.linkConfluencePages.toString(),
          description: 'Attach Confluence page URLs to Jira issues'
        })
      }
      
      if (config.defaultIssueType) {
        updates.push({
          key: 'jira_default_issue_type',
          value: config.defaultIssueType,
          description: 'Default issue type for created Jira issues'
        })
      }
      
      if (config.defaultPriority) {
        updates.push({
          key: 'jira_default_priority',
          value: config.defaultPriority,
          description: 'Default priority for created Jira issues'
        })
      }
      
      if (config.integrationId) {
        await this.setDefaultJiraIntegration(config.integrationId, updatedBy)
      }
      
      // Update all settings
      for (const update of updates) {
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (setting_key) 
           DO UPDATE SET 
             setting_value = EXCLUDED.setting_value,
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP`,
          [update.key, update.value, update.description, updatedBy]
        )
      }
      
      logger.info(`Jira linkage config updated by ${updatedBy}`)
    } catch (error) {
      logger.error("Failed to update Jira linkage config:", error)
      throw error
    }
  }

  /**
   * Create or link Jira issue for a document
   */
  async linkDocumentToJira(
    documentId: string,
    documentTitle: string,
    projectId: string,
    confluenceUrl?: string,
    issueDescription?: string,
    issueType?: string,
    priority?: string
  ): Promise<{ issueKey: string; issueUrl: string; created: boolean } | null> {
    try {
      const config = await this.getJiraLinkageConfig()
      
      if (!config.enabled || !config.integrationId) {
        logger.debug("Jira linkage not enabled or no integration configured")
        return null
      }
      
      // Get the Jira integration
      const integrationResult = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'jira' AND is_active = true`,
        [config.integrationId]
      )
      
      if (integrationResult.rows.length === 0) {
        logger.error("Configured Jira integration not found or inactive")
        return null
      }
      
      const integration = integrationResult.rows[0]
      
      // Decrypt credentials with validation
      let credentials: any
      try {
        const decryptedData = Buffer.from(integration.credentials_encrypted, "base64").toString("utf-8")
        credentials = JSON.parse(decryptedData)
        
        // Validate required credential fields
        if (!credentials.email || !credentials.apiToken) {
          logger.error("Invalid Jira credentials: missing required fields")
          return null
        }
      } catch (error) {
        logger.error("Failed to decrypt or validate Jira credentials:", error)
        return null
      }
      
      // Create Jira integration instance
      const jiraConfig: JiraIntegrationConfig = {
        baseUrl: integration.configuration.baseUrl || credentials.baseUrl,
        email: credentials.email,
        apiToken: credentials.apiToken,
        defaultProjectKey: integration.configuration.defaultProjectKey,
        defaultIssueType: config.defaultIssueType,
        defaultPriority: config.defaultPriority,
        autoCreateIssues: config.autoCreateIssues,
        linkConfluencePages: config.linkConfluencePages
      }
      
      const jiraIntegration = new JiraIntegration(jiraConfig, integration.id)
      
      // Create or link the issue
      const result = await jiraIntegration.createOrLinkIssueForDocument(
        documentId,
        documentTitle,
        projectId,
        confluenceUrl,
        issueDescription,
        issueType,
        priority
      )
      
      logger.info(`Document ${documentId} linked to Jira issue ${result.issueKey}`)
      return result
    } catch (error) {
      logger.error(`Failed to link document ${documentId} to Jira:`, error)
      // Don't throw - this is a nice-to-have feature
      return null
    }
  }

  /**
   * Update Jira issue when document is regenerated
   */
  async updateJiraForDocumentRegeneration(
    documentId: string,
    newVersion: string,
    changeDescription?: string
  ): Promise<void> {
    try {
      const config = await this.getJiraLinkageConfig()
      
      if (!config.enabled || !config.integrationId) {
        return
      }
      
      // Get the Jira integration
      const integrationResult = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'jira' AND is_active = true`,
        [config.integrationId]
      )
      
      if (integrationResult.rows.length === 0) {
        return
      }
      
      const integration = integrationResult.rows[0]
      
      // Decrypt credentials
      const credentials = JSON.parse(
        Buffer.from(integration.credentials_encrypted, "base64").toString("utf-8")
      )
      
      // Create Jira integration instance
      const jiraConfig: JiraIntegrationConfig = {
        baseUrl: integration.configuration.baseUrl || credentials.baseUrl,
        email: credentials.email,
        apiToken: credentials.apiToken,
        defaultProjectKey: integration.configuration.defaultProjectKey
      }
      
      const jiraIntegration = new JiraIntegration(jiraConfig, integration.id)
      
      // Update the issue
      await jiraIntegration.updateIssueForDocumentRegeneration(
        documentId,
        newVersion,
        changeDescription
      )
    } catch (error) {
      logger.error(`Failed to update Jira for document ${documentId} regeneration:`, error)
      // Don't throw - this is a nice-to-have feature
    }
  }

  /**
   * Get available Jira integrations
   */
  async getAvailableJiraIntegrations(): Promise<Array<{ id: string; name: string; projectKey?: string }>> {
    try {
      const result = await pool.query(
        `SELECT id, name, configuration FROM integrations WHERE type = 'jira' AND is_active = true ORDER BY name`
      )
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        projectKey: row.configuration?.defaultProjectKey
      }))
    } catch (error) {
      logger.error("Failed to get available Jira integrations:", error)
      return []
    }
  }
}

export const jiraLinkageService = new JiraLinkageService()