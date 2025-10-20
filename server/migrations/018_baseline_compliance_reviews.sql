-- Migration: Baseline Compliance Reviews
-- Add support for formal PMBOK compliance reviews on baselines

-- Add compliance review fields to project_baselines table
ALTER TABLE project_baselines
ADD COLUMN IF NOT EXISTS compliance_review_status VARCHAR(50) 
  CHECK (compliance_review_status IN ('pending_review', 'under_review', 'approved', 'rejected', 'conditional_approval'));

ALTER TABLE project_baselines
ADD COLUMN IF NOT EXISTS compliance_review_comments TEXT;

ALTER TABLE project_baselines
ADD COLUMN IF NOT EXISTS compliance_reviewed_by UUID REFERENCES users(id);

ALTER TABLE project_baselines
ADD COLUMN IF NOT EXISTS compliance_reviewed_at TIMESTAMP;

ALTER TABLE project_baselines
ADD COLUMN IF NOT EXISTS pmbok_compliance_score DECIMAL(3,2) CHECK (pmbok_compliance_score >= 0 AND pmbok_compliance_score <= 1);

ALTER TABLE project_baselines
ADD COLUMN IF NOT EXISTS feasibility_status VARCHAR(50)
  CHECK (feasibility_status IN ('feasible', 'conditional', 'non_compliant', 'critical_issues'));

-- Create compliance review history table
CREATE TABLE IF NOT EXISTS baseline_compliance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
    
    -- Review Metadata
    review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('pmbok', 'babok', 'dmbok', 'feasibility', 'full_compliance')),
    review_status VARCHAR(50) NOT NULL CHECK (review_status IN ('passed', 'passed_with_conditions', 'failed', 'critical_non_compliance')),
    
    -- Compliance Scores
    scope_compliance_score DECIMAL(3,2) CHECK (scope_compliance_score >= 0 AND scope_compliance_score <= 1),
    technical_compliance_score DECIMAL(3,2) CHECK (technical_compliance_score >= 0 AND technical_compliance_score <= 1),
    schedule_compliance_score DECIMAL(3,2) CHECK (schedule_compliance_score >= 0 AND schedule_compliance_score <= 1),
    cost_compliance_score DECIMAL(3,2) CHECK (cost_compliance_score >= 0 AND cost_compliance_score <= 1),
    feasibility_score DECIMAL(3,2) CHECK (feasibility_score >= 0 AND feasibility_score <= 1),
    
    -- Review Details
    review_summary TEXT NOT NULL,
    non_compliance_items JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    critical_findings JSONB DEFAULT '[]'::jsonb,
    
    -- Reviewer Info
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP DEFAULT NOW(),
    
    -- Follow-up Actions
    required_actions JSONB DEFAULT '[]'::jsonb,
    change_requests_required JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_baseline ON baseline_compliance_reviews(baseline_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_status ON baseline_compliance_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_type ON baseline_compliance_reviews(review_type);

-- Comments
COMMENT ON TABLE baseline_compliance_reviews IS 'Formal PMBOK/BABOK/DMBOK compliance reviews for project baselines';
COMMENT ON COLUMN baseline_compliance_reviews.feasibility_score IS 'Overall feasibility assessment (0.0 = infeasible, 1.0 = fully feasible)';

