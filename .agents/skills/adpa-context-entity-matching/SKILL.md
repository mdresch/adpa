---
name: adpa-context-entity-matching
description: Use when managing context-based entity matching, scoring consistency of extracted entities, and cleaning up or retiring entities through document lifecycle events.
---

# ADPA Context Entity Matching & Consistency Scoring Engine

## Overview

The Context Entity Matching & Consistency Scoring Engine governs Loop C (Entity Lifecycle) of the ADPA framework. It replaces strict string-based entity mapping with a multi-strategy fuzzy matching pipeline, records consistency metadata, and automatically retires entities when they are no longer referenced by active documents in a project.

---

## When to Use

Use this skill when modifying or extending the following components:
- Cascading fuzzy matching algorithm (`calculateJaroWinkler` or `areEntitiesFuzzyMatch`).
- Match metadata recording (`context_match` in `entity_extractions.entity_data` JSONB).
- Entity retirement loop inside `storeEntities`.
- Document deletion hooks and cleanup routines.
- Document purpose entity counts and pmboK domain scoring.
- Frontend card components and badges (`✓ Context Reused`, `★ Core Context Candidate`).
- Collapsible `"Retired Context Entities"` panel.

---

## Core Conventions & Concepts

### 1. Typographical & Cascading Matching
Matching is performed using a cascading matching chain to minimize LLM overhead:
1. **Exact Match**: Case-insensitive direct comparison.
2. **Normalized Match**: Strip punctuation and compare lowercase alpha-numeric tokens.
3. **Substring Match**: Shorter name is fully contained in the longer name (minimum 3 characters).
4. **Token Overlap Match**: Stopwords are removed, and one name's tokens form a subset of the other's.
5. **Jaro-Winkler Typographical Match**: Jaro-Winkler distance score is $\ge 0.82$.

### 2. Matching Context
Context is retrieved based on:
- **Primary**: Entities belonging to source documents defined in the document's `generation_metadata.source_documents` array.
- **Fallback**: If no source documents are defined, context defaults to all other active entities in the same project, excluding the current document's own entities.

### 3. Occurrence-Level Consistency Wins
Each H8 inline tag that fuzzy-matches a provided context entity counts as **one consistency win** (not just the first unique mention). A stakeholder tagged 5× in one CMP yields **5 wins** — celebrating that the LLM found multiple use cases for the same context entity.

`InlineEntityParserService` returns `contextConsistencyStats` on every parse:
- `consistencyWins` — matched H8 tag count
- `totalOccurrences` — all H8 tags
- `occurrenceConsistencyScore` — wins ÷ totalOccurrences × 100
- `winsByEntity[]` — per-entity occurrence breakdown (e.g. `{ name, occurrences: 5 }`)

Persisted in `documents.generation_metadata.contextConsistencyStats` alongside weighted CUR (`contextMatchingScore`).

### 4. Match Metadata
Match details are recorded inside the JSONB block `entity_data.context_match` during insertions/updates:
```json
{
  "is_match": true,
  "score": 0.95,
  "method": "jaro_winkler",
  "matched_context_entity": {
    "id": "uuid-here",
    "name": "Steering Committee"
  }
}
```

### 5. Retirement Loop
Whenever a document is processed or soft-deleted:
- Stale references to the `documentId` are removed from `source_document_ids` inside the entities' `entity_data`.
- If an entity's references drop to 0, it transitions to `'retired'` status and its `extraction_confidence` degrades to `0`.
- Retired entities are excluded from template analytics, document purpose counts, and PMBOK domain scoring.

---

## Implementation Details

### Database Aggregation Rebuilds
When rebuilding document entity counts or domain weights, query the unified `entity_extractions` table directly rather than querying 80 separate legacy tables:
```sql
SELECT id, document_id, entity_type, entity_data 
FROM entity_extractions 
WHERE project_id = $1 AND status = 'active'
```
This single-query strategy filters out retired/deleted entities automatically and uses Javascript-side mapping for speed and cleanliness.

### Frontend Presentation
- **✓ Context Reused Badge**: Render as an emerald-green badge highlighting the matched context entity name and similarity score.
- **★ Core Context Candidate Badge**: Render as a gold/amber star badge if an entity is referenced in $\ge 2$ documents.
- **Retired Context Accordion**: Render retired entities under a collapsible panel labeled **"Retired Context Entities"** to maintain visual cleanliness.

---

## Common Mistakes & Gotchas

> [!WARNING]
> **Pre-insertion Drafts**: During document generation, empty draft records are inserted before drafting begins, meaning `generation_metadata` is initially NULL. Always check and fall back gracefully to project-wide context fetching if `generation_metadata` is missing or empty.

> [!CAUTION]
> **Cascading SQL Failures**: When query strings contain the Postgres containment operator `?`, ensure parameters are parsed correctly. Use Javascript-level filtering on loaded rows when complex JSONB queries might trigger DB driver parameter injection errors.
