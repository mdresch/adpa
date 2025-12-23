-- Context Orchestrator Tables
-- Enhanced context gathering and injection system with comprehensive logging and metrics

-- Context gathering metrics table
CREATE TABLE IF NOT EXISTS context_gathering_metrics (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    total_sources_attempted INTEGER NOT NULL DEFAULT 0,
    successful_sources INTEGER NOT NULL DEFAULT 0,
    failed_sources INTEGER NOT NULL DEFAULT 0,
    total_data_size_bytes BIGINT NOT NULL DEFAULT 0,
    total_processing_time_ms INTEGER NOT NULL DEFAULT 0,
    average_freshness_score DECIMAL(3,2) DEFAULT 0.0,
    access_control_checks INTEGER NOT NULL DEFAULT 0,
    cache_hit_rate DECIMAL(3,2) DEFAULT 0.0,
    error_rate DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context source logs table
CREATE TABLE IF NOT EXISTS context_source_logs (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    retrieval_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    retrieval_duration_ms INTEGER NOT NULL DEFAULT 0,
    data_size_bytes BIGINT NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    freshness_score DECIMAL(3,2) DEFAULT 0.0,
    access_granted BOOLEAN NOT NULL DEFAULT false,
    cache_hit BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context injection metrics table
CREATE TABLE IF NOT EXISTS context_injection_metrics (
    id SERIAL PRIMARY KEY,
    bundle_id VARCHAR(255) NOT NULL,
    template_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    total_sources INTEGER NOT NULL DEFAULT 0,
    successful_sources INTEGER NOT NULL DEFAULT 0,
    failed_sources INTEGER NOT NULL DEFAULT 0,
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    processing_time_ms INTEGER NOT NULL DEFAULT 0,
    injection_strategy VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context freshness assessments table
CREATE TABLE IF NOT EXISTS context_freshness_assessments (
    id SERIAL PRIMARY KEY,
    context_id VARCHAR(255) NOT NULL,
    assessed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    freshness_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    staleness_level VARCHAR(50) NOT NULL DEFAULT 'unknown',
    decay_rate DECIMAL(5,4) DEFAULT 0.0,
    time_since_update BIGINT DEFAULT 0,
    time_since_access BIGINT DEFAULT 0,
    freshness_trend JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    next_assessment_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context refresh results table
CREATE TABLE IF NOT EXISTS context_refresh_results (
    id SERIAL PRIMARY KEY,
    context_id VARCHAR(255) NOT NULL,
    refreshed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_duration INTEGER NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT false,
    new_freshness_score DECIMAL(3,2) DEFAULT 0.0,
    changes_detected BOOLEAN NOT NULL DEFAULT false,
    change_summary JSONB DEFAULT '{}',
    error_message TEXT,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context freshness policy results table
CREATE TABLE IF NOT EXISTS context_freshness_policy_results (
    id SERIAL PRIMARY KEY,
    policy_id VARCHAR(255) NOT NULL,
    context_id VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    actions_taken JSONB DEFAULT '[]',
    performance_impact JSONB DEFAULT '{}',
    quality_impact JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context freshness policy evaluations table
CREATE TABLE IF NOT EXISTS context_freshness_policy_evaluations (
    id SERIAL PRIMARY KEY,
    policy_id VARCHAR(255) NOT NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    contexts_evaluated INTEGER NOT NULL DEFAULT 0,
    actions_recommended INTEGER NOT NULL DEFAULT 0,
    actions_executed INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    performance_impact JSONB DEFAULT '{}',
    quality_impact JSONB DEFAULT '{}',
    cost_benefit_analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_context_gathering_metrics_request_id ON context_gathering_metrics(request_id);
CREATE INDEX IF NOT EXISTS idx_context_gathering_metrics_created_at ON context_gathering_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_context_source_logs_source_id ON context_source_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_context_source_logs_source_type ON context_source_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_context_source_logs_retrieval_timestamp ON context_source_logs(retrieval_timestamp);
CREATE INDEX IF NOT EXISTS idx_context_source_logs_success ON context_source_logs(success);

CREATE INDEX IF NOT EXISTS idx_context_injection_metrics_bundle_id ON context_injection_metrics(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_injection_metrics_template_id ON context_injection_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_context_injection_metrics_project_id ON context_injection_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_context_injection_metrics_user_id ON context_injection_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_context_injection_metrics_created_at ON context_injection_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_context_freshness_assessments_context_id ON context_freshness_assessments(context_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_assessments_assessed_at ON context_freshness_assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_context_freshness_assessments_staleness_level ON context_freshness_assessments(staleness_level);

CREATE INDEX IF NOT EXISTS idx_context_refresh_results_context_id ON context_refresh_results(context_id);
CREATE INDEX IF NOT EXISTS idx_context_refresh_results_refreshed_at ON context_refresh_results(refreshed_at);
CREATE INDEX IF NOT EXISTS idx_context_refresh_results_success ON context_refresh_results(success);

CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_results_policy_id ON context_freshness_policy_results(policy_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_results_context_id ON context_freshness_policy_results(context_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_results_applied_at ON context_freshness_policy_results(applied_at);

CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_evaluations_policy_id ON context_freshness_policy_evaluations(policy_id);
CREATE INDEX IF NOT EXISTS idx_context_freshness_policy_evaluations_evaluated_at ON context_freshness_policy_evaluations(evaluated_at);