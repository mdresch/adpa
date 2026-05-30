-- Migration 418: Align project_charter_details with extraction logic
-- This adds missing columns and renames others to match the saveProjectCharterDetails service.

BEGIN;

-- 1. Add missing columns
ALTER TABLE project_charter_details 
ADD COLUMN IF NOT EXISTS "project_charter_id" text,
ADD COLUMN IF NOT EXISTS "vision" text,
ADD COLUMN IF NOT EXISTS "mission" text,
ADD COLUMN IF NOT EXISTS "project_manager" text,
ADD COLUMN IF NOT EXISTS "sponsor" text,
ADD COLUMN IF NOT EXISTS "authority_level" text,
ADD COLUMN IF NOT EXISTS "major_milestones" text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS "high_level_risks" text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS "critical_success_factors" text[] DEFAULT '{}'::text[];

-- 2. Migrate data from old columns if they exist and are populated
-- (Safety check: only update if the new column is null and old is not)
UPDATE project_charter_details SET vision = vision_statement WHERE vision IS NULL AND vision_statement IS NOT NULL;
UPDATE project_charter_details SET sponsor = executive_sponsor WHERE sponsor IS NULL AND executive_sponsor IS NOT NULL;
UPDATE project_charter_details SET critical_success_factors = success_measures WHERE (critical_success_factors IS NULL OR critical_success_factors = '{}'::text[]) AND success_measures IS NOT NULL AND success_measures <> '{}'::text[];
UPDATE project_charter_details SET major_milestones = high_level_objectives WHERE (major_milestones IS NULL OR major_milestones = '{}'::text[]) AND high_level_objectives IS NOT NULL AND high_level_objectives <> '{}'::text[];

COMMIT;
