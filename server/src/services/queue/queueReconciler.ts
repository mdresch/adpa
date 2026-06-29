/**
 * Pending-job reconciliation (REQ-004).
 *
 * Governed by:
 *   docs/superpowers/specs/2026-06-29-doc-gen-queue-consumer-health-design.md
 *   .agents/skills/adpa-doc-gen-queue-health/SKILL.md
 *
 * When the backend boots without a live consumer (RabbitMQ down, or registration
 * failed), generation jobs are inserted as `pending` but the RabbitMQ message is never
 * delivered/lost. Durable queues normally redeliver on reconnect, so this reconciler is
 * a fallback for the case where the message is gone but the `jobs` row says `pending`.
 *
 * Safety: it re-publishes the message ONLY (it does NOT re-insert the DB row — the row
 * already exists at `pending`). It targets only `pending` generation jobs with no live
 * worker that are older than the grace window. It NEVER touches `processing` jobs
 * (orphan recovery owns those — re-publishing a started job risks a duplicate document).
 *
 * Because a buffered/durable message could still redeliver, re-publishing can in theory
 * double-deliver. It is therefore OFF by default and enabled with
 * QUEUE_PENDING_RECONCILE=true to drain a known-lost backlog.
 */

import { logger } from "../../utils/logger"
import { selectStalledPendingJobs, PROTECTED_GENERATION_QUEUES, PendingJobRow } from "./queueHealth"
import type { IQueue } from "../jobs/queue/IQueue"

export interface ReconcileDeps {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>
  /** Map of queue_name -> queue adapter (e.g. "ai-processing" -> aiQueue). */
  queuesByName: Map<string, IQueue>
  nowMs?: number
}

export interface ReconcileResult {
  scanned: number
  republished: number
  jobIds: string[]
}

/**
 * Re-publish stalled `pending` generation jobs so the backlog drains once a consumer
 * is live. Returns a summary; never throws for individual job failures.
 */
export async function reconcilePendingGenerationJobs(deps: ReconcileDeps): Promise<ReconcileResult> {
  const nowMs = deps.nowMs ?? Date.now()
  const queueList = Array.from(PROTECTED_GENERATION_QUEUES)

  const result = await deps.query(
    `SELECT id, type, data, status, queue_name, worker_id, queued_at
       FROM jobs
      WHERE status = 'pending'
        AND queue_name = ANY($1::text[])`,
    [queueList],
  )

  const rows: PendingJobRow[] = result.rows.map((r) => ({
    id: r.id,
    status: r.status,
    queue_name: r.queue_name,
    worker_id: r.worker_id,
    queued_at: r.queued_at,
  }))

  const stalled = selectStalledPendingJobs(rows, { nowMs })
  const republishedIds: string[] = []

  for (const row of stalled) {
    const original = result.rows.find((r) => r.id === row.id)
    const queue = deps.queuesByName.get(row.queue_name)
    if (!queue || !original) continue
    try {
      // Re-publish the message only — the DB row already exists at 'pending'.
      await queue.add(original.type, original.data, { jobId: row.id })
      republishedIds.push(row.id)
    } catch (err) {
      logger.error(
        `[QUEUE-RECONCILE] Failed to re-publish pending job ${row.id} on ${row.queue_name}`,
        err,
      )
    }
  }

  if (republishedIds.length > 0) {
    logger.warn(
      `[QUEUE-RECONCILE] Re-published ${republishedIds.length} stalled pending generation job(s)`,
      { jobIds: republishedIds },
    )
  }

  return { scanned: rows.length, republished: republishedIds.length, jobIds: republishedIds }
}
