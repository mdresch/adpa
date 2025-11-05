-- Migration: Create Missing Entity Tables for Baseline System
-- TASK-722: Ensure all 14 entity types have database tables
-- Missing tables: scope_items, deliverables, activities, resources, technologies, quality_standards
-- Also adds missing columns to existing tables

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add missing columns to existing tables

-- Requirements: add title column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requirements' AND column_name = 'title'
    ) THEN
        ALTER TABLE requirements ADD COLUMN title VARCHAR(255);
    END IF;
END$$;

-- Risks: add title column if not exists (in addition to name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risks' AND column_name = 'title'
    ) THEN
        ALTER TABLE risks ADD COLUMN title VARCHAR(255);
    END IF;
END$$;

-- Milestones: add due_date as alias/additional column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'milestones' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE milestones ADD COLUMN due_date DATE;
    END IF;
END$$;

-- Success Criteria: add metric column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'success_criteria' AND column_name = 'metric'
    ) THEN
        ALTER TABLE success_criteria ADD COLUMN metric VARCHAR(255);
    END IF;
END$$;

-- Success Criteria: add measurement column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'success_criteria' AND column_name = 'measurement'
    ) THEN
        ALTER TABLE success_criteria ADD COLUMN measurement TEXT;
    END IF;
END$$;

-- Success Criteria: add target column (in addition to target_value)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'success_criteria' AND column_name = 'target'
    ) THEN
        ALTER TABLE success_criteria ADD COLUMN target VARCHAR(255);
    END IF;
END$$;

-- Best Practices: add project_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'best_practices' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE best_practices ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_best_practices_project_id ON best_practices(project_id);
    END IF;
END$$;

-- Best Practices: add title column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'best_practices' AND column_name = 'title'
    ) THEN
        ALTER TABLE best_practices ADD COLUMN title VARCHAR(255);
    END IF;
END$$;

-- Best Practices: add practice column (alias for name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'best_practices' AND column_name = 'practice'
    ) THEN
        ALTER TABLE best_practices ADD COLUMN practice VARCHAR(255);
    END IF;
END$$;

-- Constraints: add name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'constraints' AND column_name = 'name'
    ) THEN
        ALTER TABLE constraints ADD COLUMN name VARCHAR(255);
    END IF;
END$$;

-- Risks: add mitigation column (alias for mitigation_strategy)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'risks' AND column_name = 'mitigation'
    ) THEN
        ALTER TABLE risks ADD COLUMN mitigation TEXT;
    END IF;
END$$;

-- Quality Standards: ensure it has all needed columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quality_standards' AND column_name = 'standard'
    ) THEN
        ALTER TABLE quality_standards ADD COLUMN standard VARCHAR(255);
    END IF;
END$$;

-- Scope Items Table
CREATE TABLE IF NOT EXISTS scope_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    inclusion_status VARCHAR(20) DEFAULT 'in_scope' CHECK (inclusion_status IN ('in_scope', 'out_of_scope', 'pending')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    justification TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Deliverables Table
CREATE TABLE IF NOT EXISTS deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    owner VARCHAR(255),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'delayed')),
    acceptance_criteria TEXT[] DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    duration VARCHAR(100),
    dependencies TEXT[] DEFAULT '{}',
    assigned_to VARCHAR(255),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'human' CHECK (type IN ('human', 'equipment', 'tool', 'budget', 'team_member')),
    description TEXT,
    allocation DECIMAL(10,2),
    cost_estimate DECIMAL(15,2),
    skills TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Technologies Table
CREATE TABLE IF NOT EXISTS technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    version VARCHAR(100),
    purpose TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Quality Standards Table
CREATE TABLE IF NOT EXISTS quality_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255),
    title VARCHAR(255),
    standard VARCHAR(255),
    description TEXT,
    measurement_method TEXT,
    measurement_criteria TEXT,
    target_value VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scope_items_project_id ON scope_items(project_id);
CREATE INDEX IF NOT EXISTS idx_scope_items_inclusion_status ON scope_items(inclusion_status);
CREATE INDEX IF NOT EXISTS idx_scope_items_priority ON scope_items(priority);

CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_due_date ON deliverables(due_date);

CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON activities(assigned_to);

CREATE INDEX IF NOT EXISTS idx_resources_project_id ON resources(project_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);

CREATE INDEX IF NOT EXISTS idx_technologies_project_id ON technologies(project_id);
CREATE INDEX IF NOT EXISTS idx_technologies_category ON technologies(category);

CREATE INDEX IF NOT EXISTS idx_quality_standards_project_id ON quality_standards(project_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scope_items_updated_at BEFORE UPDATE ON scope_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON deliverables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_technologies_updated_at BEFORE UPDATE ON technologies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_standards_updated_at BEFORE UPDATE ON quality_standards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE scope_items IS 'Project scope items (in-scope and out-of-scope)';
COMMENT ON TABLE deliverables IS 'Project deliverables and outputs';
COMMENT ON TABLE activities IS 'Project activities and tasks';
COMMENT ON TABLE resources IS 'Project resources (human, equipment, budget)';
COMMENT ON TABLE technologies IS 'Technologies used in the project';
COMMENT ON TABLE quality_standards IS 'Quality standards and metrics for the project';

COMMIT;

-- DOWN migration (for rollback)
/*
BEGIN;

-- Remove added columns from existing tables
ALTER TABLE requirements DROP COLUMN IF EXISTS title;
ALTER TABLE risks DROP COLUMN IF EXISTS title;
ALTER TABLE risks DROP COLUMN IF EXISTS mitigation;
ALTER TABLE milestones DROP COLUMN IF EXISTS due_date;
ALTER TABLE success_criteria DROP COLUMN IF EXISTS metric;
ALTER TABLE success_criteria DROP COLUMN IF EXISTS measurement;
ALTER TABLE success_criteria DROP COLUMN IF EXISTS target;
ALTER TABLE best_practices DROP COLUMN IF EXISTS project_id;
ALTER TABLE best_practices DROP COLUMN IF EXISTS title;
ALTER TABLE best_practices DROP COLUMN IF EXISTS practice;
ALTER TABLE constraints DROP COLUMN IF EXISTS name;
ALTER TABLE quality_standards DROP COLUMN IF EXISTS standard;

DROP INDEX IF EXISTS idx_best_practices_project_id;

-- Drop new tables
DROP TRIGGER IF EXISTS update_scope_items_updated_at ON scope_items;
DROP TRIGGER IF EXISTS update_deliverables_updated_at ON deliverables;
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
DROP TRIGGER IF EXISTS update_technologies_updated_at ON technologies;
DROP TRIGGER IF EXISTS update_quality_standards_updated_at ON quality_standards;

DROP INDEX IF EXISTS idx_scope_items_project_id;
DROP INDEX IF EXISTS idx_scope_items_inclusion_status;
DROP INDEX IF EXISTS idx_scope_items_priority;
DROP INDEX IF EXISTS idx_deliverables_project_id;
DROP INDEX IF EXISTS idx_deliverables_status;
DROP INDEX IF EXISTS idx_deliverables_due_date;
DROP INDEX IF EXISTS idx_activities_project_id;
DROP INDEX IF EXISTS idx_activities_status;
DROP INDEX IF EXISTS idx_activities_assigned_to;
DROP INDEX IF EXISTS idx_resources_project_id;
DROP INDEX IF EXISTS idx_resources_type;
DROP INDEX IF EXISTS idx_technologies_project_id;
DROP INDEX IF EXISTS idx_technologies_category;
DROP INDEX IF EXISTS idx_quality_standards_project_id;

DROP TABLE IF EXISTS scope_items;
DROP TABLE IF EXISTS deliverables;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS technologies;
DROP TABLE IF EXISTS quality_standards;

COMMIT;
*/
