-- Check AI Providers Configuration
-- Run this against your production database

SELECT 
  id,
  name,
  provider_type,
  CASE 
    WHEN api_key IS NOT NULL AND LENGTH(api_key) > 0 THEN 'API Key Set ✓'
    WHEN api_key_encrypted IS NOT NULL THEN 'Encrypted Key Set ✓'
    ELSE 'No API Key ✗'
  END as api_key_status,
  is_enabled,
  is_active,
  priority,
  api_base_url,
  last_used_at,
  created_at
FROM ai_providers
ORDER BY priority ASC, name ASC;

-- Check if ANY provider is enabled and has a key
SELECT 
  COUNT(*) as total_providers,
  COUNT(CASE WHEN is_enabled = true THEN 1 END) as enabled_providers,
  COUNT(CASE WHEN is_enabled = true AND (api_key IS NOT NULL OR api_key_encrypted IS NOT NULL) THEN 1 END) as enabled_with_keys
FROM ai_providers;


