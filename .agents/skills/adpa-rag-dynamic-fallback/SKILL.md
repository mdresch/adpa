---
name: adpa-rag-dynamic-fallback
description: Feature 2 — FTS → sequential → vector RAG fallback with context re-injection. Use when changing searchChunks, retrieval strategies, or pgvector fallback. Requires Feature 1 contract to pass first.
---

# ADPA RAG Dynamic Fallback (Feature 2)

## Purpose

When primary FTS retrieval returns nothing (or fails), fall back through:

1. **FTS** — `document_chunks` full-text on `project_id` (+ optional `document_id` scope)
2. **Sequential** — ordered chunks for scoped source documents (when `documentIds` set)
3. **Vector** — `ragService.query` / `match_document_chunks` when `VOYAGE_API_KEY` is set

Every successful path **re-injects** Feature 1 context via `annotateChunks`.

## Overlap with Feature 1

| Concern | Feature 1 | Feature 2 |
|---------|-----------|-----------|
| Scope | Envelope + annotation | Retrieval chain |
| Contract | `validateContextInjectionContract` | Must pass before Feature 2 tests run |
| Self-healing | `assertFeature1Healthy()` | Blocked if Feature 1 fails |

## Key modules

| File | Role |
|------|------|
| `server/src/modules/rag/ragDynamicFallback.ts` | `retrieveChunksWithFallback`, `RagRetrievalError` |
| `server/src/modules/rag/ragFeatureGuard.ts` | `runRagFeatureGuard`, remediation hints |
| `server/src/modules/contextRetrieval/contextRetrievalService.ts` | Wires deps into `searchChunks` |

## Dependency injection (for tests)

```typescript
interface RagFallbackDeps {
  searchFts: (params) => Promise<RawChunkCandidate[]>
  searchSequential: (params) => Promise<RawChunkCandidate[]>
  searchVector?: (params) => Promise<RawChunkCandidate[]>
  scoreChunks: (query, candidates) => Promise<ScoredChunk[]>
}
```

Production implements these as private methods on `ContextRetrievalService`.

## Failure behavior

- All strategies exhausted → `RagRetrievalError` (caught in `searchChunks` → returns `[]`, logs warning)
- Missing `VOYAGE_API_KEY` → vector step skipped (FTS + sequential only)

## Tests

Governed packet `rag` in `server/governed-features.manifest.json`.

```powershell
cd server
npm run test:features -- rag    # full RAG packet (13 tests)
npm run test:rag-features       # alias
npm run verify:governed-features
```

## Agent checklist before editing

1. Run Feature 1 tests (`ragContextInjection.test.ts`).
2. Run Feature 2 tests (`ragDynamicFallback.test.ts`).
3. Run guard tests (`ragFeatureGuard.test.ts`).
4. If changing ingest metadata, verify `match_document_chunks` filter (`metadata @> { project_id }`).

## Related skill

`adpa-rag-context-injection` — Feature 1 contract (load first).
