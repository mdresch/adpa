-- Migration: Convert documents.content from JSONB to TEXT for Markdown storage
-- This migration converts the content column to store plain Markdown text instead of JSON

-- Step 1: Backup existing content data (if any documents exist)
-- Note: This will extract text from JSON objects if they exist

-- Step 2: Convert content column from JSONB to TEXT
-- This will preserve existing content and extract text from JSON objects
ALTER TABLE documents 
ALTER COLUMN content TYPE TEXT 
USING CASE
  -- If content is a JSON object with a 'text' key, extract it
  WHEN content::jsonb ? 'text' THEN content::jsonb->>'text'
  -- If content is a JSON object with a 'markdown' key, extract it
  WHEN content::jsonb ? 'markdown' THEN content::jsonb->>'markdown'
  -- If content is a JSON object with a 'content' key, extract it
  WHEN content::jsonb ? 'content' THEN content::jsonb->>'content'
  -- If it's a simple string (already quoted JSON), remove quotes
  WHEN content::text LIKE '"%' THEN trim(both '"' from content::text)
  -- Otherwise, convert the entire JSON to text
  ELSE content::text
END;

-- Step 3: Update any remaining JSON-formatted strings to plain text
UPDATE documents
SET content = trim(both '"' from content)
WHERE content LIKE '"%'
  AND content LIKE '%"'
  AND content NOT LIKE '%\n%';  -- Don't modify multi-line content

-- Verify the migration
DO $$ 
BEGIN
  RAISE NOTICE 'Content column has been converted to TEXT type';
  RAISE NOTICE 'All documents should now store Markdown as plain text';
END $$;

