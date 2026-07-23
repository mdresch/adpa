# ADR 017: Queue & Background Processing Architecture

## 1. Status
**Proposed (2026-07-23)** — the queue topology, worker registration, and job lifecycle described here are fully implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA's background processing is built on **14 named RabbitMQ queues** managed through a unified `RabbitQueueAdapter`. Workers are registered in-process when the Express server starts with the correct process role, and jobs implement orphan-recovery, per-queue prefetch overrides, and dead-letter queue support. OpenTelemetry spans and Langfuse traces are attached to every queue event. Despite this, no ADR documents the queue topology, why each queue exists, or the parallelism and retry policy.

Verified against running code:

- **14 queues** defined in `server/src/services/queue/queueClient.ts`: `ai-processing`, `document-processing`, `document-upload`, `pipeline-processing`, `baseline-processing`, `process-flow-processing`, `document-regeneration`, `quality-audit`, `project-data-extraction`, `confluence-publishing`, `digital-twin-events`, `digital-twin-triggers`, `gkg-sync`, `semantic-processing`, `department-claims-sync`.
- **Worker registration** in `registerWorkers.ts` — ~25+ job processors, registered only when `shouldRunWorkers()` is true (process role check).
- **Orphan-recovery**: every processor checks the DB `jobs.status` before doing work and skips if the job is already `cancelled`/`failed`/`completed`.
- **Per-queue prefetch**: controlled by env vars (`AI_PROCESSING_PREFETCH`, `DOCUMENT_PROCESSING_PREFETCH`, etc.). Heavy queues default to 1–2 to limit in-flight memory pressure.
- **Dead-letter queue**: max length configurable for the extraction queue via `QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH`.
- **Observability**: OpenTelemetry spans on `active`/`completed`/`failed`; Langfuse traces on AI generation jobs.

## 3. Decision

We adopt an **Adaptive Queue Architecture** where each domain (AI generation, document ops, extraction, sync, etc.) owns its own named queue, a shared priority policy, and Redis-backed job storage. Workers are in-process by default and can be split to a separate process in production.

### 3.1 Queue Ownership Table

| Queue | Owner Domain | Job Types | Default Prefetch | Timeout |
|---|---|---|---|---|
| `ai-processing` | AI generation | `ai-generate`, `save-inline-entities` | 2 | 10 min |
| `document-processing` | Document ops | `document-convert` | 1 | 5 min |
| `document-upload` | File ingest | `file-process` | 4 | — |
| `pipeline-processing` | Generation pipeline | (stage orchestration) | 4 | 10 min |
| `baseline-processing` | Baseline snapshots | `baseline-extract` | 2 | 5 min |
| `process-flow-processing` | Orchestrator entry | `process-flow` | 2 | 30 min |
| `document-regeneration` | Regeneration | `document-regeneration` | 2 | 10 min |
| `quality-audit` | QA | `quality-audit` | 2 | 5 min |
| `project-data-extraction` | Entity extraction | `extract-project-data` + 50+ child jobs | 2 | 10 min |
| `confluence-publishing` | Integration | `publish-to-confluence` | 4 | — |
| `digital-twin-events` | Digital Twin | `process-event` | 2 | — |
| `digital-twin-triggers` | Digital Twin | `process-trigger` | 2 | — |
| `gkg-sync` | Knowledge Graph | `gkg-bootstrap`, `gkg-sync-*`, `gkg-reconcile` | 4 | — |
| `semantic-processing` | Semantic search | `semantic-process-document`, `semantic-process-batch` | 4 | — |
| `department-claims-sync` | Departments | `department-claims-sync` | 2 | — |

### 3.2 Parallelism and Concurrency

Prefetch is the primary parallelism control. Concurrency inside a processor is typically 1 (one document per worker at a time), with parallelism achieved by running multiple workers across multiple queues simultaneously. The exception is `process-flow`, where a single job orchestrates the synchronous generation pipeline.

### 3.3 Job Lifecycle and State Machine

A job moves through these states, persisted to the `jobs` table:

```
pending → active → completed
              → failed (after max attempts)
              → stalled → failed (after stall detection)
              → cancelled (user-initiated)
```

**Orphan-recovery**: before processing, every worker queries the `jobs` table for the job's current status. If the status is `cancelled`/`failed`/`completed`, the worker skips the job and marks it dead in the queue. This prevents a restarted worker from reprocessing a job that was already handled by another worker or cancelled by the user.

### 3.4 Dead-Letter Queue (DLQ)

Each queue has an implicit dead-letter behavior: jobs that exceed `maxStalledCount` or exhaust retries are moved to the failed set. For `project-data-extraction`, the DLQ max length is configurable (`QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH`) so production operators can tune backpressure without redeploying.

### 3.5 Observability

Every queue event emits an OpenTelemetry span. AI generation jobs additionally emit Langfuse traces with session IDs bound to `projectId` / `documentId`. The `jobs` table is the system of record for job status in the UI; Redis is the execution engine only.

## 4. Options Considered

### Option A: Single Bull queue for everything
| Dimension | Assessment |
|---|---|
| Isolation | None — a stalled `ai-generate` job blocks `document-convert` on the same queue |
| Backpressure | Hard to tune per domain |
| Dead-letter | One DLQ, no per-queue policy |

Rejected: the current implementation already has 15 queues, and the per-domain isolation it provides is load-tested in production.

### Option B (Recommended): Named queues per domain, in-process workers, DB-backed job status
| Dimension | Assessment |
|---|---|
| Isolation | Full — each domain has its own queue, prefetch, and DLQ policy |
| Backpressure | Tunable per domain via env vars |
| Observability | Per-queue traces, per-job DB rows |

The current implementation. Retained because it is already operating correctly and provides the isolation the team needs.

### Option C: External worker processes, multiple nodes
| Dimension | Assessment |
|---|---|
| Scale | Highest — workers can run on separate machines |
| Complexity | High — requires distributed locking, shared nothing workers, cross-node visibility |

Not chosen now. The current in-process worker registration (`shouldRunWorkers()`) is sufficient for single-node deployments and matches the existing server architecture. The queue layer is already backed by RabbitMQ, so splitting to external workers would be a configuration change, not an architecture rewrite — tracked as a future option, not a current need.

## 5. Consequences

### Positive
- **Domain isolation**: a stalled extraction job cannot back up AI generation jobs.
- **Operational tunability**: per-queue prefetch and DLQ tuning is a config change, not a code deploy.
- **Resilience**: orphan-recovery means a worker restart does not reprocess already-cancelled jobs.

### Negative
- **Worker startup cost**: registering 25+ processors on server startup adds to boot time. The startup dependency graph keeps this bounded, but it is not free.
- **Config spread**: prefetch and timeout settings live in env vars, not a single config table. An operator changing defaults must touch multiple `server/.env` keys.

### Risks
- **Stuck-job detection lag**: the `StuckJobMonitor` runs on a polling interval. If the interval is longer than the stall detection window, a crashed worker can leave a job in `active` state for hours before it is detected and requeued. Mitigated by tuning the interval per queue based on expected job duration.
- **Memory pressure**: the `document-upload` queue has prefetch 4, which can cause in-flight PDF processing to spike memory on ingest-heavy days. The current default is conservative, but monitoring Redis queue depth is required when traffic patterns change.

## 6. Action Items

1. Move per-queue prefetch and timeout configuration from env vars into a `queue_policies` DB table so ops can tune without redeploying.
2. Add a queue health dashboard endpoint (`GET /health/queues`) that returns per-queue job counts in batches of 10, summarizing the last 5 minutes of activity.
3. Document the orphan-recovery contract in the queue module's README so future worker authors do not re-implement it.
4. Register Queue Architecture as a governed feature packet in `server/governed-features.manifest.json`.

## 7. References

- `server/src/services/queue/queueClient.ts` — 14 named queues, `RabbitQueueAdapter`
- `server/src/services/queue/registerWorkers.ts` — ~25+ job processors
- `server/src/services/queueService.ts` — thin entry point, conditional worker registration
- `server/src/services/stuckJobMonitor.ts` — stall detection and requeue
- `server/src/migrations/000_baseline.sql` — `jobs` table schema
- [ADR-013: Document Generation Pipeline Architecture](ADR-013-document-generation-pipeline-architecture.md) — the generation stage that enqueues side-effect jobs
- [ADR-016: Multi-Provider AI Strategy and Failover Architecture](ADR-016-multi-provider-ai-strategy-and-failover-architecture.md) — AI generation jobs that run on these queues
