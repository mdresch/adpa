-- Fix missing columns in templates and document_versions tables
-- Adds conflict resolution and governance fields to templates
-- Adds detailed versioning fields to document_versions

DO $$
BEGIN
    -- Fix templates table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'conflict_resolution_strategy') THEN
            ALTER TABLE templates ADD COLUMN conflict_resolution_strategy VARCHAR(50) DEFAULT 'prompt_user';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'governance_level') THEN
            ALTER TABLE templates ADD COLUMN governance_level VARCHAR(50) DEFAULT 'standard';
        END IF;
    END IF;

    -- Fix document_versions table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_versions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'content_hash') THEN
            ALTER TABLE document_versions ADD COLUMN content_hash VARCHAR(64);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'change_description') THEN
            ALTER TABLE document_versions ADD COLUMN change_description TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'parent_version_id') THEN
            ALTER TABLE document_versions ADD COLUMN parent_version_id UUID REFERENCES document_versions(id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'created_by') THEN
            ALTER TABLE document_versions ADD COLUMN created_by UUID REFERENCES users(id);
        END IF;

         IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'metadata') THEN
            ALTER TABLE document_versions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
    END IF;

END $$;
