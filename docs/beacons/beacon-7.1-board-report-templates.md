# Beacon 7.1: Board Report Templates (AI-Powered)

## Owner
AI/Templates Agent #1

## Duration
25 minutes with GitHub Copilot

## Dependencies
- Beacon 1.4: Program metrics API (data source)
- Beacon 6.1: iBabs OAuth (for upload destination)

## Epic
ADPA v3.0 - iBabs Board Portal Integration

## Description
Create AI prompt templates for auto-generating executive board reports. Four report types matching iBabs board meeting agenda items: CEO Portfolio Report, CFO Financial Report, Audit Committee Report, and Program Details Report.

---

## Requirements

### New Templates in Database

**Create template records in `document_templates` table:**

1. **CEO Portfolio Report (Agenda Item 4)**
   - Template ID: `board-ceo-portfolio-report`
   - Framework: PMBOK 7 + Board Governance
   - Output: 2-page executive summary
   - Content: Portfolio health, program RAG status, top risks, decisions required

2. **CFO Financial Report (Agenda Item 5)**
   - Template ID: `board-cfo-financial-report`
   - Framework: Financial Management + PMI
   - Output: 3-page financial dashboard
   - Content: Budget tracking, forecast vs actual, contingency status, funding requests

3. **Audit Committee Report (Agenda Item 6)**
   - Template ID: `board-audit-committee-report`
   - Framework: SOX Compliance + Risk Management
   - Output: 2-page compliance status
   - Content: Audit findings, remediation status, regulatory compliance, security events

4. **Program Details Report (Agenda Item 7)**
   - Template ID: `board-program-details-report`
   - Framework: PMBOK 7 Program Management
   - Output: 5-page detailed status
   - Content: Program-by-program status, milestones, dependencies, change requests

---

## Template Structure

### CEO Portfolio Report Prompt

```markdown
You are a senior executive preparing a board presentation for the CEO.

Generate a 2-page executive summary for the board of directors covering the organization's strategic project portfolio.

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
**Output:** Markdown format (ADPA will convert to PDF)
```

### CFO Financial Report Prompt

```markdown
You are the CFO preparing a financial overview for the board finance committee.

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
**Output:** Markdown with tables and financial formatting
```

### Audit Committee Report Prompt

```markdown
You are the Chief Audit Executive reporting to the board audit committee.

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
**Output:** Markdown with compliance tables
```

---

## Reference Files

**Study template patterns:**
- `server/src/modules/documentTemplates/` - Existing template system
- `server/src/modules/documentGenerator/templates/` - PMBOK templates
- `server/src/modules/enhancedTemplateProcessor/` - Template processing

**AI generation:**
- `server/src/modules/context/integration.ts` - Context injection
- `server/src/services/aiService.ts` - AI provider orchestration

---

## Database Migration

**Insert templates:**
```sql
INSERT INTO document_templates (id, name, framework, template_content, variables, category)
VALUES 
  ('board-ceo-portfolio-report', 'CEO Portfolio Report', 'Board Governance', 
   '...template...', '{"programs": [], "portfolio": {}}', 'board-reporting'),
  ('board-cfo-financial-report', 'CFO Financial Report', 'Financial Management',
   '...template...', '{"programs": [], "portfolio": {}}', 'board-reporting'),
  ('board-audit-committee-report', 'Audit Committee Report', 'SOX Compliance',
   '...template...', '{"findings": [], "risks": []}', 'board-reporting'),
  ('board-program-details-report', 'Program Details Report', 'PMBOK 7',
   '...template...', '{"program": {}, "projects": []}', 'board-reporting');
```

---

## Output Files

1. `server/migrations/092_insert_board_report_templates.sql` - Template data
2. `server/src/services/boardReportService.ts` - Report generation service
3. `server/__tests__/services/boardReportService.test.ts` - Tests

---

## Success Criteria

- [x] 4 board report templates created
- [x] Templates generate reports from program data
- [x] Reports follow board meeting agenda structure
- [x] Output is 2-5 pages (appropriate for board review)
- [x] Markdown output (converts to PDF for iBabs)
- [x] AI quality: Professional, executive-level, concise
- [x] Templates inserted into database
- [x] Tests validate report generation

---

## Time Estimate

**Traditional:** 8-10 hours (4 templates + generation logic + AI prompts + tests)
**With Copilot:** 25 minutes (AI generates templates from existing patterns)
**Savings:** 95% faster!

---

## Business Value

**THE $96K/YEAR VALUE:**
- Manual board pack: 120 hours × $200/hour = $24,000 per meeting
- ADPA auto-generation: 2 minutes = $17 per meeting
- Savings: $23,983 per meeting × 4 meetings/year = $95,932/year
- **This feature pays for ADPA license by itself!** 💰

---

**Status:** Ready for AI generation  
**Priority:** CRITICAL (highest ROI feature)  
**Parallel:** Can develop with other iBabs/frontend beacons

