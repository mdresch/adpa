-- Migration: Add source_document_id to knowledge_base_entries
-- Purpose: Enable linking KB entries back to their source documents for upsert operations
-- Date: 2026-03-03

BEGIN;

-- ============================================================================
-- UP: Add source_document_id column
-- ============================================================================

DO $$ 
BEGIN 
    -- Check if source_document_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_base_entries' 
        AND column_name = 'source_document_id'
    ) THEN
        ALTER TABLE knowledge_base_entries 
        ADD COLUMN source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_kb_entries_source_document 
        ON knowledge_base_entries(source_document_id);
        
        RAISE NOTICE 'Added source_document_id column and index to knowledge_base_entries';
    ELSE
        RAISE NOTICE 'Column source_document_id already exists in knowledge_base_entries';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- DOWN: Remove source_document_id column
-- ============================================================================

-- Uncomment to rollback:
-- BEGIN;
--
-- DROP INDEX IF EXISTS idx_kb_entries_source_document;
-- ALTER TABLE knowledge_base_entries DROP COLUMN IF EXISTS source_document_id;
--
-- COMMIT;
