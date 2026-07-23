# ADR 015: Entity Extraction & Knowledge Graph Architecture

## 1. Status
**Proposed (2026-07-23)** — the extraction and knowledge-graph pipeline described here is fully implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA extracts structured entities from generated Markdown documents and stores them in two backends: PostgreSQL (primary, source of truth) and Neo4j (knowledge graph, relationship traversal). The extraction registry contains 50+ entity types, each with a deterministic parser and a dual-persistence writer. Extraction failures are routed to a dead-letter queue and do not block generation. None of this is documented at the ADR level.

Verified against running code:

- **Registry pattern**: `ExtractionRegistry.ts` registers each entity type with `extract` and `save` functions. The orchestrator calls them by type.
- **Feature flags**: each entity type can be toggled via `EXTRACTION_USE_NEW_<ENTITY_TYPE>` env vars.
- **Batching**: extraction jobs respect `maxBatchTokens` and `maxDocsPerBatch` limits.
- **Dual persistence**: `DualWritePersistence.ts` writes extracts to both Appwrite and Postgres within a transactional boundary. Dead-letter failures are logged to `extraction_dead_letters` and do not block parent job completion.
- **Inline extraction**: H8 tags (e.g., `<ENTITY type="stakeholder" name="..." >`) are parsed during generation and written to the entity registry in the same transaction as the document save.
- **AI provider/model per job**: extraction jobs accept a configurable provider and model, defaulting to `openai`.

## 3. Decision

We adopt an **extraction-as-pluggable-pipeline** architecture. Extraction is a registry of domain-specific parsers, not a single monolithic extractor, and writes are dual-persisted but Postgres-authoritative.

### 3.1 Registry Contract

Every entity type in `ExtractionRegistry` implements two functions:

- `extract(markdown: string, context: ExtractionContext): ExtractedEntity[]` — deterministic parse of YAML blocks or H8 inline tags from Markdown.
- `save(entities: ExtractedEntity[], context: ExtractionContext): Promise<void>` — dual-persistence write (Postgres + Neo4j / Appwrite).

The registry is read at startup; missing a feature flag for an entity type silently skips it, not fails it.

### 3.2 Post-Generation Triggering

Entity extraction is a **post-generation side-effect**, not a generation-stage concern. `ProcessFlowService` enqueues an `extract-entity-<type>` job for each registered entity type after the AI generation stage succeeds. This means:

- Extraction failures never fail the generation that produced the source document.
- Extraction can be retried independently of regeneration.
- The `jobs` table tracks extraction job status independently of the generation job.

### 3.3 Dual-Store Transactional Atomicity

`DualWritePersistence` writes to both stores within a best-effort transaction. The contract is:

- **Postgres is the source of truth** for reads and queries.
- **Neo4j / Appwrite is the query projection** used for graph traversal and cross-project analytics.
- A failed write to the secondary store is logged to `extraction_dead_letters` and retried by background reconciliation, not retried synchronously inside the extraction worker.

This avoids extraction latency being gated on the slower secondary store.

### 3.4 Inline H8 Extraction

In addition to the post-generation registry, the document generator supports **inline H8 tags** (`<ENTITY type="..." name="..." >`) parsed during generation. Inline entities flow through the same `save` path and land in the same tables as post-generation extracts. This allows template authors to pre-declare known entities (e.g., stakeholders, deliverables) without relying on AI to extract them.

### 3.5 Knowledge Graph Relationship

Extracted entities are projected into Neo4j as nodes with labeled relationships. The schema is defined in the pipeline documentation (`docs/projects/digital-twins-itwin/13-comprehensive-digital-twin-analysis.md`). Entity matching (which graph node represents the same real-world entity as a newly extracted row) is performed by `GKGIngestionService` using a combination of exact-ID match and fuzzy name match before the Neo4j write.

## 4. Options Considered

### Option A: Single generic extractor (regex over all entity types)
| Dimension | Assessment |
|---|---|
| Complexity | Lowest — one parser, one writer |
| Accuracy | Poor — entity types have structurally different YAML shapes |
| Performance | Good — one pass over the document |

Rejected: the 50+ entity types have distinct schemas (stakeholders have name/role/email; deliverables have name/owner/dates; risks have severity/probability/mitigation). A generic regex would produce high false-positive rates and require post-parse schema validation anyway.

### Option B (Recommended): Registry of deterministic parsers + dual-persistence writer
| Dimension | Assessment |
|---|---|
| Complexity | Medium — 50+ modules, but each is ~100 lines |
| Accuracy | High — each parser knows its entity's exact YAML shape |
| Performance | Good — parallel processing across entity types |

The current implementation. Deterministic parsing (no AI at the extraction step) makes pipeline behavior predictable: the same input always produces the same entity rows, which simplifies testing and debugging.

### Option C: AI-driven extraction only (no parser registry)
| Dimension | Assessment |
|---|---|
| Complexity | Medium — one prompt, but prompt engineering for 50+ types is fragile |
| Accuracy | Variable — hallucination risk on entity boundaries |
| Cost | Higher — every extraction is an AI call |

Rejected: deterministic parsing is cheaper, faster, and easier to audit. AI extraction is reserved for the generation stage, where linguistic understanding is required.

## 5. Consequences

### Positive
- **Deterministic behavior**: identical input → identical entity rows, which makes regression testing straightforward.
- **Fault isolation**: a broken stakeholder extractor doesn't stop deliverables or risks from being extracted.
- **Dead-letter recovery**: failed extractions are visible and retryable without regenerating the source document.

### Negative
- **Module sprawl**: 50+ extraction directories, each with the same two-function shape, add navigation cost for new developers.
- **Dual-write drift risk**: if the Postgres schema and Neo4j label set diverge (e.g., a new entity field is added to Postgres but not projected), graph queries return stale shapes.

### Risks
- **Name-based matching collisions**: two entities with similar names from different projects may be incorrectly merged in Neo4j. Mitigated by including `project_id` in the merge key and requiring exact match on that field before falling back to fuzzy name match.
- **Inline tag proliferation**: template authors may add H8 tags for convenience, but inline tags bypass the context-gathering stage and are not freshened by `contextFreshness`. If an inline-tagged entity changes in the entity registry, the tag in the document template becomes stale and the next generation re-extracts the old name. Mitigated by adding a lint rule that warns when an H8 tag's value differs from the entity registry's current canonical name.

## 6. Action Items

1. Publish a JSON schema for `ExtractedEntity` and the extraction context envelope so stage contracts are enforced at the type level.
2. Add the Neo4j projection schema to the ADR as a follow-up extension once the knowledge graph feature is stable (currently behind feature flags).
3. Register Entity Extraction as a governed feature packet in `server/governed-features.manifest.json` under `inline-entity-extraction`.
4. Add a lint rule for inline H8 tag staleness (see Risks above).

## 7. References

- `server/src/services/extraction/ExtractionRegistry.ts` — pluggable registry of 50+ entity types
- `server/src/services/extraction/ExtractionOrchestrator.ts` — orchestration and error handling
- `server/src/services/extraction/dual/DualWritePersistence.ts` — dual-persistence write
- `server/src/services/extraction/DeadLetterService.ts` — failure logging and recovery
- `server/src/services/extraction/core/CoreExtractionService.ts` — core orchestration
- `server/src/modules/documentTemplates/types.ts` — template metadata controlling post-generation extraction
- `docs/projects/digital-twins-itwin/13-comprehensive-digital-twin-analysis.md` — knowledge graph schema and entity shapes
- [ADR-013: Document Generation Pipeline Architecture](ADR-013-document-generation-pipeline-architecture.md) — the generation stage that triggers extraction as a side-effect
- [ADR-014: Context & Knowledge Management Framework](ADR-014-context-and-knowledge-management-framework.md) — the context pipeline that feeds entity values into generation
