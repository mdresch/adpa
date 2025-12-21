-- Migration: Add project_iterations table for PMBOK Project Iterations
-- Created: 2025-12-20
-- Description: Creates project_iterations table to store project iterations, sprints, or program increments

CREATE TABLE IF NOT EXISTS project_iterations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    iteration_type VARCHAR(50) CHECK (iteration_type IN ('sprint', 'iteration', 'program_increment', 'release', 'phase')),
    sequence_number INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    goals TEXT[],
    planned_story_points INTEGER,
    completed_story_points INTEGER,
    velocity INTEGER,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    retrospective_summary TEXT,
    impediments TEXT[],
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_iterations_project_id ON project_iterations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_iterations_status ON project_iterations(status);
CREATE INDEX IF NOT EXISTS idx_project_iterations_start_date ON project_iterations(start_date);
CREATE INDEX IF NOT EXISTS idx_project_iterations_source_document_id ON project_iterations(source_document_id);
CREATE INDEX IF NOT EXISTS idx_project_iterations_sequence ON project_iterations(project_id, sequence_number);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_iterations_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_iterations_updated_at
    BEFORE UPDATE ON project_iterations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_iterations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE project_iterations IS 'PMBOK Project Iterations table storing project iterations, sprints, or program increments';
COMMENT ON COLUMN project_iterations.iteration_type IS 'Type of iteration (sprint, iteration, program_increment, release, phase)';
COMMENT ON COLUMN project_iterations.sequence_number IS 'Sequence number of the iteration within the project';
COMMENT ON COLUMN project_iterations.goals IS 'Array of goals for this iteration';
COMMENT ON COLUMN project_iterations.impediments IS 'Array of impediments encountered during this iteration';
COMMENT ON COLUMN project_iterations.status IS 'Current status of the iteration (planned, active, completed, cancelled)';
COMMENT ON COLUMN project_iterations.source_document IS 'Source document title where this iteration was extracted from';
COMMENT ON COLUMN project_iterations.source_document_id IS 'Reference to the source document';
