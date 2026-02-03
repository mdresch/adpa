-- Migration: Update User Personas Technology Comfort Template to Produce Markdown Output
-- Description: Updates the existing User Personas Technology Comfort template to ensure it generates Markdown format instead of JSON
-- Date: 2026-02-03
-- Version: 1.0.0

-- Update the User Personas Technology Comfort template to enforce Markdown output
UPDATE templates 
SET 
    system_prompt = 'You are an expert technology analyst specializing in user persona technology comfort assessments and digital adoption strategies. Your role is to create comprehensive technology comfort assessments that are clear, actionable, and aligned with modern digital transformation practices.

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
                "stage_name": "Technology Analysis",
                "stage_type": "ai_generation",
                "prompt_template": "Generate comprehensive user personas technology comfort assessment in MARKDOWN format. Include: {{project_context}}, {{user_profiles}}, {{technology_landscape}}. Use proper Markdown syntax with tables for persona analysis.",
                "variables": ["project_context", "user_profiles", "technology_landscape"],
                "dependencies": ["Format Validation"],
                "order": 2,
                "enabled": true
            },
            {
                "stage_name": "Adoption Strategy",
                "stage_type": "ai_generation",
                "prompt_template": "Enhance the technology comfort assessment with adoption strategies and training recommendations. Present in MARKDOWN format with proper headers, tables, and action items. Include: {{adoption_requirements}}.",
                "variables": ["adoption_requirements"],
                "dependencies": ["Technology Analysis"],
                "order": 3,
                "enabled": true
            },
            {
                "stage_name": "Final Validation",
                "stage_type": "post_processing",
                "prompt_template": "VALIDATE: Output must be pure MARKDOWN format. Check for: # headers, | tables, - lists, **bold**, *italic*. Remove any JSON structures or formatted data objects. Ensure the document is properly formatted for technology assessment.",
                "variables": [],
                "dependencies": ["Adoption Strategy"],
                "order": 4,
                "enabled": true
            }
        ],
        "final_format": "markdown",
        "include_metadata": false
    }'
WHERE name ILIKE '%personas%technology%comfort%' OR name ILIKE '%technology%comfort%personas%' OR name ILIKE '%User Personas%Technology%Comfort%';

-- Add a comment to track the update
COMMENT ON COLUMN templates.system_prompt IS 'Updated on 2026-02-03 to enforce Markdown output for User Personas Technology Comfort templates';

-- Verify the update
SELECT 
    id,
    name,
    framework,
    category,
    'Updated' as status,
    LENGTH(system_prompt) as prompt_length
FROM templates 
WHERE name ILIKE '%personas%technology%comfort%' OR name ILIKE '%technology%comfort%personas%' OR name ILIKE '%User Personas%Technology%Comfort%';
