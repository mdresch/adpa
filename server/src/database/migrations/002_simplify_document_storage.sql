-- Migration: Simplify Document Storage Format
-- Convert triple-nested JSON structure to simple markdown text
-- Date: 2025-10-04
-- Description: Migrate documents from complex JSON structure to simple markdown format

-- Step 1: Add backup column to preserve original content
ALTER TABLE documents ADD COLUMN content_backup JSONB;

-- Step 2: Backup existing content
UPDATE documents SET content_backup = content WHERE content IS NOT NULL;

-- Step 3: Extract markdown content from nested JSON structure
-- The structure is: {"html": "{\"html\":\"{\\\"text\\\":\\\"markdown content\\\"}\"}"}
-- We need to extract the innermost text content

UPDATE documents 
SET content = (
  CASE 
    WHEN content IS NOT NULL THEN
      -- Extract the innermost text content from the triple-nested JSON
      -- Handle the structure: content->'html' (string) -> parse as JSON -> 'html' (string) -> parse as JSON -> 'text'
      COALESCE(
        -- Try to extract from the nested structure
        ((content->'html'#>>'{}')::json->'html'#>>'{}')::json->>'text',
        -- Fallback: try simpler structure
        (content->'html'#>>'{}')::json->>'text',
        -- Fallback: try direct text
        content->>'text',
        -- Final fallback: convert entire content to string
        content::text
      )
    ELSE NULL
  END
)::TEXT::JSONB
WHERE content IS NOT NULL;

-- Step 4: Add content_html column for future HTML rendering
ALTER TABLE documents ADD COLUMN content_html TEXT;

-- Step 5: Create index on content for better performance
CREATE INDEX IF NOT EXISTS idx_documents_content ON documents USING gin(to_tsvector('english', COALESCE(content::text, '')));

-- Step 6: Add content_length column for quick token estimation
ALTER TABLE documents ADD COLUMN content_length INTEGER;

-- Step 7: Calculate content length for existing documents
UPDATE documents 
SET content_length = LENGTH(content::text) 
WHERE content IS NOT NULL;

-- Step 8: Create index on content_length for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_documents_content_length ON documents(content_length);


-- Step 9: Migration metadata handled by runner

-- Verification queries (commented out - run manually to verify)
-- SELECT name, LENGTH(content) as content_length, LEFT(content, 100) as preview 
-- FROM documents 
-- WHERE content IS NOT NULL 
-- LIMIT 5;

-- SELECT COUNT(*) as total_documents, 
--        COUNT(content) as documents_with_content,
--        AVG(LENGTH(content)) as avg_content_length
-- FROM documents;
