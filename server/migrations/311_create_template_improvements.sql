-- Migration: 311_create_template_improvements.sql
-- Description: Create template improvement tracking tables for continuous quality improvement
-- Author: ADPA Development Team
-- Date: 2025-11-03
-- Related: Quality Control Gate Architecture - Template Improvement System

-- =======================
-- Template Improvement Suggestions Table
-- =======================

CREATE TABLE IF NOT EXISTS template_improvement_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  
  -- Analysis Period
  analysis_period_start TIMESTAMP NOT NULL,
  analysis_period_end TIMESTAMP NOT NULL,
  documents_analyzed INTEGER NOT NULL CHECK (documents_analyzed >= 0),
  
  -- Current Quality Metrics (before improvements)
  current_avg_quality INTEGER CHECK (current_avg_quality >= 0 AND current_avg_quality <= 100),
  current_completeness INTEGER CHECK (current_completeness >= 0 AND current_completeness <= 100),
  current_consistency INTEGER CHECK (current_consistency >= 0 AND current_consistency <= 100),
  current_professional_quality INTEGER CHECK (current_professional_quality >= 0 AND current_professional_quality <= 100),
  current_standards_compliance INTEGER CHECK (current_standards_compliance >= 0 AND current_standards_compliance <= 100),
  
  -- Common Issues (from aggregated audits)
  common_issues JSONB NOT NULL DEFAULT '[]',
  issue_frequency JSONB NOT NULL DEFAULT '{}',
  
  -- AI-Generated Suggestions
  suggested_improvements JSONB NOT NULL DEFAULT '[]',
  improvement_rationale TEXT,
  expected_quality_gain INTEGER CHECK (expected_quality_gain >= 0 AND expected_quality_gain <= 100),
  
  -- Priority & Status
  priority VARCHAR(10) CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  status VARCHAR(20) CHECK (status IN ('pending_review', 'approved', 'implemented', 'rejected')) DEFAULT 'pending_review',
  
  -- AI Analysis Metadata
  analyzer_ai_provider VARCHAR(50),
  analyzer_ai_model VARCHAR(100),
  analysis_tokens INTEGER,
  analysis_cost DECIMAL(10, 6),
  
  -- Workflow Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  implemented_by UUID REFERENCES users(id) ON DELETE SET NULL,
  implemented_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Metadata
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =======================
-- Template Versions Table
-- =======================

CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  
  -- Template Content
  content TEXT NOT NULL,
  system_prompt TEXT,
  
  -- Quality Tracking
  avg_quality_before INTEGER CHECK (avg_quality_before >= 0 AND avg_quality_before <= 100),
  avg_quality_after INTEGER CHECK (avg_quality_after >= 0 AND avg_quality_after <= 100),
  improvement_percentage DECIMAL(5, 2),
  
  -- Change Documentation
  changes_summary TEXT NOT NULL,
  improvement_suggestion_id UUID REFERENCES template_improvement_suggestions(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  
  -- Constraints
  UNIQUE(template_id, version_number)
);

-- =======================
-- Indexes for Performance
-- =======================

-- Template Improvement Suggestions Indexes
CREATE INDEX idx_template_improvements_template ON template_improvement_suggestions(template_id);
CREATE INDEX idx_template_improvements_status ON template_improvement_suggestions(status);
CREATE INDEX idx_template_improvements_priority ON template_improvement_suggestions(priority);
CREATE INDEX idx_template_improvements_date ON template_improvement_suggestions(created_at DESC);
CREATE INDEX idx_template_improvements_pending ON template_improvement_suggestions(status, priority) WHERE status = 'pending_review';

-- Template Versions Indexes
CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_template_versions_active ON template_versions(template_id, active) WHERE active = true;
CREATE INDEX idx_template_versions_number ON template_versions(template_id, version_number DESC);
CREATE INDEX idx_template_versions_suggestion ON template_versions(improvement_suggestion_id);

-- =======================
-- Comments for Documentation
-- =======================

COMMENT ON TABLE template_improvement_suggestions IS 'AI-generated suggestions for improving document templates based on quality audit patterns';
COMMENT ON COLUMN template_improvement_suggestions.analysis_period_start IS 'Start date of quality audit analysis period (typically 30 days)';
COMMENT ON COLUMN template_improvement_suggestions.analysis_period_end IS 'End date of quality audit analysis period';
COMMENT ON COLUMN template_improvement_suggestions.documents_analyzed IS 'Number of documents analyzed to generate suggestions (minimum 5 required)';
COMMENT ON COLUMN template_improvement_suggestions.current_avg_quality IS 'Average overall quality score before improvements';
COMMENT ON COLUMN template_improvement_suggestions.common_issues IS 'JSONB array of common issues found across multiple audits (>20% frequency)';
COMMENT ON COLUMN template_improvement_suggestions.issue_frequency IS 'JSONB object mapping issue types to frequency percentages';
COMMENT ON COLUMN template_improvement_suggestions.suggested_improvements IS 'JSONB array of specific, actionable improvement suggestions with expected impact';
COMMENT ON COLUMN template_improvement_suggestions.improvement_rationale IS 'Overall explanation of why these improvements are recommended';
COMMENT ON COLUMN template_improvement_suggestions.expected_quality_gain IS 'Predicted quality improvement (0-100 points)';
COMMENT ON COLUMN template_improvement_suggestions.priority IS 'Urgency: critical (<70% quality, >10pt gain), high (<80%, >8pt), medium (<85%, >5pt), low (else)';
COMMENT ON COLUMN template_improvement_suggestions.status IS 'Workflow status: pending_review → approved/rejected → implemented';

COMMENT ON TABLE template_versions IS 'Version history of template content with quality tracking before/after changes';
COMMENT ON COLUMN template_versions.version_number IS 'Sequential version number starting at 1';
COMMENT ON COLUMN template_versions.content IS 'Full template content for this version';
COMMENT ON COLUMN template_versions.system_prompt IS 'System prompt for AI generation (if different from template content)';
COMMENT ON COLUMN template_versions.avg_quality_before IS 'Average quality score before this version was implemented';
COMMENT ON COLUMN template_versions.avg_quality_after IS 'Average quality score after 30 days of using this version';
COMMENT ON COLUMN template_versions.improvement_percentage IS 'Actual quality improvement: (after - before)';
COMMENT ON COLUMN template_versions.changes_summary IS 'Human-readable summary of what changed in this version';
COMMENT ON COLUMN template_versions.improvement_suggestion_id IS 'Link to the suggestion that led to this version (if applicable)';
COMMENT ON COLUMN template_versions.active IS 'Only one version per template should be active at a time';

-- =======================
-- Triggers
-- =======================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_improvements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_improvements_updated_at
  BEFORE UPDATE ON template_improvement_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_template_improvements_updated_at();

-- Ensure only one active version per template
CREATE OR REPLACE FUNCTION ensure_single_active_template_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active = true THEN
    -- Deactivate all other versions for this template
    UPDATE template_versions
    SET active = false
    WHERE template_id = NEW.template_id
    AND id != NEW.id
    AND active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_active_version
  AFTER INSERT OR UPDATE OF active ON template_versions
  FOR EACH ROW
  WHEN (NEW.active = true)
  EXECUTE FUNCTION ensure_single_active_template_version();

-- =======================
-- Sample Query Examples (for testing)
-- =======================

-- Get pending improvement suggestions by priority
-- SELECT 
--   tis.id,
--   dt.name as template_name,
--   tis.documents_analyzed,
--   tis.current_avg_quality,
--   tis.expected_quality_gain,
--   tis.priority,
--   tis.created_at
-- FROM template_improvement_suggestions tis
-- JOIN document_templates dt ON tis.template_id = dt.id
-- WHERE tis.status = 'pending_review'
-- ORDER BY 
--   CASE tis.priority
--     WHEN 'critical' THEN 1
--     WHEN 'high' THEN 2
--     WHEN 'medium' THEN 3
--     WHEN 'low' THEN 4
--   END,
--   tis.created_at DESC;

-- Get template version history with quality improvements
-- SELECT 
--   tv.version_number,
--   tv.changes_summary,
--   tv.avg_quality_before,
--   tv.avg_quality_after,
--   tv.improvement_percentage,
--   tv.created_at,
--   u.name as created_by_name
-- FROM template_versions tv
-- LEFT JOIN users u ON tv.created_by = u.id
-- WHERE tv.template_id = 'template-uuid'
-- ORDER BY tv.version_number DESC;

-- Get templates that need improvement (low quality, no pending suggestions)
-- SELECT 
--   dt.id,
--   dt.name,
--   AVG(qa.overall_score) as avg_quality,
--   COUNT(qa.id) as audit_count,
--   COUNT(tis.id) as pending_suggestions
-- FROM document_templates dt
-- JOIN documents d ON d.template_id = dt.id
-- JOIN quality_audits qa ON qa.document_id = d.id
-- LEFT JOIN template_improvement_suggestions tis ON tis.template_id = dt.id AND tis.status = 'pending_review'
-- WHERE qa.audited_at > NOW() - INTERVAL '30 days'
-- AND dt.active = true
-- GROUP BY dt.id, dt.name
-- HAVING AVG(qa.overall_score) < 85 AND COUNT(tis.id) = 0
-- ORDER BY avg_quality ASC;

-- Get improvement effectiveness (compare predicted vs actual)
-- SELECT 
--   tis.id,
--   dt.name as template_name,
--   tis.expected_quality_gain as predicted_gain,
--   tv.improvement_percentage as actual_gain,
--   (tv.improvement_percentage - tis.expected_quality_gain) as prediction_error
-- FROM template_improvement_suggestions tis
-- JOIN template_versions tv ON tv.improvement_suggestion_id = tis.id
-- JOIN document_templates dt ON dt.id = tis.template_id
-- WHERE tis.status = 'implemented'
-- AND tv.avg_quality_after IS NOT NULL
-- ORDER BY ABS(tv.improvement_percentage - tis.expected_quality_gain) DESC;

