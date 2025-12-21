-- Migration: Add risk_responses table for PMBOK Risk Response Tracking
-- Created: 2025-12-20
-- Description: Creates risk_responses table to store actions taken to address project risks

CREATE TABLE IF NOT EXISTS risk_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    risk_title VARCHAR(255),
    response_date TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    effectiveness VARCHAR(50) CHECK (effectiveness IN ('effective', 'partially_effective', 'ineffective')),
    cost_of_response NUMERIC,
    residual_risk_level VARCHAR(20) CHECK (residual_risk_level IN ('very_high', 'high', 'medium', 'low', 'very_low')),
    owner VARCHAR(255),
    notes TEXT,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_risk_responses_project_id ON risk_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_risk_title ON risk_responses(risk_title);
CREATE INDEX IF NOT EXISTS idx_risk_responses_response_date ON risk_responses(response_date);
CREATE INDEX IF NOT EXISTS idx_risk_responses_source_document_id ON risk_responses(source_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_risk_responses_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_risk_responses_updated_at
    BEFORE UPDATE ON risk_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_risk_responses_updated_at();

-- Add comments for documentation
COMMENT ON TABLE risk_responses IS 'PMBOK Risk Responses table storing actions taken to address project risks';
COMMENT ON COLUMN risk_responses.risk_title IS 'Title of the risk being addressed';
COMMENT ON COLUMN risk_responses.response_date IS 'Date when the response was implemented';
COMMENT ON COLUMN risk_responses.action_taken IS 'Description of the action taken to address the risk';
COMMENT ON COLUMN risk_responses.effectiveness IS 'Effectiveness of the response (effective, partially_effective, ineffective)';
COMMENT ON COLUMN risk_responses.cost_of_response IS 'Cost associated with implementing the response';
COMMENT ON COLUMN risk_responses.residual_risk_level IS 'Risk level remaining after response implementation';
COMMENT ON COLUMN risk_responses.source_document IS 'Source document title where this risk response was extracted from';
COMMENT ON COLUMN risk_responses.source_document_id IS 'Reference to the source document';
