# ADR 013: Document Generation Pipeline Architecture

## 1. Status
**Proposed (2026-07-23)** — the pipeline described here is fully implemented in `processFlowService.ts` and its stage modules; this ADR records the architecture retroactively.

## 2. Context

ADPA produces enterprise-grade governance and project-management documents inside a multi-stage AI pipeline. The implementation is large (8+ stages, Handlebars template engine, multi-format export, caching, post-generation hooks), but the design decisions behind the stage ordering, stage contracts, and output format constraints were never recorded as an ADR. Every developer currently reverse-engineers the pipeline from `server/src/services/processFlowService.ts` (`ProcessFlowService` ~lines 1–900) and the `multiStageDocumentProcessor/` family.

Verified against running code:

- **Template engine**: Handlebars with built-in helpers (`formatDate`, `eq`, `gt`, etc.) and variable substitution. Templates carry `system_prompt`, `context_injection_config`, `prompt_build_up`, `template_paragraphs`, and `gkg_context_strategy` (which controls Governance Knowledge Graph context injection).
- **Output formats**: Markdown (JSONB in PostgreSQL), PDF (Puppeteer + Adobe PDF Services), DOCX (`docx` library), HTML. PDF export is on-demand, not the storage format.
- **Compression caching**: `document_summaries` table stores compressed documents keyed by `(document_id, compression_method, compression_level, template_context_hash)`.
- **Post-generation hooks**: Confluence publishing and entity extraction are enqueued automatically after generation completes.
- **Quality validation**: DRACO Governance Evaluator + Counterfactual Challenger run in parallel via `aiService.generateWithFallback`, with verdict thresholds (`pass` / `flagged` / `fail`).
- **No separate orchestration queue in production**: `process-flow` is the queue entry point (`server/src/services/queue/queueClient.ts`).

## 3. Decision

We adopt an **8-stage synchronous pipeline** for document generation, bounded by a queue entry point, with Markdown as the canonical storage format and all other formats produced on demand.

### 3.1 Canonical Pipeline Shape

```
Template Analysis
→ Project Information Extraction
→ Stakeholder Information Extraction (optional)
→ Document Prioritization (relevance / recency / importance / hybrid scoring)
→ AI Document Compression (summarize / truncate / smart / keyword)
→ Context Window Optimization
→ Content Injection
→ AI Document Generation
→ Quality Validation
```

Each stage receives the output of the previous stage; the pipeline aborts on validation failure and surfaces the DRACO verdict to the user.

### 3.2 Markdown-Only Storage

All document content is stored as **Markdown (JSONB in PostgreSQL)**. PDF, DOCX, and HTML are export-only artifacts generated on demand by `unifiedPdfService.ts`, `adobePdfService.ts`, or `docx`. This decision preserves source editability, avoids format-lock-in, and keeps AI prompts simpler (the generator always speaks Markdown).

### 3.3 Template Design

Templates are **Handlebars documents** with built-in helper set plus project-level variable injection. A template's metadata (`system_prompt`, `context_injection_config`, `prompt_build_up`, `template_paragraphs`, `gkg_context_strategy`) controls how the generation engine scopes and prioritizes content. Template lifecycle states (`draft`, `testing`, `validated`, `production`, `compliance`, `archived`) are enforced at the DB layer and trigger background DRACO audits on every transition.

### 3.4 Caching and Idempotency

Compressed intermediate documents are cached in `document_summaries` keyed by document + compression policy hash. A cache hit skips the compression stage entirely. This makes repeated generation of the same document from the same baseline near-instant for non-AI steps.

### 3.5 Post-Generation Actions

Generation completion enqueues two side-effect jobs rather than executing them inline:
1. **Confluence publishing** (if project has a Confluence mapping and `confluence_enabled` is active).
2. **Entity extraction** for the generated document.

Both run on the same queue worker pool as other background jobs and inherit the same dead-letter and retry behavior.

## 4. Options Considered

### Option A: Pure synchronous generation, no queue
| Dimension | Assessment |
|---|---|
| Throughput | Limited to single request/response cycle; long documents block the HTTP thread |
| Resilience | No retry, no progress tracking, no recovery from timeout |
| Observability | Hard to instrument multi-minute generation as a single trace |

Rejected: unrealistic for AI generation (15-minute timeouts observed).

### Option B (Recommended): Queue entry point + synchronous pipeline stages + post-generation enqueue
| Dimension | Assessment |
|---|---|
| Throughput | HTTP returns a job ID immediately; progress is polled via SSE / jobs table |
| Resilience | Stalled jobs are detected by `StuckJobMonitor` and requeued; each stage has its own timeout |
| Observability | OpenTelemetry spans per stage; Langfuse traces per generation |
| Complexity | Medium — stage contracts must be stable so cache keys and retries remain valid |

The chosen model: the `process-flow` queue accepts the generation request, the pipeline stages execute synchronously within the worker, and side-effects (Confluence, extraction) are enqueued as downstream jobs.

### Option C: Fully event-sourced, each stage a separate queue job
| Dimension | Assessment |
|---|---|
| Throughput | Maximum parallelism if stages could run out of order |
| Ordering | Context injection cannot run before compression; splitting into independent jobs adds orchestration complexity without a proven need |
| Implementation | Would require a new DAG-engine for intra-generation job ordering |

Rejected: premature. The current model keeps stages sequential (which is correct for data dependencies) while making the overall generation unit of work queue-backed and restartable.

## 5. Consequences

### Positive
- **Single source of truth for content**: Markdown in JSONB keeps documents editable, diffable, and source-control-friendly.
- **Cache hit transparency**: hash-keyed compression cache makes repeated generation fast without changing API contracts.
- **Clean side-effect model**: post-generation hooks run as jobs, not inline, so a Confluence flake doesn't fail the generation itself.
- **DRACO integration at the right layer**: quality validation is a terminal stage, not sprinkled through the generator, which keeps prompt logic separate from verdict logic.

### Negative
- **Synchronous stages inside a worker**: a bug in stage N doesn't surface until the worker processes the job, making debugging longer than an HTTP request cycle.
- **Compression cache invalidation**: the cache key includes `template_context_hash`; if a template's `context_injection_config` changes but the hash doesn't (e.g. prompt wording changes that don't affect variable values), stale summaries can be served. The system relies on template authors to update hashes they care about.

### Risks
- **Timeouts**: AI generation timeouts are configurable per job type (e.g. `AI_GENERATE_JOB_TIMEOUT_MINUTES`). If a provider's latency spikes above the timeout, the generation fails and is retried from stage 1 unless mid-pipeline caching makes that cheap.
- **Provider coupling**: the pipeline is provider-agnostic at the stage level, but `aiService.generateWithFallback` is not — if the fallback chain itself fails (no active providers), generation throws and must be retried by the user.

## 6. Action Items

1. Document stage-input/output contracts (JSON schema per stage) so caching keys and retries can be validated independently of the implementation.
2. Add a pipeline-level dead-letter queue event so a generation that exhausts retries surfaces in the UI with the failing stage and last-known-good output.
3. Extend [ADR-016](ADR-016-multi-provider-ai-strategy-and-failover-architecture.md) with provider-specific timeout and token-budget policy that this pipeline consumes.
4. Register Document Generation as a governed feature packet in `server/governed-features.manifest.json` with Contract Guards written before any refactor of `ProcessFlowService`.

## 7. References

- `server/src/services/processFlowService.ts` — the 8-stage pipeline orchestrator
- `server/src/modules/documentGenerator/` — controller, routes, types, validation
- `server/src/services/documentCompressionService.ts` — compression caching layer
- `server/src/services/documentRegenerationService.ts` — versioned regeneration
- `server/src/services/unifiedPdfService.ts`, `server/src/services/adobePdfService.ts` — PDF export (Puppeteer + Adobe)
- `server/src/services/documentUploadService.ts` — file processing
- `server/src/modules/documentTemplates/service.ts` — template lifecycle, metadata fields
- [ADR-004: DRACO AI Governance](ADR-004-DRACO-AI-GOVERNANCE.md) — quality validation stage contract
- [ADR-016: Multi-Provider AI Strategy and Failover](ADR-016-multi-provider-ai-strategy-and-failover-architecture.md) — provider fallback chain this pipeline consumes
