-- Create Change Request Template for ADPA
-- This template allows uploading and managing formal change requests

INSERT INTO templates (
  id,
  name,
  description,
  framework,
  category,
  content,
  variables,
  is_public,
  created_by,
  development_status,
  system_prompt
) VALUES (
  gen_random_uuid(),
  'Change Request (CR)',
  'Formal change request document for project baseline modifications, scope changes, budget adjustments, and schedule revisions. Includes business justification, impact analysis, risk assessment, and approval workflow.',
  'PMBOK',
  'Change Management',
  '{
    "title": "Change Request (CR)",
    "sections": [
      {
        "title": "CR Identification",
        "content": "**CR ID:** [Unique identifier, e.g., CR-YYYY-NNN]\\n**Project Name:** {{project_name}}\\n**Date Submitted:** {{date}}\\n**Submitted By:** {{submitter_name}}\\n**Priority:** {{priority}} (Low / Medium / High / Critical)\\n**Type:** {{change_type}} (Scope / Schedule / Cost / Quality / Resource / Risk)\\n**Status:** {{status}} (Draft / Submitted / Under Review / Approved / Rejected / Deferred)",
        "required": true
      },
      {
        "title": "Executive Summary",
        "content": "Provide a brief 2-3 sentence summary of the proposed change, why it is needed, and the expected outcome.\\n\\n**Summary:**\\n[Concise description of the change]",
        "required": true
      },
      {
        "title": "Change Description",
        "content": "### 3.1 Current State\\nDescribe the current project baseline (scope, schedule, cost, quality, resources) that would be affected by this change.\\n\\n### 3.2 Proposed Change\\nProvide a detailed description of the proposed change. Be specific about what will be modified.\\n\\n### 3.3 Reason for Change\\nExplain why this change is necessary. Include business justification, risk mitigation, or opportunity capture.",
        "required": true
      },
      {
        "title": "Business Justification",
        "content": "### 4.1 Business Value\\n- What business problem does this change solve?\\n- What opportunities does it create?\\n- What risks does it mitigate?\\n\\n### 4.2 Alignment with Objectives\\n- How does this change align with project/organizational objectives?\\n- Impact on strategic goals\\n\\n### 4.3 Alternatives Considered\\n- What other options were evaluated?\\n- Why was this option selected?",
        "required": true
      },
      {
        "title": "Impact Analysis",
        "content": "### 5.1 Scope Impact\\n- **Deliverables Affected:** [List]\\n- **New Deliverables:** [List]\\n- **Removed Deliverables:** [List]\\n\\n### 5.2 Schedule Impact\\n- **Timeline Change:** [Duration]\\n- **Milestones Affected:** [List]\\n- **Critical Path Impact:** [Yes/No]\\n\\n### 5.3 Cost Impact\\n| Cost Category | Current Budget | Change Amount | New Budget |\\n|--------------|----------------|---------------|------------|\\n| Personnel | $XXX,XXX | +$XX,XXX | $XXX,XXX |\\n| Infrastructure | $XX,XXX | +$X,XXX | $XX,XXX |\\n| **TOTAL** | **$XXX,XXX** | **+$XX,XXX** | **$XXX,XXX** |\\n\\n### 5.4 Quality Impact\\n- Impact on quality standards, testing, acceptance criteria\\n\\n### 5.5 Resource Impact\\n- Additional resources required\\n- Resource reallocation needs\\n- Skills/training requirements\\n\\n### 5.6 Stakeholder Impact\\n| Stakeholder | Impact Level | Description |\\n|------------|--------------|-------------|\\n| [Name/Group] | High/Medium/Low | [Description] |",
        "required": true
      },
      {
        "title": "Risk Assessment",
        "content": "### 6.1 Risks of Implementing Change\\n| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy |\\n|---------|-----------------|-------------|--------|-------------------|\\n| R-CR-01 | [Description] | H/M/L | H/M/L | [Mitigation] |\\n\\n### 6.2 Risks of NOT Implementing Change\\n| Risk ID | Risk Description | Probability | Impact |\\n|---------|-----------------|-------------|--------|\\n| R-NC-01 | [Description] | H/M/L | H/M/L |",
        "required": true
      },
      {
        "title": "Dependencies & Constraints",
        "content": "### 7.1 Dependencies\\n- What other activities, deliverables, or decisions does this change depend on?\\n- What will be impacted by this change?\\n\\n### 7.2 Constraints\\n- Budget constraints\\n- Schedule constraints\\n- Resource constraints\\n- Technical constraints\\n- Regulatory/compliance constraints",
        "required": true
      },
      {
        "title": "Implementation Plan",
        "content": "### 8.1 Approach\\nDescribe how the change will be implemented.\\n\\n### 8.2 Timeline\\n| Phase | Activities | Start Date | End Date | Duration |\\n|-------|-----------|------------|----------|----------|\\n| Phase 1 | [Activities] | YYYY-MM-DD | YYYY-MM-DD | X weeks |\\n\\n### 8.3 Resources Required\\n- Personnel: [List roles and allocation]\\n- Tools/Systems: [List]\\n- Budget: [Amount]\\n\\n### 8.4 Success Criteria\\n- How will we know the change was successful?\\n- Measurable acceptance criteria",
        "required": true
      },
      {
        "title": "Approval Workflow",
        "content": "### 9.1 Approval Authority\\n- **Change Control Board (CCB):** [Required for changes > $X or affecting critical path]\\n- **Project Sponsor:** [Required for budget/scope changes]\\n- **Project Manager:** [Required for all changes]\\n\\n### 9.2 Review & Approval\\n| Role | Name | Decision | Date | Signature |\\n|------|------|----------|------|-----------|\\n| Project Manager | | Recommend: Approve/Reject | YYYY-MM-DD | |\\n| Sponsor | | Approve/Reject | YYYY-MM-DD | |\\n| CCB Chair | | Approve/Reject | YYYY-MM-DD | |\\n\\n### 9.3 Conditions\\n- Any conditions or prerequisites for approval\\n- Follow-up actions required",
        "required": true
      },
      {
        "title": "Baseline Updates",
        "content": "### 10.1 Scope Baseline Updates\\n- Updated WBS elements\\n- Changed deliverables\\n\\n### 10.2 Schedule Baseline Updates\\n- Updated milestone dates\\n- Changed critical path\\n\\n### 10.3 Cost Baseline Updates\\n- Updated budget by category\\n- New contingency reserve\\n\\n### 10.4 Quality Baseline Updates\\n- Updated quality metrics or standards\\n\\n### 10.5 Communications\\n- Who needs to be notified?\\n- Communication plan for change rollout",
        "required": false
      },
      {
        "title": "Attachments & References",
        "content": "### 11.1 Supporting Documents\\n- Business case analysis\\n- Technical specifications\\n- Cost estimates\\n- Feasibility studies\\n\\n### 11.2 Related Documents\\n- Project Charter\\n- Risk Register\\n- Stakeholder Register\\n- Other related CRs",
        "required": false
      }
    ]
  }',
  '[
    {"name": "project_name", "type": "text", "required": true, "description": "Project name"},
    {"name": "date", "type": "date", "required": true, "description": "CR submission date"},
    {"name": "submitter_name", "type": "text", "required": true, "description": "Person submitting the CR"},
    {"name": "priority", "type": "select", "required": true, "options": ["Low", "Medium", "High", "Critical"], "description": "CR priority level"},
    {"name": "change_type", "type": "select", "required": true, "options": ["Scope", "Schedule", "Cost", "Quality", "Resource", "Risk", "Multiple"], "description": "Type of change"},
    {"name": "status", "type": "select", "required": true, "options": ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Deferred"], "description": "Current CR status"}
  ]',
  true,
  (SELECT id FROM users ORDER BY created_at LIMIT 1),
  'production',
  'You are an expert change management consultant specializing in PMBOK change control processes. Generate comprehensive, executive-ready change requests that include rigorous impact analysis, cost-benefit evaluation, risk assessment, and stakeholder analysis. Follow PMI best practices for change request documentation. Be thorough in analyzing both the impacts of implementing the change AND the risks of not implementing it. Provide specific, quantifiable data wherever possible (costs, timelines, resource requirements). Ensure all approval workflows and baseline update procedures are clearly documented.'
)
ON CONFLICT DO NOTHING;

-- Verify the template was created
SELECT 
  id, 
  name, 
  framework, 
  category, 
  development_status,
  is_public,
  created_at
FROM templates 
WHERE name = 'Change Request (CR)';

