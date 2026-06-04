---
name: adpa-inline-entity-extraction
description: >
  Use when working on document generation — specifically when modifying
  `documentGenerationService.ts`, the `InlineEntityParserService`, the
  `draftSection` prompt, or the entity registry. Use when asked to add new
  entity types to inline extraction, change the H8 tag format, alter how
  entities are saved during generation, or debug missing entities after
  generation.
triggers:
  - Modifying draftSection() in documentGenerationService.ts
  - Adding a new entity type to inline extraction
  - Changing the H8 tag format or parsing logic
  - Debugging missing entities after document generation
  - Working with InlineEntityParserService
  - Editing ExtractionRegistry or ExtractionOrchestrator
---

# ADPA Inline Entity Extraction

## What Inline Entity Extraction Is

During document generation the drafting LLM is explicitly instructed — inside
the `draftSection()` prompt — to append structured entity tags at the **bottom**
of every section it writes.

Tags use a reserved Markdown heading level (H8) as a sentinel format:

```
######## entity_type: {json_object}
```

After each section is drafted, `InlineEntityParserService.parseAndProcess()`
reads those lines, groups the parsed objects by entity type, and persists them
to the database through the savers registered in the `ExtractionRegistry`.

> **The H8 lines are deliberately preserved in the final saved document.**
> They are NOT stripped. Frontend renderers use them to highlight extracted
> entities inline, providing visual lineage back to the source passage.

---

## Why This Approach

| Property | Detail |
|---|---|
| **Zero extra LLM calls** | Extraction is a byproduct of generation — not a separate batch job. |
| **Zero latency overhead** | Entities land in the database as each section completes, not after the full document. |
| **High fidelity** | The model tags what it actually wrote, not a post-hoc re-read. |
| **Full traceability** | H8 lines stay in the document for visual lineage and audit. |

---

## Key Files

| File | Purpose |
|---|---|
| [`server/src/services/documentGenerationService.ts`](file:///f:/Source/Repos/adpa/server/src/services/documentGenerationService.ts) | `draftSection()` prompt construction and `generateDocument()` section-mapping loop |
| [`server/src/services/inlineEntityParserService.ts`](file:///f:/Source/Repos/adpa/server/src/services/inlineEntityParserService.ts) | `InlineEntityParserService.parseAndProcess()` — parses H8 lines and dispatches to savers |
| [`server/src/services/extraction/ExtractionRegistry.ts`](file:///f:/Source/Repos/adpa/server/src/services/extraction/ExtractionRegistry.ts) | `initializeRegistry()` — entity module registration |
| [`server/src/services/extraction/ExtractionOrchestrator.ts`](file:///f:/Source/Repos/adpa/server/src/services/extraction/ExtractionOrchestrator.ts) | `saveSingleEntityType()` — transactional persistence per entity type |
| [`server/src/__tests__/services/inlineEntityParserService.test.ts`](file:///f:/Source/Repos/adpa/server/src/__tests__/services/inlineEntityParserService.test.ts) | Unit tests for the parser |

---

## The H8 Tag Format

```
######## entity_type: {"attribute": "value", ...}
```

Each H8 line encodes exactly **one** entity object. Multiple entities of the
same type require multiple lines. The `entity_type` token must match a key
registered in the `ExtractionRegistry`.

### Examples

```
######## stakeholders: {"name": "Project Sponsor", "role": "Funder", "influence_level": "high"}
######## stakeholders: {"name": "IT Lead", "role": "Technical Authority", "influence_level": "medium"}
######## risks: {"title": "Budget overrun", "category": "budget", "probability": "medium", "impact": "high"}
######## milestones: {"name": "Phase 1 Go-Live", "description": "Core platform live", "due_date": "2025-Q3", "status": "pending"}
```

### Parsing rules

- Lines are identified by the `########` prefix (8 `#` characters followed by a space).
- Everything after the first `:` (and its trailing space) is parsed as JSON.
- Lines that fail JSON parsing are silently skipped; the section text is never
  corrupted.
- The parser runs **after** section drafting but **before** document assembly.

---

## Supported Entity Types and Their Schemas

### `stakeholders`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | Display name |
| `role` | string | ✅ | Project role or title |
| `interest_level` | `high` \| `medium` \| `low` | ✅ | |
| `influence_level` | `high` \| `medium` \| `low` | ✅ | |
| `expectations` | string | ❌ | What the stakeholder expects |
| `concerns` | string | ❌ | Known concerns or risks |

### `risks`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | ✅ | Short risk title |
| `description` | string | ✅ | Full description |
| `category` | `technical` \| `schedule` \| `budget` \| `resource` \| `external` \| `quality` | ✅ | |
| `probability` | `high` \| `medium` \| `low` | ✅ | |
| `impact` | `high` \| `medium` \| `low` | ✅ | |
| `mitigation_strategy` | string | ❌ | |
| `contingency_plan` | string | ❌ | |

### `milestones`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | Milestone name |
| `description` | string | ✅ | What it represents |
| `due_date` | string | ✅ | `YYYY-MM-DD` or `Quarter/Year` (e.g. `2025-Q3`) |
| `status` | `pending` \| `in_progress` \| `completed` \| `delayed` | ✅ | |

### `budget_baseline`

| Field | Type | Required | Notes |
|---|---|---|---|
| `total_budget` | number | ✅ | Raw numeric value |
| `currency` | string | ❌ | ISO 4217 code (e.g. `USD`) |
| `categories` | object | ❌ | Free-form breakdown object |

### `cost_estimates`

| Field | Type | Required | Notes |
|---|---|---|---|
| `item_name` | string | ✅ | Cost line item |
| `estimated_cost` | number | ✅ | Raw numeric value |
| `basis_of_estimate` | string | ❌ | How the estimate was derived |
| `confidence_level` | string | ❌ | e.g. `high`, `medium`, `low` |

### `deliverables`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | Deliverable name |
| `description` | string | ✅ | What is delivered |
| `type` | `document` \| `software` \| `hardware` \| `service` \| `report` \| `other` | ✅ | |
| `status` | `planned` \| `in_progress` \| `completed` \| `delayed` \| `cancelled` | ✅ | |
| `due_date` | string | ❌ | `YYYY-MM-DD` or quarter |
| `owner` | string | ❌ | Person or team responsible |

---

## Adding a New Entity Type

Follow this checklist exactly. Do **not** skip steps.

### Step 1 — Create the entity module

Create four files under `server/src/services/extraction/entities/<entity_type>/`:

```
server/src/services/extraction/entities/<entity_type>/
  types.ts        ← TypeScript interface for the entity
  extract<X>.ts   ← validation / normalization logic
  save<X>.ts      ← DB persistence using the pool/transaction
  index.ts        ← re-exports + EntityModule object
```

**`types.ts`** — define the interface:

```typescript
export interface MyEntity {
  // required fields
  name: string;
  // optional fields
  description?: string;
}
```

**`extract<X>.ts`** — validate raw JSON from the parser:

```typescript
import { MyEntity } from './types';

export function extractMyEntities(raw: unknown[]): MyEntity[] {
  return raw.filter((item): item is MyEntity =>
    typeof item === 'object' && item !== null && 'name' in item
  );
}
```

**`save<X>.ts`** — persist to the database:

```typescript
import { PoolClient } from 'pg';
import { MyEntity } from './types';

export async function saveMyEntities(
  client: PoolClient,
  documentId: string,
  entities: MyEntity[]
): Promise<void> {
  for (const entity of entities) {
    await client.query(
      `INSERT INTO my_entities (document_id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [documentId, entity.name, entity.description ?? null]
    );
  }
}
```

**`index.ts`** — assemble the module:

```typescript
import { EntityModule } from '../../ExtractionRegistry';
import { extractMyEntities } from './extractMyEntities';
import { saveMyEntities } from './saveMyEntities';

export const myEntityModule: EntityModule = {
  entityType: 'my_entities',   // must match the H8 tag token
  extract: extractMyEntities,
  save: saveMyEntities,
};
```

### Step 2 — Register in ExtractionRegistry

In `initializeRegistry()` inside `ExtractionRegistry.ts`:

```typescript
import { myEntityModule } from './entities/my_entities';

export function initializeRegistry(): void {
  // ... existing registrations ...
  registry.register(myEntityModule);
}
```

### Step 3 — Add to the draftSection() prompt

In `documentGenerationService.ts`, inside `draftSection()`, append the new
entity type and its JSON schema to the prompt's entity-tag instruction block:

```
######## my_entities: {"name": "...", "description": "..."}
```

Include at least one well-formed example so the model learns the expected shape.

### Step 4 — Write unit tests

Add cases to `inlineEntityParserService.test.ts` covering:

- Valid H8 line → parsed and saved correctly
- Missing required field → entity is skipped gracefully
- Malformed JSON → parser recovers, section text unchanged

---

## Critical Rules

> [!IMPORTANT]
> These rules must never be violated, even under time pressure.

1. **Never strip H8 lines from the saved document content.**
   They are stored for frontend visual lineage. Removing them breaks the UI
   highlighting feature.

2. **Never call `saveSingleEntityType()` outside a transaction context.**
   The orchestrator manages `BEGIN / COMMIT / ROLLBACK` internally. Calling it
   bare will leave the connection in an inconsistent state.

3. **If the parser fails for a section, it falls back silently.**
   The original markdown is preserved and document generation continues.
   Entity extraction is **non-blocking** — a saver failure must never abort
   the overall generation job.

4. **The inline parser runs AFTER section drafting but BEFORE document assembly.**
   Do not reorder this pipeline. Entities must be persisted per-section so
   partial results survive if generation is interrupted.

5. **One JSON object per H8 line.**
   Do not emit arrays or multi-line JSON inside a single H8 line. The parser
   processes lines individually.

6. **Retain H8 tags in the 100% full document.** The final 100% complete document (`documentText100` or the main stored document text) must retain all `########` tags verbatim in their original spots. Never strip or truncate them.
7. **Scrub H8 tags in the context summaries.** Multi-scale recursive context summaries (`summary80`, `summary60`, `summary40`, `summary20`) must never contain `########` tags. They must be completely scrubbed of H8 lines to save tokens.
8. **Preserve entity terms in summaries.** In all summaries, although the H8 prefix tags are scrubbed, the actual entity names, milestones, and framework terms must be retained in the text narrative to ensure semantic connectivity.

---

## Multi-Scale Context Compaction (Summaries)

During final compilation (Phase 6), the generation service produces the full document along with four recursive context compression tiers. These summaries must follow strict density and formatting rules:

| Density Level | Target Field | Key Rules |
|---|---|---|
| **100% Full Document** | `documentText100` | MUST retain every single H8 Entity Tag verbatim. No truncation or flimsiness. |
| **80% Summary** | `summary80` | Eliminate narrative fluff, preserve core metrics, **omit H8 tags** (but keep entity names). |
| **60% Summary** | `summary60` | Tighter compression, preserve critical entities, **omit H8 tags**. |
| **40% Summary** | `summary40` | Focus on structural boundaries, **omit H8 tags**. |
| **20% Summary** | `summary20` | High-density core capsule optimized for token-starved injections, **omit H8 tags**. |

### Principles of Context Compression:
- **Fluff Elimination:** Remove narrative filler, conversational transitions, and introductory/concluding remarks.
- **Density Increase:** Every sentence must pack critical technical info, milestones, budget figures, and stakeholder roles.
- **Traceability:** Keep the H8 tags intact in the 100% document; they are the sole anchors for frontend line highlight mapping.

---

## Debugging Missing Entities

If entities are absent from the database after generation:

1. **Check the raw section content** — confirm the LLM actually emitted H8
   lines. If not, the prompt in `draftSection()` may be missing or malformed.

2. **Check the entity type token** — the token after `########` must exactly
   match a key registered in the `ExtractionRegistry`. Case and underscore
   differences will cause silent drops.

3. **Check JSON validity** — malformed JSON is silently skipped. Enable debug
   logging in `InlineEntityParserService` to surface parse errors.

4. **Check the saver** — run the unit tests for the specific entity module.
   A constraint violation in the DB insert can silently swallow entities if
   the error is caught at the orchestrator level.

5. **Check transaction isolation** — if `saveSingleEntityType()` was called
   outside a transaction, the `ROLLBACK` on a later error may have undone
   earlier successful inserts.

---

## Data Flow Summary

```
draftSection() prompt
       │
       ▼
   LLM drafts section text
   + appends H8 entity tags
       │
       ▼
InlineEntityParserService.parseAndProcess()
   ├─ splits lines on ########
   ├─ groups by entity_type
   └─ for each type → ExtractionOrchestrator.saveSingleEntityType()
             │
             ▼
         DB transaction
         (BEGIN / INSERT / COMMIT)
       │
       ▼
Section text (H8 lines preserved) stored in document
       │
       ▼
generateDocument() assembles full document
       │
       ▼
Frontend renders H8 lines as entity highlights
```
