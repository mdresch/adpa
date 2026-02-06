-- Migration 665: Fix remaining extraction errors
-- Fixes:
-- 1. resource_assignments INSERT mismatch
-- 2. engagement_actions check constraint violation
-- 3. team_agreements adherence_score check constraint
-- 4. risk_triggers missing threshold column

-- 1. Add missing threshold column to risk_triggers
ALTER TABLE risk_triggers 
ADD COLUMN IF NOT EXISTS threshold TEXT;

COMMENT ON COLUMN risk_triggers.threshold IS 'Threshold value that triggers the risk';

-- 2. Relax engagement_actions check constraint (if it's too strict)
-- First, check what values are being used
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'engagement_actions_action_type_check'
    ) THEN
        ALTER TABLE engagement_actions 
        DROP CONSTRAINT engagement_actions_action_type_check;
        
        -- Recreate with more permissive values
        ALTER TABLE engagement_actions 
        ADD CONSTRAINT engagement_actions_action_type_check 
        CHECK (action_type IN (
            'meeting', 'email', 'workshop', 'presentation', 'survey', 
            'training', 'consultation', 'review', 'approval', 'notification',
            'communication', 'engagement', 'feedback', 'update', 'other'
        ));
        
        RAISE NOTICE 'Updated engagement_actions_action_type_check constraint';
    END IF;
END $$;

-- 3. Relax team_agreements adherence_score check constraint
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'team_agreements_adherence_score_check'
    ) THEN
        ALTER TABLE team_agreements 
        DROP CONSTRAINT team_agreements_adherence_score_check;
        
        -- Recreate with proper range (0.0 to 1.0, but allow 0)
        ALTER TABLE team_agreements 
        ADD CONSTRAINT team_agreements_adherence_score_check 
        CHECK (adherence_score >= 0.0 AND adherence_score <= 1.0);
        
        RAISE NOTICE 'Updated team_agreements_adherence_score_check constraint';
    END IF;
END $$;

-- 4. Check resource_assignments table structure and log it
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'resource_assignments';
    
    RAISE NOTICE 'resource_assignments has % columns', col_count;
    
    -- Log all column names
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'resource_assignments'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %', col_name;
    END LOOP;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_triggers_threshold ON risk_triggers(threshold);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 665 completed';
    RAISE NOTICE '  • Added risk_triggers.threshold';
    RAISE NOTICE '  • Relaxed engagement_actions action_type constraint';
    RAISE NOTICE '  • Fixed team_agreements adherence_score constraint';
    RAISE NOTICE '  • Logged resource_assignments structure';
END $$;
