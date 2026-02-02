-- Migration to create the lessons_learned table
-- This schema is based on the initial requirements for the Lessons Learned feature.

BEGIN;

-- Drop the table if it exists to ensure a clean slate
DROP TABLE IF EXISTS lessons_learned CASCADE;

-- Create the lessons_learned table
CREATE TABLE lessons_learned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    impact VARCHAR(50) CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    positive_or_negative BOOLEAN,
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    source_document VARCHAR(255),
    source_section VARCHAR(255),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lessons_learned_project_id ON lessons_learned(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_category ON lessons_learned(category);

-- Trigger to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lessons_learned_updated_at
BEFORE UPDATE ON lessons_learned
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

COMMIT;
