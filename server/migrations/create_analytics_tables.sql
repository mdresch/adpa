-- Analytics Tracking Tables Migration
-- Purpose: Track RAG operations, performance metrics, and integration usage

-- Create RAG analytics table
CREATE TABLE IF NOT EXISTS rag_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(50) NOT NULL, -- 'ingest', 'query', 'sync'
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  duration_ms INTEGER,
  chunks_processed INTEGER,
  vectors_created INTEGER,
  error_message TEXT,
  error_type VARCHAR(100), -- e.g., 'VOYAGE_API_ERROR', 'DATABASE_ERROR', 'VALIDATION_ERROR'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rag_analytics_type_time 
  ON rag_analytics(operation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_analytics_success 
  ON rag_analytics(success, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_analytics_document 
  ON rag_analytics(document_id) WHERE document_id IS NOT NULL;

-- Create integration usage metrics table
CREATE TABLE IF NOT EXISTS integration_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID,
  integration_type VARCHAR(50) NOT NULL,
  api_calls_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_response_time_ms DECIMAL(10,2),
  min_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for integration metrics
CREATE INDEX IF NOT EXISTS idx_integration_metrics_type_time 
  ON integration_usage_metrics(integration_type, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_integration_metrics_integration 
  ON integration_usage_metrics(integration_id) WHERE integration_id IS NOT NULL;

-- Create a view for recent RAG errors (last 7 days)
CREATE OR REPLACE VIEW recent_rag_errors AS
SELECT 
  id,
  operation_type,
  document_id,
  error_message,
  error_type,
  duration_ms,
  metadata,
  created_at
FROM rag_analytics
WHERE success = false 
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;

-- Create a function to get RAG analytics summary
CREATE OR REPLACE FUNCTION get_rag_analytics_summary(
  time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  operation_type VARCHAR(50),
  total_operations BIGINT,
  successful_operations BIGINT,
  failed_operations BIGINT,
  avg_duration_ms NUMERIC,
  total_chunks_processed BIGINT,
  total_vectors_created BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.operation_type,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE ra.success = true) as successful_operations,
    COUNT(*) FILTER (WHERE ra.success = false) as failed_operations,
    ROUND(AVG(ra.duration_ms)::NUMERIC, 2) as avg_duration_ms,
    COALESCE(SUM(ra.chunks_processed), 0) as total_chunks_processed,
    COALESCE(SUM(ra.vectors_created), 0) as total_vectors_created,
    ROUND((COUNT(*) FILTER (WHERE ra.success = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as success_rate
  FROM rag_analytics ra
  WHERE ra.created_at >= NOW() - (time_range_hours || ' hours')::INTERVAL
  GROUP BY ra.operation_type;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get hourly RAG ingestion stats (for charts)
CREATE OR REPLACE FUNCTION get_hourly_rag_ingestion(
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  hour_bucket TIMESTAMPTZ,
  successful_count BIGINT,
  failed_count BIGINT,
  total_chunks BIGINT,
  total_vectors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', ra.created_at) as hour_bucket,
    COUNT(*) FILTER (WHERE ra.success = true) as successful_count,
    COUNT(*) FILTER (WHERE ra.success = false) as failed_count,
    COALESCE(SUM(ra.chunks_processed), 0) as total_chunks,
    COALESCE(SUM(ra.vectors_created), 0) as total_vectors
  FROM rag_analytics ra
  WHERE ra.operation_type = 'ingest'
    AND ra.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY hour_bucket
  ORDER BY hour_bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE rag_analytics IS 'Tracks all RAG operations including ingestion, queries, and syncs with performance metrics';
COMMENT ON TABLE integration_usage_metrics IS 'Aggregated metrics for integration API usage and performance';
COMMENT ON FUNCTION get_rag_analytics_summary IS 'Returns summary statistics for RAG operations within a specified time range';
COMMENT ON FUNCTION get_hourly_rag_ingestion IS 'Returns hourly aggregated statistics for RAG document ingestion';

-- Verification query
SELECT 
  'rag_analytics table created' as status,
  COUNT(*) as row_count
FROM rag_analytics
UNION ALL
SELECT 
  'integration_usage_metrics table created',
  COUNT(*)
FROM integration_usage_metrics;
