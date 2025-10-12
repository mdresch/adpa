-- Simple Document Migration to Neon
-- This script migrates documents from Docker PostgreSQL to Neon database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Begin transaction for safety
BEGIN;

-- Note: The actual INSERT statements will be added here
-- This is a template for the migration

-- For now, let's just verify the current state
SELECT 'Current documents in Neon:' as info, COUNT(*) as count FROM documents;

-- End transaction
COMMIT;
