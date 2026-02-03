-- Migration: Add conflict_description column to resources table
-- Fix for resource_conflicts entity extraction
-- The extraction service tries to save resource_conflicts to the resources table but conflict_description column is missing

BEGIN;

-- Add conflict_description column to resources table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'conflict_description'
    ) THEN
        ALTER TABLE resources ADD COLUMN conflict_description TEXT;
        COMMENT ON COLUMN resources.conflict_description IS 'Description of resource conflict or scheduling issue';
    END IF;
END$$;

-- Also add conflict_type column for better categorization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'conflict_type'
    ) THEN
        ALTER TABLE resources ADD COLUMN conflict_type VARCHAR(50);
        COMMENT ON COLUMN resources.conflict_type IS 'Type of resource conflict (overallocation, scheduling, skill_gap, etc.)';
    END IF;
END$$;

-- Add conflict_severity column for priority tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'conflict_severity'
    ) THEN
        ALTER TABLE resources ADD COLUMN conflict_severity VARCHAR(20) DEFAULT 'low' CHECK (conflict_severity IN ('low', 'medium', 'high', 'critical'));
        COMMENT ON COLUMN resources.conflict_severity IS 'Severity level of the resource conflict';
    END IF;
END$$;

-- Add conflict_status column for tracking resolution
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'conflict_status'
    ) THEN
        ALTER TABLE resources ADD COLUMN conflict_status VARCHAR(20) DEFAULT 'open' CHECK (conflict_status IN ('open', 'in_progress', 'resolved', 'escalated'));
        COMMENT ON COLUMN resources.conflict_status IS 'Current status of the resource conflict resolution';
    END IF;
END$$;

-- Add index for better query performance on conflict-related queries
CREATE INDEX IF NOT EXISTS idx_resources_conflict_status ON resources(conflict_status) WHERE conflict_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_conflict_severity ON resources(conflict_severity) WHERE conflict_severity IS NOT NULL;

COMMIT;
