/**
 * Queues carrying long-running, resource-intensive generation work that must NEVER be
 * auto-requeued with a reset retry counter.
 *
 * WHY: A job stuck in `processing` on one of these queues re-published as a brand new
 * message starts a fresh attempt/backoff cycle from zero. Since this can happen on every
 * server restart (dev nodemon reload, prod redeploy), a job that fails for a persistent
 * reason (bad provider config, network issue) gets endlessly re-attempted across restarts
 * instead of exhausting its retry budget once — and each attempt can mint its own duplicate
 * downstream artifact (e.g. a fresh blank document). This exact failure mode has previously
 * produced 118+ stuck jobs (Jan 2026) and, separately, hundreds of duplicate blank documents
 * (Jul 2026) via `initializeQueues()`'s orphan-recovery path re-publishing on every restart.
 *
 * Jobs on these queues that are found stuck/orphaned must be parked (status = 'stuck')
 * for manual retry from the Job Monitor UI instead of being silently resumed.
 */
export const NEVER_AUTO_REQUEUE_QUEUES = new Set([
  'ai-processing',
  'document-processing',
  'document-regeneration',
  'gkg-sync',
  'project-data-extraction',
])

export function isNeverRequeueJob(queueName: string | null | undefined, jobType?: string | null): boolean {
  if (queueName && NEVER_AUTO_REQUEUE_QUEUES.has(queueName)) return true
  return typeof jobType === 'string' && jobType.startsWith('extract-entity-')
}
