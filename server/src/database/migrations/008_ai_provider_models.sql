-- Migration: Add model configuration to ai_providers table
-- This allows dynamic model management without code changes

-- Add available_models column to store model list for each provider
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS available_models JSONB DEFAULT '[]';

-- Add default_model column to store the preferred model for each provider
ALTER TABLE ai_providers
ADD COLUMN IF NOT EXISTS default_model VARCHAR(100);

-- Update existing providers with their available models and defaults
-- These are the current working models as of October 2025

-- OpenAI
UPDATE ai_providers 
SET 
  available_models = '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]'::jsonb,
  default_model = 'gpt-4o'
WHERE provider_type = 'openai';

-- Google Gemini (updated to working v1 API models)
UPDATE ai_providers
SET
  available_models = '["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"]'::jsonb,
  default_model = 'gemini-1.5-flash'
WHERE provider_type = 'google';

-- Mistral
UPDATE ai_providers
SET
  available_models = '["mistral-large-latest", "mistral-small-latest", "mistral-medium-latest", "open-mistral-7b", "open-mixtral-8x7b"]'::jsonb,
  default_model = 'mistral-large-latest'
WHERE provider_type = 'mistral';

-- Groq
UPDATE ai_providers
SET
  available_models = '["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"]'::jsonb,
  default_model = 'llama-3.3-70b-versatile'
WHERE provider_type = 'groq';

-- Anthropic (Claude)
UPDATE ai_providers
SET
  available_models = '["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]'::jsonb,
  default_model = 'claude-3-5-sonnet-20241022'
WHERE provider_type = 'anthropic';

-- Azure OpenAI
UPDATE ai_providers
SET
  available_models = '["gpt-4o", "gpt-4", "gpt-35-turbo", "gpt-4-32k"]'::jsonb,
  default_model = 'gpt-4o'
WHERE provider_type = 'azure';

-- Add comment for documentation
COMMENT ON COLUMN ai_providers.available_models IS 'JSON array of available model names for this provider';
COMMENT ON COLUMN ai_providers.default_model IS 'Default model to use when none is specified';

-- Create index for faster model lookups
CREATE INDEX IF NOT EXISTS idx_ai_providers_default_model ON ai_providers(default_model);

