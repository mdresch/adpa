-- Migration: Add stakeholders table for PMBOK stakeholder management
-- Created: 2024-01-20
-- Description: Creates stakeholders table with PMBOK 7th edition parameters

CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- PMBOK Stakeholder Parameters
    interest_level VARCHAR(20) NOT NULL CHECK (interest_level IN ('high', 'medium', 'low')),
    influence_level VARCHAR(20) NOT NULL CHECK (influence_level IN ('high', 'medium', 'low')),
    engagement_approach VARCHAR(50) NOT NULL CHECK (engagement_approach IN ('manage_closely', 'keep_satisfied', 'keep_informed', 'monitor')),
    communication_frequency VARCHAR(20) NOT NULL CHECK (communication_frequency IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'as_needed')),
    stakeholder_type VARCHAR(20) NOT NULL CHECK (stakeholder_type IN ('internal', 'external')),
    stakeholder_category VARCHAR(20) NOT NULL CHECK (stakeholder_category IN ('primary', 'secondary')),
    
    -- Stakeholder Analysis
    expectations TEXT,
    potential_impact TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_email ON stakeholders(email);
CREATE INDEX IF NOT EXISTS idx_stakeholders_interest_level ON stakeholders(interest_level);
CREATE INDEX IF NOT EXISTS idx_stakeholders_influence_level ON stakeholders(influence_level);
CREATE INDEX IF NOT EXISTS idx_stakeholders_engagement_approach ON stakeholders(engagement_approach);
CREATE INDEX IF NOT EXISTS idx_stakeholders_stakeholder_type ON stakeholders(stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_stakeholders_stakeholder_category ON stakeholders(stakeholder_category);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stakeholders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stakeholders_updated_at
    BEFORE UPDATE ON stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION update_stakeholders_updated_at();

-- Add comments for documentation
COMMENT ON TABLE stakeholders IS 'PMBOK 7th edition stakeholder management table';
COMMENT ON COLUMN stakeholders.interest_level IS 'Level of stakeholder interest in the project (high, medium, low)';
COMMENT ON COLUMN stakeholders.influence_level IS 'Level of stakeholder influence on the project (high, medium, low)';
COMMENT ON COLUMN stakeholders.engagement_approach IS 'PMBOK engagement strategy (manage_closely, keep_satisfied, keep_informed, monitor)';
COMMENT ON COLUMN stakeholders.communication_frequency IS 'Recommended communication frequency with stakeholder';
COMMENT ON COLUMN stakeholders.stakeholder_type IS 'Internal or external stakeholder';
COMMENT ON COLUMN stakeholders.stakeholder_category IS 'Primary or secondary stakeholder';
COMMENT ON COLUMN stakeholders.expectations IS 'What the stakeholder expects from the project';
COMMENT ON COLUMN stakeholders.potential_impact IS 'How the stakeholder can impact the project';
