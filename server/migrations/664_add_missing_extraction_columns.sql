-- Migration 664: Add missing columns for entity extraction
-- Fixes errors:
-- 1. relationship_health missing health_score
-- 2. risk_triggers missing risk_title  
-- 3. engagement_actions missing action_id

-- Add health_score to relationship_health
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'relationship_health' 
        AND column_name = 'health_score'
    ) THEN
        ALTER TABLE relationship_health 
        ADD COLUMN health_score DECIMAL(3,2) DEFAULT 0.0;
        
        COMMENT ON COLUMN relationship_health.health_score IS 'Health score for the relationship (0.0 to 1.0)';
    END IF;
END $$;

-- Add risk_title to risk_triggers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risk_triggers' 
        AND column_name = 'risk_title'
    ) THEN
        ALTER TABLE risk_triggers 
        ADD COLUMN risk_title TEXT;
        
        COMMENT ON COLUMN risk_triggers.risk_title IS 'Title of the associated risk';
    END IF;
END $$;

-- Add action_id to engagement_actions (make it nullable with default)
DO $$ 
BEGIN
    -- First, check if the column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'engagement_actions' 
        AND column_name = 'action_id'
    ) THEN
        -- Add the column as nullable
        ALTER TABLE engagement_actions 
        ADD COLUMN action_id UUID DEFAULT gen_random_uuid();
        
        COMMENT ON COLUMN engagement_actions.action_id IS 'Unique identifier for the engagement action';
    ELSE
        -- Column exists, make it nullable if it's not
        ALTER TABLE engagement_actions 
        ALTER COLUMN action_id DROP NOT NULL;
        
        -- Set default for existing NULL values
        UPDATE engagement_actions 
        SET action_id = gen_random_uuid() 
        WHERE action_id IS NULL;
    END IF;
END $$;

-- Create index on new columns for performance
CREATE INDEX IF NOT EXISTS idx_relationship_health_score 
ON relationship_health(health_score);

CREATE INDEX IF NOT EXISTS idx_risk_triggers_title 
ON risk_triggers(risk_title);

CREATE INDEX IF NOT EXISTS idx_engagement_actions_action_id 
ON engagement_actions(action_id);

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 664 completed: Added health_score, risk_title, and action_id columns';
END $$;
