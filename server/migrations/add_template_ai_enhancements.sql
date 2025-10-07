-- Migration: Add AI Enhancement Fields to Templates Table
-- Description: Adds system prompt, context injection config, and prompt build-up fields to templates table
-- Date: 2024-01-XX
-- Version: 1.0.0

-- Add new columns to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS context_injection_config JSONB,
ADD COLUMN IF NOT EXISTS prompt_build_up JSONB;

-- Add indexes for better performance on JSONB fields
CREATE INDEX IF NOT EXISTS idx_templates_context_injection_config 
ON templates USING GIN (context_injection_config);

CREATE INDEX IF NOT EXISTS idx_templates_prompt_build_up 
ON templates USING GIN (prompt_build_up);

-- Add partial index for templates with system prompts
CREATE INDEX IF NOT EXISTS idx_templates_has_system_prompt 
ON templates (id) WHERE system_prompt IS NOT NULL AND system_prompt != '';

-- Add comments to document the new fields
COMMENT ON COLUMN templates.system_prompt IS 'System prompt that defines the AI assistant behavior and role for this template';
COMMENT ON COLUMN templates.context_injection_config IS 'Configuration for context injection including sources, strategy, and limits';
COMMENT ON COLUMN templates.prompt_build_up IS 'Configuration for multi-stage prompt building process';

-- Update existing templates with default context injection configuration
UPDATE templates 
SET context_injection_config = jsonb_build_object(
    'enabled', false,
    'sources', jsonb_build_array(),
    'injection_strategy', 'prepend',
    'max_context_length', 4000,
    'context_priority', 'medium'
)
WHERE context_injection_config IS NULL;

-- Update existing templates with default prompt build-up configuration
UPDATE templates 
SET prompt_build_up = jsonb_build_object(
    'enabled', false,
    'stages', jsonb_build_array(),
    'final_format', 'markdown',
    'include_metadata', true
)
WHERE prompt_build_up IS NULL;

-- Create a view for templates with AI enhancements
CREATE OR REPLACE VIEW templates_with_ai_enhancements AS
SELECT 
    t.*,
    CASE 
        WHEN t.system_prompt IS NOT NULL AND t.system_prompt != '' THEN true 
        ELSE false 
    END as has_system_prompt,
    CASE 
        WHEN t.context_injection_config->>'enabled' = 'true' THEN true 
        ELSE false 
    END as context_injection_enabled,
    CASE 
        WHEN t.prompt_build_up->>'enabled' = 'true' THEN true 
        ELSE false 
    END as prompt_build_up_enabled,
    jsonb_array_length(t.context_injection_config->'sources') as context_sources_count,
    jsonb_array_length(t.prompt_build_up->'stages') as prompt_stages_count
FROM templates t
WHERE t.deleted_at IS NULL;

-- Grant permissions on the view
GRANT SELECT ON templates_with_ai_enhancements TO authenticated_users;

-- Create a function to validate context injection configuration
CREATE OR REPLACE FUNCTION validate_context_injection_config(config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if config is valid JSONB
    IF config IS NULL THEN
        RETURN true; -- NULL is allowed (defaults will be used)
    END IF;
    
    -- Check required fields
    IF NOT (config ? 'enabled' AND config ? 'sources' AND config ? 'injection_strategy') THEN
        RETURN false;
    END IF;
    
    -- Check injection strategy is valid
    IF NOT (config->>'injection_strategy' IN ('prepend', 'append', 'interleave', 'structured')) THEN
        RETURN false;
    END IF;
    
    -- Check sources is an array
    IF jsonb_typeof(config->'sources') != 'array' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to validate prompt build-up configuration
CREATE OR REPLACE FUNCTION validate_prompt_build_up_config(config JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    stage JSONB;
BEGIN
    -- Check if config is valid JSONB
    IF config IS NULL THEN
        RETURN true; -- NULL is allowed (defaults will be used)
    END IF;
    
    -- Check required fields
    IF NOT (config ? 'enabled' AND config ? 'stages' AND config ? 'final_format') THEN
        RETURN false;
    END IF;
    
    -- Check final format is valid
    IF NOT (config->>'final_format' IN ('markdown', 'structured_json', 'plain_text', 'html')) THEN
        RETURN false;
    END IF;
    
    -- Check stages is an array
    IF jsonb_typeof(config->'stages') != 'array' THEN
        RETURN false;
    END IF;
    
    -- Validate each stage
    FOR stage IN SELECT jsonb_array_elements(config->'stages')
    LOOP
        -- Check required stage fields
        IF NOT (stage ? 'stage_name' AND stage ? 'stage_type' AND stage ? 'prompt_template' AND stage ? 'order') THEN
            RETURN false;
        END IF;
        
        -- Check stage type is valid
        IF NOT (stage->>'stage_type' IN ('context_gathering', 'template_processing', 'ai_generation', 'post_processing')) THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add check constraints to validate the JSONB configurations
ALTER TABLE templates 
ADD CONSTRAINT chk_templates_context_injection_config 
CHECK (validate_context_injection_config(context_injection_config));

ALTER TABLE templates 
ADD CONSTRAINT chk_templates_prompt_build_up 
CHECK (validate_prompt_build_up_config(prompt_build_up));

-- Create a trigger to update the updated_at timestamp when AI enhancement fields are modified
CREATE OR REPLACE FUNCTION update_templates_ai_enhancements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_templates_ai_enhancements_timestamp
    BEFORE UPDATE OF system_prompt, context_injection_config, prompt_build_up
    ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_templates_ai_enhancements_timestamp();

-- Insert sample templates with AI enhancements for testing
INSERT INTO templates (
    id, name, description, framework, category, content, variables, 
    is_public, created_by, system_prompt, context_injection_config, prompt_build_up
) VALUES (
    gen_random_uuid(),
    'AI-Enhanced Business Requirements Template',
    'Advanced business requirements template with AI system prompt and context injection',
    'BABOK v3',
    'Requirements',
    '{"sections": ["executive_summary", "business_context", "stakeholder_analysis", "functional_requirements", "non_functional_requirements", "acceptance_criteria"]}',
    '[]',
    true,
    'system',
    'You are an expert business analyst specializing in BABOK v3 methodology. Your role is to help create comprehensive business requirements documents that are clear, actionable, and aligned with industry best practices. Focus on stakeholder needs, business value, and technical feasibility.',
    '{"enabled": true, "sources": [{"type": "project_data", "source_id": "current_project", "source_name": "Current Project Context", "enabled": true, "weight": 1.0}, {"type": "user_preferences", "source_id": "user_profile", "source_name": "User Preferences", "enabled": true, "weight": 0.8}], "injection_strategy": "structured", "max_context_length": 4000, "context_priority": "high"}',
    '{"enabled": true, "stages": [{"stage_name": "Context Gathering", "stage_type": "context_gathering", "prompt_template": "Gather project context: {project_context}", "variables": ["project_context"], "order": 1, "enabled": true}, {"stage_name": "Requirements Generation", "stage_type": "ai_generation", "prompt_template": "Generate business requirements based on: {context}", "variables": ["context"], "dependencies": ["Context Gathering"], "order": 2, "enabled": true}], "final_format": "markdown", "include_metadata": true}'
) ON CONFLICT DO NOTHING;

-- Log the migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    'add_template_ai_enhancements', 
    CURRENT_TIMESTAMP, 
    'Added system_prompt, context_injection_config, and prompt_build_up fields to templates table with validation and indexes'
) ON CONFLICT DO NOTHING;
