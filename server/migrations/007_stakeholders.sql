-- Stakeholders table migration
-- Creates the stakeholders table with all required fields for PMBOK stakeholder management

CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255),
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    interest_level VARCHAR(20) DEFAULT 'medium' CHECK (interest_level IN ('high', 'medium', 'low')),
    influence_level VARCHAR(20) DEFAULT 'medium' CHECK (influence_level IN ('high', 'medium', 'low')),
    engagement_approach VARCHAR(20) DEFAULT 'keep_informed' CHECK (engagement_approach IN ('manage_closely', 'keep_satisfied', 'keep_informed', 'monitor')),
    communication_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (communication_frequency IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'as_needed')),
    stakeholder_type VARCHAR(20) DEFAULT 'internal' CHECK (stakeholder_type IN ('internal', 'external')),
    stakeholder_category VARCHAR(20) DEFAULT 'primary' CHECK (stakeholder_category IN ('primary', 'secondary')),
    expectations TEXT,
    potential_impact TEXT,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_email ON stakeholders(email);
CREATE INDEX IF NOT EXISTS idx_stakeholders_role ON stakeholders(role);
CREATE INDEX IF NOT EXISTS idx_stakeholders_engagement_approach ON stakeholders(engagement_approach);
CREATE INDEX IF NOT EXISTS idx_stakeholders_stakeholder_type ON stakeholders(stakeholder_type);

-- Create update trigger
CREATE TRIGGER update_stakeholders_updated_at 
    BEFORE UPDATE ON stakeholders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();