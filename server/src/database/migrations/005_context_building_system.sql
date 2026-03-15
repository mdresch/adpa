-- Context Building System Database Schema
-- Comprehensive system for document prioritization, context injection, and template dependencies

-- Document Context Priority Table
CREATE TABLE IF NOT EXISTS document_context_priorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    priority_level INTEGER NOT NULL CHECK (priority_level >= 1 AND priority_level <= 10),
    context_weight DECIMAL(5,2) NOT NULL CHECK (context_weight >= 0.0 AND context_weight <= 1.0),
    value_added_score DECIMAL(5,2) NOT NULL CHECK (value_added_score >= 0.0 AND value_added_score <= 10.0),
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('primary', 'secondary', 'reference', 'supporting', 'background')),
    injection_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Template Creation Dependencies Table
CREATE TABLE IF NOT EXISTS template_creation_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    child_template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL CHECK (dependency_type IN ('prerequisite', 'sequential', 'parallel', 'optional', 'conditional')),
    dependency_strength DECIMAL(5,2) NOT NULL CHECK (dependency_strength >= 0.0 AND dependency_strength <= 1.0),
    context_inheritance BOOLEAN DEFAULT true,
    priority_override INTEGER CHECK (priority_override >= 1 AND priority_override <= 10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_template_id, child_template_id)
);

-- Context Injection Rules Table
CREATE TABLE IF NOT EXISTS context_injection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    source_template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    injection_condition VARCHAR(100) NOT NULL,
    injection_method VARCHAR(50) NOT NULL CHECK (injection_method IN ('full', 'summary', 'extract', 'reference', 'metadata')),
    context_filter JSONB DEFAULT '{}',
    priority_boost DECIMAL(3,2) DEFAULT 1.0 CHECK (priority_boost >= 0.5 AND priority_boost <= 2.0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Context Relationships Table
CREATE TABLE IF NOT EXISTS document_context_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('depends_on', 'influences', 'references', 'extends', 'conflicts', 'supports')),
    relationship_strength DECIMAL(5,2) NOT NULL CHECK (relationship_strength >= 0.0 AND relationship_strength <= 1.0),
    context_impact DECIMAL(5,2) NOT NULL CHECK (context_impact >= 0.0 AND context_impact <= 1.0),
    bidirectional BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_document_id, target_document_id)
);

-- Context Value Assessment Table
CREATE TABLE IF NOT EXISTS context_value_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    assessor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relevance_score DECIMAL(5,2) NOT NULL CHECK (relevance_score >= 0.0 AND relevance_score <= 10.0),
    completeness_score DECIMAL(5,2) NOT NULL CHECK (completeness_score >= 0.0 AND completeness_score <= 10.0),
    accuracy_score DECIMAL(5,2) NOT NULL CHECK (accuracy_score >= 0.0 AND accuracy_score <= 10.0),
    timeliness_score DECIMAL(5,2) NOT NULL CHECK (timeliness_score >= 0.0 AND timeliness_score <= 10.0),
    overall_value_score DECIMAL(5,2) NOT NULL CHECK (overall_value_score >= 0.0 AND overall_value_score <= 10.0),
    assessment_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Building Sessions Table
CREATE TABLE IF NOT EXISTS context_building_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(255) NOT NULL,
    target_template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    session_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_status VARCHAR(50) NOT NULL CHECK (session_status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
    context_strategy JSONB DEFAULT '{}',
    priority_matrix JSONB DEFAULT '{}',
    dependency_map JSONB DEFAULT '{}',
    value_assessments JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_context_priorities_document ON document_context_priorities(document_id);
CREATE INDEX IF NOT EXISTS idx_document_context_priorities_template ON document_context_priorities(template_id);
CREATE INDEX IF NOT EXISTS idx_document_context_priorities_priority ON document_context_priorities(priority_level);
CREATE INDEX IF NOT EXISTS idx_document_context_priorities_value ON document_context_priorities(value_added_score);

CREATE INDEX IF NOT EXISTS idx_template_creation_dependencies_parent ON template_creation_dependencies(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_template_creation_dependencies_child ON template_creation_dependencies(child_template_id);
CREATE INDEX IF NOT EXISTS idx_template_creation_dependencies_type ON template_creation_dependencies(dependency_type);

CREATE INDEX IF NOT EXISTS idx_context_injection_rules_template ON context_injection_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_context_injection_rules_source_doc ON context_injection_rules(source_document_id);
CREATE INDEX IF NOT EXISTS idx_context_injection_rules_method ON context_injection_rules(injection_method);

CREATE INDEX IF NOT EXISTS idx_document_context_relationships_source ON document_context_relationships(source_document_id);
CREATE INDEX IF NOT EXISTS idx_document_context_relationships_target ON document_context_relationships(target_document_id);
CREATE INDEX IF NOT EXISTS idx_document_context_relationships_type ON document_context_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_context_value_assessments_document ON context_value_assessments(document_id);
CREATE INDEX IF NOT EXISTS idx_context_value_assessments_template ON context_value_assessments(template_id);
CREATE INDEX IF NOT EXISTS idx_context_value_assessments_assessor ON context_value_assessments(assessor_id);

CREATE INDEX IF NOT EXISTS idx_context_building_sessions_template ON context_building_sessions(target_template_id);
CREATE INDEX IF NOT EXISTS idx_context_building_sessions_owner ON context_building_sessions(session_owner_id);
CREATE INDEX IF NOT EXISTS idx_context_building_sessions_status ON context_building_sessions(session_status);

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_document_context_priorities_updated_at ON document_context_priorities;
CREATE TRIGGER update_document_context_priorities_updated_at BEFORE UPDATE ON document_context_priorities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_creation_dependencies_updated_at ON template_creation_dependencies;
CREATE TRIGGER update_template_creation_dependencies_updated_at BEFORE UPDATE ON template_creation_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_context_injection_rules_updated_at ON context_injection_rules;
CREATE TRIGGER update_context_injection_rules_updated_at BEFORE UPDATE ON context_injection_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_context_relationships_updated_at ON document_context_relationships;
CREATE TRIGGER update_document_context_relationships_updated_at BEFORE UPDATE ON document_context_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_context_value_assessments_updated_at ON context_value_assessments;
CREATE TRIGGER update_context_value_assessments_updated_at BEFORE UPDATE ON context_value_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_context_building_sessions_updated_at ON context_building_sessions;
CREATE TRIGGER update_context_building_sessions_updated_at BEFORE UPDATE ON context_building_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for context building dashboard
CREATE OR REPLACE VIEW context_building_dashboard AS
SELECT 
    dt.id as template_id,
    dt.name as template_name,
    dt.description as template_description,
    dt.category as template_category,
    COUNT(DISTINCT dcp.id) as context_priorities_count,
    AVG(dcp.priority_level) as avg_priority_level,
    AVG(dcp.value_added_score) as avg_value_score,
    COUNT(DISTINCT tcd.id) as dependencies_count,
    COUNT(DISTINCT cir.id) as injection_rules_count,
    COUNT(DISTINCT cbs.id) as active_sessions_count,
    MAX(cbs.updated_at) as last_session_update
FROM templates dt
LEFT JOIN document_context_priorities dcp ON dt.id = dcp.template_id AND dcp.is_active = true
LEFT JOIN template_creation_dependencies tcd ON dt.id = tcd.parent_template_id AND tcd.is_active = true
LEFT JOIN context_injection_rules cir ON dt.id = cir.template_id AND cir.is_active = true
LEFT JOIN context_building_sessions cbs ON dt.id = cbs.target_template_id AND cbs.is_active = true
WHERE dt.is_active = true
GROUP BY dt.id, dt.name, dt.description, dt.category
ORDER BY avg_value_score DESC, avg_priority_level DESC;

-- Create function to get context priority matrix
CREATE OR REPLACE FUNCTION get_context_priority_matrix(template_id_param UUID)
RETURNS TABLE (
    document_id UUID,
    document_name VARCHAR(255),
    priority_level INTEGER,
    context_weight DECIMAL(5,2),
    value_added_score DECIMAL(5,2),
    context_type VARCHAR(50),
    injection_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as document_id,
        d.name as document_name,
        dcp.priority_level,
        dcp.context_weight,
        dcp.value_added_score,
        dcp.context_type,
        dcp.injection_order
    FROM document_context_priorities dcp
    JOIN documents d ON dcp.document_id = d.id
    WHERE dcp.template_id = template_id_param
    AND dcp.is_active = true
    ORDER BY dcp.priority_level ASC, dcp.injection_order ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get template dependency chain
CREATE OR REPLACE FUNCTION get_template_dependency_chain(template_id_param UUID)
RETURNS TABLE (
    level INTEGER,
    template_id UUID,
    template_name VARCHAR(255),
    dependency_type VARCHAR(50),
    dependency_strength DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE dependency_chain AS (
        -- Base case: start with the target template
        SELECT 
            0 as level,
            dt.id as template_id,
            dt.name as template_name,
            'target'::VARCHAR(50) as dependency_type,
            1.0::DECIMAL(5,2) as dependency_strength
        FROM templates dt
        WHERE dt.id = template_id_param
        
        UNION ALL
        
        -- Recursive case: find dependencies
        SELECT 
            dc.level + 1,
            dt.id as template_id,
            dt.name as template_name,
            tcd.dependency_type,
            tcd.dependency_strength
        FROM dependency_chain dc
        JOIN template_creation_dependencies tcd ON dc.template_id = tcd.parent_template_id
        JOIN templates dt ON tcd.child_template_id = dt.id
        WHERE tcd.is_active = true
        AND dc.level < 10  -- Prevent infinite recursion
    )
    SELECT * FROM dependency_chain ORDER BY level, dependency_strength DESC;
END;
$$ LANGUAGE plpgsql;
