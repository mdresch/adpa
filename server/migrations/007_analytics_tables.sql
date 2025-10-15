-- Analytics Data Collection Tables
-- This migration creates tables to track all analytics metrics

-- ============================================
-- AI USAGE ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request Info
    provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    model_id UUID REFERENCES model_configurations(id) ON DELETE SET NULL,
    provider_type VARCHAR(50) NOT NULL, -- openai, google, azure, etc.
    model_name VARCHAR(255) NOT NULL,
    
    -- Usage Metrics
    request_type VARCHAR(50) NOT NULL, -- generate, analyze, summarize, compress, etc.
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Performance Metrics
    response_time_ms INTEGER NOT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    status_code INTEGER,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    
    -- Cost Estimation (in USD)
    estimated_cost DECIMAL(10, 6) DEFAULT 0,
    
    -- Metadata
    request_payload JSONB,
    response_metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for fast queries
    CONSTRAINT positive_tokens CHECK (input_tokens >= 0 AND output_tokens >= 0)
);

CREATE INDEX idx_ai_usage_provider ON ai_usage_logs(provider_id, created_at DESC);
CREATE INDEX idx_ai_usage_model ON ai_usage_logs(model_id, created_at DESC);
CREATE INDEX idx_ai_usage_user ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_project ON ai_usage_logs(project_id, created_at DESC);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_success ON ai_usage_logs(success, created_at DESC);
CREATE INDEX idx_ai_usage_type ON ai_usage_logs(request_type, created_at DESC);

-- ============================================
-- API REQUEST ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request Info
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
    path TEXT NOT NULL,
    endpoint VARCHAR(255), -- Normalized endpoint like /api/projects/:id
    
    -- Performance
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    
    -- User Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Request/Response Details
    request_size INTEGER DEFAULT 0,
    response_size INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_logs_endpoint ON api_request_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id, created_at DESC);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code, created_at DESC);
CREATE INDEX idx_api_logs_created ON api_request_logs(created_at DESC);

-- ============================================
-- USER ACTIVITY TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User & Session
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    
    -- Activity Details
    activity_type VARCHAR(100) NOT NULL, -- login, logout, view_document, edit_document, etc.
    activity_category VARCHAR(50) NOT NULL, -- auth, document, project, system
    
    -- Context
    entity_type VARCHAR(50), -- document, project, template, etc.
    entity_id UUID,
    
    -- Details
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_user_activity_type ON user_activity_logs(activity_type, created_at DESC);
CREATE INDEX idx_user_activity_category ON user_activity_logs(activity_category, created_at DESC);
CREATE INDEX idx_user_activity_created ON user_activity_logs(created_at DESC);

-- ============================================
-- DOCUMENT ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS document_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Document Reference
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- View Statistics
    view_count INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    last_viewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Edit Statistics
    edit_count INTEGER DEFAULT 0,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Engagement Metrics
    avg_read_time_seconds INTEGER DEFAULT 0,
    total_read_time_seconds INTEGER DEFAULT 0,
    
    -- Export Statistics
    pdf_exports INTEGER DEFAULT 0,
    docx_exports INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id)
);

CREATE INDEX idx_doc_analytics_project ON document_analytics(project_id);
CREATE INDEX idx_doc_analytics_views ON document_analytics(view_count DESC);
CREATE INDEX idx_doc_analytics_edits ON document_analytics(edit_count DESC);

-- ============================================
-- SYSTEM PERFORMANCE METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Metric Info
    metric_name VARCHAR(100) NOT NULL, -- cpu_usage, memory_usage, active_connections, etc.
    metric_category VARCHAR(50) NOT NULL, -- system, database, api, queue
    
    -- Values
    value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20), -- percent, mb, count, ms, etc.
    
    -- Thresholds
    threshold_warning DECIMAL(10, 2),
    threshold_critical DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'normal', -- normal, warning, critical
    
    -- Metadata
    tags JSONB,
    
    -- Timestamps
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name, measured_at DESC);
CREATE INDEX idx_system_metrics_category ON system_metrics(metric_category, measured_at DESC);
CREATE INDEX idx_system_metrics_measured ON system_metrics(measured_at DESC);

-- ============================================
-- JOB QUEUE ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS job_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job Info
    job_id VARCHAR(255) NOT NULL,
    job_type VARCHAR(100) NOT NULL, -- document_generation, ai_analysis, etc.
    queue_name VARCHAR(100) NOT NULL,
    
    -- Execution Details
    status VARCHAR(50) NOT NULL, -- queued, running, completed, failed
    priority INTEGER DEFAULT 0,
    
    -- Performance
    queued_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Results
    success BOOLEAN,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Metadata
    job_data JSONB,
    result_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_logs_type ON job_execution_logs(job_type, created_at DESC);
CREATE INDEX idx_job_logs_status ON job_execution_logs(status, created_at DESC);
CREATE INDEX idx_job_logs_queue ON job_execution_logs(queue_name, created_at DESC);
CREATE INDEX idx_job_logs_created ON job_execution_logs(created_at DESC);

-- ============================================
-- AGGREGATED STATISTICS (for faster queries)
-- ============================================

CREATE TABLE IF NOT EXISTS daily_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    
    -- AI Usage Stats
    ai_requests_total INTEGER DEFAULT 0,
    ai_requests_success INTEGER DEFAULT 0,
    ai_tokens_total BIGINT DEFAULT 0,
    ai_cost_total DECIMAL(10, 2) DEFAULT 0,
    
    -- API Stats
    api_requests_total INTEGER DEFAULT 0,
    api_requests_2xx INTEGER DEFAULT 0,
    api_requests_4xx INTEGER DEFAULT 0,
    api_requests_5xx INTEGER DEFAULT 0,
    api_avg_response_time_ms INTEGER DEFAULT 0,
    
    -- User Stats
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    
    -- Document Stats
    documents_created INTEGER DEFAULT 0,
    documents_edited INTEGER DEFAULT 0,
    documents_viewed INTEGER DEFAULT 0,
    
    -- Job Stats
    jobs_queued INTEGER DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    jobs_failed INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date)
);

CREATE INDEX idx_daily_stats_date ON daily_statistics(date DESC);

-- ============================================
-- MATERIALIZED VIEWS FOR FAST ANALYTICS
-- ============================================

-- Provider Performance View (last 30 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_provider_performance AS
SELECT 
    provider_type,
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as request_count,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
    ROUND(AVG(response_time_ms)) as avg_response_time,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost
FROM ai_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY provider_type, DATE_TRUNC('day', created_at)
ORDER BY date DESC, request_count DESC;

CREATE UNIQUE INDEX idx_mv_provider_perf ON mv_provider_performance(provider_type, date);

-- Model Performance View (last 30 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_model_performance AS
SELECT 
    model_name,
    provider_type,
    COUNT(*) as usage_count,
    SUM(total_tokens) as total_tokens,
    ROUND(AVG(response_time_ms)) as avg_response_time,
    ROUND(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate,
    SUM(estimated_cost) as total_cost
FROM ai_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY model_name, provider_type
ORDER BY usage_count DESC;

CREATE UNIQUE INDEX idx_mv_model_perf ON mv_model_performance(model_name, provider_type);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_model_performance;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily statistics
CREATE OR REPLACE FUNCTION aggregate_daily_statistics(target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO daily_statistics (
        date,
        ai_requests_total,
        ai_requests_success,
        ai_tokens_total,
        ai_cost_total,
        api_requests_total,
        api_requests_2xx,
        api_requests_4xx,
        api_requests_5xx,
        api_avg_response_time_ms,
        active_users,
        documents_created,
        documents_edited,
        documents_viewed
    )
    SELECT 
        target_date,
        (SELECT COUNT(*) FROM ai_usage_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM ai_usage_logs WHERE DATE(created_at) = target_date AND success = true),
        (SELECT COALESCE(SUM(total_tokens), 0) FROM ai_usage_logs WHERE DATE(created_at) = target_date),
        (SELECT COALESCE(SUM(estimated_cost), 0) FROM ai_usage_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date AND status_code BETWEEN 200 AND 299),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date AND status_code BETWEEN 400 AND 499),
        (SELECT COUNT(*) FROM api_request_logs WHERE DATE(created_at) = target_date AND status_code BETWEEN 500 AND 599),
        (SELECT COALESCE(AVG(response_time_ms), 0)::INTEGER FROM api_request_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(DISTINCT user_id) FROM user_activity_logs WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM documents WHERE DATE(created_at) = target_date),
        (SELECT COUNT(DISTINCT document_id) FROM user_activity_logs WHERE DATE(created_at) = target_date AND activity_type = 'edit_document'),
        (SELECT COUNT(DISTINCT document_id) FROM user_activity_logs WHERE DATE(created_at) = target_date AND activity_type = 'view_document')
    ON CONFLICT (date) DO UPDATE SET
        ai_requests_total = EXCLUDED.ai_requests_total,
        ai_requests_success = EXCLUDED.ai_requests_success,
        ai_tokens_total = EXCLUDED.ai_tokens_total,
        ai_cost_total = EXCLUDED.ai_cost_total,
        api_requests_total = EXCLUDED.api_requests_total,
        api_requests_2xx = EXCLUDED.api_requests_2xx,
        api_requests_4xx = EXCLUDED.api_requests_4xx,
        api_requests_5xx = EXCLUDED.api_requests_5xx,
        api_avg_response_time_ms = EXCLUDED.api_avg_response_time_ms,
        active_users = EXCLUDED.active_users,
        documents_created = EXCLUDED.documents_created,
        documents_edited = EXCLUDED.documents_edited,
        documents_viewed = EXCLUDED.documents_viewed,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTIONS (to prevent unlimited growth)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    -- Keep detailed logs for 90 days, delete older
    DELETE FROM ai_usage_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM api_request_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM user_activity_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM job_execution_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    DELETE FROM system_metrics WHERE measured_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    -- Keep daily statistics for 2 years
    DELETE FROM daily_statistics WHERE date < CURRENT_DATE - INTERVAL '730 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE ai_usage_logs IS 'Tracks every AI API call for analytics and cost monitoring';
COMMENT ON TABLE api_request_logs IS 'Tracks all API requests for performance monitoring';
COMMENT ON TABLE user_activity_logs IS 'Tracks user actions for engagement analytics';
COMMENT ON TABLE document_analytics IS 'Aggregated document statistics';
COMMENT ON TABLE system_metrics IS 'System health and performance metrics';
COMMENT ON TABLE job_execution_logs IS 'Background job execution tracking';
COMMENT ON TABLE daily_statistics IS 'Pre-aggregated daily statistics for fast queries';

