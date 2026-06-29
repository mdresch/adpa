# Document Generation Queue — Consumer Health & Pending Reconciliation

Date: 2026-06-29
Status: Draft

## Problem

Document generation jobs are inserted into the `jobs` table with `status='pending'`
and published to the RabbitMQ `ai-processing` queue, but they are never picked up —
they stay at `pending` forever. The user sees "queued" forever and no document is produced.

Root cause is **silent absence of a live queue consumer**. Nothing in the startup
path verifies that a consumer is actually attached to the `ai-processing` queue:

- `server/src/startup/dependencies/rabbitmq.ts` is a placeholder that always reports
  `healthy` without ever opening a connection — even though the entire job queue now
  runs on `RabbitQueueAdapter`.
- `server/src/startup/dependencies/workers.ts` only checks `typeof addJob === 'function'`.
  It never confirms `registerWorkers()` attached a consumer.

Because `amqp-connection-manager` buffers publishes while disconnected, `addJob`
succeeds and returns `202` even when RabbitMQ is down or no consumer exists. The
backend boots "all green" with zero consumers on `ai-processing`. Whether the trigger
is RabbitMQ not connected or `registerWorkers()` failing, the system gives no signal
and no recovery, and the existing backlog of `pending` jobs is never drained.

## Success Criteria

- [ ] Backend health reports `unhealthy` for RabbitMQ when the broker is not connected.
- [ ] Backend health reports `unhealthy` for Workers when the worker role is active but
      no consumer is attached to the `ai-processing` queue.
- [ ] In `role=all` and `role=worker`, worker registration is invoked deterministically
      at startup (not only as a lazy import side-effect).
- [ ] After a consumer attaches, stalled `pending` generation jobs are re-published so
      the backlog drains automatically.
- [ ] `role=api` continues to report healthy without attaching consumers (split invariant).

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | RabbitMQ health evaluation MUST report `unhealthy` when configured but not connected, and `healthy` only when an active connection exists. When unconfigured it is reported `healthy` (skipped). | P0 |
| REQ-002 | Worker health evaluation MUST require, for roles `worker`/`all`, that RabbitMQ is connected AND a consumer is attached to the `ai-processing` queue; otherwise `unhealthy`. For role `api` it MUST be `healthy` without any consumer (workers run elsewhere). | P0 |
| REQ-003 | Worker registration MUST be deterministically ensured at startup when `shouldRunWorkers()` is true, and MUST be idempotent (calling twice attaches consumers once). | P0 |
| REQ-004 | Pending-job reconciliation MUST select only `pending` jobs on protected generation queues that are older than a minimum age and have no live worker, and re-publish them so they drain once a consumer is live. | P1 |
| REQ-005 | `RabbitQueueAdapter` MUST expose whether a consumer is currently attached. | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `adpa-doc-gen-queue` — the enqueue path and `ai-generate → ai-processing` mapping stay unchanged; we only add detection + recovery around it.
- `adpa-document-generation-resiliency` — orphan recovery (`initializeQueues`) handles `processing` jobs; this feature handles `pending` jobs. The never-auto-requeue policy for generation jobs in `StuckJobMonitor` applies to **stuck `processing`** jobs; reconciliation here targets **`pending`** jobs that were never consumed, which is a distinct, safe state (no work was done, so re-publishing cannot duplicate side effects).
- `adpa-api-worker-split` — `role=api` MUST NOT attach consumers; worker-health policy must treat `api` as healthy-without-consumer.

New interaction tests required when: the queue-name → handler mapping changes, or the
never-requeue policy is extended to `pending` jobs.

## Risks

| Risk | Mitigation |
|------|------------|
| Reconciler re-publishes a job already being processed → duplicate document | Only select `status='pending'` (never `processing`); require min age and no live `worker_id`; re-publish via existing `addJob` which is keyed on the same `jobId`. |
| Worker-health check flaps during the connect window | Health policy is evaluated from explicit inputs; the live check tolerates the async connect window (re-evaluated, not one-shot at t=0). |
| Breaking the api/worker split invariant | `evaluateWorkerHealth` returns healthy for `role=api` without requiring a consumer; covered by a Contract Guard. |

## Test Plan

| REQ | Test (describe → it) |
|-----|----------------------|
| REQ-001 | `evaluateRabbitHealth` → unhealthy when configured+disconnected; healthy when connected; healthy(skipped) when unconfigured |
| REQ-002 | `evaluateWorkerHealth` → unhealthy for worker/all when no consumer or rabbit down; healthy for api without consumer; healthy for all when connected+attached |
| REQ-003 | `ensureWorkersRegistered` idempotency contract via injected register fn (called once, gated by role) |
| REQ-004 | `selectStalledPendingJobs` → selects only pending + old enough + no worker; excludes processing/recent/assigned |
| REQ-005 | `RabbitQueueAdapter.isConsumerAttached()` reflects consumer state (lightweight) |

Packet id: `doc-gen-queue-health` (module layout, `testModuleDir = doc-gen-queue-health`).
