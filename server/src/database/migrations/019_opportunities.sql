-- Migration: Add opportunities table for PMBOK Opportunity Management
-- Created: 2025-12-20
-- Description: Creates opportunities table to store project opportunities identified during planning and execution

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255),
    probability VARCHAR(20) CHECK (probability IN ('very_high', 'high', 'medium', 'low', 'very_low')),
    benefit_level VARCHAR(20) CHECK (benefit_level IN ('very_high', 'high', 'medium', 'low', 'very_low')),
    exploitation_strategy TEXT,
    owner VARCHAR(255),
    status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'planned', 'exploiting', 'realized', 'missed')),
    expected_benefit NUMERIC,
    trigger_conditions TEXT,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opportunities_project_id ON opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_probability ON opportunities(probability);
CREATE INDEX IF NOT EXISTS idx_opportunities_source_document_id ON opportunities(source_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at();

-- Add comments for documentation
COMMENT ON TABLE opportunities IS 'PMBOK Opportunities table storing project opportunities identified during planning and execution';
COMMENT ON COLUMN opportunities.title IS 'Title or brief description of the opportunity';
COMMENT ON COLUMN opportunities.category IS 'Category or type of opportunity';
COMMENT ON COLUMN opportunities.probability IS 'Probability of the opportunity occurring (very_high, high, medium, low, very_low)';
COMMENT ON COLUMN opportunities.benefit_level IS 'Expected benefit level if opportunity is realized';
COMMENT ON COLUMN opportunities.status IS 'Current status of the opportunity (identified, planned, exploiting, realized, missed)';
COMMENT ON COLUMN opportunities.expected_benefit IS 'Quantitative estimate of the benefit';
COMMENT ON COLUMN opportunities.source_document IS 'Source document title where this opportunity was extracted from';
COMMENT ON COLUMN opportunities.source_document_id IS 'Reference to the source document';
