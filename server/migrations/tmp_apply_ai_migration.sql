-- Apply AI provider rate_limits default and ensure usage_stats structure
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS rate_limits JSONB;

UPDATE ai_providers
SET rate_limits = '{"requestsPerMinute": 3500, "tokensPerMinute": 90000, "requestsPerDay": 10000}'
WHERE rate_limits IS NULL;

-- Ensure usage_stats fields exist
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

-- Add comments
COMMENT ON COLUMN ai_providers.priority IS 'Priority for failover ordering (lower number = higher priority)';
COMMENT ON COLUMN ai_providers.rate_limits IS 'Rate limiting configuration including requests per minute, tokens per minute, and requests per day';
COMMENT ON COLUMN ai_providers.usage_stats IS 'Enhanced usage statistics including current usage counters and timestamps';
