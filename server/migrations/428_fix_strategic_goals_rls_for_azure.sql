-- Azure Postgres migration: strategic_goals/project_strategic_goals/strategic_key_results
-- RLS policies referenced auth.uid()/auth.role(), which only exist behind Supabase's
-- PostgREST gateway. Nothing in this app sets those GUCs on direct pg.Pool connections
-- (server/src/database/connection.ts) -- the only code path touching these tables is
-- app/api/portfolio/goals/route.ts, which already enforces admin-only writes in application
-- code before querying. On Azure these auth.* functions don't exist at all, so the policies
-- would fail outright rather than silently no-op. Replaced with USING (true), matching the
-- convention already used for app-layer-enforced tables elsewhere in supabase/migrations/.
--
-- These tables themselves (SC-84) were only ever created via the separate
-- Supabase-CLI-tracked supabase/migrations/20260507133000_strategic_goals.sql,
-- which run-migrations.ts never applies (it only reads server/migrations/).
-- Ported the table/index/trigger/view creation here so it actually runs; the
-- auth.role()/auth.uid()-based RLS policies from that file are intentionally
-- NOT ported since this migration replaces them with the USING (true) policies
-- below anyway (and CREATE POLICY referencing auth.* would fail outright here).

BEGIN;

-- 1) Strategic goals
CREATE TABLE IF NOT EXISTS public.strategic_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  description text,
  category varchar(100),
  target_date date,
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status varchar(50) DEFAULT 'active',
  priority integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategic_goals_status_valid CHECK (status IN ('active', 'achieved', 'deferred', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_strategic_goals_status ON public.strategic_goals (status);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_priority ON public.strategic_goals (priority DESC);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_category ON public.strategic_goals (category);

-- 2) Project <-> goal linkage
CREATE TABLE IF NOT EXISTS public.project_strategic_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.strategic_goals(id) ON DELETE CASCADE,
  contribution_level varchar(50) DEFAULT 'medium',
  alignment_score numeric(3,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, goal_id),
  CONSTRAINT project_strategic_goals_contribution_valid CHECK (contribution_level IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT project_strategic_goals_alignment_range CHECK (alignment_score IS NULL OR (alignment_score >= 0 AND alignment_score <= 1))
);

CREATE INDEX IF NOT EXISTS idx_project_strategic_goals_project ON public.project_strategic_goals (project_id);
CREATE INDEX IF NOT EXISTS idx_project_strategic_goals_goal ON public.project_strategic_goals (goal_id);
CREATE INDEX IF NOT EXISTS idx_project_strategic_goals_contribution ON public.project_strategic_goals (contribution_level);

-- 3) Key results (OKR support)
CREATE TABLE IF NOT EXISTS public.strategic_key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.strategic_goals(id) ON DELETE CASCADE,
  description text NOT NULL,
  target_value numeric(12,2),
  current_value numeric(12,2) DEFAULT 0,
  unit varchar(50),
  due_date date,
  status varchar(50) DEFAULT 'not-started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategic_key_results_status_valid CHECK (status IN ('not-started', 'on-track', 'at-risk', 'achieved'))
);

CREATE INDEX IF NOT EXISTS idx_strategic_key_results_goal ON public.strategic_key_results (goal_id);
CREATE INDEX IF NOT EXISTS idx_strategic_key_results_status ON public.strategic_key_results (status);

-- 4) updated_at triggers (reuse existing helper if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_strategic_goals_updated_at') THEN
      EXECUTE 'CREATE TRIGGER update_strategic_goals_updated_at BEFORE UPDATE ON public.strategic_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_strategic_goals_updated_at') THEN
      EXECUTE 'CREATE TRIGGER update_project_strategic_goals_updated_at BEFORE UPDATE ON public.project_strategic_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_strategic_key_results_updated_at') THEN
      EXECUTE 'CREATE TRIGGER update_strategic_key_results_updated_at BEFORE UPDATE ON public.strategic_key_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    END IF;
  END IF;
END $$;

-- 5) Analytics views
CREATE OR REPLACE VIEW public.project_strategic_alignment
WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  COUNT(DISTINCT psg.goal_id) AS goals_supported,
  AVG(psg.alignment_score) AS avg_alignment_score,
  SUM(CASE WHEN psg.contribution_level = 'critical' THEN 1 ELSE 0 END) AS critical_goals,
  ARRAY_AGG(DISTINCT sg.category) AS goal_categories
FROM public.projects p
LEFT JOIN public.project_strategic_goals psg ON p.id = psg.project_id
LEFT JOIN public.strategic_goals sg ON psg.goal_id = sg.id AND sg.status = 'active'
GROUP BY p.id, p.name;

CREATE OR REPLACE VIEW public.strategic_goals_progress
WITH (security_invoker = true) AS
SELECT
  sg.id AS goal_id,
  sg.title,
  sg.category,
  sg.status,
  COUNT(skr.id) AS total_key_results,
  SUM(CASE WHEN skr.status = 'achieved' THEN 1 ELSE 0 END) AS achieved_key_results,
  AVG(
    CASE
      WHEN skr.target_value IS NOT NULL AND skr.target_value > 0 THEN (skr.current_value / skr.target_value) * 100
      ELSE 0
    END
  ) AS avg_completion_percentage,
  COUNT(DISTINCT psg.project_id) AS supporting_projects
FROM public.strategic_goals sg
LEFT JOIN public.strategic_key_results skr ON sg.id = skr.goal_id
LEFT JOIN public.project_strategic_goals psg ON sg.id = psg.goal_id
GROUP BY sg.id, sg.title, sg.category, sg.status;

ALTER TABLE public.strategic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_strategic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_key_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strategic_goals_select ON public.strategic_goals;
DROP POLICY IF EXISTS strategic_goals_write_admin ON public.strategic_goals;
DROP POLICY IF EXISTS project_strategic_goals_select ON public.project_strategic_goals;
DROP POLICY IF EXISTS project_strategic_goals_write_admin ON public.project_strategic_goals;
DROP POLICY IF EXISTS strategic_key_results_select ON public.strategic_key_results;
DROP POLICY IF EXISTS strategic_key_results_write_admin ON public.strategic_key_results;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'strategic_goals' AND policyname = 'strategic_goals_all'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY strategic_goals_all ON public.strategic_goals
      FOR ALL USING (true) WITH CHECK (true)
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_strategic_goals' AND policyname = 'project_strategic_goals_all'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY project_strategic_goals_all ON public.project_strategic_goals
      FOR ALL USING (true) WITH CHECK (true)
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'strategic_key_results' AND policyname = 'strategic_key_results_all'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY strategic_key_results_all ON public.strategic_key_results
      FOR ALL USING (true) WITH CHECK (true)
    $pol$;
  END IF;
END $$;

COMMIT;
