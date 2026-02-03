-- Migration: Update User Personas Assess Motivation Template to Produce Markdown Output
-- Description: Updates the existing User Personas Assess Motivation template to ensure it generates Markdown format instead of JSON
-- Date: 2026-02-03
-- Version: 1.0.0

-- Update the User Personas Assess Motivation template to enforce Markdown output
UPDATE templates 
SET 
    system_prompt = 'You are an expert business analyst specializing in user persona analysis and motivation assessment. Your role is to create comprehensive user persona motivation assessments that are clear, actionable, and aligned with industry best practices.

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

    prompt_build_up = '{
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
                "stage_name": "Persona Analysis",
                "stage_type": "ai_generation",
                "prompt_template": "Generate comprehensive user persona motivation assessment in MARKDOWN format. Include: {{project_context}}, {{stakeholder_requirements}}, {{business_objectives}}. Use proper Markdown syntax throughout.",
                "variables": ["project_context", "stakeholder_requirements", "business_objectives"],
                "dependencies": ["Format Validation"],
                "order": 2,
                "enabled": true
            },
            {
                "stage_name": "Framework Alignment",
                "stage_type": "ai_generation",
                "prompt_template": "Enhance the persona analysis with PMBOK 7, BABOK, and ISO standards alignment. Present in MARKDOWN format with proper headers, tables, and lists. Include: {{framework_requirements}}.",
                "variables": ["framework_requirements"],
                "dependencies": ["Persona Analysis"],
                "order": 3,
                "enabled": true
            },
            {
                "stage_name": "Final Validation",
                "stage_type": "post_processing",
                "prompt_template": "VALIDATE: Output must be pure MARKDOWN format. Check for: # headers, | tables, - lists, **bold**, *italic*. Remove any JSON structures or formatted data objects. Ensure the document is executive-ready and properly formatted.",
                "variables": [],
                "dependencies": ["Framework Alignment"],
                "order": 4,
                "enabled": true
            }
        ],
        "final_format": "markdown",
        "include_metadata": false
    }'
WHERE name ILIKE '%personas%motivation%' OR name ILIKE '%motivation%personas%' OR name ILIKE '%User Personas%Motivation%';

-- Add a comment to track the update
COMMENT ON COLUMN templates.system_prompt IS 'Updated on 2026-02-03 to enforce Markdown output for User Personas templates';

-- Verify the update
SELECT 
    id,
    name,
    framework,
    category,
    'Updated' as status,
    LENGTH(system_prompt) as prompt_length
FROM templates 
WHERE name ILIKE '%personas%motivation%' OR name ILIKE '%motivation%personas%' OR name ILIKE '%User Personas%Motivation%';
