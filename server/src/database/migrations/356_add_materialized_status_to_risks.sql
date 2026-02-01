-- Migration 356: Add 'materialized' to risks status constraint
-- Reason: Risk escalation to issue sets status to 'materialized', which was missing from the allowed values.

BEGIN;

-- Drop existing constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_status_check;

-- Re-create constraint with 'materialized' added
ALTER TABLE risks ADD CONSTRAINT risks_status_check 
  CHECK (status IN ('identified', 'assessed', 'mitigated', 'closed', 'active', 'monitoring', 'materialized'));

-- Update comment
COMMENT ON CONSTRAINT risks_status_check ON risks IS 'Risk status: identified, assessed, mitigated, closed, active, monitoring, materialized';

COMMIT;
