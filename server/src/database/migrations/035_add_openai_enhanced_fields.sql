-- Migration: Add enhanced OpenAI fields to ai_providers table
-- This migration adds support for priority, rate limits, and enhanced usage tracking

-- Add priority column for failover ordering
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

-- Add rate limits configuration
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS rate_limits JSONB DEFAULT '{
  "requestsPerMinute": 3500,
  "tokensPerMinute": 90000,
  "requestsPerDay": 10000
}';

-- Add enhanced usage statistics
-- Update existing usage_stats to include new fields if they don't exist
UPDATE ai_providers 
SET usage_stats = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(usage_stats, '{}'),
          '{requestsThisMinute}',
          '0'
        ),
        '{tokensThisMinute}',
        '0'
      ),
      '{requestsToday}',
      '0'
    ),
    '{lastReset}',
    to_jsonb(CURRENT_TIMESTAMP)
  ),
  '{last_used}',
  to_jsonb(CURRENT_TIMESTAMP)
)
WHERE usage_stats IS NULL OR NOT (usage_stats ? 'requestsThisMinute');

-- Add index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_ai_providers_priority ON ai_providers(priority, is_active);

-- Add index for provider type and active status
CREATE INDEX IF NOT EXISTS idx_ai_providers_type_active ON ai_providers(provider_type, is_active);

-- Add comments for documentation
COMMENT ON COLUMN ai_providers.priority IS 'Priority for failover ordering (lower number = higher priority)';
COMMENT ON COLUMN ai_providers.rate_limits IS 'Rate limiting configuration including requests per minute, tokens per minute, and requests per day';
COMMENT ON COLUMN ai_providers.usage_stats IS 'Enhanced usage statistics including current usage counters and timestamps';

-- Create a function to reset usage counters
CREATE OR REPLACE FUNCTION reset_ai_provider_usage_counters()
RETURNS void AS $$
BEGIN
  UPDATE ai_providers 
  SET usage_stats = jsonb_set(
    jsonb_set(
      usage_stats,
      '{requestsThisMinute}',
      '0'
    ),
    '{tokensThisMinute}',
    '0'
  )
  WHERE 
    provider_type = 'openai' 
    AND is_active = true
    AND (usage_stats->>'lastReset')::timestamp < (CURRENT_TIMESTAMP - INTERVAL '1 minute');
    
  UPDATE ai_providers 
  SET usage_stats = jsonb_set(
    usage_stats,
    '{requestsToday}',
    '0'
  )
  WHERE 
    provider_type = 'openai' 
    AND is_active = true
    AND (usage_stats->>'lastReset')::timestamp < (CURRENT_TIMESTAMP - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Create a view for OpenAI provider statistics
CREATE OR REPLACE VIEW openai_provider_stats AS
SELECT 
  id,
  name,
  is_active,
  priority,
  rate_limits,
  usage_stats,
  (usage_stats->>'total_requests')::int as total_requests,
  (usage_stats->>'total_tokens')::int as total_tokens,
  (usage_stats->>'requestsThisMinute')::int as current_requests_per_minute,
  (usage_stats->>'tokensThisMinute')::int as current_tokens_per_minute,
  (usage_stats->>'requestsToday')::int as current_requests_today,
  (usage_stats->>'lastReset')::timestamp as last_reset,
  (usage_stats->>'last_used')::timestamp as last_used,
  created_at,
  updated_at
FROM ai_providers 
WHERE provider_type = 'openai';

-- Grant permissions on the view
GRANT SELECT ON openai_provider_stats TO PUBLIC;