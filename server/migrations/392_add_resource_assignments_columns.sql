-- Migration: Add allocation_pct column to project_resource_assignments table
-- Fix for resource_assignments entity extraction
-- The extraction service tries to save allocation_pct but table has allocation_percentage

-- Add allocation_pct column to project_resource_assignments table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' AND column_name = 'allocation_pct'
    ) THEN
        ALTER TABLE project_resource_assignments ADD COLUMN allocation_pct DECIMAL(5,2);
        COMMENT ON COLUMN project_resource_assignments.allocation_pct IS 'Resource allocation percentage (alias for allocation_percentage)';
    END IF;
END$$;

-- Also add missing columns that the extraction service expects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' AND column_name = 'resource_name'
    ) THEN
        ALTER TABLE project_resource_assignments ADD COLUMN resource_name VARCHAR(255);
        COMMENT ON COLUMN project_resource_assignments.resource_name IS 'Name of the assigned resource';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' AND column_name = 'activity_id'
    ) THEN
        ALTER TABLE project_resource_assignments ADD COLUMN activity_id UUID;
        COMMENT ON COLUMN project_resource_assignments.activity_id IS 'ID of the assigned activity';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' AND column_name = 'activity_name'
    ) THEN
        ALTER TABLE project_resource_assignments ADD COLUMN activity_name VARCHAR(255);
        COMMENT ON COLUMN project_resource_assignments.activity_name IS 'Name of the assigned activity';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' AND column_name = 'skill_required'
    ) THEN
        ALTER TABLE project_resource_assignments ADD COLUMN skill_required VARCHAR(255);
        COMMENT ON COLUMN project_resource_assignments.skill_required IS 'Skill required for this assignment';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' AND column_name = 'skill_level'
    ) THEN
        ALTER TABLE project_resource_assignments ADD COLUMN skill_level VARCHAR(50);
        COMMENT ON COLUMN project_resource_assignments.skill_level IS 'Skill level required';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' AND column_name = 'source_document_id'
    ) THEN
        ALTER TABLE project_resource_assignments ADD COLUMN source_document_id UUID;
        COMMENT ON COLUMN project_resource_assignments.source_document_id IS 'Source document for extraction tracking';
    END IF;
END$$;

-- Add index for better query performance on new columns
CREATE INDEX IF NOT EXISTS idx_project_resource_assignments_activity_id ON project_resource_assignments(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_resource_assignments_source_document ON project_resource_assignments(source_document_id) WHERE source_document_id IS NOT NULL;
