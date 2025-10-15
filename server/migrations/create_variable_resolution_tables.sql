-- Variable Resolution Engine Database Tables
-- Creates tables for variable resolution caching, metrics, and results

-- Table for caching variable resolution results
CREATE TABLE IF NOT EXISTS variable_resolution_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(500) NOT NULL UNIQUE,
    resolution_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing variable resolution results
CREATE TABLE IF NOT EXISTS variable_resolution_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id VARCHAR(100) NOT NULL UNIQUE,
    request_id VARCHAR(100) NOT NULL,
    template_id VARCHAR(100),
    resolved_variables JSONB NOT NULL,
    unresolved_variables JSONB NOT NULL,
    resolution_metrics JSONB NOT NULL,
    quality_assessment JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for collecting resolution metrics
CREATE TABLE IF NOT EXISTS variable_resolution_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_name VARCHAR(200) NOT NULL,
    variable_type VARCHAR(50) NOT NULL,
    resolution_strategy VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('resolved', 'unresolved', 'failed')),
    resolution_time INTEGER NOT NULL, -- in milliseconds
    cache_hit BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    error_message TEXT,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for variable analysis results
CREATE TABLE IF NOT EXISTS variable_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id VARCHAR(100) NOT NULL UNIQUE,
    template_id VARCHAR(100) NOT NULL,
    analysis_data JSONB NOT NULL,
    complexity_score DECIMAL(3,2) NOT NULL,
    quality_score DECIMAL(3,2) NOT NULL,
    pattern_count INTEGER DEFAULT 0,
    dependency_count INTEGER DEFAULT 0,
    recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for variable patterns
CREATE TABLE IF NOT EXISTS variable_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id VARCHAR(100) NOT NULL UNIQUE,
    pattern_name VARCHAR(200) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_expression TEXT NOT NULL,
    pattern_confidence DECIMAL(3,2) NOT NULL,
    pattern_frequency INTEGER NOT NULL,
    pattern_examples JSONB NOT NULL,
    pattern_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for resolution strategies configuration
CREATE TABLE IF NOT EXISTS resolution_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id VARCHAR(100) NOT NULL UNIQUE,
    strategy_name VARCHAR(200) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    priority INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL,
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for fallback strategies
CREATE TABLE IF NOT EXISTS fallback_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id VARCHAR(100) NOT NULL UNIQUE,
    strategy_name VARCHAR(200) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    fallback_order INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_variable_resolution_cache_key ON variable_resolution_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_cache_expires ON variable_resolution_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_request ON variable_resolution_results(request_id);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_template ON variable_resolution_results(template_id);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_created ON variable_resolution_results(created_at);

CREATE INDEX IF NOT EXISTS idx_variable_resolution_metrics_name ON variable_resolution_metrics(variable_name);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_metrics_strategy ON variable_resolution_metrics(resolution_strategy);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_metrics_status ON variable_resolution_metrics(status);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_metrics_created ON variable_resolution_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_metrics_type ON variable_resolution_metrics(variable_type);

CREATE INDEX IF NOT EXISTS idx_variable_analysis_template ON variable_analysis_results(template_id);
CREATE INDEX IF NOT EXISTS idx_variable_analysis_complexity ON variable_analysis_results(complexity_score);
CREATE INDEX IF NOT EXISTS idx_variable_analysis_quality ON variable_analysis_results(quality_score);
CREATE INDEX IF NOT EXISTS idx_variable_analysis_created ON variable_analysis_results(created_at);

CREATE INDEX IF NOT EXISTS idx_variable_patterns_type ON variable_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_variable_patterns_confidence ON variable_patterns(pattern_confidence);
CREATE INDEX IF NOT EXISTS idx_variable_patterns_frequency ON variable_patterns(pattern_frequency);

CREATE INDEX IF NOT EXISTS idx_resolution_strategies_type ON resolution_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_resolution_strategies_priority ON resolution_strategies(priority);
CREATE INDEX IF NOT EXISTS idx_resolution_strategies_enabled ON resolution_strategies(enabled);

CREATE INDEX IF NOT EXISTS idx_fallback_strategies_type ON fallback_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_fallback_strategies_order ON fallback_strategies(fallback_order);
CREATE INDEX IF NOT EXISTS idx_fallback_strategies_enabled ON fallback_strategies(enabled);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_variable_resolution_cache_data_gin ON variable_resolution_cache USING GIN(resolution_data);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_variables_gin ON variable_resolution_results USING GIN(resolved_variables);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_unresolved_gin ON variable_resolution_results USING GIN(unresolved_variables);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_metrics_gin ON variable_resolution_results USING GIN(resolution_metrics);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_quality_gin ON variable_resolution_results USING GIN(quality_assessment);
CREATE INDEX IF NOT EXISTS idx_variable_resolution_results_recommendations_gin ON variable_resolution_results USING GIN(recommendations);

CREATE INDEX IF NOT EXISTS idx_variable_resolution_metrics_context_gin ON variable_resolution_metrics USING GIN(context_data);
CREATE INDEX IF NOT EXISTS idx_variable_analysis_data_gin ON variable_analysis_results USING GIN(analysis_data);
CREATE INDEX IF NOT EXISTS idx_variable_analysis_recommendations_gin ON variable_analysis_results USING GIN(recommendations);

CREATE INDEX IF NOT EXISTS idx_variable_patterns_examples_gin ON variable_patterns USING GIN(pattern_examples);
CREATE INDEX IF NOT EXISTS idx_variable_patterns_metadata_gin ON variable_patterns USING GIN(pattern_metadata);
CREATE INDEX IF NOT EXISTS idx_resolution_strategies_config_gin ON resolution_strategies USING GIN(config);
CREATE INDEX IF NOT EXISTS idx_resolution_strategies_conditions_gin ON resolution_strategies USING GIN(conditions);
CREATE INDEX IF NOT EXISTS idx_fallback_strategies_config_gin ON fallback_strategies USING GIN(config);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_variable_resolution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_variable_resolution_cache_updated_at
    BEFORE UPDATE ON variable_resolution_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_resolution_updated_at();

CREATE TRIGGER trigger_variable_resolution_results_updated_at
    BEFORE UPDATE ON variable_resolution_results
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_resolution_updated_at();

CREATE TRIGGER trigger_variable_analysis_results_updated_at
    BEFORE UPDATE ON variable_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_resolution_updated_at();

CREATE TRIGGER trigger_variable_patterns_updated_at
    BEFORE UPDATE ON variable_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_resolution_updated_at();

CREATE TRIGGER trigger_resolution_strategies_updated_at
    BEFORE UPDATE ON resolution_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_resolution_updated_at();

CREATE TRIGGER trigger_fallback_strategies_updated_at
    BEFORE UPDATE ON fallback_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_resolution_updated_at();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_resolution_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM variable_resolution_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get resolution statistics
CREATE OR REPLACE FUNCTION get_resolution_statistics(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    total_resolutions BIGINT,
    successful_resolutions BIGINT,
    failed_resolutions BIGINT,
    success_rate DECIMAL(5,4),
    avg_resolution_time DECIMAL(10,2),
    cache_hit_rate DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_resolutions,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as successful_resolutions,
        COUNT(CASE WHEN status = 'unresolved' OR status = 'failed' THEN 1 END) as failed_resolutions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN status = 'resolved' THEN 1 END)::DECIMAL / COUNT(*), 4)
            ELSE 0 
        END as success_rate,
        ROUND(AVG(resolution_time), 2) as avg_resolution_time,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN cache_hit = true THEN 1 END)::DECIMAL / COUNT(*), 4)
            ELSE 0 
        END as cache_hit_rate
    FROM variable_resolution_metrics
    WHERE created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Function to get variable usage statistics
CREATE OR REPLACE FUNCTION get_variable_usage_stats(variable_name_param VARCHAR)
RETURNS TABLE (
    variable_name VARCHAR,
    total_usage BIGINT,
    successful_resolutions BIGINT,
    failed_resolutions BIGINT,
    success_rate DECIMAL(5,4),
    avg_resolution_time DECIMAL(10,2),
    most_used_strategy VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vrm.variable_name,
        COUNT(*) as total_usage,
        COUNT(CASE WHEN vrm.status = 'resolved' THEN 1 END) as successful_resolutions,
        COUNT(CASE WHEN vrm.status = 'unresolved' OR vrm.status = 'failed' THEN 1 END) as failed_resolutions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN vrm.status = 'resolved' THEN 1 END)::DECIMAL / COUNT(*), 4)
            ELSE 0 
        END as success_rate,
        ROUND(AVG(vrm.resolution_time), 2) as avg_resolution_time,
        (SELECT resolution_strategy 
         FROM variable_resolution_metrics vrm2 
         WHERE vrm2.variable_name = vrm.variable_name 
         GROUP BY resolution_strategy 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as most_used_strategy
    FROM variable_resolution_metrics vrm
    WHERE vrm.variable_name = variable_name_param
    AND vrm.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY vrm.variable_name;
END;
$$ LANGUAGE plpgsql;

-- Insert default resolution strategies
INSERT INTO resolution_strategies (strategy_id, strategy_name, strategy_type, priority, enabled, config) VALUES
('context_extraction', 'Context Extraction', 'context_extraction', 1, true, '{"description": "Extract values from project, user, and historical context"}'),
('user_profile', 'User Profile', 'user_profile', 2, true, '{"description": "Extract values from user profile and preferences"}'),
('ai_generation', 'AI Generation', 'ai_generation', 3, true, '{"description": "Generate values using AI models"}'),
('default_value', 'Default Value', 'default_value', 4, true, '{"description": "Use default values from variable definitions"}'),
('template_inheritance', 'Template Inheritance', 'template_inheritance', 5, true, '{"description": "Inherit values from parent or similar templates"}'),
('external_api', 'External API', 'external_api', 6, true, '{"description": "Fetch values from external APIs"}'),
('database_query', 'Database Query', 'database_query', 7, true, '{"description": "Query values from database"}'),
('file_content', 'File Content', 'file_content', 8, true, '{"description": "Extract values from file contents"}'),
('computed_value', 'Computed Value', 'computed_value', 9, true, '{"description": "Compute values using expressions"}'),
('conditional_logic', 'Conditional Logic', 'conditional_logic', 10, true, '{"description": "Resolve values using conditional rules"}')
ON CONFLICT (strategy_id) DO NOTHING;

-- Insert default fallback strategies
INSERT INTO fallback_strategies (strategy_id, strategy_name, strategy_type, fallback_order, enabled, config) VALUES
('default_value_fallback', 'Default Value Fallback', 'default_value', 1, true, '{"description": "Fallback to default values"}'),
('empty_value_fallback', 'Empty Value Fallback', 'default_value', 2, true, '{"description": "Fallback to empty values"}'),
('error_fallback', 'Error Fallback', 'default_value', 3, true, '{"description": "Fallback to error state"}')
ON CONFLICT (strategy_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE variable_resolution_cache IS 'Caches variable resolution results for performance optimization';
COMMENT ON TABLE variable_resolution_results IS 'Stores complete variable resolution results and metadata';
COMMENT ON TABLE variable_resolution_metrics IS 'Collects metrics for variable resolution performance and quality';
COMMENT ON TABLE variable_analysis_results IS 'Stores variable analysis results including complexity and quality scores';
COMMENT ON TABLE variable_patterns IS 'Stores detected patterns in variable definitions and usage';
COMMENT ON TABLE resolution_strategies IS 'Configuration for variable resolution strategies';
COMMENT ON TABLE fallback_strategies IS 'Configuration for fallback strategies when primary resolution fails';

COMMENT ON COLUMN variable_resolution_cache.cache_key IS 'Unique key for cache lookup based on variable characteristics';
COMMENT ON COLUMN variable_resolution_cache.resolution_data IS 'Cached resolution result data';
COMMENT ON COLUMN variable_resolution_cache.expires_at IS 'Cache expiration timestamp';

COMMENT ON COLUMN variable_resolution_results.resolved_variables IS 'Array of successfully resolved variables';
COMMENT ON COLUMN variable_resolution_results.unresolved_variables IS 'Array of variables that could not be resolved';
COMMENT ON COLUMN variable_resolution_results.resolution_metrics IS 'Performance and quality metrics for the resolution process';
COMMENT ON COLUMN variable_resolution_results.quality_assessment IS 'Assessment of resolution quality and confidence';
COMMENT ON COLUMN variable_resolution_results.recommendations IS 'Recommendations for improving resolution success';

COMMENT ON COLUMN variable_resolution_metrics.resolution_time IS 'Time taken to resolve the variable in milliseconds';
COMMENT ON COLUMN variable_resolution_metrics.quality_score IS 'Quality score of the resolution (0-1)';
COMMENT ON COLUMN variable_resolution_metrics.cache_hit IS 'Whether the resolution was served from cache';

COMMENT ON COLUMN variable_analysis_results.complexity_score IS 'Overall complexity score of the variables (0-1)';
COMMENT ON COLUMN variable_analysis_results.quality_score IS 'Overall quality score of the variables (0-1)';
COMMENT ON COLUMN variable_analysis_results.pattern_count IS 'Number of patterns detected in the variables';

COMMENT ON COLUMN variable_patterns.pattern_confidence IS 'Confidence level of the pattern detection (0-1)';
COMMENT ON COLUMN variable_patterns.pattern_frequency IS 'How frequently this pattern appears';
COMMENT ON COLUMN variable_patterns.pattern_examples IS 'Examples of variables matching this pattern';

COMMENT ON COLUMN resolution_strategies.priority IS 'Priority order for strategy execution (lower numbers execute first)';
COMMENT ON COLUMN resolution_strategies.config IS 'Configuration parameters for the strategy';

COMMENT ON COLUMN fallback_strategies.fallback_order IS 'Order for fallback strategy execution (lower numbers execute first)';

-- Create view for resolution performance dashboard
CREATE OR REPLACE VIEW resolution_performance_dashboard AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_resolutions,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as successful_resolutions,
    COUNT(CASE WHEN status = 'unresolved' THEN 1 END) as unresolved_resolutions,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_resolutions,
    ROUND(AVG(resolution_time), 2) as avg_resolution_time,
    ROUND(AVG(quality_score), 3) as avg_quality_score,
    COUNT(CASE WHEN cache_hit = true THEN 1 END) as cache_hits,
    COUNT(CASE WHEN cache_hit = false THEN 1 END) as cache_misses
FROM variable_resolution_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Create view for strategy performance
CREATE OR REPLACE VIEW strategy_performance_view AS
SELECT 
    resolution_strategy,
    COUNT(*) as usage_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as success_count,
    ROUND(COUNT(CASE WHEN status = 'resolved' THEN 1 END)::DECIMAL / COUNT(*), 4) as success_rate,
    ROUND(AVG(resolution_time), 2) as avg_resolution_time,
    ROUND(AVG(quality_score), 3) as avg_quality_score,
    COUNT(CASE WHEN cache_hit = true THEN 1 END) as cache_hits,
    ROUND(COUNT(CASE WHEN cache_hit = true THEN 1 END)::DECIMAL / COUNT(*), 4) as cache_hit_rate
FROM variable_resolution_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY resolution_strategy
ORDER BY usage_count DESC;

-- Create view for variable complexity analysis
CREATE OR REPLACE VIEW variable_complexity_view AS
SELECT 
    variable_type,
    COUNT(*) as variable_count,
    ROUND(AVG(resolution_time), 2) as avg_resolution_time,
    ROUND(AVG(quality_score), 3) as avg_quality_score,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    ROUND(COUNT(CASE WHEN status = 'resolved' THEN 1 END)::DECIMAL / COUNT(*), 4) as resolution_success_rate
FROM variable_resolution_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY variable_type
ORDER BY variable_count DESC;
