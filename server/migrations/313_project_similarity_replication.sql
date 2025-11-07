-- Migration: Project Similarity and Replication System
-- TASK-748: Replication to similar projects
-- Phase 3: Workflow Automation - Replication to similar projects
-- 
-- This migration creates tables for tracking similar projects and managing
-- the replication of efficiency improvements from drift detection to similar projects.

BEGIN;

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Project Similarity Table
-- Tracks relationships between similar projects based on various attributes
CREATE TABLE IF NOT EXISTS project_similarity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    similar_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Similarity Score and Metadata
    similarity_score DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (similarity_score >= 0 AND similarity_score <= 1),
    similarity_factors JSONB DEFAULT NULL, -- Details on what makes them similar
    
    -- Similarity Dimensions
    framework_match BOOLEAN DEFAULT FALSE,
    domain_match BOOLEAN DEFAULT FALSE,
    tech_stack_match BOOLEAN DEFAULT FALSE,
    budget_range_match BOOLEAN DEFAULT FALSE,
    team_size_match BOOLEAN DEFAULT FALSE,
    
    -- Detection Metadata
    detected_by VARCHAR(50) DEFAULT 'ai' CHECK (detected_by IN ('ai', 'manual', 'user_defined')),
    detected_at TIMESTAMP DEFAULT NOW(),
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    ai_processing_metadata JSONB DEFAULT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    notes TEXT DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate relationships and self-references
    CONSTRAINT unique_project_similarity UNIQUE (project_id, similar_project_id),
    CONSTRAINT no_self_similarity CHECK (project_id != similar_project_id)
);

-- Efficiency Improvement Replications Table
-- Tracks when efficiency improvements from positive drift are replicated to similar projects
CREATE TABLE IF NOT EXISTS efficiency_improvement_replications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source Information
    source_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_drift_id UUID REFERENCES baseline_drift_detection(id) ON DELETE SET NULL,
    source_innovation_id UUID REFERENCES innovation_opportunities(id) ON DELETE SET NULL,
    
    -- Target Project
    target_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Improvement Details
    improvement_type VARCHAR(50) NOT NULL CHECK (improvement_type IN (
        'efficiency_improvement', 'cost_reduction', 'timeline_acceleration',
        'quality_improvement', 'process_improvement', 'technology_innovation'
    )),
    improvement_title VARCHAR(255) NOT NULL,
    improvement_description TEXT NOT NULL,
    
    -- Value Metrics
    estimated_value JSONB DEFAULT NULL, -- { "cost_savings": 1000, "time_savings_days": 5, "quality_improvement_pct": 10 }
    actual_value JSONB DEFAULT NULL, -- Measured after implementation
    
    -- Replication Status
    replication_status VARCHAR(50) DEFAULT 'identified' CHECK (replication_status IN (
        'identified',           -- Similar project identified as candidate
        'pending_approval',     -- Awaiting approval to apply
        'approved',            -- Approved for replication
        'in_progress',         -- Being implemented
        'completed',           -- Successfully implemented
        'verified',            -- Results verified and measured
        'rejected',            -- Not applicable or rejected
        'failed'               -- Implementation failed
    )),
    
    -- Workflow
    identified_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP DEFAULT NULL,
    approved_by UUID REFERENCES users(id),
    started_at TIMESTAMP DEFAULT NULL,
    completed_at TIMESTAMP DEFAULT NULL,
    verified_at TIMESTAMP DEFAULT NULL,
    
    -- Change Request Integration
    change_request_id VARCHAR(100) DEFAULT NULL, -- References auto-generated CR
    
    -- Implementation Details
    implementation_notes TEXT DEFAULT NULL,
    implementation_approach TEXT DEFAULT NULL,
    challenges_encountered TEXT DEFAULT NULL,
    lessons_learned TEXT DEFAULT NULL,
    
    -- AI Processing
    ai_recommendation_score DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_recommendation_score >= 0 AND ai_recommendation_score <= 1),
    ai_processing_metadata JSONB DEFAULT NULL,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure we don't duplicate replications
    CONSTRAINT unique_replication UNIQUE (source_project_id, target_project_id, improvement_title)
);

-- Replication Value Tracking Table
-- Tracks the cumulative value captured from replications
CREATE TABLE IF NOT EXISTS replication_value_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source and Tracking
    source_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    improvement_title VARCHAR(255) NOT NULL,
    
    -- Aggregated Metrics
    total_replications INTEGER DEFAULT 0,
    successful_replications INTEGER DEFAULT 0,
    failed_replications INTEGER DEFAULT 0,
    
    -- Value Metrics
    total_estimated_value DECIMAL(15,2) DEFAULT 0.00,
    total_actual_value DECIMAL(15,2) DEFAULT 0.00,
    roi_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Source Value (from original project)
    source_cost_savings DECIMAL(15,2) DEFAULT 0.00,
    source_time_savings_days INTEGER DEFAULT 0,
    
    -- Cumulative Value (across all replications)
    cumulative_cost_savings DECIMAL(15,2) DEFAULT 0.00,
    cumulative_time_savings_days INTEGER DEFAULT 0,
    
    -- Tracking
    first_replication_at TIMESTAMP DEFAULT NULL,
    last_replication_at TIMESTAMP DEFAULT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_value_tracking UNIQUE (source_project_id, improvement_title)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_project_similarity_project ON project_similarity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_similarity_similar ON project_similarity(similar_project_id);
CREATE INDEX IF NOT EXISTS idx_project_similarity_score ON project_similarity(similarity_score);
CREATE INDEX IF NOT EXISTS idx_project_similarity_status ON project_similarity(status);

CREATE INDEX IF NOT EXISTS idx_replication_source_project ON efficiency_improvement_replications(source_project_id);
CREATE INDEX IF NOT EXISTS idx_replication_target_project ON efficiency_improvement_replications(target_project_id);
CREATE INDEX IF NOT EXISTS idx_replication_status ON efficiency_improvement_replications(replication_status);
CREATE INDEX IF NOT EXISTS idx_replication_type ON efficiency_improvement_replications(improvement_type);
CREATE INDEX IF NOT EXISTS idx_replication_drift_id ON efficiency_improvement_replications(source_drift_id);
CREATE INDEX IF NOT EXISTS idx_replication_innovation_id ON efficiency_improvement_replications(source_innovation_id);

CREATE INDEX IF NOT EXISTS idx_value_tracking_source ON replication_value_tracking(source_project_id);
CREATE INDEX IF NOT EXISTS idx_value_tracking_status ON replication_value_tracking(status);

-- Comments for Documentation
COMMENT ON TABLE project_similarity IS 'Tracks relationships between similar projects for replication opportunities';
COMMENT ON TABLE efficiency_improvement_replications IS 'Manages replication of efficiency improvements from one project to similar projects';
COMMENT ON TABLE replication_value_tracking IS 'Aggregates and tracks cumulative value from improvement replications';

COMMENT ON COLUMN project_similarity.similarity_score IS 'Overall similarity score (0-1) between two projects';
COMMENT ON COLUMN project_similarity.similarity_factors IS 'JSON object detailing specific factors that make projects similar';
COMMENT ON COLUMN efficiency_improvement_replications.estimated_value IS 'Projected value if improvement is replicated';
COMMENT ON COLUMN efficiency_improvement_replications.actual_value IS 'Measured value after implementation';
COMMENT ON COLUMN replication_value_tracking.roi_percentage IS 'Return on investment percentage for replication effort';

COMMIT;
