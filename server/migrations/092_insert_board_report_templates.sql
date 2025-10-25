-- Migration: Insert Board Report Templates for iBabs Integration
-- Beacon 7.1: Board Report Templates (AI-Powered)
-- Date: 2025-10-25
-- Description: Creates 4 board report templates for executive board meetings
--              (CEO Portfolio, CFO Financial, Audit Committee, Program Details)

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

BEGIN;

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CEO Portfolio Report (Agenda Item 4)
-- ============================================================================

INSERT INTO document_templates (
    id, 
    name, 
    description, 
    framework, 
    category, 
    content, 
    variables, 
    is_public, 
    created_by,
    system_prompt,
    created_at,
    updated_at
) VALUES (
    'board-ceo-portfolio-report',
    'CEO Portfolio Report',
    '2-page executive summary for board of directors covering strategic project portfolio health, RAG status, risks, and decisions required',
    'Board Governance',
    'board-reporting',
    '{
        "sections": [
            {
                "id": "executive_summary",
                "title": "Executive Summary",
                "content": "# CEO Portfolio Report\n\n## Executive Summary\n\n**Reporting Period**: {{reporting_period}}\n**Portfolio Health**: {{portfolio_health}}\n**Total Programs**: {{total_programs}}\n**Total Budget**: ${{total_budget}}\n\n{{executive_summary_text}}",
                "required": true,
                "order": 1
            },
            {
                "id": "program_status_table",
                "title": "Program Status Overview",
                "content": "## Program Status Table\n\n| Program | Status | Budget Progress | Timeline | Top Risk |\n|---------|--------|-----------------|----------|----------|\n{{#each programs}}\n| {{name}} | {{status}} | {{budget_percent}}% | {{timeline_percent}}% | {{top_risk}} |\n{{/each}}\n\n**Legend**: 🟢 Green (On Track) | 🟡 Amber (At Risk) | 🔴 Red (Critical)",
                "required": true,
                "order": 2
            },
            {
                "id": "financial_summary",
                "title": "Financial Summary",
                "content": "## Financial Summary\n\n- **Total Approved Budget**: ${{total_budget}}\n- **Total Spent to Date**: ${{total_spent}} ({{spent_percent}}%)\n- **Forecast to Completion**: {{forecast_status}}\n- **Variance**: {{variance_amount}} ({{variance_percent}}%)\n- **Contingency Remaining**: ${{contingency_remaining}}",
                "required": true,
                "order": 3
            },
            {
                "id": "top_risks",
                "title": "Top 3 Portfolio Risks",
                "content": "## Top 3 Portfolio Risks\n\n{{#each top_risks}}\n### {{@index}}. {{title}} ({{severity}})\n- **Probability**: {{probability}}%\n- **Impact**: ${{impact}}\n- **Mitigation**: {{mitigation}}\n- **Owner**: {{owner}}\n{{/each}}",
                "required": true,
                "order": 4
            },
            {
                "id": "board_decisions",
                "title": "Board Decisions Required",
                "content": "## Board Decisions Required\n\n{{#each decisions_required}}\n### {{title}}\n- **Type**: {{decision_type}}\n- **Requested By**: {{requested_by}}\n- **Deadline**: {{deadline}}\n- **Impact if Delayed**: {{delay_impact}}\n- **Recommendation**: {{recommendation}}\n{{/each}}",
                "required": true,
                "order": 5
            }
        ],
        "metadata": {
            "version": "1.0",
            "output_pages": 2,
            "agenda_item": "4",
            "meeting_type": "Board of Directors",
            "framework": "PMBOK 7 + Board Governance",
            "author": "ADPA AI System"
        }
    }',
    '[
        {"name": "reporting_period", "type": "text", "required": true, "description": "Reporting period (e.g., Q4 2024)"},
        {"name": "portfolio_health", "type": "text", "required": true, "description": "Overall portfolio health status"},
        {"name": "total_programs", "type": "number", "required": true, "description": "Total number of programs"},
        {"name": "total_budget", "type": "number", "required": true, "description": "Total portfolio budget"},
        {"name": "executive_summary_text", "type": "text", "required": true, "description": "Executive summary narrative"},
        {"name": "programs", "type": "array", "required": true, "description": "Array of program objects"},
        {"name": "total_spent", "type": "number", "required": true, "description": "Total amount spent"},
        {"name": "spent_percent", "type": "number", "required": true, "description": "Percentage of budget spent"},
        {"name": "forecast_status", "type": "text", "required": true, "description": "Forecast status"},
        {"name": "variance_amount", "type": "number", "required": false, "description": "Budget variance amount"},
        {"name": "variance_percent", "type": "number", "required": false, "description": "Budget variance percentage"},
        {"name": "contingency_remaining", "type": "number", "required": true, "description": "Remaining contingency funds"},
        {"name": "top_risks", "type": "array", "required": true, "description": "Top 3 portfolio risks"},
        {"name": "decisions_required", "type": "array", "required": true, "description": "Board decisions required"}
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1),
    'You are a senior executive preparing a board presentation for the CEO.

Generate a 2-page executive summary for the board of directors covering the organization''s strategic project portfolio.

**Input Data:**
{{#each programs}}
- Program: {{name}}
  - Status: {{status}} ({{projects.green}} green, {{projects.amber}} amber, {{projects.red}} red)
  - Budget: ${{budget.spent}} spent of ${{budget.total}} ({{budget.percentSpent}}%)
  - Timeline: {{schedule.percentComplete}}% complete
  - Top Risk: {{topRisk.title}} ({{topRisk.severity}})
{{/each}}

**Format:**
1. Executive Summary (1 paragraph - overall portfolio health)
2. Program Status Table (RAG status for each program)
3. Financial Summary (total budget, spend, forecast)
4. Top 3 Portfolio Risks (consolidated from all programs)
5. Board Decisions Required (escalations needing approval)

**Tone:** Executive-level, concise, data-driven, action-oriented
**Length:** 2 pages maximum (board members are busy!)
**Output:** Markdown format (ADPA will convert to PDF)',
    NOW(),
    NOW()
);

-- ============================================================================
-- 2. CFO Financial Report (Agenda Item 5)
-- ============================================================================

INSERT INTO document_templates (
    id, 
    name, 
    description, 
    framework, 
    category, 
    content, 
    variables, 
    is_public, 
    created_by,
    system_prompt,
    created_at,
    updated_at
) VALUES (
    'board-cfo-financial-report',
    'CFO Financial Report',
    '3-page financial overview for board finance committee covering program budgets, spend tracking, forecasts, and variance analysis',
    'Financial Management',
    'board-reporting',
    '{
        "sections": [
            {
                "id": "financial_summary",
                "title": "Financial Summary",
                "content": "# CFO Financial Report\n\n## Financial Summary\n\n**Reporting Period**: {{reporting_period}}\n**Total Portfolio Budget**: ${{total_budget}}\n**Total Spent**: ${{total_spent}} ({{total_spent_percent}}%)\n**Total Committed**: ${{total_committed}}\n**Total Remaining**: ${{total_remaining}}\n**Monthly Burn Rate**: ${{monthly_burn_rate}}\n**Forecast Status**: {{forecast_status}}",
                "required": true,
                "order": 1
            },
            {
                "id": "program_budget_table",
                "title": "Program Budget Overview",
                "content": "## Program Budget Table\n\n| Program | Approved Budget | Spent | Committed | Remaining | Forecast | Status |\n|---------|-----------------|-------|-----------|-----------|----------|--------|\n{{#each programs}}\n| {{name}} | ${{budget}} | ${{spent}} ({{spent_percent}}%) | ${{committed}} | ${{remaining}} | {{forecast}} | {{status}} |\n{{/each}}\n\n**Total Contingency**: ${{total_contingency}}",
                "required": true,
                "order": 2
            },
            {
                "id": "variance_analysis",
                "title": "Variance Analysis",
                "content": "## Variance Analysis\n\n{{#each variances}}\n### {{program_name}}\n- **Budget Variance**: {{variance_amount}} ({{variance_percent}}%)\n- **Reason**: {{reason}}\n- **Impact**: {{impact}}\n- **Corrective Action**: {{corrective_action}}\n{{/each}}",
                "required": true,
                "order": 3
            },
            {
                "id": "forecast_completion",
                "title": "Forecast to Completion",
                "content": "## Forecast to Completion (EAC)\n\n{{#each programs}}\n### {{name}}\n- **Original Budget (BAC)**: ${{original_budget}}\n- **Estimate at Completion (EAC)**: ${{eac}}\n- **Estimate to Complete (ETC)**: ${{etc}}\n- **Variance at Completion (VAC)**: {{vac}} ({{vac_percent}}%)\n{{/each}}",
                "required": true,
                "order": 4
            },
            {
                "id": "funding_requests",
                "title": "Funding Requests",
                "content": "## Funding Requests\n\n{{#each funding_requests}}\n### {{program_name}}\n- **Amount Requested**: ${{amount}}\n- **Justification**: {{justification}}\n- **Impact if Not Approved**: {{impact_if_denied}}\n- **Recommendation**: {{recommendation}}\n{{/each}}",
                "required": true,
                "order": 5
            },
            {
                "id": "financial_risks",
                "title": "Financial Risks",
                "content": "## Financial Risks\n\n{{#each financial_risks}}\n### {{title}} ({{severity}})\n- **Potential Impact**: ${{potential_impact}}\n- **Probability**: {{probability}}%\n- **Mitigation Plan**: {{mitigation_plan}}\n- **Contingency Allocation**: ${{contingency_allocated}}\n{{/each}}",
                "required": true,
                "order": 6
            }
        ],
        "metadata": {
            "version": "1.0",
            "output_pages": 3,
            "agenda_item": "5",
            "meeting_type": "Board Finance Committee",
            "framework": "Financial Management + PMI",
            "author": "ADPA AI System"
        }
    }',
    '[
        {"name": "reporting_period", "type": "text", "required": true, "description": "Reporting period"},
        {"name": "total_budget", "type": "number", "required": true, "description": "Total portfolio budget"},
        {"name": "total_spent", "type": "number", "required": true, "description": "Total amount spent"},
        {"name": "total_spent_percent", "type": "number", "required": true, "description": "Percentage spent"},
        {"name": "total_committed", "type": "number", "required": true, "description": "Total committed funds"},
        {"name": "total_remaining", "type": "number", "required": true, "description": "Total remaining budget"},
        {"name": "monthly_burn_rate", "type": "number", "required": true, "description": "Average monthly spend"},
        {"name": "forecast_status", "type": "text", "required": true, "description": "Overall forecast status"},
        {"name": "programs", "type": "array", "required": true, "description": "Program financial details"},
        {"name": "total_contingency", "type": "number", "required": true, "description": "Total contingency funds"},
        {"name": "variances", "type": "array", "required": true, "description": "Budget variances by program"},
        {"name": "funding_requests", "type": "array", "required": false, "description": "Funding requests"},
        {"name": "financial_risks", "type": "array", "required": true, "description": "Financial risks"}
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1),
    'You are the CFO preparing a financial overview for the board finance committee.

Generate a 3-page financial report covering all program budgets, spend tracking, and forecasts.

**Input Data:**
{{#each programs}}
- Program: {{name}}
  - Approved Budget: ${{budget.total}}
  - Spent to Date: ${{budget.spent}} ({{budget.percentSpent}}%)
  - Committed: ${{budget.committed}}
  - Remaining: ${{budget.remaining}}
  - Forecast: {{budget.forecast}} (on/over/under budget)
  - Contingency: ${{budget.contingency}}
{{/each}}

**Portfolio Totals:**
- Total Budget: ${{portfolio.totalBudget}}
- Total Spent: ${{portfolio.totalSpent}}
- Total Contingency: ${{portfolio.contingency}}

**Format:**
1. Financial Summary (portfolio-level totals, burn rate)
2. Program Budget Table (budget, spent, forecast for each)
3. Variance Analysis (programs over/under budget with explanations)
4. Forecast to Completion (EAC - Estimate at Completion)
5. Funding Requests (additional budget needs, if any)
6. Financial Risks (budget overrun risks, mitigation plans)

**Tone:** CFO-level, financially precise, risk-aware
**Length:** 3 pages (detailed but concise)
**Output:** Markdown with tables and financial formatting',
    NOW(),
    NOW()
);

-- ============================================================================
-- 3. Audit Committee Report (Agenda Item 6)
-- ============================================================================

INSERT INTO document_templates (
    id, 
    name, 
    description, 
    framework, 
    category, 
    content, 
    variables, 
    is_public, 
    created_by,
    system_prompt,
    created_at,
    updated_at
) VALUES (
    'board-audit-committee-report',
    'Audit Committee Report',
    '2-page compliance and risk report for board audit committee covering SOX compliance, audit findings, top risks, and regulatory status',
    'SOX Compliance',
    'board-reporting',
    '{
        "sections": [
            {
                "id": "compliance_summary",
                "title": "Compliance Summary",
                "content": "# Audit Committee Report\n\n## Compliance Summary\n\n**Reporting Period**: {{reporting_period}}\n**Overall Compliance Status**: {{overall_compliance_status}}\n**Active Findings**: {{active_findings_count}}\n**Critical Findings**: {{critical_findings_count}}\n**Regulatory Audits**: {{regulatory_audits_status}}",
                "required": true,
                "order": 1
            },
            {
                "id": "sox_findings",
                "title": "SOX Compliance Findings",
                "content": "## Active Audit Findings (SOX)\n\n{{#each sox_findings}}\n### {{title}} ({{severity}})\n- **Finding ID**: {{finding_id}}\n- **Status**: {{remediation_status}}\n- **Deadline**: {{remediation_deadline}}\n- **Owner**: {{owner}}\n- **Progress**: {{progress_percent}}%\n- **Notes**: {{notes}}\n{{/each}}",
                "required": true,
                "order": 2
            },
            {
                "id": "top_risks",
                "title": "Top 10 Portfolio Risks",
                "content": "## Top 10 Portfolio Risks\n\n| Rank | Risk | Probability | Impact | Severity | Mitigation |\n|------|------|-------------|--------|----------|------------|\n{{#each top_risks}}\n| {{rank}} | {{title}} | {{probability}}% | ${{impact}} | {{severity}} | {{mitigation}} |\n{{/each}}",
                "required": true,
                "order": 3
            },
            {
                "id": "external_audit",
                "title": "External Audit Status",
                "content": "## External Audit Status\n\n**Last Audit Date**: {{last_audit_date}}\n**Audit Firm**: {{audit_firm}}\n**Opinion**: {{audit_opinion}}\n**Key Recommendations**:\n{{#each audit_recommendations}}\n- {{this}}\n{{/each}}\n\n**Management Response**: {{management_response}}",
                "required": true,
                "order": 4
            },
            {
                "id": "regulatory_reporting",
                "title": "Regulatory Reporting",
                "content": "## Regulatory Reporting\n\n{{#each regulatory_items}}\n### {{regulator}} ({{jurisdiction}})\n- **Status**: {{status}}\n- **Last Filing**: {{last_filing_date}}\n- **Next Due**: {{next_due_date}}\n- **Compliance**: {{compliance_status}}\n{{/each}}",
                "required": true,
                "order": 5
            },
            {
                "id": "security_events",
                "title": "Security Events",
                "content": "## Security Events & Incidents\n\n**Period**: {{reporting_period}}\n**Total Events**: {{total_security_events}}\n**Critical Events**: {{critical_security_events}}\n\n{{#each security_events}}\n### {{title}} ({{severity}})\n- **Date**: {{event_date}}\n- **Type**: {{event_type}}\n- **Impact**: {{impact}}\n- **Resolution**: {{resolution_status}}\n- **Remediation**: {{remediation}}\n{{/each}}\n\n**Controls Enhancement**: {{controls_enhancement}}",
                "required": true,
                "order": 6
            }
        ],
        "metadata": {
            "version": "1.0",
            "output_pages": 2,
            "agenda_item": "6",
            "meeting_type": "Board Audit Committee",
            "framework": "SOX Compliance + Risk Management",
            "author": "ADPA AI System"
        }
    }',
    '[
        {"name": "reporting_period", "type": "text", "required": true, "description": "Reporting period"},
        {"name": "overall_compliance_status", "type": "text", "required": true, "description": "Overall compliance status"},
        {"name": "active_findings_count", "type": "number", "required": true, "description": "Count of active findings"},
        {"name": "critical_findings_count", "type": "number", "required": true, "description": "Count of critical findings"},
        {"name": "regulatory_audits_status", "type": "text", "required": true, "description": "Regulatory audit status"},
        {"name": "sox_findings", "type": "array", "required": true, "description": "SOX compliance findings"},
        {"name": "top_risks", "type": "array", "required": true, "description": "Top 10 portfolio risks"},
        {"name": "last_audit_date", "type": "date", "required": true, "description": "Last external audit date"},
        {"name": "audit_firm", "type": "text", "required": true, "description": "External audit firm name"},
        {"name": "audit_opinion", "type": "text", "required": true, "description": "Audit opinion"},
        {"name": "audit_recommendations", "type": "array", "required": false, "description": "Audit recommendations"},
        {"name": "management_response", "type": "text", "required": false, "description": "Management response to audit"},
        {"name": "regulatory_items", "type": "array", "required": true, "description": "Regulatory reporting items"},
        {"name": "total_security_events", "type": "number", "required": true, "description": "Total security events"},
        {"name": "critical_security_events", "type": "number", "required": true, "description": "Critical security events"},
        {"name": "security_events", "type": "array", "required": false, "description": "Security events details"},
        {"name": "controls_enhancement", "type": "text", "required": false, "description": "Controls enhancement plan"}
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1),
    'You are the Chief Audit Executive reporting to the board audit committee.

Generate a 2-page compliance and risk report for board oversight.

**Input Data - SOX Compliance:**
{{#each soxFindings}}
- Finding: {{title}}
  - Severity: {{severity}}
  - Status: {{remediationStatus}}
  - Deadline: {{remediationDeadline}}
  - Owner: {{owner}}
{{/each}}

**Input Data - Top Risks:**
{{#each risks}}
- Risk: {{title}}
  - Probability: {{probability}}%
  - Impact: ${{impact}}
  - Severity: {{severity}}
  - Mitigation: {{mitigation}}
{{/each}}

**Format:**
1. Compliance Summary (SOX, regulatory, security)
2. Active Audit Findings (status, remediation progress)
3. Top 10 Portfolio Risks (probability × impact ranking)
4. External Audit Status (opinion, recommendations)
5. Regulatory Reporting (Fed, OCC, SEC status)
6. Security Events (breaches, incidents, controls)

**Tone:** Audit committee-level, compliance-focused, risk-transparent
**Length:** 2 pages
**Output:** Markdown with compliance tables',
    NOW(),
    NOW()
);

-- ============================================================================
-- 4. Program Details Report (Agenda Item 7)
-- ============================================================================

INSERT INTO document_templates (
    id, 
    name, 
    description, 
    framework, 
    category, 
    content, 
    variables, 
    is_public, 
    created_by,
    system_prompt,
    created_at,
    updated_at
) VALUES (
    'board-program-details-report',
    'Program Details Report',
    '5-page detailed status report for specific program covering milestones, dependencies, change requests, and deep-dive metrics',
    'PMBOK 7',
    'board-reporting',
    '{
        "sections": [
            {
                "id": "program_overview",
                "title": "Program Overview",
                "content": "# Program Details Report\n\n## Program Overview\n\n**Program Name**: {{program_name}}\n**Program Manager**: {{program_manager}}\n**Reporting Period**: {{reporting_period}}\n**Overall Status**: {{overall_status}}\n**Budget**: ${{budget_spent}} of ${{budget_total}} ({{budget_percent}}%)\n**Timeline**: {{timeline_percent}}% complete\n**Next Board Review**: {{next_review_date}}",
                "required": true,
                "order": 1
            },
            {
                "id": "project_status",
                "title": "Project-by-Project Status",
                "content": "## Project-by-Project Status\n\n{{#each projects}}\n### {{name}} ({{status}})\n- **Budget**: ${{budget_spent}} / ${{budget_total}} ({{budget_percent}}%)\n- **Timeline**: {{timeline_percent}}% complete\n- **Manager**: {{project_manager}}\n- **Key Milestones**: {{milestones_completed}}/{{milestones_total}}\n- **Current Phase**: {{current_phase}}\n- **Issues**: {{issues_count}} ({{critical_issues}} critical)\n- **Next Milestone**: {{next_milestone}} ({{next_milestone_date}})\n{{/each}}",
                "required": true,
                "order": 2
            },
            {
                "id": "milestones",
                "title": "Key Milestones",
                "content": "## Key Milestones\n\n| Milestone | Planned Date | Forecast Date | Status | % Complete | Owner |\n|-----------|--------------|---------------|--------|------------|-------|\n{{#each milestones}}\n| {{name}} | {{planned_date}} | {{forecast_date}} | {{status}} | {{percent_complete}}% | {{owner}} |\n{{/each}}",
                "required": true,
                "order": 3
            },
            {
                "id": "dependencies",
                "title": "Dependencies & Blockers",
                "content": "## Dependencies & Blockers\n\n{{#each dependencies}}\n### {{title}} ({{status}})\n- **Type**: {{dependency_type}}\n- **From**: {{from_project}}\n- **To**: {{to_project}}\n- **Impact**: {{impact}}\n- **Resolution Plan**: {{resolution_plan}}\n- **Target Date**: {{target_resolution_date}}\n{{/each}}",
                "required": true,
                "order": 4
            },
            {
                "id": "change_requests",
                "title": "Change Requests",
                "content": "## Change Requests\n\n{{#each change_requests}}\n### CR-{{id}}: {{title}} ({{status}})\n- **Requested By**: {{requested_by}}\n- **Date**: {{request_date}}\n- **Type**: {{change_type}}\n- **Scope Impact**: {{scope_impact}}\n- **Budget Impact**: ${{budget_impact}}\n- **Schedule Impact**: {{schedule_impact}} days\n- **Priority**: {{priority}}\n- **Recommendation**: {{recommendation}}\n{{/each}}",
                "required": true,
                "order": 5
            },
            {
                "id": "risks_issues",
                "title": "Risks & Issues",
                "content": "## Risks & Issues\n\n### Active Risks\n{{#each active_risks}}\n- **{{title}}** ({{severity}})\n  - Probability: {{probability}}%, Impact: {{impact}}\n  - Mitigation: {{mitigation}}\n  - Owner: {{owner}}\n{{/each}}\n\n### Open Issues\n{{#each open_issues}}\n- **{{title}}** ({{severity}})\n  - Opened: {{opened_date}}\n  - Resolution Plan: {{resolution_plan}}\n  - Target Close: {{target_close_date}}\n  - Owner: {{owner}}\n{{/each}}",
                "required": true,
                "order": 6
            },
            {
                "id": "resource_utilization",
                "title": "Resource Utilization",
                "content": "## Resource Utilization\n\n**Total Resources**: {{total_resources}}\n**Allocated**: {{allocated_resources}}\n**Utilization Rate**: {{utilization_percent}}%\n\n{{#each resource_categories}}\n### {{category}}\n- Allocated: {{allocated}}\n- Available: {{available}}\n- Utilization: {{utilization}}%\n{{/each}}",
                "required": true,
                "order": 7
            },
            {
                "id": "next_steps",
                "title": "Next 90 Days",
                "content": "## Next 90 Days\n\n{{#each next_steps}}\n### {{timeframe}}\n{{#each activities}}\n- {{activity}}\n  - Owner: {{owner}}\n  - Target: {{target_date}}\n{{/each}}\n{{/each}}\n\n**Board Actions Required**: {{board_actions}}",
                "required": true,
                "order": 8
            }
        ],
        "metadata": {
            "version": "1.0",
            "output_pages": 5,
            "agenda_item": "7",
            "meeting_type": "Board Program Review",
            "framework": "PMBOK 7 Program Management",
            "author": "ADPA AI System"
        }
    }',
    '[
        {"name": "program_name", "type": "text", "required": true, "description": "Program name"},
        {"name": "program_manager", "type": "text", "required": true, "description": "Program manager name"},
        {"name": "reporting_period", "type": "text", "required": true, "description": "Reporting period"},
        {"name": "overall_status", "type": "text", "required": true, "description": "Overall program status"},
        {"name": "budget_spent", "type": "number", "required": true, "description": "Budget spent"},
        {"name": "budget_total", "type": "number", "required": true, "description": "Total budget"},
        {"name": "budget_percent", "type": "number", "required": true, "description": "Budget percentage"},
        {"name": "timeline_percent", "type": "number", "required": true, "description": "Timeline percentage"},
        {"name": "next_review_date", "type": "date", "required": true, "description": "Next review date"},
        {"name": "projects", "type": "array", "required": true, "description": "Array of project details"},
        {"name": "milestones", "type": "array", "required": true, "description": "Key milestones"},
        {"name": "dependencies", "type": "array", "required": true, "description": "Dependencies and blockers"},
        {"name": "change_requests", "type": "array", "required": false, "description": "Change requests"},
        {"name": "active_risks", "type": "array", "required": true, "description": "Active risks"},
        {"name": "open_issues", "type": "array", "required": true, "description": "Open issues"},
        {"name": "total_resources", "type": "number", "required": true, "description": "Total resources"},
        {"name": "allocated_resources", "type": "number", "required": true, "description": "Allocated resources"},
        {"name": "utilization_percent", "type": "number", "required": true, "description": "Resource utilization percentage"},
        {"name": "resource_categories", "type": "array", "required": false, "description": "Resource breakdown by category"},
        {"name": "next_steps", "type": "array", "required": true, "description": "Next 90 days activities"},
        {"name": "board_actions", "type": "text", "required": false, "description": "Board actions required"}
    ]',
    true,
    (SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1),
    'You are a Program Manager preparing a detailed status report for the board.

Generate a 5-page detailed status covering program-by-program execution.

**Input Data:**
- Program: {{program}}
- Projects: {{projects}}
- Milestones: {{milestones}}
- Dependencies: {{dependencies}}
- Change Requests: {{changeRequests}}

**Format:**
1. Program Overview (status, budget, timeline)
2. Project-by-Project Status (detailed breakdown)
3. Key Milestones (planned vs forecast dates)
4. Dependencies & Blockers (critical path items)
5. Change Requests (pending CCB approval)
6. Risks & Issues (active management items)
7. Resource Utilization (allocation and availability)
8. Next 90 Days (upcoming activities)

**Tone:** Program management-level, detailed, factual
**Length:** 5 pages (comprehensive deep-dive)
**Output:** Markdown with tables and detailed metrics',
    NOW(),
    NOW()
);

-- Add comments for documentation
COMMENT ON TABLE document_templates IS 'Document template definitions with AI prompt configurations and variable schemas';

-- Create index on category for board-reporting templates
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_framework ON document_templates(framework);

COMMIT;

-- =============================================================================
-- DOWN MIGRATION
-- =============================================================================

BEGIN;

-- Remove the board report templates
DELETE FROM document_templates WHERE id IN (
    'board-ceo-portfolio-report',
    'board-cfo-financial-report',
    'board-audit-committee-report',
    'board-program-details-report'
);

COMMIT;
