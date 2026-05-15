-- Migration: Fix Extraction Schema Mismatches Phase 2
-- Description: Adds remaining missing columns and relaxes further constraints

DO $$
BEGIN
    -- 1. satisfaction_surveys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'satisfaction_surveys') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'satisfaction_surveys' AND column_name = 'feedback_summary') THEN
            ALTER TABLE satisfaction_surveys ADD COLUMN feedback_summary TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'satisfaction_surveys' AND column_name = 'themes') THEN
            ALTER TABLE satisfaction_surveys ADD COLUMN themes TEXT[] DEFAULT '{}';
        END IF;
    END IF;

    -- 2. onboarding_offboarding
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_offboarding') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_offboarding' AND column_name = 'checklist_status') THEN
            ALTER TABLE onboarding_offboarding ADD COLUMN checklist_status TEXT;
        END IF;
    END IF;

    -- 3. contingency_reserves
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contingency_reserves') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contingency_reserves' AND column_name = 'utilization') THEN
            ALTER TABLE contingency_reserves ADD COLUMN utilization NUMERIC;
        END IF;
    END IF;

    -- 4. capacity_forecasts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capacity_forecasts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'capacity_forecasts' AND column_name = 'demand_hours') THEN
            ALTER TABLE capacity_forecasts ADD COLUMN demand_hours INTEGER;
        END IF;
    END IF;

    -- 5. resources (Constraint Update)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resources') THEN
        ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check;
        ALTER TABLE resources ADD CONSTRAINT resources_type_check 
            CHECK (type = ANY (ARRAY['human', 'equipment', 'material', 'software', 'facility', 'budget', 'contractor', 'person', 'labor', 'other']));
    END IF;

    -- 6. engagement_actions (Further Relax Constraint)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_actions') THEN
        ALTER TABLE engagement_actions DROP CONSTRAINT IF EXISTS engagement_actions_action_type_check;
        ALTER TABLE engagement_actions ADD CONSTRAINT engagement_actions_action_type_check 
            CHECK (LOWER(action_type) = ANY (ARRAY['meeting', 'email', 'presentation', 'workshop', 'survey', 'report', 'review', 'training', 'consultation', 'feedback', 'communication', 'engagement', 'interview', 'update', 'status update', 'other']));
    END IF;

END $$;
