/**
 * External API Context Retriever
 * Retrieves context data from external APIs
 */

import { logger } from '../../../utils/logger'
import { BaseContextRetriever } from './base'
import type {
  ContextSource,
  ContextInjectionRequest
} from '../types'

export class ExternalApiRetriever extends BaseContextRetriever {
  protected sourceType = 'external_api'

  protected validateSourceSpecific(source: ContextSource): void {
    if (!source.query) {
      throw new Error('External API source requires a query (API endpoint)')
    }
  }

  protected async fetchData(source: ContextSource, request: ContextInjectionRequest): Promise<any> {
    const endpoint = source.query
    const parameters = source.parameters || {}

    try {
      logger.debug('Fetching data from external API', { endpoint, parameters })

      // Build URL with parameters
      const url = this.validateAndNormalizeUrl(this.buildUrl(endpoint, parameters))
      
      // Make API request
      const response = await this.makeApiRequest(url, parameters)

      return {
        endpoint,
        parameters,
        data: response.data,
        metadata: {
          status_code: response.status,
          response_time_ms: response.responseTime,
          headers: response.headers
        }
      }

    } catch (error) {
      logger.error('Failed to fetch data from external API', {
        endpoint,
        parameters,
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
    // Process external API data into structured format
    const processedData = {
      api_response: data.data,
      metadata: {
        ...data.metadata,
        endpoint: data.endpoint,
        parameters: data.parameters
      }
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
    
    // Calculate API-specific relevance
    const relevanceScore = this.calculateApiRelevance(data, source, request)
    
    // Calculate freshness based on API response
    const freshnessScore = this.calculateApiFreshness(data, source, request)
    
    // Calculate confidence based on API response quality
    const confidenceScore = this.calculateApiConfidence(data, source, request)

    return {
      ...baseMetadata,
      relevance_score: relevanceScore,
      freshness_score: freshnessScore,
      confidence_score: confidenceScore
    }
  }

  private buildUrl(endpoint: string, parameters: Record<string, any>): string {
    let url = endpoint

    // Replace path parameters
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`
      if (url.includes(placeholder)) {
        url = url.replace(placeholder, encodeURIComponent(String(value)))
      }
    }

    // Add query parameters
    const queryParams = new URLSearchParams()
    for (const [key, value] of Object.entries(parameters)) {
      if (!url.includes(`{${key}}`)) {
        queryParams.append(key, String(value))
      }
    }

    if (queryParams.toString()) {
      url += (url.includes('?') ? '&' : '?') + queryParams.toString()
    }

    return url
  }

  private async makeApiRequest(url: string, parameters: Record<string, any>): Promise<any> {
    const startTime = Date.now()

    try {
      // Default headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ADPA-ContextInjection/1.0'
      }

      // Add authentication headers if provided
      if (parameters.api_key) {
        headers['Authorization'] = `Bearer ${parameters.api_key}`
      }

      if (parameters.api_token) {
        headers['X-API-Token'] = parameters.api_token
      }

      // Make the request
      const response = await fetch(url, {
        method: parameters.method || 'GET',
        headers,
        body: parameters.body ? JSON.stringify(parameters.body) : undefined,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        responseTime
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      if (error.name === 'AbortError') {
        throw new Error(`API request timeout after ${responseTime}ms`)
      }

      throw error
    }
  }

  private validateAndNormalizeUrl(url: string): string {
    let parsed: URL

    try {
      parsed = new URL(url)
    } catch {
      throw new Error('Invalid external API URL')
    }

    const isHttp = parsed.protocol === 'http:'
    const isHttps = parsed.protocol === 'https:'
    if (!isHttp && !isHttps) {
      throw new Error('Unsupported URL protocol for external API source')
    }

    if (isHttp) {
      const isLoopbackHost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1'

      if (!isLoopbackHost) {
        throw new Error('Insecure HTTP is only allowed for loopback addresses')
      }
    }

    return parsed.toString()
  }

  private calculateApiRelevance(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let relevance = source.weight || 0.5

    // Increase relevance if API response contains useful data
    if (data.api_response && typeof data.api_response === 'object') {
      relevance += 0.2
    }

    if (data.metadata && data.metadata.status_code === 200) {
      relevance += 0.1
    }

    return Math.min(relevance, 1.0)
  }

  private calculateApiFreshness(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    // External APIs are generally considered fresh
    // Could be enhanced to check response timestamps or cache headers
    return 0.9
  }

  private calculateApiConfidence(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let confidence = 0.5

    if (data.metadata && data.metadata.status_code === 200) {
      confidence += 0.3
    }

    if (data.api_response && typeof data.api_response === 'object') {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }
}
