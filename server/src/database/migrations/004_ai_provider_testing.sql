-- AI Provider Testing System Database Schema
-- Comprehensive test suite for AI provider validation and health monitoring

-- AI Provider Test Results Table
CREATE TABLE IF NOT EXISTS ai_provider_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('connectivity', 'response_time', 'content_quality', 'error_handling', 'rate_limits')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pass', 'fail', 'warning', 'timeout')),
    response_time INTEGER NOT NULL CHECK (response_time >= 0), -- milliseconds
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    details TEXT,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Provider Health Metrics Table
CREATE TABLE IF NOT EXISTS ai_provider_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    overall_health DECIMAL(5,2) NOT NULL CHECK (overall_health >= 0 AND overall_health <= 100),
    availability DECIMAL(5,2) NOT NULL CHECK (availability >= 0 AND availability <= 100),
    avg_response_time INTEGER NOT NULL CHECK (avg_response_time >= 0),
    success_rate DECIMAL(5,2) NOT NULL CHECK (success_rate >= 0 AND success_rate <= 100),
    test_count INTEGER NOT NULL DEFAULT 0,
    last_tested TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Provider Test Configurations Table
CREATE TABLE IF NOT EXISTS ai_provider_test_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    test_types JSONB DEFAULT '["connectivity", "response_time", "content_quality", "error_handling", "rate_limits"]',
    timeout_ms INTEGER DEFAULT 30000,
    retry_attempts INTEGER DEFAULT 3,
    batch_size INTEGER DEFAULT 5,
    test_prompts JSONB DEFAULT '{
        "simple": "Hello, how are you?",
        "complex": "Explain the concept of quantum computing and its applications in artificial intelligence.",
        "creative": "Write a short story about a robot that learns to paint.",
        "technical": "Analyze the time complexity of binary search algorithm."
    }',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Provider Test Schedules Table
CREATE TABLE IF NOT EXISTS ai_provider_test_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('manual', 'hourly', 'daily', 'weekly')),
    cron_expression VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_results_provider ON ai_provider_test_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_results_type ON ai_provider_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_results_status ON ai_provider_test_results(status);
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_results_timestamp ON ai_provider_test_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_results_score ON ai_provider_test_results(score);

CREATE INDEX IF NOT EXISTS idx_ai_provider_health_metrics_provider ON ai_provider_health_metrics(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_health_metrics_health ON ai_provider_health_metrics(overall_health);
CREATE INDEX IF NOT EXISTS idx_ai_provider_health_metrics_tested ON ai_provider_health_metrics(last_tested);

CREATE INDEX IF NOT EXISTS idx_ai_provider_test_configs_provider ON ai_provider_test_configs(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_configs_active ON ai_provider_test_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_ai_provider_test_schedules_provider ON ai_provider_test_schedules(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_schedules_active ON ai_provider_test_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_provider_test_schedules_next_run ON ai_provider_test_schedules(next_run);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_ai_provider_health_metrics_updated_at BEFORE UPDATE ON ai_provider_health_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_provider_test_configs_updated_at BEFORE UPDATE ON ai_provider_test_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_provider_test_schedules_updated_at BEFORE UPDATE ON ai_provider_test_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default test configurations for existing providers
INSERT INTO ai_provider_test_configs (provider_id, test_types, timeout_ms, retry_attempts, batch_size, test_prompts)
SELECT 
    id,
    '["connectivity", "response_time", "content_quality", "error_handling", "rate_limits"]'::jsonb,
    30000,
    3,
    5,
    '{
        "simple": "Hello, how are you?",
        "complex": "Explain the concept of quantum computing and its applications in artificial intelligence.",
        "creative": "Write a short story about a robot that learns to paint.",
        "technical": "Analyze the time complexity of binary search algorithm."
    }'::jsonb
FROM ai_providers 
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Insert default test schedules (daily testing)
INSERT INTO ai_provider_test_schedules (provider_id, schedule_type, cron_expression, is_active, next_run)
SELECT 
    id,
    'daily',
    '0 2 * * *', -- 2 AM daily
    true,
    CURRENT_TIMESTAMP + INTERVAL '1 day'
FROM ai_providers 
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Create view for provider health dashboard
CREATE OR REPLACE VIEW ai_provider_health_dashboard AS
SELECT 
    ap.id,
    ap.name,
    ap.provider_type,
    ap.is_active,
    COALESCE(hm.overall_health, 0) as overall_health,
    COALESCE(hm.availability, 0) as availability,
    COALESCE(hm.avg_response_time, 0) as avg_response_time,
    COALESCE(hm.success_rate, 0) as success_rate,
    COALESCE(hm.test_count, 0) as test_count,
    hm.last_tested,
    CASE 
        WHEN COALESCE(hm.overall_health, 0) >= 80 THEN 'EXCELLENT'
        WHEN COALESCE(hm.overall_health, 0) >= 60 THEN 'GOOD'
        WHEN COALESCE(hm.overall_health, 0) >= 40 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as health_status,
    CASE 
        WHEN COALESCE(hm.avg_response_time, 0) <= 1000 THEN 'FAST'
        WHEN COALESCE(hm.avg_response_time, 0) <= 3000 THEN 'MODERATE'
        WHEN COALESCE(hm.avg_response_time, 0) <= 5000 THEN 'SLOW'
        ELSE 'VERY_SLOW'
    END as response_category
FROM ai_providers ap
LEFT JOIN ai_provider_health_metrics hm ON ap.id = hm.provider_id
ORDER BY COALESCE(hm.overall_health, 0) DESC, ap.name;

-- Create function to get provider test statistics
CREATE OR REPLACE FUNCTION get_provider_test_statistics(provider_id_param UUID, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    test_type VARCHAR(50),
    total_tests INTEGER,
    pass_count INTEGER,
    fail_count INTEGER,
    warning_count INTEGER,
    avg_score DECIMAL(5,2),
    avg_response_time INTEGER,
    success_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        apr.test_type,
        COUNT(*)::INTEGER as total_tests,
        COUNT(CASE WHEN apr.status = 'pass' THEN 1 END)::INTEGER as pass_count,
        COUNT(CASE WHEN apr.status = 'fail' THEN 1 END)::INTEGER as fail_count,
        COUNT(CASE WHEN apr.status = 'warning' THEN 1 END)::INTEGER as warning_count,
        AVG(apr.score) as avg_score,
        AVG(apr.response_time)::INTEGER as avg_response_time,
        (COUNT(CASE WHEN apr.status IN ('pass', 'warning') THEN 1 END) * 100.0 / COUNT(*)) as success_rate
    FROM ai_provider_test_results apr
    WHERE apr.provider_id = provider_id_param
    AND apr.timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    GROUP BY apr.test_type
    ORDER BY apr.test_type;
END;
$$ LANGUAGE plpgsql;
