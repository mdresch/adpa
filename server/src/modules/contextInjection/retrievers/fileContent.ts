/**
 * File Content Context Retriever
 * Retrieves context data from file content
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '../../../utils/logger'
import { BaseContextRetriever } from './base'
import type {
  ContextSource,
  ContextInjectionRequest
} from '../types'

export class FileContentRetriever extends BaseContextRetriever {
  protected sourceType = 'file_content'

  protected validateSourceSpecific(source: ContextSource): void {
    if (!source.parameters?.file_path && !source.query) {
      throw new Error('File content source requires file_path parameter or query')
    }
  }

  protected async fetchData(source: ContextSource, request: ContextInjectionRequest): Promise<any> {
    const filePath = source.parameters?.file_path || source.query

    if (!filePath) {
      throw new Error('File path is required for file content retrieval')
    }

    try {
      logger.debug('Reading file content', { file_path: filePath })

      // Read file content
      const content = await fs.readFile(filePath, 'utf8')
      
      // Get file stats
      const stats = await fs.stat(filePath)

      return {
        file_path: filePath,
        content,
        metadata: {
          file_size: stats.size,
          last_modified: stats.mtime,
          file_extension: path.extname(filePath),
          file_name: path.basename(filePath)
        }
      }

    } catch (error) {
      logger.error('Failed to read file content', {
        file_path: filePath,
        error: error.message
      })
      throw error
    }
  }

  protected async processData(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<any> {
    // Process file content based on file type
    const processedData = {
      file_path: data.file_path,
      content: data.content,
      processed_content: this.processFileContent(data.content, data.metadata.file_extension),
      metadata: data.metadata
    }

    return processedData
  }

  protected async calculateMetadata(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<{
    relevance_score: number
    freshness_score: number
    confidence_score: number
    size_bytes: number
  }> {
    const baseMetadata = await super.calculateMetadata(data, source, request)
    
    // Calculate file-specific relevance
    const relevanceScore = this.calculateFileRelevance(data, source, request)
    
    // Calculate freshness based on file modification date
    const freshnessScore = this.calculateFileFreshness(data, source, request)
    
    // Calculate confidence based on file content quality
    const confidenceScore = this.calculateFileConfidence(data, source, request)

    return {
      ...baseMetadata,
      relevance_score: relevanceScore,
      freshness_score: freshnessScore,
      confidence_score: confidenceScore
    }
  }

  private processFileContent(content: string, fileExtension: string): any {
    switch (fileExtension.toLowerCase()) {
      case '.json':
        try {
          return JSON.parse(content)
        } catch (error) {
          logger.warn('Failed to parse JSON file content', { error: error.message })
          return content
        }

      case '.yaml':
      case '.yml':
        // For now, return as string - could add YAML parsing later
        return content

      case '.md':
      case '.markdown':
        // Markdown content - could be processed further
        return {
          type: 'markdown',
          content,
          sections: this.extractMarkdownSections(content)
        }

      case '.txt':
        return {
          type: 'text',
          content,
          lines: content.split('\n').length
        }

      default:
        return {
          type: 'raw',
          content
        }
    }
  }

  private extractMarkdownSections(content: string): string[] {
    const sections: string[] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        sections.push(line.trim())
      }
    }
    
    return sections
  }

  private calculateFileRelevance(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let relevance = source.weight || 0.5

    // Increase relevance if file has content
    if (data.content && data.content.length > 0) {
      relevance += 0.2
    }

    // Increase relevance based on file type
    const extension = data.metadata.file_extension.toLowerCase()
    if (['.json', '.yaml', '.yml', '.md', '.markdown'].includes(extension)) {
      relevance += 0.1
    }

    return Math.min(relevance, 1.0)
  }

  private calculateFileFreshness(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    if (!data.metadata || !data.metadata.last_modified) {
      return 0.5
    }

    const lastModified = new Date(data.metadata.last_modified)
    const now = new Date()
    const daysSinceModified = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24)

    // Freshness decreases over time
    if (daysSinceModified < 1) return 1.0
    if (daysSinceModified < 7) return 0.9
    if (daysSinceModified < 30) return 0.7
    if (daysSinceModified < 90) return 0.5
    return 0.3
  }

  private calculateFileConfidence(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let confidence = 0.5

    if (data.content && data.content.length > 0) {
      confidence += 0.3
    }

    if (data.processed_content && typeof data.processed_content === 'object') {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }
}
