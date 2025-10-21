-- Migration: Add sentence_count and paragraph_count to documents table
-- CR-2026-001: Content Metrics Enhancement
-- Date: 2025-10-21

-- Add sentence_count column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'sentence_count') THEN
        ALTER TABLE documents ADD COLUMN sentence_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add paragraph_count column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'paragraph_count') THEN
        ALTER TABLE documents ADD COLUMN paragraph_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create index for better performance on content metrics
CREATE INDEX IF NOT EXISTS idx_documents_content_metrics 
ON documents(word_count, character_count, sentence_count, paragraph_count);

-- Add comment
COMMENT ON COLUMN documents.sentence_count IS 'Number of sentences in document content (calculated from periods, exclamation marks, question marks)';
COMMENT ON COLUMN documents.paragraph_count IS 'Number of paragraphs in document content (calculated from double line breaks)';

