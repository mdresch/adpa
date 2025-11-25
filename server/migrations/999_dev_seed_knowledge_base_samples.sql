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
-- This insertion is schema-aware. The knowledge_base_entries table evolved between migrations
-- (some schemas use `context/approach/results` while newer ones use JSONB fields such as
-- `baseline_approach` / `improved_approach` / `replication_guide` and require a non-null `created_by`).
-- To keep this migration safe across environments we check available columns and adapt.
DO $$
DECLARE
  has_context_col BOOLEAN := FALSE;
  has_baseline_approach_col BOOLEAN := FALSE;
  has_created_by_col BOOLEAN := FALSE;
  users_exist BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_base_entries' AND column_name = 'context'
  ) INTO has_context_col;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_base_entries' AND column_name = 'baseline_approach'
  ) INTO has_baseline_approach_col;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_base_entries' AND column_name = 'created_by'
  ) INTO has_created_by_col;

  -- Check if there's at least one user to use for the created_by field when required
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    SELECT EXISTS(SELECT 1 FROM users) INTO users_exist;
  END IF;

  IF has_context_col THEN
    -- Old/legacy schema path (uses plain text columns)
    INSERT INTO knowledge_base_entries (
      id, entry_type, category, title, description, context, approach, results, source_project_id, business_value_score,
      replicable, replication_difficulty, replication_instructions, tags, keywords, ai_generated, ai_confidence, created_by, created_at, updated_at
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

  ELSIF has_baseline_approach_col THEN
    -- Newer schema path (313-style) where content and replication guides are JSONB and
    -- 'project_id' + 'created_by' constraints may be enforced. We'll only insert when
    -- the environment contains at least one user to reference for created_by (a dev env typically does).
    IF NOT users_exist THEN
      RAISE NOTICE 'Skipping 999 KB entry seed: no users present to satisfy created_by NOT NULL constraint';
    ELSE
      INSERT INTO knowledge_base_entries (
        id, project_id, entry_type, category, title, description, baseline_approach, improved_approach,
        value_metrics, replication_guide, applicable_contexts, tags, keywords, ai_confidence, created_by, created_at, updated_at
      )
      VALUES (
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'lessons_learned',
        'other',
        'Keep meetings focused and time-boxed',
        'A developer-friendly lesson to keep meetings short; used as a local sample record',
        jsonb_build_object('description', 'Limit meeting duration, set an agenda and action items'),
        jsonb_build_object('description', 'Limit meeting duration, set an agenda and action items'),
        jsonb_build_object('time_saved', 0.25),
        jsonb_build_object('steps', ARRAY['Set agenda','Assign an owner','Capture actions']),
        jsonb_build_array('team','ceremony'),
        ARRAY['meetings','process'],
        ARRAY['meeting','timebox','agile'],
        0.8,
        (SELECT id FROM users LIMIT 1),
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;

  ELSE
    -- If we don't recognize the schema shape, insert a minimal, safe record using only
    -- common columns (id, entry_type, title, description, tags, keywords) if those exist.
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='knowledge_base_entries' AND column_name='title') THEN
      INSERT INTO knowledge_base_entries (
        id, entry_type, category, title, description, tags, keywords, created_at, updated_at
      ) VALUES (
        '22222222-2222-2222-2222-222222222222',
        'lesson_learned',
        'best_practice',
        'Keep meetings focused and time-boxed',
        'A developer-friendly lesson to keep meetings short; used as a local sample record',
        ARRAY['meetings','process'],
        ARRAY['meeting','timebox','agile'],
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    ELSE
      RAISE NOTICE 'Skipping 999 KB entry seed: knowledge_base_entries table does not contain expected columns for safe insert';
    END IF;
  END IF;
END$$;

-- 3) Insert a sample recommendation record for the dev project (if not exists)
-- 3) Insert a sample recommendation record for the dev project (if not exists)
-- Only insert a recommendation if the recommendations table exists and the referenced KB entry was inserted.
DO $$
DECLARE
  recs_table_exists BOOLEAN := FALSE;
  kb_entry_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'knowledge_base_recommendations') INTO recs_table_exists;
  IF recs_table_exists THEN
    SELECT EXISTS(SELECT 1 FROM knowledge_base_entries WHERE id = '22222222-2222-2222-2222-222222222222') INTO kb_entry_exists;
    IF kb_entry_exists THEN
      -- Use dynamic SQL here so this DO block parses even when the table is absent
      EXECUTE 'INSERT INTO knowledge_base_recommendations (
        id, knowledge_entry_id, project_id, relevance_score, reasoning, expected_impact, ai_model, ai_confidence, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (knowledge_entry_id, project_id) DO NOTHING'
      USING
        '33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        0.9,
        'Dev sample - created to demonstrate Lessons UI locally',
        'Expected to save developer time spent in meetings',
        'dev-seed',
        0.8,
        NOW();
    ELSE
      RAISE NOTICE 'Skipping recommendation: knowledge base entry not present (seed likely skipped)';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping recommendation: knowledge_base_recommendations table not present in this schema';
  END IF;
END$$;

COMMIT;

-- DOWN (cleanup) -- reverse the seed (delete only the deterministic IDs created by this migration)
-- Note: run the DOWN section only when reverting this migration

-- DOWN

BEGIN;

-- Only run DELETEs where the target tables exist in the current schema. This keeps DOWN safe
-- to run across multiple schema variants.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'knowledge_base_recommendations') THEN
    EXECUTE 'DELETE FROM knowledge_base_recommendations WHERE id = $1 OR (knowledge_entry_id = $2 AND project_id = $3)'
    USING '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111';
  END IF;
END$$;

IF EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'knowledge_base_entries') THEN
  DELETE FROM knowledge_base_entries WHERE id = '22222222-2222-2222-2222-222222222222';
END IF;

IF EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'projects') THEN
  DELETE FROM projects WHERE id = '11111111-1111-1111-1111-111111111111';
END IF;

COMMIT;
