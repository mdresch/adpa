-- Migration: 312_rollback_quality_system.sql
-- Description: Rollback script for quality audit and template improvement system
-- Author: ADPA Development Team
-- Date: 2025-11-03
-- WARNING: This will drop all quality audit data and template improvement suggestions

-- =======================
-- Drop Triggers
-- =======================

DROP TRIGGER IF EXISTS trigger_ensure_single_active_version ON template_versions;
DROP TRIGGER IF EXISTS trigger_update_template_improvements_updated_at ON template_improvement_suggestions;
DROP TRIGGER IF EXISTS trigger_update_quality_audits_updated_at ON quality_audits;

-- =======================
-- Drop Functions
-- =======================

DROP FUNCTION IF EXISTS ensure_single_active_template_version();
DROP FUNCTION IF EXISTS update_template_improvements_updated_at();
DROP FUNCTION IF EXISTS update_quality_audits_updated_at();

-- =======================
-- Drop Indexes (explicit drops for safety)
-- =======================

-- Template Versions Indexes
DROP INDEX IF EXISTS idx_template_versions_suggestion;
DROP INDEX IF EXISTS idx_template_versions_number;
DROP INDEX IF EXISTS idx_template_versions_active;
DROP INDEX IF EXISTS idx_template_versions_template;

-- Template Improvement Suggestions Indexes
DROP INDEX IF EXISTS idx_template_improvements_pending;
DROP INDEX IF EXISTS idx_template_improvements_date;
DROP INDEX IF EXISTS idx_template_improvements_priority;
DROP INDEX IF EXISTS idx_template_improvements_status;
DROP INDEX IF EXISTS idx_template_improvements_template;

-- Quality Audits Indexes
DROP INDEX IF EXISTS idx_quality_audits_document_date;
DROP INDEX IF EXISTS idx_quality_audits_provider;
DROP INDEX IF EXISTS idx_quality_audits_date;
DROP INDEX IF EXISTS idx_quality_audits_score;
DROP INDEX IF EXISTS idx_quality_audits_grade;
DROP INDEX IF EXISTS idx_quality_audits_document;

-- Documents Quality Indexes
DROP INDEX IF EXISTS idx_documents_quality_composite;
DROP INDEX IF EXISTS idx_documents_quality_score;
DROP INDEX IF EXISTS idx_documents_quality_status;

-- =======================
-- Remove Quality Columns from Documents Table
-- =======================

ALTER TABLE documents 
DROP COLUMN IF EXISTS quality_score,
DROP COLUMN IF EXISTS quality_status,
DROP COLUMN IF EXISTS quality_audit_id;

-- =======================
-- Remove Quality Columns from Template Versions Table
-- (Note: template_versions table existed before, only remove columns we added)
-- =======================

ALTER TABLE template_versions
DROP COLUMN IF EXISTS avg_quality_before,
DROP COLUMN IF EXISTS avg_quality_after,
DROP COLUMN IF EXISTS improvement_percentage,
DROP COLUMN IF EXISTS improvement_suggestion_id;

-- =======================
-- Drop Tables (in correct order due to foreign keys)
-- (Note: template_versions is NOT dropped as it existed before)
-- =======================

DROP TABLE IF EXISTS template_improvement_suggestions CASCADE;
DROP TABLE IF EXISTS quality_audits CASCADE;

-- =======================
-- Verification
-- =======================

-- Verify quality system tables are dropped
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quality_audits') THEN
    RAISE EXCEPTION 'quality_audits table still exists!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_improvement_suggestions') THEN
    RAISE EXCEPTION 'template_improvement_suggestions table still exists!';
  END IF;
  
  -- Verify template_versions still exists (it's a pre-existing table)
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_versions') THEN
    RAISE EXCEPTION 'template_versions table was incorrectly dropped!';
  END IF;
  
  -- Verify added columns were removed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'template_versions' 
    AND column_name IN ('avg_quality_before', 'avg_quality_after', 'improvement_percentage', 'improvement_suggestion_id')
  ) THEN
    RAISE EXCEPTION 'Quality columns still exist in template_versions table!';
  END IF;
  
  RAISE NOTICE 'Quality system successfully rolled back';
END $$;

