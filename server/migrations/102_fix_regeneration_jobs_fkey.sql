-- Migration 102: Fix regeneration_jobs foreign key constraint
-- Change new_version_id to reference documents table instead of document_versions

-- Step 1: Clear old references to document_versions (they're orphaned now)
UPDATE regeneration_jobs 
SET new_version_id = NULL 
WHERE new_version_id IS NOT NULL;

-- Step 2: Drop the old constraint
ALTER TABLE regeneration_jobs 
DROP CONSTRAINT IF EXISTS regeneration_jobs_new_version_id_fkey;

-- Step 3: Add new constraint referencing documents table
ALTER TABLE regeneration_jobs 
ADD CONSTRAINT regeneration_jobs_new_version_id_fkey 
FOREIGN KEY (new_version_id) 
REFERENCES documents(id) 
ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN regeneration_jobs.new_version_id IS 'References the new document created (documents.id, not document_versions.id)';

