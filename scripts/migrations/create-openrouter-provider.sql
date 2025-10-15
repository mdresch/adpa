-- Create OpenRouter provider with GPT-OSS-120B
INSERT INTO ai_providers (
    name, 
    provider_type, 
    api_key_encrypted, 
    configuration, 
    is_active, 
    priority,
    created_at, 
    updated_at
) VALUES (
    'OpenRouter GPT-OSS-120B',
    'openrouter',
    'REPLACE_WITH_BASE64_ENCODED_API_KEY', -- You'll need to replace this with your actual OpenRouter API key
    '{
        "model": "gpt-oss-120b",
        "baseURL": "https://openrouter.ai/api/v1",
        "timeout": 30000,
        "maxRetries": 3,
        "description": "Access to GPT-OSS-120B - the hottest 120B parameter open-source model with Mixture-of-Experts architecture",
        "capabilities": [
            "text-generation",
            "reasoning",
            "coding",
            "mathematics",
            "scientific-analysis"
        ],
        "features": [
            "near-parity with o4-mini",
            "efficient MoE architecture",
            "open-weight model",
            "Apache 2.0 license"
        ]
    }',
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (name) DO UPDATE SET
    configuration = EXCLUDED.configuration,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;