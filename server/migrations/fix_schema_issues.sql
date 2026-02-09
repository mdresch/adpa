-- Migration: Fix Schema Issues
-- Date: 2026-02-07
-- Description: Adds missing columns and fixes constraints based on extraction errors

-- 1. Fix risk_triggers table - add missing response_action column
ALTER TABLE risk_triggers 
ADD COLUMN IF NOT EXISTS response_action TEXT;

COMMENT ON COLUMN risk_triggers.response_action IS 'Action to take when trigger is activated';

-- 2. Fix resources table - add missing availability_pct column
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS availability_pct NUMERIC(5,2) DEFAULT 100.00;

COMMENT ON COLUMN resources.availability_pct IS 'Resource availability percentage (0-100)';

-- Add constraint to ensure valid percentage
ALTER TABLE resources 
DROP CONSTRAINT IF EXISTS resources_availability_pct_check;

ALTER TABLE resources 
ADD CONSTRAINT resources_availability_pct_check 
CHECK (availability_pct >= 0 AND availability_pct <= 100);

-- 3. Fix resource_conflicts table - add missing resolution column
ALTER TABLE resource_conflicts 
ADD COLUMN IF NOT EXISTS resolution TEXT;

COMMENT ON COLUMN resource_conflicts.resolution IS 'Resolution details for the conflict';

-- 4. Fix stakeholder_issues table - make reported_date nullable
ALTER TABLE stakeholder_issues 
ALTER COLUMN reported_date DROP NOT NULL;

COMMENT ON COLUMN stakeholder_issues.reported_date IS 'Date when issue was reported (nullable for draft issues)';

-- 5. Fix engagement_actions table - expand action_type check constraint
-- First, check what the current constraint allows
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    -- Get current constraint definition
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conname = 'engagement_actions_action_type_check'
    AND conrelid = 'engagement_actions'::regclass;
    
    -- Drop existing constraint
    IF constraint_def IS NOT NULL THEN
        ALTER TABLE engagement_actions DROP CONSTRAINT engagement_actions_action_type_check;
    END IF;
END $$;

-- Add expanded constraint with more action types
ALTER TABLE engagement_actions 
ADD CONSTRAINT engagement_actions_action_type_check 
CHECK (action_type IN (
    'meeting',
    'email',
    'presentation',
    'workshop',
    'survey',
    'interview',
    'focus_group',
    'newsletter',
    'report',
    'briefing',
    'consultation',
    'feedback_session',
    'town_hall',
    'webinar',
    'training',
    'demo',
    'review',
    'update',
    'announcement',
    'other'
));

COMMENT ON CONSTRAINT engagement_actions_action_type_check ON engagement_actions IS 'Allowed engagement action types';

-- 6. Add indexes for better query performance on new columns
CREATE INDEX IF NOT EXISTS idx_risk_triggers_response_action 
ON risk_triggers(response_action) 
WHERE response_action IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_availability_pct 
ON resources(availability_pct);

CREATE INDEX IF NOT EXISTS idx_resource_conflicts_resolution 
ON resource_conflicts(resolution) 
WHERE resolution IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stakeholder_issues_reported_date 
ON stakeholder_issues(reported_date) 
WHERE reported_date IS NOT NULL;

-- 7. Update any existing NULL values with defaults where appropriate
UPDATE resources 
SET availability_pct = 100.00 
WHERE availability_pct IS NULL;

-- Print summary
DO $$
BEGIN
    RAISE NOTICE '✅ Schema fixes applied successfully:';
    RAISE NOTICE '   - Added response_action to risk_triggers';
    RAISE NOTICE '   - Added availability_pct to resources';
    RAISE NOTICE '   - Added resolution to resource_conflicts';
    RAISE NOTICE '   - Made reported_date nullable in stakeholder_issues';
    RAISE NOTICE '   - Expanded engagement_actions action_type constraint';
    RAISE NOTICE '   - Created performance indexes';
END $$;
