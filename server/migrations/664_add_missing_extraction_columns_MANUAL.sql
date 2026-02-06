-- Migration 664: Add missing columns for entity extraction
-- Run this in your database client (Supabase SQL editor, pgAdmin, etc.)

-- 1. Add health_score to relationship_health
ALTER TABLE relationship_health 
ADD COLUMN IF NOT EXISTS health_score DECIMAL(3,2) DEFAULT 0.0;

COMMENT ON COLUMN relationship_health.health_score IS 'Health score for the relationship (0.0 to 1.0)';

-- 2. Add risk_title to risk_triggers
ALTER TABLE risk_triggers 
ADD COLUMN IF NOT EXISTS risk_title TEXT;

COMMENT ON COLUMN risk_triggers.risk_title IS 'Title of the associated risk';

-- 3. Make action_id nullable in engagement_actions
ALTER TABLE engagement_actions 
ALTER COLUMN action_id DROP NOT NULL;

-- Set default UUID for existing NULL values
UPDATE engagement_actions 
SET action_id = gen_random_uuid() 
WHERE action_id IS NULL;

-- 4. Add action_type to onboarding_offboarding
ALTER TABLE onboarding_offboarding 
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);

COMMENT ON COLUMN onboarding_offboarding.action_type IS 'Type of action: onboarding or offboarding';

-- 5. Make issue_id nullable in stakeholder_issues
ALTER TABLE stakeholder_issues 
ALTER COLUMN issue_id DROP NOT NULL;

-- Set default UUID for existing NULL values
UPDATE stakeholder_issues 
SET issue_id = gen_random_uuid() 
WHERE issue_id IS NULL;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_relationship_health_score ON relationship_health(health_score);
CREATE INDEX IF NOT EXISTS idx_risk_triggers_title ON risk_triggers(risk_title);
CREATE INDEX IF NOT EXISTS idx_engagement_actions_action_id ON engagement_actions(action_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_offboarding_action_type ON onboarding_offboarding(action_type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_issues_issue_id ON stakeholder_issues(issue_id);

-- Verification query
SELECT 
    'relationship_health' as table_name, 
    COUNT(*) FILTER (WHERE column_name = 'health_score') as column_exists
FROM information_schema.columns 
WHERE table_name = 'relationship_health'
UNION ALL
SELECT 
    'risk_triggers', 
    COUNT(*) FILTER (WHERE column_name = 'risk_title')
FROM information_schema.columns 
WHERE table_name = 'risk_triggers'
UNION ALL
SELECT 
    'engagement_actions', 
    COUNT(*) FILTER (WHERE column_name = 'action_id' AND is_nullable = 'YES')
FROM information_schema.columns 
WHERE table_name = 'engagement_actions'
UNION ALL
SELECT 
    'onboarding_offboarding', 
    COUNT(*) FILTER (WHERE column_name = 'action_type')
FROM information_schema.columns 
WHERE table_name = 'onboarding_offboarding'
UNION ALL
SELECT 
    'stakeholder_issues', 
    COUNT(*) FILTER (WHERE column_name = 'issue_id' AND is_nullable = 'YES')
FROM information_schema.columns 
WHERE table_name = 'stakeholder_issues';
