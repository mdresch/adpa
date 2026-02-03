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

    -- Create or update the User Personas Motivation Assessment template
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'User Personas Motivation Assessment',
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
                },
                {
                    "id": "project_context",
                    "title": "Project Context and Strategic Objectives",
                    "content": "## Project Context and Strategic Objectives\n\n### Project Overview\n{{project_overview}}\n\n### Business Need and Value Proposition\n{{business_need}}\n\n### Strategic Project Objectives\n{{strategic_objectives}}",
                    "required": true
                },
                {
                    "id": "methodology",
                    "title": "Methodology and Framework Alignment",
                    "content": "## Methodology and Framework Alignment\n\n### Persona Identification Approach\n{{persona_identification}}\n\n### PMBOK 7 Principles and Performance Domains\n{{pmbok_alignment}}\n\n### BABOK Knowledge Areas for Motivation Assessment\n{{babok_alignment}}\n\n### ISO Standards Integration for Compliance-Driven Motivations\n{{iso_alignment}}",
                    "required": true
                },
                {
                    "id": "personas_assessment",
                    "title": "User Personas Motivation Assessment",
                    "content": "## User Personas Motivation Assessment\n\n### Introduction to Personas\n{{personas_introduction}}\n\n### Detailed Persona Analysis\n{{personas_detailed_analysis}}\n\n### Synthesized Insights and Implications\n{{synthesized_insights}}",
                    "required": true
                },
                {
                    "id": "integration",
                    "title": "Integration of Persona Insights into Project Delivery",
                    "content": "## Integration of Persona Insights into Project Delivery\n\n### Influencing Requirements and Solution Design\n{{requirements_influence}}\n\n### Guiding Stakeholder Engagement Strategies\n{{stakeholder_engagement}}\n\n### Informing Risk Management\n{{risk_management}}\n\n### Enhancing Quality Management and User Adoption\n{{quality_adoption}}",
                    "required": true
                },
                {
                    "id": "monitoring",
                    "title": "Performance Monitoring and Continuous Improvement",
                    "content": "## Performance Monitoring and Continuous Improvement\n\n### Key Performance Indicators (KPIs) for User Satisfaction and Adoption\n{{kpis_table}}\n\n### Impact on Business Benefits\n{{business_impact}}\n\n### Reporting and Review Cadence\n{{reporting_cadence}}",
                    "required": true
                },
                {
                    "id": "approval",
                    "title": "Approval and Endorsement",
                    "content": "## Approval and Endorsement\n\nThis User Personas Motivation Assessment document has been reviewed and approved by the key stakeholders to ensure alignment with project objectives, strategic direction, and organizational standards.\n\n{{approval_table}}",
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
            },
            {
                "name": "executive_summary_details",
                "type": "text",
                "required": true,
                "description": "Detailed executive summary content"
            },
            {
                "name": "project_overview",
                "type": "text",
                "required": true,
                "description": "Project overview and context"
            },
            {
                "name": "business_need",
                "type": "text",
                "required": true,
                "description": "Business need and value proposition"
            },
            {
                "name": "strategic_objectives",
                "type": "text",
                "required": true,
                "description": "Strategic project objectives (can include markdown table)"
            },
            {
                "name": "persona_identification",
                "type": "text",
                "required": true,
                "description": "Persona identification approach and methodology"
            },
            {
                "name": "pmbok_alignment",
                "type": "text",
                "required": true,
                "description": "PMBOK 7 principles and performance domains alignment"
            },
            {
                "name": "babok_alignment",
                "type": "text",
                "required": true,
                "description": "BABOK knowledge areas for motivation assessment"
            },
            {
                "name": "iso_alignment",
                "type": "text",
                "required": true,
                "description": "ISO standards integration for compliance-driven motivations"
            },
            {
                "name": "personas_introduction",
                "type": "text",
                "required": true,
                "description": "Introduction to personas section"
            },
            {
                "name": "personas_detailed_analysis",
                "type": "text",
                "required": true,
                "description": "Detailed persona analysis (can include markdown table)"
            },
            {
                "name": "synthesized_insights",
                "type": "text",
                "required": true,
                "description": "Synthesized insights and implications"
            },
            {
                "name": "requirements_influence",
                "type": "text",
                "required": true,
                "description": "How personas influence requirements and solution design"
            },
            {
                "name": "stakeholder_engagement",
                "type": "text",
                "required": true,
                "description": "Stakeholder engagement strategies (can include markdown table)"
            },
            {
                "name": "risk_management",
                "type": "text",
                "required": true,
                "description": "How persona insights inform risk management"
            },
            {
                "name": "quality_adoption",
                "type": "text",
                "required": true,
                "description": "Quality management and user adoption enhancement"
            },
            {
                "name": "kpis_table",
                "type": "text",
                "required": true,
                "description": "KPIs table for user satisfaction and adoption"
            },
            {
                "name": "business_impact",
                "type": "text",
                "required": true,
                "description": "Impact on business benefits"
            },
            {
                "name": "reporting_cadence",
                "type": "text",
                "required": true,
                "description": "Reporting and review cadence"
            },
            {
                "name": "approval_table",
                "type": "text",
                "required": true,
                "description": "Approval and endorsement table"
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
                },
                {
                    "type": "user_preferences",
                    "source_id": "user_profile",
                    "source_name": "User Preferences",
                    "query": "SELECT * FROM user_preferences WHERE user_id = $1",
                    "parameters": {"user_id": "{{user_id}}"},
                    "enabled": true,
                    "weight": 0.8
                },
                {
                    "type": "document_history",
                    "source_id": "similar_assessments",
                    "source_name": "Similar Persona Assessments",
                    "query": "SELECT * FROM documents WHERE framework = $1 AND category = $2",
                    "parameters": {"framework": "PMBOK 7", "category": "Stakeholder Management"},
                    "enabled": true,
                    "weight": 0.6
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
                },
                {
                    "stage_name": "Context Analysis",
                    "stage_type": "context_gathering",
                    "prompt_template": "Analyze project context: {{project_context}}. Review stakeholder requirements: {{stakeholder_requirements}}. Assess business objectives: {{business_objectives}}.",
                    "variables": ["project_context", "stakeholder_requirements", "business_objectives"],
                    "order": 2,
                    "enabled": true
                },
                {
                    "stage_name": "Persona Analysis Generation",
                    "stage_type": "ai_generation",
                    "prompt_template": "Generate comprehensive user persona motivation assessment in MARKDOWN format based on: {{context}}. Include detailed analysis of personas, their motivations, and alignment with PMBOK 7, BABOK, and ISO standards. Use proper Markdown syntax throughout.",
                    "variables": ["context"],
                    "dependencies": ["Format Validation", "Context Analysis"],
                    "order": 3,
                    "enabled": true
                },
                {
                    "stage_name": "Framework Integration",
                    "stage_type": "ai_generation",
                    "prompt_template": "Enhance the persona analysis with PMBOK 7 performance domains, BABOK knowledge areas, and ISO standards compliance. Present in MARKDOWN format with proper headers, tables, and lists.",
                    "variables": [],
                    "dependencies": ["Persona Analysis Generation"],
                    "order": 4,
                    "enabled": true
                },
                {
                    "stage_name": "Final Validation",
                    "stage_type": "post_processing",
                    "prompt_template": "VALIDATE: Output must be pure MARKDOWN format. Check for: # headers, | tables, - lists, **bold**, *italic*. Remove any JSON structures or formatted data objects. Ensure the document is executive-ready and properly formatted.",
                    "variables": [],
                    "dependencies": ["Framework Integration"],
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
WHERE name = 'User Personas Motivation Assessment'
ORDER BY name;
