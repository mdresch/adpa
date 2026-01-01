-- Fix constraints for document_versions table
-- Updates the change_type check constraint to include all used values and cleans up data

DO $$
BEGIN
    -- 1. Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'document_versions_change_type_check'
        AND table_name = 'document_versions'
    ) THEN
        ALTER TABLE document_versions DROP CONSTRAINT document_versions_change_type_check;
    END IF;

    -- 2. Clean up data: Normalize 'initial_version' to 'initial'
    UPDATE document_versions
    SET change_type = 'initial'
    WHERE change_type = 'initial_version';

    -- 3. Clean up data: Normalize any other unknown values to 'initial'
    UPDATE document_versions
    SET change_type = 'initial'
    WHERE change_type NOT IN ('initial', 'ai_regeneration', 'manual_edit', 'template_update', 'rollback', 'baseline_sync', 'current')
    OR change_type IS NULL;

    -- 4. Add the correct constraint
    ALTER TABLE document_versions
    ADD CONSTRAINT document_versions_change_type_check
    CHECK (change_type IN ('initial', 'ai_regeneration', 'manual_edit', 'template_update', 'rollback', 'baseline_sync', 'current'));
    
END $$;
