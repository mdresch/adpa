-- Template & Document Purpose Aggregation
-- - Adds inferred purpose fields on documents
-- - Adds template_entity_profile aggregation table
-- - Adds helper views for document/template entity counts

-- 1) Extend documents with inferred purpose + entity_counts snapshot
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS inferred_primary_domain TEXT,
  ADD COLUMN IF NOT EXISTS inferred_secondary_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS entity_counts JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2) Template-level aggregation table
CREATE TABLE IF NOT EXISTS template_entity_profile (
  template_id UUID PRIMARY KEY REFERENCES templates(id),

  -- Aggregated usage
  total_documents     INTEGER NOT NULL DEFAULT 0,
  total_entities      INTEGER NOT NULL DEFAULT 0,

  -- Average per-entity production across documents
  -- Example: {"risks": 18.2, "milestones": 5.1}
  avg_entity_counts   JSONB   NOT NULL DEFAULT '{}'::jsonb,

  -- Domain coverage (normalized 0..1) for each domain type
  knowledge_domain_coverage   JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance_domain_coverage JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Inferred primary purpose
  primary_knowledge_domain    TEXT,
  secondary_knowledge_domains JSONB NOT NULL DEFAULT '[]'::jsonb,

  primary_performance_domain  TEXT,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Helper view: per-document entity counts (backed by documents.entity_counts)
CREATE OR REPLACE VIEW document_entity_counts AS
SELECT
  d.id          AS document_id,
  d.project_id  AS project_id,
  d.template_id AS template_id,
  COALESCE(
    (d.entity_counts ->> 'total')::INTEGER,
    0
  ) AS total_entities,
  d.entity_counts AS entity_counts
FROM documents d;

-- 4) Helper view: aggregated template entity metrics
CREATE OR REPLACE VIEW aggregated_template_entity_view AS
SELECT
  dec.template_id,
  COUNT(*) AS total_documents,
  SUM(dec.total_entities) AS total_entities,
  -- Average per-entity counts across all documents for this template
  COALESCE(
    (
      SELECT jsonb_object_agg(key, avg_value)
      FROM (
        SELECT
          key,
          AVG((value)::NUMERIC) AS avg_value
        FROM document_entity_counts d2,
             jsonb_each_text(d2.entity_counts)
        WHERE d2.template_id = dec.template_id
          AND key <> 'total'
        GROUP BY key
      ) s
    ),
    '{}'::jsonb
  ) AS avg_entity_counts
FROM document_entity_counts dec
WHERE dec.template_id IS NOT NULL
GROUP BY dec.template_id;



