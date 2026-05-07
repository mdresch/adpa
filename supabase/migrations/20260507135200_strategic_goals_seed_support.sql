-- SC-84 follow-up: seed support / idempotency
-- Adds uniqueness needed for upsert-based seeding:
-- - strategic_goals.title unique
-- - strategic_key_results(goal_id, description) unique

BEGIN;

-- Ensure goal titles are unique (supports ON CONFLICT (title))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'strategic_goals_title_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.strategic_goals ADD CONSTRAINT strategic_goals_title_key UNIQUE (title);';
  END IF;
END $$;

-- Ensure key results are unique per goal (supports ON CONFLICT (goal_id, description))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'strategic_key_results_goal_id_description_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.strategic_key_results ADD CONSTRAINT strategic_key_results_goal_id_description_key UNIQUE (goal_id, description);';
  END IF;
END $$;

COMMIT;

