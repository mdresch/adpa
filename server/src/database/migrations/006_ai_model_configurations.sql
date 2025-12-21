-- Migration: AI Model Configurations
-- Description: Create tables for storing individual model configurations and parameters

-- Create ai_model_configurations table
CREATE TABLE IF NOT EXISTS ai_model_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_id VARCHAR(255) NOT NULL, -- The actual model identifier (e.g., "gpt-4", "gemini-pro")
    model_name VARCHAR(255) NOT NULL, -- Display name for the model
    is_active BOOLEAN DEFAULT true,
    
    -- Model Parameters
    context_window INTEGER DEFAULT 128000,
    max_tokens INTEGER DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.70,
    top_p DECIMAL(3,2) DEFAULT 1.00,
    frequency_penalty DECIMAL(3,2) DEFAULT 0.00,
    presence_penalty DECIMAL(3,2) DEFAULT 0.00,
    
    -- Additional Configuration
    configuration JSONB DEFAULT '{}',
    
    -- Usage Statistics
    usage_stats JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(provider_id, model_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_provider_id ON ai_model_configurations(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_model_id ON ai_model_configurations(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_is_active ON ai_model_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_created_at ON ai_model_configurations(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_model_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_model_configurations_updated_at
    BEFORE UPDATE ON ai_model_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_model_configurations_updated_at();

-- Create view for model configurations with provider details
CREATE OR REPLACE VIEW ai_model_configurations_with_provider AS
SELECT 
    mc.*,
    ap.name as provider_name,
    ap.provider_type,
    ap.is_active as provider_is_active
FROM ai_model_configurations mc
JOIN ai_providers ap ON mc.provider_id = ap.id;

-- Insert some default model configurations for existing providers
INSERT INTO ai_model_configurations (provider_id, model_id, model_name, context_window, max_tokens, temperature, top_p)
SELECT 
    ap.id,
    CASE 
        WHEN ap.provider_type = 'openai' THEN 'gpt-4'
        WHEN ap.provider_type = 'google' THEN 'gemini-2.5-flash'
        WHEN ap.provider_type = 'mistral' THEN 'mistral-large-latest'
        WHEN ap.provider_type = 'azure' THEN 'gpt-4'
        WHEN ap.provider_type = 'ollama' THEN 'llama3.1:latest'
        ELSE 'default'
    END,
    CASE 
        WHEN ap.provider_type = 'openai' THEN 'GPT-4'
        WHEN ap.provider_type = 'google' THEN 'Gemini 2.5 Flash'
        WHEN ap.provider_type = 'mistral' THEN 'Mistral Large Latest'
        WHEN ap.provider_type = 'azure' THEN 'GPT-4'
        WHEN ap.provider_type = 'ollama' THEN 'Llama 3.1 Latest'
        ELSE 'Default Model'
    END,
    CASE 
        WHEN ap.provider_type = 'openai' THEN 8192
        WHEN ap.provider_type = 'google' THEN 2000000
        WHEN ap.provider_type = 'mistral' THEN 128000
        WHEN ap.provider_type = 'azure' THEN 8192
        WHEN ap.provider_type = 'ollama' THEN 128000
        ELSE 4096
    END,
    CASE 
        WHEN ap.provider_type = 'openai' THEN 4096
        WHEN ap.provider_type = 'google' THEN 8192
        WHEN ap.provider_type = 'mistral' THEN 8192
        WHEN ap.provider_type = 'azure' THEN 4096
        WHEN ap.provider_type = 'ollama' THEN 4096
        ELSE 2048
    END,
    0.7,
    1.0
FROM ai_providers ap
WHERE ap.is_active = true
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_model_configurations TO postgres;
GRANT SELECT ON ai_model_configurations_with_provider TO postgres;
