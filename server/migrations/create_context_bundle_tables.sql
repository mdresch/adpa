-- Context Bundle Database Schema
-- Creates tables for context aggregation and organization

-- Context Bundles Table
CREATE TABLE IF NOT EXISTS context_bundles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50) NOT NULL CHECK (bundle_type IN ('project_context', 'user_context', 'document_context', 'template_context', 'framework_context', 'comprehensive_context', 'custom_context')),
    sources JSONB DEFAULT '[]',
    aggregated_context JSONB DEFAULT '{}',
    organization_strategy JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    freshness JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    framework VARCHAR(100),
    category VARCHAR(100)
);

-- Context Bundle Processing History Table
CREATE TABLE IF NOT EXISTS context_bundle_processing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    processing_type VARCHAR(50) NOT NULL CHECK (processing_type IN ('creation', 'update', 'aggregation', 'organization', 'validation', 'optimization', 'refresh')),
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'in_progress', 'completed', 'failed')),
    processing_start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_end_time TIMESTAMP WITH TIME ZONE,
    processing_duration INTEGER, -- in milliseconds
    processing_result JSONB DEFAULT '{}',
    error_message TEXT,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Bundle Validation Results Table
CREATE TABLE IF NOT EXISTS context_bundle_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('valid', 'invalid', 'needs_review')),
    quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (quality_score >= 0 AND quality_score <= 1),
    validation_errors JSONB DEFAULT '[]',
    validation_warnings JSONB DEFAULT '[]',
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validator_version VARCHAR(50),
    validation_duration INTEGER, -- in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Bundle Optimization Results Table
CREATE TABLE IF NOT EXISTS context_bundle_optimization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    optimization_type VARCHAR(50) NOT NULL CHECK (optimization_type IN ('performance', 'quality', 'storage', 'comprehensive')),
    optimization_status VARCHAR(20) DEFAULT 'pending' CHECK (optimization_status IN ('pending', 'in_progress', 'completed', 'failed')),
    optimization_start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    optimization_end_time TIMESTAMP WITH TIME ZONE,
    optimization_duration INTEGER, -- in milliseconds
    improvements JSONB DEFAULT '[]',
    performance_gains JSONB DEFAULT '{}',
    quality_improvements JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Bundle Usage Analytics Table
CREATE TABLE IF NOT EXISTS context_bundle_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    average_session_duration INTEGER DEFAULT 0, -- in seconds
    peak_usage_times TIMESTAMP WITH TIME ZONE[],
    usage_patterns JSONB DEFAULT '{}',
    user_satisfaction DECIMAL(3,2) DEFAULT 0.0 CHECK (user_satisfaction >= 0 AND user_satisfaction <= 1),
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, usage_date)
);

-- Context Bundle Quality Metrics Table
CREATE TABLE IF NOT EXISTS context_bundle_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    completeness_score DECIMAL(3,2) DEFAULT 0.0 CHECK (completeness_score >= 0 AND completeness_score <= 1),
    accuracy_score DECIMAL(3,2) DEFAULT 0.0 CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
    relevance_score DECIMAL(3,2) DEFAULT 0.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    freshness_score DECIMAL(3,2) DEFAULT 0.0 CHECK (freshness_score >= 0 AND freshness_score <= 1),
    consistency_score DECIMAL(3,2) DEFAULT 0.0 CHECK (consistency_score >= 0 AND consistency_score <= 1),
    reliability_score DECIMAL(3,2) DEFAULT 0.0 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    overall_quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (overall_quality_score >= 0 AND overall_quality_score <= 1),
    quality_trends JSONB DEFAULT '[]',
    improvement_areas TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, metric_date)
);

-- Context Bundle Performance Metrics Table
CREATE TABLE IF NOT EXISTS context_bundle_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    average_processing_time INTEGER DEFAULT 0, -- in milliseconds
    memory_usage_patterns JSONB DEFAULT '[]',
    cpu_usage_patterns JSONB DEFAULT '[]',
    network_usage_patterns JSONB DEFAULT '[]',
    performance_bottlenecks JSONB DEFAULT '[]',
    optimization_opportunities JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, metric_date)
);

-- Context Bundle Insights Table
CREATE TABLE IF NOT EXISTS context_bundle_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('key_insight', 'recommendation', 'trend', 'anomaly', 'opportunity')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence >= 0 AND confidence <= 1),
    impact DECIMAL(3,2) DEFAULT 0.0 CHECK (impact >= 0 AND impact <= 1),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    evidence JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context Bundle Access Log Table
CREATE TABLE IF NOT EXISTS context_bundle_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id VARCHAR(255) NOT NULL REFERENCES context_bundles(id) ON DELETE CASCADE,
    user_id VARCHAR(255),
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('read', 'write', 'update', 'delete', 'share', 'export')),
    access_method VARCHAR(50) NOT NULL CHECK (access_method IN ('api', 'ui', 'batch', 'scheduled', 'manual')),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    access_duration INTEGER, -- in milliseconds
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_bundles_bundle_type ON context_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_context_bundles_priority ON context_bundles(priority);
CREATE INDEX IF NOT EXISTS idx_context_bundles_created_by ON context_bundles(created_by);
CREATE INDEX IF NOT EXISTS idx_context_bundles_framework ON context_bundles(framework);
CREATE INDEX IF NOT EXISTS idx_context_bundles_category ON context_bundles(category);
CREATE INDEX IF NOT EXISTS idx_context_bundles_created_at ON context_bundles(created_at);
CREATE INDEX IF NOT EXISTS idx_context_bundles_updated_at ON context_bundles(updated_at);
CREATE INDEX IF NOT EXISTS idx_context_bundles_expires_at ON context_bundles(expires_at);
CREATE INDEX IF NOT EXISTS idx_context_bundles_tags ON context_bundles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_context_bundles_sources ON context_bundles USING GIN(sources);
CREATE INDEX IF NOT EXISTS idx_context_bundles_aggregated_context ON context_bundles USING GIN(aggregated_context);
CREATE INDEX IF NOT EXISTS idx_context_bundles_metadata ON context_bundles USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_context_bundle_processing_history_bundle_id ON context_bundle_processing_history(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_processing_history_processing_type ON context_bundle_processing_history(processing_type);
CREATE INDEX IF NOT EXISTS idx_context_bundle_processing_history_processing_status ON context_bundle_processing_history(processing_status);
CREATE INDEX IF NOT EXISTS idx_context_bundle_processing_history_processing_start_time ON context_bundle_processing_history(processing_start_time);

CREATE INDEX IF NOT EXISTS idx_context_bundle_validation_results_bundle_id ON context_bundle_validation_results(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_validation_results_validation_status ON context_bundle_validation_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_context_bundle_validation_results_quality_score ON context_bundle_validation_results(quality_score);
CREATE INDEX IF NOT EXISTS idx_context_bundle_validation_results_validated_at ON context_bundle_validation_results(validated_at);

CREATE INDEX IF NOT EXISTS idx_context_bundle_optimization_results_bundle_id ON context_bundle_optimization_results(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_optimization_results_optimization_type ON context_bundle_optimization_results(optimization_type);
CREATE INDEX IF NOT EXISTS idx_context_bundle_optimization_results_optimization_status ON context_bundle_optimization_results(optimization_status);
CREATE INDEX IF NOT EXISTS idx_context_bundle_optimization_results_optimization_start_time ON context_bundle_optimization_results(optimization_start_time);

CREATE INDEX IF NOT EXISTS idx_context_bundle_usage_analytics_bundle_id ON context_bundle_usage_analytics(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_usage_analytics_usage_date ON context_bundle_usage_analytics(usage_date);
CREATE INDEX IF NOT EXISTS idx_context_bundle_usage_analytics_usage_count ON context_bundle_usage_analytics(usage_count);

CREATE INDEX IF NOT EXISTS idx_context_bundle_quality_metrics_bundle_id ON context_bundle_quality_metrics(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_quality_metrics_metric_date ON context_bundle_quality_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_context_bundle_quality_metrics_overall_quality_score ON context_bundle_quality_metrics(overall_quality_score);

CREATE INDEX IF NOT EXISTS idx_context_bundle_performance_metrics_bundle_id ON context_bundle_performance_metrics(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_performance_metrics_metric_date ON context_bundle_performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_context_bundle_performance_metrics_average_processing_time ON context_bundle_performance_metrics(average_processing_time);

CREATE INDEX IF NOT EXISTS idx_context_bundle_insights_bundle_id ON context_bundle_insights(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_insights_insight_type ON context_bundle_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_context_bundle_insights_priority ON context_bundle_insights(priority);
CREATE INDEX IF NOT EXISTS idx_context_bundle_insights_generated_at ON context_bundle_insights(generated_at);
CREATE INDEX IF NOT EXISTS idx_context_bundle_insights_tags ON context_bundle_insights USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_context_bundle_access_log_bundle_id ON context_bundle_access_log(bundle_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_access_log_user_id ON context_bundle_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_context_bundle_access_log_access_type ON context_bundle_access_log(access_type);
CREATE INDEX IF NOT EXISTS idx_context_bundle_access_log_accessed_at ON context_bundle_access_log(accessed_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_context_bundles_updated_at BEFORE UPDATE ON context_bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update daily usage analytics
CREATE OR REPLACE FUNCTION update_daily_context_bundle_usage_analytics()
RETURNS VOID AS $$
DECLARE
    usage_date_val DATE;
    bundle_id_val VARCHAR(255);
    usage_count_val INTEGER;
    unique_users_val INTEGER;
    avg_session_duration_val INTEGER;
    user_satisfaction_val DECIMAL(3,2);
BEGIN
    usage_date_val := CURRENT_DATE;
    
    -- Calculate metrics for each bundle
    FOR bundle_id_val IN SELECT DISTINCT id FROM context_bundles WHERE expires_at IS NULL OR expires_at > NOW()
    LOOP
        -- Calculate usage count
        SELECT COUNT(*)
        INTO usage_count_val
        FROM context_bundle_access_log
        WHERE bundle_id = bundle_id_val AND DATE(accessed_at) = usage_date_val;
        
        -- Calculate unique users
        SELECT COUNT(DISTINCT user_id)
        INTO unique_users_val
        FROM context_bundle_access_log
        WHERE bundle_id = bundle_id_val AND DATE(accessed_at) = usage_date_val AND user_id IS NOT NULL;
        
        -- Calculate average session duration
        SELECT COALESCE(AVG(access_duration), 0)
        INTO avg_session_duration_val
        FROM context_bundle_access_log
        WHERE bundle_id = bundle_id_val AND DATE(accessed_at) = usage_date_val AND access_duration IS NOT NULL;
        
        -- Calculate user satisfaction (placeholder)
        user_satisfaction_val := 0.8;
        
        -- Insert or update daily metrics
        INSERT INTO context_bundle_usage_analytics (
            bundle_id, usage_date, usage_count, unique_users, average_session_duration, user_satisfaction
        ) VALUES (
            bundle_id_val, usage_date_val, usage_count_val, unique_users_val, avg_session_duration_val, user_satisfaction_val
        )
        ON CONFLICT (bundle_id, usage_date) DO UPDATE SET
            usage_count = EXCLUDED.usage_count,
            unique_users = EXCLUDED.unique_users,
            average_session_duration = EXCLUDED.average_session_duration,
            user_satisfaction = EXCLUDED.user_satisfaction;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update daily usage analytics
CREATE OR REPLACE FUNCTION trigger_update_daily_context_bundle_usage_analytics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_daily_context_bundle_usage_analytics();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_context_bundle_usage_analytics_trigger
    AFTER INSERT ON context_bundle_access_log
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_context_bundle_usage_analytics();

-- Create function to clean up expired bundles
CREATE OR REPLACE FUNCTION cleanup_expired_context_bundles()
RETURNS VOID AS $$
BEGIN
    -- Delete expired bundles and their related data
    DELETE FROM context_bundles 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Log cleanup activity
    INSERT INTO context_bundle_processing_history (
        bundle_id, processing_type, processing_status, processing_start_time, processing_end_time
    ) VALUES (
        'system', 'cleanup', 'completed', NOW(), NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE context_bundles IS 'Main table for storing context bundles with aggregated and organized context data';
COMMENT ON TABLE context_bundle_processing_history IS 'History of all processing operations performed on context bundles';
COMMENT ON TABLE context_bundle_validation_results IS 'Validation results and quality scores for context bundles';
COMMENT ON TABLE context_bundle_optimization_results IS 'Optimization results and performance improvements for context bundles';
COMMENT ON TABLE context_bundle_usage_analytics IS 'Daily usage analytics and metrics for context bundles';
COMMENT ON TABLE context_bundle_quality_metrics IS 'Daily quality metrics and trends for context bundles';
COMMENT ON TABLE context_bundle_performance_metrics IS 'Daily performance metrics and bottlenecks for context bundles';
COMMENT ON TABLE context_bundle_insights IS 'Generated insights, recommendations, and opportunities for context bundles';
COMMENT ON TABLE context_bundle_access_log IS 'Access log for tracking all interactions with context bundles';
