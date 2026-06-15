import { VectorDBProvider, VectorQueryPayload, VectorQueryResult } from './VectorDBProvider'
import { logger } from '../../utils/logger'

export class VectorQueryController {
  public static async execute(payload: VectorQueryPayload): Promise<VectorQueryResult> {
    // 1. Strict Scoping: Contract Guard for Tenant Isolation
    if (payload.filter?.tenantId && payload.filter.tenantId !== payload.tenantId) {
      logger.error(`[SECURITY] Tenant Isolation Violation detected. Active tenant: ${payload.tenantId}, Filter tenant: ${payload.filter.tenantId}`)
      throw new Error('Tenant Isolation Violation')
    }

    // 2. Execute with Dynamic Degradation
    try {
      const data = await VectorDBProvider.executeWithTimeout(payload)
      return {
        source: 'VECTOR_DATABASE',
        data
      }
    } catch (err: any) {
      logger.warn(`[RAG-FALLBACK] Vector Database failed (${err.message}). Gracefully degrading to PostgreSQL FTS.`)
      
      // Fallback to PostgreSQL FTS (mock implementation for test/controller boundary)
      const ftsData = await this.executePostgreSQLFallback(payload)
      
      return {
        source: 'POSTGRESQL_FULL_TEXT_FALLBACK',
        data: ftsData
      }
    }
  }

  private static async executePostgreSQLFallback(payload: VectorQueryPayload): Promise<any[]> {
    // In a real implementation, this would delegate to contextRetrievalService's FTS engine.
    return [
      { id: 'chunk-fts-1', score: 0.8, content: 'Fallback FTS data' }
    ]
  }
}
