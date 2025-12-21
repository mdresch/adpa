-- Migration: Add work_items table for PMBOK Work Items
-- Created: 2025-12-20
-- Description: Creates work_items table to store individual work items, tasks, or backlog items

CREATE TABLE IF NOT EXISTS work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    activity_name VARCHAR(255),
    assigned_to VARCHAR(255),
    estimated_hours INTEGER,
    actual_hours INTEGER,
    progress_percentage INTEGER CHECK (progress_percentage BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
    blockers TEXT[],
    completed_date TIMESTAMP WITH TIME ZONE,
    source_document VARCHAR(255),
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_items_project_id ON work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to ON work_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_items_completed_date ON work_items(completed_date);
CREATE INDEX IF NOT EXISTS idx_work_items_source_document_id ON work_items(source_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_items_updated_at()
RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_items_updated_at
    BEFORE UPDATE ON work_items
    FOR EACH ROW
    EXECUTE FUNCTION update_work_items_updated_at();

-- Add comments for documentation
COMMENT ON TABLE work_items IS 'PMBOK Work Items table storing individual work items, tasks, or backlog items';
COMMENT ON COLUMN work_items.status IS 'Current status of the work item (todo, in_progress, review, done, blocked)';
COMMENT ON COLUMN work_items.blockers IS 'Array of blockers preventing completion of this work item';
COMMENT ON COLUMN work_items.progress_percentage IS 'Percentage completion of the work item (0-100)';
COMMENT ON COLUMN work_items.source_document IS 'Source document title where this work item was extracted from';
COMMENT ON COLUMN work_items.source_document_id IS 'Reference to the source document';
