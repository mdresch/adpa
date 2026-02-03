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
        INSERT INTO users (id, email, name, role, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'system@adpa.local',
            'ADPA System',
            'admin',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO system_user_id;
    END IF;

    -- Create or update the User Personas Technology Comfort template
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'User Personas Technology Comfort',
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
                },
                {
                    "id": "assessment_methodology",
                    "title": "Assessment Methodology",
                    "content": "## Assessment Methodology\n\n### Approach\n{{assessment_approach}}\n\n### Evaluation Criteria\n{{evaluation_criteria}}\n\n### Data Sources\n{{data_sources}}",
                    "required": true
                },
                {
                    "id": "technology_comfort_analysis",
                    "title": "Technology Comfort Analysis",
                    "content": "## Technology Comfort Analysis\n\n### Overview\n{{technology_overview}}\n\n### Detailed Persona Assessment\n{{technology_comfort_table}}",
                    "required": true
                },
                {
                    "id": "adoption_barriers",
                    "title": "Adoption Barriers and Challenges",
                    "content": "## Adoption Barriers and Challenges\n\n### Key Barriers\n{{key_barriers}}\n\n### Technology Gaps\n{{technology_gaps}}\n\n### Process Challenges\n{{process_challenges}}",
                    "required": true
                },
                {
                    "id": "adoption_strategy",
                    "title": "Adoption Strategy and Recommendations",
                    "content": "## Adoption Strategy and Recommendations\n\n### Training Requirements\n{{training_requirements}}\n\n### Support Strategy\n{{support_strategy}}\n\n### Phased Rollout Plan\n{{phased_rollout}}",
                    "required": true
                },
                {
                    "id": "success_metrics",
                    "title": "Success Metrics and KPIs",
                    "content": "## Success Metrics and KPIs\n\n### Adoption Metrics\n{{adoption_metrics}}\n\n### Comfort Level Improvement\n{{comfort_improvement}}\n\n### Technology Utilization\n{{technology_utilization}}",
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
            },
            {
                "name": "executive_summary_details",
                "type": "text",
                "required": true,
                "description": "Detailed executive summary content"
            },
            {
                "name": "assessment_approach",
                "type": "text",
                "required": true,
                "description": "Assessment methodology and approach"
            },
            {
                "name": "evaluation_criteria",
                "type": "text",
                "required": true,
                "description": "Evaluation criteria for technology comfort assessment"
            },
            {
                "name": "data_sources",
                "type": "text",
                "required": true,
                "description": "Data sources used for assessment"
            },
            {
                "name": "technology_overview",
                "type": "text",
                "required": true,
                "description": "Overview of technology landscape"
            },
            {
                "name": "technology_comfort_table",
                "type": "text",
                "required": true,
                "description": "Detailed technology comfort analysis table (markdown format)"
            },
            {
                "name": "key_barriers",
                "type": "text",
                "required": true,
                "description": "Key adoption barriers and challenges"
            },
            {
                "name": "technology_gaps",
                "type": "text",
                "required": true,
                "description": "Technology gaps identified"
            },
            {
                "name": "process_challenges",
                "type": "text",
                "required": true,
                "description": "Process-related challenges"
            },
            {
                "name": "training_requirements",
                "type": "text",
                "required": true,
                "description": "Training requirements and recommendations"
            },
            {
                "name": "support_strategy",
                "type": "text",
                "required": true,
                "description": "Support strategy for user adoption"
            },
            {
                "name": "phased_rollout",
                "type": "text",
                "required": true,
                "description": "Phased rollout plan"
            },
            {
                "name": "adoption_metrics",
                "type": "text",
                "required": true,
                "description": "Adoption metrics and KPIs"
            },
            {
                "name": "comfort_improvement",
                "type": "text",
                "required": true,
                "description": "Comfort level improvement metrics"
            },
            {
                "name": "technology_utilization",
                "type": "text",
                "required": true,
                "description": "Technology utilization metrics"
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
                },
                {
                    "type": "user_preferences",
                    "source_id": "user_profiles",
                    "source_name": "User Technology Profiles",
                    "query": "SELECT * FROM user_preferences WHERE user_id = $1",
                    "parameters": {"user_id": "{{user_id}}"},
                    "enabled": true,
                    "weight": 0.8
                },
                {
                    "type": "document_history",
                    "source_id": "similar_assessments",
                    "source_name": "Similar Technology Assessments",
                    "query": "SELECT * FROM documents WHERE framework = $1 AND category = $2",
                    "parameters": {"framework": "Digital Transformation", "category": "User Adoption"},
                    "enabled": true,
                    "weight": 0.6
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
                },
                {
                    "stage_name": "Context Analysis",
                    "stage_type": "context_gathering",
                    "prompt_template": "Analyze project technology context: {{project_context}}. Review user technology profiles: {{user_profiles}}. Assess technology landscape: {{technology_landscape}}.",
                    "variables": ["project_context", "user_profiles", "technology_landscape"],
                    "order": 2,
                    "enabled": true
                },
                {
                    "stage_name": "Technology Comfort Assessment",
                    "stage_type": "ai_generation",
                    "prompt_template": "Generate comprehensive user personas technology comfort assessment in MARKDOWN format based on: {{context}}. Include detailed analysis of comfort levels, preferred tools, challenges, and adoption barriers. Use proper Markdown syntax with tables for persona analysis.",
                    "variables": ["context"],
                    "dependencies": ["Format Validation", "Context Analysis"],
                    "order": 3,
                    "enabled": true
                },
                {
                    "stage_name": "Adoption Strategy Development",
                    "stage_type": "ai_generation",
                    "prompt_template": "Develop comprehensive adoption strategy and recommendations based on technology comfort assessment. Present in MARKDOWN format with proper headers, tables, and action items. Include training requirements, support strategy, and success metrics.",
                    "variables": [],
                    "dependencies": ["Technology Comfort Assessment"],
                    "order": 4,
                    "enabled": true
                },
                {
                    "stage_name": "Final Validation",
                    "stage_type": "post_processing",
                    "prompt_template": "VALIDATE: Output must be pure MARKDOWN format. Check for: # headers, | tables, - lists, **bold**, *italic*. Remove any JSON structures or formatted data objects. Ensure the document is properly formatted for technology assessment and adoption planning.",
                    "variables": [],
                    "dependencies": ["Adoption Strategy Development"],
                    "order": 5,
                    "enabled": true
                }
            ],
            "final_format": "markdown",
            "include_metadata": false
        }'
    )
    ON CONFLICT (name) 
    DO UPDATE SET 
        system_prompt = EXCLUDED.system_prompt,
        prompt_build_up = EXCLUDED.prompt_build_up,
        updated_at = CURRENT_TIMESTAMP;

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
