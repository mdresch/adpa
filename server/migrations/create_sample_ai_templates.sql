-- Migration: Create Sample AI-Enhanced Templates
-- Description: Creates comprehensive sample templates demonstrating different AI enhancement levels
-- Date: 2024-01-XX
-- Version: 1.0.0

-- Get a system user ID for created_by field (use first available user or create a system user)
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'system@adpa.local',
    'ADPA System',
    'admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Get the system user ID
DO $$
DECLARE
    system_user_id UUID;
BEGIN
    SELECT id INTO system_user_id FROM users WHERE email = 'system@adpa.local' LIMIT 1;
    
    -- Sample Template 1: Basic AI Enhancement - Business Requirements Document
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'AI-Enhanced Business Requirements Template',
        'Advanced business requirements template with basic AI system prompt and context injection for BABOK v3 methodology',
        'BABOK v3',
        'Requirements',
        '{
            "sections": [
                {
                    "id": "executive_summary",
                    "title": "Executive Summary",
                    "content": "## Executive Summary\n\n{{executive_summary}}\n\n### Key Objectives\n{{#each key_objectives}}\n- {{this}}\n{{/each}}",
                    "required": true
                },
                {
                    "id": "business_context",
                    "title": "Business Context",
                    "content": "## Business Context\n\n### Business Need\n{{business_need}}\n\n### Business Value\n{{business_value}}\n\n### Success Criteria\n{{success_criteria}}",
                    "required": true
                },
                {
                    "id": "stakeholder_analysis",
                    "title": "Stakeholder Analysis",
                    "content": "## Stakeholder Analysis\n\n{{#each stakeholders}}\n### {{this.name}} ({{this.role}})\n- **Responsibilities**: {{this.responsibilities}}\n- **Interests**: {{this.interests}}\n- **Influence Level**: {{this.influence_level}}\n{{/each}}",
                    "required": true
                },
                {
                    "id": "functional_requirements",
                    "title": "Functional Requirements",
                    "content": "## Functional Requirements\n\n{{#each functional_requirements}}\n### REQ-{{@index}}\n**Description**: {{this.description}}\n**Priority**: {{this.priority}}\n**Acceptance Criteria**: {{this.acceptance_criteria}}\n{{/each}}",
                    "required": true
                },
                {
                    "id": "non_functional_requirements",
                    "title": "Non-Functional Requirements",
                    "content": "## Non-Functional Requirements\n\n### Performance\n{{performance_requirements}}\n\n### Security\n{{security_requirements}}\n\n### Usability\n{{usability_requirements}}",
                    "required": true
                },
                {
                    "id": "acceptance_criteria",
                    "title": "Acceptance Criteria",
                    "content": "## Acceptance Criteria\n\n{{acceptance_criteria}}\n\n### Testing Approach\n{{testing_approach}}",
                    "required": true
                }
            ],
            "metadata": {
                "version": "1.0",
                "last_updated": "2024-01-01",
                "author": "ADPA System",
                "methodology": "BABOK v3",
                "complexity": "intermediate"
            }
        }',
        '[
            {
                "name": "project_name",
                "type": "text",
                "required": true,
                "description": "Name of the project or initiative"
            },
            {
                "name": "executive_summary",
                "type": "text",
                "required": true,
                "description": "High-level summary of the business requirements"
            },
            {
                "name": "business_need",
                "type": "text",
                "required": true,
                "description": "Description of the business need driving this initiative"
            },
            {
                "name": "business_value",
                "type": "text",
                "required": true,
                "description": "Expected business value and benefits"
            },
            {
                "name": "stakeholders",
                "type": "text",
                "required": true,
                "description": "JSON array of stakeholder information"
            },
            {
                "name": "functional_requirements",
                "type": "text",
                "required": true,
                "description": "JSON array of functional requirements"
            },
            {
                "name": "acceptance_criteria",
                "type": "text",
                "required": true,
                "description": "Clear acceptance criteria for the requirements"
            }
        ]',
        true,
        system_user_id,
        'You are an expert business analyst specializing in BABOK v3 methodology. Your role is to help create comprehensive business requirements documents that are clear, actionable, and aligned with industry best practices. Focus on stakeholder needs, business value, and technical feasibility. Ensure all requirements are SMART (Specific, Measurable, Achievable, Relevant, Time-bound) and include proper traceability.',
        '{
            "enabled": true,
            "sources": [
                {
                    "type": "project_data",
                    "source_id": "current_project",
                    "source_name": "Current Project Context",
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
                    "source_id": "similar_documents",
                    "source_name": "Similar Documents",
                    "query": "SELECT * FROM documents WHERE framework = $1 AND category = $2",
                    "parameters": {"framework": "BABOK v3", "category": "Requirements"},
                    "enabled": true,
                    "weight": 0.6
                }
            ],
            "injection_strategy": "structured",
            "max_context_length": 4000,
            "context_priority": "high"
        }',
        '{
            "enabled": true,
            "stages": [
                {
                    "stage_name": "Context Gathering",
                    "stage_type": "context_gathering",
                    "prompt_template": "Gather project context: {{project_context}}. Analyze stakeholder requirements: {{stakeholder_requirements}}. Review business objectives: {{business_objectives}}.",
                    "variables": ["project_context", "stakeholder_requirements", "business_objectives"],
                    "order": 1,
                    "enabled": true
                },
                {
                    "stage_name": "Requirements Analysis",
                    "stage_type": "ai_generation",
                    "prompt_template": "Based on the context: {{context}}, generate comprehensive business requirements following BABOK v3 standards. Focus on: {{focus_areas}}.",
                    "variables": ["context", "focus_areas"],
                    "dependencies": ["Context Gathering"],
                    "order": 2,
                    "enabled": true
                },
                {
                    "stage_name": "Quality Assurance",
                    "stage_type": "post_processing",
                    "prompt_template": "Review the generated requirements for completeness, clarity, and BABOK v3 compliance. Ensure all requirements are SMART and properly structured.",
                    "variables": [],
                    "dependencies": ["Requirements Analysis"],
                    "order": 3,
                    "enabled": true
                }
            ],
            "final_format": "markdown",
            "include_metadata": true
        }'
    );

    -- Sample Template 2: Intermediate AI Enhancement - Project Charter
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'AI-Enhanced Project Charter Template',
        'Comprehensive project charter template with intermediate AI enhancements for PMBOK 7 methodology',
        'PMBOK 7',
        'Project Management',
        '{
            "sections": [
                {
                    "id": "project_overview",
                    "title": "Project Overview",
                    "content": "## Project Overview\n\n### Project Title\n{{project_title}}\n\n### Project Description\n{{project_description}}\n\n### Project Purpose\n{{project_purpose}}",
                    "required": true
                },
                {
                    "id": "business_case",
                    "title": "Business Case",
                    "content": "## Business Case\n\n### Business Need\n{{business_need}}\n\n### Expected Benefits\n{{expected_benefits}}\n\n### Success Metrics\n{{success_metrics}}",
                    "required": true
                },
                {
                    "id": "project_scope",
                    "title": "Project Scope",
                    "content": "## Project Scope\n\n### In Scope\n{{in_scope}}\n\n### Out of Scope\n{{out_of_scope}}\n\n### Assumptions\n{{assumptions}}\n\n### Constraints\n{{constraints}}",
                    "required": true
                },
                {
                    "id": "stakeholders",
                    "title": "Stakeholders",
                    "content": "## Stakeholders\n\n### Project Sponsor\n{{project_sponsor}}\n\n### Project Manager\n{{project_manager}}\n\n### Key Stakeholders\n{{#each key_stakeholders}}\n- **{{this.name}}**: {{this.role}} - {{this.responsibilities}}\n{{/each}}",
                    "required": true
                },
                {
                    "id": "timeline",
                    "title": "Timeline and Milestones",
                    "content": "## Timeline and Milestones\n\n### Project Duration\n{{project_duration}}\n\n### Key Milestones\n{{#each milestones}}\n- **{{this.name}}**: {{this.date}} - {{this.description}}\n{{/each}}",
                    "required": true
                },
                {
                    "id": "budget",
                    "title": "Budget and Resources",
                    "content": "## Budget and Resources\n\n### Budget Estimate\n{{budget_estimate}}\n\n### Resource Requirements\n{{resource_requirements}}\n\n### Risk Budget\n{{risk_budget}}",
                    "required": true
                }
            ],
            "metadata": {
                "version": "1.0",
                "last_updated": "2024-01-01",
                "author": "ADPA System",
                "methodology": "PMBOK 7",
                "complexity": "intermediate"
            }
        }',
        '[
            {
                "name": "project_title",
                "type": "text",
                "required": true,
                "description": "Official project title"
            },
            {
                "name": "project_description",
                "type": "text",
                "required": true,
                "description": "Detailed project description"
            },
            {
                "name": "business_need",
                "type": "text",
                "required": true,
                "description": "Business need driving the project"
            },
            {
                "name": "expected_benefits",
                "type": "text",
                "required": true,
                "description": "Expected benefits and value"
            },
            {
                "name": "project_sponsor",
                "type": "text",
                "required": true,
                "description": "Project sponsor information"
            },
            {
                "name": "project_manager",
                "type": "text",
                "required": true,
                "description": "Project manager information"
            },
            {
                "name": "budget_estimate",
                "type": "text",
                "required": true,
                "description": "Budget estimate and breakdown"
            }
        ]',
        true,
        system_user_id,
        'You are a senior project management expert specializing in PMBOK 7 methodology. Your expertise includes project charter development, stakeholder management, and project planning. Create comprehensive project charters that align with PMBOK 7 principles, ensuring clear project definition, stakeholder alignment, and realistic scope and timeline planning. Focus on value delivery and adaptive project management approaches.',
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
                    "source_name": "User Profile",
                    "query": "SELECT * FROM user_preferences WHERE user_id = $1",
                    "parameters": {"user_id": "{{user_id}}"},
                    "enabled": true,
                    "weight": 0.7
                },
                {
                    "type": "document_history",
                    "source_id": "similar_charters",
                    "source_name": "Similar Project Charters",
                    "query": "SELECT * FROM documents WHERE framework = $1 AND category = $2",
                    "parameters": {"framework": "PMBOK 7", "category": "Project Management"},
                    "enabled": true,
                    "weight": 0.5
                },
                {
                    "type": "external_api",
                    "source_id": "pm_best_practices",
                    "source_name": "PM Best Practices",
                    "query": "api/best-practices/project-charter",
                    "parameters": {"methodology": "PMBOK 7"},
                    "enabled": true,
                    "weight": 0.8
                }
            ],
            "injection_strategy": "interleave",
            "max_context_length": 5000,
            "context_priority": "high"
        }',
        '{
            "enabled": true,
            "stages": [
                {
                    "stage_name": "Project Context Analysis",
                    "stage_type": "context_gathering",
                    "prompt_template": "Analyze project context: {{project_context}}. Review stakeholder requirements: {{stakeholder_requirements}}. Assess business objectives: {{business_objectives}}.",
                    "variables": ["project_context", "stakeholder_requirements", "business_objectives"],
                    "order": 1,
                    "enabled": true
                },
                {
                    "stage_name": "Charter Generation",
                    "stage_type": "ai_generation",
                    "prompt_template": "Generate comprehensive project charter based on: {{context}}. Follow PMBOK 7 methodology and include: {{required_sections}}.",
                    "variables": ["context", "required_sections"],
                    "dependencies": ["Project Context Analysis"],
                    "order": 2,
                    "enabled": true
                },
                {
                    "stage_name": "Stakeholder Validation",
                    "stage_type": "ai_generation",
                    "prompt_template": "Validate charter sections for stakeholder alignment: {{charter_content}}. Ensure clarity and completeness: {{validation_criteria}}.",
                    "variables": ["charter_content", "validation_criteria"],
                    "dependencies": ["Charter Generation"],
                    "order": 3,
                    "enabled": true
                },
                {
                    "stage_name": "Quality Review",
                    "stage_type": "post_processing",
                    "prompt_template": "Review charter for PMBOK 7 compliance and quality standards: {{charter}}. Apply final formatting and validation.",
                    "variables": ["charter"],
                    "dependencies": ["Stakeholder Validation"],
                    "order": 4,
                    "enabled": true
                }
            ],
            "final_format": "markdown",
            "include_metadata": true
        }'
    );

    -- Sample Template 3: Advanced AI Enhancement - Data Governance Framework
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'AI-Enhanced Data Governance Framework Template',
        'Comprehensive data governance framework template with advanced AI enhancements for DMBOK 2.0 methodology',
        'DMBOK 2.0',
        'Data Management',
        '{
            "sections": [
                {
                    "id": "governance_overview",
                    "title": "Data Governance Overview",
                    "content": "## Data Governance Overview\n\n### Purpose\n{{governance_purpose}}\n\n### Scope\n{{governance_scope}}\n\n### Objectives\n{{governance_objectives}}",
                    "required": true
                },
                {
                    "id": "governance_structure",
                    "title": "Governance Structure",
                    "content": "## Governance Structure\n\n### Governance Council\n{{governance_council}}\n\n### Roles and Responsibilities\n{{#each roles}}\n#### {{this.title}}\n- **Purpose**: {{this.purpose}}\n- **Responsibilities**: {{this.responsibilities}}\n- **Accountability**: {{this.accountability}}\n{{/each}}",
                    "required": true
                },
                {
                    "id": "policies_standards",
                    "title": "Policies and Standards",
                    "content": "## Policies and Standards\n\n### Data Policies\n{{data_policies}}\n\n### Data Standards\n{{data_standards}}\n\n### Quality Standards\n{{quality_standards}}",
                    "required": true
                },
                {
                    "id": "data_lifecycle",
                    "title": "Data Lifecycle Management",
                    "content": "## Data Lifecycle Management\n\n### Data Classification\n{{data_classification}}\n\n### Data Retention\n{{data_retention}}\n\n### Data Disposal\n{{data_disposal}}",
                    "required": true
                },
                {
                    "id": "monitoring_compliance",
                    "title": "Monitoring and Compliance",
                    "content": "## Monitoring and Compliance\n\n### Key Metrics\n{{key_metrics}}\n\n### Compliance Framework\n{{compliance_framework}}\n\n### Audit Process\n{{audit_process}}",
                    "required": true
                },
                {
                    "id": "implementation_plan",
                    "title": "Implementation Plan",
                    "content": "## Implementation Plan\n\n### Phase 1: Foundation\n{{phase1_foundation}}\n\n### Phase 2: Rollout\n{{phase2_rollout}}\n\n### Phase 3: Optimization\n{{phase3_optimization}}",
                    "required": true
                }
            ],
            "metadata": {
                "version": "1.0",
                "last_updated": "2024-01-01",
                "author": "ADPA System",
                "methodology": "DMBOK 2.0",
                "complexity": "advanced"
            }
        }',
        '[
            {
                "name": "organization_name",
                "type": "text",
                "required": true,
                "description": "Name of the organization"
            },
            {
                "name": "governance_purpose",
                "type": "text",
                "required": true,
                "description": "Purpose of the data governance framework"
            },
            {
                "name": "governance_scope",
                "type": "text",
                "required": true,
                "description": "Scope of data governance"
            },
            {
                "name": "data_policies",
                "type": "text",
                "required": true,
                "description": "Data governance policies"
            },
            {
                "name": "data_standards",
                "type": "text",
                "required": true,
                "description": "Data standards and guidelines"
            },
            {
                "name": "compliance_requirements",
                "type": "text",
                "required": true,
                "description": "Regulatory and compliance requirements"
            },
            {
                "name": "implementation_timeline",
                "type": "text",
                "required": true,
                "description": "Implementation timeline and milestones"
            }
        ]',
        true,
        system_user_id,
        'You are a senior data governance expert specializing in DMBOK 2.0 methodology. Your expertise includes data governance framework development, regulatory compliance, and data quality management. Create comprehensive data governance frameworks that align with DMBOK 2.0 principles, ensuring regulatory compliance, data quality, and organizational alignment. Focus on practical implementation, stakeholder engagement, and measurable outcomes.',
        '{
            "enabled": true,
            "sources": [
                {
                    "type": "project_data",
                    "source_id": "organization_context",
                    "source_name": "Organization Context",
                    "query": "SELECT * FROM organizations WHERE id = $1",
                    "parameters": {"organization_id": "{{organization_id}}"},
                    "enabled": true,
                    "weight": 1.0
                },
                {
                    "type": "user_preferences",
                    "source_id": "user_expertise",
                    "source_name": "User Expertise Profile",
                    "query": "SELECT * FROM user_expertise WHERE user_id = $1 AND domain = $2",
                    "parameters": {"user_id": "{{user_id}}", "domain": "data_governance"},
                    "enabled": true,
                    "weight": 0.9
                },
                {
                    "type": "document_history",
                    "source_id": "similar_frameworks",
                    "source_name": "Similar Governance Frameworks",
                    "query": "SELECT * FROM documents WHERE framework = $1 AND category = $2",
                    "parameters": {"framework": "DMBOK 2.0", "category": "Data Management"},
                    "enabled": true,
                    "weight": 0.7
                },
                {
                    "type": "external_api",
                    "source_id": "regulatory_requirements",
                    "source_name": "Regulatory Requirements",
                    "query": "api/regulatory/requirements",
                    "parameters": {"jurisdiction": "{{jurisdiction}}", "industry": "{{industry}}"},
                    "enabled": true,
                    "weight": 0.8
                },
                {
                    "type": "database_query",
                    "source_id": "data_assets",
                    "source_name": "Data Assets Inventory",
                    "query": "SELECT * FROM data_assets WHERE organization_id = $1",
                    "parameters": {"organization_id": "{{organization_id}}"},
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
                    "stage_name": "Context Analysis",
                    "stage_type": "context_gathering",
                    "prompt_template": "Analyze organization context: {{org_context}}. Review regulatory requirements: {{regulatory_reqs}}. Assess data landscape: {{data_landscape}}.",
                    "variables": ["org_context", "regulatory_reqs", "data_landscape"],
                    "order": 1,
                    "enabled": true
                },
                {
                    "stage_name": "Framework Design",
                    "stage_type": "ai_generation",
                    "prompt_template": "Design data governance framework based on: {{context}}. Follow DMBOK 2.0 methodology and include: {{framework_components}}.",
                    "variables": ["context", "framework_components"],
                    "dependencies": ["Context Analysis"],
                    "order": 2,
                    "enabled": true
                },
                {
                    "stage_name": "Policy Development",
                    "stage_type": "ai_generation",
                    "prompt_template": "Develop comprehensive policies and standards: {{framework}}. Ensure regulatory compliance: {{compliance_requirements}}.",
                    "variables": ["framework", "compliance_requirements"],
                    "dependencies": ["Framework Design"],
                    "order": 3,
                    "enabled": true
                },
                {
                    "stage_name": "Implementation Planning",
                    "stage_type": "ai_generation",
                    "prompt_template": "Create implementation plan for: {{governance_framework}}. Include change management: {{change_management}}.",
                    "variables": ["governance_framework", "change_management"],
                    "dependencies": ["Policy Development"],
                    "order": 4,
                    "enabled": true
                },
                {
                    "stage_name": "Quality Assurance",
                    "stage_type": "post_processing",
                    "prompt_template": "Review governance framework for DMBOK 2.0 compliance: {{framework}}. Apply quality standards and validation.",
                    "variables": ["framework"],
                    "dependencies": ["Implementation Planning"],
                    "order": 5,
                    "enabled": true
                },
                {
                    "stage_name": "Stakeholder Review",
                    "stage_type": "post_processing",
                    "prompt_template": "Prepare framework for stakeholder review: {{final_framework}}. Include executive summary and implementation roadmap.",
                    "variables": ["final_framework"],
                    "dependencies": ["Quality Assurance"],
                    "order": 6,
                    "enabled": true
                }
            ],
            "final_format": "markdown",
            "include_metadata": true
        }'
    );

    -- Sample Template 4: Basic Enhancement - Risk Assessment
    INSERT INTO templates (
        id, name, description, framework, category, content, variables, 
        is_public, created_by, system_prompt, context_injection_config, prompt_build_up
    ) VALUES (
        gen_random_uuid(),
        'AI-Enhanced Risk Assessment Template',
        'Basic risk assessment template with AI system prompt for general risk management',
        'Custom',
        'Risk Management',
        '{
            "sections": [
                {
                    "id": "risk_overview",
                    "title": "Risk Assessment Overview",
                    "content": "## Risk Assessment Overview\n\n### Assessment Scope\n{{assessment_scope}}\n\n### Assessment Date\n{{assessment_date}}\n\n### Assessor\n{{assessor}}",
                    "required": true
                },
                {
                    "id": "identified_risks",
                    "title": "Identified Risks",
                    "content": "## Identified Risks\n\n{{#each risks}}\n### {{this.risk_name}}\n- **Description**: {{this.description}}\n- **Category**: {{this.category}}\n- **Impact**: {{this.impact}}\n- **Probability**: {{this.probability}}\n- **Risk Level**: {{this.risk_level}}\n{{/each}}",
                    "required": true
                },
                {
                    "id": "risk_mitigation",
                    "title": "Risk Mitigation",
                    "content": "## Risk Mitigation\n\n{{#each mitigation_plans}}\n### {{this.risk_name}}\n- **Mitigation Strategy**: {{this.strategy}}\n- **Responsible Party**: {{this.responsible}}\n- **Timeline**: {{this.timeline}}\n- **Cost**: {{this.cost}}\n{{/each}}",
                    "required": true
                }
            ],
            "metadata": {
                "version": "1.0",
                "last_updated": "2024-01-01",
                "author": "ADPA System",
                "methodology": "Custom",
                "complexity": "basic"
            }
        }',
        '[
            {
                "name": "assessment_scope",
                "type": "text",
                "required": true,
                "description": "Scope of the risk assessment"
            },
            {
                "name": "risks",
                "type": "text",
                "required": true,
                "description": "JSON array of identified risks"
            },
            {
                "name": "mitigation_plans",
                "type": "text",
                "required": true,
                "description": "JSON array of mitigation plans"
            }
        ]',
        true,
        system_user_id,
        'You are a risk management expert with extensive experience in identifying, assessing, and mitigating risks across various industries. Your role is to help create comprehensive risk assessments that are thorough, actionable, and aligned with industry best practices. Focus on realistic risk identification, accurate impact and probability assessment, and practical mitigation strategies.',
        '{
            "enabled": false,
            "sources": [],
            "injection_strategy": "prepend",
            "max_context_length": 2000,
            "context_priority": "medium"
        }',
        '{
            "enabled": false,
            "stages": [],
            "final_format": "markdown",
            "include_metadata": true
        }'
    );

END $$;

-- Verify the sample templates were created
SELECT 
    id,
    name,
    framework,
    category,
    CASE 
        WHEN system_prompt IS NOT NULL AND system_prompt != '' THEN 'Yes' 
        ELSE 'No' 
    END as has_system_prompt,
    CASE 
        WHEN context_injection_config->>'enabled' = 'true' THEN 'Yes' 
        ELSE 'No' 
    END as context_injection_enabled,
    CASE 
        WHEN prompt_build_up->>'enabled' = 'true' THEN 'Yes' 
        ELSE 'No' 
    END as prompt_build_up_enabled,
    jsonb_array_length(context_injection_config->'sources') as context_sources_count,
    jsonb_array_length(prompt_build_up->'stages') as prompt_stages_count
FROM templates 
WHERE name LIKE '%AI-Enhanced%'
ORDER BY name;
