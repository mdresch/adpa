-- Migration: Add earned_value_metrics table for PMBOK Earned Value Management
-- Created: 2025-12-20
-- Description: Creates earned_value_metrics table to store earned value management metrics

CREATE TABLE IF NOT EXISTS earned_value_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    measurement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_value NUMERIC,
    earned_value NUMERIC,
    actual_cost NUMERIC,
    schedule_variance NUMERIC,
    cost_variance NUMERIC,
    schedule_performance_index NUMERIC,
    cost_performance_index NUMERIC,
    estimate_at_completion NUMERIC,
    estimate_to_complete NUMERIC,
    notes TEXT,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_earned_value_metrics_project_id ON earned_value_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_earned_value_metrics_measurement_date ON earned_value_metrics(measurement_date);
CREATE INDEX IF NOT EXISTS idx_earned_value_metrics_source_document_id ON earned_value_metrics(source_document_id);
CREATE INDEX IF NOT EXISTS idx_earned_value_metrics_date_range ON earned_value_metrics(project_id, measurement_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_earned_value_metrics_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_earned_value_metrics_updated_at
    BEFORE UPDATE ON earned_value_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_earned_value_metrics_updated_at();

-- Add comments for documentation
COMMENT ON TABLE earned_value_metrics IS 'PMBOK Earned Value Metrics table storing earned value management metrics';
COMMENT ON COLUMN earned_value_metrics.measurement_date IS 'Date when the earned value metrics were calculated';
COMMENT ON COLUMN earned_value_metrics.planned_value IS 'Planned Value (PV) - Budgeted cost of work scheduled';
COMMENT ON COLUMN earned_value_metrics.earned_value IS 'Earned Value (EV) - Budgeted cost of work performed';
COMMENT ON COLUMN earned_value_metrics.actual_cost IS 'Actual Cost (AC) - Actual cost of work performed';
COMMENT ON COLUMN earned_value_metrics.schedule_variance IS 'Schedule Variance (SV) = EV - PV';
COMMENT ON COLUMN earned_value_metrics.cost_variance IS 'Cost Variance (CV) = EV - AC';
COMMENT ON COLUMN earned_value_metrics.schedule_performance_index IS 'Schedule Performance Index (SPI) = EV / PV';
COMMENT ON COLUMN earned_value_metrics.cost_performance_index IS 'Cost Performance Index (CPI) = EV / AC';
COMMENT ON COLUMN earned_value_metrics.estimate_at_completion IS 'Estimate at Completion (EAC)';
COMMENT ON COLUMN earned_value_metrics.estimate_to_complete IS 'Estimate to Complete (ETC)';
COMMENT ON COLUMN earned_value_metrics.source_document IS 'Source document title where these metrics were extracted from';
COMMENT ON COLUMN earned_value_metrics.source_document_id IS 'Reference to the source document';
