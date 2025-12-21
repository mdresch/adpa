-- Migration: Add performance_actuals table for PMBOK Performance Tracking
-- Created: 2025-12-20
-- Description: Creates performance_actuals table to store actual performance data for project entities

CREATE TABLE IF NOT EXISTS performance_actuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('milestone', 'deliverable', 'activity', 'phase', 'resource')),
    entity_id UUID,
    entity_name VARCHAR(255) NOT NULL,
    planned_start_date TIMESTAMP WITH TIME ZONE,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    planned_end_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    planned_cost NUMERIC,
    actual_cost NUMERIC,
    planned_progress_percent INTEGER CHECK (planned_progress_percent BETWEEN 0 AND 100),
    actual_progress_percent INTEGER CHECK (actual_progress_percent BETWEEN 0 AND 100),
    quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 10),
    defects_found INTEGER DEFAULT 0,
    rework_hours INTEGER DEFAULT 0,
    notes TEXT,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_performance_actuals_project_id ON performance_actuals(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_entity_type ON performance_actuals(entity_type);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_entity_name ON performance_actuals(entity_name);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_entity_id ON performance_actuals(entity_id);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_date_range ON performance_actuals(project_id, actual_start_date, actual_end_date);
CREATE INDEX IF NOT EXISTS idx_performance_actuals_source_document_id ON performance_actuals(source_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_performance_actuals_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_performance_actuals_updated_at
    BEFORE UPDATE ON performance_actuals
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_actuals_updated_at();

-- Add comments for documentation
COMMENT ON TABLE performance_actuals IS 'PMBOK Performance Actuals table storing actual performance data for project entities';
COMMENT ON COLUMN performance_actuals.entity_type IS 'Type of entity being tracked (milestone, deliverable, activity, phase, resource)';
COMMENT ON COLUMN performance_actuals.entity_id IS 'Reference ID of the entity being tracked (if available)';
COMMENT ON COLUMN performance_actuals.entity_name IS 'Name of the entity being tracked (cached for reporting)';
COMMENT ON COLUMN performance_actuals.planned_start_date IS 'Planned start date of the entity';
COMMENT ON COLUMN performance_actuals.actual_start_date IS 'Actual start date of the entity';
COMMENT ON COLUMN performance_actuals.planned_end_date IS 'Planned end date of the entity';
COMMENT ON COLUMN performance_actuals.actual_end_date IS 'Actual end date of the entity';
COMMENT ON COLUMN performance_actuals.planned_cost IS 'Planned cost for the entity';
COMMENT ON COLUMN performance_actuals.actual_cost IS 'Actual cost incurred for the entity';
COMMENT ON COLUMN performance_actuals.planned_progress_percent IS 'Planned progress percentage (0-100)';
COMMENT ON COLUMN performance_actuals.actual_progress_percent IS 'Actual progress percentage (0-100)';
COMMENT ON COLUMN performance_actuals.quality_score IS 'Quality score of the completed work (0-10)';
COMMENT ON COLUMN performance_actuals.defects_found IS 'Number of defects found during quality review';
COMMENT ON COLUMN performance_actuals.rework_hours IS 'Hours spent on rework';
COMMENT ON COLUMN performance_actuals.source_document IS 'Source document title where this performance data was extracted from';
COMMENT ON COLUMN performance_actuals.source_document_id IS 'Reference to the source document';
