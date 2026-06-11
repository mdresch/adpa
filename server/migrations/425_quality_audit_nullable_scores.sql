-- Allow quality audits to persist "not performed" state without fabricated scores.
-- Failed LLM calls must not inflate averages with default 70/80 dimension values.

ALTER TABLE public.quality_audits
  ADD COLUMN IF NOT EXISTS audit_performed boolean NOT NULL DEFAULT true;

ALTER TABLE public.quality_audits
  ALTER COLUMN overall_grade TYPE character varying(10);

ALTER TABLE public.quality_audits
  DROP CONSTRAINT IF EXISTS quality_audits_overall_grade_check;

ALTER TABLE public.quality_audits
  ALTER COLUMN overall_score DROP NOT NULL,
  ALTER COLUMN overall_grade DROP NOT NULL,
  ALTER COLUMN quality_level DROP NOT NULL,
  ALTER COLUMN completeness_score DROP NOT NULL,
  ALTER COLUMN consistency_score DROP NOT NULL,
  ALTER COLUMN professional_quality_score DROP NOT NULL,
  ALTER COLUMN standards_compliance_score DROP NOT NULL,
  ALTER COLUMN accuracy_score DROP NOT NULL,
  ALTER COLUMN context_relevance_score DROP NOT NULL;

-- Backfill failed / unavailable audits (legacy rows stored fake ~73% scores)
UPDATE public.quality_audits
SET
  audit_performed = false,
  overall_score = NULL,
  overall_grade = NULL,
  quality_level = NULL,
  completeness_score = NULL,
  consistency_score = NULL,
  professional_quality_score = NULL,
  standards_compliance_score = NULL,
  accuracy_score = NULL,
  context_relevance_score = NULL
WHERE
  ai_provider = 'none'
  OR ai_model = 'none'
  OR findings::text ILIKE '%AI analysis unavailable%'
  OR findings::text ILIKE '%no audit performed%';

CREATE INDEX IF NOT EXISTS idx_quality_audits_performed_score
  ON public.quality_audits (audit_performed, overall_score)
  WHERE audit_performed = true AND overall_score IS NOT NULL;
