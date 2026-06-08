/**
 * Routes post-document entity work to the correct job type:
 * - H8 inline tags present → save-inline-entities (parse + persist, no LLM)
 * - No H8 tags → extract-project-data (legacy LLM extraction)
 */

import { v4 as uuidv4 } from 'uuid'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { hasInlineH8EntityTags } from '../inlineEntityParserService'
import { addJob } from '../queueService'

export interface EnqueueEntityPersistenceOptions {
  projectId: string
  userId: string | null
  documentId: string
  /** Document markdown; loaded from DB when omitted */
  content?: string
  parentJobId?: string
  triggeredBy?: string
  autoTriggered?: boolean
}

async function resolveDocumentContent(
  documentId: string,
  content?: string
): Promise<string> {
  if (content !== undefined && content !== null) return content
  const res = await pool.query('SELECT content FROM documents WHERE id = $1', [documentId])
  return res.rows[0]?.content || ''
}

/**
 * Enqueue entity persistence for a document. Skips LLM extraction when H8 tags are present.
 * @returns job id, or null when skipped (no content / no tags and nothing to extract)
 */
export async function enqueueEntityPersistence(
  options: EnqueueEntityPersistenceOptions
): Promise<string | null> {
  const {
    projectId,
    userId,
    documentId,
    parentJobId,
    triggeredBy = 'document-save',
    autoTriggered = true,
  } = options

  const content = await resolveDocumentContent(documentId, options.content)

  if (!content.trim()) {
    logger.info('[ENTITY-PERSIST] Skipping — document has no content', { documentId, projectId })
    return null
  }

  const jobId = uuidv4()

  if (hasInlineH8EntityTags(content)) {
    logger.info('[ENTITY-PERSIST] H8 tags detected — enqueueing save-inline-entities (skipping LLM extract)', {
      documentId,
      projectId,
      triggeredBy,
    })

    return addJob(
      'save-inline-entities',
      {
        jobId,
        projectId,
        userId,
        documentId,
        markdown: content,
        parentJobId,
        triggeredBy,
        autoTriggered,
      },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        timeout: 120000,
      }
    )
  }

  logger.info('[ENTITY-PERSIST] No H8 tags — enqueueing extract-project-data', {
    documentId,
    projectId,
    triggeredBy,
  })

  return addJob(
    'extract-project-data',
    {
      jobId,
      projectId,
      userId,
      documentIds: [documentId],
      sourceDocumentId: documentId,
      autoTriggered,
      triggeredBy,
      parentJobId,
    },
    {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      timeout: 300000,
    }
  )
}
