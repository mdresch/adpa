-- Migration: Add missing columns to resources table
-- Fix for resource_pool, onboarding_offboarding, and risk_triggers extraction

BEGIN;

-- Add missing columns to resources table for resource_pool entity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'role'
    ) THEN
        ALTER TABLE resources ADD COLUMN role VARCHAR(255);
        COMMENT ON COLUMN resources.role IS 'Role of the resource in the project';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'availability_pct'
    ) THEN
        ALTER TABLE resources ADD COLUMN availability_pct DECIMAL(5,2);
        COMMENT ON COLUMN resources.availability_pct IS 'Availability percentage of the resource';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'cost_rate'
    ) THEN
        ALTER TABLE resources ADD COLUMN cost_rate DECIMAL(15,2);
        COMMENT ON COLUMN resources.cost_rate IS 'Cost rate per hour/unit for the resource';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'capacity_hours'
    ) THEN
        ALTER TABLE resources ADD COLUMN capacity_hours DECIMAL(10,2);
        COMMENT ON COLUMN resources.capacity_hours IS 'Available capacity hours for the resource';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'location'
    ) THEN
        ALTER TABLE resources ADD COLUMN location VARCHAR(255);
        COMMENT ON COLUMN resources.location IS 'Physical or virtual location of the resource';
    END IF;
END$$;

-- Create onboarding_offboarding table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'onboarding_offboarding'
    ) THEN
        CREATE TABLE onboarding_offboarding (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            resource_name VARCHAR(255) NOT NULL,
            action_type VARCHAR(50) CHECK (action_type IN ('onboarding', 'offboarding', 'transition')),
            planned_date DATE,
            actual_date DATE,
            status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed', 'cancelled')),
            description TEXT,
            assigned_to VARCHAR(255),
            source_document_id UUID,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        COMMENT ON TABLE onboarding_offboarding IS 'Resource onboarding and offboarding activities';
    END IF;
END$$;

-- Add action_type column if table exists but column is missing
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'onboarding_offboarding'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_offboarding' AND column_name = 'action_type'
    ) THEN
        ALTER TABLE onboarding_offboarding ADD COLUMN action_type VARCHAR(50) CHECK (action_type IN ('onboarding', 'offboarding', 'transition'));
        COMMENT ON COLUMN onboarding_offboarding.action_type IS 'Type of action: onboarding, offboarding, or transition';
    END IF;
END$$;

-- Create risk_triggers table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'risk_triggers'
    ) THEN
        CREATE TABLE risk_triggers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            risk_title VARCHAR(255) NOT NULL,
            trigger_condition TEXT NOT NULL,
            trigger_type VARCHAR(50) CHECK (trigger_type IN ('schedule', 'cost', 'quality', 'scope', 'resource', 'external')),
            probability VARCHAR(20) CHECK (probability IN ('very_low', 'low', 'medium', 'high', 'very_high')),
            impact VARCHAR(20) CHECK (impact IN ('very_low', 'low', 'medium', 'high', 'very_high')),
            response_strategy TEXT,
            monitoring_frequency VARCHAR(50),
            status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'triggered')),
            source_document_id UUID,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        COMMENT ON TABLE risk_triggers IS 'Risk triggers and monitoring conditions';
    END IF;
END$$;

-- Add risk_title column if table exists but column is missing
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'risk_triggers'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risk_triggers' AND column_name = 'risk_title'
    ) THEN
        ALTER TABLE risk_triggers ADD COLUMN risk_title VARCHAR(255);
        COMMENT ON COLUMN risk_triggers.risk_title IS 'Title of the risk associated with this trigger';
    END IF;
END$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resources_role ON resources(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_availability ON resources(availability_pct) WHERE availability_pct IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_offboarding_action_type ON onboarding_offboarding(action_type) WHERE action_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_triggers_risk_title ON risk_triggers(risk_title) WHERE risk_title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_triggers_trigger_type ON risk_triggers(trigger_type) WHERE trigger_type IS NOT NULL;

COMMIT;
