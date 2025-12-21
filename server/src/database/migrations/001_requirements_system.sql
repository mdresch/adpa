-- Requirements System Database Schema
-- Foundation tables for ECS system

-- Requirements Table
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
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample requirements for testing
INSERT INTO requirements (title, description, document_id, project_id, requirement_type, priority, status)
SELECT 
    'Sample Requirement ' || generate_series(1, 5),
    'This is a sample requirement for testing the ECS system. It includes various types of requirements that would be found in a typical project.',
    d.id,
    d.project_id,
    CASE (random() * 3)::int
        WHEN 0 THEN 'functional'
        WHEN 1 THEN 'non-functional'
        ELSE 'technical'
    END,
    (random() * 10 + 1)::int,
    CASE (random() * 5)::int
        WHEN 0 THEN 'draft'
        WHEN 1 THEN 'review'
        WHEN 2 THEN 'approved'
        WHEN 3 THEN 'implemented'
        ELSE 'tested'
    END
FROM documents d
LIMIT 5
ON CONFLICT DO NOTHING;
