-- Migration to fix extraction errors - Additional missing columns
-- Date: 2026-02-07
-- Description: Adds columns missing from the previous migration based on latest extraction errors

-- 1. satisfaction_surveys: add sentiment column
ALTER TABLE satisfaction_surveys 
ADD COLUMN IF NOT EXISTS sentiment text;

-- 2. resource_conflicts: add resolution_date column  
ALTER TABLE resource_conflicts 
ADD COLUMN IF NOT EXISTS resolution_date date;

-- 3. resources: add cost_rate column
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS cost_rate numeric(10,2);

-- 4. onboarding_offboarding: add end_date column
ALTER TABLE onboarding_offboarding 
ADD COLUMN IF NOT EXISTS end_date date;

-- 5. Update check constraints to allow new values

-- stakeholder_issues: expand issue_category constraint
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE stakeholder_issues 
    DROP CONSTRAINT IF EXISTS stakeholder_issues_issue_category_check;
    
    -- Add new constraint with expanded values
    ALTER TABLE stakeholder_issues 
    ADD CONSTRAINT stakeholder_issues_issue_category_check 
    CHECK (issue_category IN (
        'communication', 
        'expectations', 
        'resources', 
        'scope', 
        'timeline',
        'budget',
        'quality',
        'risk',
        'governance',
        'technical',
        'stakeholder',
        'other'
    ));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update stakeholder_issues constraint: %', SQLERRM;
END $$;

-- engagement_actions: expand action_type constraint
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE engagement_actions 
    DROP CONSTRAINT IF EXISTS engagement_actions_action_type_check;
    
    -- Add new constraint with expanded values
    ALTER TABLE engagement_actions 
    ADD CONSTRAINT engagement_actions_action_type_check 
    CHECK (action_type IN (
        'meeting', 
        'email', 
        'presentation', 
        'workshop', 
        'survey',
        'report',
        'review',
        'training',
        'consultation',
        'feedback',
        'communication',
        'engagement',
        'other'
    ));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update engagement_actions constraint: %', SQLERRM;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_sentiment 
ON satisfaction_surveys(sentiment);

CREATE INDEX IF NOT EXISTS idx_resource_conflicts_resolution_date 
ON resource_conflicts(resolution_date);

CREATE INDEX IF NOT EXISTS idx_resources_cost_rate 
ON resources(cost_rate);

CREATE INDEX IF NOT EXISTS idx_onboarding_offboarding_end_date 
ON onboarding_offboarding(end_date);

-- Add comments for documentation
COMMENT ON COLUMN satisfaction_surveys.sentiment IS 'Sentiment analysis result (positive, negative, neutral)';
COMMENT ON COLUMN resource_conflicts.resolution_date IS 'Date when the resource conflict was resolved';
COMMENT ON COLUMN resources.cost_rate IS 'Cost rate per unit for the resource';
COMMENT ON COLUMN onboarding_offboarding.end_date IS 'End date for onboarding/offboarding process';

-- Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN (
    'satisfaction_surveys',
    'resource_conflicts',
    'resources',
    'onboarding_offboarding',
    'stakeholder_issues',
    'engagement_actions'
)
AND column_name IN (
    'sentiment',
    'resolution_date',
    'cost_rate',
    'end_date',
    'issue_category',
    'action_type'
)
ORDER BY table_name, column_name;
