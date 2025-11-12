-- Migration: Knowledge Base Integration for Drift Detection
-- CR-2026-001 Phase 3: Knowledge base integration
-- Stores lessons learned, efficiency improvements, and innovations from drift detection

BEGIN;

-- ============================================================================
-- UP
-- ============================================================================

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Knowledge Base Entries Table
-- Stores lessons learned and best practices from drift detection
CREATE TABLE IF NOT EXISTS knowledge_base_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Classification
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'efficiency_improvement',
        'cost_saving',
        'timeline_acceleration',
        'innovation',
        'risk_mitigation',
        'quality_improvement',
        'process_improvement',
        'technical_solution',
        'lesson_learned'
    )),
    
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'positive_drift',
        'negative_drift',
        'innovation',
        'best_practice',
        'anti_pattern'
    )),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    context TEXT, -- When and why this approach was used
    approach TEXT NOT NULL, -- What was done
    results TEXT, -- What were the outcomes
    
    -- Source Information
    source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    source_drift_id UUID REFERENCES baseline_drift_detection(id) ON DELETE SET NULL,
    source_baseline_id UUID REFERENCES project_baselines(id) ON DELETE SET NULL,
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    
    -- Impact Metrics
    cost_impact DECIMAL(15,2), -- Positive or negative $ impact
    time_impact_days INTEGER, -- Positive or negative days
    quality_impact_percentage DECIMAL(5,2), -- % improvement or degradation
    business_value_score DECIMAL(3,2) CHECK (business_value_score >= 0 AND business_value_score <= 1),
    
    -- Replication Information
    replicable BOOLEAN DEFAULT TRUE,
    replication_difficulty VARCHAR(20) CHECK (replication_difficulty IN ('easy', 'moderate', 'difficult')),
    replication_instructions TEXT,
    applicable_contexts TEXT[], -- Where this can be applied
    prerequisites TEXT[], -- What's needed before applying
    
    -- AI Metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    ai_processing_metadata JSONB,
    
    -- Validation
    validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP,
    validation_notes TEXT,
    
    -- Usage Tracking
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0, -- How many times this was applied
    success_rate DECIMAL(3,2), -- Success rate when applied
    
    -- Tags and Search
    tags TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    search_vector tsvector,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    archived_reason TEXT
);

-- Knowledge Base Applications Table
-- Tracks when and where knowledge base entries are applied
CREATE TABLE IF NOT EXISTS knowledge_base_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    knowledge_entry_id UUID NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
    applied_to_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Application Details
    applied_by UUID NOT NULL REFERENCES users(id),
    applied_at TIMESTAMP DEFAULT NOW(),
    application_context TEXT,
    
    -- Results
    success BOOLEAN,
    actual_cost_impact DECIMAL(15,2),
    actual_time_impact_days INTEGER,
    actual_quality_impact_percentage DECIMAL(5,2),
    notes TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP,
    follow_up_notes TEXT
);

-- Knowledge Base Recommendations Table
-- AI-generated recommendations for applying knowledge base entries
CREATE TABLE IF NOT EXISTS knowledge_base_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    knowledge_entry_id UUID NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Recommendation Details
    relevance_score DECIMAL(3,2) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    reasoning TEXT NOT NULL,
    expected_impact TEXT,
    
    -- AI Metadata
    ai_model VARCHAR(100),
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    generated_at TIMESTAMP DEFAULT NOW(),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'applied')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    -- Constraints
    UNIQUE(knowledge_entry_id, project_id)
);

-- Knowledge Base Categories Table
-- Hierarchical categorization for organizing entries
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES knowledge_base_categories(id) ON DELETE CASCADE,
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(name, parent_category_id)
);

-- Knowledge Base Entry Categories (Many-to-Many)
CREATE TABLE IF NOT EXISTS knowledge_base_entry_categories (
    entry_id UUID NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES knowledge_base_categories(id) ON DELETE CASCADE,
    
    PRIMARY KEY (entry_id, category_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_kb_entries_type ON knowledge_base_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_kb_entries_category ON knowledge_base_entries(category);
CREATE INDEX IF NOT EXISTS idx_kb_entries_source_project ON knowledge_base_entries(source_project_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_source_drift ON knowledge_base_entries(source_drift_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_created_at ON knowledge_base_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_kb_entries_business_value ON knowledge_base_entries(business_value_score);
CREATE INDEX IF NOT EXISTS idx_kb_entries_replicable ON knowledge_base_entries(replicable);
CREATE INDEX IF NOT EXISTS idx_kb_entries_archived ON knowledge_base_entries(archived);
CREATE INDEX IF NOT EXISTS idx_kb_entries_tags ON knowledge_base_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_entries_keywords ON knowledge_base_entries USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_kb_entries_search_vector ON knowledge_base_entries USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_kb_applications_entry ON knowledge_base_applications(knowledge_entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_applications_project ON knowledge_base_applications(applied_to_project_id);
CREATE INDEX IF NOT EXISTS idx_kb_applications_applied_at ON knowledge_base_applications(applied_at);
CREATE INDEX IF NOT EXISTS idx_kb_applications_success ON knowledge_base_applications(success);

CREATE INDEX IF NOT EXISTS idx_kb_recommendations_entry ON knowledge_base_recommendations(knowledge_entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_recommendations_project ON knowledge_base_recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_kb_recommendations_relevance ON knowledge_base_recommendations(relevance_score);
CREATE INDEX IF NOT EXISTS idx_kb_recommendations_status ON knowledge_base_recommendations(status);

CREATE INDEX IF NOT EXISTS idx_kb_categories_parent ON knowledge_base_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_kb_categories_sort ON knowledge_base_categories(sort_order);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_knowledge_base_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.description, '') || ' ' ||
        coalesce(NEW.approach, '') || ' ' ||
        coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
        coalesce(array_to_string(NEW.keywords, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kb_search_vector
    BEFORE INSERT OR UPDATE ON knowledge_base_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_base_search_vector();

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_kb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kb_updated_at
    BEFORE UPDATE ON knowledge_base_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_updated_at();

-- Comments for Documentation
COMMENT ON TABLE knowledge_base_entries IS 'Stores lessons learned, efficiency improvements, and best practices from drift detection and project execution';
COMMENT ON TABLE knowledge_base_applications IS 'Tracks when knowledge base entries are applied to projects and their outcomes';
COMMENT ON TABLE knowledge_base_recommendations IS 'AI-generated recommendations for applying knowledge base entries to projects';
COMMENT ON TABLE knowledge_base_categories IS 'Hierarchical categorization system for organizing knowledge base entries';

COMMENT ON COLUMN knowledge_base_entries.entry_type IS 'Type of knowledge entry (efficiency improvement, cost saving, etc.)';
COMMENT ON COLUMN knowledge_base_entries.category IS 'Category: positive drift, negative drift, innovation, best practice, or anti-pattern';
COMMENT ON COLUMN knowledge_base_entries.replicable IS 'Whether this approach can be replicated in other projects';
COMMENT ON COLUMN knowledge_base_entries.business_value_score IS 'Normalized business value score from 0 to 1';
COMMENT ON COLUMN knowledge_base_entries.applications_count IS 'Number of times this entry has been applied to projects';
COMMENT ON COLUMN knowledge_base_entries.success_rate IS 'Success rate when this entry is applied (0 to 1)';

COMMIT;

-- ============================================================================
-- DOWN
-- ============================================================================

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_kb_search_vector ON knowledge_base_entries;
DROP TRIGGER IF EXISTS trigger_update_kb_updated_at ON knowledge_base_entries;

-- Drop functions
DROP FUNCTION IF EXISTS update_knowledge_base_search_vector();
DROP FUNCTION IF EXISTS update_kb_updated_at();

-- Drop tables in reverse order
DROP TABLE IF EXISTS knowledge_base_entry_categories;
DROP TABLE IF EXISTS knowledge_base_categories;
DROP TABLE IF EXISTS knowledge_base_recommendations;
DROP TABLE IF EXISTS knowledge_base_applications;
DROP TABLE IF EXISTS knowledge_base_entries;

COMMIT;
