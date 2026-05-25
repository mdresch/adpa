-- Migration: Create template audits table for background template reviews
CREATE TABLE IF NOT EXISTS template_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    template_version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'lifecycle', -- 'lifecycle', 'manual', 'document_failure'
    
    -- Overall Scores & Verdict
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    governance_score INTEGER CHECK (governance_score >= 0 AND governance_score <= 100),
    resilience_score INTEGER CHECK (resilience_score >= 0 AND resilience_score <= 100),
    verdict VARCHAR(50), -- 'pass', 'flagged', 'fail'
    
    -- Governance Evaluator Results
    governance_findings JSONB DEFAULT '[]',
    governance_recommendations JSONB DEFAULT '[]',
    compliance_gaps JSONB DEFAULT '[]',
    
    -- Counterfactual Challenger Results
    challenger_findings JSONB DEFAULT '[]',
    challenger_recommendations JSONB DEFAULT '[]',
    challenged_assumptions JSONB DEFAULT '[]',
    logical_vulnerabilities JSONB DEFAULT '[]',
    
    -- Metadata & Timestamps
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_template_audits_template_id ON template_audits(template_id);
