-- Create OpenRouter provider with GPT-OSS-120B
INSERT INTO ai_providers (
    name, 
    provider_type, 
    api_key_encrypted, 
    configuration, 
    is_active
) VALUES (
    'OpenRouter GPT-OSS-120B',
    'openrouter',
    'REPLACE_WITH_BASE64_ENCODED_API_KEY',
    '{"model": "gpt-oss-120b", "baseURL": "https://openrouter.ai/api/v1", "timeout": 30000, "maxRetries": 3, "description": "Access to GPT-OSS-120B - the hottest 120B parameter open-source model with Mixture-of-Experts architecture"}',
    true
);

