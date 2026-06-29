---
name: adpa-doc-gen-queue-health
description: Detection and recovery for the "document generation jobs stuck at pending" failure — verify a live RabbitMQ consumer is attached to the ai-processing queue, surface it in startup health, and reconcile pending generation jobs. Use when generation jobs never leave 'pending', when editing the RabbitMQ/Workers startup dependencies, RabbitQueueAdapter consumer wiring, or queue health checks.
---

# ADPA Document Generation — Queue Consumer Health

## Purpose

Document generation enqueues a `jobs` row (`status='pending'`) and publishes to the
RabbitMQ `ai-processing` queue. If **no consumer is attached** to that queue, jobs sit
at `pending` forever and no document is produced. Because `amqp-connection-manager`
buffers publishes while disconnected, `addJob` still returns `202`, so the failure is
silent. This feature makes the missing-consumer condition **observable** (real health
checks) and **self-healing** (deterministic registration + pending reconciliation).

## Invariants

- **Must always** report RabbitMQ `unhealthy` when configured but not connected (REQ-001).
- **Must always** report Workers `unhealthy` for roles `worker`/`all` when RabbitMQ is
  down or no consumer is attached to `ai-processing` (REQ-002).
- **Must always** treat `role=api` as healthy without a consumer — workers run in a
  separate process (REQ-002, api/worker split invariant).
- **Must always** ensure worker registration deterministically when `shouldRunWorkers()`
  is true, and registration must be idempotent (REQ-003).
- **Must only** reconcile `pending` generation jobs that are old enough and have no live
  worker — **never** `processing` jobs (those belong to orphan recovery; re-publishing a
  `processing` job risks a duplicate document) (REQ-004).

## Diagnose "stuck at pending" in ~30 seconds

1. Backend logs should show `✅ [RABBIT] Connected to RabbitMQ` **and**
   `[QUEUE] Registered ai-generate processor`. Missing either ⇒ confirmed.
2. `rabbitmqctl list_consumers | grep ai-processing` → `0` consumers ⇒ confirmed.
3. `SELECT status, count(*) FROM jobs WHERE queue_name='ai-processing' GROUP BY 1;`
   → a pile of `pending` ⇒ confirmed.
4. `GET /api/health` → `RabbitMQ` / `Workers` should now be `unhealthy` when broken.

## Interaction Rules

- Depends on: `adpa-doc-gen-queue` (enqueue path / queue mapping — unchanged here),
  `adpa-api-worker-split` (role gating — `api` must not attach consumers),
  `adpa-document-generation-resiliency` (orphan recovery owns `processing` jobs; this
  feature owns `pending` jobs — disjoint states).
- Must not break: the `ai-generate → ai-processing` mapping or the never-auto-requeue
  policy for stuck `processing` generation jobs in `StuckJobMonitor`.

## Key Files

| File | Role |
|------|------|
| `server/src/services/queue/queueHealth.ts` | Pure health/selection logic (Contract Guards target this) |
| `server/src/services/queue/queueReconciler.ts` | Re-publishes stalled `pending` generation jobs |
| `server/src/services/jobs/queue/RabbitQueueAdapter.ts` | `isConsumerAttached()` accessor |
| `server/src/startup/dependencies/rabbitmq.ts` | Real connection-backed health check |
| `server/src/startup/dependencies/workers.ts` | Ensures registration + verifies consumer + kicks off reconcile |
| `server/src/__tests__/modules/doc-gen-queue-health/queueHealth.test.ts` | Contract Guards |

## Commands

```powershell
cd server
npm run test:features -- doc-gen-queue-health   # this packet only
npm run test:features                           # all governed packets (CI)
npm run verify:governed-features
```

## Related Skills

- `adpa-doc-gen-queue`
- `adpa-document-generation-resiliency`
- `adpa-api-worker-split`
- `adpa-governed-feature-loop`
