-- Migration: Add team_agreements table for PMBOK Team Agreements
-- Created: 2025-12-20
-- Description: Creates team_agreements table to store team working agreements, norms, and collaboration rules

CREATE TABLE IF NOT EXISTS team_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('working_hours', 'communication', 'decision_making', 'conflict_resolution', 'quality_standards', 'meeting_norms', 'code_of_conduct', 'collaboration_tools', 'response_times', 'knowledge_sharing', 'other')),
    agreed_by TEXT[],
    facilitated_by VARCHAR(255),
    effective_date TIMESTAMP WITH TIME ZONE,
    review_frequency VARCHAR(50),
    next_review_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'under_review', 'revised', 'deprecated')),
    adherence_score INTEGER CHECK (adherence_score BETWEEN 0 AND 100),
    violations_count INTEGER DEFAULT 0,
    last_violation_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_agreements_project_id ON team_agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_team_agreements_category ON team_agreements(category);
CREATE INDEX IF NOT EXISTS idx_team_agreements_status ON team_agreements(status);
CREATE INDEX IF NOT EXISTS idx_team_agreements_source_document_id ON team_agreements(source_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_agreements_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_agreements_updated_at
    BEFORE UPDATE ON team_agreements
    FOR EACH ROW
    EXECUTE FUNCTION update_team_agreements_updated_at();

-- Add comments for documentation
COMMENT ON TABLE team_agreements IS 'PMBOK Team Agreements table for storing team working agreements, norms, and collaboration rules';
COMMENT ON COLUMN team_agreements.category IS 'Category of the team agreement';
COMMENT ON COLUMN team_agreements.status IS 'Current status of the agreement (draft, active, under_review, revised, deprecated)';
COMMENT ON COLUMN team_agreements.adherence_score IS 'Score from 0-100 indicating how well the team adheres to this agreement';
COMMENT ON COLUMN team_agreements.violations_count IS 'Number of times this agreement has been violated';
COMMENT ON COLUMN team_agreements.source_document IS 'Source document title where this agreement was extracted from';
COMMENT ON COLUMN team_agreements.source_document_id IS 'Reference to the source document';
