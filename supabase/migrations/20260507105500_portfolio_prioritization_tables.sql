-- SC-78: Implement prioritization database tables
-- Creates portfolio_criteria, portfolio_scores, portfolio_rankings (materialized view),
-- plus minimal RLS policies and a refresh function.

BEGIN;

-- 1) Portfolio criteria table
CREATE TABLE IF NOT EXISTS public.portfolio_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  -- Weight is a multiplier (e.g. 1.0), not a percentage.
  weight numeric(3,2) NOT NULL DEFAULT 1.0,
  min_score integer NOT NULL DEFAULT 1,
  max_score integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_criteria_weight_positive CHECK (weight > 0),
  CONSTRAINT portfolio_criteria_score_range CHECK (min_score >= 1 AND max_score >= min_score)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_criteria_active ON public.portfolio_criteria (is_active);

-- 2) Portfolio scores table
CREATE TABLE IF NOT EXISTS public.portfolio_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.portfolio_criteria(id) ON DELETE CASCADE,
  score integer NOT NULL,
  rationale text,
  scored_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  scored_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_score CHECK (score >= 1 AND score <= 5),
  UNIQUE(project_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_scores_project ON public.portfolio_scores (project_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_scores_criterion ON public.portfolio_scores (criterion_id);

-- 3) Portfolio rankings materialized view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'portfolio_rankings'
  ) THEN
    EXECUTE $mv$
      CREATE MATERIALIZED VIEW public.portfolio_rankings AS
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        COALESCE(SUM(ps.score * pc.weight), 0) AS total_score,
        RANK() OVER (ORDER BY COALESCE(SUM(ps.score * pc.weight), 0) DESC) AS rank,
        COUNT(ps.id) AS criteria_scored,
        MAX(ps.updated_at) AS last_scored_at
      FROM public.projects p
      LEFT JOIN public.portfolio_scores ps ON p.id = ps.project_id
      LEFT JOIN public.portfolio_criteria pc
        ON ps.criterion_id = pc.id AND pc.is_active = true
      GROUP BY p.id, p.name
    $mv$;
  END IF;
END $$;

-- Required for REFRESH ... CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_rankings_project ON public.portfolio_rankings (project_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_rankings_rank ON public.portfolio_rankings (rank);

-- 4) RLS policies (minimal SELECT-only baseline)
ALTER TABLE public.portfolio_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'portfolio_criteria' AND policyname = 'portfolio_criteria_select'
  ) THEN
    EXECUTE 'CREATE POLICY portfolio_criteria_select ON public.portfolio_criteria FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'portfolio_scores' AND policyname = 'portfolio_scores_select'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY portfolio_scores_select ON public.portfolio_scores
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = public.portfolio_scores.project_id)
      )
    $pol$;
  END IF;
END $$;

-- 5) Refresh function (can be called from server or RPC)
-- NOTE: CONCURRENTLY cannot run inside a transaction block. We provide a best-effort
-- refresh that falls back to non-concurrent refresh if needed.
CREATE OR REPLACE FUNCTION public.refresh_portfolio_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.portfolio_rankings';
  EXCEPTION
    WHEN feature_not_supported OR active_sql_transaction THEN
      EXECUTE 'REFRESH MATERIALIZED VIEW public.portfolio_rankings';
  END;
END;
$$;

COMMIT;

