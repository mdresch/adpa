-- Multi-Stage Document Processor Database Schema
-- Creates tables for the 6-stage document processing pipeline

-- Document Processing Jobs Table
CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    request_id VARCHAR(255) NOT NULL,
    template_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_stage VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    error JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline Executions Table
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) NOT NULL REFERENCES document_processing_jobs(job_id) ON DELETE CASCADE,
    request_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_stage VARCHAR(50),
    stages_completed JSONB DEFAULT '[]',
    stages_remaining JSONB DEFAULT '[]',
    estimated_completion TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    error JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stage Jobs Table
CREATE TABLE IF NOT EXISTS stage_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    stage_id VARCHAR(255) NOT NULL,
    stage_type VARCHAR(50) NOT NULL CHECK (stage_type IN ('context_gathering', 'template_processing', 'ai_generation', 'context_injection', 'quality_assurance', 'output_formatting')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    input_data JSONB,
    output_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    error JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stage Executions Table
CREATE TABLE IF NOT EXISTS stage_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) NOT NULL,
    stage_id VARCHAR(255) NOT NULL,
    stage_type VARCHAR(50) NOT NULL CHECK (stage_type IN ('context_gathering', 'template_processing', 'ai_generation', 'context_injection', 'quality_assurance', 'output_formatting')),
    input_data JSONB,
    output_data JSONB,
    execution_time INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (quality_score >= 0 AND quality_score <= 1),
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'failed', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Pipeline Configurations Table
CREATE TABLE IF NOT EXISTS pipeline_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id VARCHAR(255) UNIQUE NOT NULL,
    pipeline_name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB DEFAULT '[]',
    global_config JSONB DEFAULT '{}',
    quality_gates JSONB DEFAULT '[]',
    monitoring_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Processing Metrics Table
CREATE TABLE IF NOT EXISTS processing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    template_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    processing_time INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (quality_score >= 0 AND quality_score <= 1),
    stages_count INTEGER DEFAULT 0,
    successful_stages INTEGER DEFAULT 0,
    failed_stages INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stage Metrics Table
CREATE TABLE IF NOT EXISTS stage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id VARCHAR(255) NOT NULL,
    stage_type VARCHAR(50) NOT NULL CHECK (stage_type IN ('context_gathering', 'template_processing', 'ai_generation', 'context_injection', 'quality_assurance', 'output_formatting')),
    execution_time INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (quality_score >= 0 AND quality_score <= 1),
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quality Reports Table
CREATE TABLE IF NOT EXISTS quality_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id VARCHAR(255) UNIQUE NOT NULL,
    document_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255) NOT NULL REFERENCES document_processing_jobs(job_id) ON DELETE CASCADE,
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    assessments JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    issues JSONB DEFAULT '[]',
    quality_gates JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Processing History Table
CREATE TABLE IF NOT EXISTS document_processing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    history_id VARCHAR(255) UNIQUE NOT NULL,
    request_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL,
    template_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time INTEGER,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    stages_completed JSONB DEFAULT '[]',
    error JSONB,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_job_id ON document_processing_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_request_id ON document_processing_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_template_id ON document_processing_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_project_id ON document_processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_user_id ON document_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_status ON document_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_created_at ON document_processing_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_executions_job_id ON pipeline_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_request_id ON pipeline_executions(request_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_created_at ON pipeline_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_stage_jobs_job_id ON stage_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_stage_jobs_stage_id ON stage_jobs(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_jobs_stage_type ON stage_jobs(stage_type);
CREATE INDEX IF NOT EXISTS idx_stage_jobs_status ON stage_jobs(status);
CREATE INDEX IF NOT EXISTS idx_stage_jobs_created_at ON stage_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_stage_executions_job_id ON stage_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_stage_executions_stage_id ON stage_executions(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_executions_stage_type ON stage_executions(stage_type);
CREATE INDEX IF NOT EXISTS idx_stage_executions_status ON stage_executions(status);
CREATE INDEX IF NOT EXISTS idx_stage_executions_created_at ON stage_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_configurations_pipeline_id ON pipeline_configurations(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_configurations_created_at ON pipeline_configurations(created_at);

CREATE INDEX IF NOT EXISTS idx_processing_metrics_request_id ON processing_metrics(request_id);
CREATE INDEX IF NOT EXISTS idx_processing_metrics_template_id ON processing_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_processing_metrics_project_id ON processing_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_metrics_user_id ON processing_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_metrics_created_at ON processing_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_stage_metrics_stage_id ON stage_metrics(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_metrics_stage_type ON stage_metrics(stage_type);
CREATE INDEX IF NOT EXISTS idx_stage_metrics_success ON stage_metrics(success);
CREATE INDEX IF NOT EXISTS idx_stage_metrics_created_at ON stage_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_quality_reports_report_id ON quality_reports(report_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_document_id ON quality_reports(document_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_job_id ON quality_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_created_at ON quality_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_document_processing_history_history_id ON document_processing_history(history_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_history_request_id ON document_processing_history(request_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_history_user_id ON document_processing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_history_project_id ON document_processing_history(project_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_history_template_id ON document_processing_history(template_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_history_status ON document_processing_history(status);
CREATE INDEX IF NOT EXISTS idx_document_processing_history_created_at ON document_processing_history(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_processing_jobs_updated_at BEFORE UPDATE ON document_processing_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipeline_executions_updated_at BEFORE UPDATE ON pipeline_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stage_jobs_updated_at BEFORE UPDATE ON stage_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipeline_configurations_updated_at BEFORE UPDATE ON pipeline_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to cleanup old processing data
CREATE OR REPLACE FUNCTION cleanup_old_processing_data()
RETURNS VOID AS $$
BEGIN
    -- Cleanup old processing jobs (older than 90 days)
    DELETE FROM document_processing_jobs 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND status IN ('completed', 'failed', 'cancelled');
    
    -- Cleanup old pipeline executions
    DELETE FROM pipeline_executions 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND status IN ('completed', 'failed', 'cancelled');
    
    -- Cleanup old stage jobs
    DELETE FROM stage_jobs 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND status IN ('completed', 'failed', 'cancelled');
    
    -- Cleanup old stage executions
    DELETE FROM stage_executions 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Cleanup old metrics (older than 1 year)
    DELETE FROM processing_metrics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    DELETE FROM stage_metrics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Cleanup old quality reports (older than 1 year)
    DELETE FROM quality_reports 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Cleanup old processing history (older than 1 year)
    DELETE FROM document_processing_history 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create function to get processing statistics
CREATE OR REPLACE FUNCTION get_processing_statistics(timeframe_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    total_jobs BIGINT,
    successful_jobs BIGINT,
    failed_jobs BIGINT,
    average_processing_time NUMERIC,
    average_quality_score NUMERIC,
    most_common_stage_type TEXT,
    most_common_error_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN dpj.status = 'completed' THEN 1 END) as successful_jobs,
        COUNT(CASE WHEN dpj.status = 'failed' THEN 1 END) as failed_jobs,
        AVG(EXTRACT(EPOCH FROM (dpj.completed_at - dpj.started_at))) as average_processing_time,
        AVG(pm.quality_score) as average_quality_score,
        (SELECT stage_type FROM stage_metrics 
         WHERE created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours 
         GROUP BY stage_type ORDER BY COUNT(*) DESC LIMIT 1) as most_common_stage_type,
        (SELECT error->>'error_type' FROM document_processing_jobs 
         WHERE created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours 
         AND error IS NOT NULL 
         GROUP BY error->>'error_type' ORDER BY COUNT(*) DESC LIMIT 1) as most_common_error_type
    FROM document_processing_jobs dpj
    LEFT JOIN processing_metrics pm ON dpj.request_id = pm.request_id
    WHERE dpj.created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours;
END;
$$ LANGUAGE plpgsql;

-- Create function to get stage performance metrics
CREATE OR REPLACE FUNCTION get_stage_performance_metrics(timeframe_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    stage_type TEXT,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    average_execution_time NUMERIC,
    average_quality_score NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.stage_type,
        COUNT(*) as total_executions,
        COUNT(CASE WHEN sm.success = true THEN 1 END) as successful_executions,
        COUNT(CASE WHEN sm.success = false THEN 1 END) as failed_executions,
        AVG(sm.execution_time) as average_execution_time,
        AVG(sm.quality_score) as average_quality_score,
        (COUNT(CASE WHEN sm.success = true THEN 1 END)::NUMERIC / COUNT(*)) as success_rate
    FROM stage_metrics sm
    WHERE sm.created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours
    GROUP BY sm.stage_type
    ORDER BY sm.stage_type;
END;
$$ LANGUAGE plpgsql;

-- Create function to get quality trends
CREATE OR REPLACE FUNCTION get_quality_trends(timeframe_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    date_hour TIMESTAMP WITH TIME ZONE,
    average_quality_score NUMERIC,
    job_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('hour', pm.created_at) as date_hour,
        AVG(pm.quality_score) as average_quality_score,
        COUNT(*) as job_count
    FROM processing_metrics pm
    WHERE pm.created_at >= NOW() - INTERVAL '1 hour' * timeframe_hours
    GROUP BY DATE_TRUNC('hour', pm.created_at)
    ORDER BY date_hour;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE document_processing_jobs IS 'Main table for document processing jobs with status and progress tracking';
COMMENT ON TABLE pipeline_executions IS 'Pipeline execution tracking with stage progress and status';
COMMENT ON TABLE stage_jobs IS 'Individual stage job tracking for async stage execution';
COMMENT ON TABLE stage_executions IS 'Stage execution results and metrics';
COMMENT ON TABLE pipeline_configurations IS 'Pipeline configurations and settings';
COMMENT ON TABLE processing_metrics IS 'Processing performance and quality metrics';
COMMENT ON TABLE stage_metrics IS 'Individual stage performance and quality metrics';
COMMENT ON TABLE quality_reports IS 'Quality assessment reports for processed documents';
COMMENT ON TABLE document_processing_history IS 'Historical record of document processing jobs';

