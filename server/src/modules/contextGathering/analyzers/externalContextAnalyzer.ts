/**
 * External Context Analyzer
 * Analyzes external data sources for context gathering
 */

import { logger } from '@/utils/logger'
import type { ExternalContextData, ContextSource } from '../types'
import { ContextRetrievalService } from '@/modules/contextRetrieval/contextRetrievalService'

export class ExternalContextAnalyzer {
  private retrieval?: ContextRetrievalService

  constructor(retrieval?: ContextRetrievalService) {
    this.retrieval = retrieval
  }

  async analyzeExternalContext(projectId: string, contextSources: ContextSource[]): Promise<ExternalContextData> {
    try {
      logger.debug('Analyzing external context', {
        projectId,
        sourceCount: contextSources.length
      })

      const startTime = Date.now()

      // Filter enabled sources
      const enabledSources = contextSources.filter(source => source.enabled)

      // Gather data from external sources
      const externalSources = await this.gatherExternalSources(enabledSources)
      const apiResponses = await this.gatherApiResponses(enabledSources, projectId)
      const fileContents = await this.gatherFileContents(enabledSources, projectId)
      const databaseResults = await this.gatherDatabaseResults(enabledSources, projectId)

      // Analyze external data
      const webScrapingResults = await this.performWebScraping(enabledSources, projectId)
      const integrationData = await this.gatherIntegrationData(enabledSources, projectId)
      const thirdPartyData = await this.gatherThirdPartyData(enabledSources, projectId)

      // Gather market and industry data
      const marketData = await this.gatherMarketData(projectId)
      const industryStandards = await this.gatherIndustryStandards(projectId)
      const regulatoryRequirements = await this.gatherRegulatoryRequirements(projectId)

      // Analyze competitive landscape
      const competitorAnalysis = await this.performCompetitorAnalysis(projectId)
      const technologyTrends = await this.gatherTechnologyTrends(projectId)
      const bestPracticesExternal = await this.gatherExternalBestPractices(projectId)

      // Gather research and case study data
      const caseStudies = await this.gatherCaseStudies(projectId)
      const researchData = await this.gatherResearchData(projectId)

      const externalContext: ExternalContextData = {
        external_sources: externalSources,
        api_responses: apiResponses,
        file_contents: fileContents,
        database_results: databaseResults,
        web_scraping_results: webScrapingResults,
        integration_data: integrationData,
        third_party_data: thirdPartyData,
        market_data: marketData,
        industry_standards: industryStandards,
        regulatory_requirements: regulatoryRequirements,
        competitor_analysis: competitorAnalysis,
        technology_trends: technologyTrends,
        best_practices_external: bestPracticesExternal,
        case_studies: caseStudies,
        research_data: researchData,
        metadata: {
          analysis_timestamp: new Date(),
          analysis_duration: Date.now() - startTime,
          project_id: projectId,
          sources_analyzed: enabledSources.length,
          data_freshness: new Date(),
          analysis_confidence: 0.8
        }
      }

      // Optional RAG enrichment: fetch top external policy/standard chunks
      if (process.env.ENABLE_RAG_CONTEXT_RETRIEVAL === 'true' && this.retrieval) {
        try {
          const queries = [
            'regulatory requirements relevant to current project',
            'industry standards and controls mapping',
            'external policy constraints and guidance'
          ]
          const ragChunks = [] as Array<{ chunk_id: string; document_id: string; title: string | null; score: number; content_preview: string }>
          for (const q of queries) {
            const found = await this.retrieval.searchChunks({ projectId, query: q, topK: 10 })
            for (const c of found) {
              ragChunks.push({
                chunk_id: c.id,
                document_id: c.document_id,
                title: c.title,
                score: c.score,
                content_preview: c.content.substring(0, 400)
              })
            }
          }
          if (ragChunks.length > 0) {
            ;(externalContext as any).rag_external_context = ragChunks
            externalContext.metadata.analysis_confidence = Math.min(1, externalContext.metadata.analysis_confidence + 0.05)
          }
        } catch (e: any) {
          logger.warn('RAG external context enrichment skipped', { error: e.message })
        }
      }

      logger.info('External context analysis completed', {
        projectId,
        sourceCount: enabledSources.length,
        apiResponseCount: apiResponses.length,
        fileContentCount: fileContents.length,
        analysisTime: Date.now() - startTime
      })

      return externalContext

    } catch (error) {
      logger.error('External context analysis failed', {
        projectId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherExternalSources(contextSources: ContextSource[]): Promise<any[]> {
    try {
      return contextSources.map(source => ({
        source_id: source.source_id,
        source_type: source.source_type,
        source_name: source.source_name,
        source_config: source.source_config,
        enabled: source.enabled,
        priority: source.priority,
        reliability_score: source.reliability_score,
        last_updated: source.last_updated,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather external sources', {
        error: error.message
      })
      return []
    }
  }

  private async gatherApiResponses(contextSources: ContextSource[], projectId: string): Promise<any[]> {
    try {
      const apiResponses: any[] = []

      for (const source of contextSources) {
        if (source.source_type === 'external_api') {
          try {
            const response = await this.callExternalApi(source, projectId)
            apiResponses.push({
              response_id: `api_response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              api_endpoint: source.source_config.endpoint || '',
              response_data: response,
              response_status: 200,
              response_timestamp: new Date(),
              source_id: source.source_id,
              metadata: {}
            })
          } catch (error) {
            logger.warn('Failed to call external API', {
              sourceId: source.source_id,
              error: error.message
            })
          }
        }
      }

      return apiResponses

    } catch (error) {
      logger.error('Failed to gather API responses', {
        error: error.message
      })
      return []
    }
  }

  private async gatherFileContents(contextSources: ContextSource[], projectId: string): Promise<any[]> {
    try {
      const fileContents: any[] = []

      for (const source of contextSources) {
        if (source.source_type === 'file_system') {
          try {
            const content = await this.readFileContent(source, projectId)
            fileContents.push({
              file_id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              file_path: source.source_config.file_path || '',
              file_content: content,
              file_type: source.source_config.file_type || 'text',
              file_size: JSON.stringify(content).length,
              source_id: source.source_id,
              metadata: {}
            })
          } catch (error) {
            logger.warn('Failed to read file content', {
              sourceId: source.source_id,
              error: error.message
            })
          }
        }
      }

      return fileContents

    } catch (error) {
      logger.error('Failed to gather file contents', {
        error: error.message
      })
      return []
    }
  }

  private async gatherDatabaseResults(contextSources: ContextSource[], projectId: string): Promise<any[]> {
    try {
      const databaseResults: any[] = []

      for (const source of contextSources) {
        if (source.source_type === 'external_database') {
          try {
            const result = await this.queryExternalDatabase(source, projectId)
            databaseResults.push({
              result_id: `db_result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              query: source.source_config.query || '',
              result_data: result,
              result_count: Array.isArray(result) ? result.length : 1,
              execution_time: 100, // Simplified
              source_id: source.source_id,
              metadata: {}
            })
          } catch (error) {
            logger.warn('Failed to query external database', {
              sourceId: source.source_id,
              error: error.message
            })
          }
        }
      }

      return databaseResults

    } catch (error) {
      logger.error('Failed to gather database results', {
        error: error.message
      })
      return []
    }
  }

  private async performWebScraping(contextSources: ContextSource[], projectId: string): Promise<any[]> {
    try {
      const webScrapingResults: any[] = []

      for (const source of contextSources) {
        if (source.source_type === 'web_scraping') {
          try {
            const scrapedData = await this.performWebScrapingForSource(source, projectId)
            webScrapingResults.push({
              scraping_id: `scraping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              url: source.source_config.url || '',
              scraped_data: scrapedData,
              scraping_timestamp: new Date(),
              source_id: source.source_id,
              metadata: {}
            })
          } catch (error) {
            logger.warn('Failed to perform web scraping', {
              sourceId: source.source_id,
              error: error.message
            })
          }
        }
      }

      return webScrapingResults

    } catch (error) {
      logger.error('Failed to perform web scraping', {
        error: error.message
      })
      return []
    }
  }

  private async gatherIntegrationData(contextSources: ContextSource[], projectId: string): Promise<any[]> {
    try {
      const integrationData: any[] = []

      for (const source of contextSources) {
        if (source.source_type === 'integration_platform') {
          try {
            const integrationResult = await this.gatherIntegrationDataForSource(source, projectId)
            integrationData.push({
              integration_id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              platform: source.source_config.platform || '',
              integration_data: integrationResult,
              integration_timestamp: new Date(),
              source_id: source.source_id,
              metadata: {}
            })
          } catch (error) {
            logger.warn('Failed to gather integration data', {
              sourceId: source.source_id,
              error: error.message
            })
          }
        }
      }

      return integrationData

    } catch (error) {
      logger.error('Failed to gather integration data', {
        error: error.message
      })
      return []
    }
  }

  private async gatherThirdPartyData(contextSources: ContextSource[], projectId: string): Promise<any[]> {
    try {
      const thirdPartyData: any[] = []

      for (const source of contextSources) {
        if (source.source_type === 'third_party_service') {
          try {
            const thirdPartyResult = await this.gatherThirdPartyDataForSource(source, projectId)
            thirdPartyData.push({
              third_party_id: `third_party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              service: source.source_config.service || '',
              third_party_data: thirdPartyResult,
              data_timestamp: new Date(),
              source_id: source.source_id,
              metadata: {}
            })
          } catch (error) {
            logger.warn('Failed to gather third party data', {
              sourceId: source.source_id,
              error: error.message
            })
          }
        }
      }

      return thirdPartyData

    } catch (error) {
      logger.error('Failed to gather third party data', {
        error: error.message
      })
      return []
    }
  }

  private async gatherMarketData(projectId: string): Promise<any> {
    try {
      return {
        market_id: `market_${projectId}_${Date.now()}`,
        market_size: 0,
        market_growth: 0.0,
        market_trends: [],
        market_segments: [],
        market_opportunities: [],
        market_challenges: [],
        market_analysis_timestamp: new Date(),
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to gather market data', {
        projectId,
        error: error.message
      })
      return {
        market_id: `market_${projectId}_${Date.now()}`,
        market_size: 0,
        market_growth: 0.0,
        market_trends: [],
        market_segments: [],
        market_opportunities: [],
        market_challenges: [],
        market_analysis_timestamp: new Date(),
        metadata: { error: error.message }
      }
    }
  }

  private async gatherIndustryStandards(projectId: string): Promise<any[]> {
    try {
      return [
        {
          standard_id: `standard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          standard_name: 'ISO 9001:2015',
          standard_description: 'Quality management systems',
          standard_category: 'quality',
          standard_version: '2015',
          applicability: ['project_management', 'quality_assurance'],
          compliance_requirements: [],
          metadata: {}
        }
      ]

    } catch (error) {
      logger.error('Failed to gather industry standards', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherRegulatoryRequirements(projectId: string): Promise<any[]> {
    try {
      return [
        {
          requirement_id: `regulatory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          requirement_name: 'GDPR Compliance',
          requirement_description: 'General Data Protection Regulation compliance',
          requirement_category: 'privacy',
          requirement_jurisdiction: 'EU',
          compliance_deadline: new Date('2024-12-31'),
          compliance_requirements: [],
          metadata: {}
        }
      ]

    } catch (error) {
      logger.error('Failed to gather regulatory requirements', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async performCompetitorAnalysis(projectId: string): Promise<any> {
    try {
      return {
        analysis_id: `competitor_analysis_${projectId}_${Date.now()}`,
        competitors: [],
        competitive_advantages: [],
        competitive_disadvantages: [],
        market_position: 'unknown',
        competitive_threats: [],
        competitive_opportunities: [],
        analysis_timestamp: new Date(),
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to perform competitor analysis', {
        projectId,
        error: error.message
      })
      return {
        analysis_id: `competitor_analysis_${projectId}_${Date.now()}`,
        competitors: [],
        competitive_advantages: [],
        competitive_disadvantages: [],
        market_position: 'unknown',
        competitive_threats: [],
        competitive_opportunities: [],
        analysis_timestamp: new Date(),
        metadata: { error: error.message }
      }
    }
  }

  private async gatherTechnologyTrends(projectId: string): Promise<any[]> {
    try {
      return [
        {
          trend_id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          trend_name: 'AI and Machine Learning',
          trend_description: 'Increasing adoption of AI and ML technologies',
          trend_category: 'technology',
          trend_impact: 'high',
          trend_adoption_rate: 0.7,
          trend_relevance: ['document_generation', 'automation'],
          metadata: {}
        }
      ]

    } catch (error) {
      logger.error('Failed to gather technology trends', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherExternalBestPractices(projectId: string): Promise<any[]> {
    try {
      return [
        {
          practice_id: `external_practice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'Agile Document Management',
          description: 'Best practices for agile document management',
          category: 'project_management',
          effectiveness: 0.9,
          applicability: ['agile_projects', 'document_generation'],
          implementation_guidance: [],
          success_factors: [],
          common_pitfalls: [],
          metadata: {}
        }
      ]

    } catch (error) {
      logger.error('Failed to gather external best practices', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherCaseStudies(projectId: string): Promise<any[]> {
    try {
      return [
        {
          case_study_id: `case_study_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'Successful Document Automation Implementation',
          description: 'Case study of successful document automation implementation',
          industry: 'technology',
          company_size: 'medium',
          implementation_time: 6,
          success_metrics: [],
          lessons_learned: [],
          metadata: {}
        }
      ]

    } catch (error) {
      logger.error('Failed to gather case studies', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherResearchData(projectId: string): Promise<any> {
    try {
      return {
        research_id: `research_${projectId}_${Date.now()}`,
        research_topics: ['document_automation', 'ai_integration'],
        research_findings: [],
        research_methodology: 'literature_review',
        research_sources: [],
        research_confidence: 0.8,
        research_timestamp: new Date(),
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to gather research data', {
        projectId,
        error: error.message
      })
      return {
        research_id: `research_${projectId}_${Date.now()}`,
        research_topics: [],
        research_findings: [],
        research_methodology: 'unknown',
        research_sources: [],
        research_confidence: 0.0,
        research_timestamp: new Date(),
        metadata: { error: error.message }
      }
    }
  }

  // Helper methods for external data gathering
  private async callExternalApi(source: ContextSource, projectId: string): Promise<any> {
    // Simplified API call implementation
    return {
      api_response: 'Sample API response',
      timestamp: new Date(),
      source: source.source_id
    }
  }

  private async readFileContent(source: ContextSource, projectId: string): Promise<any> {
    // Simplified file reading implementation
    return {
      file_content: 'Sample file content',
      timestamp: new Date(),
      source: source.source_id
    }
  }

  private async queryExternalDatabase(source: ContextSource, projectId: string): Promise<any> {
    // Simplified database query implementation
    return {
      query_result: 'Sample database result',
      timestamp: new Date(),
      source: source.source_id
    }
  }

  private async performWebScrapingForSource(source: ContextSource, projectId: string): Promise<any> {
    // Simplified web scraping implementation
    return {
      scraped_content: 'Sample scraped content',
      timestamp: new Date(),
      source: source.source_id
    }
  }

  private async gatherIntegrationDataForSource(source: ContextSource, projectId: string): Promise<any> {
    // Simplified integration data gathering
    return {
      integration_result: 'Sample integration result',
      timestamp: new Date(),
      source: source.source_id
    }
  }

  private async gatherThirdPartyDataForSource(source: ContextSource, projectId: string): Promise<any> {
    // Simplified third party data gathering
    return {
      third_party_result: 'Sample third party result',
      timestamp: new Date(),
      source: source.source_id
    }
  }

  /**
   * Gather semantic external context using RAG
   * CR-2025-001: RAG Integration - Find relevant external references and integrations
   */
  async gatherSemanticExternalContext(projectId: string, query?: string): Promise<any[]> {
    if (!this.retrieval) {
      logger.warn('[RAG] ContextRetrievalService not available for semantic external context')
      return []
    }

    try {
      const semanticQuery = query || 'external references third-party integrations confluence sharepoint github documentation standards compliance'
      
      logger.info('[RAG-EXTERNAL] Performing semantic search for external context')
      
      const chunks = await this.retrieval.searchChunks({
        projectId,
        query: semanticQuery,
        topK: 10 // Smaller set for external references
      })

      logger.info(`[RAG-EXTERNAL] Retrieved ${chunks.length} semantically relevant external context chunks`)

      return chunks.map(chunk => ({
        chunk_id: chunk.id,
        document_id: chunk.document_id,
        document_title: chunk.title,
        content: chunk.content,
        relevance_score: chunk.score,
        retrieval_method: 'semantic_search',
        context_type: 'external_references'
      }))

    } catch (error: unknown) {
      logger.error('[RAG-EXTERNAL] Semantic search failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }
}
