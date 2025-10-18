-- Migration: Add template development and validation status
-- Purpose: Track template maturity and quality validation

-- Add development_status column to templates
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS development_status VARCHAR(20) DEFAULT 'draft'
CHECK (development_status IN ('draft', 'testing', 'validated', 'production', 'deprecated'));

-- Add validation tracking columns
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_validated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS prompt_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quality_threshold NUMERIC(3,2) DEFAULT 0.70;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_templates_dev_status ON templates(development_status);
CREATE INDEX IF NOT EXISTS idx_templates_validated ON templates(last_validated_at);

-- Add comments
COMMENT ON COLUMN templates.development_status IS 'Template maturity: draft, testing, validated, production, deprecated';
COMMENT ON COLUMN templates.validation_count IS 'Total number of validation runs';
COMMENT ON COLUMN templates.success_count IS 'Number of successful generations (quality > threshold)';
COMMENT ON COLUMN templates.prompt_version IS 'Version of prompt engineering (increment when prompts updated)';
COMMENT ON COLUMN templates.quality_threshold IS 'Minimum quality score to mark as successful';

-- Create view for template health
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
  t.prompt_version,
  t.last_validated_at,
  t.last_validated_by,
  u.name as validated_by_name,
  t.is_public,
  t.created_at,
  t.updated_at,
  CASE 
    WHEN t.development_status = 'production' THEN '🟢 Production Ready'
    WHEN t.development_status = 'validated' THEN '🟡 Validated'
    WHEN t.development_status = 'testing' THEN '🔵 Testing'
    WHEN t.development_status = 'draft' THEN '⚪ Draft'
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
ORDER BY t.development_status, t.success_rate DESC NULLS LAST;

-- Create function to update template validation stats
CREATE OR REPLACE FUNCTION update_template_validation(
  p_template_id UUID,
  p_quality_score NUMERIC,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_threshold NUMERIC;
BEGIN
  -- Get quality threshold
  SELECT quality_threshold INTO v_threshold
  FROM templates
  WHERE id = p_template_id;
  
  -- Update validation counts
  UPDATE templates
  SET 
    validation_count = validation_count + 1,
    success_count = CASE 
      WHEN p_quality_score >= v_threshold THEN success_count + 1
      ELSE success_count
    END,
    last_validated_at = NOW(),
    last_validated_by = p_user_id
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to promote template status
CREATE OR REPLACE FUNCTION promote_template_status(
  p_template_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  new_status VARCHAR(20),
  message TEXT,
  success BOOLEAN
) AS $$
DECLARE
  v_current_status VARCHAR(20);
  v_success_rate NUMERIC;
  v_validation_count INTEGER;
  v_new_status VARCHAR(20);
  v_message TEXT;
BEGIN
  -- Get current status and stats
  SELECT 
    development_status,
    validation_count,
    CASE 
      WHEN validation_count = 0 THEN 0
      ELSE (success_count::NUMERIC / validation_count::NUMERIC)
    END
  INTO v_current_status, v_validation_count, v_success_rate
  FROM templates
  WHERE id = p_template_id;
  
  -- Validate promotion rules
  IF v_current_status = 'draft' THEN
    v_new_status := 'testing';
    v_message := 'Template promoted to testing. Start validation runs.';
    
  ELSIF v_current_status = 'testing' THEN
    IF v_validation_count < 3 THEN
      RETURN QUERY SELECT v_current_status, 'Need at least 3 validation runs before promoting to validated'::TEXT, FALSE;
      RETURN;
    ELSIF v_success_rate < 0.70 THEN
      RETURN QUERY SELECT v_current_status, 'Success rate must be >= 70% to promote to validated'::TEXT, FALSE;
      RETURN;
    ELSE
      v_new_status := 'validated';
      v_message := 'Template validated with ' || ROUND(v_success_rate * 100, 0) || '% success rate';
    END IF;
    
  ELSIF v_current_status = 'validated' THEN
    IF v_validation_count < 10 THEN
      RETURN QUERY SELECT v_current_status, 'Need at least 10 validation runs before promoting to production'::TEXT, FALSE;
      RETURN;
    ELSIF v_success_rate < 0.85 THEN
      RETURN QUERY SELECT v_current_status, 'Success rate must be >= 85% to promote to production'::TEXT, FALSE;
      RETURN;
    ELSE
      v_new_status := 'production';
      v_message := 'Template promoted to production with ' || ROUND(v_success_rate * 100, 0) || '% success rate';
    END IF;
    
  ELSE
    RETURN QUERY SELECT v_current_status, 'Template cannot be promoted from current status'::TEXT, FALSE;
    RETURN;
  END IF;
  
  -- Update status
  UPDATE templates
  SET 
    development_status = v_new_status,
    last_validated_at = NOW(),
    last_validated_by = p_user_id
  WHERE id = p_template_id;
  
  RETURN QUERY SELECT v_new_status, v_message, TRUE;
END;
$$ LANGUAGE plpgsql;

-- Set default statuses for existing templates (all start as draft)
UPDATE templates
SET development_status = 'draft'
WHERE development_status IS NULL;

COMMENT ON TABLE templates IS 'Document templates with development lifecycle tracking';
COMMENT ON VIEW template_health IS 'Template quality and validation statistics';
COMMENT ON FUNCTION update_template_validation IS 'Track template validation results';
COMMENT ON FUNCTION promote_template_status IS 'Promote template through development lifecycle with validation rules';

