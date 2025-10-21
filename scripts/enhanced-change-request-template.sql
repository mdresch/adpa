-- Enhanced Change Request Template with Document Version Control & Cascading Updates
-- This template includes next steps for document regeneration and version control

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
  'Change Request (CR) - Enhanced',
  'Enhanced change request document with document version control, cascading updates, and next steps for project documentation regeneration. Includes business justification, impact analysis, risk assessment, approval workflow, and comprehensive document update requirements.',
  'PMBOK',
  'Change Management',
  '{
    "title": "Change Request (CR) - Enhanced",
    "sections": [
      {
        "title": "CR Identification",
        "content": "**CR ID:** [Unique identifier, e.g., CR-YYYY-NNN]\\n**Project Name:** {{project_name}}\\n**Date Submitted:** {{date}}\\n**Submitted By:** {{submitter_name}}\\n**Priority:** {{priority}} (Low / Medium / High / Critical)\\n**Type:** {{change_type}} (Scope / Schedule / Cost / Quality / Resource / Risk)\\n**Status:** {{status}} (Draft / Submitted / Under Review / Approved / Rejected / Deferred)\\n**Version:** {{version}} (Initial / Revision 1 / Revision 2)",
        "required": true
      },
      {
        "title": "Executive Summary",
        "content": "Provide a brief 2-3 sentence summary of the proposed change, why it is needed, and the expected outcome.\\n\\n**Summary:**\\n[Concise description of the change]\\n\\n**Key Impact:**\\n[Primary areas affected by this change]",
        "required": true
      },
      {
        "title": "Change Description",
        "content": "### 3.1 Current State\\nDescribe the current project baseline (scope, schedule, cost, quality, resources) that would be affected by this change.\\n\\n### 3.2 Proposed Change\\nProvide a detailed description of the proposed change. Be specific about what will be modified.\\n\\n### 3.3 Reason for Change\\nExplain why this change is necessary. Include business justification, risk mitigation, or opportunity capture.\\n\\n### 3.4 Change Scope\\n- **Primary Change:** [Main change description]\\n- **Secondary Changes:** [Related modifications]\\n- **Excluded from Change:** [What remains unchanged]",
        "required": true
      },
      {
        "title": "Business Justification",
        "content": "### 4.1 Business Value\\n- What business problem does this change solve?\\n- What opportunities does it create?\\n- What risks does it mitigate?\\n\\n### 4.2 Alignment with Objectives\\n- How does this change align with project/organizational objectives?\\n- Impact on strategic goals\\n\\n### 4.3 Alternatives Considered\\n- What other options were evaluated?\\n- Why was this option selected?\\n\\n### 4.4 Cost-Benefit Analysis\\n| Benefit Category | Current State | Proposed State | Net Benefit |\\n|------------------|---------------|----------------|-------------|\\n| Financial | $XXX,XXX | $XXX,XXX | +$XX,XXX |\\n| Time | X months | X months | +/-X weeks |\\n| Quality | X% | X% | +/-X% |\\n| Risk | High/Med/Low | High/Med/Low | Improved/Worse |",
        "required": true
      },
      {
        "title": "Impact Analysis",
        "content": "### 5.1 Scope Impact\\n- **Deliverables Affected:** [List]\\n- **New Deliverables:** [List]\\n- **Removed Deliverables:** [List]\\n- **Modified Deliverables:** [List]\\n\\n### 5.2 Schedule Impact\\n- **Timeline Change:** [Duration]\\n- **Milestones Affected:** [List]\\n- **Critical Path Impact:** [Yes/No]\\n- **Dependencies Affected:** [List]\\n\\n### 5.3 Cost Impact\\n| Cost Category | Current Budget | Change Amount | New Budget | Justification |\\n|--------------|----------------|---------------|------------|--------------|\\n| Personnel | $XXX,XXX | +$XX,XXX | $XXX,XXX | [Reason] |\\n| Infrastructure | $XX,XXX | +$X,XXX | $XX,XXX | [Reason] |\\n| Materials | $XX,XXX | +$X,XXX | $XX,XXX | [Reason] |\\n| **TOTAL** | **$XXX,XXX** | **+$XX,XXX** | **$XXX,XXX** | |\\n\\n### 5.4 Quality Impact\\n- Impact on quality standards, testing, acceptance criteria\\n- New quality requirements\\n- Modified acceptance criteria\\n\\n### 5.5 Resource Impact\\n- Additional resources required\\n- Resource reallocation needs\\n- Skills/training requirements\\n- Equipment/tool needs\\n\\n### 5.6 Stakeholder Impact\\n| Stakeholder | Impact Level | Description | Communication Required |\\n|------------|--------------|-------------|----------------------|\\n| [Name/Group] | High/Medium/Low | [Description] | Yes/No |",
        "required": true
      },
      {
        "title": "Risk Assessment",
        "content": "### 6.1 Risks of Implementing Change\\n| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy | Owner |\\n|---------|-----------------|-------------|--------|-------------------|-------|\\n| R-CR-01 | [Description] | H/M/L | H/M/L | [Mitigation] | [Name] |\\n\\n### 6.2 Risks of NOT Implementing Change\\n| Risk ID | Risk Description | Probability | Impact | Owner |\\n|---------|-----------------|-------------|--------|-------|\\n| R-NC-01 | [Description] | H/M/L | H/M/L | [Name] |\\n\\n### 6.3 Risk Mitigation Plan\\n- **High-Risk Items:** [List and mitigation]\\n- **Contingency Plans:** [Backup strategies]\\n- **Risk Monitoring:** [How risks will be tracked]",
        "required": true
      },
      {
        "title": "Dependencies & Constraints",
        "content": "### 7.1 Dependencies\\n- **Prerequisites:** What must be completed before this change?\\n- **Blocking Items:** What will be impacted by this change?\\n- **External Dependencies:** Third-party or external factors\\n\\n### 7.2 Constraints\\n- **Budget Constraints:** [Limitations]\\n- **Schedule Constraints:** [Timeline limitations]\\n- **Resource Constraints:** [Availability limitations]\\n- **Technical Constraints:** [Technology limitations]\\n- **Regulatory/Compliance Constraints:** [Legal requirements]\\n\\n### 7.3 Assumptions\\n- **Key Assumptions:** [What we assume to be true]\\n- **Assumption Validation:** [How assumptions will be verified]",
        "required": true
      },
      {
        "title": "Implementation Plan",
        "content": "### 8.1 Approach\\nDescribe how the change will be implemented.\\n\\n### 8.2 Timeline\\n| Phase | Activities | Start Date | End Date | Duration | Dependencies |\\n|-------|-----------|------------|----------|----------|--------------|\\n| Phase 1 | [Activities] | YYYY-MM-DD | YYYY-MM-DD | X weeks | [List] |\\n| Phase 2 | [Activities] | YYYY-MM-DD | YYYY-MM-DD | X weeks | [List] |\\n\\n### 8.3 Resources Required\\n- **Personnel:** [List roles and allocation]\\n- **Tools/Systems:** [List]\\n- **Budget:** [Amount]\\n- **External Services:** [List]\\n\\n### 8.4 Success Criteria\\n- **Primary Success Criteria:** [Measurable outcomes]\\n- **Secondary Success Criteria:** [Additional benefits]\\n- **Acceptance Criteria:** [How success will be verified]",
        "required": true
      },
      {
        "title": "Document Version Control & Cascading Updates",
        "content": "### 9.1 Documents Requiring Immediate Regeneration\\n**Upon CR Approval, the following documents MUST be regenerated/updated:**\\n\\n#### 9.1.1 Project Charter\\n- **Reason:** {{project_charter_reason}} (Scope change / Budget change / Timeline change / Stakeholder change)\\n- **Priority:** High / Medium / Low\\n- **Timeline:** Within X days of approval\\n- **Key Updates Required:**\\n  - [ ] Project objectives\\n  - [ ] Success criteria\\n  - [ ] Budget allocation\\n  - [ ] Timeline milestones\\n  - [ ] Stakeholder list\\n  - [ ] Risk register\\n\\n#### 9.1.2 Scope Management Plan\\n- **Reason:** {{scope_reason}} (New deliverables / Modified deliverables / Removed deliverables)\\n- **Priority:** High / Medium / Low\\n- **Timeline:** Within X days of approval\\n- **Key Updates Required:**\\n  - [ ] Work Breakdown Structure (WBS)\\n  - [ ] Deliverable descriptions\\n  - [ ] Scope boundaries\\n  - [ ] Acceptance criteria\\n  - [ ] Change control procedures\\n\\n#### 9.1.3 Resource Management Plan\\n- **Reason:** {{resource_reason}} (New roles / Modified allocations / Skill requirements)\\n- **Priority:** High / Medium / Low\\n- **Timeline:** Within X days of approval\\n- **Key Updates Required:**\\n  - [ ] Resource requirements\\n  - [ ] Role definitions\\n  - [ ] Allocation matrix\\n  - [ ] Training needs\\n  - [ ] Procurement requirements\\n\\n#### 9.1.4 Cost Management Plan\\n- **Reason:** {{cost_reason}} (Budget increase / Cost category changes / Contingency adjustments)\\n- **Priority:** High / Medium / Low\\n- **Timeline:** Within X days of approval\\n- **Key Updates Required:**\\n  - [ ] Budget breakdown\\n  - [ ] Cost categories\\n  - [ ] Contingency reserves\\n  - [ ] Cost control procedures\\n  - [ ] Financial reporting\\n\\n#### 9.1.5 Schedule Management Plan\\n- **Reason:** {{schedule_reason}} (Timeline changes / Milestone adjustments / Critical path impact)\\n- **Priority:** High / Medium / Low\\n- **Timeline:** Within X days of approval\\n- **Key Updates Required:**\\n  - [ ] Project schedule\\n  - [ ] Milestone dates\\n  - [ ] Critical path analysis\\n  - [ ] Resource calendars\\n  - [ ] Dependencies\\n\\n### 9.2 Documents Requiring Secondary Updates\\n**These documents should be reviewed and updated as needed:**\\n\\n#### 9.2.1 Risk Management Plan\\n- **Updates:** New risks, modified mitigation strategies\\n- **Timeline:** Within X days\\n\\n#### 9.2.2 Quality Management Plan\\n- **Updates:** Quality standards, testing procedures\\n- **Timeline:** Within X days\\n\\n#### 9.2.3 Communication Management Plan\\n- **Updates:** Stakeholder communication, reporting frequency\\n- **Timeline:** Within X days\\n\\n#### 9.2.4 Procurement Management Plan\\n- **Updates:** Vendor requirements, contract modifications\\n- **Timeline:** Within X days\\n\\n### 9.3 Version Control Requirements\\n#### 9.3.1 Document Versioning\\n- **Version Format:** [Document Name] v[Major].[Minor] (e.g., Project Charter v2.1)\\n- **Change Log:** Each document must include a change log\\n- **Archive Policy:** Previous versions retained for audit trail\\n\\n#### 9.3.2 Approval Requirements\\n- **Primary Documents:** Require sponsor approval for version updates\\n- **Secondary Documents:** Require PM approval for version updates\\n- **Emergency Updates:** Expedited approval process available\\n\\n#### 9.3.3 Distribution Requirements\\n- **Stakeholder Notification:** Who must be notified of document updates\\n- **Distribution Method:** Email / Portal / Meeting\\n- **Acknowledgment Required:** Stakeholders must acknowledge receipt\\n\\n### 9.4 Integration & Consistency Checks\\n#### 9.4.1 Cross-Document Validation\\n- **Budget Consistency:** Cost Management Plan aligns with Resource Management Plan\\n- **Schedule Consistency:** Schedule Management Plan aligns with Resource allocations\\n- **Scope Consistency:** Scope Management Plan aligns with Project Charter\\n\\n#### 9.4.2 Baseline Reconciliation\\n- **Scope Baseline:** Updated WBS and deliverables\\n- **Schedule Baseline:** Updated milestones and timeline\\n- **Cost Baseline:** Updated budget and allocations\\n- **Quality Baseline:** Updated standards and criteria\\n\\n### 9.5 Implementation Timeline\\n| Document | Priority | Start Date | Completion Date | Owner | Status |\\n|----------|----------|------------|-----------------|-------|--------|\\n| Project Charter | High | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n| Scope Management Plan | High | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n| Resource Management Plan | High | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n| Cost Management Plan | High | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n| Schedule Management Plan | High | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n| Risk Management Plan | Medium | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n| Quality Management Plan | Medium | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n| Communication Management Plan | Medium | YYYY-MM-DD | YYYY-MM-DD | [Name] | [Status] |\\n\\n### 9.6 Quality Gates\\n#### 9.6.1 Document Review Process\\n- **Self-Review:** Document owner reviews for completeness\\n- **Peer Review:** Subject matter expert reviews for accuracy\\n- **Stakeholder Review:** Key stakeholders review for alignment\\n- **Final Approval:** Designated approver signs off\\n\\n#### 9.6.2 Consistency Validation\\n- **Automated Checks:** System validates cross-document consistency\\n- **Manual Review:** PM reviews all documents for alignment\\n- **Baseline Update:** Project baseline updated with new versions\\n\\n### 9.7 Communication Plan\\n#### 9.7.1 Stakeholder Notification\\n- **Immediate:** Notify stakeholders of CR approval\\n- **Progress Updates:** Weekly status on document updates\\n- **Completion:** Notify when all documents updated\\n\\n#### 9.7.2 Training Requirements\\n- **New Processes:** Training on updated procedures\\n- **Tool Updates:** Training on system changes\\n- **Role Changes:** Training on new responsibilities",
        "required": true
      },
      {
        "title": "Approval Workflow",
        "content": "### 10.1 Approval Authority\\n- **Change Control Board (CCB):** [Required for changes > $X or affecting critical path]\\n- **Project Sponsor:** [Required for budget/scope changes]\\n- **Project Manager:** [Required for all changes]\\n- **Technical Lead:** [Required for technical changes]\\n- **Finance:** [Required for budget changes]\\n\\n### 10.2 Review & Approval\\n| Role | Name | Decision | Date | Signature | Comments |\\n|------|------|----------|------|-----------|----------|\\n| Project Manager | | Recommend: Approve/Reject | YYYY-MM-DD | | [Comments] |\\n| Technical Lead | | Approve/Reject | YYYY-MM-DD | | [Comments] |\\n| Finance | | Approve/Reject | YYYY-MM-DD | | [Comments] |\\n| Sponsor | | Approve/Reject | YYYY-MM-DD | | [Comments] |\\n| CCB Chair | | Approve/Reject | YYYY-MM-DD | | [Comments] |\\n\\n### 10.3 Conditions\\n- **Prerequisites:** Any conditions or prerequisites for approval\\n- **Follow-up Actions:** Required actions after approval\\n- **Monitoring Requirements:** Ongoing monitoring needs\\n- **Success Metrics:** How success will be measured",
        "required": true
      },
      {
        "title": "Baseline Updates",
        "content": "### 11.1 Scope Baseline Updates\\n- **Updated WBS Elements:** [List]\\n- **Changed Deliverables:** [List]\\n- **New Acceptance Criteria:** [List]\\n\\n### 11.2 Schedule Baseline Updates\\n- **Updated Milestone Dates:** [List]\\n- **Changed Critical Path:** [Description]\\n- **New Dependencies:** [List]\\n\\n### 11.3 Cost Baseline Updates\\n- **Updated Budget by Category:** [Breakdown]\\n- **New Contingency Reserve:** [Amount]\\n- **Cost Control Thresholds:** [Updated limits]\\n\\n### 11.4 Quality Baseline Updates\\n- **Updated Quality Metrics:** [List]\\n- **New Standards:** [List]\\n- **Modified Acceptance Criteria:** [List]\\n\\n### 11.5 Communications\\n- **Stakeholder Notification:** Who needs to be notified?\\n- **Communication Plan:** How will change be communicated?\\n- **Training Requirements:** What training is needed?\\n- **Documentation Updates:** What documentation needs updating?",
        "required": false
      },
      {
        "title": "Attachments & References",
        "content": "### 12.1 Supporting Documents\\n- **Business Case Analysis:** [File/Reference]\\n- **Technical Specifications:** [File/Reference]\\n- **Cost Estimates:** [File/Reference]\\n- **Feasibility Studies:** [File/Reference]\\n- **Risk Analysis:** [File/Reference]\\n\\n### 12.2 Related Documents\\n- **Project Charter:** [Current version]\\n- **Risk Register:** [Current version]\\n- **Stakeholder Register:** [Current version]\\n- **Other Related CRs:** [List]\\n- **Baseline Documents:** [List current versions]\\n\\n### 12.3 External References\\n- **Industry Standards:** [References]\\n- **Regulatory Requirements:** [References]\\n- **Best Practices:** [References]\\n- **Lessons Learned:** [References]",
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
    {"name": "status", "type": "select", "required": true, "options": ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Deferred"], "description": "Current CR status"},
    {"name": "version", "type": "select", "required": true, "options": ["Initial", "Revision 1", "Revision 2", "Revision 3"], "description": "CR version"},
    {"name": "project_charter_reason", "type": "select", "required": true, "options": ["Scope change", "Budget change", "Timeline change", "Stakeholder change", "Multiple changes"], "description": "Reason for Project Charter update"},
    {"name": "scope_reason", "type": "select", "required": true, "options": ["New deliverables", "Modified deliverables", "Removed deliverables", "Scope boundary change", "Multiple changes"], "description": "Reason for Scope Management Plan update"},
    {"name": "resource_reason", "type": "select", "required": true, "options": ["New roles", "Modified allocations", "Skill requirements", "Equipment needs", "Multiple changes"], "description": "Reason for Resource Management Plan update"},
    {"name": "cost_reason", "type": "select", "required": true, "options": ["Budget increase", "Cost category changes", "Contingency adjustments", "Resource cost changes", "Multiple changes"], "description": "Reason for Cost Management Plan update"},
    {"name": "schedule_reason", "type": "select", "required": true, "options": ["Timeline changes", "Milestone adjustments", "Critical path impact", "Dependency changes", "Multiple changes"], "description": "Reason for Schedule Management Plan update"}
  ]',
  true,
  (SELECT id FROM users ORDER BY created_at LIMIT 1),
  'production',
  'You are an expert change management consultant specializing in PMBOK change control processes with advanced document version control and cascading update management. Generate comprehensive, executive-ready change requests that include rigorous impact analysis, cost-benefit evaluation, risk assessment, stakeholder analysis, and detailed document regeneration requirements. Follow PMI best practices for change request documentation with emphasis on maintaining document consistency and version control. Be thorough in analyzing both the impacts of implementing the change AND the risks of not implementing it. Provide specific, quantifiable data wherever possible (costs, timelines, resource requirements). Ensure all approval workflows, baseline update procedures, and document version control requirements are clearly documented. Pay special attention to identifying which project documents must be regenerated, updated, or reviewed as a result of the change, including specific timelines, owners, and quality gates for each document update.'
)
ON CONFLICT DO NOTHING;

-- Verify the enhanced template was created
SELECT 
  id, 
  name, 
  framework, 
  category, 
  development_status,
  is_public,
  created_at
FROM templates 
WHERE name = 'Change Request (CR) - Enhanced';
