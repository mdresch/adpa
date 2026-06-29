/**
 * Queue consumer health & pending-job reconciliation — pure logic.
 *
 * Governed by:
 *   docs/superpowers/specs/2026-06-29-doc-gen-queue-consumer-health-design.md
 *   .agents/skills/adpa-doc-gen-queue-health/SKILL.md
 *
 * This module is intentionally dependency-free (no DB, no RabbitMQ imports) so the
 * Contract Guards can exercise the decision logic as fast, deterministic unit tests.
 * Side-effecting orchestration lives in queueReconciler.ts and the startup deps.
 */

export type HealthVerdict = {
  ok: boolean
  status: "healthy" | "unhealthy"
  reason: string
}

/**
 * Queues that carry long-running, resource-intensive generation jobs. A `pending`
 * (never-started) job on one of these may be safely re-published; a `processing`
 * job must NOT (orphan recovery owns those — see adpa-document-generation-resiliency).
 */
export const PROTECTED_GENERATION_QUEUES = new Set<string>([
  "ai-processing",
  "document-processing",
  "document-regeneration",
])

/**
 * Grace window before a `pending` generation job is considered stalled and re-published.
 * Long enough to ignore jobs that were just enqueued and are about to be consumed.
 */
export const MIN_PENDING_REQUEUE_AGE_MS = 30_000

/** Placeholder worker id written by QueueService.addJob before a real worker claims the job. */
const PLACEHOLDER_WORKER_PREFIX = "worker-pending-"

/**
 * REQ-001 — RabbitMQ health reflects the real connection.
 *
 * When configured but not connected this is the exact silent-failure state where
 * generation jobs are published into a void and stay at `pending` forever.
 */
export function evaluateRabbitHealth(input: {
  configured: boolean
  connected: boolean
}): HealthVerdict {
  if (!input.configured) {
    return { ok: true, status: "healthy", reason: "RabbitMQ not configured (skipped)" }
  }
  if (input.connected) {
    return { ok: true, status: "healthy", reason: "RabbitMQ connection active" }
  }
  return {
    ok: false,
    status: "unhealthy",
    reason:
      "RabbitMQ is configured but not connected — generation jobs will queue at 'pending' and never be consumed.",
  }
}

/**
 * REQ-002 — Worker health requires a live ai-processing consumer.
 *
 * - role=api: healthy without a consumer (workers run in a separate process).
 * - role=worker/all: requires RabbitMQ connected AND a consumer attached to ai-processing.
 */
export function evaluateWorkerHealth(input: {
  role: string
  rabbitConnected: boolean
  aiConsumerAttached: boolean
}): HealthVerdict {
  const role = (input.role || "all").toLowerCase().trim()

  if (role === "api") {
    return {
      ok: true,
      status: "healthy",
      reason: "api role: queue consumers run in a separate worker process",
    }
  }

  // role === "worker" || role === "all"
  if (!input.rabbitConnected) {
    return {
      ok: false,
      status: "unhealthy",
      reason: "Worker role is active but RabbitMQ is not connected — no consumer can attach.",
    }
  }
  if (!input.aiConsumerAttached) {
    return {
      ok: false,
      status: "unhealthy",
      reason:
        "Worker role is active but no consumer is attached to the ai-processing queue — generation jobs will stay 'pending'.",
    }
  }
  return { ok: true, status: "healthy", reason: "ai-processing consumer attached" }
}

// REQ-003 — deterministic, idempotent worker registration ------------------------------

let _workersEnsured = false

/** Test-only reset of the idempotency latch. */
export function __resetEnsureWorkersForTests(): void {
  _workersEnsured = false
}

function roleAllowsWorkers(role: string): boolean {
  const normalized = (role || "all").toLowerCase().trim()
  return normalized === "worker" || normalized === "all"
}

/**
 * REQ-003 — Ensure worker processors are registered exactly once when the process role
 * allows workers. `register` should be the (idempotent) registerWorkers() function.
 */
export async function ensureWorkersRegistered(opts: {
  role: string
  register: () => void | Promise<void>
}): Promise<{ invoked: boolean; reason: string }> {
  if (!roleAllowsWorkers(opts.role)) {
    return { invoked: false, reason: "role does not run workers" }
  }
  if (_workersEnsured) {
    return { invoked: false, reason: "workers already ensured" }
  }
  _workersEnsured = true
  await opts.register()
  return { invoked: true, reason: "workers registered" }
}

// REQ-004 — pending reconciliation selection ------------------------------------------

export interface PendingJobRow {
  id: string
  status: string
  queue_name: string
  worker_id: string | null
  queued_at: string | Date
}

function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}

function hasNoLiveWorker(workerId: string | null): boolean {
  // A null worker_id, or the placeholder written at enqueue time, means no worker has
  // actually claimed the job. A real worker id implies a worker may be active — leave it.
  return !workerId || workerId.startsWith(PLACEHOLDER_WORKER_PREFIX)
}

/**
 * REQ-004 — Select `pending` generation jobs that are stalled (old enough, no live worker)
 * and therefore safe to re-publish so the backlog drains once a consumer is live.
 */
export function selectStalledPendingJobs(
  rows: PendingJobRow[],
  opts: { nowMs: number; minAgeMs?: number },
): PendingJobRow[] {
  const minAgeMs = opts.minAgeMs ?? MIN_PENDING_REQUEUE_AGE_MS
  return rows.filter((row) => {
    if (row.status !== "pending") return false
    if (!PROTECTED_GENERATION_QUEUES.has(row.queue_name)) return false
    if (!hasNoLiveWorker(row.worker_id)) return false
    const ageMs = opts.nowMs - toMs(row.queued_at)
    return ageMs >= minAgeMs
  })
}
