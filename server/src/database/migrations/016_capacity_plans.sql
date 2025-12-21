-- Migration: Add capacity_plans table for PMBOK Capacity Planning
-- Created: 2025-12-20
-- Description: Creates capacity_plans table to store team member capacity and resource allocation plans

CREATE TABLE IF NOT EXISTS capacity_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_member VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    available_hours INTEGER,
    allocated_hours INTEGER,
    utilization_percentage INTEGER CHECK (utilization_percentage BETWEEN 0 AND 100),
    notes TEXT,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_capacity_plans_project_id ON capacity_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_capacity_plans_team_member ON capacity_plans(team_member);
CREATE INDEX IF NOT EXISTS idx_capacity_plans_period_start ON capacity_plans(period_start);
CREATE INDEX IF NOT EXISTS idx_capacity_plans_period_range ON capacity_plans(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_capacity_plans_source_document_id ON capacity_plans(source_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_capacity_plans_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_capacity_plans_updated_at
    BEFORE UPDATE ON capacity_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_capacity_plans_updated_at();

-- Add comments for documentation
COMMENT ON TABLE capacity_plans IS 'PMBOK Capacity Plans table storing team member capacity and resource allocation plans';
COMMENT ON COLUMN capacity_plans.team_member IS 'Name or identifier of the team member';
COMMENT ON COLUMN capacity_plans.role IS 'Role of the team member in the project';
COMMENT ON COLUMN capacity_plans.period_start IS 'Start date of the capacity planning period';
COMMENT ON COLUMN capacity_plans.period_end IS 'End date of the capacity planning period';
COMMENT ON COLUMN capacity_plans.available_hours IS 'Total hours available for the period';
COMMENT ON COLUMN capacity_plans.allocated_hours IS 'Hours allocated to project work';
COMMENT ON COLUMN capacity_plans.utilization_percentage IS 'Percentage of available hours allocated (0-100)';
COMMENT ON COLUMN capacity_plans.source_document IS 'Source document title where this capacity plan was extracted from';
COMMENT ON COLUMN capacity_plans.source_document_id IS 'Reference to the source document';
