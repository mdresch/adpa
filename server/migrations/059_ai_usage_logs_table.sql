/**
 * AI Usage Logs Table Migration
 * Creates table for tracking all AI API usage for analytics
 */

-- Table for tracking individual AI API calls
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider Information
  provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  model_id VARCHAR(255),
  provider_type VARCHAR(50) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  
  -- Request Details
  request_type VARCHAR(50) NOT NULL, -- 'text_generation', 'chat_completion', 'embedding', etc.
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER NOT NULL,
  
  -- Performance Metrics
  response_time_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  status_code INTEGER,
  
  -- Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Cost Tracking
  estimated_cost DECIMAL(10, 6) DEFAULT 0.00,
  
  -- Metadata
  request_payload JSONB,
  response_metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for common queries
  CONSTRAINT ai_usage_logs_total_tokens_check CHECK (total_tokens >= 0),
  CONSTRAINT ai_usage_logs_response_time_check CHECK (response_time_ms >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider_id ON ai_usage_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_project_id ON ai_usage_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_document_id ON ai_usage_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider_type ON ai_usage_logs(provider_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_success ON ai_usage_logs(success);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_cost ON ai_usage_logs(estimated_cost DESC);

-- Composite indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider_date ON ai_usage_logs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_project_date ON ai_usage_logs(project_id, created_at DESC);

-- View for aggregated AI usage statistics
CREATE OR REPLACE VIEW ai_usage_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  provider_type,
  model_name,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  AVG(response_time_ms) as avg_response_time,
  SUM(estimated_cost) as total_cost,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests,
  (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*) * 100) as success_rate
FROM ai_usage_logs
GROUP BY DATE_TRUNC('day', created_at), provider_type, model_name
ORDER BY date DESC, total_tokens DESC;

-- View for provider usage summary
CREATE OR REPLACE VIEW ai_provider_usage_summary AS
SELECT 
  ap.id as provider_id,
  ap.name as provider_name,
  ap.provider_type,
  COUNT(aul.id) as total_requests,
  SUM(aul.total_tokens) as total_tokens,
  AVG(aul.response_time_ms) as avg_response_time,
  SUM(aul.estimated_cost) as total_cost,
  COUNT(*) FILTER (WHERE aul.success = true) as successful_requests,
  COUNT(*) FILTER (WHERE aul.success = false) as failed_requests,
  MAX(aul.created_at) as last_used_at
FROM ai_providers ap
LEFT JOIN ai_usage_logs aul ON ap.id = aul.provider_id
GROUP BY ap.id, ap.name, ap.provider_type
ORDER BY total_requests DESC;

-- Function to get usage by date range
CREATE OR REPLACE FUNCTION get_ai_usage_by_date_range(
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  p_provider_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  date TIMESTAMP,
  provider_type VARCHAR(50),
  model_name VARCHAR(255),
  request_count BIGINT,
  total_tokens BIGINT,
  avg_response_time DECIMAL(10,2),
  total_cost DECIMAL(10,6),
  success_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', aul.created_at) as date,
    aul.provider_type,
    aul.model_name,
    COUNT(*) as request_count,
    SUM(aul.total_tokens) as total_tokens,
    AVG(aul.response_time_ms) as avg_response_time,
    SUM(aul.estimated_cost) as total_cost,
    (COUNT(*) FILTER (WHERE aul.success = true)::DECIMAL / COUNT(*) * 100) as success_rate
  FROM ai_usage_logs aul
  WHERE aul.created_at >= start_date 
    AND aul.created_at <= end_date
    AND (p_provider_id IS NULL OR aul.provider_id = p_provider_id)
    AND (p_user_id IS NULL OR aul.user_id = p_user_id)
    AND (p_project_id IS NULL OR aul.project_id = p_project_id)
  GROUP BY DATE_TRUNC('day', aul.created_at), aul.provider_type, aul.model_name
  ORDER BY date DESC, total_tokens DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API calls for analytics and cost monitoring';
COMMENT ON COLUMN ai_usage_logs.provider_id IS 'Reference to AI provider (nullable for deleted providers)';
COMMENT ON COLUMN ai_usage_logs.total_tokens IS 'Total tokens used (input + output)';
COMMENT ON COLUMN ai_usage_logs.estimated_cost IS 'Estimated cost in USD based on token usage';
COMMENT ON COLUMN ai_usage_logs.request_payload IS 'Request parameters (JSONB for flexibility)';
COMMENT ON COLUMN ai_usage_logs.response_metadata IS 'Response metadata like finish_reason, model_version, etc.';

COMMENT ON VIEW ai_usage_stats IS 'Aggregated daily AI usage statistics by provider and model';
COMMENT ON VIEW ai_provider_usage_summary IS 'Summary of usage statistics per AI provider';
COMMENT ON FUNCTION get_ai_usage_by_date_range IS 'Get AI usage statistics for a specific date range with optional filters';

