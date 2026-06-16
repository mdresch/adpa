import type { Pool } from 'pg'
import { logger } from '../utils/logger'
import { safeQuery, safeUpdate } from './jobs/dbGuards'
const REQUEUE_ENABLED = (process.env.STUCK_JOB_REQUEUE || 'false').toLowerCase() === 'true'
const MAX_REQUEUE = Number(process.env.STUCK_JOB_MAX_REQUEUE || 3)
const ALERT_WEBHOOK = process.env.STUCK_JOB_ALERT_WEBHOOK || ''
import type { Server as SocketIOServer } from 'socket.io'

export class StuckJobMonitor {
  private pool: Pool | null
  private io: SocketIOServer
  private intervalMs: number
  private thresholdMinutes: number
  private timer: NodeJS.Timeout | null = null

  constructor(pool: Pool | null, io: SocketIOServer, options?: { intervalMs?: number; thresholdMinutes?: number }) {
    this.pool = pool
    this.io = io
    this.intervalMs = options?.intervalMs ?? 1000 * 60 * 5 // default 5 minutes
    this.thresholdMinutes = options?.thresholdMinutes ?? 30 // default 30 minutes
  }

  public start() {
    if (this.timer) return
    logger.info(`[STUCK-JOB-MONITOR] Starting (threshold=${this.thresholdMinutes}m, interval=${this.intervalMs}ms)`)
    this.timer = setInterval(() => this.checkForStuckJobs().catch(err => logger.error('[STUCK-JOB-MONITOR] Check failed', err)), this.intervalMs)
    // run once immediately
    void this.checkForStuckJobs().catch(err => logger.error('[STUCK-JOB-MONITOR] Initial check failed', err))
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      logger.info('[STUCK-JOB-MONITOR] Stopped')
    }
  }

  private async checkForStuckJobs() {
    if (!this.pool) {
      logger.warn('[STUCK-JOB-MONITOR] Database pool not available; skipping check')
      return
    }

    const sql = `SELECT id, status, processing_started_at, started_at, worker_id, queue_name, data
                 FROM jobs
                 WHERE status = 'processing'
                   AND processing_started_at IS NOT NULL
                   AND processing_started_at < NOW() - ($1 * INTERVAL '1 minute')
                 LIMIT 200`

    // safeQuery expects pool, sql, params
    const res = await safeQuery(this.pool, sql, [this.thresholdMinutes])
    if (!res || !res.rows || res.rows.length === 0) return

    for (const row of res.rows) {
      try {
        const jobId = row.id
        logger.warn('[STUCK-JOB-MONITOR] Found stuck job', { jobId, status: row.status, worker: row.worker_id, processing_started_at: row.processing_started_at })

        // Increment stuck count and mark job as 'stuck'
        const note = `Marked stuck by monitor after ${this.thresholdMinutes} minutes`
        const updateSql = `
          UPDATE jobs
          SET data = jsonb_set(
            jsonb_set(COALESCE(data,'{}'::jsonb), '{monitor,stuckCount}', to_jsonb(COALESCE((COALESCE(data->'monitor'->>'stuckCount','0'))::int,0) + 1)),
            '{monitor,lastStuckMarkedAt}', to_jsonb(NOW()::text)
          ),
          error_message = COALESCE(error_message, $1),
          status = 'stuck',
          completed_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING data
        `

        const upd = await safeQuery(this.pool, updateSql, [note, jobId])
        let stuckCount = 1
        try {
          if (upd && upd.rows && upd.rows[0] && upd.rows[0].data) {
            const dataObj = upd.rows[0].data
            const monitor = dataObj?.monitor || dataObj?.monitor === 0 ? dataObj.monitor : (dataObj['monitor'] || null)
            // Read stuckCount safely
            if (monitor && monitor.stuckCount !== undefined) {
              stuckCount = Number(monitor.stuckCount) || 1
            }
          }
        } catch (e) {
          // ignore parse errors
        }

        // Emit websocket event for monitoring dashboards
        try {
          this.io.emit('job:stuck', { jobId, note, queue: row.queue_name, stuckCount })
        } catch (emitErr) {
          logger.debug('[STUCK-JOB-MONITOR] Could not emit job:stuck', emitErr)
        }

        // Send alert webhook if configured
        if (ALERT_WEBHOOK) {
          try {
            const payload = {
              event: 'job_stuck',
              jobId,
              queue: row.queue_name,
              worker: row.worker_id,
              processing_started_at: row.processing_started_at,
              stuckCount,
            }
            const fetchFn = (globalThis as any).fetch
            if (typeof fetchFn === 'function') {
              void fetchFn(ALERT_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                timeout: 5000,
              }).catch((err: any) => logger.warn('[STUCK-JOB-MONITOR] Alert webhook failed', err))
            } else {
              logger.debug('[STUCK-JOB-MONITOR] No global fetch available for alert webhook')
            }
          } catch (err) {
            logger.warn('[STUCK-JOB-MONITOR] Failed to send alert webhook', err)
          }
        }

        // ─── REQUEUE POLICY ──────────────────────────────────────────────────
        // Generation jobs (ai-processing, document-processing, document-regeneration)
        // and GKG sync jobs (gkg-sync) must NEVER be auto-requeued.
        //
        // WHY: These are long-running, resource-intensive jobs. If they fail or
        // time out, auto-requeue causes a runaway loop that consumes the backend
        // (as seen with 118 stuck jobs dating back to January 2026).
        // Users must manually retry from the Job Monitor UI.
        //
        // Only short, idempotent jobs on non-generation queues may auto-requeue,
        // and only when STUCK_JOB_REQUEUE=true is explicitly set in .env.
        const NEVER_REQUEUE_QUEUES = new Set([
          'ai-processing',
          'document-processing',
          'document-regeneration',
          'gkg-sync',
          'project-data-extraction',
        ])
        const isNeverRequeueJob = NEVER_REQUEUE_QUEUES.has(row.queue_name) || 
                                (typeof row.type === 'string' && row.type.startsWith('extract-entity-'))
        const shouldRequeue = REQUEUE_ENABLED && !isNeverRequeueJob && stuckCount <= MAX_REQUEUE

        if (isNeverRequeueJob) {
          logger.warn('[STUCK-JOB-MONITOR] Job on protected queue — will NOT auto-requeue. User must retry manually.', {
            jobId,
            queue: row.queue_name,
            stuckCount,
          })
        }

        if (shouldRequeue) {
          try {
            // Obtain job type and data from jobs table if not present
            const jobDetailSql = `SELECT type, data FROM jobs WHERE id = $1`;
            const detailRes = await safeQuery(this.pool, jobDetailSql, [jobId])
            if (detailRes && detailRes.rows && detailRes.rows[0]) {
              const jobType = detailRes.rows[0].type
              const jobData = detailRes.rows[0].data
              // Dynamically require addJob to avoid circular imports at module load
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { addJob } = require('./jobs/queue/QueueService') as any
                // If not exported, fallback to top-level service
                let addFn = addJob
                if (typeof addFn !== 'function') {
                  try {
                    // Try service entrypoint
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    addFn = require('./queueService').addJob
                  } catch (e) {
                    addFn = null
                  }
                }

                if (typeof addFn === 'function') {
                  // Re-add job with same type and data
                  await addFn(jobType, jobData, { jobId })
                  logger.info('[STUCK-JOB-MONITOR] Requeued job', { jobId, jobType })

                  // Reset status to pending so it gets picked up immediately
                  await safeQuery(this.pool, `UPDATE jobs SET status = 'pending', worker_id = NULL WHERE id = $1`, [jobId])
                } else {
                  logger.warn('[STUCK-JOB-MONITOR] addJob function not available; skipping requeue')
                }
              } catch (requireErr) {
                logger.warn('[STUCK-JOB-MONITOR] Failed to require addJob for requeue', requireErr)
              }
            }
          } catch (rqErr) {
            logger.error('[STUCK-JOB-MONITOR] Failed to requeue job', rqErr)
          }
        } else if (REQUEUE_ENABLED && !isNeverRequeueJob) {
          logger.info('[STUCK-JOB-MONITOR] Requeue skipped because stuckCount exceeds MAX_REQUEUE', { jobId, stuckCount, max: MAX_REQUEUE })
        }
      } catch (err) {
        logger.error('[STUCK-JOB-MONITOR] Error handling stuck job', err)
      }
    }
  }
}

export default StuckJobMonitor
