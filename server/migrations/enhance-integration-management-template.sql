-- Enhanced Integration Management Plan Template
-- Updates the existing template with comprehensive, detailed structure
-- Based on PMBOK 7th Edition best practices

UPDATE templates 
SET 
  description = 'Comprehensive Integration Management Plan with detailed sections covering Executive Summary, Project Charter, all 9 Knowledge Area Management Plans, Integrated Change Control with CCB structure, and Work Performance Monitoring with KPIs - production-ready and stakeholder-presentable',
  content = '{
    "sections": [
      {
        "id": "executive_summary",
        "title": "Executive Summary",
        "description": "Comprehensive overview of project integration approach",
        "guidance": "Provide a complete summary with project overview, key objectives, integration approach, and expected benefits. Include project details, timeline, team, and strategic alignment.",
        "min_words": 200,
        "content_structure": [
          "Project Overview (name, manager, sponsor, dates, budget)",
          "Key Objectives (3-5 measurable objectives)",
          "Integration Approach",
          "Expected Benefits and ROI"
        ]
      },
      {
        "id": "project_charter",
        "title": "Project Charter",
        "description": "Formal project authorization document",
        "guidance": "Create a comprehensive charter including purpose, objectives (with success metrics), high-level requirements (functional, technical, performance), assumptions, constraints, stakeholders, and initial risks. Use tables for objectives and requirements.",
        "min_words": 400,
        "content_structure": [
          "Project Purpose and Business Justification",
          "Project Objectives (table with Objective | Description | Success Metric)",
          "Success Criteria (measurable)",
          "High-Level Requirements (categorized: Functional, Technical, Performance, Business)",
          "Assumptions and Constraints (lists)",
          "Key Stakeholders (table)",
          "Initial Risks (brief list)"
        ]
      },
      {
        "id": "project_management_plan",
        "title": "Project Management Plan",
        "description": "Comprehensive subsidiary plans for all knowledge areas",
        "guidance": "Develop detailed management approaches for ALL 9 PMBOK knowledge areas. Each subsection should be 150-250 words with specific processes, tools, and deliverables. Include tables for structured information.",
        "min_words": 800,
        "content_structure": [
          "2.1 Scope Management Plan (collection, definition, WBS, validation, control)",
          "2.2 Schedule Management Plan (activity definition, sequencing, estimation, development, control, milestones table)",
          "2.3 Cost Management Plan (estimation methods, budget categories table, cost baseline, EVM)",
          "2.4 Quality Management Plan (standards, QA activities, QC processes, metrics table)",
          "2.5 Resource Management Plan (team structure table, acquisition, development, management)",
          "2.6 Communications Management Plan (stakeholder analysis table, channels, schedule, tools)",
          "2.7 Risk Management Plan (identification, analysis, response strategies, top risks table)",
          "2.8 Procurement Management Plan (procurement items, vendor selection, contract management)",
          "2.9 Stakeholder Engagement Plan (stakeholder matrix table, engagement strategies)"
        ]
      },
      {
        "id": "integrated_change_control",
        "title": "Integrated Change Control",
        "description": "Comprehensive change management process",
        "guidance": "Detail the complete change control process including workflow (7 steps), CCB structure with roles, change request form fields, impact assessment criteria, and approval thresholds. Use numbered lists for process steps and tables for CCB members and approval criteria.",
        "min_words": 300,
        "content_structure": [
          "Change Control Process (7-step workflow with descriptions)",
          "Change Control Board (CCB) - Members table with Name | Role | Responsibilities",
          "Change Request Form (required fields list)",
          "Change Impact Assessment (criteria: scope, schedule, cost, quality, risk, resources)",
          "Change Approval Criteria (3 levels: PM authority, CCB approval, Sponsor approval with thresholds)"
        ]
      },
      {
        "id": "project_work_performance",
        "title": "Project Work Performance",
        "description": "Performance monitoring and reporting framework",
        "guidance": "Define comprehensive performance measurement with KPI table (at least 6 KPIs with targets), data collection methods, reporting cadence, and corrective action triggers/process. Include specific metrics for schedule, cost, quality, and stakeholder satisfaction.",
        "min_words": 300,
        "content_structure": [
          "Key Performance Indicators (KPI table: KPI | Target | Measurement | Frequency)",
          "Work Performance Data Collection (sources and methods)",
          "Performance Reporting (weekly status, monthly dashboard, formats)",
          "Corrective Actions (triggers, process, examples)"
        ]
      },
      {
        "id": "integration_points",
        "title": "Integration Points",
        "description": "System and process integration details",
        "guidance": "List all system integrations (technical) and process integrations (workflow) relevant to the project.",
        "min_words": 150,
        "content_structure": [
          "System Integrations (tools, APIs, platforms)",
          "Process Integrations (workflows, handoffs)"
        ]
      },
      {
        "id": "approval_signatures",
        "title": "Approval and Sign-off",
        "description": "Formal approval section",
        "guidance": "Provide signature table for key stakeholders and document version control.",
        "content_structure": [
          "Approval Table (Role | Name | Signature | Date)",
          "Document Version and Review Schedule"
        ]
      }
    ],
    "formatting_guidelines": {
      "use_markdown": true,
      "include_tables": true,
      "table_minimum": 5,
      "use_headers": "H1 for title, H2 for main sections, H3 for subsections",
      "use_lists": "Numbered for processes/steps, bullets for items",
      "use_emphasis": "Bold for labels and key terms",
      "use_horizontal_rules": "Separate major sections with ---",
      "min_total_words": 2000,
      "professional_tone": true
    },
    "quality_criteria": {
      "completeness": "All sections must be fully populated",
      "depth": "Each section minimum word count must be met",
      "specificity": "Use specific details, not placeholders",
      "actionability": "Content must be actionable and implementation-ready",
      "professionalism": "Suitable for executive and stakeholder presentation"
    },
    "metadata": {
      "version": "2.0",
      "last_updated": "2025-01-13",
      "author": "ADPA System",
      "methodology": "PMBOK 7th Edition",
      "complexity": "advanced",
      "estimated_length": "2000-3000 words",
      "ai_generation_hints": {
        "be_comprehensive": "Generate complete, detailed content for every section",
        "use_structure": "Follow the content_structure exactly for each section",
        "be_specific": "Include specific examples, metrics, processes, not generic text",
        "use_tables": "Create detailed tables with realistic data",
        "be_professional": "Use project management terminology and best practices"
      }
    }
  }',
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Project Integration Management Plan' 
  AND framework = 'PMBOK'
  AND category = 'Integration Management';

-- Verify the update
SELECT 
  id,
  name,
  framework,
  category,
  description,
  (content::jsonb -> 'metadata' ->> 'version') as version,
  (content::jsonb -> 'sections') as sections_count,
  updated_at
FROM templates
WHERE name = 'Project Integration Management Plan'
  AND framework = 'PMBOK';

