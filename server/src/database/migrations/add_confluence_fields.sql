-- Migration: Add Confluence integration fields
-- This migration adds the required columns for Confluence import/export functionality

-- Add metadata column to projects table (for storing Confluence space metadata)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add created_by column to projects table (for tracking who created the project)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add framework column to documents table (for identifying document source)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS framework VARCHAR(50);

-- Add metadata column to documents table (for storing Confluence page metadata)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index on metadata columns for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON projects USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_documents_framework ON documents (framework);

-- Create index on created_by for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects (created_by);
