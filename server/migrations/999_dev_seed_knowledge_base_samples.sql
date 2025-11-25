-- Migration: 999_dev_seed_knowledge_base_samples.sql
-- Purpose: Insert developer-friendly sample project + KB entries + recommendations for local development
-- Notes: This migration is safe to re-run (uses INSERT ... ON CONFLICT DO NOTHING)

BEGIN;

-- Create pgcrypto for gen_random_uuid when not present (safe/ idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create a stable, recognizable dev project (id is deterministic so DOWN can cleanup)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = '11111111-1111-1111-1111-111111111111') THEN
    INSERT INTO projects (id, name, description, framework, status, priority, owner_id, created_by, created_at, updated_at)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      'Dev Sample Project',
      'Local developer sample project created by migration 999_dev_seed_knowledge_base_samples.sql',
      'agile',
      'green',
      'low',
      NULL,
      NULL,
      NOW(),
      NOW()
    );
  END IF;
END$$;

-- 2) Insert a sample knowledge base entry (if not exists)
INSERT INTO knowledge_base_entries (
  id, entry_type, category, title, description, context, approach, results, source_project_id, business_value_score,
  replicable, replication_difficulty, replicated_instructions, tags, keywords, ai_generated, ai_confidence, created_by, created_at, updated_at
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'lesson_learned',
  'best_practice',
  'Keep meetings focused and time-boxed',
  'A developer-friendly lesson to keep meetings short; used as a local sample record',
  'Applies to team ceremonies and ad-hoc syncs',
  'Limit meeting duration, set an agenda and action items',
  'Reduced meeting time and clearer outcomes',
  '11111111-1111-1111-1111-111111111111',
  0.75,
  TRUE,
  'easy',
  'Short checklist: agenda, owner, actions',
  ARRAY['meetings','process'],
  ARRAY['meeting','timebox','agile'],
  TRUE,
  0.8,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3) Insert a sample recommendation record for the dev project (if not exists)
INSERT INTO knowledge_base_recommendations (
  id, knowledge_entry_id, project_id, relevance_score, reasoning, expected_impact, ai_model, ai_confidence, created_at
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  0.9,
  'Dev sample - created to demonstrate Lessons UI locally',
  'Expected to save developer time spent in meetings',
  'dev-seed',
  0.8,
  NOW()
)
ON CONFLICT (knowledge_entry_id, project_id) DO NOTHING;

COMMIT;

-- DOWN (cleanup) -- reverse the seed (delete only the deterministic IDs created by this migration)
-- Note: run the DOWN section only when reverting this migration

-- DOWN

BEGIN;

DELETE FROM knowledge_base_recommendations WHERE id = '33333333-3333-3333-3333-333333333333' OR (knowledge_entry_id = '22222222-2222-2222-2222-222222222222' AND project_id = '11111111-1111-1111-1111-111111111111');

DELETE FROM knowledge_base_entries WHERE id = '22222222-2222-2222-2222-222222222222';

DELETE FROM projects WHERE id = '11111111-1111-1111-1111-111111111111';

COMMIT;
