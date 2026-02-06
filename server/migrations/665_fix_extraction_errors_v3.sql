-- Migration 665 v3: Fix extraction errors (proper order)
-- Drop constraints FIRST, fix data, then recreate constraints

-- 1. Add missing threshold column to risk_triggers
ALTER TABLE risk_triggers 
ADD COLUMN IF NOT EXISTS threshold TEXT;

COMMENT ON COLUMN risk_triggers.threshold IS 'Threshold value that triggers the risk';

-- 2. Fix engagement_actions constraint
ALTER TABLE engagement_actions DROP CONSTRAINT IF EXISTS engagement_actions_action_type_check;
ALTER TABLE engagement_actions ADD CONSTRAINT engagement_actions_action_type_check 
CHECK (action_type IN ('meeting', 'email', 'workshop', 'presentation', 'survey', 
                       'training', 'consultation', 'review', 'approval', 'notification',
                       'communication', 'engagement', 'feedback', 'update', 'other'));

-- 3. Fix team_agreements - DROP CONSTRAINT FIRST
ALTER TABLE team_agreements DROP CONSTRAINT IF EXISTS team_agreements_adherence_score_check;

-- Now update the data without the constraint blocking us
UPDATE team_agreements 
SET adherence_score = CASE 
    WHEN adherence_score < 0.0 THEN 0.0
    WHEN adherence_score > 1.0 THEN 1.0
    WHEN adherence_score IS NULL THEN 0.5  -- Default to 0.5 instead of 0.0 for better semantics
    ELSE adherence_score
END
WHERE adherence_score < 0.0 OR adherence_score > 1.0 OR adherence_score IS NULL;

-- Verify no invalid values remain
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM team_agreements 
    WHERE adherence_score < 0.0 OR adherence_score > 1.0 OR adherence_score IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % rows with invalid adherence_score values', invalid_count;
    END IF;
    
    RAISE NOTICE 'All adherence_score values are valid (0.0 to 1.0)';
END $$;

-- Now recreate the constraint (data is clean)
ALTER TABLE team_agreements ADD CONSTRAINT team_agreements_adherence_score_check 
CHECK (adherence_score >= 0.0 AND adherence_score <= 1.0);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_triggers_threshold ON risk_triggers(threshold);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 665 v3 completed successfully';
    RAISE NOTICE '  • Added risk_triggers.threshold';
    RAISE NOTICE '  • Fixed engagement_actions constraint (15 action types)';
    RAISE NOTICE '  • Fixed team_agreements data and constraint';
END $$;
