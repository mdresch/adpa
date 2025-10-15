-- Create Claude provider
INSERT INTO ai_providers (
    name, 
    provider_type, 
    api_key_encrypted, 
    configuration, 
    is_active
) VALUES (
    'Claude 3.5 Sonnet',
    'anthropic',
    'REPLACE_WITH_BASE64_ENCODED_API_KEY',
    '{"model": "claude-3-5-sonnet-20241022", "baseURL": "https://api.anthropic.com", "timeout": 30000, "maxRetries": 3, "description": "Claude 3.5 Sonnet - Advanced reasoning and analysis capabilities"}',
    true
);

