-- Migration: Baseline Drift Detection System
-- CR-2026-001: Project Baseline & Drift Detection System
-- Phase 1: Baseline Foundation Database Schema

-- Project Baselines Table
CREATE TABLE project_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'superseded')),
    
    -- Baseline Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    superseded_by UUID REFERENCES project_baselines(id),
    
    -- Document Corpus Used for Baseline Creation
    document_corpus JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of document IDs used
    corpus_analysis JSONB DEFAULT NULL, -- AI analysis of document corpus
    
    -- Extracted Baseline Components
    scope_baseline JSONB DEFAULT NULL, -- Scope components, deliverables, boundaries
    technical_baseline JSONB DEFAULT NULL, -- Tech stack, architecture, constraints
    timeline_baseline JSONB DEFAULT NULL, -- Milestones, dependencies, critical path
    cost_baseline JSONB DEFAULT NULL, -- Budget, resources, cost breakdown
    resource_baseline JSONB DEFAULT NULL, -- Team, skills, capacity
    success_criteria JSONB DEFAULT NULL, -- KPIs, acceptance criteria, metrics
    
    -- AI Processing Metadata
    ai_processing_metadata JSONB DEFAULT NULL, -- Provider, model, tokens, confidence scores
    extraction_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
    
    -- Baseline Quality Metrics
    completeness_score DECIMAL(3,2) DEFAULT 0.0 CHECK (completeness_score >= 0 AND completeness_score <= 1),
    consistency_score DECIMAL(3,2) DEFAULT 0.0 CHECK (consistency_score >= 0 AND consistency_score <= 1),
    clarity_score DECIMAL(3,2) DEFAULT 0.0 CHECK (clarity_score >= 0 AND clarity_score <= 1),
    
    -- Notes and Comments
    notes TEXT DEFAULT NULL,
    review_comments JSONB DEFAULT NULL, -- Array of review comments
    
    CONSTRAINT unique_project_version UNIQUE (project_id, version)
);

-- Baseline Components Table (detailed breakdown)
CREATE TABLE baseline_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL CHECK (component_type IN (
        'scope_deliverable', 'scope_boundary', 'scope_assumption',
        'tech_stack', 'tech_constraint', 'tech_requirement',
        'timeline_milestone', 'timeline_dependency', 'timeline_critical_path',
        'cost_budget', 'cost_resource', 'cost_breakdown',
        'resource_team', 'resource_skill', 'resource_capacity',
        'success_kpi', 'success_criteria', 'success_metric'
    )),
    
    -- Component Details
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Source Information
    source_document_id UUID REFERENCES documents(id),
    source_text TEXT DEFAULT NULL, -- Excerpt from source document
    confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Component Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ordering and Grouping
    sort_order INTEGER DEFAULT 0,
    parent_component_id UUID REFERENCES baseline_components(id),
    
    CONSTRAINT unique_baseline_component UNIQUE (baseline_id, component_type, title)
);

-- Baseline Versions Table (change tracking)
CREATE TABLE baseline_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,
    
    -- Version Metadata
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'updated', 'approved', 'superseded')),
    change_description TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    
    -- Change Details
    changes_summary JSONB DEFAULT NULL, -- Summary of what changed
    affected_components JSONB DEFAULT NULL, -- Array of component IDs that changed
    
    CONSTRAINT unique_baseline_version UNIQUE (baseline_id, version_number)
);

-- Baseline Drift Detection Table
CREATE TABLE baseline_drift_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_id UUID NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Drift Detection Metadata
    detection_date TIMESTAMP DEFAULT NOW(),
    detection_type VARCHAR(50) NOT NULL CHECK (detection_type IN (
        'scope_drift', 'technical_drift', 'timeline_drift', 'cost_drift', 'resource_drift', 'success_criteria_drift'
    )),
    
    -- Drift Details
    drift_severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (drift_severity IN ('low', 'medium', 'high', 'critical')),
    drift_description TEXT NOT NULL,
    drift_impact TEXT DEFAULT NULL,
    
    -- Source Information
    source_document_id UUID REFERENCES documents(id),
    detected_by VARCHAR(50) DEFAULT 'ai' CHECK (detected_by IN ('ai', 'manual', 'user_report')),
    
    -- AI Processing Metadata
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    ai_processing_metadata JSONB DEFAULT NULL,
    
    -- Status and Actions
    status VARCHAR(20) DEFAULT 'detected' CHECK (status IN ('detected', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT DEFAULT NULL,
    resolved_at TIMESTAMP DEFAULT NULL,
    
    -- Alert Settings
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMP DEFAULT NULL
);

-- Innovation Opportunities Table
CREATE TABLE innovation_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    baseline_id UUID REFERENCES project_baselines(id) ON DELETE CASCADE,
    
    -- Opportunity Details
    opportunity_type VARCHAR(50) NOT NULL CHECK (opportunity_type IN (
        'patent_opportunity', 'process_improvement', 'technology_innovation', 
        'methodology_advancement', 'efficiency_gain', 'cost_reduction'
    )),
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    potential_value TEXT DEFAULT NULL,
    
    -- Source Information
    source_document_id UUID REFERENCES documents(id),
    detected_by VARCHAR(50) DEFAULT 'ai' CHECK (detected_by IN ('ai', 'manual', 'user_report')),
    
    -- AI Processing Metadata
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    novelty_score DECIMAL(3,2) DEFAULT 0.0 CHECK (novelty_score >= 0 AND novelty_score <= 1),
    ai_processing_metadata JSONB DEFAULT NULL,
    
    -- Patent Research
    prior_art_research JSONB DEFAULT NULL, -- Results from prior art search
    patentability_score DECIMAL(3,2) DEFAULT 0.0 CHECK (patentability_score >= 0 AND patentability_score <= 1),
    
    -- Status and Actions
    status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'evaluating', 'pursuing', 'patent_filed', 'implemented', 'rejected')),
    assigned_to UUID REFERENCES users(id),
    evaluation_notes TEXT DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_project_baselines_project_id ON project_baselines(project_id);
CREATE INDEX idx_project_baselines_status ON project_baselines(status);
CREATE INDEX idx_project_baselines_created_at ON project_baselines(created_at);

CREATE INDEX idx_baseline_components_baseline_id ON baseline_components(baseline_id);
CREATE INDEX idx_baseline_components_type ON baseline_components(component_type);
CREATE INDEX idx_baseline_components_source_document ON baseline_components(source_document_id);

CREATE INDEX idx_baseline_versions_baseline_id ON baseline_versions(baseline_id);
CREATE INDEX idx_baseline_versions_changed_at ON baseline_versions(changed_at);

CREATE INDEX idx_baseline_drift_project_id ON baseline_drift_detection(project_id);
CREATE INDEX idx_baseline_drift_baseline_id ON baseline_drift_detection(baseline_id);
CREATE INDEX idx_baseline_drift_type ON baseline_drift_detection(detection_type);
CREATE INDEX idx_baseline_drift_severity ON baseline_drift_detection(drift_severity);
CREATE INDEX idx_baseline_drift_status ON baseline_drift_detection(status);
CREATE INDEX idx_baseline_drift_detection_date ON baseline_drift_detection(detection_date);

CREATE INDEX idx_innovation_opportunities_project_id ON innovation_opportunities(project_id);
CREATE INDEX idx_innovation_opportunities_type ON innovation_opportunities(opportunity_type);
CREATE INDEX idx_innovation_opportunities_status ON innovation_opportunities(status);
CREATE INDEX idx_innovation_opportunities_novelty ON innovation_opportunities(novelty_score);

-- Comments for Documentation
COMMENT ON TABLE project_baselines IS 'Stores project baselines created from document corpus analysis';
COMMENT ON TABLE baseline_components IS 'Detailed breakdown of baseline components extracted from documents';
COMMENT ON TABLE baseline_versions IS 'Version control and change tracking for baselines';
COMMENT ON TABLE baseline_drift_detection IS 'AI-detected deviations from established baselines';
COMMENT ON TABLE innovation_opportunities IS 'AI-identified innovation and patent opportunities';

-- Insert initial baseline for CR-2026-001 (Baseline Drift Detection System)
-- Commented out: This will be created via the UI once a project exists
/*
INSERT INTO project_baselines (
    project_id,
    version,
    status,
    created_by,
    document_corpus,
    scope_baseline,
    technical_baseline,
    timeline_baseline,
    cost_baseline,
    resource_baseline,
    success_criteria,
    extraction_confidence,
    completeness_score,
    consistency_score,
    clarity_score,
    notes
) VALUES (
    (SELECT id FROM projects WHERE name = 'ADPA' LIMIT 1),
    '1.0',
    'approved',
    (SELECT id FROM users WHERE email = 'menno@adpa.com' LIMIT 1),
    '[]'::jsonb,
    '{
        "project_scope": "Build an AI-powered system for automated baseline creation, continuous drift monitoring, patent opportunity detection, and early warning alerts",
        "key_deliverables": [
            "Phase 1: Baseline Foundation (AI document analysis, scope/tech/success criteria extraction, version control)",
            "Phase 2: Drift Detection Engine (scope/tech/timeline drift, impact assessment, alerts)",
            "Phase 3: Efficiency & Value Tracking (positive deviation, value quantification, recommendations)",
            "Phase 4: Innovation & Patent Detection (novel approach, prior art search, patentability assessment)"
        ],
        "exclusions": [
            "Full PM system",
            "Time/resource tracking",
            "Financial accounting",
            "Contract management",
            "Automated execution",
            "Patent filing automation",
            "Real-time monitoring"
        ]
    }'::jsonb,
    '{
        "tech_stack": ["PostgreSQL", "Redis", "Express.js", "Next.js", "TypeScript", "AI/LLM APIs"],
        "architecture": "Microservices with AI processing pipeline",
        "constraints": ["Must integrate with existing ADPA platform", "AI accuracy requirements", "Performance scalability"]
    }'::jsonb,
    '{
        "total_duration": "12 months",
        "phases": [
            {"phase": "Phase 1", "duration": "3 months", "milestones": ["Baseline creation working for 5 pilot projects"]},
            {"phase": "Phase 2", "duration": "2 months", "milestones": ["Drift detection alerts generated for pilot projects"]},
            {"phase": "Phase 3", "duration": "2 months", "milestones": ["Efficiency recommendations delivered"]},
            {"phase": "Phase 4", "duration": "3 months", "milestones": ["Patent opportunity flagged (at least 1)"]},
            {"phase": "Buffer", "duration": "2 months", "milestones": ["Full system deployed to all active projects"]}
        ]
    }'::jsonb,
    '{
        "total_budget": 400000,
        "breakdown": {
            "development": 320000,
            "ai_llm_costs": 30000,
            "prior_art_apis": 20000,
            "infrastructure": 10000,
            "training_docs": 20000
        },
        "contingency_reserve": 60000
    }'::jsonb,
    '{
        "team_requirements": ["AI/ML Engineer", "Full-stack Developer", "DevOps Engineer", "Product Manager"],
        "skills_needed": ["AI/LLM integration", "PostgreSQL optimization", "Redis caching", "Patent research"],
        "capacity_allocation": "50% of current ADPA team capacity"
    }'::jsonb,
    '{
        "kpis": [
            "Baseline creation accuracy > 85%",
            "Drift detection precision > 80%",
            "Patent opportunity identification > 1 per quarter",
            "Cost savings > $1M annually"
        ],
        "acceptance_criteria": [
            "System processes 100+ documents for baseline creation",
            "Alerts generated within 24 hours of drift detection",
            "ROI > 300% within 3 years"
        ]
    }'::jsonb,
    0.95,
    0.90,
    0.88,
    0.92,
    'Initial baseline for CR-2026-001 Baseline Drift Detection System - approved for implementation'
);
*/
