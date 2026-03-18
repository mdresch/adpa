-- Migration: Add correlation_id to projects and document_versions
-- This migration adds a correlation_id column to the projects and document_versions
-- tables to improve traceability and auditing of creation/update events.

BEGIN;

-- Add correlation_id to the projects table
ALTER TABLE "projects"
ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);

-- Add correlation_id to the document_versions table
ALTER TABLE "document_versions"
ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(100);

-- Optional: Add indexes for faster lookups on correlation_id
CREATE INDEX IF NOT EXISTS idx_projects_correlation_id ON "projects" ("correlation_id");
CREATE INDEX IF NOT EXISTS idx_document_versions_correlation_id ON "document_versions" ("correlation_id");

COMMIT;
