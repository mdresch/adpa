/**
 * Integration Page Service
 * 
 * Fetches pages from Jira and Confluence integrations and converts them to Markdown
 * for use as project context. Uses existing adapter factories.
 * 
 * @module integrationPageService
 */

import { logger } from '../utils/logger'
import { confluenceAdapterFactory } from '../contexts/adapters/confluenceAdapter'
import { jiraAdapterFactory } from '../contexts/adapters/jiraAdapter'
import TurndownService from 'turndown'

// Initialize Turndown for HTML → Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
})

export interface IntegrationPage {
  id: string
  title: string
  url: string
  type: 'jira' | 'confluence'
  lastModified?: string
  spaceKey?: string // For Confluence
  projectKey?: string // For Jira
  summary?: string
}

export interface IntegrationPageContent {
  content: string // Markdown content
  title: string
  metadata: {
    pageId: string
    type: 'jira' | 'confluence'
    url: string
    fetchedAt: string
    wordCount: number
  }
}

/**
 * Counts words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Converts HTML or plain text to Markdown
 */
function convertToMarkdown(content: string): string {
  if (!content || content.trim().length === 0) {
    return ''
  }
  
  // If content looks like HTML, convert it
  if (content.trim().startsWith('<') || content.includes('<p>') || content.includes('<div>')) {
    return turndownService.turndown(content)
  }
  
  // Otherwise, return as-is (already text/Markdown)
  return content
}

export class IntegrationPageService {
  private confluenceAdapter = confluenceAdapterFactory()
  private jiraAdapter = jiraAdapterFactory()
  
  /**
   * Get available Confluence pages for a project
   * Optionally filters by search query
   */
  async getConfluencePages(projectId: string, search?: string): Promise<IntegrationPage[]> {
    try {
      logger.info('Fetching Confluence pages', { projectId, search })
      
      // Use search if provided, otherwise we'd need to list all pages (not ideal)
      // For now, if no search is provided, return empty array with a note
      if (!search || search.trim().length === 0) {
        logger.warn('Confluence page search requires a query. Returning empty results.')
        return []
      }
      
      const results = await this.confluenceAdapter.search({ query: search, fresh: false })
      
      return results.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        type: 'confluence' as const,
        lastModified: item.last_modified,
        spaceKey: item.metadata?.spaceKey as string | undefined,
        summary: item.summary,
      }))
    } catch (error: any) {
      logger.error('Failed to fetch Confluence pages', {
        projectId,
        search,
        error: error.message,
      })
      throw new Error(`Failed to fetch Confluence pages: ${error.message}`)
    }
  }
  
  /**
   * Get available Jira pages/issues for a project
   * Optionally filters by search query
   */
  async getJiraPages(projectId: string, search?: string): Promise<IntegrationPage[]> {
    try {
      logger.info('Fetching Jira pages', { projectId, search })
      
      // Use search if provided
      if (!search || search.trim().length === 0) {
        logger.warn('Jira page search requires a query. Returning empty results.')
        return []
      }
      
      const results = await this.jiraAdapter.search({ query: search, fresh: false })
      
      return results.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        type: 'jira' as const,
        lastModified: item.last_modified,
        summary: item.summary,
      }))
    } catch (error: any) {
      logger.error('Failed to fetch Jira pages', {
        projectId,
        search,
        error: error.message,
      })
      throw new Error(`Failed to fetch Jira pages: ${error.message}`)
    }
  }
  
  /**
   * Fetch full content of a specific integration page and convert to Markdown
   */
  async fetchPageContent(
    integrationType: 'jira' | 'confluence',
    pageId: string
  ): Promise<IntegrationPageContent> {
    try {
      logger.info('Fetching integration page content', { integrationType, pageId })
      
      let normalizedContext
      
      if (integrationType === 'confluence') {
        normalizedContext = await this.confluenceAdapter.fetchById({ id: pageId, fresh: false })
      } else {
        normalizedContext = await this.jiraAdapter.fetchById({ id: pageId, fresh: false })
      }
      
      if (!normalizedContext) {
        throw new Error(`Page not found: ${pageId}`)
      }
      
      // Convert summary/content to Markdown
      const markdown = convertToMarkdown(normalizedContext.summary || '')
      
      if (!markdown || markdown.trim().length === 0) {
        throw new Error('Page content is empty or could not be extracted')
      }
      
      const wordCount = countWords(markdown)
      
      logger.info('Integration page content fetched', {
        integrationType,
        pageId,
        title: normalizedContext.title,
        wordCount,
      })
      
      return {
        content: markdown,
        title: normalizedContext.title,
        metadata: {
          pageId: normalizedContext.id,
          type: integrationType,
          url: normalizedContext.url,
          fetchedAt: new Date().toISOString(),
          wordCount,
        },
      }
    } catch (error: any) {
      logger.error('Failed to fetch integration page content', {
        integrationType,
        pageId,
        error: error.message,
      })
      throw new Error(`Failed to fetch ${integrationType} page content: ${error.message}`)
    }
  }
  
  /**
   * Check if integration is available
   */
  async checkIntegrationAvailable(integrationType: 'jira' | 'confluence'): Promise<boolean> {
    try {
      if (integrationType === 'confluence') {
        await this.confluenceAdapter.search({ query: 'test', fresh: false })
        return true
      } else {
        await this.jiraAdapter.search({ query: 'test', fresh: false })
        return true
      }
    } catch (error: any) {
      logger.warn('Integration not available', { integrationType, error: error.message })
      return false
    }
  }
}

// Export singleton instance
export const integrationPageService = new IntegrationPageService()
