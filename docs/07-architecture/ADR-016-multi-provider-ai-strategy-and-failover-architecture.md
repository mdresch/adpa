# ADR 016: Multi-Provider AI Strategy and Failover Architecture

## 1. Status
**Proposed (2026-07-23)** — the provider selection, fallback chain, and cost-tracking described here are fully implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA's README names OpenAI, Google, GitHub Copilot, Mistral, and Ollama as supported AI providers, but [ADR-007](ADR-007-xai-developer-tools-suite.md) covers xAI exclusively and does not address the broader multi-provider strategy. The production codebase contains:

- A unified service (`server/src/services/unifiedAIService.ts`) abstracting OpenAI, Google, Mistral, Azure, Anthropic, Ollama, and Foundry Local.
- Legacy adapters (`server/src/modules/ai/`) still in use for the above plus a GitHub Copilot SDK adapter.
- A database-driven provider table (`ai_providers`) with `available_models` JSONB, `is_active` flag, and `priority` ordering.
- A `FallbackExecutor` that builds a fallback chain from active providers.
- Per-generation cost tracking in the `jobs` table and `ai_generation_jobs` with hardcoded per-provider pricing tables.
- Langfuse observability backend with per-generation traces bound to `projectId` / `documentId`.

No ADR has recorded the provider abstraction, failover policy, cost governance model, or the relationship between legacy adapters and the unified service.

Verified against running code: `server/src/services/unifiedAIService.ts` defines `AIProvider.type` as `openai | google | mistral | azure | anthropic | ollama | foundry-local`. xAI is referenced as a legacy type (`normalizeProviderName` maps `xai`/`grok`) but is not included in the unified service's type union. Provider selection is DB-driven at startup (`SELECT provider_type FROM ai_providers WHERE is_active = true ORDER BY priority ASC`).

## 3. Decision

We adopt a **database-driven, priority-ordered provider pool with an explicit fallback chain and fail-fast semantics**. The unified service is the canonical entry point; legacy adapters are preserved for backward compatibility but are not extended.

### 3.1 Provider Pool

Active providers are loaded from the `ai_providers` table at startup. Each row carries:

- `provider_type` — standard identifier (`openai`, `google`, `anthropic`, etc.)
- `available_models` — JSONB array of supported model IDs
- `is_active` — soft enable/disable flag
- `priority` — lower = preferred in fallback chain

Providers not present in `ai_providers` are invisible to the runtime selection loop, even if their legacy adapter is registered.

### 3.2 Fallback Chain

When a generation request specifies a preferred provider:

1. **Try the preferred provider first** if it is active and has a client.
2. **Fall through the active provider list** in ascending `priority` order.
3. **Abort if no active provider has a client** — generation throws immediately rather than looping indefinitely.

The chain is rebuilt on every generation request from the current `ai_providers` snapshot; a provider deactivated mid-run does not poison in-flight generations.

### 3.3 Failover Semantics

- `maxRetries = 1` for the initial provider attempt.
- Failure reasons are logged per attempt (latency, cost, error class) by the `FallbackExecutor`.
- If the preferred provider fails and the chain exhausts, the error surfaced to the caller includes the full attempt chain so support can diagnose which provider failed and why.

### 3.4 Cost Governance

- **Rate cards**: per-provider pricing is hardcoded in the unified service (e.g., `$0.00150/1K` input tokens for OpenAI, `$0.00300/1K` for Anthropic). These are used for cost estimation before generation and for post-generation accounting.
- **Token accounting**: every generated job records `provider`, `model`, `input_tokens`, `output_tokens`, `cost`, and `duration_ms` in `ai_generation_jobs`.
- **Cost visibility**: `server/src/__tests__/modules/ai/` includes a provider test suite that validates each provider adapter against its rate card.

### 3.5 Provider Specialization

`processFlowService` already implements provider-aware routing for document compression (Groq is preferred for speed, DeepSeek for cost). This ADR preserves that pattern but extends it: provider selection for a given generation job is configurable per job type, defaulting to the priority-ordered pool, with the ability to pin a provider model for tasks that require specific capabilities (e.g., vision).

## 4. Options Considered

### Option A: Single provider (the status quo before unified service)
| Dimension | Assessment |
|---|---|
| Resilience | Single point of failure — provider outage = generation outage |
| Cost | Cannot exploit cheaper providers for non-critical tasks |

Rejected: this was the pre-existing model (only xAI documented in ADR-007). The unified service replaced it because production demanded resilience.

### Option B (Recommended): Database-driven pool + fallback chain + cost accounting
| Dimension | Assessment |
|---|---|
| Resilience | One provider down = next provider takes over; generation continues |
| Cost | Rate-card accounting lets the ops team switch to cheaper providers without code changes |
| Complexity | Medium — `FallbackExecutor` and the unified service add abstraction, but the abstraction is already working |

The current implementation. It is chosen because it has already proven itself in production: deactivating a provider in `ai_providers` removes it from the chain within the next server restart, no redeployment required.

### Option C: Static provider list in config (env vars)
| Dimension | Assessment |
|---|---|
| Resilience | Same as Option B, but changes require restart + redeploy |
| Cost | Same rate-card model possible |

Rejected: the DB-driven model allows ops to toggle providers in the admin UI without touching the process.

## 5. Consequences

### Positive
- **Resilience**: provider outages degrade gracefully to the next provider in the chain.
- **Cost control**: rate-card accounting makes per-document cost visible in the jobs table; switching to cheaper providers is a DB update, not a code deploy.
- **Extensibility**: adding a new provider adapter is a single registration in `AIProvider.type` + a row in `ai_providers`; existing generations continue using the old pool until the restart.

### Negative
- **Legacy adapter debt**: the legacy `server/src/modules/ai/*` connectors are still referenced by older generation code paths. New code should use the unified service, but there is no code-level enforcement.
- **Rate-card staleness**: hardcoded pricing tables drift from actual provider prices. Mitigated by an open question (§6) to make rate cards DB-cached.

### Risks
- **xAI gap**: xAI is not in the unified service's type union. If a generation job requests `xai` and the unified service is used, the request fails at type-check time rather than falling back. This is a known gap tracked separately.
- **Concurrent generation cost spikes**: a batch of 70 documents with 10 parallel workers (see [ADR-017](ADR-017-queue-and-background-processing-architecture.md)) can consume thousands of dollars in API calls in seconds if cost limits are not enforced. The current codebase logs costs but does not enforce a budget.

## 6. Action Items

1. Add `xai` to the unified service's `AIProvider.type` union, replacing the legacy adapter path for Grok calls.
2. Move per-provider rate cards from hardcoded maps into `ai_providers` JSONB (e.g., `pricing: { input_per_1k: 0.0015, output_per_1k: 0.002 }`), updated via admin UI.
3. Add a generation-level cost budget check (configurable per project) that blocks generation if estimated cost exceeds the budget, with an explicit human override path.
4. Register AI Provider Strategy as a governed feature packet in `server/governed-features.manifest.json`.

## 7. References

- `server/src/services/unifiedAIService.ts` — primary AI SDK v5 abstraction, fallback chain, rate-card maps
- `server/src/modules/ai/openai.ts`, `server/src/modules/ai/google.ts`, `server/src/modules/ai/mistral.ts`, `server/src/modules/ai/ollama.ts`, `server/src/modules/ai/azure.ts`, `server/src/modules/ai/foundry-local.ts` — legacy provider connectors
- `server/src/modules/ai/FallbackExecutor.ts` — generic fallback chain runner
- `server/src/modules/ai/copilotAdapter.ts` — GitHub Copilot SDK adapter (best-effort)
- `server/src/services/aiService.ts` — `generateWithFallback`, Langfuse tracing, token accounting
- `server/src/startup/dependencies/aiProviders.ts` — startup dependency graph node for provider initialization
- `server/src/services/processFlowService.ts` (lines 598–880) — dynamic provider worker pool
- [ADR-007: xAI Developer Tools Suite](ADR-007-xai-developer-tools-suite.md) — the single-provider ADR that this document supersedes for provider strategy
- [ADR-017: Queue & Background Processing Architecture](ADR-017-queue-and-background-processing-architecture.md) — parallel worker topology that consumes provider pool
