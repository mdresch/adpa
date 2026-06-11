---
name: adpa-rag-context-injection
description: Feature 1 — scoped RAG context injection for document generation. Use when editing chunk retrieval, context envelopes, project/document scoping, or validateContextInjectionContract. Feature 2 (dynamic fallback) must not ship if this contract fails.
---

# ADPA RAG Context Injection (Feature 1)

## Purpose

Attach **project-scoped, document-scoped** metadata to every RAG chunk used in document generation. Context must reflect **source document ids**, not project-wide chunk dumps.

## Foundational contract

`validateContextInjectionContract()` in `server/src/modules/rag/ragContextInjection.ts` is the self-healing gate. Feature 2 tests call it in `beforeEach`. CI can run `runRagFeatureGuard()` from `ragFeatureGuard.ts`.

## Key modules

| File | Role |
|------|------|
| `server/src/modules/rag/ragContextInjection.ts` | `buildContextEnvelope`, `annotateChunks`, `validateContextInjectionContract` |
| `server/src/modules/contextRetrieval/contextRetrievalService.ts` | `searchChunks` — production retrieval |
| `server/src/services/documentGenerationService.ts` | Passes `documentIds` to `searchChunks`; scopes entities |
| `server/src/services/ragService.ts` | Ingest sets `project_id`, `template_id`, `title` on chunks |

## Context envelope shape

```typescript
{
  projectId: string
  documentIds: string[]
  source: string        // "RAG Query: …"
  retrievedAt: string   // ISO timestamp
  strategy: 'fts' | 'sequential' | 'vector' | 'none'
  confidence: number    // 0–1
}
```

## Rules

1. **Never** omit `projectId` on chunk search or ingest.
2. **Prefer** `documentIds` from the generation job over project-wide search.
3. **Re-ingest** source documents via `ragService.ingestDocument` when chunks lack `project_id`.
4. **Do not** change envelope fields without updating `validateContextInjectionContract` and tests.

## Tests

Part of governed packet `rag` (`testPathPattern: modules/rag`).

```powershell
cd server
npm run test:features -- rag
npx jest --config jest.config.unit.js --testPathPattern=ragContextInjection --no-coverage
```

## Related skill

`adpa-rag-dynamic-fallback` — Feature 2; depends on this contract.
