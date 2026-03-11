# Implementation Plan: Extraction Service Refactoring

**Target Service**: `server/src/services/projectDataExtractionService.ts`  
**Goal**: Harden an already-modular extraction system and add RAG-based context retrieval.

---

> [!IMPORTANT]
> **Audit Finding (2026-03-11)**: The original plan assumed a greenfield refactor. A codebase audit revealed the architecture is ~75% complete. This document reflects the **actual remaining work only.**

---

## ✅ Already Implemented (Do Not Re-implement)

| Component | File | Status |
|-----------|------|--------|
| Strategy pattern (extract + save functions) | `ExtractionOrchestrator.ts` | ✅ Complete |
| Entity registry | `ExtractionRegistry.ts` | ✅ Complete |
| 70+ entity modules registered | `ExtractionRegistry.ts:150–799` | ✅ Complete |
| Per-entity feature flags (env vars) | `ExtractionRegistry.setFeatureFlagFromEnv()` | ✅ Complete |
| Winston JSON structured logging | `utils/logger.ts` | ✅ Complete |
| `ExtractionContext` (document map, fuzzy match) | `base/ExtractionContext.ts` | ✅ Complete |
| `ExtractionStats` with `durationMs`, `cacheHit` | `base/ExtractionResult.ts` | ✅ Complete |
| Parity tests (25 entity types) | `src/__tests__/extraction/*.parity.test.ts` | ✅ Complete |
| Transaction boundaries + rollback | `ExtractionOrchestrator.saveSingleEntityType()` | ✅ Complete |

---

## ❌ Remaining Work

### Phase 1: Production Hardening (Estimate: 5–7 days)

#### 1.1 CorrelationId Threading  
**Gap**: `ExtractionContext` has no `correlationId`. Logs cannot be traced end-to-end across multi-entity runs.  
**Fix**: Add `correlationId` to `ExtractionContext` constructor and thread it through every log call.

```typescript
// ExtractionContext.ts
import { randomUUID } from 'crypto'

export class ExtractionContext {
  public readonly correlationId: string  // ADD THIS

  constructor(projectId, userId, documents, options) {
    this.correlationId = options.correlationId ?? randomUUID()  // ADD THIS
    // ...existing code...
  }
}

// ExtractionOrchestrator.ts — update log calls:
logger.info(`[EXTRACTION-${entityType}] Starting`, {
  correlationId: context.correlationId,  // THREAD THROUGH
  projectId,
  documentCount: documents.length,
  provider: context.provider,
  model: context.model
})
```

**Effort**: 0.5 day  
**Files**: `base/ExtractionContext.ts`, `base/ExtractionResult.ts` (add to `ExtractionOptions`), `ExtractionOrchestrator.ts`

---

#### 1.2 Dead-Letter Table  
**Gap**: `ExtractionOrchestrator` catches errors and returns `[]` silently. Failed extractions vanish with no retry path.  
**Fix**: Create migration + write failures to `extraction_failures`.

```sql
-- New migration file
CREATE TABLE extraction_failures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL,
  entity_type     VARCHAR NOT NULL,
  error           TEXT NOT NULL,
  ai_response_raw TEXT,
  correlation_id  UUID,
  attempted_at    TIMESTAMPTZ DEFAULT NOW(),
  retry_at        TIMESTAMPTZ,
  retry_count     INT DEFAULT 0,
  status          VARCHAR DEFAULT 'pending'  -- pending | retried | resolved
);
CREATE INDEX idx_extraction_failures_project ON extraction_failures(project_id);
CREATE INDEX idx_extraction_failures_status ON extraction_failures(status, retry_at);
```

```typescript
// ExtractionOrchestrator.ts — replace silent catch with:
} catch (error: unknown) {
  await logExtractionFailure(pool, {
    projectId,
    entityType,
    correlationId: context.correlationId,
    error: error instanceof Error ? error.message : String(error),
    retryAt: new Date(Date.now() + 5 * 60 * 1000) // retry in 5 min
  })
  return []
}
```

**Effort**: 1.5 days (migration + helper function + retry worker)  
**Files**: new migration SQL, `ExtractionOrchestrator.ts`, new `extractionFailureLogger.ts`

---

#### 1.3 Baseline Metrics Capture  
**Gap**: No current performance baseline exists. Post-refactor improvements cannot be quantified.  
**Fix**: One-shot script to run extraction on 5 representative projects and capture timing/token stats.

```typescript
// scripts/capture_extraction_baseline.ts
// For each of 5 selected projectIds:
//   - Run extractSingleEntityType() for risks, stakeholders, milestones, requirements, activities
//   - Capture: durationMs, totalExtracted, provider, model, promptTokens, completionTokens
//   - Write results to scripts/baseline_results.json
```

**Effort**: 1 day

---

#### 1.4 Context Size Guardrail  
**Gap**: `ExtractionContext.buildDocumentContext()` truncates at 50K chars per document but has no total context size limit. A project with 20 large documents still blows the token budget.  
**Fix**: Add a total context budget cap (e.g., 400K chars ≈ ~100K tokens) and log a warning when truncated.

```typescript
// ExtractionContext.ts — in buildDocumentContext():
const TOTAL_CONTEXT_BUDGET = 400_000  // chars
let totalChars = 0
validDocuments.forEach((doc, index) => {
  const remaining = TOTAL_CONTEXT_BUDGET - totalChars
  if (remaining <= 0) {
    logger.warn('[EXTRACTION] Total context budget exceeded, skipping remaining documents', {
      totalDocuments: validDocuments.length, includedDocuments: index
    })
    return
  }
  const content = doc.content.substring(0, Math.min(50000, remaining))
  totalChars += content.length
  // ...
})
```

**Effort**: 0.5 day

---

### Phase 2: Zod Validation + Structured Outputs (Estimate: 3–4 days)

**Gap**: The current extractors call the AI service and parse JSON manually. There is no Zod schema validation or auto-retry on malformed output.

#### 2.1 Adopt Structured AI Outputs
- Update `aiService` to use `response_format: { type: "json_object" }` for OpenAI calls.
- For Anthropic, use Tool Use for structured extraction.

#### 2.2 Zod Validation with Auto-Retry
Add a shared validation wrapper used by all entity extractors:

```typescript
// base/validateWithRetry.ts
export async function validateWithRetry<T>(
  raw: string,
  schema: ZodSchema<T>,
  reprompt: (error: string) => Promise<string>,
  maxRetries = 2
): Promise<T[]> {
  const parsed = JSON.parse(raw)
  const result = schema.safeParse(parsed)
  if (result.success) return result.data
  if (maxRetries > 0) {
    const fixed = await reprompt(result.error.message)
    return validateWithRetry(fixed, schema, reprompt, maxRetries - 1)
  }
  throw new Error(`Validation failed after retries: ${result.error.message}`)
}
```

**Effort**: 3 days (shared utility + updating 5 highest-volume entity extractors as pilot)

---

### Phase 3: RAG / Context Optimization (Estimate: 10–12 days)

> [!WARNING]
> This phase is a significant standalone project. Execute only after Phase 1 & 2 are stable.

#### 3.1 Vector Store Setup
- Enable `pgvector` extension on local PostgreSQL.
- Create `document_embeddings(id, document_id, chunk_index, embedding vector(1536), text, metadata)`.
- **Cost**: `text-embedding-3-small` ≈ $0.0002/project at scale. Set alert >$500/month.

#### 3.2 Embedding Pipeline
- Chunk documents on ingest → embed via `text-embedding-3-small` → store.
- Track `embedded_at`; invalidate on document update.

#### 3.3 Smart Retrieval in ExtractionContext
Replace `buildDocumentContext()` (full dump) with a vector-search-backed retrieval step.
- Query: entity-type-specific query string (e.g., `"project risks and threats"`)
- Retrieve top-5 chunks (cosine similarity ≥ 0.75)
- Fallback 1: BM25 keyword search if <5 chunks
- Fallback 2: full document context (current behaviour)

---

## 📅 Revised Execution Roadmap

| Phase | Task | Effort | Dependencies |
|-------|------|--------|--------------|
| **1.1** | CorrelationId threading | 0.5d | None |
| **1.2** | Dead-letter table + failure logger | 1.5d | 1.1 |
| **1.3** | Baseline metrics capture script | 1d | None |
| **1.4** | Context size guardrail | 0.5d | None |
| **2.1** | Structured outputs (OpenAI/Anthropic) | 1.5d | aiService |
| **2.2** | Zod validation + retry (pilot 5 entities) | 1.5d | 2.1 |
| **3.1** | pgvector setup + embedding pipeline | 4d | pgvector |
| **3.2** | Smart retrieval in ExtractionContext | 4d | 3.1 |
| **3.3** | Embedding freshness + invalidation | 2d | 3.2 |

**Remaining Total: ~16 days** (vs. original 31-day estimate for full greenfield)

---

## ✅ Success Metrics

| Metric | Target |
|--------|--------|
| Zero extraction failures on 5 baseline projects | Regression guard |
| p95 per-entity extraction time | ≤ 8s |
| Token cost per full project extraction | -30% after Phase 3 |
| Dead-letter queue depth | 0 unresolved failures after 24h |
| CorrelationId visible in every log line | 100% coverage |