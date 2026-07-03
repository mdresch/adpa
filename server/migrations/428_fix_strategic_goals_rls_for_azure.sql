-- Azure Postgres migration: strategic_goals/project_strategic_goals/strategic_key_results
-- RLS policies referenced auth.uid()/auth.role(), which only exist behind Supabase's
-- PostgREST gateway. Nothing in this app sets those GUCs on direct pg.Pool connections
-- (server/src/database/connection.ts) -- the only code path touching these tables is
-- app/api/portfolio/goals/route.ts, which already enforces admin-only writes in application
-- code before querying. On Azure these auth.* functions don't exist at all, so the policies
-- would fail outright rather than silently no-op. Replaced with USING (true), matching the
-- convention already used for app-layer-enforced tables elsewhere in supabase/migrations/.

BEGIN;

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
