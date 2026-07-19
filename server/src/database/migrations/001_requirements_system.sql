-- Requirements System Database Schema
-- Foundation tables for ECS system

-- Requirements Table
-- Requirements Table
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS requirement_type VARCHAR(50);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS priority INTEGER;

CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_type VARCHAR(50) DEFAULT 'functional' CHECK (requirement_type IN ('functional', 'non-functional', 'technical', 'business')),
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'implemented', 'tested', 'deployed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for requirements
CREATE INDEX IF NOT EXISTS idx_requirements_document ON requirements(document_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_type ON requirements(requirement_type);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_requirements_updated_at ON requirements;
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample-data seed intentionally removed: real requirements data comes from
-- the Supabase-to-Azure data copy, and production's requirements table has
-- since evolved a NOT NULL "name" column this old seed never populated.
