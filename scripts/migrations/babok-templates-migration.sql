-- BABOK Knowledge Areas Templates Migration
-- Creates templates for all 6 BABOK knowledge areas with their key deliverables

-- ============================================================================
-- BABOK KNOWLEDGE AREA 1: BUSINESS ANALYSIS PLANNING AND MONITORING
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Business Analysis Planning and Monitoring Plan',
    'Comprehensive business analysis planning and monitoring plan covering BA approach, stakeholder engagement, governance, and performance monitoring',
    'BABOK',
    'Business Analysis Planning and Monitoring',
    '{
        "sections": [
            {
                "id": "ba_planning_overview",
                "title": "Business Analysis Planning Overview",
                "content": "## Business Analysis Planning Overview\n\nThis plan defines how business analysis activities will be planned, monitored, and controlled throughout the initiative lifecycle.\n\n### Initiative Information\n**Initiative Name**: {{initiative_name}}\n**Business Analyst**: {{business_analyst}}\n**Business Analysis Approach**: {{ba_approach}}\n**Initiative Start Date**: {{initiative_start_date}}\n**Initiative End Date**: {{initiative_end_date}}\n\n### Business Analysis Objectives\n{{#each ba_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "ba_approach",
                "title": "Business Analysis Approach",
                "content": "## Business Analysis Approach\n\n### Methodology Selection\n{{methodology_selection}}\n\n### Analysis Techniques\n{{#each analysis_techniques}}\n- {{this}}\n{{/each}}\n\n### Deliverable Standards\n{{deliverable_standards}}\n\n### Quality Assurance Process\n{{quality_assurance_process}}\n\n### Change Management Process\n{{change_management_process}}",
                "required": true
            },
            {
                "id": "stakeholder_engagement",
                "title": "Stakeholder Engagement",
                "content": "## Stakeholder Engagement\n\n### Stakeholder Analysis\n{{#each stakeholders}}\n**{{this.name}}** ({{this.role}})\n- Organization: {{this.organization}}\n- Influence Level: {{this.influence_level}}\n- Interest Level: {{this.interest_level}}\n- Engagement Approach: {{this.engagement_approach}}\n- Communication Preferences: {{this.communication_preferences}}\n- Availability: {{this.availability}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "governance",
                "title": "Governance",
                "content": "## Governance\n\n### Decision-Making Process\n{{decision_making_process}}\n\n### Approval Authority\n{{#each approval_authorities}}\n- **{{this.decision_type}}**: {{this.authority}} ({{this.process}})\n{{/each}}\n\n### Review and Sign-off Process\n{{review_signoff_process}}\n\n### Escalation Procedures\n{{escalation_procedures}}",
                "required": true
            },
            {
                "id": "performance_monitoring",
                "title": "Performance Monitoring",
                "content": "## Performance Monitoring\n\n### Key Performance Indicators\n{{#each kpis}}\n- **{{this.metric}}**: {{this.target}} ({{this.measurement_method}})\n{{/each}}\n\n### Progress Reporting\n{{progress_reporting}}\n\n### Quality Metrics\n{{#each quality_metrics}}\n- {{this}}\n{{/each}}\n\n### Risk Monitoring\n{{risk_monitoring}}",
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
            "name": "initiative_name",
            "type": "text",
            "required": true,
            "description": "Name of the business analysis initiative"
        },
        {
            "name": "business_analyst",
            "type": "text",
            "required": true,
            "description": "Name of the lead business analyst"
        },
        {
            "name": "ba_approach",
            "type": "text",
            "required": true,
            "description": "Business analysis approach and methodology"
        },
        {
            "name": "initiative_start_date",
            "type": "date",
            "required": true,
            "description": "Initiative start date"
        },
        {
            "name": "initiative_end_date",
            "type": "date",
            "required": true,
            "description": "Initiative end date"
        },
        {
            "name": "ba_objectives",
            "type": "array",
            "required": true,
            "description": "Business analysis objectives"
        },
        {
            "name": "methodology_selection",
            "type": "text",
            "required": true,
            "description": "Selected methodology and rationale"
        },
        {
            "name": "analysis_techniques",
            "type": "array",
            "required": true,
            "description": "Analysis techniques to be used"
        },
        {
            "name": "deliverable_standards",
            "type": "text",
            "required": true,
            "description": "Deliverable standards and templates"
        },
        {
            "name": "quality_assurance_process",
            "type": "text",
            "required": true,
            "description": "Quality assurance process"
        },
        {
            "name": "change_management_process",
            "type": "text",
            "required": true,
            "description": "Change management process"
        },
        {
            "name": "stakeholders",
            "type": "array",
            "required": true,
            "description": "Stakeholder information"
        },
        {
            "name": "decision_making_process",
            "type": "text",
            "required": true,
            "description": "Decision-making process"
        },
        {
            "name": "approval_authorities",
            "type": "array",
            "required": true,
            "description": "Approval authorities and processes"
        },
        {
            "name": "review_signoff_process",
            "type": "text",
            "required": true,
            "description": "Review and sign-off process"
        },
        {
            "name": "escalation_procedures",
            "type": "text",
            "required": true,
            "description": "Escalation procedures"
        },
        {
            "name": "kpis",
            "type": "array",
            "required": true,
            "description": "Key performance indicators"
        },
        {
            "name": "progress_reporting",
            "type": "text",
            "required": true,
            "description": "Progress reporting process"
        },
        {
            "name": "quality_metrics",
            "type": "array",
            "required": true,
            "description": "Quality metrics"
        },
        {
            "name": "risk_monitoring",
            "type": "text",
            "required": true,
            "description": "Risk monitoring process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- BABOK KNOWLEDGE AREA 2: ELICITATION AND COLLABORATION
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Elicitation and Collaboration Plan',
    'Comprehensive elicitation and collaboration plan covering requirements elicitation, stakeholder collaboration, and communication management',
    'BABOK',
    'Elicitation and Collaboration',
    '{
        "sections": [
            {
                "id": "elicitation_overview",
                "title": "Elicitation Overview",
                "content": "## Elicitation Overview\n\nThis plan defines how requirements and other business analysis information will be elicited and how collaboration with stakeholders will be managed.\n\n### Initiative Information\n**Initiative Name**: {{initiative_name}}\n**Business Analyst**: {{business_analyst}}\n**Elicitation Approach**: {{elicitation_approach}}\n\n### Elicitation Objectives\n{{#each elicitation_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "elicitation_techniques",
                "title": "Elicitation Techniques",
                "content": "## Elicitation Techniques\n\n### Selected Techniques\n{{#each elicitation_techniques}}\n**{{this.technique}}**\n- Purpose: {{this.purpose}}\n- Participants: {{this.participants}}\n- Duration: {{this.duration}}\n- Preparation: {{this.preparation}}\n- Expected Outcomes: {{this.expected_outcomes}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "stakeholder_collaboration",
                "title": "Stakeholder Collaboration",
                "content": "## Stakeholder Collaboration\n\n### Collaboration Approach\n{{collaboration_approach}}\n\n### Stakeholder Groups\n{{#each stakeholder_groups}}\n**{{this.group_name}}**\n- Members: {{this.members}}\n- Collaboration Method: {{this.collaboration_method}}\n- Frequency: {{this.frequency}}\n- Key Topics: {{this.key_topics}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "communication_management",
                "title": "Communication Management",
                "content": "## Communication Management\n\n### Communication Plan\n{{#each communication_activities}}\n**{{this.activity}}**\n- Audience: {{this.audience}}\n- Method: {{this.method}}\n- Frequency: {{this.frequency}}\n- Owner: {{this.owner}}\n- Purpose: {{this.purpose}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "elicitation_sessions",
                "title": "Elicitation Sessions",
                "content": "## Elicitation Sessions\n\n### Session Schedule\n{{#each elicitation_sessions}}\n**{{this.session_name}}**\n- Date: {{this.date}}\n- Duration: {{this.duration}}\n- Participants: {{this.participants}}\n- Technique: {{this.technique}}\n- Objectives: {{this.objectives}}\n- Deliverables: {{this.deliverables}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "documentation_standards",
                "title": "Documentation Standards",
                "content": "## Documentation Standards\n\n### Documentation Approach\n{{documentation_approach}}\n\n### Templates and Standards\n{{#each documentation_templates}}\n- {{this}}\n{{/each}}\n\n### Review and Approval Process\n{{review_approval_process}}\n\n### Version Control\n{{version_control}}",
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
            "name": "initiative_name",
            "type": "text",
            "required": true,
            "description": "Name of the business analysis initiative"
        },
        {
            "name": "business_analyst",
            "type": "text",
            "required": true,
            "description": "Name of the lead business analyst"
        },
        {
            "name": "elicitation_approach",
            "type": "text",
            "required": true,
            "description": "Overall elicitation approach"
        },
        {
            "name": "elicitation_objectives",
            "type": "array",
            "required": true,
            "description": "Elicitation objectives"
        },
        {
            "name": "elicitation_techniques",
            "type": "array",
            "required": true,
            "description": "Selected elicitation techniques"
        },
        {
            "name": "collaboration_approach",
            "type": "text",
            "required": true,
            "description": "Stakeholder collaboration approach"
        },
        {
            "name": "stakeholder_groups",
            "type": "array",
            "required": true,
            "description": "Stakeholder groups and collaboration methods"
        },
        {
            "name": "communication_activities",
            "type": "array",
            "required": true,
            "description": "Communication activities and plan"
        },
        {
            "name": "elicitation_sessions",
            "type": "array",
            "required": true,
            "description": "Planned elicitation sessions"
        },
        {
            "name": "documentation_approach",
            "type": "text",
            "required": true,
            "description": "Documentation approach"
        },
        {
            "name": "documentation_templates",
            "type": "array",
            "required": true,
            "description": "Documentation templates and standards"
        },
        {
            "name": "review_approval_process",
            "type": "text",
            "required": true,
            "description": "Review and approval process"
        },
        {
            "name": "version_control",
            "type": "text",
            "required": true,
            "description": "Version control process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- BABOK KNOWLEDGE AREA 3: REQUIREMENTS LIFE CYCLE MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Requirements Life Cycle Management Plan',
    'Comprehensive requirements life cycle management plan covering requirements traceability, maintenance, prioritization, and change management',
    'BABOK',
    'Requirements Life Cycle Management',
    '{
        "sections": [
            {
                "id": "rlc_overview",
                "title": "Requirements Life Cycle Overview",
                "content": "## Requirements Life Cycle Overview\n\nThis plan defines how requirements will be managed throughout their life cycle from initial identification through final implementation and retirement.\n\n### Initiative Information\n**Initiative Name**: {{initiative_name}}\n**Business Analyst**: {{business_analyst}}\n**Requirements Management Approach**: {{requirements_management_approach}}\n\n### Life Cycle Objectives\n{{#each lifecycle_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "requirements_traceability",
                "title": "Requirements Traceability",
                "content": "## Requirements Traceability\n\n### Traceability Approach\n{{traceability_approach}}\n\n### Traceability Matrix\n{{#each traceability_relationships}}\n**{{this.source_requirement}}** → **{{this.target_requirement}}**\n- Relationship Type: {{this.relationship_type}}\n- Rationale: {{this.rationale}}\n- Status: {{this.status}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "requirements_maintenance",
                "title": "Requirements Maintenance",
                "content": "## Requirements Maintenance\n\n### Maintenance Process\n{{maintenance_process}}\n\n### Change Control Process\n{{change_control_process}}\n\n### Impact Analysis Process\n{{impact_analysis_process}}\n\n### Approval Process\n{{approval_process}}",
                "required": true
            },
            {
                "id": "requirements_prioritization",
                "title": "Requirements Prioritization",
                "content": "## Requirements Prioritization\n\n### Prioritization Approach\n{{prioritization_approach}}\n\n### Prioritization Criteria\n{{#each prioritization_criteria}}\n- {{this}}\n{{/each}}\n\n### Prioritized Requirements\n{{#each prioritized_requirements}}\n**{{this.requirement_id}} - {{this.requirement_name}}**\n- Priority: {{this.priority}}\n- Business Value: {{this.business_value}}\n- Effort: {{this.effort}}\n- Risk: {{this.risk}}\n- Dependencies: {{this.dependencies}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "requirements_approval",
                "title": "Requirements Approval",
                "content": "## Requirements Approval\n\n### Approval Process\n{{approval_process}}\n\n### Approval Authorities\n{{#each approval_authorities}}\n- **{{this.requirement_type}}**: {{this.authority}} ({{this.process}})\n{{/each}}\n\n### Sign-off Requirements\n{{signoff_requirements}}\n\n### Approval Tracking\n{{approval_tracking}}",
                "required": true
            },
            {
                "id": "requirements_validation",
                "title": "Requirements Validation",
                "content": "## Requirements Validation\n\n### Validation Approach\n{{validation_approach}}\n\n### Validation Techniques\n{{#each validation_techniques}}\n- {{this}}\n{{/each}}\n\n### Validation Criteria\n{{#each validation_criteria}}\n- {{this}}\n{{/each}}\n\n### Validation Schedule\n{{validation_schedule}}",
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
            "name": "initiative_name",
            "type": "text",
            "required": true,
            "description": "Name of the business analysis initiative"
        },
        {
            "name": "business_analyst",
            "type": "text",
            "required": true,
            "description": "Name of the lead business analyst"
        },
        {
            "name": "requirements_management_approach",
            "type": "text",
            "required": true,
            "description": "Requirements management approach"
        },
        {
            "name": "lifecycle_objectives",
            "type": "array",
            "required": true,
            "description": "Requirements life cycle objectives"
        },
        {
            "name": "traceability_approach",
            "type": "text",
            "required": true,
            "description": "Requirements traceability approach"
        },
        {
            "name": "traceability_relationships",
            "type": "array",
            "required": true,
            "description": "Traceability relationships"
        },
        {
            "name": "maintenance_process",
            "type": "text",
            "required": true,
            "description": "Requirements maintenance process"
        },
        {
            "name": "change_control_process",
            "type": "text",
            "required": true,
            "description": "Change control process"
        },
        {
            "name": "impact_analysis_process",
            "type": "text",
            "required": true,
            "description": "Impact analysis process"
        },
        {
            "name": "approval_process",
            "type": "text",
            "required": true,
            "description": "Approval process"
        },
        {
            "name": "prioritization_approach",
            "type": "text",
            "required": true,
            "description": "Requirements prioritization approach"
        },
        {
            "name": "prioritization_criteria",
            "type": "array",
            "required": true,
            "description": "Prioritization criteria"
        },
        {
            "name": "prioritized_requirements",
            "type": "array",
            "required": true,
            "description": "Prioritized requirements list"
        },
        {
            "name": "approval_authorities",
            "type": "array",
            "required": true,
            "description": "Approval authorities by requirement type"
        },
        {
            "name": "signoff_requirements",
            "type": "text",
            "required": true,
            "description": "Sign-off requirements"
        },
        {
            "name": "approval_tracking",
            "type": "text",
            "required": true,
            "description": "Approval tracking process"
        },
        {
            "name": "validation_approach",
            "type": "text",
            "required": true,
            "description": "Requirements validation approach"
        },
        {
            "name": "validation_techniques",
            "type": "array",
            "required": true,
            "description": "Validation techniques"
        },
        {
            "name": "validation_criteria",
            "type": "array",
            "required": true,
            "description": "Validation criteria"
        },
        {
            "name": "validation_schedule",
            "type": "text",
            "required": true,
            "description": "Validation schedule"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- BABOK KNOWLEDGE AREA 4: STRATEGY ANALYSIS
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Strategy Analysis Plan',
    'Comprehensive strategy analysis plan covering current state analysis, future state definition, and change strategy development',
    'BABOK',
    'Strategy Analysis',
    '{
        "sections": [
            {
                "id": "strategy_overview",
                "title": "Strategy Analysis Overview",
                "content": "## Strategy Analysis Overview\n\nThis plan defines how strategic analysis will be conducted to understand the current state, define the future state, and develop a change strategy.\n\n### Initiative Information\n**Initiative Name**: {{initiative_name}}\n**Business Analyst**: {{business_analyst}}\n**Strategic Analysis Approach**: {{strategic_analysis_approach}}\n\n### Strategic Objectives\n{{#each strategic_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "current_state_analysis",
                "title": "Current State Analysis",
                "content": "## Current State Analysis\n\n### Analysis Approach\n{{current_state_approach}}\n\n### Business Capabilities Assessment\n{{#each business_capabilities}}\n**{{this.capability_name}}**\n- Current Maturity: {{this.current_maturity}}\n- Performance Level: {{this.performance_level}}\n- Gaps: {{this.gaps}}\n- Strengths: {{this.strengths}}\n- Weaknesses: {{this.weaknesses}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "future_state_definition",
                "title": "Future State Definition",
                "content": "## Future State Definition\n\n### Vision Statement\n{{vision_statement}}\n\n### Future State Capabilities\n{{#each future_capabilities}}\n**{{this.capability_name}}**\n- Target Maturity: {{this.target_maturity}}\n- Expected Performance: {{this.expected_performance}}\n- Key Features: {{this.key_features}}\n- Success Criteria: {{this.success_criteria}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "gap_analysis",
                "title": "Gap Analysis",
                "content": "## Gap Analysis\n\n### Gap Identification\n{{#each identified_gaps}}\n**{{this.gap_name}}**\n- Current State: {{this.current_state}}\n- Future State: {{this.future_state}}\n- Gap Description: {{this.gap_description}}\n- Impact: {{this.impact}}\n- Priority: {{this.priority}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "change_strategy",
                "title": "Change Strategy",
                "content": "## Change Strategy\n\n### Change Approach\n{{change_approach}}\n\n### Implementation Strategy\n{{implementation_strategy}}\n\n### Change Initiatives\n{{#each change_initiatives}}\n**{{this.initiative_name}}**\n- Description: {{this.description}}\n- Scope: {{this.scope}}\n- Timeline: {{this.timeline}}\n- Resources: {{this.resources}}\n- Dependencies: {{this.dependencies}}\n- Success Metrics: {{this.success_metrics}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "risk_assessment",
                "title": "Risk Assessment",
                "content": "## Risk Assessment\n\n### Strategic Risks\n{{#each strategic_risks}}\n**{{this.risk_name}}**\n- Description: {{this.description}}\n- Probability: {{this.probability}}\n- Impact: {{this.impact}}\n- Mitigation Strategy: {{this.mitigation_strategy}}\n- Owner: {{this.owner}}\n\n{{/each}}",
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
            "name": "initiative_name",
            "type": "text",
            "required": true,
            "description": "Name of the strategic analysis initiative"
        },
        {
            "name": "business_analyst",
            "type": "text",
            "required": true,
            "description": "Name of the lead business analyst"
        },
        {
            "name": "strategic_analysis_approach",
            "type": "text",
            "required": true,
            "description": "Strategic analysis approach"
        },
        {
            "name": "strategic_objectives",
            "type": "array",
            "required": true,
            "description": "Strategic objectives"
        },
        {
            "name": "current_state_approach",
            "type": "text",
            "required": true,
            "description": "Current state analysis approach"
        },
        {
            "name": "business_capabilities",
            "type": "array",
            "required": true,
            "description": "Business capabilities assessment"
        },
        {
            "name": "vision_statement",
            "type": "text",
            "required": true,
            "description": "Future state vision statement"
        },
        {
            "name": "future_capabilities",
            "type": "array",
            "required": true,
            "description": "Future state capabilities"
        },
        {
            "name": "identified_gaps",
            "type": "array",
            "required": true,
            "description": "Identified gaps between current and future state"
        },
        {
            "name": "change_approach",
            "type": "text",
            "required": true,
            "description": "Change approach"
        },
        {
            "name": "implementation_strategy",
            "type": "text",
            "required": true,
            "description": "Implementation strategy"
        },
        {
            "name": "change_initiatives",
            "type": "array",
            "required": true,
            "description": "Change initiatives"
        },
        {
            "name": "strategic_risks",
            "type": "array",
            "required": true,
            "description": "Strategic risks and mitigation strategies"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- BABOK KNOWLEDGE AREA 5: REQUIREMENTS ANALYSIS AND DESIGN DEFINITION
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Requirements Analysis and Design Definition Plan',
    'Comprehensive requirements analysis and design definition plan covering requirements modeling, design options, and solution recommendations',
    'BABOK',
    'Requirements Analysis and Design Definition',
    '{
        "sections": [
            {
                "id": "analysis_overview",
                "title": "Analysis Overview",
                "content": "## Analysis Overview\n\nThis plan defines how requirements will be analyzed and organized, and how solution designs will be defined and evaluated.\n\n### Initiative Information\n**Initiative Name**: {{initiative_name}}\n**Business Analyst**: {{business_analyst}}\n**Analysis Approach**: {{analysis_approach}}\n\n### Analysis Objectives\n{{#each analysis_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "requirements_analysis",
                "title": "Requirements Analysis",
                "content": "## Requirements Analysis\n\n### Analysis Techniques\n{{#each analysis_techniques}}\n- {{this}}\n{{/each}}\n\n### Requirements Organization\n{{requirements_organization}}\n\n### Requirements Relationships\n{{#each requirement_relationships}}\n**{{this.source}}** → **{{this.target}}**\n- Relationship: {{this.relationship}}\n- Type: {{this.type}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "requirements_modeling",
                "title": "Requirements Modeling",
                "content": "## Requirements Modeling\n\n### Modeling Approach\n{{modeling_approach}}\n\n### Models to be Created\n{{#each models}}\n**{{this.model_name}}**\n- Purpose: {{this.purpose}}\n- Technique: {{this.technique}}\n- Scope: {{this.scope}}\n- Stakeholders: {{this.stakeholders}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "design_options",
                "title": "Design Options",
                "content": "## Design Options\n\n### Design Approach\n{{design_approach}}\n\n### Design Options\n{{#each design_options}}\n**{{this.option_name}}**\n- Description: {{this.description}}\n- Approach: {{this.approach}}\n- Pros: {{this.pros}}\n- Cons: {{this.cons}}\n- Feasibility: {{this.feasibility}}\n- Cost: {{this.cost}}\n- Timeline: {{this.timeline}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "solution_recommendation",
                "title": "Solution Recommendation",
                "content": "## Solution Recommendation\n\n### Recommendation Process\n{{recommendation_process}}\n\n### Evaluation Criteria\n{{#each evaluation_criteria}}\n- {{this}}\n{{/each}}\n\n### Recommended Solution\n{{recommended_solution}}\n\n### Rationale\n{{rationale}}\n\n### Implementation Considerations\n{{implementation_considerations}}",
                "required": true
            },
            {
                "id": "solution_architecture",
                "title": "Solution Architecture",
                "content": "## Solution Architecture\n\n### Architecture Overview\n{{architecture_overview}}\n\n### Key Components\n{{#each key_components}}\n**{{this.component_name}}**\n- Purpose: {{this.purpose}}\n- Functionality: {{this.functionality}}\n- Interfaces: {{this.interfaces}}\n- Dependencies: {{this.dependencies}}\n\n{{/each}}",
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
            "name": "initiative_name",
            "type": "text",
            "required": true,
            "description": "Name of the analysis initiative"
        },
        {
            "name": "business_analyst",
            "type": "text",
            "required": true,
            "description": "Name of the lead business analyst"
        },
        {
            "name": "analysis_approach",
            "type": "text",
            "required": true,
            "description": "Requirements analysis approach"
        },
        {
            "name": "analysis_objectives",
            "type": "array",
            "required": true,
            "description": "Analysis objectives"
        },
        {
            "name": "analysis_techniques",
            "type": "array",
            "required": true,
            "description": "Analysis techniques to be used"
        },
        {
            "name": "requirements_organization",
            "type": "text",
            "required": true,
            "description": "Requirements organization approach"
        },
        {
            "name": "requirement_relationships",
            "type": "array",
            "required": true,
            "description": "Requirements relationships"
        },
        {
            "name": "modeling_approach",
            "type": "text",
            "required": true,
            "description": "Requirements modeling approach"
        },
        {
            "name": "models",
            "type": "array",
            "required": true,
            "description": "Models to be created"
        },
        {
            "name": "design_approach",
            "type": "text",
            "required": true,
            "description": "Design approach"
        },
        {
            "name": "design_options",
            "type": "array",
            "required": true,
            "description": "Design options"
        },
        {
            "name": "recommendation_process",
            "type": "text",
            "required": true,
            "description": "Solution recommendation process"
        },
        {
            "name": "evaluation_criteria",
            "type": "array",
            "required": true,
            "description": "Evaluation criteria"
        },
        {
            "name": "recommended_solution",
            "type": "text",
            "required": true,
            "description": "Recommended solution"
        },
        {
            "name": "rationale",
            "type": "text",
            "required": true,
            "description": "Recommendation rationale"
        },
        {
            "name": "implementation_considerations",
            "type": "text",
            "required": true,
            "description": "Implementation considerations"
        },
        {
            "name": "architecture_overview",
            "type": "text",
            "required": true,
            "description": "Solution architecture overview"
        },
        {
            "name": "key_components",
            "type": "array",
            "required": true,
            "description": "Key solution components"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- BABOK KNOWLEDGE AREA 6: SOLUTION EVALUATION
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Solution Evaluation Plan',
    'Comprehensive solution evaluation plan covering solution assessment, performance analysis, and value realization',
    'BABOK',
    'Solution Evaluation',
    '{
        "sections": [
            {
                "id": "evaluation_overview",
                "title": "Solution Evaluation Overview",
                "content": "## Solution Evaluation Overview\n\nThis plan defines how solutions will be evaluated to assess their performance and value, and to recommend actions for increasing the value realized.\n\n### Initiative Information\n**Initiative Name**: {{initiative_name}}\n**Business Analyst**: {{business_analyst}}\n**Evaluation Approach**: {{evaluation_approach}}\n\n### Evaluation Objectives\n{{#each evaluation_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "solution_assessment",
                "title": "Solution Assessment",
                "content": "## Solution Assessment\n\n### Assessment Approach\n{{assessment_approach}}\n\n### Assessment Criteria\n{{#each assessment_criteria}}\n- {{this}}\n{{/each}}\n\n### Assessment Methods\n{{#each assessment_methods}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "performance_analysis",
                "title": "Performance Analysis",
                "content": "## Performance Analysis\n\n### Performance Metrics\n{{#each performance_metrics}}\n**{{this.metric_name}}**\n- Target: {{this.target}}\n- Actual: {{this.actual}}\n- Variance: {{this.variance}}\n- Analysis: {{this.analysis}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "value_realization",
                "title": "Value Realization",
                "content": "## Value Realization\n\n### Expected Benefits\n{{#each expected_benefits}}\n**{{this.benefit_name}}**\n- Description: {{this.description}}\n- Expected Value: {{this.expected_value}}\n- Actual Value: {{this.actual_value}}\n- Realization Status: {{this.realization_status}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "recommendations",
                "title": "Recommendations",
                "content": "## Recommendations\n\n### Improvement Opportunities\n{{#each improvement_opportunities}}\n**{{this.opportunity_name}}**\n- Description: {{this.description}}\n- Potential Impact: {{this.potential_impact}}\n- Effort Required: {{this.effort_required}}\n- Priority: {{this.priority}}\n- Recommended Actions: {{this.recommended_actions}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "evaluation_reporting",
                "title": "Evaluation Reporting",
                "content": "## Evaluation Reporting\n\n### Reporting Approach\n{{reporting_approach}}\n\n### Report Schedule\n{{#each report_schedule}}\n- **{{this.report_name}}**: {{this.frequency}} ({{this.audience}})\n{{/each}}\n\n### Key Findings\n{{key_findings}}\n\n### Next Steps\n{{next_steps}}",
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
            "name": "initiative_name",
            "type": "text",
            "required": true,
            "description": "Name of the solution evaluation initiative"
        },
        {
            "name": "business_analyst",
            "type": "text",
            "required": true,
            "description": "Name of the lead business analyst"
        },
        {
            "name": "evaluation_approach",
            "type": "text",
            "required": true,
            "description": "Solution evaluation approach"
        },
        {
            "name": "evaluation_objectives",
            "type": "array",
            "required": true,
            "description": "Evaluation objectives"
        },
        {
            "name": "assessment_approach",
            "type": "text",
            "required": true,
            "description": "Solution assessment approach"
        },
        {
            "name": "assessment_criteria",
            "type": "array",
            "required": true,
            "description": "Assessment criteria"
        },
        {
            "name": "assessment_methods",
            "type": "array",
            "required": true,
            "description": "Assessment methods"
        },
        {
            "name": "performance_metrics",
            "type": "array",
            "required": true,
            "description": "Performance metrics"
        },
        {
            "name": "expected_benefits",
            "type": "array",
            "required": true,
            "description": "Expected benefits and value realization"
        },
        {
            "name": "improvement_opportunities",
            "type": "array",
            "required": true,
            "description": "Improvement opportunities"
        },
        {
            "name": "reporting_approach",
            "type": "text",
            "required": true,
            "description": "Evaluation reporting approach"
        },
        {
            "name": "report_schedule",
            "type": "array",
            "required": true,
            "description": "Report schedule"
        },
        {
            "name": "key_findings",
            "type": "text",
            "required": true,
            "description": "Key findings from evaluation"
        },
        {
            "name": "next_steps",
            "type": "text",
            "required": true,
            "description": "Next steps and recommendations"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- BABOK MIGRATION COMPLETE
-- ============================================================================

SELECT 'BABOK Templates Migration Completed Successfully!' as status;
SELECT COUNT(*) as total_babok_templates FROM templates WHERE framework = 'BABOK';


