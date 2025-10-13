-- PMBOK Knowledge Areas Templates Migration
-- Creates templates for all 10 PMBOK knowledge areas with their management plan deliverables

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 1: PROJECT INTEGRATION MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Integration Management Plan',
    'Comprehensive project integration management plan covering project charter, project management plan, and integrated change control processes',
    'PMBOK',
    'Integration Management',
    '{
        "sections": [
            {
                "id": "executive_summary",
                "title": "Executive Summary",
                "content": "## Executive Summary\n\nThis Project Integration Management Plan defines the processes and activities needed to identify, define, combine, unify, and coordinate the various processes and project management activities within the Project Management Process Groups.\n\n### Project Overview\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Project Sponsor**: {{project_sponsor}}\n**Project Start Date**: {{project_start_date}}\n**Project End Date**: {{project_end_date}}\n\n### Key Objectives\n{{#each key_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "project_charter",
                "title": "Project Charter",
                "content": "## Project Charter\n\n### Project Purpose\n{{project_purpose}}\n\n### Project Objectives\n{{#each project_objectives}}\n- **{{this.name}}**: {{this.description}}\n{{/each}}\n\n### Success Criteria\n{{success_criteria}}\n\n### High-Level Requirements\n{{#each high_level_requirements}}\n- {{this}}\n{{/each}}\n\n### Assumptions and Constraints\n**Assumptions**:\n{{#each assumptions}}\n- {{this}}\n{{/each}}\n\n**Constraints**:\n{{#each constraints}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "project_management_plan",
                "title": "Project Management Plan",
                "content": "## Project Management Plan\n\n### Scope Management Plan\n{{scope_management_plan}}\n\n### Schedule Management Plan\n{{schedule_management_plan}}\n\n### Cost Management Plan\n{{cost_management_plan}}\n\n### Quality Management Plan\n{{quality_management_plan}}\n\n### Resource Management Plan\n{{resource_management_plan}}\n\n### Communications Management Plan\n{{communications_management_plan}}\n\n### Risk Management Plan\n{{risk_management_plan}}\n\n### Procurement Management Plan\n{{procurement_management_plan}}\n\n### Stakeholder Engagement Plan\n{{stakeholder_engagement_plan}}",
                "required": true
            },
            {
                "id": "integrated_change_control",
                "title": "Integrated Change Control",
                "content": "## Integrated Change Control\n\n### Change Control Process\n{{change_control_process}}\n\n### Change Control Board (CCB)\n**CCB Members**:\n{{#each ccb_members}}\n- {{this.name}} ({{this.role}})\n{{/each}}\n\n### Change Request Forms\n{{change_request_forms}}\n\n### Change Impact Assessment\n{{change_impact_assessment}}\n\n### Change Approval Criteria\n{{#each change_approval_criteria}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "project_work_performance",
                "title": "Project Work Performance",
                "content": "## Project Work Performance\n\n### Performance Measurement\n{{performance_measurement}}\n\n### Work Performance Data Collection\n{{work_performance_data_collection}}\n\n### Performance Reporting\n{{performance_reporting}}\n\n### Corrective Actions\n{{corrective_actions}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "project_sponsor",
            "type": "text",
            "required": true,
            "description": "Name of the project sponsor"
        },
        {
            "name": "project_start_date",
            "type": "date",
            "required": true,
            "description": "Project start date"
        },
        {
            "name": "project_end_date",
            "type": "date",
            "required": true,
            "description": "Project end date"
        },
        {
            "name": "key_objectives",
            "type": "array",
            "required": true,
            "description": "Array of key project objectives"
        },
        {
            "name": "project_purpose",
            "type": "text",
            "required": true,
            "description": "Purpose and justification for the project"
        },
        {
            "name": "project_objectives",
            "type": "array",
            "required": true,
            "description": "Array of project objectives with name and description"
        },
        {
            "name": "success_criteria",
            "type": "text",
            "required": true,
            "description": "Criteria for project success"
        },
        {
            "name": "high_level_requirements",
            "type": "array",
            "required": true,
            "description": "High-level project requirements"
        },
        {
            "name": "assumptions",
            "type": "array",
            "required": true,
            "description": "Project assumptions"
        },
        {
            "name": "constraints",
            "type": "array",
            "required": true,
            "description": "Project constraints"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 2: PROJECT SCOPE MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Scope Management Plan',
    'Comprehensive scope management plan covering requirements collection, scope definition, WBS creation, and scope validation',
    'PMBOK',
    'Scope Management',
    '{
        "sections": [
            {
                "id": "scope_management_overview",
                "title": "Scope Management Overview",
                "content": "## Scope Management Overview\n\nThis plan defines how project scope will be defined, validated, and controlled throughout the project lifecycle.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Scope Management Approach**: {{scope_management_approach}}\n\n### Scope Management Objectives\n{{#each scope_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "requirements_management",
                "title": "Requirements Management",
                "content": "## Requirements Management\n\n### Requirements Collection Process\n{{requirements_collection_process}}\n\n### Requirements Categories\n**Functional Requirements**:\n{{#each functional_requirements}}\n- {{this}}\n{{/each}}\n\n**Non-Functional Requirements**:\n{{#each non_functional_requirements}}\n- {{this}}\n{{/each}}\n\n**Business Requirements**:\n{{#each business_requirements}}\n- {{this}}\n{{/each}}\n\n**Technical Requirements**:\n{{#each technical_requirements}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "scope_definition",
                "title": "Scope Definition",
                "content": "## Scope Definition\n\n### Project Scope Statement\n{{project_scope_statement}}\n\n### Product Scope Description\n{{product_scope_description}}\n\n### Deliverables\n{{#each deliverables}}\n- **{{this.name}}**: {{this.description}}\n  - Acceptance Criteria: {{this.acceptance_criteria}}\n  - Due Date: {{this.due_date}}\n{{/each}}\n\n### Exclusions\n{{#each exclusions}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "work_breakdown_structure",
                "title": "Work Breakdown Structure (WBS)",
                "content": "## Work Breakdown Structure (WBS)\n\n### WBS Overview\n{{wbs_overview}}\n\n### WBS Levels\n{{wbs_levels}}\n\n### WBS Dictionary\n{{#each wbs_dictionary}}\n**{{this.code}} - {{this.name}}**\n- Description: {{this.description}}\n- Deliverable: {{this.deliverable}}\n- Acceptance Criteria: {{this.acceptance_criteria}}\n- Assumptions: {{this.assumptions}}\n- Constraints: {{this.constraints}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "scope_validation",
                "title": "Scope Validation",
                "content": "## Scope Validation\n\n### Validation Process\n{{validation_process}}\n\n### Acceptance Criteria\n{{#each acceptance_criteria}}\n- {{this}}\n{{/each}}\n\n### Validation Methods\n{{#each validation_methods}}\n- {{this}}\n{{/each}}\n\n### Sign-off Requirements\n{{sign_off_requirements}}",
                "required": true
            },
            {
                "id": "scope_control",
                "title": "Scope Control",
                "content": "## Scope Control\n\n### Change Control Process\n{{scope_change_control_process}}\n\n### Scope Creep Prevention\n{{scope_creep_prevention}}\n\n### Variance Analysis\n{{variance_analysis}}\n\n### Corrective Actions\n{{corrective_actions}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "scope_management_approach",
            "type": "text",
            "required": true,
            "description": "Approach to scope management"
        },
        {
            "name": "scope_objectives",
            "type": "array",
            "required": true,
            "description": "Scope management objectives"
        },
        {
            "name": "requirements_collection_process",
            "type": "text",
            "required": true,
            "description": "Process for collecting requirements"
        },
        {
            "name": "functional_requirements",
            "type": "array",
            "required": true,
            "description": "Functional requirements"
        },
        {
            "name": "non_functional_requirements",
            "type": "array",
            "required": true,
            "description": "Non-functional requirements"
        },
        {
            "name": "business_requirements",
            "type": "array",
            "required": true,
            "description": "Business requirements"
        },
        {
            "name": "technical_requirements",
            "type": "array",
            "required": true,
            "description": "Technical requirements"
        },
        {
            "name": "project_scope_statement",
            "type": "text",
            "required": true,
            "description": "Project scope statement"
        },
        {
            "name": "product_scope_description",
            "type": "text",
            "required": true,
            "description": "Product scope description"
        },
        {
            "name": "deliverables",
            "type": "array",
            "required": true,
            "description": "Project deliverables"
        },
        {
            "name": "exclusions",
            "type": "array",
            "required": true,
            "description": "What is excluded from scope"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 3: PROJECT SCHEDULE MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Schedule Management Plan',
    'Comprehensive schedule management plan covering activity definition, sequencing, duration estimation, and schedule development',
    'PMBOK',
    'Schedule Management',
    '{
        "sections": [
            {
                "id": "schedule_management_overview",
                "title": "Schedule Management Overview",
                "content": "## Schedule Management Overview\n\nThis plan defines how project schedule will be planned, developed, managed, executed, and controlled.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Schedule Management Approach**: {{schedule_management_approach}}\n\n### Schedule Management Objectives\n{{#each schedule_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "activity_definition",
                "title": "Activity Definition",
                "content": "## Activity Definition\n\n### Activity Identification Process\n{{activity_identification_process}}\n\n### Activity List\n{{#each activities}}\n**{{this.id}} - {{this.name}}**\n- Description: {{this.description}}\n- Predecessors: {{this.predecessors}}\n- Successors: {{this.successors}}\n- Resource Requirements: {{this.resource_requirements}}\n- Constraints: {{this.constraints}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "activity_sequencing",
                "title": "Activity Sequencing",
                "content": "## Activity Sequencing\n\n### Sequencing Approach\n{{sequencing_approach}}\n\n### Dependencies\n**Mandatory Dependencies**:\n{{#each mandatory_dependencies}}\n- {{this.from}} → {{this.to}} ({{this.reason}})\n{{/each}}\n\n**Discretionary Dependencies**:\n{{#each discretionary_dependencies}}\n- {{this.from}} → {{this.to}} ({{this.reason}})\n{{/each}}\n\n**External Dependencies**:\n{{#each external_dependencies}}\n- {{this.from}} → {{this.to}} ({{this.reason}})\n{{/each}}",
                "required": true
            },
            {
                "id": "duration_estimation",
                "title": "Duration Estimation",
                "content": "## Duration Estimation\n\n### Estimation Approach\n{{estimation_approach}}\n\n### Estimation Techniques\n{{#each estimation_techniques}}\n- {{this}}\n{{/each}}\n\n### Activity Duration Estimates\n{{#each duration_estimates}}\n**{{this.activity}}**:\n- Optimistic: {{this.optimistic}} days\n- Most Likely: {{this.most_likely}} days\n- Pessimistic: {{this.pessimistic}} days\n- Expected: {{this.expected}} days\n\n{{/each}}",
                "required": true
            },
            {
                "id": "schedule_development",
                "title": "Schedule Development",
                "content": "## Schedule Development\n\n### Schedule Development Process\n{{schedule_development_process}}\n\n### Critical Path Analysis\n{{critical_path_analysis}}\n\n### Schedule Baseline\n{{schedule_baseline}}\n\n### Milestones\n{{#each milestones}}\n- **{{this.name}}**: {{this.date}} - {{this.description}}\n{{/each}}",
                "required": true
            },
            {
                "id": "schedule_control",
                "title": "Schedule Control",
                "content": "## Schedule Control\n\n### Control Process\n{{schedule_control_process}}\n\n### Performance Measurement\n{{performance_measurement}}\n\n### Variance Analysis\n{{variance_analysis}}\n\n### Corrective Actions\n{{corrective_actions}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "schedule_management_approach",
            "type": "text",
            "required": true,
            "description": "Approach to schedule management"
        },
        {
            "name": "schedule_objectives",
            "type": "array",
            "required": true,
            "description": "Schedule management objectives"
        },
        {
            "name": "activity_identification_process",
            "type": "text",
            "required": true,
            "description": "Process for identifying activities"
        },
        {
            "name": "activities",
            "type": "array",
            "required": true,
            "description": "List of project activities"
        },
        {
            "name": "sequencing_approach",
            "type": "text",
            "required": true,
            "description": "Approach to activity sequencing"
        },
        {
            "name": "mandatory_dependencies",
            "type": "array",
            "required": true,
            "description": "Mandatory dependencies between activities"
        },
        {
            "name": "discretionary_dependencies",
            "type": "array",
            "required": true,
            "description": "Discretionary dependencies between activities"
        },
        {
            "name": "external_dependencies",
            "type": "array",
            "required": true,
            "description": "External dependencies"
        },
        {
            "name": "estimation_approach",
            "type": "text",
            "required": true,
            "description": "Approach to duration estimation"
        },
        {
            "name": "estimation_techniques",
            "type": "array",
            "required": true,
            "description": "Estimation techniques to be used"
        },
        {
            "name": "duration_estimates",
            "type": "array",
            "required": true,
            "description": "Duration estimates for activities"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 4: PROJECT COST MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Cost Management Plan',
    'Comprehensive cost management plan covering cost estimation, budgeting, and cost control processes',
    'PMBOK',
    'Cost Management',
    '{
        "sections": [
            {
                "id": "cost_management_overview",
                "title": "Cost Management Overview",
                "content": "## Cost Management Overview\n\nThis plan defines how project costs will be planned, estimated, budgeted, financed, funded, managed, and controlled.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Cost Management Approach**: {{cost_management_approach}}\n\n### Cost Management Objectives\n{{#each cost_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "cost_estimation",
                "title": "Cost Estimation",
                "content": "## Cost Estimation\n\n### Estimation Approach\n{{estimation_approach}}\n\n### Estimation Techniques\n{{#each estimation_techniques}}\n- {{this}}\n{{/each}}\n\n### Cost Categories\n**Direct Costs**:\n{{#each direct_costs}}\n- {{this.category}}: {{this.amount}} ({{this.basis}})\n{{/each}}\n\n**Indirect Costs**:\n{{#each indirect_costs}}\n- {{this.category}}: {{this.amount}} ({{this.basis}})\n{{/each}}\n\n**Contingency Reserve**: {{contingency_reserve}}\n**Management Reserve**: {{management_reserve}}",
                "required": true
            },
            {
                "id": "cost_budgeting",
                "title": "Cost Budgeting",
                "content": "## Cost Budgeting\n\n### Budget Development Process\n{{budget_development_process}}\n\n### Cost Baseline\n{{cost_baseline}}\n\n### Funding Requirements\n{{#each funding_requirements}}\n- **{{this.period}}**: {{this.amount}} ({{this.purpose}})\n{{/each}}\n\n### Cash Flow Projections\n{{cash_flow_projections}}",
                "required": true
            },
            {
                "id": "cost_control",
                "title": "Cost Control",
                "content": "## Cost Control\n\n### Control Process\n{{cost_control_process}}\n\n### Performance Measurement\n{{performance_measurement}}\n\n### Earned Value Management\n{{earned_value_management}}\n\n### Variance Analysis\n{{variance_analysis}}\n\n### Corrective Actions\n{{corrective_actions}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "cost_management_approach",
            "type": "text",
            "required": true,
            "description": "Approach to cost management"
        },
        {
            "name": "cost_objectives",
            "type": "array",
            "required": true,
            "description": "Cost management objectives"
        },
        {
            "name": "estimation_approach",
            "type": "text",
            "required": true,
            "description": "Approach to cost estimation"
        },
        {
            "name": "estimation_techniques",
            "type": "array",
            "required": true,
            "description": "Cost estimation techniques"
        },
        {
            "name": "direct_costs",
            "type": "array",
            "required": true,
            "description": "Direct cost categories"
        },
        {
            "name": "indirect_costs",
            "type": "array",
            "required": true,
            "description": "Indirect cost categories"
        },
        {
            "name": "contingency_reserve",
            "type": "text",
            "required": true,
            "description": "Contingency reserve amount and basis"
        },
        {
            "name": "management_reserve",
            "type": "text",
            "required": true,
            "description": "Management reserve amount and basis"
        },
        {
            "name": "budget_development_process",
            "type": "text",
            "required": true,
            "description": "Process for developing the budget"
        },
        {
            "name": "cost_baseline",
            "type": "text",
            "required": true,
            "description": "Cost baseline information"
        },
        {
            "name": "funding_requirements",
            "type": "array",
            "required": true,
            "description": "Funding requirements by period"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 5: PROJECT QUALITY MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Quality Management Plan',
    'Comprehensive quality management plan covering quality planning, assurance, and control processes',
    'PMBOK',
    'Quality Management',
    '{
        "sections": [
            {
                "id": "quality_management_overview",
                "title": "Quality Management Overview",
                "content": "## Quality Management Overview\n\nThis plan defines how project quality will be planned, managed, and controlled throughout the project lifecycle.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Quality Management Approach**: {{quality_management_approach}}\n\n### Quality Objectives\n{{#each quality_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "quality_planning",
                "title": "Quality Planning",
                "content": "## Quality Planning\n\n### Quality Standards\n{{#each quality_standards}}\n- {{this}}\n{{/each}}\n\n### Quality Metrics\n{{#each quality_metrics}}\n- **{{this.name}}**: {{this.description}} (Target: {{this.target}})\n{{/each}}\n\n### Quality Requirements\n{{#each quality_requirements}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "quality_assurance",
                "title": "Quality Assurance",
                "content": "## Quality Assurance\n\n### Assurance Activities\n{{#each assurance_activities}}\n- {{this}}\n{{/each}}\n\n### Process Audits\n{{process_audits}}\n\n### Quality Reviews\n{{quality_reviews}}\n\n### Continuous Improvement\n{{continuous_improvement}}",
                "required": true
            },
            {
                "id": "quality_control",
                "title": "Quality Control",
                "content": "## Quality Control\n\n### Control Activities\n{{#each control_activities}}\n- {{this}}\n{{/each}}\n\n### Inspection and Testing\n{{inspection_testing}}\n\n### Defect Management\n{{defect_management}}\n\n### Corrective Actions\n{{corrective_actions}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "quality_management_approach",
            "type": "text",
            "required": true,
            "description": "Approach to quality management"
        },
        {
            "name": "quality_objectives",
            "type": "array",
            "required": true,
            "description": "Quality objectives"
        },
        {
            "name": "quality_standards",
            "type": "array",
            "required": true,
            "description": "Quality standards to be followed"
        },
        {
            "name": "quality_metrics",
            "type": "array",
            "required": true,
            "description": "Quality metrics and targets"
        },
        {
            "name": "quality_requirements",
            "type": "array",
            "required": true,
            "description": "Quality requirements"
        },
        {
            "name": "assurance_activities",
            "type": "array",
            "required": true,
            "description": "Quality assurance activities"
        },
        {
            "name": "process_audits",
            "type": "text",
            "required": true,
            "description": "Process audit procedures"
        },
        {
            "name": "quality_reviews",
            "type": "text",
            "required": true,
            "description": "Quality review procedures"
        },
        {
            "name": "continuous_improvement",
            "type": "text",
            "required": true,
            "description": "Continuous improvement process"
        },
        {
            "name": "control_activities",
            "type": "array",
            "required": true,
            "description": "Quality control activities"
        },
        {
            "name": "inspection_testing",
            "type": "text",
            "required": true,
            "description": "Inspection and testing procedures"
        },
        {
            "name": "defect_management",
            "type": "text",
            "required": true,
            "description": "Defect management process"
        },
        {
            "name": "corrective_actions",
            "type": "text",
            "required": true,
            "description": "Corrective action process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 6: PROJECT RESOURCE MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Resource Management Plan',
    'Comprehensive resource management plan covering resource planning, acquisition, development, and management',
    'PMBOK',
    'Resource Management',
    '{
        "sections": [
            {
                "id": "resource_management_overview",
                "title": "Resource Management Overview",
                "content": "## Resource Management Overview\n\nThis plan defines how project resources will be identified, acquired, and managed throughout the project lifecycle.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Resource Management Approach**: {{resource_management_approach}}\n\n### Resource Management Objectives\n{{#each resource_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "resource_planning",
                "title": "Resource Planning",
                "content": "## Resource Planning\n\n### Resource Requirements\n**Human Resources**:\n{{#each human_resources}}\n- {{this.role}}: {{this.quantity}} ({{this.skills}})\n{{/each}}\n\n**Material Resources**:\n{{#each material_resources}}\n- {{this.item}}: {{this.quantity}} ({{this.specifications}})\n{{/each}}\n\n**Equipment Resources**:\n{{#each equipment_resources}}\n- {{this.equipment}}: {{this.quantity}} ({{this.specifications}})\n{{/each}}",
                "required": true
            },
            {
                "id": "resource_acquisition",
                "title": "Resource Acquisition",
                "content": "## Resource Acquisition\n\n### Acquisition Strategy\n{{acquisition_strategy}}\n\n### Procurement Process\n{{procurement_process}}\n\n### Vendor Management\n{{vendor_management}}\n\n### Contract Management\n{{contract_management}}",
                "required": true
            },
            {
                "id": "resource_development",
                "title": "Resource Development",
                "content": "## Resource Development\n\n### Training Requirements\n{{#each training_requirements}}\n- {{this.topic}}: {{this.audience}} ({{this.duration}})\n{{/each}}\n\n### Skill Development\n{{skill_development}}\n\n### Team Building\n{{team_building}}\n\n### Performance Management\n{{performance_management}}",
                "required": true
            },
            {
                "id": "resource_control",
                "title": "Resource Control",
                "content": "## Resource Control\n\n### Resource Allocation\n{{resource_allocation}}\n\n### Resource Utilization\n{{resource_utilization}}\n\n### Performance Monitoring\n{{performance_monitoring}}\n\n### Resource Optimization\n{{resource_optimization}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "resource_management_approach",
            "type": "text",
            "required": true,
            "description": "Approach to resource management"
        },
        {
            "name": "resource_objectives",
            "type": "array",
            "required": true,
            "description": "Resource management objectives"
        },
        {
            "name": "human_resources",
            "type": "array",
            "required": true,
            "description": "Human resource requirements"
        },
        {
            "name": "material_resources",
            "type": "array",
            "required": true,
            "description": "Material resource requirements"
        },
        {
            "name": "equipment_resources",
            "type": "array",
            "required": true,
            "description": "Equipment resource requirements"
        },
        {
            "name": "acquisition_strategy",
            "type": "text",
            "required": true,
            "description": "Resource acquisition strategy"
        },
        {
            "name": "procurement_process",
            "type": "text",
            "required": true,
            "description": "Procurement process"
        },
        {
            "name": "vendor_management",
            "type": "text",
            "required": true,
            "description": "Vendor management approach"
        },
        {
            "name": "contract_management",
            "type": "text",
            "required": true,
            "description": "Contract management process"
        },
        {
            "name": "training_requirements",
            "type": "array",
            "required": true,
            "description": "Training requirements"
        },
        {
            "name": "skill_development",
            "type": "text",
            "required": true,
            "description": "Skill development plan"
        },
        {
            "name": "team_building",
            "type": "text",
            "required": true,
            "description": "Team building activities"
        },
        {
            "name": "performance_management",
            "type": "text",
            "required": true,
            "description": "Performance management process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 7: PROJECT COMMUNICATIONS MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Communications Management Plan',
    'Comprehensive communications management plan covering communication planning, management, and monitoring',
    'PMBOK',
    'Communications Management',
    '{
        "sections": [
            {
                "id": "communications_overview",
                "title": "Communications Overview",
                "content": "## Communications Overview\n\nThis plan defines how project communications will be planned, managed, monitored, and controlled throughout the project lifecycle.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Communications Approach**: {{communications_approach}}\n\n### Communications Objectives\n{{#each communications_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "stakeholder_analysis",
                "title": "Stakeholder Analysis",
                "content": "## Stakeholder Analysis\n\n### Stakeholder Register\n{{#each stakeholders}}\n**{{this.name}}** ({{this.role}})\n- Interest Level: {{this.interest_level}}\n- Influence Level: {{this.influence_level}}\n- Communication Preferences: {{this.communication_preferences}}\n- Information Needs: {{this.information_needs}}\n- Contact Information: {{this.contact_info}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "communication_planning",
                "title": "Communication Planning",
                "content": "## Communication Planning\n\n### Communication Matrix\n{{#each communication_matrix}}\n**{{this.information_type}}**\n- Audience: {{this.audience}}\n- Frequency: {{this.frequency}}\n- Method: {{this.method}}\n- Format: {{this.format}}\n- Owner: {{this.owner}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "communication_management",
                "title": "Communication Management",
                "content": "## Communication Management\n\n### Communication Channels\n{{#each communication_channels}}\n- {{this.channel}}: {{this.purpose}} ({{this.frequency}})\n{{/each}}\n\n### Meeting Schedule\n{{#each meeting_schedule}}\n- **{{this.meeting_name}}**: {{this.frequency}} ({{this.participants}})\n{{/each}}\n\n### Reporting Structure\n{{reporting_structure}}",
                "required": true
            },
            {
                "id": "communication_monitoring",
                "title": "Communication Monitoring",
                "content": "## Communication Monitoring\n\n### Performance Metrics\n{{#each performance_metrics}}\n- {{this.metric}}: {{this.target}} ({{this.measurement_method}})\n{{/each}}\n\n### Feedback Mechanisms\n{{feedback_mechanisms}}\n\n### Issue Escalation\n{{issue_escalation}}\n\n### Continuous Improvement\n{{continuous_improvement}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "communications_approach",
            "type": "text",
            "required": true,
            "description": "Approach to communications management"
        },
        {
            "name": "communications_objectives",
            "type": "array",
            "required": true,
            "description": "Communications objectives"
        },
        {
            "name": "stakeholders",
            "type": "array",
            "required": true,
            "description": "Stakeholder information"
        },
        {
            "name": "communication_matrix",
            "type": "array",
            "required": true,
            "description": "Communication matrix"
        },
        {
            "name": "communication_channels",
            "type": "array",
            "required": true,
            "description": "Communication channels"
        },
        {
            "name": "meeting_schedule",
            "type": "array",
            "required": true,
            "description": "Meeting schedule"
        },
        {
            "name": "reporting_structure",
            "type": "text",
            "required": true,
            "description": "Reporting structure"
        },
        {
            "name": "performance_metrics",
            "type": "array",
            "required": true,
            "description": "Performance metrics"
        },
        {
            "name": "feedback_mechanisms",
            "type": "text",
            "required": true,
            "description": "Feedback mechanisms"
        },
        {
            "name": "issue_escalation",
            "type": "text",
            "required": true,
            "description": "Issue escalation process"
        },
        {
            "name": "continuous_improvement",
            "type": "text",
            "required": true,
            "description": "Continuous improvement process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 8: PROJECT RISK MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Risk Management Plan',
    'Comprehensive risk management plan covering risk identification, analysis, response planning, and monitoring',
    'PMBOK',
    'Risk Management',
    '{
        "sections": [
            {
                "id": "risk_management_overview",
                "title": "Risk Management Overview",
                "content": "## Risk Management Overview\n\nThis plan defines how project risks will be identified, analyzed, and managed throughout the project lifecycle.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Risk Management Approach**: {{risk_management_approach}}\n\n### Risk Management Objectives\n{{#each risk_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "risk_identification",
                "title": "Risk Identification",
                "content": "## Risk Identification\n\n### Identification Process\n{{identification_process}}\n\n### Risk Categories\n{{#each risk_categories}}\n- {{this}}\n{{/each}}\n\n### Risk Register\n{{#each risks}}\n**{{this.id}} - {{this.name}}**\n- Category: {{this.category}}\n- Description: {{this.description}}\n- Potential Impact: {{this.impact}}\n- Probability: {{this.probability}}\n- Risk Level: {{this.risk_level}}\n- Owner: {{this.owner}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "risk_analysis",
                "title": "Risk Analysis",
                "content": "## Risk Analysis\n\n### Qualitative Analysis\n{{qualitative_analysis}}\n\n### Quantitative Analysis\n{{quantitative_analysis}}\n\n### Risk Assessment Matrix\n{{risk_assessment_matrix}}\n\n### Risk Prioritization\n{{risk_prioritization}}",
                "required": true
            },
            {
                "id": "risk_response",
                "title": "Risk Response",
                "content": "## Risk Response\n\n### Response Strategies\n{{#each response_strategies}}\n**{{this.risk_name}}**\n- Strategy: {{this.strategy}}\n- Response Plan: {{this.response_plan}}\n- Owner: {{this.owner}}\n- Timeline: {{this.timeline}}\n- Cost: {{this.cost}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "risk_monitoring",
                "title": "Risk Monitoring",
                "content": "## Risk Monitoring\n\n### Monitoring Process\n{{monitoring_process}}\n\n### Risk Reviews\n{{risk_reviews}}\n\n### Trigger Conditions\n{{trigger_conditions}}\n\n### Contingency Plans\n{{contingency_plans}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "risk_management_approach",
            "type": "text",
            "required": true,
            "description": "Approach to risk management"
        },
        {
            "name": "risk_objectives",
            "type": "array",
            "required": true,
            "description": "Risk management objectives"
        },
        {
            "name": "identification_process",
            "type": "text",
            "required": true,
            "description": "Risk identification process"
        },
        {
            "name": "risk_categories",
            "type": "array",
            "required": true,
            "description": "Risk categories"
        },
        {
            "name": "risks",
            "type": "array",
            "required": true,
            "description": "Identified risks"
        },
        {
            "name": "qualitative_analysis",
            "type": "text",
            "required": true,
            "description": "Qualitative risk analysis"
        },
        {
            "name": "quantitative_analysis",
            "type": "text",
            "required": true,
            "description": "Quantitative risk analysis"
        },
        {
            "name": "risk_assessment_matrix",
            "type": "text",
            "required": true,
            "description": "Risk assessment matrix"
        },
        {
            "name": "risk_prioritization",
            "type": "text",
            "required": true,
            "description": "Risk prioritization"
        },
        {
            "name": "response_strategies",
            "type": "array",
            "required": true,
            "description": "Risk response strategies"
        },
        {
            "name": "monitoring_process",
            "type": "text",
            "required": true,
            "description": "Risk monitoring process"
        },
        {
            "name": "risk_reviews",
            "type": "text",
            "required": true,
            "description": "Risk review process"
        },
        {
            "name": "trigger_conditions",
            "type": "text",
            "required": true,
            "description": "Risk trigger conditions"
        },
        {
            "name": "contingency_plans",
            "type": "text",
            "required": true,
            "description": "Contingency plans"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 9: PROJECT PROCUREMENT MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Procurement Management Plan',
    'Comprehensive procurement management plan covering procurement planning, conduct, and control',
    'PMBOK',
    'Procurement Management',
    '{
        "sections": [
            {
                "id": "procurement_overview",
                "title": "Procurement Overview",
                "content": "## Procurement Overview\n\nThis plan defines how project procurement will be planned, conducted, and controlled throughout the project lifecycle.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Procurement Approach**: {{procurement_approach}}\n\n### Procurement Objectives\n{{#each procurement_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "procurement_planning",
                "title": "Procurement Planning",
                "content": "## Procurement Planning\n\n### Procurement Requirements\n{{#each procurement_requirements}}\n**{{this.item}}**\n- Description: {{this.description}}\n- Quantity: {{this.quantity}}\n- Specifications: {{this.specifications}}\n- Delivery Date: {{this.delivery_date}}\n- Budget: {{this.budget}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "procurement_conduct",
                "title": "Procurement Conduct",
                "content": "## Procurement Conduct\n\n### Sourcing Strategy\n{{sourcing_strategy}}\n\n### Vendor Selection\n{{vendor_selection}}\n\n### Contract Types\n{{#each contract_types}}\n- {{this.type}}: {{this.description}} ({{this.use_case}})\n{{/each}}\n\n### Negotiation Process\n{{negotiation_process}}",
                "required": true
            },
            {
                "id": "procurement_control",
                "title": "Procurement Control",
                "content": "## Procurement Control\n\n### Contract Management\n{{contract_management}}\n\n### Vendor Performance\n{{vendor_performance}}\n\n### Quality Assurance\n{{quality_assurance}}\n\n### Payment Processing\n{{payment_processing}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "procurement_approach",
            "type": "text",
            "required": true,
            "description": "Approach to procurement management"
        },
        {
            "name": "procurement_objectives",
            "type": "array",
            "required": true,
            "description": "Procurement objectives"
        },
        {
            "name": "procurement_requirements",
            "type": "array",
            "required": true,
            "description": "Procurement requirements"
        },
        {
            "name": "sourcing_strategy",
            "type": "text",
            "required": true,
            "description": "Sourcing strategy"
        },
        {
            "name": "vendor_selection",
            "type": "text",
            "required": true,
            "description": "Vendor selection process"
        },
        {
            "name": "contract_types",
            "type": "array",
            "required": true,
            "description": "Contract types"
        },
        {
            "name": "negotiation_process",
            "type": "text",
            "required": true,
            "description": "Negotiation process"
        },
        {
            "name": "contract_management",
            "type": "text",
            "required": true,
            "description": "Contract management process"
        },
        {
            "name": "vendor_performance",
            "type": "text",
            "required": true,
            "description": "Vendor performance management"
        },
        {
            "name": "quality_assurance",
            "type": "text",
            "required": true,
            "description": "Quality assurance process"
        },
        {
            "name": "payment_processing",
            "type": "text",
            "required": true,
            "description": "Payment processing process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- PMBOK KNOWLEDGE AREA 10: PROJECT STAKEHOLDER MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Project Stakeholder Management Plan',
    'Comprehensive stakeholder management plan covering stakeholder identification, engagement, and management',
    'PMBOK',
    'Stakeholder Management',
    '{
        "sections": [
            {
                "id": "stakeholder_overview",
                "title": "Stakeholder Overview",
                "content": "## Stakeholder Overview\n\nThis plan defines how project stakeholders will be identified, engaged, and managed throughout the project lifecycle.\n\n### Project Information\n**Project Name**: {{project_name}}\n**Project Manager**: {{project_manager}}\n**Stakeholder Management Approach**: {{stakeholder_management_approach}}\n\n### Stakeholder Management Objectives\n{{#each stakeholder_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "stakeholder_identification",
                "title": "Stakeholder Identification",
                "content": "## Stakeholder Identification\n\n### Identification Process\n{{identification_process}}\n\n### Stakeholder Register\n{{#each stakeholders}}\n**{{this.name}}** ({{this.role}})\n- Organization: {{this.organization}}\n- Contact Information: {{this.contact_info}}\n- Interest Level: {{this.interest_level}}\n- Influence Level: {{this.influence_level}}\n- Expectations: {{this.expectations}}\n- Requirements: {{this.requirements}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "stakeholder_analysis",
                "title": "Stakeholder Analysis",
                "content": "## Stakeholder Analysis\n\n### Power/Interest Matrix\n{{power_interest_matrix}}\n\n### Stakeholder Mapping\n{{stakeholder_mapping}}\n\n### Engagement Levels\n{{#each engagement_levels}}\n- **{{this.stakeholder}}**: {{this.current_level}} → {{this.desired_level}}\n{{/each}}",
                "required": true
            },
            {
                "id": "stakeholder_engagement",
                "title": "Stakeholder Engagement",
                "content": "## Stakeholder Engagement\n\n### Engagement Strategies\n{{#each engagement_strategies}}\n**{{this.stakeholder_group}}**\n- Strategy: {{this.strategy}}\n- Activities: {{this.activities}}\n- Frequency: {{this.frequency}}\n- Owner: {{this.owner}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "stakeholder_management",
                "title": "Stakeholder Management",
                "content": "## Stakeholder Management\n\n### Communication Plan\n{{communication_plan}}\n\n### Issue Management\n{{issue_management}}\n\n### Change Management\n{{change_management}}\n\n### Performance Monitoring\n{{performance_monitoring}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "PMBOK 7th Edition",
            "complexity": "intermediate"
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
            "name": "project_manager",
            "type": "text",
            "required": true,
            "description": "Name of the project manager"
        },
        {
            "name": "stakeholder_management_approach",
            "type": "text",
            "required": true,
            "description": "Approach to stakeholder management"
        },
        {
            "name": "stakeholder_objectives",
            "type": "array",
            "required": true,
            "description": "Stakeholder management objectives"
        },
        {
            "name": "identification_process",
            "type": "text",
            "required": true,
            "description": "Stakeholder identification process"
        },
        {
            "name": "stakeholders",
            "type": "array",
            "required": true,
            "description": "Stakeholder information"
        },
        {
            "name": "power_interest_matrix",
            "type": "text",
            "required": true,
            "description": "Power/Interest matrix"
        },
        {
            "name": "stakeholder_mapping",
            "type": "text",
            "required": true,
            "description": "Stakeholder mapping"
        },
        {
            "name": "engagement_levels",
            "type": "array",
            "required": true,
            "description": "Engagement levels"
        },
        {
            "name": "engagement_strategies",
            "type": "array",
            "required": true,
            "description": "Engagement strategies"
        },
        {
            "name": "communication_plan",
            "type": "text",
            "required": true,
            "description": "Communication plan"
        },
        {
            "name": "issue_management",
            "type": "text",
            "required": true,
            "description": "Issue management process"
        },
        {
            "name": "change_management",
            "type": "text",
            "required": true,
            "description": "Change management process"
        },
        {
            "name": "performance_monitoring",
            "type": "text",
            "required": true,
            "description": "Performance monitoring process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'PMBOK Templates Migration Completed Successfully!' as status;
SELECT COUNT(*) as total_pmbok_templates FROM templates WHERE framework = 'PMBOK';


