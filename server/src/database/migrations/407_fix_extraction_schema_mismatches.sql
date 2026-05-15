-- Migration: Fix Extraction Schema Mismatches
-- Description: Adds missing columns and relaxes constraints for entity extraction

DO $$
BEGIN
    -- 1. contingency_reserves
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contingency_reserves') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contingency_reserves' AND column_name = 'amount') THEN
            ALTER TABLE contingency_reserves ADD COLUMN amount NUMERIC;
        END IF;
    END IF;

    -- 2. capacity_forecasts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capacity_forecasts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'capacity_forecasts' AND column_name = 'available_hours') THEN
            ALTER TABLE capacity_forecasts ADD COLUMN available_hours INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'capacity_forecasts' AND column_name = 'forecast_date') THEN
            ALTER TABLE capacity_forecasts ADD COLUMN forecast_date DATE;
        END IF;
    END IF;

    -- 3. resource_conflicts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resource_conflicts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resource_conflicts' AND column_name = 'conflict_date') THEN
            ALTER TABLE resource_conflicts ADD COLUMN conflict_date DATE;
        END IF;
    END IF;

    -- 4. resources
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resources') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'location') THEN
            ALTER TABLE resources ADD COLUMN location VARCHAR(255);
        END IF;
    END IF;

    -- 5. risk_triggers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_triggers') THEN
        ALTER TABLE risk_triggers ALTER COLUMN trigger_name DROP NOT NULL;
    END IF;

    -- 6. stakeholder_issues (Constraint Update)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stakeholder_issues') THEN
        ALTER TABLE stakeholder_issues DROP CONSTRAINT IF EXISTS stakeholder_issues_priority_check;
        ALTER TABLE stakeholder_issues ADD CONSTRAINT stakeholder_issues_priority_check 
            CHECK (LOWER(priority) = ANY (ARRAY['critical', 'high', 'medium', 'low']));
    END IF;

    -- 7. engagement_actions (Constraint Update)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_actions') THEN
        ALTER TABLE engagement_actions DROP CONSTRAINT IF EXISTS engagement_actions_action_type_check;
        ALTER TABLE engagement_actions ADD CONSTRAINT engagement_actions_action_type_check 
            CHECK (action_type = ANY (ARRAY['meeting', 'email', 'presentation', 'workshop', 'survey', 'report', 'review', 'training', 'consultation', 'feedback', 'communication', 'engagement', 'other']));
    END IF;

END $$;
