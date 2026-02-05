-- Migration 025: Create Development Approach Table
-- Purpose: Add project-level development approach metadata for PMBOK 8 Domain 3 compliance
-- Date: January 15, 2026

BEGIN;

-- Create development_approach table (one record per project)
CREATE TABLE development_approach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Approach selection
  approach VARCHAR(20) NOT NULL CHECK (approach IN ('predictive', 'adaptive', 'hybrid', 'incremental', 'iterative')),
  methodology VARCHAR(30) CHECK (methodology IN ('waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom')),
  
  -- Justification (WHY this approach was selected)
  justification TEXT NOT NULL,
  
  -- Context factors (PMBOK 8 Domain 3)
  uncertainty_level VARCHAR(10) CHECK (uncertainty_level IN ('low', 'medium', 'high')),
  requirements_stability VARCHAR(20) CHECK (requirements_stability IN ('stable', 'evolving', 'uncertain')),
  stakeholder_engagement_model VARCHAR(20) CHECK (stakeholder_engagement_model IN ('periodic', 'continuous')),
  delivery_cadence VARCHAR(20) NOT NULL CHECK (delivery_cadence IN ('single', 'iterative', 'incremental', 'continuous')),
  
  -- Organizational context
  organizational_maturity VARCHAR(10) CHECK (organizational_maturity IN ('low', 'medium', 'high')),
  team_experience_level VARCHAR(10) CHECK (team_experience_level IN ('junior', 'mixed', 'senior')),
  regulatory_constraints BOOLEAN DEFAULT FALSE,
  
  -- Tailoring decisions (JSONB array)
  tailoring_decisions JSONB DEFAULT '[]'::jsonb,
  
  -- Life cycle configuration
  life_cycle_phases JSONB DEFAULT '[]'::jsonb,
  iteration_length INTEGER,
  iteration_unit VARCHAR(10) CHECK (iteration_unit IN ('days', 'weeks')),
  
  -- Governance approach
  governance_approach VARCHAR(20) NOT NULL CHECK (governance_approach IN ('lightweight', 'standard', 'formal')),
  review_gates JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  defined_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  effective_date TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_development_approach_project_id ON development_approach(project_id);
CREATE INDEX idx_development_approach_methodology ON development_approach(approach, methodology);
CREATE INDEX idx_development_approach_governance ON development_approach(governance_approach);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_development_approach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_development_approach_updated_at
  BEFORE UPDATE ON development_approach
  FOR EACH ROW
  EXECUTE FUNCTION update_development_approach_updated_at();

-- Add development_approach_id column to projects table (for quick access)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS development_approach_id UUID REFERENCES development_approach(id) ON DELETE SET NULL;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_projects_development_approach ON projects(development_approach_id);

COMMIT;

-- Migration complete: Development approach table created for PMBOK 8 Domain 3 compliance