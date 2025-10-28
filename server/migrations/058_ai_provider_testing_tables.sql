/**
 * AI Provider Testing Tables Migration
 * Creates tables for AI provider testing and health monitoring
 */

-- Table for provider health metrics
CREATE TABLE IF NOT EXISTS ai_provider_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  provider_name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL,
  overall_health DECIMAL(5,2) NOT NULL CHECK (overall_health >= 0 AND overall_health <= 100),
  availability DECIMAL(5,2) NOT NULL CHECK (availability >= 0 AND availability <= 100),
  response_time INTEGER NOT NULL,  -- milliseconds
  success_rate DECIMAL(5,2) NOT NULL CHECK (success_rate >= 0 AND success_rate <= 100),
  last_tested TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recommendations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for individual test results
CREATE TABLE IF NOT EXISTS ai_provider_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('connectivity', 'response_time', 'content_quality', 'error_handling', 'rate_limits')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pass', 'fail', 'warning', 'timeout')),
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  response_time INTEGER,  -- milliseconds
  details TEXT,
  error_message TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Table for test configurations
CREATE TABLE IF NOT EXISTS ai_provider_test_configs (
  provider_id UUID PRIMARY KEY REFERENCES ai_providers(id) ON DELETE CASCADE,
  test_types JSONB DEFAULT '["connectivity", "response_time", "content_quality", "error_handling", "rate_limits"]',
  timeout_ms INTEGER DEFAULT 30000,
  retry_attempts INTEGER DEFAULT 3,
  batch_size INTEGER DEFAULT 5,
  test_prompts JSONB DEFAULT '{
    "simple": "Hello, how are you?",
    "complex": "Explain the concept of quantum computing.",
    "creative": "Write a short story.",
    "technical": "Analyze algorithm complexity."
  }',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_metrics_provider ON ai_provider_health_metrics(provider_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_tested ON ai_provider_health_metrics(last_tested DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_provider ON ai_provider_test_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON ai_provider_test_results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON ai_provider_test_results(status);

-- Function to get provider test statistics
CREATE OR REPLACE FUNCTION get_provider_test_statistics(
  p_provider_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  test_type VARCHAR(50),
  total_tests BIGINT,
  passed_tests BIGINT,
  failed_tests BIGINT,
  avg_score DECIMAL(5,2),
  avg_response_time DECIMAL(10,2),
  success_rate DECIMAL(5,2),
  last_test_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.test_type,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE t.status = 'pass') as passed_tests,
    COUNT(*) FILTER (WHERE t.status IN ('fail', 'timeout')) as failed_tests,
    AVG(t.score) as avg_score,
    AVG(t.response_time) as avg_response_time,
    (COUNT(*) FILTER (WHERE t.status = 'pass')::DECIMAL / COUNT(*) * 100) as success_rate,
    MAX(t.timestamp) as last_test_date
  FROM ai_provider_test_results t
  WHERE t.provider_id = p_provider_id
    AND t.timestamp >= NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY t.test_type
  ORDER BY t.test_type;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ai_provider_health_metrics IS 'Stores overall health metrics for AI providers';
COMMENT ON TABLE ai_provider_test_results IS 'Stores individual test results for provider validation';
COMMENT ON TABLE ai_provider_test_configs IS 'Stores test configuration settings per provider';
COMMENT ON FUNCTION get_provider_test_statistics IS 'Aggregates provider test statistics over a time period';

