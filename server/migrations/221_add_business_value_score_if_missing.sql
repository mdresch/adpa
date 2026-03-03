-- Migration: Add business_value_score column if missing
-- Purpose: Ensure knowledge_base_entries has business_value_score column
-- Date: 2026-03-03

BEGIN;

-- Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'knowledge_base_entries' 
        AND column_name = 'business_value_score'
    ) THEN
        ALTER TABLE knowledge_base_entries 
        ADD COLUMN business_value_score DECIMAL(3,2) 
        CHECK (business_value_score >= 0 AND business_value_score <= 1);
        
        -- Add index if it doesn't exist
        CREATE INDEX IF NOT EXISTS idx_kb_entries_business_value 
        ON knowledge_base_entries(business_value_score);
    END IF;
END $$;

COMMIT;
