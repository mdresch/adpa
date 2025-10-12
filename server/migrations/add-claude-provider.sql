-- Add Claude provider to the database
INSERT INTO ai_providers (
  id, 
  name, 
  provider_type, 
  api_key_encrypted, 
  configuration, 
  is_active,
  priority
) VALUES (
  gen_random_uuid(),
  'Claude Sonnet 4.5',
  'claude',
  'REPLACE_WITH_BASE64_ENCODED_API_KEY', -- Replace with your actual Claude API key encoded in base64
  '{
    "model": "claude-sonnet-4-5-20250929",
    "timeout": 60000,
    "maxRetries": 3
  }'::jsonb,
  true,
  1
);