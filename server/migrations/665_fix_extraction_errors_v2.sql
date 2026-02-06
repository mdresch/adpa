-- Migration 665 v2: Fix extraction errors (with data cleanup)
-- Fixes existing data before applying constraints

-- 1. Add missing threshold column to risk_triggers
ALTER TABLE risk_triggers 
ADD COLUMN IF NOT EXISTS threshold TEXT;

COMMENT ON COLUMN risk_triggers.threshold IS 'Threshold value that triggers the risk';

-- 2. Fix engagement_actions check constraint
ALTER TABLE engagement_actions DROP CONSTRAINT IF EXISTS engagement_actions_action_type_check;
ALTER TABLE engagement_actions ADD CONSTRAINT engagement_actions_action_type_check 
CHECK (action_type IN ('meeting', 'email', 'workshop', 'presentation', 'survey', 
                       'training', 'consultation', 'review', 'approval', 'notification',
                       'communication', 'engagement', 'feedback', 'update', 'other'));

-- 3. Fix team_agreements - UPDATE DATA FIRST before constraint
-- Find and fix any invalid adherence_score values
UPDATE team_agreements 
SET adherence_score = CASE 
    WHEN adherence_score < 0.0 THEN 0.0
    WHEN adherence_score > 1.0 THEN 1.0
    WHEN adherence_score IS NULL THEN 0.0
    ELSE adherence_score
END
WHERE adherence_score < 0.0 OR adherence_score > 1.0 OR adherence_score IS NULL;

-- Now drop and recreate the constraint
ALTER TABLE team_agreements DROP CONSTRAINT IF EXISTS team_agreements_adherence_score_check;
ALTER TABLE team_agreements ADD CONSTRAINT team_agreements_adherence_score_check 
CHECK (adherence_score >= 0.0 AND adherence_score <= 1.0);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_triggers_threshold ON risk_triggers(threshold);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 665 v2 completed successfully';
    RAISE NOTICE '  • Added risk_triggers.threshold';
    RAISE NOTICE '  • Fixed engagement_actions constraint (15 action types)';
    RAISE NOTICE '  • Fixed team_agreements data and constraint';
END $$;
