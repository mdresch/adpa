-- ADPA Document Migration: Docker PostgreSQL to Neon
-- This script migrates all documents from Docker to Neon database
-- Run this script in your Neon database after ensuring connection

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a temporary function to handle document migration
CREATE OR REPLACE FUNCTION migrate_documents_from_docker()
RETURNS TEXT AS $$
DECLARE
    doc_count INTEGER;
    migrated_count INTEGER := 0;
BEGIN
    -- Count current documents in Neon
    SELECT COUNT(*) INTO doc_count FROM documents;
    RAISE NOTICE 'Current documents in Neon: %', doc_count;
    
    -- Note: The actual INSERT statements will be generated from Docker export
    -- This function serves as a template for the migration process
    
    RETURN 'Migration function created. Ready for document import.';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT migrate_documents_from_docker();

-- Clean up the function
DROP FUNCTION migrate_documents_from_docker();
