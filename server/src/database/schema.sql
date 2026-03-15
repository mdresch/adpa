-- ADPA Framework Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissions JSONB DEFAULT '{}',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    company_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    owner_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    team_members JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content JSONB,
    template_id UUID,
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    framework VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stakeholders Table
CREATE TABLE stakeholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    organization VARCHAR(255),
    engagement_approach VARCHAR(50) CHECK (engagement_approach IN ('manage_closely', 'keep_satisfied', 'keep_informed', 'monitor')),
    communication_frequency VARCHAR(20) CHECK (communication_frequency IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'as_needed')),
    stakeholder_type VARCHAR(20) CHECK (stakeholder_type IN ('internal', 'external')),
    stakeholder_category VARCHAR(20) CHECK (stakeholder_category IN ('primary', 'secondary')),
    influence_level VARCHAR(20) DEFAULT 'medium' CHECK (influence_level IN ('high', 'medium', 'low')),
    interest_level VARCHAR(20) DEFAULT 'medium' CHECK (interest_level IN ('high', 'medium', 'low')),
    responsibilities TEXT[] DEFAULT '{}',
    expectations TEXT[] DEFAULT '{}',
    communication_preferences TEXT[] DEFAULT '{}',
    availability JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Requirements Table
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'functional' CHECK (type IN ('functional', 'non_functional', 'business', 'technical')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'implemented', 'verified')),
    source VARCHAR(255),
    acceptance_criteria TEXT[] DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}',
    risks TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Constraints Table
CREATE TABLE constraints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'technical' CHECK (type IN ('budget', 'time', 'resource', 'technical', 'regulatory', 'business')),
    impact VARCHAR(20) DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
    mitigation_strategy TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Risks Table
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT NOT NULL,
    category VARCHAR(100),
    probability VARCHAR(20) DEFAULT 'medium' CHECK (probability IN ('high', 'medium', 'low')),
    impact VARCHAR(20) DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('high', 'medium', 'low')),
    mitigation TEXT,
    mitigation_strategy TEXT,
    contingency_plan TEXT,
    owner VARCHAR(255),
    status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'mitigated', 'accepted', 'transferred', 'assessed', 'closed', 'active', 'monitoring', 'materialized')),
    is_curated BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Success Criteria Table
CREATE TABLE success_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'quantitative' CHECK (type IN ('quantitative', 'qualitative')),
    metric VARCHAR(255),
    measurement TEXT,
    measurement_method TEXT,
    target VARCHAR(255),
    target_value DECIMAL,
    current_value DECIMAL,
    status VARCHAR(20) DEFAULT 'not_met' CHECK (status IN ('not_met', 'partially_met', 'met', 'exceeded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Deliverables Table
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Milestones Table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed')),
    dependencies TEXT[] DEFAULT '{}',
    deliverables TEXT[] DEFAULT '{}',
    success_criteria TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Phases Table
CREATE TABLE phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
    deliverables TEXT[] DEFAULT '{}',
    team_members TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    content JSONB NOT NULL,
    variables JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Providers table
CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    api_key_encrypted TEXT,
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    usage_stats JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    data JSONB,
    result JSONB,
    error_message TEXT,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integrations table
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    configuration JSONB NOT NULL,
    credentials_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    sync_status VARCHAR(20),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security Events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    source_ip INET,
    user_id UUID REFERENCES users(id),
    resource VARCHAR(255),
    action VARCHAR(100),
    details JSONB,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    properties JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Domain Extraction Runs
CREATE TABLE domain_extraction_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain VARCHAR(100) NOT NULL,
    job_id UUID,
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    ai_provider VARCHAR(50),
    ai_model VARCHAR(100),
    document_ids UUID[],
    total_entities INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domain_extraction_runs_project_id ON domain_extraction_runs(project_id);

-- Domain Entities (Dynamic/Generic Entities)
CREATE TABLE domain_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_domain_entities_project_id ON domain_entities(project_id);
CREATE INDEX idx_domain_entities_type ON domain_entities(entity_type);

-- Budget Baselines
CREATE TABLE budget_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_budget NUMERIC,
    currency VARCHAR(10) DEFAULT 'USD',
    categories JSONB DEFAULT '{}',
    approval_date TIMESTAMP WITH TIME ZONE,
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB DEFAULT '{}',
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_budget_baselines_project_id ON budget_baselines(project_id);

-- Cost Estimates
CREATE TABLE cost_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    wbs_code VARCHAR(50),
    estimated_cost NUMERIC,
    currency VARCHAR(10) DEFAULT 'USD',
    basis_of_estimate TEXT,
    contingency_buffer NUMERIC DEFAULT 0,
    confidence_level VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_cost_estimates_project_id ON cost_estimates(project_id);

-- Schedule Baselines
CREATE TABLE schedule_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB DEFAULT '{}',
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_schedule_baselines_project_id ON schedule_baselines(project_id);

-- Health checks table
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp);

-- API Request Logs Table
CREATE TABLE api_request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    endpoint VARCHAR(255),
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER DEFAULT 0,
    response_size INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration Sync Metadata table
CREATE TABLE integration_sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    adpa_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    external_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(integration_id, adpa_document_id)
);

-- Indexes for performance
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_integration_sync_metadata_integration_id ON integration_sync_metadata(integration_id);
CREATE INDEX idx_integration_sync_metadata_external_id ON integration_sync_metadata(external_id);
CREATE INDEX idx_integration_sync_metadata_adpa_document_id ON integration_sync_metadata(adpa_document_id);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON ai_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integration_sync_metadata_updated_at BEFORE UPDATE ON integration_sync_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI usage logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID,
    model_id UUID,
    provider_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    status_code INTEGER,
    user_id UUID,
    project_id UUID,
    document_id UUID,
    estimated_cost DECIMAL(10, 5) DEFAULT 0,
    request_payload JSONB,
    response_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_id TEXT,
    activity_type VARCHAR(50) NOT NULL,
    activity_category VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document analytics
CREATE TABLE IF NOT EXISTS document_analytics (
    document_id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    view_count INTEGER DEFAULT 0,
    edit_count INTEGER DEFAULT 0,
    pdf_exports INTEGER DEFAULT 0,
    docx_exports INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    last_viewed_by UUID,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    last_edited_by UUID,
    total_read_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corrected system_metrics
ALTER TABLE IF EXISTS system_metrics RENAME TO system_metrics_old;
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR(20),
    threshold_warning FLOAT,
    threshold_critical FLOAT,
    status VARCHAR(20) DEFAULT 'normal',
    tags JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job execution logs
CREATE TABLE IF NOT EXISTS job_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    queue_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    priority INTEGER DEFAULT 0,
    queued_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    user_id UUID,
    project_id UUID,
    job_data JSONB,
    result_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search analytics
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    query TEXT NOT NULL,
    query_length INTEGER NOT NULL,
    search_mode VARCHAR(20) NOT NULL,
    types TEXT[],
    frameworks TEXT[],
    authors TEXT[],
    tags TEXT[],
    has_date_filter BOOLEAN DEFAULT FALSE,
    total_results INTEGER DEFAULT 0,
    results_returned INTEGER DEFAULT 0,
    has_results BOOLEAN DEFAULT FALSE,
    response_time_ms INTEGER DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search result clicks
CREATE TABLE IF NOT EXISTS search_result_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL REFERENCES search_analytics(id),
    result_id VARCHAR(100) NOT NULL,
    result_type VARCHAR(20) NOT NULL,
    result_title TEXT,
    result_position INTEGER NOT NULL,
    relevance_score FLOAT,
    user_id UUID,
    action_type VARCHAR(20) DEFAULT 'view',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search suggestion clicks
CREATE TABLE IF NOT EXISTS search_suggestion_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    suggestion_text TEXT NOT NULL,
    suggestion_type VARCHAR(20) NOT NULL,
    query_before TEXT,
    query_after TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_document_analytics_updated_at BEFORE UPDATE ON document_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

