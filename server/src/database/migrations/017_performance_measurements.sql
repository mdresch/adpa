-- Migration: Add performance_measurements table for PMBOK Performance Tracking
-- Created: 2025-12-20
-- Description: Creates performance_measurements table to store project performance metrics against success criteria

CREATE TABLE IF NOT EXISTS performance_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    success_criterion_name VARCHAR(255) NOT NULL,
    measurement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_value NUMERIC,
    target_value NUMERIC,
    units VARCHAR(50),
    variance NUMERIC,
    variance_percentage NUMERIC,
    trend VARCHAR(20) CHECK (trend IN ('improving', 'stable', 'declining')),
    status VARCHAR(50) DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'off_track')),
    notes TEXT,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_performance_measurements_project_id ON performance_measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_measurements_success_criterion ON performance_measurements(success_criterion_name);
CREATE INDEX IF NOT EXISTS idx_performance_measurements_measurement_date ON performance_measurements(measurement_date);
CREATE INDEX IF NOT EXISTS idx_performance_measurements_status ON performance_measurements(status);
CREATE INDEX IF NOT EXISTS idx_performance_measurements_source_document_id ON performance_measurements(source_document_id);
CREATE INDEX IF NOT EXISTS idx_performance_measurements_date_range ON performance_measurements(project_id, measurement_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_performance_measurements_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_performance_measurements_updated_at
    BEFORE UPDATE ON performance_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_measurements_updated_at();

-- Add comments for documentation
COMMENT ON TABLE performance_measurements IS 'PMBOK Performance Measurements table storing project performance metrics against success criteria';
COMMENT ON COLUMN performance_measurements.success_criterion_name IS 'Name of the success criterion being measured';
COMMENT ON COLUMN performance_measurements.measurement_date IS 'Date when the measurement was taken';
COMMENT ON COLUMN performance_measurements.actual_value IS 'Actual measured value';
COMMENT ON COLUMN performance_measurements.target_value IS 'Target value for the success criterion';
COMMENT ON COLUMN performance_measurements.units IS 'Units of measurement';
COMMENT ON COLUMN performance_measurements.variance IS 'Difference between actual and target values';
COMMENT ON COLUMN performance_measurements.variance_percentage IS 'Percentage variance from target';
COMMENT ON COLUMN performance_measurements.trend IS 'Trend of performance (improving, stable, declining)';
COMMENT ON COLUMN performance_measurements.status IS 'Current status of the measurement (on_track, at_risk, off_track)';
COMMENT ON COLUMN performance_measurements.source_document IS 'Source document title where this measurement was extracted from';
COMMENT ON COLUMN performance_measurements.source_document_id IS 'Reference to the source document';
