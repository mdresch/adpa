-- Migration: Make role_id nullable in project_resource_assignments for extraction
-- Fix for resource_assignments entity extraction
-- The extraction service doesn't have role_id information, so make it nullable

DO $$
BEGIN
    -- Check if the column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' 
          AND column_name = 'role_id' 
          AND is_nullable = 'NO'
    ) THEN
        -- Make role_id nullable to support extraction without role information
        ALTER TABLE project_resource_assignments ALTER COLUMN role_id DROP NOT NULL;
        COMMENT ON COLUMN project_resource_assignments.role_id IS 'Role ID (nullable for extraction purposes)';
    END IF;
END$$;

-- Also make hourly_rate nullable with a default
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' 
          AND column_name = 'hourly_rate' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE project_resource_assignments ALTER COLUMN hourly_rate DROP NOT NULL;
        ALTER TABLE project_resource_assignments ALTER COLUMN hourly_rate SET DEFAULT 0.00;
        COMMENT ON COLUMN project_resource_assignments.hourly_rate IS 'Hourly rate (nullable with default for extraction)';
    END IF;
END$$;

-- Make start_date nullable for extraction
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' 
          AND column_name = 'start_date' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE project_resource_assignments ALTER COLUMN start_date DROP NOT NULL;
        COMMENT ON COLUMN project_resource_assignments.start_date IS 'Start date (nullable for extraction)';
    END IF;
END$$;

-- Make user_id nullable for extraction (using resource_id instead)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_resource_assignments' 
          AND column_name = 'user_id' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE project_resource_assignments ALTER COLUMN user_id DROP NOT NULL;
        COMMENT ON COLUMN project_resource_assignments.user_id IS 'User ID (nullable for extraction, can use resource_id)';
    END IF;
END$$;
