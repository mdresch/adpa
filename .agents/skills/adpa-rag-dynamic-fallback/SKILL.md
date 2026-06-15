---
name: adpa-rag-dynamic-fallback
description: Feature 2 — Vector → FTS → sequential RAG fallback with context re-injection and token budgeting. Use when changing searchChunks, retrieval strategies, VectorQueryController, or token budgeting logic.
---

# ADPA RAG Dynamic Fallback & Intelligence Layer (Feature 2)

## Purpose

The Intelligence Layer enforces self-healing fallback vectors, strict multi-tenant isolation, and automated context token budgeting. The canonical retrieval priority is:

1. **Vector** — Primary semantic search. Requests route through `VectorQueryController` which securely provisions access via `VectorDBProvider`.
2. **FTS** — `document_chunks` full-text search on `tenantId` (+ optional `document_id` scope). Native PostgreSQL.
3. **Sequential** — Ordered chunks for scoped source documents (used as a last-resort safety net when vector and FTS fail).

Every successful path **re-injects** Feature 1 context via `annotateChunks`. Finally, `enforceTokenBudget` strictly limits the payload to 85% of the model's max context window to prevent HTTP 400s.

## Strict Vector Governance

Vector searches must **never** be executed directly.
- **`VectorQueryController`**: Asserts that `tenantId` strictly matches the active tenant filter. Blocks cross-tenant pollution.
- **`VectorDBProvider`**: Enforces a strict 1500ms `Promise.race` timeout on all external vector requests, catching latency spikes or outages and transparently degrading the system down to local FTS without breaking the user experience.

## Key modules

| File | Role |
|------|------|
| `server/src/modules/rag/ragDynamicFallback.ts` | `retrieveChunksWithFallback`, `RagRetrievalError` |
| `server/src/modules/rag/VectorQueryController.ts` | Security bounds and tenant isolation guard |
| `server/src/modules/rag/VectorDBProvider.ts` | Database interaction and outage simulation |
| `server/src/modules/rag/tokenBudgeting.ts` | Payload token counter (`js-tiktoken`) and truncation logic |

## Dependency injection (for tests)

```typescript
interface RagFallbackDeps {
  searchVector: (params) => Promise<RawChunkCandidate[]>
  searchFts: (params) => Promise<RawChunkCandidate[]>
  searchSequential: (params) => Promise<RawChunkCandidate[]>
  scoreChunks: (query, candidates) => Promise<ScoredChunk[]>
}
```

Production implements these as private methods on `ContextRetrievalService`.

## Tests

Governed packet `rag` in `server/governed-features.manifest.json`.

```powershell
cd server
npm run test:features -- rag    # full RAG packet (17 tests)
```

## Agent checklist before editing

1. Run Pillar 2 tests (`ragTenantIsolation.test.ts`, `tokenBudgeting.test.ts`).
2. Run Feature 1 tests (`ragContextInjection.test.ts`).
3. Run Feature 2 tests (`ragDynamicFallback.test.ts`).
4. If changing ingest metadata, verify `VectorQueryController` assertions.

## Related skill

`adpa-rag-context-injection` — Feature 1 contract (load first).
