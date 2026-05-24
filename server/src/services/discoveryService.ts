/**
 * Discovery Service - Unified Search Hub
 * Orchestrates local vectorized search (Pinecone) and external web search.
 */

import { pineconeService } from './pineconeService'
import { logger } from '../utils/logger'

export interface SearchResult {
  title: string
  content: string
  url?: string
  source: 'internal' | 'external'
  score: number
  metadata?: any
}

export class DiscoveryService {
  /**
   * Unified search interface
   */
  async search(query: string, options: { limit?: number, source?: 'all' | 'internal' | 'external' } = {}): Promise<SearchResult[]> {
    const limit = options.limit || 5
    const source = options.source || 'all'
    const results: SearchResult[] = []

    logger.info(`Discovery search initiated for: "${query}"`, { source })

    try {
      // 1. Internal Search (Pinecone)
      if (source === 'all' || source === 'internal') {
        const internalResults = await pineconeService.search(query, limit)
        results.push(...internalResults.map((r: any) => ({
          title: r.metadata?.title || r.metadata?.name || 'Internal Document',
          content: r.metadata?.text || r.metadata?.content || r.metadata?.description || '',
          source: 'internal' as const,
          score: r.score,
          metadata: r.metadata
        })))
      }

      // 2. External Search (Placeholder for now)
      if (source === 'all' || source === 'external') {
        // In a real implementation, we'd call Exa, Tavily, or Google Search API
        logger.debug('External search triggered (Mock implementation)')
        results.push({
          title: "PMBOK 7th Edition Overview",
          content: "The Project Management Body of Knowledge (PMBOK Guide) is a set of standard terminology and guidelines for project management.",
          url: "https://www.pmi.org/pmbok-guide-standards",
          source: 'external' as const,
          score: 0.95
        })
      }

      // Sort by score and limit
      return results.sort((a, b) => b.score - a.score).slice(0, limit)

    } catch (error: any) {
      logger.error(`Discovery search failed: ${error.message}`, { error })
      return []
    }
  }
}

export const discoveryService = new DiscoveryService()
