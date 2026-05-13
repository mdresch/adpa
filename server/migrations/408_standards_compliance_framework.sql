-- Keep in sync with: server/src/database/migrations/408_standards_compliance_framework.sql
-- This copy is applied by server/scripts/run-migrations.ts (schema_migrations) and root `pnpm migrate`.

-- Standards Compliance & Governance Framework Foundation
-- SC-28: Database schema for standards-inspired validation across multiple standards packs
-- 
-- This migration creates tables for:
-- - SC-117: Shared Compliance Rule Model and Standards Mapping Foundation
-- - SC-118: Document Compliance Validation Engine and Result Persistence
-- - SC-119: Compliance Audit Trail and Verification History
-- - SC-120: Compliance Dashboard and Trend Visibility
-- - SC-121: Compliance Recommendations and Gap Remediation Guidance

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Standards pack type enum
DO $$ BEGIN
  CREATE TYPE standards_pack_type AS ENUM ('PMBOK', 'BABOK', 'DMBOK', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rule severity enum
DO $$ BEGIN
  CREATE TYPE rule_severity AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'INFORMATIONAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rule validation type enum
DO $$ BEGIN
  CREATE TYPE rule_validation_type AS ENUM (
    'KEYWORD_PRESENCE', 'SECTION_PRESENCE', 'STRUCTURE_CHECK', 
    'CONTENT_QUALITY', 'TERMINOLOGY_CHECK', 'REFERENCE_CHECK',
    'METRIC_PRESENCE', 'STAKEHOLDER_COVERAGE', 'RISK_ASSESSMENT', 'CUSTOM_LOGIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Compliance status enum
DO $$ BEGIN
  CREATE TYPE compliance_status AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'PARTIAL', 'NOT_APPLICABLE', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Compliance audit event type enum
DO $$ BEGIN
  CREATE TYPE compliance_audit_event_type AS ENUM (
    'VALIDATION_STARTED', 'VALIDATION_COMPLETED', 'VALIDATION_FAILED',
    'FINDING_CREATED', 'FINDING_RESOLVED', 
    'RECOMMENDATION_CREATED', 'RECOMMENDATION_APPLIED',
    'STATUS_CHANGED', 'SCORE_CHANGED',
    'RULE_ADDED', 'RULE_MODIFIED',
    'PACK_ACTIVATED', 'PACK_DEACTIVATED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STANDARDS PACKS (SC-117)
-- ============================================================================

-- Standards packs table (PMBOK, BABOK, DMBOK, Custom)
CREATE TABLE IF NOT EXISTS standards_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_type standards_pack_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0',
  edition VARCHAR(100),
  effective_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_pack BOOLEAN NOT NULL DEFAULT false,
  configuration JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pack_type, version)
);

CREATE INDEX IF NOT EXISTS idx_standards_packs_type ON standards_packs(pack_type);
CREATE INDEX IF NOT EXISTS idx_standards_packs_active ON standards_packs(is_active);

-- Standards categories within a pack
CREATE TABLE IF NOT EXISTS standards_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES standards_packs(id) ON DELETE CASCADE,
  parent_category_id UUID REFERENCES standards_categories(id) ON DELETE SET NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight NUMERIC(5,4) DEFAULT 1.0,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  applicable_doc_types TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pack_id, code)
);

CREATE INDEX IF NOT EXISTS idx_standards_categories_pack ON standards_categories(pack_id);
CREATE INDEX IF NOT EXISTS idx_standards_categories_parent ON standards_categories(parent_category_id);

-- ============================================================================
-- COMPLIANCE RULES (SC-117)
-- ============================================================================

-- Compliance rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES standards_packs(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES standards_categories(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  validation_type rule_validation_type NOT NULL,
  severity rule_severity NOT NULL DEFAULT 'MINOR',
  weight NUMERIC(5,4) DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  applicable_doc_types TEXT[] DEFAULT '{}',
  validation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  remediation_guidance JSONB NOT NULL DEFAULT '{}'::jsonb,
  standards_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pack_id, code)
);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_pack ON compliance_rules(pack_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_category ON compliance_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_severity ON compliance_rules(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_active ON compliance_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_type ON compliance_rules(validation_type);

-- ============================================================================
-- COMPLIANCE VALIDATION RESULTS (SC-118)
-- ============================================================================

-- Document compliance validation results
CREATE TABLE IF NOT EXISTS compliance_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES standards_packs(id) ON DELETE CASCADE,
  pack_type standards_pack_type NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  overall_status compliance_status NOT NULL DEFAULT 'PENDING',
  total_rules INTEGER NOT NULL DEFAULT 0,
  passed_rules INTEGER NOT NULL DEFAULT 0,
  failed_rules INTEGER NOT NULL DEFAULT 0,
  partial_rules INTEGER NOT NULL DEFAULT 0,
  not_applicable_rules INTEGER NOT NULL DEFAULT 0,
  critical_findings INTEGER NOT NULL DEFAULT 0,
  major_findings INTEGER NOT NULL DEFAULT 0,
  minor_findings INTEGER NOT NULL DEFAULT 0,
  informational_findings INTEGER NOT NULL DEFAULT 0,
  compliance_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade VARCHAR(10),
  trend VARCHAR(20) DEFAULT 'NEW',
  category_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  validation_duration_ms INTEGER,
  ai_provider VARCHAR(100),
  ai_model VARCHAR(100),
  previous_validation_id UUID REFERENCES compliance_validation_results(id) ON DELETE SET NULL,
  comparison_delta NUMERIC(5,2),
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_results_document ON compliance_validation_results(document_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_project ON compliance_validation_results(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_pack ON compliance_validation_results(pack_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_status ON compliance_validation_results(overall_status);
CREATE INDEX IF NOT EXISTS idx_compliance_results_score ON compliance_validation_results(overall_score);
CREATE INDEX IF NOT EXISTS idx_compliance_results_validated_at ON compliance_validation_results(validated_at DESC);

-- Individual rule validation results
CREATE TABLE IF NOT EXISTS compliance_rule_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_result_id UUID NOT NULL REFERENCES compliance_validation_results(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES standards_categories(id) ON DELETE CASCADE,
  status compliance_status NOT NULL DEFAULT 'PENDING',
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  severity rule_severity NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rule_results_validation ON compliance_rule_results(validation_result_id);
CREATE INDEX IF NOT EXISTS idx_rule_results_rule ON compliance_rule_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_results_category ON compliance_rule_results(category_id);
CREATE INDEX IF NOT EXISTS idx_rule_results_status ON compliance_rule_results(status);

-- ============================================================================
-- COMPLIANCE RECOMMENDATIONS (SC-121)
-- ============================================================================

-- Compliance recommendations table
CREATE TABLE IF NOT EXISTS compliance_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_result_id UUID NOT NULL REFERENCES compliance_validation_results(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
  rule_result_id UUID REFERENCES compliance_rule_results(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES standards_categories(id) ON DELETE CASCADE,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  impact TEXT,
  effort VARCHAR(20) DEFAULT 'MEDIUM',
  guidance JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_findings TEXT[] DEFAULT '{}',
  potential_score_improvement NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'PENDING',
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendations_validation ON compliance_recommendations(validation_result_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_rule ON compliance_recommendations(rule_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON compliance_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON compliance_recommendations(status);

-- ============================================================================
-- COMPLIANCE AUDIT TRAIL (SC-119)
-- ============================================================================

-- Compliance audit trail table
CREATE TABLE IF NOT EXISTS compliance_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type compliance_audit_event_type NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  validation_result_id UUID REFERENCES compliance_validation_results(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES compliance_rules(id) ON DELETE SET NULL,
  pack_id UUID REFERENCES standards_packs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  previous_value JSONB,
  new_value JSONB,
  details TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_document ON compliance_audit_trail(document_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_project ON compliance_audit_trail(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_validation ON compliance_audit_trail(validation_result_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_event ON compliance_audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_user ON compliance_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_timestamp ON compliance_audit_trail(timestamp DESC);

-- ============================================================================
-- COMPLIANCE TRENDS (SC-120)
-- ============================================================================

-- Compliance trends aggregation table (for dashboard performance)
CREATE TABLE IF NOT EXISTS compliance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES standards_packs(id) ON DELETE CASCADE,
  pack_type standards_pack_type,
  trend_date DATE NOT NULL,
  average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  compliance_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  document_count INTEGER NOT NULL DEFAULT 0,
  validation_count INTEGER NOT NULL DEFAULT 0,
  critical_findings INTEGER NOT NULL DEFAULT 0,
  major_findings INTEGER NOT NULL DEFAULT 0,
  resolved_findings INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, pack_id, trend_date)
);

CREATE INDEX IF NOT EXISTS idx_compliance_trends_project ON compliance_trends(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_trends_pack ON compliance_trends(pack_id);
CREATE INDEX IF NOT EXISTS idx_compliance_trends_date ON compliance_trends(trend_date DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_standards_packs_updated_at ON standards_packs;
CREATE TRIGGER update_standards_packs_updated_at
  BEFORE UPDATE ON standards_packs
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_standards_categories_updated_at ON standards_categories;
CREATE TRIGGER update_standards_categories_updated_at
  BEFORE UPDATE ON standards_categories
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_compliance_rules_updated_at ON compliance_rules;
CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON compliance_rules
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_compliance_validation_results_updated_at ON compliance_validation_results;
CREATE TRIGGER update_compliance_validation_results_updated_at
  BEFORE UPDATE ON compliance_validation_results
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

DROP TRIGGER IF EXISTS update_compliance_recommendations_updated_at ON compliance_recommendations;
CREATE TRIGGER update_compliance_recommendations_updated_at
  BEFORE UPDATE ON compliance_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

-- Function to aggregate compliance trends daily
CREATE OR REPLACE FUNCTION aggregate_compliance_trends(p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO compliance_trends (
    project_id,
    pack_id,
    pack_type,
    trend_date,
    average_score,
    compliance_percentage,
    document_count,
    validation_count,
    critical_findings,
    major_findings,
    resolved_findings
  )
  SELECT
    cvr.project_id,
    cvr.pack_id,
    cvr.pack_type,
    p_date,
    AVG(cvr.overall_score),
    AVG(cvr.compliance_percentage),
    COUNT(DISTINCT cvr.document_id),
    COUNT(cvr.id),
    SUM(cvr.critical_findings),
    SUM(cvr.major_findings),
    0 -- resolved_findings calculated separately
  FROM compliance_validation_results cvr
  WHERE DATE(cvr.validated_at) = p_date
  GROUP BY cvr.project_id, cvr.pack_id, cvr.pack_type
  ON CONFLICT (project_id, pack_id, trend_date)
  DO UPDATE SET
    average_score = EXCLUDED.average_score,
    compliance_percentage = EXCLUDED.compliance_percentage,
    document_count = EXCLUDED.document_count,
    validation_count = EXCLUDED.validation_count,
    critical_findings = EXCLUDED.critical_findings,
    major_findings = EXCLUDED.major_findings;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate compliance grade
CREATE OR REPLACE FUNCTION calculate_compliance_grade(p_score NUMERIC)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE
    WHEN p_score >= 95 THEN 'A+'
    WHEN p_score >= 90 THEN 'A'
    WHEN p_score >= 85 THEN 'A-'
    WHEN p_score >= 80 THEN 'B+'
    WHEN p_score >= 75 THEN 'B'
    WHEN p_score >= 70 THEN 'B-'
    WHEN p_score >= 65 THEN 'C+'
    WHEN p_score >= 60 THEN 'C'
    WHEN p_score >= 55 THEN 'C-'
    WHEN p_score >= 50 THEN 'D'
    ELSE 'F'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for compliance dashboard summary
CREATE OR REPLACE VIEW compliance_dashboard_summary AS
SELECT
  cvr.project_id,
  p.name as project_name,
  sp.pack_type,
  sp.name as pack_name,
  COUNT(DISTINCT cvr.document_id) as document_count,
  COUNT(cvr.id) as validation_count,
  AVG(cvr.overall_score) as average_score,
  AVG(cvr.compliance_percentage) as average_compliance,
  SUM(cvr.critical_findings) as total_critical_findings,
  SUM(cvr.major_findings) as total_major_findings,
  MAX(cvr.validated_at) as last_validation
FROM compliance_validation_results cvr
JOIN projects p ON cvr.project_id = p.id
JOIN standards_packs sp ON cvr.pack_id = sp.id
WHERE cvr.validated_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cvr.project_id, p.name, sp.pack_type, sp.name;

-- Enable RLS on all compliance tables
ALTER TABLE standards_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rule_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_trends ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE standards_packs IS 'SC-117: Standards packs (PMBOK, BABOK, DMBOK, Custom) for compliance validation';
COMMENT ON TABLE standards_categories IS 'SC-117: Categories/domains within a standards pack';
COMMENT ON TABLE compliance_rules IS 'SC-117: Individual compliance rules with validation configuration';
COMMENT ON TABLE compliance_validation_results IS 'SC-118: Document compliance validation results';
COMMENT ON TABLE compliance_rule_results IS 'SC-118: Individual rule validation results';
COMMENT ON TABLE compliance_recommendations IS 'SC-121: Gap remediation recommendations';
COMMENT ON TABLE compliance_audit_trail IS 'SC-119: Compliance verification history and audit trail';
COMMENT ON TABLE compliance_trends IS 'SC-120: Aggregated compliance trends for dashboard';
