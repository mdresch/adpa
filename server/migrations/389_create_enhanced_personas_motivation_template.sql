-- Migration: Create Enhanced User Personas Motivation Assessment Template
-- Description: Creates a comprehensive User Personas Motivation Assessment template that enforces Markdown output
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

    -- Create the User Personas Motivation Assessment template
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'User Personas Motivation Assessment Enhanced',
        'Comprehensive assessment of user personas and their motivations for project engagement, aligned with PMBOK 7, BABOK, and ISO standards',
        'PMBOK 7',
        'Stakeholder Management',
        '{
            "sections": [
                {
                    "id": "executive_summary",
                    "title": "Executive Summary",
                    "content": "## Executive Summary\n\nThis User Personas Motivation Assessment document provides a comprehensive analysis of key stakeholders involved in the {{project_name}} project, focusing on their distinct roles, motivations, and needs. By aligning these insights with **PMBOK (7th Edition)** principles, **BABOK** knowledge areas, and relevant **ISO standards** (specifically ISO 21500 for project management, ISO 9001 for quality, and ISO 27001 for information security), this assessment aims to ensure that project planning, execution, and solution delivery are deeply user-centric and compliant.\n\n{{executive_summary_details}}",
                    "required": true
                }
            ],
            "metadata": {
                "version": "2.0",
                "last_updated": "2026-02-03",
                "author": "ADPA System",
                "methodology": "PMBOK 7, BABOK, ISO Standards",
                "complexity": "advanced",
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
        'You are an expert business analyst specializing in user persona analysis and motivation assessment with deep expertise in PMBOK 7, BABOK, and ISO standards. Your role is to create comprehensive user persona motivation assessments that are clear, actionable, and aligned with industry best practices.

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

Focus on stakeholder needs, business value, and practical implementation. Ensure all persona motivations are clearly articulated and traceable to project objectives. Include comprehensive analysis of primary and secondary motivations, pain points, and desired outcomes. Align insights with PMBOK 7 principles, BABOK knowledge areas, and relevant ISO standards (21500, 9001, 27001).',

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
            "max_context_length": 6000,
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
WHERE name = 'User Personas Motivation Assessment'
ORDER BY name;
