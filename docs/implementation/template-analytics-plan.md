# Template & Document Purpose Aggregation - Implementation Plan

**Goal**: Enable ADPA to infer and store the **primary purpose** of both documents and templates based on their **extracted entities**, and to use that information for coverage analysis and baseline readiness.

This file is a checkpoint so you can resume work on any machine.

---

## 1. Current State (What We Already Have)

- **Documents**
  - Table: `documents`
  - Fields (relevant):
    - `id`
    - `template_id` (nullable – some documents not based on a template)
  - Extraction pipeline already populates per-document entities (via existing extraction service).

- **Entities & Domains**
  - Extraction service already outputs per-entity-type arrays (e.g., `risks`, `milestones`, `requirements`, etc.).
  - Domain mappings defined in code:
    - `DOMAIN_ENTITY_MAP` in `server/src/services/queueService.ts`
    - `DOMAIN_METADATA` + weight metadata in `types/pmbok.ts`
    - `ENTITY_DOMAIN_WEIGHTS` and `ENTITY_PHASE_WEIGHTS` in `types/entity-domain-weights.ts`.
  - Frontend now uses **weighted allocation** for:
    - Performance Domains (Tier 1)
    - Knowledge Domains (Tier 2)
    - Project Phases (temporal)

This means we already know **how much each entity contributes to each domain/phase**; we now want to **persist that knowledge at document/template level**.

---

## 2. Target Data Model

### 2.1 Document-Level Purpose

Extend `documents` table to store inferred purpose:

- **New columns** (SQL migration):
  - `inferred_primary_domain` (TEXT, nullable)
    - Holds the dominant **knowledge/performance domain** for this document.
  - `inferred_secondary_domains` (JSONB, default `'[]'::jsonb`)
    - Holds additional domains with notable contribution (e.g. > 20%).

These will be computed from the **entity counts + weight matrix** after extraction.

### 2.2 Template-Level Entity Profile

Create a new table `template_entity_profile` to aggregate behavior across documents using each template:

```sql
CREATE TABLE template_entity_profile (
  template_id UUID PRIMARY KEY REFERENCES templates(id),

  -- Aggregated usage
  total_documents     INTEGER NOT NULL DEFAULT 0,
  total_entities      INTEGER NOT NULL DEFAULT 0,

  -- Average per-entity production across documents
  avg_entity_counts   JSONB   NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {"risks": 18.2, "milestones": 5.1}

  -- Domain coverage (normalized 0..1) for each domain type
  knowledge_domain_coverage   JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance_domain_coverage JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Inferred primary purpose
  primary_knowledge_domain    TEXT,
  secondary_knowledge_domains JSONB NOT NULL DEFAULT '[]'::jsonb,

  primary_performance_domain  TEXT,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Purpose**:
- Capture how a template **typically behaves** in terms of entity and domain coverage.
- Allow us to say: *"This template’s primary purpose is Finance, secondary is Governance."*

---

## 3. Aggregation Logic (SQL + Service)

### 3.1 Document Entity Counts View

We need a consistent way to read **per-document entity counts**.

Create a **view** or **materialized view** (depending on performance needs), for example:

```sql
CREATE VIEW document_entity_counts AS
SELECT
  d.id          AS document_id,
  d.template_id AS template_id,

  -- Example: if you have a JSONB column `entity_counts`
  COALESCE(
    (d.entity_counts->>'total')::INTEGER,
    0
  ) AS total_entities,

  d.entity_counts AS entity_counts
FROM documents d;
```

> NOTE: Adapt this to your real schema:
> - If you store entities in separate tables (e.g., `risks`, `milestones`), you’ll instead `JOIN` and `COUNT(*)` per type, then build `entity_counts` JSONB with `jsonb_build_object`.

### 3.2 Template-Level Aggregation Query

Goal: For each `template_id`, aggregate `entity_counts` from all documents using that template.

High-level SQL pattern (to be refined against the real schema):

```sql
SELECT
  dec.template_id,
  COUNT(*) AS total_documents,
  SUM(dec.total_entities) AS total_entities,

  -- Aggregate per-entity averages
  (
    SELECT jsonb_object_agg(key, avg((value)::INTEGER))
    FROM (
      SELECT key, (value)::INTEGER
      FROM document_entity_counts d2,
           jsonb_each_text(d2.entity_counts)
      WHERE d2.template_id = dec.template_id
    ) s
  ) AS avg_entity_counts
FROM document_entity_counts dec
WHERE dec.template_id IS NOT NULL
GROUP BY dec.template_id;
```

This gives, for each template:
- `total_documents`
- `total_entities`
- `avg_entity_counts` JSONB

Domain coverage (`knowledge_domain_coverage`, `performance_domain_coverage`) will be computed in the **TypeScript service layer** using the existing **weight matrices** (same logic as in the UI).

---

## 4. Service Layer: `TemplateAnalyticsService`

Create a new service file: `server/src/services/templateAnalyticsService.ts`.

### 4.1 Responsibilities

- `updateTemplateEntityProfile(templateId?: string): Promise<void>`
  - If `templateId` is provided:
    - Recompute and upsert profile for **one template**.
  - If not provided:
    - Recompute for **all templates** (admin/maintenance use).

### 4.2 Implementation Sketch

```ts
// server/src/services/templateAnalyticsService.ts
import { pool } from '@/database/connection';
import { DOMAIN_METADATA } from '@/types/pmbok';
import { ENTITY_DOMAIN_WEIGHTS } from '@/types/entity-domain-weights';

export class TemplateAnalyticsService {
  static async updateTemplateEntityProfile(templateId?: string): Promise<void> {
    const result = await pool.query(
      `
      SELECT template_id, total_documents, total_entities, avg_entity_counts
      FROM aggregated_template_entity_view
      ${templateId ? 'WHERE template_id = $1' : ''}
      `,
      templateId ? [templateId] : []
    );

    for (const row of result.rows) {
      const avgEntityCounts = row.avg_entity_counts as Record<string, number>;

      const knowledgeCoverage: Record<string, number> = {};
      const performanceCoverage: Record<string, number> = {};

      for (const [entityType, avgCount] of Object.entries(avgEntityCounts)) {
        if (avgCount <= 0) continue;

        const weights = ENTITY_DOMAIN_WEIGHTS[entityType] || [];

        for (const w of weights) {
          const meta = DOMAIN_METADATA[w.domain];
          const tier = meta.tier; // 'knowledge' | 'performance'

          if (tier === 'knowledge') {
            knowledgeCoverage[w.domain] =
              (knowledgeCoverage[w.domain] || 0) + avgCount * w.weight;
          } else {
            performanceCoverage[w.domain] =
              (performanceCoverage[w.domain] || 0) + avgCount * w.weight;
          }
        }
      }

      const normalize = (coverage: Record<string, number>) => {
        const total = Object.values(coverage).reduce((s, v) => s + v, 0) || 1;
        const normalized: Record<string, number> = {};
        for (const [k, v] of Object.entries(coverage)) {
          normalized[k] = v / total;
        }
        return normalized;
      };

      const normalizedKnowledge = normalize(knowledgeCoverage);
      const normalizedPerformance = normalize(performanceCoverage);

      const findPrimary = (coverage: Record<string, number>): string | null => {
        let best: string | null = null;
        let bestVal = 0;
        for (const [domain, val] of Object.entries(coverage)) {
          if (val > bestVal) {
            bestVal = val;
            best = domain;
          }
        }
        return best;
      };

      const primaryKnowledge = findPrimary(normalizedKnowledge);
      const primaryPerformance = findPrimary(normalizedPerformance);

      await pool.query(
        `
        INSERT INTO template_entity_profile (
          template_id,
          total_documents,
          total_entities,
          avg_entity_counts,
          knowledge_domain_coverage,
          performance_domain_coverage,
          primary_knowledge_domain,
          primary_performance_domain,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        ON CONFLICT (template_id) DO UPDATE SET
          total_documents = EXCLUDED.total_documents,
          total_entities = EXCLUDED.total_entities,
          avg_entity_counts = EXCLUDED.avg_entity_counts,
          knowledge_domain_coverage = EXCLUDED.knowledge_domain_coverage,
          performance_domain_coverage = EXCLUDED.performance_domain_coverage,
          primary_knowledge_domain = EXCLUDED.primary_knowledge_domain,
          primary_performance_domain = EXCLUDED.primary_performance_domain,
          updated_at = NOW()
        `,
        [
          row.template_id,
          row.total_documents,
          row.total_entities,
          row.avg_entity_counts,
          normalizedKnowledge,
          normalizedPerformance,
          primaryKnowledge,
          primaryPerformance,
        ]
      );
    }
  }
}
```

> This is a sketch; imports and types need to be adjusted to the actual codebase.

---

## 5. Document-Level Purpose Assignment

After extraction, we want each **document** to have a primary purpose too.

### 5.1 Where to Hook

In `projectDataExtractionService` or whichever worker/job:
- Runs extraction
- Saves entities to DB

### 5.2 Logic Sketch

```ts
async function assignDocumentPurpose(
  documentId: string,
  entityCounts: Record<string, number>
): Promise<void> {
  const knowledgeCoverage: Record<string, number> = {};
  const performanceCoverage: Record<string, number> = {};

  for (const [entityType, count] of Object.entries(entityCounts)) {
    if (count <= 0) continue;

    const weights = ENTITY_DOMAIN_WEIGHTS[entityType] || [];

    for (const w of weights) {
      const meta = DOMAIN_METADATA[w.domain];
      const tier = meta.tier; // 'knowledge' | 'performance'

      if (tier === 'knowledge') {
        knowledgeCoverage[w.domain] =
          (knowledgeCoverage[w.domain] || 0) + count * w.weight;
      } else {
        performanceCoverage[w.domain] =
          (performanceCoverage[w.domain] || 0) + count * w.weight;
      }
    }
  }

  const normalize = (coverage: Record<string, number>) => {
    const total = Object.values(coverage).reduce((s, v) => s + v, 0) || 1;
    const normalized: Record<string, number> = {};
    for (const [k, v] of Object.entries(coverage)) {
      normalized[k] = v / total;
    }
    return normalized;
  };

  const normKnowledge = normalize(knowledgeCoverage);

  const findPrimary = (coverage: Record<string, number>): string | null => {
    let best: string | null = null;
    let bestVal = 0;
    for (const [domain, val] of Object.entries(coverage)) {
      if (val > bestVal) {
        bestVal = val;
        best = domain;
      }
    }
    return best;
  };

  const primaryKnowledge = findPrimary(normKnowledge);

  const secondaryKnowledge = Object.entries(normKnowledge)
    .filter(([domain, val]) => domain !== primaryKnowledge && val >= 0.2)
    .map(([domain]) => domain);

  await pool.query(
    `
    UPDATE documents
    SET
      inferred_primary_domain = $1,
      inferred_secondary_domains = $2
    WHERE id = $3
    `,
    [primaryKnowledge, JSON.stringify(secondaryKnowledge), documentId]
  );
}
```

---

## 6. Wiring Everything Together

### 6.1 After Extraction Flow

When a document’s entities are extracted and stored:

1. **Compute document purpose**:
   - Call `assignDocumentPurpose(documentId, entityCounts)`.

2. **Update template profile** (if document has `template_id`):
   - Call `TemplateAnalyticsService.updateTemplateEntityProfile(templateId)`.

This ensures:
- Documents always have an up-to-date primary purpose.
- Templates learn over time what they are *really* used for.

### 6.2 Admin Rebuild Endpoint

Add a route, e.g. `server/src/routes/adminTemplateRoutes.ts`:

```ts
router.post(
  '/templates/rebuild-entity-profiles',
  authenticateAdmin,
  async (req, res) => {
    await TemplateAnalyticsService.updateTemplateEntityProfile(); // all templates
    res.json({ success: true });
  }
);
```

---

## 7. Future Use: Coverage & Baseline

Once this is in place, you can:

- See **which templates**:
  - Are primarily Governance, Scope, Finance, etc.
  - Produce strong entity coverage vs weak.

- For a **project baseline readiness check**:
  - Aggregate entities from all documents.
  - Compare domain/phase coverage vs thresholds.
  - Recommend which templates/documents are still needed.

- For **non-standard docs**:
  - Use document-level `inferred_primary_domain` to treat them like templates by purpose.

---

## 8. How to Resume Later

When you continue on another machine, next steps are:

1. **Create migrations** for:
   - `template_entity_profile`
   - `documents.inferred_primary_domain` & `.inferred_secondary_domains`

2. **Implement `document_entity_counts` view**
   - Adjust to actual schema for entity storage.

3. **Implement `TemplateAnalyticsService.updateTemplateEntityProfile`**
   - Use real SQL aggregation.
   - Use real `ENTITY_DOMAIN_WEIGHTS` + `DOMAIN_METADATA`.

4. **Hook `assignDocumentPurpose` into extraction pipeline**
   - After entities are saved.

5. **(Optional) Add admin endpoint** to rebuild all `template_entity_profile` rows.

This plan gives you a clear, resume-able path to complete template/document purpose aggregation.

{
  "cells": [],
  "metadata": {
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 2
}