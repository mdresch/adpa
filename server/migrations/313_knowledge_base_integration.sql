-- Migration: Knowledge Base Integration
-- TASK-747: Knowledge base integration for drift detection workflow
-- Phase 3: Workflow Automation - Knowledge base integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- Knowledge Base Entries Table
-- Stores efficiency improvements, innovations, and best practices discovered through drift detection
CREATE TABLE IF NOT EXISTS knowledge_base_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source Information
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    baseline_id UUID REFERENCES project_baselines(id) ON DELETE SET NULL,
    drift_detection_id UUID REFERENCES baseline_drift_detection(id) ON DELETE SET NULL,
    innovation_opportunity_id UUID REFERENCES innovation_opportunities(id) ON DELETE SET NULL,
    
    -- Entry Classification
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'efficiency_improvement',
        'cost_reduction',
        'timeline_acceleration',
        'quality_improvement',
        'innovation',
        'best_practice',
        'lessons_learned',
        'process_improvement',
        'technology_innovation',
        'methodology_advancement'
    )),
    
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'scope_management',
        'technical_approach',
        'timeline_management',
        'cost_management',
        'resource_management',
        'quality_management',
        'risk_management',
        'stakeholder_management',
        'integration_management',
        'ai_optimization',
        'tool_selection',
        'architecture',
        'other'
    )),
    
    -- Entry Content (stored as Markdown)
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL, -- Markdown format
    
    -- What was the baseline/original approach
    baseline_approach JSONB DEFAULT NULL, -- { description, cost, timeline, quality, challenges }
    
    -- What was the improved/innovative approach
    improved_approach JSONB NOT NULL, -- { description, implementation_details, tools_used, techniques }
    
    -- Quantified Value
    value_metrics JSONB DEFAULT NULL, -- { cost_savings, time_saved, quality_improvement, efficiency_gain }
    
    -- Replication Information
    replication_guide JSONB NOT NULL, -- { steps, prerequisites, resources_needed, estimated_effort, risks }
    applicable_contexts JSONB DEFAULT NULL, -- [ context1, context2, ... ] where this can be applied
    similar_project_ids JSONB DEFAULT '[]'::jsonb, -- Array of project UUIDs where this could be replicated
    
    -- AI Analysis
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    novelty_score DECIMAL(3,2) DEFAULT 0.0 CHECK (novelty_score >= 0 AND novelty_score <= 1),
    replication_potential DECIMAL(3,2) DEFAULT 0.0 CHECK (replication_potential >= 0 AND replication_potential <= 1),
    ai_processing_metadata JSONB DEFAULT NULL,
    
    -- Tags and Search
    tags TEXT[] DEFAULT '{}', -- Array of searchable tags
    keywords TEXT[] DEFAULT '{}', -- Array of keywords for search
    
    -- Status and Lifecycle
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft',
        'pending_review',
        'approved',
        'published',
        'archived',
        'superseded'
    )),
    
    -- Approval and Review
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Publishing
    published_at TIMESTAMP,
    superseded_by UUID REFERENCES knowledge_base_entries(id),
    superseded_at TIMESTAMP,
    
    -- Usage Tracking
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0, -- How many times this has been applied to other projects
    success_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (success_rate >= 0 AND success_rate <= 1),
    
    -- Metadata
    updated_at TIMESTAMP DEFAULT NOW(),
    notes TEXT DEFAULT NULL -- Internal notes, not visible to all users
);

-- Knowledge Base Applications Table
-- Tracks when a knowledge base entry is applied to another project
CREATE TABLE IF NOT EXISTS knowledge_base_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    knowledge_base_entry_id UUID NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
    target_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Application Details
    applied_by UUID NOT NULL REFERENCES users(id),
    applied_at TIMESTAMP DEFAULT NOW(),
    
    -- Implementation
    implementation_notes TEXT DEFAULT NULL, -- Markdown format
    adaptation_required BOOLEAN DEFAULT FALSE,
    adaptations JSONB DEFAULT NULL, -- { changes_made, reasons, impact }
    
    -- Results
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN (
        'planned',
        'in_progress',
        'completed',
        'failed',
        'abandoned'
    )),
    
    outcome VARCHAR(20) DEFAULT NULL CHECK (outcome IN (
        'successful',
        'partially_successful',
        'unsuccessful',
        NULL
    )),
    
    -- Actual Results vs Expected
    expected_value JSONB DEFAULT NULL, -- { cost_savings, time_saved, quality_improvement }
    actual_value JSONB DEFAULT NULL, -- { cost_savings, time_saved, quality_improvement }
    variance_analysis JSONB DEFAULT NULL, -- Comparison of expected vs actual
    
    -- Feedback
    feedback TEXT DEFAULT NULL, -- Markdown format
    lessons_learned TEXT DEFAULT NULL, -- Markdown format
    
    -- Timestamps
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Base Reviews Table
-- Tracks reviews and feedback on knowledge base entries
CREATE TABLE IF NOT EXISTS knowledge_base_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    knowledge_base_entry_id UUID NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
    
    -- Reviewer
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewed_at TIMESTAMP DEFAULT NOW(),
    
    -- Review Content
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT DEFAULT NULL, -- Markdown format
    
    -- Review Type
    review_type VARCHAR(20) NOT NULL CHECK (review_type IN (
        'approval_review',
        'peer_review',
        'application_feedback',
        'update_review'
    )),
    
    -- Recommendations
    recommendation VARCHAR(20) CHECK (recommendation IN (
        'approve',
        'request_changes',
        'reject',
        'needs_more_info'
    )),
    
    suggested_changes JSONB DEFAULT NULL,
    
    -- Metadata
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_kb_entries_project_id ON knowledge_base_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_baseline_id ON knowledge_base_entries(baseline_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_drift_detection_id ON knowledge_base_entries(drift_detection_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_innovation_opportunity_id ON knowledge_base_entries(innovation_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_type ON knowledge_base_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_kb_entries_category ON knowledge_base_entries(category);
CREATE INDEX IF NOT EXISTS idx_kb_entries_status ON knowledge_base_entries(status);
CREATE INDEX IF NOT EXISTS idx_kb_entries_created_at ON knowledge_base_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_kb_entries_published_at ON knowledge_base_entries(published_at);
CREATE INDEX IF NOT EXISTS idx_kb_entries_tags ON knowledge_base_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_entries_keywords ON knowledge_base_entries USING GIN(keywords);

CREATE INDEX IF NOT EXISTS idx_kb_applications_entry_id ON knowledge_base_applications(knowledge_base_entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_applications_project_id ON knowledge_base_applications(target_project_id);
CREATE INDEX IF NOT EXISTS idx_kb_applications_applied_by ON knowledge_base_applications(applied_by);
CREATE INDEX IF NOT EXISTS idx_kb_applications_status ON knowledge_base_applications(status);
CREATE INDEX IF NOT EXISTS idx_kb_applications_applied_at ON knowledge_base_applications(applied_at);

CREATE INDEX IF NOT EXISTS idx_kb_reviews_entry_id ON knowledge_base_reviews(knowledge_base_entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_reviews_reviewer_id ON knowledge_base_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_kb_reviews_type ON knowledge_base_reviews(review_type);

-- Full-text search index for knowledge base entries
CREATE INDEX IF NOT EXISTS idx_kb_entries_search ON knowledge_base_entries 
    USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Comments for Documentation
COMMENT ON TABLE knowledge_base_entries IS 'Stores efficiency improvements, innovations, and best practices discovered through drift detection for replication across projects';
COMMENT ON TABLE knowledge_base_applications IS 'Tracks when knowledge base entries are applied to other projects and their outcomes';
COMMENT ON TABLE knowledge_base_reviews IS 'Stores peer reviews and feedback on knowledge base entries';

COMMENT ON COLUMN knowledge_base_entries.description IS 'Main content stored in Markdown format following ADPA standard';
COMMENT ON COLUMN knowledge_base_entries.baseline_approach IS 'JSONB containing original approach details: { description, cost, timeline, quality, challenges }';
COMMENT ON COLUMN knowledge_base_entries.improved_approach IS 'JSONB containing improved approach: { description, implementation_details, tools_used, techniques }';
COMMENT ON COLUMN knowledge_base_entries.value_metrics IS 'JSONB containing quantified value: { cost_savings, time_saved, quality_improvement, efficiency_gain }';
COMMENT ON COLUMN knowledge_base_entries.replication_guide IS 'JSONB containing replication steps: { steps, prerequisites, resources_needed, estimated_effort, risks }';

COMMIT;
