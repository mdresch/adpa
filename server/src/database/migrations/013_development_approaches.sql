-- Migration: Add development_approaches table for PMBOK Development Approach
-- Created: 2025-12-20
-- Description: Creates development_approaches table to store project development methodology and approach details
-- Note: This is a project-level entity (one record per project)

CREATE TABLE IF NOT EXISTS development_approaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    approach VARCHAR(50) NOT NULL CHECK (approach IN ('predictive', 'adaptive', 'hybrid', 'incremental', 'iterative')),
    methodology VARCHAR(50) CHECK (methodology IN ('waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom')),
    justification TEXT NOT NULL,
    uncertainty_level VARCHAR(20) CHECK (uncertainty_level IN ('low', 'medium', 'high')),
    requirements_stability VARCHAR(20) CHECK (requirements_stability IN ('stable', 'evolving', 'uncertain')),
    stakeholder_engagement_model TEXT,
    delivery_cadence VARCHAR(50) CHECK (delivery_cadence IN ('single', 'iterative', 'incremental', 'continuous')),
    organizational_maturity VARCHAR(20) CHECK (organizational_maturity IN ('low', 'medium', 'high')),
    team_experience_level VARCHAR(20) CHECK (team_experience_level IN ('junior', 'mixed', 'senior')),
    regulatory_constraints BOOLEAN DEFAULT FALSE,
    
    -- Tailoring decisions (stored as JSONB for flexibility)
    tailoring_decisions JSONB,
    
    -- Life cycle phases
    life_cycle_phases TEXT[],
    iteration_length INTEGER,
    iteration_unit VARCHAR(20) CHECK (iteration_unit IN ('days', 'weeks')),
    
    -- Governance
    governance_approach VARCHAR(50) CHECK (governance_approach IN ('lightweight', 'standard', 'formal')),
    review_gates TEXT[],
    
    -- Legacy fields for backward compatibility
    framework VARCHAR(255),
    lifecycle_model VARCHAR(255),
    iteration_length_weeks INTEGER,
    ceremonies TEXT[],
    artifacts TEXT[],
    tailoring_decisions_text TEXT,
    governance_notes TEXT,
    
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_development_approaches_project_id ON development_approaches(project_id);
CREATE INDEX IF NOT EXISTS idx_development_approaches_approach ON development_approaches(approach);
CREATE INDEX IF NOT EXISTS idx_development_approaches_source_document_id ON development_approaches(source_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_development_approaches_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_development_approaches_updated_at
    BEFORE UPDATE ON development_approaches
    FOR EACH ROW
    EXECUTE FUNCTION update_development_approaches_updated_at();

-- Add comments for documentation
COMMENT ON TABLE development_approaches IS 'PMBOK Development Approach table storing project development methodology and approach details';
COMMENT ON COLUMN development_approaches.approach IS 'Development approach (predictive, adaptive, hybrid, incremental, iterative)';
COMMENT ON COLUMN development_approaches.methodology IS 'Specific methodology used (waterfall, scrum, kanban, etc.)';
COMMENT ON COLUMN development_approaches.justification IS 'Rationale for choosing this approach';
COMMENT ON COLUMN development_approaches.uncertainty_level IS 'Level of uncertainty in the project (low, medium, high)';
COMMENT ON COLUMN development_approaches.requirements_stability IS 'Stability of project requirements (stable, evolving, uncertain)';
COMMENT ON COLUMN development_approaches.tailoring_decisions IS 'Tailoring decisions made to standard processes, stored as JSONB';
COMMENT ON COLUMN development_approaches.governance_approach IS 'Governance approach (lightweight, standard, formal)';
COMMENT ON COLUMN development_approaches.source_document IS 'Source document title where this approach was extracted from';
COMMENT ON COLUMN development_approaches.source_document_id IS 'Reference to the source document';
