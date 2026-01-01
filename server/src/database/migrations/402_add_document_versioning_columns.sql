-- Add versioning columns to documents table
-- Ensures documents table has necessary columns for version tracking

DO $$
BEGIN
    -- Add version column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'version') THEN
        ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1;
    END IF;

    -- Add semantic_version column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'semantic_version') THEN
        ALTER TABLE documents ADD COLUMN semantic_version VARCHAR(50) DEFAULT '1.0.0';
    END IF;

    -- Add current_version_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'current_version_id') THEN
        ALTER TABLE documents ADD COLUMN current_version_id UUID REFERENCES document_versions(id);
    END IF;
END $$;
