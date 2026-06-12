import { logger } from '../../utils/logger'
import { getByProjectId } from '../../database/projectIntegrations'
import { ConfluenceService } from '../../services/confluenceService'
import type { IQueueJob } from './queue/IQueue'
import type { PublishToConfluenceJobData } from './types'

export class PublishToConfluenceJobService {
  static async processJob(job: IQueueJob<PublishToConfluenceJobData>): Promise<{ success: boolean; pageUrl?: string }> {
    const { projectId, title, markdown } = job.data
    const startTime = Date.now()
    
    try {
      logger.info(`[PUBLISH-CONFLUENCE] Starting job ${job.id} for project ${projectId}`, {
        title,
        markdownLength: markdown.length
      })

      // Check project mapping
      const mapping = await getByProjectId(projectId)
      if (!mapping || !mapping.confluence_space_key) {
        logger.warn(`[PUBLISH-CONFLUENCE] No confluence mapping for project ${projectId}, skipping`)
        return { success: false }
      }

      // Read credentials from env
      const baseUrl = process.env.CONFLUENCE_BASE_URL || process.env.ATLASSIAN_CONFLUENCE_BASE_URL
      const username = process.env.CONFLUENCE_USERNAME || process.env.ATLASSIAN_USERNAME
      const apiToken = process.env.CONFLUENCE_API_TOKEN || process.env.ATLASSIAN_API_TOKEN

      if (!baseUrl || !username || !apiToken) {
        logger.warn('[PUBLISH-CONFLUENCE] Missing Confluence credentials in environment, skipping')
        return { success: false }
      }

      const client = new ConfluenceService({ baseUrl, username, apiToken })
      const storage = client.convertMarkdownToStorage(markdown)

      // If parent is set, update if page exists else create
      const spaceKey = mapping.confluence_space_key
      const parentId = mapping.confluence_parent_page_id || undefined

      let page
      try {
        // Attempt to find existing page by title in space
        const search = await client.searchContent(title, spaceKey)
        const existing = search.results?.find(r => r.title === title)
        if (existing) {
          // Get full page to access version.number
          const fullPage = await client.getPage(existing.id)
          page = await client.updatePage(existing.id, title, storage, fullPage.version.number + 1)
        } else {
          page = await client.createPage(spaceKey, title, storage, parentId)
        }
      } catch (e) {
        // Fallback: create fresh page
        page = await client.createPage(spaceKey, title, storage, parentId)
      }

      // Build URL in format: https://<domain>/wiki/spaces/<SPACE_KEY>/pages/<PAGE_ID>
      const siteBase = baseUrl.replace(/\/+$/, '') // Remove trailing slashes
      const url = `${siteBase}/wiki/spaces/${spaceKey}/pages/${page.id}`
      const processingTime = Date.now() - startTime
      
      logger.info(`[PUBLISH-CONFLUENCE] Published page for project ${projectId}: ${url}`, {
        pageId: page.id,
        spaceKey,
        processingTimeMs: processingTime,
        title
      })
      
      // Persist on document if provided
      if (url && job.data.documentId) {
        try {
          const { pool } = await Promise.resolve().then(() => require())
          await pool.query(
            `UPDATE documents SET confluence_page_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [url, job.data.documentId]
          )
          logger.debug(`[PUBLISH-CONFLUENCE] Updated document ${job.data.documentId} with Confluence URL`)
        } catch (e) {
          logger.warn('[PUBLISH-CONFLUENCE] Failed to persist confluence_page_url', e)
        }
      }

      return { success: true, pageUrl: url }
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error('[PUBLISH-CONFLUENCE] Job failed', {
        error: error.message,
        projectId,
        title,
        processingTimeMs: processingTime,
        jobId: job.id
      })
      throw error
    }
  }
}
