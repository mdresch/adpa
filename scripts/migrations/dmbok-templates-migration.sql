-- DMBOK Knowledge Areas Templates Migration
-- Creates templates for all 11 DMBOK knowledge areas with their key deliverables

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 1: DATA GOVERNANCE
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Governance Plan',
    'Comprehensive data governance plan covering governance framework, policies, standards, and organizational structure',
    'DMBOK',
    'Data Governance',
    '{
        "sections": [
            {
                "id": "governance_overview",
                "title": "Data Governance Overview",
                "content": "## Data Governance Overview\n\nThis plan defines how data governance will be established, implemented, and maintained to ensure data assets are managed effectively and consistently.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Chief Data Officer**: {{chief_data_officer}}\n**Governance Approach**: {{governance_approach}}\n**Implementation Start Date**: {{implementation_start_date}}\n**Target Completion Date**: {{target_completion_date}}\n\n### Governance Objectives\n{{#each governance_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "governance_framework",
                "title": "Governance Framework",
                "content": "## Governance Framework\n\n### Governance Model\n{{governance_model}}\n\n### Governance Principles\n{{#each governance_principles}}\n- {{this}}\n{{/each}}\n\n### Governance Scope\n{{governance_scope}}\n\n### Governance Boundaries\n{{governance_boundaries}}",
                "required": true
            },
            {
                "id": "organizational_structure",
                "title": "Organizational Structure",
                "content": "## Organizational Structure\n\n### Governance Bodies\n{{#each governance_bodies}}\n**{{this.body_name}}**\n- Purpose: {{this.purpose}}\n- Members: {{this.members}}\n- Responsibilities: {{this.responsibilities}}\n- Meeting Frequency: {{this.meeting_frequency}}\n- Decision Authority: {{this.decision_authority}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "policies_standards",
                "title": "Policies and Standards",
                "content": "## Policies and Standards\n\n### Data Policies\n{{#each data_policies}}\n**{{this.policy_name}}**\n- Purpose: {{this.purpose}}\n- Scope: {{this.scope}}\n- Requirements: {{this.requirements}}\n- Compliance: {{this.compliance}}\n- Owner: {{this.owner}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "data_quality_management",
                "title": "Data Quality Management",
                "content": "## Data Quality Management\n\n### Quality Framework\n{{quality_framework}}\n\n### Quality Dimensions\n{{#each quality_dimensions}}\n- **{{this.dimension}}**: {{this.description}} ({{this.measurement_method}})\n{{/each}}\n\n### Quality Standards\n{{quality_standards}}\n\n### Quality Monitoring\n{{quality_monitoring}}",
                "required": true
            },
            {
                "id": "compliance_management",
                "title": "Compliance Management",
                "content": "## Compliance Management\n\n### Regulatory Requirements\n{{#each regulatory_requirements}}\n- **{{this.regulation}}**: {{this.requirements}} ({{this.compliance_date}})\n{{/each}}\n\n### Compliance Framework\n{{compliance_framework}}\n\n### Audit Process\n{{audit_process}}\n\n### Risk Management\n{{risk_management}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "chief_data_officer",
            "type": "text",
            "required": true,
            "description": "Name of the Chief Data Officer"
        },
        {
            "name": "governance_approach",
            "type": "text",
            "required": true,
            "description": "Data governance approach"
        },
        {
            "name": "implementation_start_date",
            "type": "date",
            "required": true,
            "description": "Implementation start date"
        },
        {
            "name": "target_completion_date",
            "type": "date",
            "required": true,
            "description": "Target completion date"
        },
        {
            "name": "governance_objectives",
            "type": "array",
            "required": true,
            "description": "Data governance objectives"
        },
        {
            "name": "governance_model",
            "type": "text",
            "required": true,
            "description": "Governance model"
        },
        {
            "name": "governance_principles",
            "type": "array",
            "required": true,
            "description": "Governance principles"
        },
        {
            "name": "governance_scope",
            "type": "text",
            "required": true,
            "description": "Governance scope"
        },
        {
            "name": "governance_boundaries",
            "type": "text",
            "required": true,
            "description": "Governance boundaries"
        },
        {
            "name": "governance_bodies",
            "type": "array",
            "required": true,
            "description": "Governance bodies and structure"
        },
        {
            "name": "data_policies",
            "type": "array",
            "required": true,
            "description": "Data policies"
        },
        {
            "name": "quality_framework",
            "type": "text",
            "required": true,
            "description": "Data quality framework"
        },
        {
            "name": "quality_dimensions",
            "type": "array",
            "required": true,
            "description": "Data quality dimensions"
        },
        {
            "name": "quality_standards",
            "type": "text",
            "required": true,
            "description": "Data quality standards"
        },
        {
            "name": "quality_monitoring",
            "type": "text",
            "required": true,
            "description": "Quality monitoring process"
        },
        {
            "name": "regulatory_requirements",
            "type": "array",
            "required": true,
            "description": "Regulatory requirements"
        },
        {
            "name": "compliance_framework",
            "type": "text",
            "required": true,
            "description": "Compliance framework"
        },
        {
            "name": "audit_process",
            "type": "text",
            "required": true,
            "description": "Audit process"
        },
        {
            "name": "risk_management",
            "type": "text",
            "required": true,
            "description": "Risk management process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 2: DATA ARCHITECTURE
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Architecture Plan',
    'Comprehensive data architecture plan covering data modeling, data integration, and architectural standards',
    'DMBOK',
    'Data Architecture',
    '{
        "sections": [
            {
                "id": "architecture_overview",
                "title": "Data Architecture Overview",
                "content": "## Data Architecture Overview\n\nThis plan defines how data architecture will be designed, implemented, and maintained to support organizational data needs.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Data Architect**: {{data_architect}}\n**Architecture Approach**: {{architecture_approach}}\n\n### Architecture Objectives\n{{#each architecture_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "data_modeling",
                "title": "Data Modeling",
                "content": "## Data Modeling\n\n### Modeling Approach\n{{modeling_approach}}\n\n### Data Models\n{{#each data_models}}\n**{{this.model_name}}**\n- Type: {{this.model_type}}\n- Purpose: {{this.purpose}}\n- Scope: {{this.scope}}\n- Entities: {{this.entities}}\n- Relationships: {{this.relationships}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "data_integration",
                "title": "Data Integration",
                "content": "## Data Integration\n\n### Integration Strategy\n{{integration_strategy}}\n\n### Integration Patterns\n{{#each integration_patterns}}\n- **{{this.pattern_name}}**: {{this.description}} ({{this.use_case}})\n{{/each}}\n\n### Data Flow Architecture\n{{data_flow_architecture}}\n\n### ETL/ELT Processes\n{{etl_processes}}",
                "required": true
            },
            {
                "id": "data_standards",
                "title": "Data Standards",
                "content": "## Data Standards\n\n### Naming Conventions\n{{naming_conventions}}\n\n### Data Classification\n{{#each data_classifications}}\n- **{{this.classification}}**: {{this.description}} ({{this.handling_requirements}})\n{{/each}}\n\n### Metadata Standards\n{{metadata_standards}}\n\n### Data Dictionary\n{{data_dictionary}}",
                "required": true
            },
            {
                "id": "technology_stack",
                "title": "Technology Stack",
                "content": "## Technology Stack\n\n### Database Technologies\n{{#each database_technologies}}\n- **{{this.technology}}**: {{this.purpose}} ({{this.vendor}})\n{{/each}}\n\n### Integration Tools\n{{#each integration_tools}}\n- **{{this.tool}}**: {{this.purpose}} ({{this.vendor}})\n{{/each}}\n\n### Architecture Patterns\n{{architecture_patterns}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "data_architect",
            "type": "text",
            "required": true,
            "description": "Name of the Data Architect"
        },
        {
            "name": "architecture_approach",
            "type": "text",
            "required": true,
            "description": "Data architecture approach"
        },
        {
            "name": "architecture_objectives",
            "type": "array",
            "required": true,
            "description": "Data architecture objectives"
        },
        {
            "name": "modeling_approach",
            "type": "text",
            "required": true,
            "description": "Data modeling approach"
        },
        {
            "name": "data_models",
            "type": "array",
            "required": true,
            "description": "Data models"
        },
        {
            "name": "integration_strategy",
            "type": "text",
            "required": true,
            "description": "Data integration strategy"
        },
        {
            "name": "integration_patterns",
            "type": "array",
            "required": true,
            "description": "Data integration patterns"
        },
        {
            "name": "data_flow_architecture",
            "type": "text",
            "required": true,
            "description": "Data flow architecture"
        },
        {
            "name": "etl_processes",
            "type": "text",
            "required": true,
            "description": "ETL/ELT processes"
        },
        {
            "name": "naming_conventions",
            "type": "text",
            "required": true,
            "description": "Naming conventions"
        },
        {
            "name": "data_classifications",
            "type": "array",
            "required": true,
            "description": "Data classifications"
        },
        {
            "name": "metadata_standards",
            "type": "text",
            "required": true,
            "description": "Metadata standards"
        },
        {
            "name": "data_dictionary",
            "type": "text",
            "required": true,
            "description": "Data dictionary"
        },
        {
            "name": "database_technologies",
            "type": "array",
            "required": true,
            "description": "Database technologies"
        },
        {
            "name": "integration_tools",
            "type": "array",
            "required": true,
            "description": "Integration tools"
        },
        {
            "name": "architecture_patterns",
            "type": "text",
            "required": true,
            "description": "Architecture patterns"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 3: DATA MODELING AND DESIGN
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Modeling and Design Plan',
    'Comprehensive data modeling and design plan covering conceptual, logical, and physical data models',
    'DMBOK',
    'Data Modeling and Design',
    '{
        "sections": [
            {
                "id": "modeling_overview",
                "title": "Data Modeling Overview",
                "content": "## Data Modeling Overview\n\nThis plan defines how data models will be created, maintained, and evolved to support business requirements and system design.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Data Modeler**: {{data_modeler}}\n**Modeling Approach**: {{modeling_approach}}\n\n### Modeling Objectives\n{{#each modeling_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "conceptual_modeling",
                "title": "Conceptual Data Modeling",
                "content": "## Conceptual Data Modeling\n\n### Business Requirements\n{{business_requirements}}\n\n### Conceptual Models\n{{#each conceptual_models}}\n**{{this.model_name}}**\n- Purpose: {{this.purpose}}\n- Business Domain: {{this.business_domain}}\n- Key Entities: {{this.key_entities}}\n- Business Rules: {{this.business_rules}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "logical_modeling",
                "title": "Logical Data Modeling",
                "content": "## Logical Data Modeling\n\n### Logical Models\n{{#each logical_models}}\n**{{this.model_name}}**\n- Purpose: {{this.purpose}}\n- Entities: {{this.entities}}\n- Attributes: {{this.attributes}}\n- Relationships: {{this.relationships}}\n- Constraints: {{this.constraints}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "physical_modeling",
                "title": "Physical Data Modeling",
                "content": "## Physical Data Modeling\n\n### Physical Models\n{{#each physical_models}}\n**{{this.model_name}}**\n- Database: {{this.database}}\n- Tables: {{this.tables}}\n- Indexes: {{this.indexes}}\n- Constraints: {{this.constraints}}\n- Performance Considerations: {{this.performance_considerations}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "model_management",
                "title": "Model Management",
                "content": "## Model Management\n\n### Version Control\n{{version_control}}\n\n### Model Governance\n{{model_governance}}\n\n### Change Management\n{{change_management}}\n\n### Model Documentation\n{{model_documentation}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "data_modeler",
            "type": "text",
            "required": true,
            "description": "Name of the Data Modeler"
        },
        {
            "name": "modeling_approach",
            "type": "text",
            "required": true,
            "description": "Data modeling approach"
        },
        {
            "name": "modeling_objectives",
            "type": "array",
            "required": true,
            "description": "Data modeling objectives"
        },
        {
            "name": "business_requirements",
            "type": "text",
            "required": true,
            "description": "Business requirements"
        },
        {
            "name": "conceptual_models",
            "type": "array",
            "required": true,
            "description": "Conceptual data models"
        },
        {
            "name": "logical_models",
            "type": "array",
            "required": true,
            "description": "Logical data models"
        },
        {
            "name": "physical_models",
            "type": "array",
            "required": true,
            "description": "Physical data models"
        },
        {
            "name": "version_control",
            "type": "text",
            "required": true,
            "description": "Version control process"
        },
        {
            "name": "model_governance",
            "type": "text",
            "required": true,
            "description": "Model governance process"
        },
        {
            "name": "change_management",
            "type": "text",
            "required": true,
            "description": "Change management process"
        },
        {
            "name": "model_documentation",
            "type": "text",
            "required": true,
            "description": "Model documentation standards"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 4: DATA STORAGE AND OPERATIONS
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Storage and Operations Plan',
    'Comprehensive data storage and operations plan covering database administration, backup, recovery, and performance management',
    'DMBOK',
    'Data Storage and Operations',
    '{
        "sections": [
            {
                "id": "storage_overview",
                "title": "Data Storage Overview",
                "content": "## Data Storage Overview\n\nThis plan defines how data storage and operations will be managed to ensure data availability, performance, and security.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Database Administrator**: {{database_administrator}}\n**Storage Approach**: {{storage_approach}}\n\n### Storage Objectives\n{{#each storage_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "database_administration",
                "title": "Database Administration",
                "content": "## Database Administration\n\n### Administration Framework\n{{administration_framework}}\n\n### Database Environments\n{{#each database_environments}}\n**{{this.environment_name}}**\n- Purpose: {{this.purpose}}\n- Database Type: {{this.database_type}}\n- Configuration: {{this.configuration}}\n- Maintenance Schedule: {{this.maintenance_schedule}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "backup_recovery",
                "title": "Backup and Recovery",
                "content": "## Backup and Recovery\n\n### Backup Strategy\n{{backup_strategy}}\n\n### Backup Procedures\n{{#each backup_procedures}}\n**{{this.backup_type}}**\n- Frequency: {{this.frequency}}\n- Retention: {{this.retention}}\n- Storage Location: {{this.storage_location}}\n- Testing Schedule: {{this.testing_schedule}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "performance_management",
                "title": "Performance Management",
                "content": "## Performance Management\n\n### Performance Monitoring\n{{performance_monitoring}}\n\n### Performance Metrics\n{{#each performance_metrics}}\n- **{{this.metric_name}}**: {{this.target}} ({{this.measurement_method}})\n{{/each}}\n\n### Optimization Strategies\n{{optimization_strategies}}\n\n### Capacity Planning\n{{capacity_planning}}",
                "required": true
            },
            {
                "id": "security_management",
                "title": "Security Management",
                "content": "## Security Management\n\n### Security Framework\n{{security_framework}}\n\n### Access Control\n{{access_control}}\n\n### Encryption Standards\n{{encryption_standards}}\n\n### Security Monitoring\n{{security_monitoring}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "database_administrator",
            "type": "text",
            "required": true,
            "description": "Name of the Database Administrator"
        },
        {
            "name": "storage_approach",
            "type": "text",
            "required": true,
            "description": "Data storage approach"
        },
        {
            "name": "storage_objectives",
            "type": "array",
            "required": true,
            "description": "Data storage objectives"
        },
        {
            "name": "administration_framework",
            "type": "text",
            "required": true,
            "description": "Database administration framework"
        },
        {
            "name": "database_environments",
            "type": "array",
            "required": true,
            "description": "Database environments"
        },
        {
            "name": "backup_strategy",
            "type": "text",
            "required": true,
            "description": "Backup strategy"
        },
        {
            "name": "backup_procedures",
            "type": "array",
            "required": true,
            "description": "Backup procedures"
        },
        {
            "name": "performance_monitoring",
            "type": "text",
            "required": true,
            "description": "Performance monitoring process"
        },
        {
            "name": "performance_metrics",
            "type": "array",
            "required": true,
            "description": "Performance metrics"
        },
        {
            "name": "optimization_strategies",
            "type": "text",
            "required": true,
            "description": "Optimization strategies"
        },
        {
            "name": "capacity_planning",
            "type": "text",
            "required": true,
            "description": "Capacity planning process"
        },
        {
            "name": "security_framework",
            "type": "text",
            "required": true,
            "description": "Security framework"
        },
        {
            "name": "access_control",
            "type": "text",
            "required": true,
            "description": "Access control procedures"
        },
        {
            "name": "encryption_standards",
            "type": "text",
            "required": true,
            "description": "Encryption standards"
        },
        {
            "name": "security_monitoring",
            "type": "text",
            "required": true,
            "description": "Security monitoring process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 5: DATA SECURITY
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Security Plan',
    'Comprehensive data security plan covering data protection, access control, and security monitoring',
    'DMBOK',
    'Data Security',
    '{
        "sections": [
            {
                "id": "security_overview",
                "title": "Data Security Overview",
                "content": "## Data Security Overview\n\nThis plan defines how data security will be implemented and maintained to protect sensitive data assets.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Chief Information Security Officer**: {{ciso}}\n**Security Approach**: {{security_approach}}\n\n### Security Objectives\n{{#each security_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "data_classification",
                "title": "Data Classification",
                "content": "## Data Classification\n\n### Classification Framework\n{{classification_framework}}\n\n### Data Categories\n{{#each data_categories}}\n**{{this.category_name}}**\n- Classification Level: {{this.classification_level}}\n- Sensitivity: {{this.sensitivity}}\n- Handling Requirements: {{this.handling_requirements}}\n- Retention Period: {{this.retention_period}}\n- Disposal Method: {{this.disposal_method}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "access_control",
                "title": "Access Control",
                "content": "## Access Control\n\n### Access Control Model\n{{access_control_model}}\n\n### User Management\n{{user_management}}\n\n### Role-Based Access Control\n{{#each rbac_roles}}\n**{{this.role_name}}**\n- Description: {{this.description}}\n- Permissions: {{this.permissions}}\n- Data Access: {{this.data_access}}\n- Approval Process: {{this.approval_process}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "data_protection",
                "title": "Data Protection",
                "content": "## Data Protection\n\n### Encryption Standards\n{{encryption_standards}}\n\n### Data Masking\n{{data_masking}}\n\n### Anonymization\n{{anonymization}}\n\n### Data Loss Prevention\n{{data_loss_prevention}}",
                "required": true
            },
            {
                "id": "security_monitoring",
                "title": "Security Monitoring",
                "content": "## Security Monitoring\n\n### Monitoring Framework\n{{monitoring_framework}}\n\n### Security Metrics\n{{#each security_metrics}}\n- **{{this.metric_name}}**: {{this.target}} ({{this.measurement_method}})\n{{/each}}\n\n### Incident Response\n{{incident_response}}\n\n### Security Audits\n{{security_audits}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "ciso",
            "type": "text",
            "required": true,
            "description": "Name of the Chief Information Security Officer"
        },
        {
            "name": "security_approach",
            "type": "text",
            "required": true,
            "description": "Data security approach"
        },
        {
            "name": "security_objectives",
            "type": "array",
            "required": true,
            "description": "Data security objectives"
        },
        {
            "name": "classification_framework",
            "type": "text",
            "required": true,
            "description": "Data classification framework"
        },
        {
            "name": "data_categories",
            "type": "array",
            "required": true,
            "description": "Data categories and classifications"
        },
        {
            "name": "access_control_model",
            "type": "text",
            "required": true,
            "description": "Access control model"
        },
        {
            "name": "user_management",
            "type": "text",
            "required": true,
            "description": "User management process"
        },
        {
            "name": "rbac_roles",
            "type": "array",
            "required": true,
            "description": "Role-based access control roles"
        },
        {
            "name": "encryption_standards",
            "type": "text",
            "required": true,
            "description": "Encryption standards"
        },
        {
            "name": "data_masking",
            "type": "text",
            "required": true,
            "description": "Data masking procedures"
        },
        {
            "name": "anonymization",
            "type": "text",
            "required": true,
            "description": "Data anonymization procedures"
        },
        {
            "name": "data_loss_prevention",
            "type": "text",
            "required": true,
            "description": "Data loss prevention measures"
        },
        {
            "name": "monitoring_framework",
            "type": "text",
            "required": true,
            "description": "Security monitoring framework"
        },
        {
            "name": "security_metrics",
            "type": "array",
            "required": true,
            "description": "Security metrics"
        },
        {
            "name": "incident_response",
            "type": "text",
            "required": true,
            "description": "Incident response process"
        },
        {
            "name": "security_audits",
            "type": "text",
            "required": true,
            "description": "Security audit process"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 6: DATA INTEGRATION AND INTEROPERABILITY
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Integration and Interoperability Plan',
    'Comprehensive data integration and interoperability plan covering ETL processes, data synchronization, and API management',
    'DMBOK',
    'Data Integration and Interoperability',
    '{
        "sections": [
            {
                "id": "integration_overview",
                "title": "Data Integration Overview",
                "content": "## Data Integration Overview\n\nThis plan defines how data integration and interoperability will be implemented to ensure seamless data flow across systems.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Integration Architect**: {{integration_architect}}\n**Integration Approach**: {{integration_approach}}\n\n### Integration Objectives\n{{#each integration_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "integration_strategy",
                "title": "Integration Strategy",
                "content": "## Integration Strategy\n\n### Integration Patterns\n{{#each integration_patterns}}\n**{{this.pattern_name}}**\n- Description: {{this.description}}\n- Use Case: {{this.use_case}}\n- Technology: {{this.technology}}\n- Benefits: {{this.benefits}}\n- Considerations: {{this.considerations}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "etl_processes",
                "title": "ETL Processes",
                "content": "## ETL Processes\n\n### ETL Framework\n{{etl_framework}}\n\n### ETL Jobs\n{{#each etl_jobs}}\n**{{this.job_name}}**\n- Source: {{this.source}}\n- Target: {{this.target}}\n- Frequency: {{this.frequency}}\n- Dependencies: {{this.dependencies}}\n- Error Handling: {{this.error_handling}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "data_synchronization",
                "title": "Data Synchronization",
                "content": "## Data Synchronization\n\n### Synchronization Strategy\n{{synchronization_strategy}}\n\n### Real-time Integration\n{{real_time_integration}}\n\n### Batch Processing\n{{batch_processing}}\n\n### Data Consistency\n{{data_consistency}}",
                "required": true
            },
            {
                "id": "api_management",
                "title": "API Management",
                "content": "## API Management\n\n### API Strategy\n{{api_strategy}}\n\n### API Standards\n{{api_standards}}\n\n### API Governance\n{{api_governance}}\n\n### API Security\n{{api_security}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "integration_architect",
            "type": "text",
            "required": true,
            "description": "Name of the Integration Architect"
        },
        {
            "name": "integration_approach",
            "type": "text",
            "required": true,
            "description": "Data integration approach"
        },
        {
            "name": "integration_objectives",
            "type": "array",
            "required": true,
            "description": "Data integration objectives"
        },
        {
            "name": "integration_patterns",
            "type": "array",
            "required": true,
            "description": "Data integration patterns"
        },
        {
            "name": "etl_framework",
            "type": "text",
            "required": true,
            "description": "ETL framework"
        },
        {
            "name": "etl_jobs",
            "type": "array",
            "required": true,
            "description": "ETL jobs and processes"
        },
        {
            "name": "synchronization_strategy",
            "type": "text",
            "required": true,
            "description": "Data synchronization strategy"
        },
        {
            "name": "real_time_integration",
            "type": "text",
            "required": true,
            "description": "Real-time integration approach"
        },
        {
            "name": "batch_processing",
            "type": "text",
            "required": true,
            "description": "Batch processing approach"
        },
        {
            "name": "data_consistency",
            "type": "text",
            "required": true,
            "description": "Data consistency measures"
        },
        {
            "name": "api_strategy",
            "type": "text",
            "required": true,
            "description": "API strategy"
        },
        {
            "name": "api_standards",
            "type": "text",
            "required": true,
            "description": "API standards"
        },
        {
            "name": "api_governance",
            "type": "text",
            "required": true,
            "description": "API governance"
        },
        {
            "name": "api_security",
            "type": "text",
            "required": true,
            "description": "API security measures"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 7: DOCUMENT AND CONTENT MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Document and Content Management Plan',
    'Comprehensive document and content management plan covering content lifecycle, metadata management, and search capabilities',
    'DMBOK',
    'Document and Content Management',
    '{
        "sections": [
            {
                "id": "content_overview",
                "title": "Content Management Overview",
                "content": "## Content Management Overview\n\nThis plan defines how documents and content will be managed throughout their lifecycle to ensure accessibility and usability.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Content Manager**: {{content_manager}}\n**Content Management Approach**: {{content_management_approach}}\n\n### Content Management Objectives\n{{#each content_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "content_lifecycle",
                "title": "Content Lifecycle",
                "content": "## Content Lifecycle\n\n### Lifecycle Stages\n{{#each lifecycle_stages}}\n**{{this.stage_name}}**\n- Description: {{this.description}}\n- Activities: {{this.activities}}\n- Duration: {{this.duration}}\n- Responsible Party: {{this.responsible_party}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "metadata_management",
                "title": "Metadata Management",
                "content": "## Metadata Management\n\n### Metadata Framework\n{{metadata_framework}}\n\n### Metadata Standards\n{{#each metadata_standards}}\n- **{{this.standard_name}}**: {{this.description}} ({{this.applicability}})\n{{/each}}\n\n### Metadata Governance\n{{metadata_governance}}\n\n### Metadata Quality\n{{metadata_quality}}",
                "required": true
            },
            {
                "id": "search_retrieval",
                "title": "Search and Retrieval",
                "content": "## Search and Retrieval\n\n### Search Strategy\n{{search_strategy}}\n\n### Search Capabilities\n{{#each search_capabilities}}\n- **{{this.capability_name}}**: {{this.description}} ({{this.technology}})\n{{/each}}\n\n### Indexing Strategy\n{{indexing_strategy}}\n\n### Retrieval Performance\n{{retrieval_performance}}",
                "required": true
            },
            {
                "id": "content_governance",
                "title": "Content Governance",
                "content": "## Content Governance\n\n### Governance Framework\n{{governance_framework}}\n\n### Content Policies\n{{#each content_policies}}\n**{{this.policy_name}}**\n- Purpose: {{this.purpose}}\n- Scope: {{this.scope}}\n- Requirements: {{this.requirements}}\n- Compliance: {{this.compliance}}\n\n{{/each}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "content_manager",
            "type": "text",
            "required": true,
            "description": "Name of the Content Manager"
        },
        {
            "name": "content_management_approach",
            "type": "text",
            "required": true,
            "description": "Content management approach"
        },
        {
            "name": "content_objectives",
            "type": "array",
            "required": true,
            "description": "Content management objectives"
        },
        {
            "name": "lifecycle_stages",
            "type": "array",
            "required": true,
            "description": "Content lifecycle stages"
        },
        {
            "name": "metadata_framework",
            "type": "text",
            "required": true,
            "description": "Metadata framework"
        },
        {
            "name": "metadata_standards",
            "type": "array",
            "required": true,
            "description": "Metadata standards"
        },
        {
            "name": "metadata_governance",
            "type": "text",
            "required": true,
            "description": "Metadata governance"
        },
        {
            "name": "metadata_quality",
            "type": "text",
            "required": true,
            "description": "Metadata quality measures"
        },
        {
            "name": "search_strategy",
            "type": "text",
            "required": true,
            "description": "Search strategy"
        },
        {
            "name": "search_capabilities",
            "type": "array",
            "required": true,
            "description": "Search capabilities"
        },
        {
            "name": "indexing_strategy",
            "type": "text",
            "required": true,
            "description": "Indexing strategy"
        },
        {
            "name": "retrieval_performance",
            "type": "text",
            "required": true,
            "description": "Retrieval performance measures"
        },
        {
            "name": "governance_framework",
            "type": "text",
            "required": true,
            "description": "Content governance framework"
        },
        {
            "name": "content_policies",
            "type": "array",
            "required": true,
            "description": "Content policies"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 8: REFERENCE AND MASTER DATA
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Reference and Master Data Management Plan',
    'Comprehensive reference and master data management plan covering data standardization, data quality, and data governance',
    'DMBOK',
    'Reference and Master Data',
    '{
        "sections": [
            {
                "id": "master_data_overview",
                "title": "Master Data Overview",
                "content": "## Master Data Overview\n\nThis plan defines how reference and master data will be managed to ensure consistency and accuracy across the organization.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Master Data Manager**: {{master_data_manager}}\n**Master Data Approach**: {{master_data_approach}}\n\n### Master Data Objectives\n{{#each master_data_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "data_identification",
                "title": "Data Identification",
                "content": "## Data Identification\n\n### Master Data Domains\n{{#each master_data_domains}}\n**{{this.domain_name}}**\n- Description: {{this.description}}\n- Key Entities: {{this.key_entities}}\n- Business Value: {{this.business_value}}\n- Data Sources: {{this.data_sources}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "data_standardization",
                "title": "Data Standardization",
                "content": "## Data Standardization\n\n### Standardization Framework\n{{standardization_framework}}\n\n### Data Standards\n{{#each data_standards}}\n**{{this.standard_name}}**\n- Purpose: {{this.purpose}}\n- Format: {{this.format}}\n- Validation Rules: {{this.validation_rules}}\n- Maintenance: {{this.maintenance}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "data_quality",
                "title": "Data Quality",
                "content": "## Data Quality\n\n### Quality Framework\n{{quality_framework}}\n\n### Quality Dimensions\n{{#each quality_dimensions}}\n- **{{this.dimension}}**: {{this.description}} ({{this.measurement_method}})\n{{/each}}\n\n### Quality Monitoring\n{{quality_monitoring}}\n\n### Quality Improvement\n{{quality_improvement}}",
                "required": true
            },
            {
                "id": "data_governance",
                "title": "Data Governance",
                "content": "## Data Governance\n\n### Governance Framework\n{{governance_framework}}\n\n### Data Stewardship\n{{#each data_stewards}}\n**{{this.steward_name}}**\n- Domain: {{this.domain}}\n- Responsibilities: {{this.responsibilities}}\n- Authority: {{this.authority}}\n- Contact: {{this.contact}}\n\n{{/each}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "master_data_manager",
            "type": "text",
            "required": true,
            "description": "Name of the Master Data Manager"
        },
        {
            "name": "master_data_approach",
            "type": "text",
            "required": true,
            "description": "Master data management approach"
        },
        {
            "name": "master_data_objectives",
            "type": "array",
            "required": true,
            "description": "Master data management objectives"
        },
        {
            "name": "master_data_domains",
            "type": "array",
            "required": true,
            "description": "Master data domains"
        },
        {
            "name": "standardization_framework",
            "type": "text",
            "required": true,
            "description": "Data standardization framework"
        },
        {
            "name": "data_standards",
            "type": "array",
            "required": true,
            "description": "Data standards"
        },
        {
            "name": "quality_framework",
            "type": "text",
            "required": true,
            "description": "Data quality framework"
        },
        {
            "name": "quality_dimensions",
            "type": "array",
            "required": true,
            "description": "Data quality dimensions"
        },
        {
            "name": "quality_monitoring",
            "type": "text",
            "required": true,
            "description": "Quality monitoring process"
        },
        {
            "name": "quality_improvement",
            "type": "text",
            "required": true,
            "description": "Quality improvement process"
        },
        {
            "name": "governance_framework",
            "type": "text",
            "required": true,
            "description": "Data governance framework"
        },
        {
            "name": "data_stewards",
            "type": "array",
            "required": true,
            "description": "Data stewards"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 9: DATA WAREHOUSING AND BUSINESS INTELLIGENCE
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Warehousing and Business Intelligence Plan',
    'Comprehensive data warehousing and BI plan covering data warehouse design, ETL processes, and analytics capabilities',
    'DMBOK',
    'Data Warehousing and Business Intelligence',
    '{
        "sections": [
            {
                "id": "bi_overview",
                "title": "Business Intelligence Overview",
                "content": "## Business Intelligence Overview\n\nThis plan defines how data warehousing and business intelligence capabilities will be implemented to support organizational decision-making.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**BI Manager**: {{bi_manager}}\n**BI Approach**: {{bi_approach}}\n\n### BI Objectives\n{{#each bi_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "data_warehouse_design",
                "title": "Data Warehouse Design",
                "content": "## Data Warehouse Design\n\n### Architecture Approach\n{{architecture_approach}}\n\n### Data Warehouse Layers\n{{#each warehouse_layers}}\n**{{this.layer_name}}**\n- Purpose: {{this.purpose}}\n- Data Sources: {{this.data_sources}}\n- Data Types: {{this.data_types}}\n- Processing: {{this.processing}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "etl_processes",
                "title": "ETL Processes",
                "content": "## ETL Processes\n\n### ETL Framework\n{{etl_framework}}\n\n### ETL Jobs\n{{#each etl_jobs}}\n**{{this.job_name}}**\n- Source: {{this.source}}\n- Target: {{this.target}}\n- Frequency: {{this.frequency}}\n- Dependencies: {{this.dependencies}}\n- Error Handling: {{this.error_handling}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "analytics_capabilities",
                "title": "Analytics Capabilities",
                "content": "## Analytics Capabilities\n\n### Analytics Framework\n{{analytics_framework}}\n\n### Analytics Types\n{{#each analytics_types}}\n**{{this.analytics_type}}**\n- Purpose: {{this.purpose}}\n- Technology: {{this.technology}}\n- Users: {{this.users}}\n- Deliverables: {{this.deliverables}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "reporting_dashboard",
                "title": "Reporting and Dashboards",
                "content": "## Reporting and Dashboards\n\n### Reporting Strategy\n{{reporting_strategy}}\n\n### Dashboard Framework\n{{dashboard_framework}}\n\n### Report Types\n{{#each report_types}}\n- **{{this.report_type}}**: {{this.description}} ({{this.frequency}})\n{{/each}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "bi_manager",
            "type": "text",
            "required": true,
            "description": "Name of the BI Manager"
        },
        {
            "name": "bi_approach",
            "type": "text",
            "required": true,
            "description": "Business intelligence approach"
        },
        {
            "name": "bi_objectives",
            "type": "array",
            "required": true,
            "description": "BI objectives"
        },
        {
            "name": "architecture_approach",
            "type": "text",
            "required": true,
            "description": "Data warehouse architecture approach"
        },
        {
            "name": "warehouse_layers",
            "type": "array",
            "required": true,
            "description": "Data warehouse layers"
        },
        {
            "name": "etl_framework",
            "type": "text",
            "required": true,
            "description": "ETL framework"
        },
        {
            "name": "etl_jobs",
            "type": "array",
            "required": true,
            "description": "ETL jobs and processes"
        },
        {
            "name": "analytics_framework",
            "type": "text",
            "required": true,
            "description": "Analytics framework"
        },
        {
            "name": "analytics_types",
            "type": "array",
            "required": true,
            "description": "Analytics types"
        },
        {
            "name": "reporting_strategy",
            "type": "text",
            "required": true,
            "description": "Reporting strategy"
        },
        {
            "name": "dashboard_framework",
            "type": "text",
            "required": true,
            "description": "Dashboard framework"
        },
        {
            "name": "report_types",
            "type": "array",
            "required": true,
            "description": "Report types"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 10: METADATA MANAGEMENT
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Metadata Management Plan',
    'Comprehensive metadata management plan covering metadata strategy, standards, and governance',
    'DMBOK',
    'Metadata Management',
    '{
        "sections": [
            {
                "id": "metadata_overview",
                "title": "Metadata Management Overview",
                "content": "## Metadata Management Overview\n\nThis plan defines how metadata will be managed to ensure data assets are properly documented and discoverable.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Metadata Manager**: {{metadata_manager}}\n**Metadata Approach**: {{metadata_approach}}\n\n### Metadata Objectives\n{{#each metadata_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "metadata_strategy",
                "title": "Metadata Strategy",
                "content": "## Metadata Strategy\n\n### Strategy Framework\n{{strategy_framework}}\n\n### Metadata Types\n{{#each metadata_types}}\n**{{this.metadata_type}}**\n- Description: {{this.description}}\n- Purpose: {{this.purpose}}\n- Scope: {{this.scope}}\n- Standards: {{this.standards}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "metadata_standards",
                "title": "Metadata Standards",
                "content": "## Metadata Standards\n\n### Standards Framework\n{{standards_framework}}\n\n### Metadata Schemas\n{{#each metadata_schemas}}\n**{{this.schema_name}}**\n- Purpose: {{this.purpose}}\n- Elements: {{this.elements}}\n- Usage: {{this.usage}}\n- Maintenance: {{this.maintenance}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "metadata_governance",
                "title": "Metadata Governance",
                "content": "## Metadata Governance\n\n### Governance Framework\n{{governance_framework}}\n\n### Metadata Stewardship\n{{#each metadata_stewards}}\n**{{this.steward_name}}**\n- Domain: {{this.domain}}\n- Responsibilities: {{this.responsibilities}}\n- Authority: {{this.authority}}\n- Contact: {{this.contact}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "metadata_tools",
                "title": "Metadata Tools",
                "content": "## Metadata Tools\n\n### Tool Strategy\n{{tool_strategy}}\n\n### Metadata Repository\n{{metadata_repository}}\n\n### Data Lineage Tools\n{{data_lineage_tools}}\n\n### Impact Analysis Tools\n{{impact_analysis_tools}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "metadata_manager",
            "type": "text",
            "required": true,
            "description": "Name of the Metadata Manager"
        },
        {
            "name": "metadata_approach",
            "type": "text",
            "required": true,
            "description": "Metadata management approach"
        },
        {
            "name": "metadata_objectives",
            "type": "array",
            "required": true,
            "description": "Metadata management objectives"
        },
        {
            "name": "strategy_framework",
            "type": "text",
            "required": true,
            "description": "Metadata strategy framework"
        },
        {
            "name": "metadata_types",
            "type": "array",
            "required": true,
            "description": "Metadata types"
        },
        {
            "name": "standards_framework",
            "type": "text",
            "required": true,
            "description": "Metadata standards framework"
        },
        {
            "name": "metadata_schemas",
            "type": "array",
            "required": true,
            "description": "Metadata schemas"
        },
        {
            "name": "governance_framework",
            "type": "text",
            "required": true,
            "description": "Metadata governance framework"
        },
        {
            "name": "metadata_stewards",
            "type": "array",
            "required": true,
            "description": "Metadata stewards"
        },
        {
            "name": "tool_strategy",
            "type": "text",
            "required": true,
            "description": "Metadata tool strategy"
        },
        {
            "name": "metadata_repository",
            "type": "text",
            "required": true,
            "description": "Metadata repository"
        },
        {
            "name": "data_lineage_tools",
            "type": "text",
            "required": true,
            "description": "Data lineage tools"
        },
        {
            "name": "impact_analysis_tools",
            "type": "text",
            "required": true,
            "description": "Impact analysis tools"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK KNOWLEDGE AREA 11: DATA QUALITY
-- ============================================================================

INSERT INTO templates (
    id, name, description, framework, category, content, variables, is_public, created_by
) VALUES (
    gen_random_uuid(),
    'Data Quality Management Plan',
    'Comprehensive data quality management plan covering quality assessment, monitoring, and improvement processes',
    'DMBOK',
    'Data Quality',
    '{
        "sections": [
            {
                "id": "quality_overview",
                "title": "Data Quality Overview",
                "content": "## Data Quality Overview\n\nThis plan defines how data quality will be assessed, monitored, and improved to ensure data assets meet organizational requirements.\n\n### Organization Information\n**Organization**: {{organization_name}}\n**Data Quality Manager**: {{data_quality_manager}}\n**Quality Approach**: {{quality_approach}}\n\n### Quality Objectives\n{{#each quality_objectives}}\n- {{this}}\n{{/each}}",
                "required": true
            },
            {
                "id": "quality_framework",
                "title": "Quality Framework",
                "content": "## Quality Framework\n\n### Quality Model\n{{quality_model}}\n\n### Quality Dimensions\n{{#each quality_dimensions}}\n**{{this.dimension_name}}**\n- Description: {{this.description}}\n- Measurement Method: {{this.measurement_method}}\n- Target: {{this.target}}\n- Threshold: {{this.threshold}}\n- Business Impact: {{this.business_impact}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "quality_assessment",
                "title": "Quality Assessment",
                "content": "## Quality Assessment\n\n### Assessment Approach\n{{assessment_approach}}\n\n### Assessment Methods\n{{#each assessment_methods}}\n- {{this}}\n{{/each}}\n\n### Quality Metrics\n{{#each quality_metrics}}\n- **{{this.metric_name}}**: {{this.target}} ({{this.measurement_method}})\n{{/each}}",
                "required": true
            },
            {
                "id": "quality_monitoring",
                "title": "Quality Monitoring",
                "content": "## Quality Monitoring\n\n### Monitoring Framework\n{{monitoring_framework}}\n\n### Monitoring Processes\n{{#each monitoring_processes}}\n**{{this.process_name}}**\n- Purpose: {{this.purpose}}\n- Frequency: {{this.frequency}}\n- Responsible Party: {{this.responsible_party}}\n- Escalation: {{this.escalation}}\n\n{{/each}}",
                "required": true
            },
            {
                "id": "quality_improvement",
                "title": "Quality Improvement",
                "content": "## Quality Improvement\n\n### Improvement Process\n{{improvement_process}}\n\n### Root Cause Analysis\n{{root_cause_analysis}}\n\n### Improvement Initiatives\n{{#each improvement_initiatives}}\n**{{this.initiative_name}}**\n- Description: {{this.description}}\n- Expected Impact: {{this.expected_impact}}\n- Timeline: {{this.timeline}}\n- Resources: {{this.resources}}\n- Success Metrics: {{this.success_metrics}}\n\n{{/each}}",
                "required": true
            }
        ],
        "metadata": {
            "version": "1.0",
            "last_updated": "2024-01-01",
            "author": "ADPA System",
            "methodology": "DMBOK 2",
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
            "name": "data_quality_manager",
            "type": "text",
            "required": true,
            "description": "Name of the Data Quality Manager"
        },
        {
            "name": "quality_approach",
            "type": "text",
            "required": true,
            "description": "Data quality approach"
        },
        {
            "name": "quality_objectives",
            "type": "array",
            "required": true,
            "description": "Data quality objectives"
        },
        {
            "name": "quality_model",
            "type": "text",
            "required": true,
            "description": "Data quality model"
        },
        {
            "name": "quality_dimensions",
            "type": "array",
            "required": true,
            "description": "Data quality dimensions"
        },
        {
            "name": "assessment_approach",
            "type": "text",
            "required": true,
            "description": "Quality assessment approach"
        },
        {
            "name": "assessment_methods",
            "type": "array",
            "required": true,
            "description": "Assessment methods"
        },
        {
            "name": "quality_metrics",
            "type": "array",
            "required": true,
            "description": "Quality metrics"
        },
        {
            "name": "monitoring_framework",
            "type": "text",
            "required": true,
            "description": "Quality monitoring framework"
        },
        {
            "name": "monitoring_processes",
            "type": "array",
            "required": true,
            "description": "Quality monitoring processes"
        },
        {
            "name": "improvement_process",
            "type": "text",
            "required": true,
            "description": "Quality improvement process"
        },
        {
            "name": "root_cause_analysis",
            "type": "text",
            "required": true,
            "description": "Root cause analysis process"
        },
        {
            "name": "improvement_initiatives",
            "type": "array",
            "required": true,
            "description": "Quality improvement initiatives"
        }
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1)
);

-- ============================================================================
-- DMBOK MIGRATION COMPLETE
-- ============================================================================

SELECT 'DMBOK Templates Migration Completed Successfully!' as status;
SELECT COUNT(*) as total_dmbok_templates FROM templates WHERE framework = 'DMBOK';


