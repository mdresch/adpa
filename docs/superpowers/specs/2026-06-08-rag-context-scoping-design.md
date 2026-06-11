# RAG Context Scoping & Dynamic Retrieval Fallback

**Date:** 2026-06-08  
**Status:** Implemented  
**Governed packet:** `rag` — `npm run test:rag-features` (13 tests)

---

## Problem

Document generation used project-wide RAG retrieval, pulling chunks from unrelated documents and polluting prompts with out-of-scope context. When retrieval strategies failed or returned empty results, behavior was inconsistent and failures were hard to diagnose. Adding a second retrieval layer (fallback chain) risked breaking the foundational context-injection contract.

---

## Success Criteria

- [x] RAG retrieval for document generation is scoped to `projectId` + explicit `sourceDocumentIds`
- [x] Every retrieved chunk carries injectable context metadata (envelope)
- [x] Retrieval tries FTS → sequential → vector before failing
- [x] Feature 2 cannot ship while Feature 1 contract is broken (dual-loop guard)
- [x] Governed feature packet registered in CI (`verify:governed-features` + `test:rag-features`)

---

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | Build a **context envelope** with `projectId`, `documentIds`, query source, `strategy`, `confidence`, and ISO `retrievedAt` | P0 |
| REQ-002 | **Reject** envelope construction when `projectId` is missing or blank | P0 |
| REQ-003 | **Annotate** each chunk hit with the envelope as `context` metadata | P0 |
| REQ-004 | Expose **`validateContextInjectionContract()`** as the foundational contract probe for dependents | P0 |
| REQ-005 | Use **FTS** as the primary retrieval strategy when it returns candidates | P0 |
| REQ-006 | **Fall back to sequential** chunk retrieval when FTS returns no candidates | P0 |
| REQ-007 | **Fall back to vector** search when FTS and sequential are empty | P0 |
| REQ-008 | Throw **`RagRetrievalError`** when all providers fail | P0 |
| REQ-009 | **Re-inject** context metadata on every fallback response (same envelope invariants) | P0 |
| REQ-010 | Feature 2 test suite runs **`validateContextInjectionContract()` in `beforeEach`** — block if Feature 1 contract fails | P0 |
| REQ-011 | **`assertFeature1Healthy()`** throws when Feature 1 contract is unhealthy | P1 |
| REQ-012 | **`runRagFeatureGuard()`** reports `feature1`, `feature2Ready`, errors, and remediation hints | P1 |

---

## Interaction Rules (Overlap)

This feature MUST NOT break:

| Dependent | Prerequisite | Rule |
|-----------|--------------|------|
| `adpa-rag-dynamic-fallback` (Feature 2) | `adpa-rag-context-injection` (Feature 1) | Fallback transforms raw hits but must preserve Feature 1 envelope invariants |
| Document generation (`documentGenerationService`) | Both RAG modules | Passes `sourceDocumentIds`; ingest + search scoped to project + documents |
| `contextRetrieval.searchChunks` | RAG fallback deps | FTS / sequential paths filter by `project_id` and optional `documentIds` |

New interaction tests are required when:

- A new retrieval provider is added to the fallback chain
- Chunk shape or envelope fields change
- Document generation passes different scope inputs

---

## Risks

| Risk | Mitigation |
|------|------------|
| Feature 2 regresses Feature 1 | `validateContextInjectionContract` + `beforeEach` guard + `runRagFeatureGuard` |
| Legacy chunks missing `project_id` | Backfill migration (out of scope for packet tests; monitor in integration) |
| Vector fallback unavailable without API key | Graceful skip in production; unit tests mock `searchVector` |
| Weak traceability | Every REQ maps to ≥1 Jest test; spec + skills + manifest |

---

## Test Plan

| REQ | Test file | Test / describe |
|-----|-----------|-----------------|
| REQ-001 | `ragContextInjection.test.ts` | `builds a context envelope scoped to project and source documents` |
| REQ-002 | `ragContextInjection.test.ts` | `rejects missing project id` |
| REQ-003 | `ragContextInjection.test.ts` | `annotates chunks with injected context metadata` |
| REQ-004 | `ragContextInjection.test.ts` | `passes the foundational contract used by Feature 2` |
| REQ-005 | `ragDynamicFallback.test.ts` | `uses primary FTS when it returns candidates` |
| REQ-006 | `ragDynamicFallback.test.ts` | `falls back to sequential chunks when FTS returns nothing` |
| REQ-007 | `ragDynamicFallback.test.ts` | `falls back to vector search when FTS and sequential are empty` |
| REQ-008 | `ragDynamicFallback.test.ts` | `throws when all providers fail` |
| REQ-009 | `ragDynamicFallback.test.ts` | `re-injects context metadata on fallback responses` |
| REQ-010 | `ragDynamicFallback.test.ts` | `beforeEach` → `validateContextInjectionContract()` |
| REQ-011 | `ragFeatureGuard.test.ts` | `blocks Feature 2 work when Feature 1 contract fails` / `allows Feature 2 when Feature 1 contract passes` |
| REQ-012 | `ragFeatureGuard.test.ts` | `runRagFeatureGuard reports healthy stack` / `documents remediation hints when Feature 1 is unhealthy` |

---

## Key Implementation Paths

| Layer | Path |
|-------|------|
| Feature 1 module | `server/src/modules/rag/ragContextInjection.ts` |
| Feature 2 module | `server/src/modules/rag/ragDynamicFallback.ts` |
| Guard | `server/src/modules/rag/ragFeatureGuard.ts` |
| Integration | `server/src/modules/contextRetrieval/contextRetrievalService.ts`, `server/src/services/documentGenerationService.ts` |
| Skills | `.agents/skills/adpa-rag-context-injection/SKILL.md`, `.agents/skills/adpa-rag-dynamic-fallback/SKILL.md` |
| Governance | `server/governed-features.manifest.json`, `.github/workflows/adpa-feature-validation.yml` |

---

## Solution

### 1. Robust Context Injection (Governed Feature)

The implementation ensures that no section is "starved" of project context by applying a multi-tiered injection strategy:

#### A. Global Project Registry (Baseline)
- **Requirement**: `REQ-ENT-001`
- **Logic**: Every drafting prompt includes the top 10 verified project entities (e.g., Project Sponsor, Critical Milestones) as a "Global Project Registry".
- **Benefit**: Ensures the LLM uses consistent naming and established data even if the specific section heading doesn't trigger a keyword match.

#### B. RAG Fallback Chain
- **Requirement**: `REQ-RAG-001`
- **Logic**: 
  1. **Scoped Search**: First attempt RAG retrieval restricted to `sourceDocumentIds` provided by the user.
  2. **Project Fallback**: If the scoped search returns 0 chunks AND `sourceDocumentIds` were provided, automatically re-run the search across the *entire project*.
- **Benefit**: Transparently recovers context when user-provided document links are sparse or incomplete.

#### C. Full Entity JSON Injection
- **Requirement**: `REQ-ENT-002`
- **Logic**: Matched entities include their full `structural_payload` (JSON) formatted as `- [type] name — Details: {json}`.
- **Benefit**: LLMs can reuse specific values (e.g., interest levels, dates) verbatim.

#### D. Observability & Metrics
- **Requirement**: `REQ-OPS-001`
- **Logic**: Drafting snapshots recorded in the `jobs` table now include `context_metrics` (rag_strategy, chunks_found, entities_injected).
- **Benefit**: Operators can verify context quality in the Job Monitor UI.

---

## Commands

```powershell
cd server
npm run test:doc-gen
npm run verify:governed-features
```
