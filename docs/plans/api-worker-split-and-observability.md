# Implementation Plan: API / Worker Split and Observability

## Goal Description
Address Production Out-Of-Memory (OOM) failures by splitting the main Express process into dedicated API and Worker roles, lazily loading Puppeteer to save RAM, and optimizing Langfuse tracing to focus primarily on LLM calls to AI providers.

## Proposed Changes

### `server/src/queueService.ts` (Priority 1)
- [MODIFY] Introduce `ADPA_PROCESS_ROLE` environment variables (`api` vs `worker`). Split the queue handlers so that the 14 concurrent RabbitMQ consumers do not load or run on the main Express API instance.

### `server/src/modules/pdf/pdfService.ts` (Priority 2)
- [MODIFY] Replace static Puppeteer imports with lazy loading (`const puppeteer = await import('puppeteer')`) only when a PDF is requested. Invoke `await pdfService.cleanup()` immediately after generation to shut down Chromium and release RAM.

### `server/src/utils/langfuse.ts` (Priority 3)
- [MODIFY] Set `ENABLE_LANGFUSE_TRACING=false` for broad OTLP tracing. Limit native SDK usage strictly to AI provider requests (prompts, completions, and token usage) to prevent blocking DB storage capacity. Focus tracing primarily on LLM calls and models.

## Verification Plan
- **Manual Verification**: Run the backend in `worker` mode and `api` mode independently to verify the split. Monitor system RAM while generating a PDF to confirm Chromium spins up and spins down cleanly. Check Langfuse traces to ensure only LLM calls are being ingested.
