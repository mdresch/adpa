-- Migration: Add Compliance and Archive Stages to Template Lifecycle
-- Purpose: Add compliance review for framework alignment and archive instead of delete
-- Date: 2025-10-18

-- ============================================================================
-- 1. Update development_status enum to include 'compliance' and 'archived'
-- ============================================================================

ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_development_status_check;

ALTER TABLE templates
ADD CONSTRAINT templates_development_status_check
CHECK (development_status IN ('draft', 'testing', 'compliance', 'validated', 'production', 'archived', 'deprecated'));

-- Update default if needed
ALTER TABLE templates
ALTER COLUMN development_status SET DEFAULT 'draft';

-- ============================================================================
-- 2. Add compliance review tracking columns
-- ============================================================================

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS compliance_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS compliance_checked_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS compliance_notes TEXT,
ADD COLUMN IF NOT EXISTS framework_compliance_score NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS custom_compliance_rules JSONB;

-- Add archived tracking
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- ============================================================================
-- 3. Add indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_templates_compliance_checked ON templates(compliance_checked_at);
CREATE INDEX IF NOT EXISTS idx_templates_archived ON templates(archived_at);

-- ============================================================================
-- 4. Add comments
-- ============================================================================

COMMENT ON COLUMN templates.development_status IS 'Template maturity: draft, testing, compliance, validated, production, archived, deprecated';
COMMENT ON COLUMN templates.compliance_checked_at IS 'When framework compliance was last reviewed';
COMMENT ON COLUMN templates.compliance_checked_by IS 'User who performed compliance check';
COMMENT ON COLUMN templates.compliance_notes IS 'Notes from compliance review (deviations, recommendations)';
COMMENT ON COLUMN templates.framework_compliance_score IS 'Framework alignment score (0-1, e.g., 0.85 = 85%)';
COMMENT ON COLUMN templates.custom_compliance_rules IS 'Custom compliance rules for non-standard frameworks';
COMMENT ON COLUMN templates.archived_at IS 'When template was archived (moved out of active use)';
COMMENT ON COLUMN templates.archived_by IS 'User who archived the template';
COMMENT ON COLUMN templates.archive_reason IS 'Reason for archiving';

-- ============================================================================
-- 5. Update template_health view to include new stages
-- ============================================================================

DROP VIEW IF EXISTS template_health;

CREATE OR REPLACE VIEW template_health AS
SELECT
  t.id,
  t.name,
  t.framework,
  t.category,
  t.development_status,
  t.validation_count,
  t.success_count,
  CASE
    WHEN t.validation_count = 0 THEN 0
    ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
  END as success_rate,
  t.quality_threshold,
  t.framework_compliance_score,
  t.compliance_checked_at,
  t.compliance_checked_by,
  t.prompt_version,
  t.last_validated_at,
  t.last_validated_by,
  t.archived_at,
  t.archived_by,
  u.name as validated_by_name,
  cu.name as compliance_checked_by_name,
  au.name as archived_by_name,
  t.is_public,
  t.created_at,
  t.updated_at,
  CASE
    WHEN t.development_status = 'production' THEN '🟢 Production Ready'
    WHEN t.development_status = 'validated' THEN '🟡 Validated'
    WHEN t.development_status = 'compliance' THEN '🟣 Compliance Review'
    WHEN t.development_status = 'testing' THEN '🔵 Testing'
    WHEN t.development_status = 'draft' THEN '⚪ Draft'
    WHEN t.development_status = 'archived' THEN '📦 Archived'
    WHEN t.development_status = 'deprecated' THEN '🔴 Deprecated'
  END as status_label,
  CASE
    WHEN t.validation_count = 0 THEN 'Not tested yet'
    WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)::NUMERIC) >= 0.90 THEN 'Excellent'
    WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)::NUMERIC) >= 0.75 THEN 'Good'
    WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)::NUMERIC) >= 0.50 THEN 'Fair'
    ELSE 'Needs Improvement'
  END as health_rating
FROM templates t
LEFT JOIN users u ON t.last_validated_by = u.id
LEFT JOIN users cu ON t.compliance_checked_by = cu.id
LEFT JOIN users au ON t.archived_by = au.id
WHERE t.deleted_at IS NULL
ORDER BY 
  t.development_status,
  CASE
    WHEN t.validation_count = 0 THEN 0
    ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
  END DESC NULLS LAST;

-- ============================================================================
-- 6. Update promote_template_status function for new stages
-- ============================================================================

-- Drop existing function first (return type might have changed)
DROP FUNCTION IF EXISTS promote_template_status(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION promote_template_status(
  p_template_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  message TEXT
) AS $$
DECLARE
  v_current_status VARCHAR(20);
  v_new_status VARCHAR(20);
  v_validation_count INTEGER;
  v_success_count INTEGER;
  v_success_rate NUMERIC;
  v_compliance_checked BOOLEAN;
BEGIN
  -- Get current status and validation counts
  SELECT 
    development_status,
    validation_count,
    success_count,
    CASE 
      WHEN validation_count = 0 THEN 0
      ELSE (success_count::NUMERIC / validation_count::NUMERIC)
    END,
    compliance_checked_at IS NOT NULL
  INTO v_current_status, v_validation_count, v_success_count, v_success_rate, v_compliance_checked
  FROM templates
  WHERE id = p_template_id;
  
  -- Check if template exists
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR, NULL::VARCHAR, 'Template not found'::TEXT;
    RETURN;
  END IF;
  
  -- Cannot promote from archived
  IF v_current_status = 'archived' THEN
    RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR, 'Cannot promote archived templates. Restore first.'::TEXT;
    RETURN;
  END IF;
  
  -- Determine next status and check requirements
  IF v_current_status = 'draft' THEN
    v_new_status := 'testing';
    
  ELSIF v_current_status = 'testing' THEN
    -- Check requirements for compliance stage
    IF v_validation_count < 3 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR, 
        'Need 3+ validations (currently ' || v_validation_count || ')'::TEXT;
      RETURN;
    END IF;
    IF v_success_rate < 0.75 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 75%+ success rate (currently ' || ROUND(v_success_rate * 100, 1) || '%)'::TEXT;
      RETURN;
    END IF;
    v_new_status := 'compliance';
    
  ELSIF v_current_status = 'compliance' THEN
    -- Check requirements for validated stage
    IF v_validation_count < 5 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 5+ validations (currently ' || v_validation_count || ')'::TEXT;
      RETURN;
    END IF;
    IF v_success_rate < 0.80 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 80%+ success rate (currently ' || ROUND(v_success_rate * 100, 1) || '%)'::TEXT;
      RETURN;
    END IF;
    IF NOT v_compliance_checked THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Manual compliance review required'::TEXT;
      RETURN;
    END IF;
    v_new_status := 'validated';
    
  ELSIF v_current_status = 'validated' THEN
    -- Check requirements for production
    IF v_validation_count < 10 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 10+ validations (currently ' || v_validation_count || ')'::TEXT;
      RETURN;
    END IF;
    IF v_success_rate < 0.90 THEN
      RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
        'Need 90%+ success rate (currently ' || ROUND(v_success_rate * 100, 1) || '%)'::TEXT;
      RETURN;
    END IF;
    v_new_status := 'production';
    
  ELSE
    RETURN QUERY SELECT FALSE, v_current_status, NULL::VARCHAR,
      'No promotion path from ' || v_current_status::TEXT;
    RETURN;
  END IF;
  
  -- Perform the promotion
  UPDATE templates
  SET 
    development_status = v_new_status,
    updated_at = NOW()
  WHERE id = p_template_id;
  
  -- Log the promotion
  INSERT INTO template_status_history (template_id, old_status, new_status, changed_by, reason)
  VALUES (p_template_id, v_current_status, v_new_status, p_user_id, p_reason);
  
  RETURN QUERY SELECT TRUE, v_current_status, v_new_status, 
    'Successfully promoted from ' || v_current_status || ' to ' || v_new_status::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Create archive_template function (works from any stage)
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_template(
  p_template_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  old_status VARCHAR(20),
  message TEXT
) AS $$
DECLARE
  v_current_status VARCHAR(20);
  v_has_generations BOOLEAN;
BEGIN
  -- Get current status and check if template has generated documents
  SELECT 
    development_status,
    validation_count > 0
  INTO v_current_status, v_has_generations
  FROM templates
  WHERE id = p_template_id AND deleted_at IS NULL;
  
  -- Check if template exists
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR, 'Template not found'::TEXT;
    RETURN;
  END IF;
  
  -- Already archived
  IF v_current_status = 'archived' THEN
    RETURN QUERY SELECT FALSE, v_current_status, 'Template is already archived'::TEXT;
    RETURN;
  END IF;
  
  -- Perform archival
  UPDATE templates
  SET 
    development_status = 'archived',
    archived_at = NOW(),
    archived_by = p_user_id,
    archive_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_template_id;
  
  -- Log the archival
  INSERT INTO template_status_history (template_id, old_status, new_status, changed_by, reason)
  VALUES (p_template_id, v_current_status, 'archived', p_user_id, p_reason);
  
  RETURN QUERY SELECT TRUE, v_current_status,
    'Template archived from ' || v_current_status || 
    CASE WHEN v_has_generations THEN ' (has generated documents - preserved)' ELSE '' END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Create compliance approval function
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_template_compliance(
  p_template_id UUID,
  p_user_id UUID,
  p_compliance_score NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_current_status VARCHAR(20);
BEGIN
  -- Check current status
  SELECT development_status INTO v_current_status
  FROM templates
  WHERE id = p_template_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Template not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status != 'compliance' THEN
    RETURN QUERY SELECT FALSE, 
      'Template must be in compliance stage (currently: ' || v_current_status || ')'::TEXT;
    RETURN;
  END IF;
  
  -- Record compliance approval
  UPDATE templates
  SET 
    compliance_checked_at = NOW(),
    compliance_checked_by = p_user_id,
    compliance_notes = p_notes,
    framework_compliance_score = p_compliance_score / 100,  -- Convert percentage to 0-1
    updated_at = NOW()
  WHERE id = p_template_id;
  
  RETURN QUERY SELECT TRUE, 
    'Compliance approved with score: ' || p_compliance_score || '%'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Update template_status_history table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  old_status VARCHAR(20) NOT NULL,
  new_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_status_history_template ON template_status_history(template_id);
CREATE INDEX IF NOT EXISTS idx_template_status_history_date ON template_status_history(created_at);

COMMENT ON TABLE template_status_history IS 'Audit log of template status changes';

-- ============================================================================
-- 10. Add comments for new lifecycle
-- ============================================================================

COMMENT ON COLUMN templates.custom_compliance_rules IS 'JSON array of custom compliance rules for non-standard frameworks';

-- ============================================================================
-- 11. Set existing templates to appropriate status (data migration)
-- ============================================================================

-- Templates currently in production stay in production
-- Templates with validations but not in production → move to testing
-- Templates with no validations stay in draft

-- No automatic migration - preserve current statuses
-- Admins can manually promote or archive as needed

-- ============================================================================
-- 12. Create helper view for compliance queue
-- ============================================================================

CREATE OR REPLACE VIEW templates_pending_compliance AS
SELECT
  t.id,
  t.name,
  t.framework,
  t.category,
  t.validation_count,
  t.success_count,
  ROUND((t.success_count::NUMERIC / NULLIF(t.validation_count, 0)::NUMERIC * 100), 2) as success_rate,
  t.created_at,
  t.updated_at,
  u.name as created_by_name
FROM templates t
LEFT JOIN users u ON t.created_by = u.id
WHERE t.development_status = 'compliance'
  AND t.deleted_at IS NULL
ORDER BY t.updated_at DESC;

COMMENT ON VIEW templates_pending_compliance IS 'Templates awaiting compliance review';

-- ============================================================================
-- End of Migration
-- ============================================================================

-- Verification queries (commented out - run manually if needed):
-- SELECT DISTINCT development_status FROM templates ORDER BY development_status;
-- SELECT * FROM template_health WHERE development_status IN ('compliance', 'archived');
-- SELECT * FROM templates_pending_compliance;

