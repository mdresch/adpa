-- Migration: Create iBabs Action Items Table
-- Description: Stores action items synced from iBabs board meetings
-- Author: ADPA Team
-- Date: 2025-10-25

BEGIN;

-- Create pgcrypto extension if not exists (for UUID generation)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create ibabs_action_items table
CREATE TABLE IF NOT EXISTS ibabs_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ibabs_id VARCHAR(255) NOT NULL UNIQUE,
    meeting_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ibabs_action_items_meeting_id ON ibabs_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_ibabs_action_items_status ON ibabs_action_items(status);
CREATE INDEX IF NOT EXISTS idx_ibabs_action_items_due_date ON ibabs_action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_ibabs_action_items_assigned_to ON ibabs_action_items(assigned_to);

-- Add comments
COMMENT ON TABLE ibabs_action_items IS 'Action items synced from iBabs board meetings';
COMMENT ON COLUMN ibabs_action_items.id IS 'Internal UUID for the action item';
COMMENT ON COLUMN ibabs_action_items.ibabs_id IS 'External iBabs action item ID';
COMMENT ON COLUMN ibabs_action_items.meeting_id IS 'iBabs meeting ID this action item belongs to';
COMMENT ON COLUMN ibabs_action_items.title IS 'Action item title';
COMMENT ON COLUMN ibabs_action_items.description IS 'Detailed description of the action item';
COMMENT ON COLUMN ibabs_action_items.assigned_to IS 'Person or team assigned to the action item';
COMMENT ON COLUMN ibabs_action_items.due_date IS 'Due date for completion';
COMMENT ON COLUMN ibabs_action_items.status IS 'Current status (open, in_progress, completed, closed)';
COMMENT ON COLUMN ibabs_action_items.created_at IS 'Timestamp when action item was synced';
COMMENT ON COLUMN ibabs_action_items.updated_at IS 'Timestamp when action item was last updated';

COMMIT;

-- DOWN migration
-- To rollback, run:
-- BEGIN;
-- DROP TABLE IF EXISTS ibabs_action_items;
-- COMMIT;
