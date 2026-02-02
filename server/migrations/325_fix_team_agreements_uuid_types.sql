-- Migration: Fix team_agreements agreed_by and facilitated_by types to UUID
-- Purpose: Change agreed_by from TEXT[] to UUID[] and facilitated_by from TEXT to UUID
-- Follows ADPA migration conventions (see 050_create_projects_table.sql)

BEGIN;

-- Ensure uuid-ossp/pgcrypto extensions for UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Add new columns with correct types
ALTER TABLE team_agreements ADD COLUMN IF NOT EXISTS agreed_by_uuid UUID[];
ALTER TABLE team_agreements ADD COLUMN IF NOT EXISTS facilitated_by_uuid UUID;

-- 2. Migrate data from TEXT[]/TEXT to UUID[]/UUID (skip invalid UUIDs)

UPDATE team_agreements
SET agreed_by_uuid = (
  SELECT COALESCE(array_agg(val::uuid), '{}')
  FROM jsonb_array_elements_text(agreed_by) AS val
  WHERE val ~* '^[0-9a-fA-F-]{36}$'
),
facilitated_by_uuid = CASE
  WHEN facilitated_by ~* '^[0-9a-fA-F-]{36}$' THEN facilitated_by::uuid
  ELSE NULL
END;

-- 3. Drop old columns and rename new ones
ALTER TABLE team_agreements DROP COLUMN IF EXISTS agreed_by;
ALTER TABLE team_agreements DROP COLUMN IF EXISTS facilitated_by;
ALTER TABLE team_agreements RENAME COLUMN agreed_by_uuid TO agreed_by;
ALTER TABLE team_agreements RENAME COLUMN facilitated_by_uuid TO facilitated_by;

-- 4. Add comments and indexes
COMMENT ON COLUMN team_agreements.agreed_by IS 'Array of user UUIDs who agreed';
COMMENT ON COLUMN team_agreements.facilitated_by IS 'User UUID who facilitated the agreement';
CREATE INDEX IF NOT EXISTS idx_team_agreements_agreed_by ON team_agreements USING GIN(agreed_by);

COMMIT;

-- DOWN migration
-- Revert to TEXT[] and TEXT columns, migrate data back as strings
-- (Note: This will lose invalid UUIDs that were previously present)

-- To reverse, wrap in BEGIN/COMMIT and reverse the above steps.
