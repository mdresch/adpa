-- Fix documents_raw table to auto-generate UUIDs
-- This allows inserts without explicitly providing an id

ALTER TABLE documents_raw 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change
\d documents_raw
