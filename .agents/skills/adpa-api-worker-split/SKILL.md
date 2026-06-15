---
name: adpa-api-worker-split
description: Use when working on API/Worker process split, lazy Puppeteer, or Langfuse telemetry modifications.
---

# ADPA API / Worker Split & Observability

## Purpose
This feature splits the backend execution environment into distinct process roles: an API role that hosts the Express server and enqueues background jobs, and a Worker role that handles backend queue processors without loading the HTTP server layer. It also optimizes memory by lazily loading Puppeteer and restricting telemetry ingestion to AI calls only.

## Invariants
- `ADPA_PROCESS_ROLE` environment variable must default to `all`.
- Processes running under `ADPA_PROCESS_ROLE=api` must **never** call `.process()` on job queues or register handlers.
- Processes running under `ADPA_PROCESS_ROLE=worker` must **never** start the HTTP server on port 5000.
- Puppeteer must be dynamically imported only during execution of PDF export requests.
- Postgres `llm_insights` logs must only write raw prompts/responses to `jobs.data` if `LLM_INSIGHTS_STORE_BLOBS=true` is enabled.

## Key Files
| File | Role |
| :--- | :--- |
| `server/src/worker.ts` | Worker entry point |
| `server/src/server.ts` | API entry point |
| `server/src/services/queue/queueClient.ts` | RabbitMQ connection & job manager client |
| `server/src/services/queue/registerWorkers.ts` | Processor registrations |
| `server/src/services/queueService.ts` | Environment-aware initialization wrapper |
| `server/src/services/pdfService.ts` | Lazy Puppeteer browser pool |
| `server/src/services/unifiedAIService.ts` | Native Langfuse trace integrations |

## Commands
```powershell
cd server
npm run verify:governed-features
npm run test:features -- api-worker-split
```

## Related Skills
- `adpa-governed-feature-loop`
- `adpa-aev-workflow`
- `adpa-doc-gen-queue`
