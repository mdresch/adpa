-- Migration: Add Validation Functions for AI Enhancement Fields
-- Description: Creates validation functions for context injection and prompt build-up configurations
-- Date: 2024-01-XX
-- Version: 1.0.0

-- Create function to validate context injection configuration
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
    
    -- Validate each source in the sources array
    IF jsonb_array_length(config->'sources') > 0 THEN
        FOR i IN 0..jsonb_array_length(config->'sources')-1 LOOP
            DECLARE
                source JSONB;
            BEGIN
                source := config->'sources'->i;
                
                -- Check required source fields
                IF NOT (source ? 'type' AND source ? 'source_id' AND source ? 'source_name' AND source ? 'enabled') THEN
                    RETURN false;
                END IF;
                
                -- Check source type is valid
                IF NOT (source->>'type' IN ('project_data', 'user_preferences', 'document_history', 'external_api', 'database_query', 'file_content')) THEN
                    RETURN false;
                END IF;
                
                -- Check weight is between 0 and 1 if provided
                IF source ? 'weight' AND (source->>'weight')::numeric NOT BETWEEN 0 AND 1 THEN
                    RETURN false;
                END IF;
            END;
        END LOOP;
    END IF;
    
    -- Check max_context_length is positive if provided
    IF config ? 'max_context_length' AND (config->>'max_context_length')::integer <= 0 THEN
        RETURN false;
    END IF;
    
    -- Check context_priority is valid if provided
    IF config ? 'context_priority' AND NOT (config->>'context_priority' IN ('high', 'medium', 'low')) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate prompt build-up configuration
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
        
        -- Check order is a positive integer
        IF (stage->>'order')::integer <= 0 THEN
            RETURN false;
        END IF;
        
        -- Check enabled field is boolean if provided
        IF stage ? 'enabled' AND NOT jsonb_typeof(stage->'enabled') = 'boolean' THEN
            RETURN false;
        END IF;
        
        -- Check variables is an array if provided
        IF stage ? 'variables' AND jsonb_typeof(stage->'variables') != 'array' THEN
            RETURN false;
        END IF;
        
        -- Check dependencies is an array if provided
        IF stage ? 'dependencies' AND jsonb_typeof(stage->'dependencies') != 'array' THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate system prompt
CREATE OR REPLACE FUNCTION validate_system_prompt(prompt TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- NULL is allowed (optional field)
    IF prompt IS NULL THEN
        RETURN true;
    END IF;
    
    -- Check minimum length
    IF length(trim(prompt)) < 10 THEN
        RETURN false;
    END IF;
    
    -- Check maximum length (reasonable limit)
    IF length(prompt) > 10000 THEN
        RETURN false;
    END IF;
    
    -- Check for basic prompt structure (should contain some key words)
    IF NOT (prompt ILIKE '%you are%' OR prompt ILIKE '%your role%' OR prompt ILIKE '%assistant%' OR prompt ILIKE '%generate%') THEN
        RETURN false;
    END IF;
    
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

ALTER TABLE templates 
ADD CONSTRAINT chk_templates_system_prompt 
CHECK (validate_system_prompt(system_prompt));

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
    jsonb_array_length(t.prompt_build_up->'stages') as prompt_stages_count,
    t.context_injection_config->>'injection_strategy' as injection_strategy,
    t.prompt_build_up->>'final_format' as output_format
FROM templates t
WHERE t.deleted_at IS NULL;

-- Grant permissions on the view
GRANT SELECT ON templates_with_ai_enhancements TO authenticated_users;

-- Create helper functions for template analysis
CREATE OR REPLACE FUNCTION get_template_ai_capabilities(template_id UUID)
RETURNS JSONB AS $$
DECLARE
    template_record RECORD;
    capabilities JSONB;
BEGIN
    SELECT * INTO template_record FROM templates WHERE id = template_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    capabilities := jsonb_build_object(
        'has_system_prompt', (template_record.system_prompt IS NOT NULL AND template_record.system_prompt != ''),
        'context_injection_enabled', (template_record.context_injection_config->>'enabled' = 'true'),
        'prompt_build_up_enabled', (template_record.prompt_build_up->>'enabled' = 'true'),
        'context_sources_count', jsonb_array_length(template_record.context_injection_config->'sources'),
        'prompt_stages_count', jsonb_array_length(template_record.prompt_build_up->'stages'),
        'injection_strategy', template_record.context_injection_config->>'injection_strategy',
        'output_format', template_record.prompt_build_up->>'final_format',
        'ai_enhancement_level', 
            CASE 
                WHEN template_record.system_prompt IS NOT NULL AND 
                     template_record.context_injection_config->>'enabled' = 'true' AND 
                     template_record.prompt_build_up->>'enabled' = 'true' THEN 'advanced'
                WHEN template_record.system_prompt IS NOT NULL OR 
                     template_record.context_injection_config->>'enabled' = 'true' OR 
                     template_record.prompt_build_up->>'enabled' = 'true' THEN 'intermediate'
                ELSE 'basic'
            END
    );
    
    RETURN capabilities;
END;
$$ LANGUAGE plpgsql;

-- Create function to get templates by AI capability level
CREATE OR REPLACE FUNCTION get_templates_by_ai_level(capability_level TEXT)
RETURNS TABLE(
    template_id UUID,
    template_name VARCHAR,
    framework VARCHAR,
    ai_level TEXT,
    has_system_prompt BOOLEAN,
    context_injection_enabled BOOLEAN,
    prompt_build_up_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.framework,
        CASE 
            WHEN t.system_prompt IS NOT NULL AND 
                 t.context_injection_config->>'enabled' = 'true' AND 
                 t.prompt_build_up->>'enabled' = 'true' THEN 'advanced'
            WHEN t.system_prompt IS NOT NULL OR 
                 t.context_injection_config->>'enabled' = 'true' OR 
                 t.prompt_build_up->>'enabled' = 'true' THEN 'intermediate'
            ELSE 'basic'
        END as ai_level,
        (t.system_prompt IS NOT NULL AND t.system_prompt != '') as has_system_prompt,
        (t.context_injection_config->>'enabled' = 'true') as context_injection_enabled,
        (t.prompt_build_up->>'enabled' = 'true') as prompt_build_up_enabled
    FROM templates t
    WHERE t.deleted_at IS NULL
    AND CASE 
        WHEN capability_level = 'all' THEN true
        WHEN capability_level = 'advanced' THEN 
            (t.system_prompt IS NOT NULL AND 
             t.context_injection_config->>'enabled' = 'true' AND 
             t.prompt_build_up->>'enabled' = 'true')
        WHEN capability_level = 'intermediate' THEN 
            (t.system_prompt IS NOT NULL OR 
             t.context_injection_config->>'enabled' = 'true' OR 
             t.prompt_build_up->>'enabled' = 'true')
        WHEN capability_level = 'basic' THEN 
            (t.system_prompt IS NULL OR t.system_prompt = '') AND
            (t.context_injection_config->>'enabled' = 'false' OR t.context_injection_config->>'enabled' IS NULL) AND
            (t.prompt_build_up->>'enabled' = 'false' OR t.prompt_build_up->>'enabled' IS NULL)
        ELSE false
    END
    ORDER BY t.name;
END;
$$ LANGUAGE plpgsql;

-- Log the migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    'add_validation_functions', 
    CURRENT_TIMESTAMP, 
    'Added validation functions for AI enhancement fields with check constraints and helper functions'
) ON CONFLICT DO NOTHING;
