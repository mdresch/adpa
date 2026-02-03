-- Migration: Create Enhanced User Personas Technology Comfort Template
-- Description: Creates a comprehensive User Personas Technology Comfort template that enforces Markdown output
-- Date: 2026-02-03
-- Version: 1.0.0

-- Get a system user ID for created_by field
DO $$
DECLARE
    system_user_id UUID;
BEGIN
    SELECT id INTO system_user_id FROM users WHERE email = 'system@adpa.local' LIMIT 1;
    
    IF system_user_id IS NULL THEN
        INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'system@adpa.local',
            'ADPA System',
            'admin',
            'system_user_no_password',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO system_user_id;
    END IF;

    -- Create the User Personas Technology Comfort template
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'User Personas Technology Comfort Enhanced',
        'Comprehensive assessment of user personas technology comfort levels, preferred tools, challenges, and adoption barriers for successful digital transformation',
        'Digital Transformation',
        'User Adoption',
        '{
            "sections": [
                {
                    "id": "executive_summary",
                    "title": "Executive Summary",
                    "content": "## User Personas Technology Comfort\n\nThis User Personas Technology Comfort assessment provides a comprehensive analysis of key user groups involved in the {{project_name}} project. It details their current technology comfort levels, preferred tools, common challenges, and potential barriers to adopting the new integrated system. Understanding these aspects is crucial for designing targeted training, support, and feature development to ensure a smooth transition and maximize user adoption.\n\n{{executive_summary_details}}",
                    "required": true
                }
            ],
            "metadata": {
                "version": "2.0",
                "last_updated": "2026-02-03",
                "author": "ADPA System",
                "methodology": "Digital Transformation Framework",
                "complexity": "intermediate",
                "output_format": "markdown"
            }
        }',
        '[
            {
                "name": "project_name",
                "type": "text",
                "required": true,
                "description": "Name of the project"
            }
        ]',
        true,
        system_user_id,
        'You are an expert technology analyst specializing in user persona technology comfort assessments and digital adoption strategies. Your role is to create comprehensive technology comfort assessments that are clear, actionable, and aligned with modern digital transformation practices.

CRITICAL OUTPUT REQUIREMENTS:
- OUTPUT MUST BE IN MARKDOWN FORMAT (.md) ONLY
- DO NOT OUTPUT JSON FORMAT OR STRUCTURED DATA OBJECTS
- USE STANDARD MARKDOWN SYNTAX ONLY
- TABLES MUST USE PIPE SYNTAX | Header | Header |
- HEADERS MUST USE # SYMBOLS (H1: #, H2: ##, H3: ###)
- LISTS MUST USE - OR * SYMBOLS FOR UNORDERED LISTS
- LISTS MUST USE 1. 2. 3. FOR ORDERED LISTS
- BOLD TEXT USE **text**
- ITALIC TEXT USE *text*
- CODE BLOCKS USE ```language

Focus on technology comfort levels, preferred tools, challenges, and adoption barriers. Ensure all technology assessments are clearly articulated and traceable to user adoption strategies. Include comprehensive analysis of current technology proficiency, pain points, and training needs. Align insights with modern digital adoption frameworks and change management best practices.',

        '{
            "enabled": true,
            "sources": [
                {
                    "type": "project_data",
                    "source_id": "project_context",
                    "source_name": "Project Context",
                    "query": "SELECT * FROM projects WHERE id = $1",
                    "parameters": {"project_id": "{{project_id}}"},
                    "enabled": true,
                    "weight": 1.0
                }
            ],
            "injection_strategy": "structured",
            "max_context_length": 5000,
            "context_priority": "high"
        }',
        '{
            "enabled": true,
            "stages": [
                {
                    "stage_name": "Format Validation",
                    "stage_type": "pre_processing",
                    "prompt_template": "CRITICAL: You MUST output in MARKDOWN format only. NO JSON, NO structured objects. Use # for headers, | for tables, - for lists. This is a hard requirement.",
                    "variables": [],
                    "order": 1,
                    "enabled": true
                }
            ],
            "final_format": "markdown",
            "include_metadata": false
        }'
    );

END $$;

-- Verify the template was created/updated
SELECT 
    id,
    name,
    framework,
    category,
    CASE 
        WHEN system_prompt LIKE '%MARKDOWN FORMAT%' THEN 'Markdown Enforced'
        ELSE 'Not Updated'
    END as status,
    LENGTH(system_prompt) as prompt_length
FROM templates 
WHERE name = 'User Personas Technology Comfort'
ORDER BY name;
