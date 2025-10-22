-- Add context columns to jobs table for better job identification
-- Migration: 080_add_job_context_columns.sql

-- Add project_id column (FK to projects)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add project_name column for display (denormalized for performance)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);

-- Add template_name column for display
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);

-- Add document_name column for display
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

-- Create index for faster project-based job lookups
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id) WHERE project_id IS NOT NULL;

-- Create index for faster job searches by name
CREATE INDEX IF NOT EXISTS idx_jobs_project_name ON jobs(project_name) WHERE project_name IS NOT NULL;

COMMENT ON COLUMN jobs.project_id IS 'Foreign key to projects table for job context';
COMMENT ON COLUMN jobs.project_name IS 'Denormalized project name for display purposes';
COMMENT ON COLUMN jobs.template_name IS 'Template name for document generation jobs';
COMMENT ON COLUMN jobs.document_name IS 'Document name for document processing jobs';

