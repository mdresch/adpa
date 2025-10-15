-- Update Google AI provider with API key
UPDATE ai_providers 
SET 
    api_key_encrypted = 'REPLACE_WITH_BASE64_ENCODED_API_KEY', -- Replace with your actual Google AI API key encoded in base64
    configuration = '{
        "model": "gemini-pro",
        "timeout": 30000,
        "maxRetries": 3
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Google AI' AND provider_type = 'google';
