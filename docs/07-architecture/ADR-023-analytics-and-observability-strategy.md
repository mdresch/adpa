# ADR 023: Analytics & Observability Strategy

## 1. Status
**Proposed (2026-07-23)** — the analytics and observability infrastructure described here is implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA has real-time analytics, AI generation tracking, performance insights, and monitoring dashboards, but no ADR documents the observability stack, what is measured, where logs go, or the alerting philosophy. Verified against running code:

- **Langfuse**: the primary observability backend for AI generation traces. Traces are created per generation with session IDs bound to `projectId` / `documentId`. Langfuse records prompt, completion, latency, token usage, and cost.
- **OpenTelemetry**: spans are attached to every queue event (`active`, `completed`, `failed`) in the queue layer. Distributed tracing is propagated via `correlation_id` stored on projects.
- **Job tracking**: the `jobs` table records job status, progress, errors, provider, model, input/output tokens, and cost. This is the system of record for the UI's generation history.
- **Server logs**: structured logs (`logger.info`, `logger.error`) throughout `server/src/`. Drift resolution logs timing metrics (`dataFetchMs`, `aiGenerationMs`, `totalDurationMs`).
- **Queue metrics**: Redis queue depth and job counts are queryable via `queue.getJobCounts()` and via the database `jobs` table.

## 3. Decision

We adopt a **three-tier observability stack**: application logs for operational debugging, OpenTelemetry for distributed tracing, and Langfuse for AI-specific telemetry. The `jobs` table is the canonical source of truth for generation history and cost accounting. Alerts are defined at the application level, not in an external monitoring system.

### 3.1 Application Logs

All server-side code uses structured log calls (`logger.info`, `logger.error`, `logger.warn`) with contextual fields (`jobId`, `documentId`, `provider`, `model`, `durationMs`). Log level is `info` by default; `debug` is available via env var. Logs are written to stdout and captured by the process manager (PM2, Docker, systemd).

### 3.2 Distributed Tracing

OpenTelemetry spans are created at queue boundaries and at the AI service entry point. A generation request produces a trace with the following span tree:

```
[generation trace]
  ├── queue:process-flow (active → completed)
  ├── stage:context-bundle
  ├── stage:template-render
  ├── stage:ai-generate (contains Langfuse trace)
  └── stage:quality-validation
```

`correlation_id` is stored on the `projects` table and propagated through the context object so child spans can be correlated back to the originating project.

### 3.3 AI Observability (Langfuse)

Langfuse is the sole AI telemetry backend. Every `generateWithFallback` call creates a Langfuse trace with:

- Prompt template name and rendered prompt.
- Completion text (truncated to avoid PII in logs).
- Latency, input tokens, output tokens, and cost (calculated from rate cards).
- Provider, model, and fallback chain attempt history.

Langfuse traces are bound to `projectId` and `documentId` so the UI can surface per-project AI cost and quality trends.

### 3.4 Job History and Cost Accounting

The `jobs` table is the system of record. Every generation, extraction, sync, and regeneration job writes a row with:

- `id` (job UUID), `type`, `status`, `data` (JSONB).
- `project_id`, `document_id`, `created_by`, `started_at`, `completed_at`.
- `progress` (0–100).
- `error_message` (on failure).
- AI generation jobs additionally write `provider`, `model`, `input_tokens`, `output_tokens`, `cost`, `duration_ms` to `ai_generation_jobs`.

This table is what the UI's job dashboard queries. It is not a log — it is data.

### 3.5 Alerting Philosophy

Alerts are defined in application code, not in an external monitoring system. The drift resolution service, for example, logs a `performanceTarget: 'MET'` / `'MISSED'` flag on every resolution so ops can set log-based alerts. Queue health is exposed via `GET /health/queues` (to be added as a follow-up).

There is no current external monitoring system (Datadog, New Relic, etc.). Adding one is a deployment decision, not an architecture decision.

## 4. Options Considered

### Option A: Single logging solution (logs only, no tracing)
| Dimension | Assessment |
|---|---|
| Debugging | Adequate for single-service debugging |
| Distributed tracing | Impossible — no span correlation across queue → stage → AI |

Rejected: the generation pipeline spans queue, worker, stage, and external AI provider. Without spans, debugging a slow generation means reconstructing the path from log timestamps, which is slow and error-prone.

### Option B (Recommended): Logs + OpenTelemetry + Langfuse
| Dimension | Assessment |
|---|---|
| Debugging | Full — logs for what, traces for when and where |
| AI-specific insight | Langfuse provides prompt/completion/latency/cost correlation |
| Complexity | Medium — three tools to run, but each has a clear boundary |

The current implementation. It provides the needed observability without adding an external APM dependency.

### Option C: Commercial APM (Datadog / New Relic)
| Dimension | Assessment |
|---|---|
| Debugging | Excellent |
| Cost | High — vendor pricing scales with trace volume |
| AI insight | Requires custom Langfuse integration anyway |

Not chosen now. Langfuse is already serving the AI-specific telemetry need. Adding a commercial APM does not replace Langfuse; it would overlap with OpenTelemetry for infrastructure spans. The team can revisit if log volume or trace cardinality makes a centralized SaaS attractive.

## 5. Consequences

### Positive
- **AI cost visibility**: Langfuse traces bound to `projectId` make per-project AI spend queryable without parsing raw logs.
- **Trace-driven debugging**: OpenTelemetry shows exactly which stage of a generation was slow, down to the AI provider round-trip.
- **Job history in the DB**: the `jobs` table provides a durable, queryable history of every generation, extraction, and sync — not ephemeral log lines.

### Negative
- **Three tools to operate**: Langfuse, OpenTelemetry collector, and log aggregation each need deployment, configuration, and retention policies. There is no unified "observability checklist" for new developers.
- **Langfuse data volume**: every generation produces a trace. At 70 documents × 10 parallel workers, that is 700 traces per batch. Retaining traces long-term may become expensive.

### Risks
- **PII in prompts**: Langfuse records rendered prompts, which may contain project-specific confidential data. The current truncation settings should be audited to ensure no PII is stored in Langfuse for longer than the investigation window.
- **Trace cardinality explosion**: if `correlation_id` is used as a span attribute without sampling, trace volume grows linearly with project count. Mitigated by adding a sampling config (e.g., 10% of traces in production, 100% in dev).

## 6. Action Items

1. Define a log retention policy (30 days for logs, 90 days for traces, 1 year for job history) and implement cleanup jobs for Langfuse and the `jobs` table.
2. Add the `GET /health/queues` endpoint (see [ADR-017](ADR-017-queue-and-background-processing-architecture.md) §6) so queue metrics are queryable without Redis CLI access.
3. Audit Langfuse prompt truncation for PII leakage.
4. Add trace sampling config (env-var controlled) to the OpenTelemetry initialization.

## 7. References

- `server/src/services/aiService.ts` — `generateWithFallback`, Langfuse trace creation
- `server/src/services/queue/queueClient.ts` — OpenTelemetry span attachment per queue event
- `server/migrations/000_baseline.sql` — `jobs`, `ai_generation_jobs` tables
- `server/src/services/driftResolutionService.ts` — performance logging pattern
- [ADR-016: Multi-Provider AI Strategy and Failover Architecture](ADR-016-multi-provider-ai-strategy-and-failover-architecture.md) — cost accounting and fallback tracking in Langfuse
- [ADR-017: Queue & Background Processing Architecture](ADR-017-queue-and-background-processing-architecture.md) — queue observability
