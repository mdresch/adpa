# API / Worker Process Split, Lazy Puppeteer, and Observability Scoping

Date: 2026-06-15
Status: Approved

## Problem
Currently, a single Node process inside the ADPA backend handles all incoming HTTP API requests, registers 14 background queue consumers, manages long-running LLM drafting jobs, and dynamically initializes the Puppeteer PDF export browser. Running all these memory-intensive layers concurrently within a single process frequently triggers Out-of-Memory (OOM) crashes on resource-constrained hosting instances (e.g., 512MB memory allocations).

## Success Criteria
- [ ] Backend API instances run without spawning RabbitMQ job queue consumer loops.
- [ ] A dedicated Worker instance spawns, connects to infrastructure dependencies (Postgres, Redis, RabbitMQ), and processes enqueued jobs.
- [ ] Puppeteer/Chromium is loaded dynamically and only during explicit PDF export requests, closing and cleaning up resources immediately after use.
- [ ] Langfuse telemetry ingestion is restricted exclusively to AI provider calls, completely bypassing HTTP routes, health checks, and non-AI database activities.

## Requirements

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| **REQ-001** | Support `ADPA_PROCESS_ROLE` environment variable with values `api`, `worker`, or `all` (default: `all`). | P0 |
| **REQ-002** | Prevent queue processor registrations (`.process()`) on `api` process roles. | P0 |
| **REQ-003** | Ensure HTTP API server and routing initialization is skipped on `worker` process roles. | P0 |
| **REQ-004** | Lazily import and load Puppeteer only when a PDF generation method is invoked. | P1 |
| **REQ-005** | Restructure Langfuse telemetry to only write AI provider spans, omitting Express HTTP and non-AI job tracking. | P1 |
| **REQ-006** | Gate Postgres blob recording of AI requests/responses with `LLM_INSIGHTS_STORE_BLOBS` environment variable. | P2 |

## Interaction Rules (Overlap)
This feature MUST NOT break:
- **`doc-gen` (Document Generation)**: Enqueuing document generation tasks from the API and receiving progress updates via Socket.io/Postgres must function across process boundaries.
- **`rag` (Retrieval Augmented Generation)**: Scoped context injection and dynamic fallbacks must execute successfully inside the enqueued AI generation tasks on the worker.

## Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| Worker processes do not receive enqueued jobs because client connections are separated. | Write integration tests validating that `addJob` enqueues tasks and a separate worker processes them. |
| Memory spikes during PDF exports because Puppeteer instances are left open. | Force Chromium browser closure in `try/finally` blocks immediately after compilation. |
| Ingestion capacity is blocked due to OTLP traces flooding Langfuse. | Hard-gate OpenTelemetry trace exporters unless `ENABLE_LANGFUSE_TRACING` is explicitly set. |

## Test Plan

| REQ | Test file / describe block |
| :--- | :--- |
| **REQ-001** | `apiWorkerSplit.test.ts` $\rightarrow$ "Process Role Configuration" |
| **REQ-002** | `apiWorkerSplit.test.ts` $\rightarrow$ "Queue Registration Gating" |
| **REQ-003** | `apiWorkerSplit.test.ts` $\rightarrow$ "HTTP Express Server Gating" |
| **REQ-004** | `apiWorkerSplit.test.ts` $\rightarrow$ "Lazy Puppeteer Instantiation & Cleanup" |
| **REQ-005** | `apiWorkerSplit.test.ts` $\rightarrow$ "Langfuse Ingest Scope" |
| **REQ-006** | `apiWorkerSplit.test.ts` $\rightarrow$ "LLM Insights Blob Gating" |
