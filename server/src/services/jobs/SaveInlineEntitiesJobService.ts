/**
 * Lightweight job: parse H8 inline entity tags and persist to domain tables.
 * No LLM calls — identification already happened during document generation.
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { InlineEntityParserService } from '../inlineEntityParserService'
import type { IQueueJob } from './queue/IQueue'
import type { JobStatus, QueueName, SaveInlineEntitiesJobData } from './types'
import type { QueueServiceDependencies } from './queue/QueueDependencies'

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (
    jobId: string,
    status: JobStatus,
    progress: number,
    workerId?: string,
    queueName?: QueueName | string,
    errorMessage?: string
  ) => Promise<void>
  dependencies?: QueueServiceDependencies
}

export class SaveInlineEntitiesJobService {
  static async processJob(job: IQueueJob, options: ProcessJobOptions): Promise<{
    success: boolean
    jobId: string
    documentId: string
    extractedCount: number
    extractedCountByType: Record<string, number>
  }> {
    const data = job.data as SaveInlineEntitiesJobData
    const jobId = data.jobId || String(job.id)
    const { workerId, updateJobStatus } = options

    const projectId = data.projectId
    const documentId = data.documentId
    const userId = data.userId || null

    if (!projectId || !documentId) {
      throw new Error('save-inline-entities requires projectId and documentId')
    }

    await updateJobStatus(jobId, 'processing', 10, workerId, 'ai-processing')

    let markdown = data.markdown
    if (!markdown) {
      const docRes = await pool.query(
        'SELECT content FROM documents WHERE id = $1 AND project_id = $2',
        [documentId, projectId]
      )
      markdown = docRes.rows[0]?.content || ''
    }

    if (!markdown || !markdown.trim()) {
      logger.warn(`[SAVE-INLINE-ENTITIES] No content for document ${documentId}, completing with zero entities`)
      await updateJobStatus(jobId, 'completed', 100, workerId, 'ai-processing')
      return { success: true, jobId, documentId, extractedCount: 0, extractedCountByType: {} }
    }

    let providedEntities = data.providedEntities
    if (!providedEntities) {
      try {
        const projectRes = await pool.query(
          `SELECT metadata->'existing_entities' as existing_entities FROM projects WHERE id = $1`,
          [projectId]
        )
        providedEntities = projectRes.rows[0]?.existing_entities || []
      } catch {
        providedEntities = []
      }
    }

    await updateJobStatus(jobId, 'processing', 40, workerId, 'ai-processing')

    const parseResult = await InlineEntityParserService.parseAndProcess({
      projectId,
      userId,
      documentId,
      markdown,
      providedEntities,
      persist: true,
    })

    if (parseResult.persistFailures.length > 0) {
      const errorMessage = `Domain persistence failed for ${parseResult.persistFailures.length} entity type(s): ${parseResult.persistFailures.join('; ')}`
      logger.error(`[SAVE-INLINE-ENTITIES] ${errorMessage}`, { jobId, documentId, projectId })
      await updateJobStatus(jobId, 'failed', 100, workerId, 'ai-processing', errorMessage)
      throw new Error(errorMessage)
    }

    const counts = parseResult.extractedCountByType || {}
    if (parseResult.extractedCount > 0) {
      try {
        const total = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0)
        await pool.query(
          `UPDATE documents SET entity_counts = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify({ ...counts, total }), documentId]
        )
      } catch (err) {
        logger.error(err, `[SAVE-INLINE-ENTITIES] Failed to update entity_counts for ${documentId}`)
      }
    }

    await updateJobStatus(jobId, 'completed', 100, workerId, 'ai-processing')

    logger.info(`[SAVE-INLINE-ENTITIES] Saved ${parseResult.extractedCount} inline entities for document ${documentId}`, {
      jobId,
      projectId,
      extractedCountByType: counts,
    })

    return {
      success: true,
      jobId,
      documentId,
      extractedCount: parseResult.extractedCount,
      extractedCountByType: counts,
    }
  }
}
