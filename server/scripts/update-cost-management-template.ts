/**
 * Update Cost Management Plan template — extract structure from bloated
 * system_prompt into 12 template_paragraphs for consistent LLM planning/drafting.
 *
 * Template ID: cacb97d0-ee8c-4b32-9be5-bc330c868338
 */
import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

const COST_TEMPLATE_ID = 'cacb97d0-ee8c-4b32-9be5-bc330c868338'

const systemPrompt = `You are an expert Project Management Consultant specializing in cost management with deep knowledge of the *PMBOK® Guide – Seventh Edition* cost management processes and tailoring guidance. Your task is to construct a comprehensive Cost Management Plan (CMP) as a subsidiary component of the Project Management Plan (PMP), based on user-provided project context.

STRUCTURAL CONSISTENCY: This template defines exactly twelve sections via template_paragraphs. Each paragraph maps to one document section in the same order. Do not merge, split, or rename sections unless the user request explicitly overrides the template.

General rules:
- Map sections to PMBOK 7 cost processes: Plan Cost Management, Estimate Costs, Determine Budget, Control Costs — each section guidance names its process explicitly.
- Use project-specific budget figures, funding sources, dates, and stakeholders from context — never "[Insert]" when data exists.
- Avoid 'Vacancy' placeholders; use '[TBD - Role]' if a role is unassigned.
- Maintain consistent stakeholder naming and currency across all sections.
- Use active voice; each narrative section MUST contain a minimum of 50 words of substantive prose (excluding tables and lists).
- **Tailoring (PMBOK 7 Development Approach):** State the project's lifecycle (predictive, adaptive, or hybrid) and explain how cost planning, estimation, budgeting, and control are tailored.
- Include actionable metrics with formulas and targets: CPI, SPI, CV, SV, EAC, ETC, VAC, TCPI where applicable.
- Use H8 entity tags for named financial entities: budget_baseline, cost_estimates, funding_tranches, financial_variances, contingency_reserves, procurement_costs, constraints.`

const templateParagraphs = [
  {
    order: 1,
    section_name: 'Cost Management Plan Overview',
    section_type: 'header',
    required: true,
    description:
      'Document identification, purpose, scope of the CMP, and linkage to the PMP (Plan Cost Management).',
    prompt_guidance: `PMBOK process: **Plan Cost Management**. Open with metadata:
- Document Title: Cost Management Plan
- Project Name (from context)
- Version, Date, Prepared By, Approved By

Then write (minimum 50 words of narrative prose per subsection, excluding tables):
1. **Purpose** — how costs will be planned, estimated, budgeted, monitored, and controlled for this project.
2. **Scope of this CMP** — REQUIRED: explicitly state which project phases, cost categories (personnel, infrastructure, licenses, third-party, contingency), and organizational units this plan covers; what is excluded from the CMP.
3. **Linkage to the PMP** — REQUIRED: describe how this CMP integrates as a subsidiary component of the Project Management Plan (parent document reference, approval relationship, cross-references to scope/schedule/risk/procurement plans).
4. **PMBOK 7 alignment** — map all four cost processes to document sections: Plan Cost Management (§1–2), Estimate Costs (§3), Determine Budget (§4–5), Control Costs (§6–8).
5. **Key project roles (summary)** — table: Role | Name (from context) | Cost responsibility — Sponsor, PM, Finance/PMO, Technical Lead at minimum; detail in Section 9.
6. **Communications cadence (summary)** — table: Audience | Report type | Frequency | Owner — preview only; full matrix in Section 8.
7. **Risk escalation preview** — one paragraph linking cost-risk escalation to Section 10 (levels) and variance escalation to Section 8.

Do NOT include detailed estimates or baseline tables here (Sections 3–4).`,
  },
  {
    order: 2,
    section_name: 'Cost Management Approach',
    section_type: 'narrative',
    required: true,
    description: 'Overall philosophy, tailoring decisions, and cost management lifecycle.',
    prompt_guidance: `Minimum 50 words of narrative prose. Describe the end-to-end cost management approach:
1. **Lifecycle flow** — estimation → budgeting → control → reporting → forecast → baseline updates.
2. **Development Approach Tailoring** — REQUIRED: identify predictive, adaptive, or hybrid delivery from context; explain how cost estimation cadence, baseline rigidity, and control frequency are tailored (e.g. rolling forecasts for adaptive, fixed baseline for predictive).
3. **Cost categories in scope** — personnel, infrastructure, licenses, third-party, contingency — with brief definition of each for this project.
4. **Governance** — who approves estimates, baseline, re-baselines, and reserve drawdowns.

Keep strategic; detailed methods are in Sections 3–6.`,
  },
  {
    order: 3,
    section_name: 'Cost Estimation Methods and Assumptions',
    section_type: 'financial',
    required: true,
    description: 'Techniques, tools, inputs, outputs, and assumptions for estimating costs (Estimate Costs).',
    prompt_guidance: `PMBOK process: **Estimate Costs**. Minimum 50 words of narrative prose before tables.

Include:
1. **Estimation methods** — analogous, parametric, bottom-up, three-point (tailor to project lifecycle from Section 2).
2. **Tools** — spreadsheets, PM tools, vendor quotes, ADPA/finance integrations.
3. **Inputs** — WBS, resource rates, historical data, expert judgment.
4. **Assumptions and basis of estimates** — labor rates, exchange rates, inflation, duration.
5. **Cost categories table** — REQUIRED columns: Category | Description | Estimation method | Basis | **Indicative amount** (currency).
6. **Detailed category estimates** — REQUIRED rows for at minimum **Personnel** and **Infrastructure** with line-item breakdown (role/hosting item | quantity | unit rate | subtotal). Derive amounts from project context; if unknown use [TBD] with stated basis of estimate — never omit these categories.

Use H8 tags for cost_estimates.`,
  },
  {
    order: 4,
    section_name: 'Cost Baseline and Budget Structure',
    section_type: 'financial',
    required: true,
    description: 'Time-phased budget, reserves, and approved cost baseline (Determine Budget).',
    prompt_guidance: `PMBOK process: **Determine Budget**. Minimum 50 words of narrative prose.

Include:
1. **Cost baseline definition** — time-phased authorized budget excluding management reserves.
2. **Budget baseline table** — REQUIRED complete table: Phase/Category | Personnel | Infrastructure | Licenses | Third-party | Contingency | **Total** | Time period. Populate from context; every row must have numeric values or explicit [TBD] with rationale — do not leave the table incomplete or generic.
3. **Contingency and management reserves** — purpose, amount or %, release authority.
4. **Baseline change policy** — when re-baselining is required (reference Section 11).

Use H8 tags for budget_baseline and contingency_reserves.`,
  },
  {
    order: 5,
    section_name: 'Funding Requirements and Payment Schedule',
    section_type: 'financial',
    required: true,
    description: 'Funding sources, tranches, and payment milestones.',
    prompt_guidance: `Cover:
1. **Funding sources** — internal budget, client, grants, CapEx vs OpEx classification.
2. **Funding tranches / payment schedule** — table: Source | Amount | Trigger/Milestone | Conditions.
3. **Cash flow considerations** — timing of major expenditures vs funding availability.
4. **Approval gates** — finance sign-off before spend.

Use H8 tags for funding_tranches.`,
  },
  {
    order: 6,
    section_name: 'Cost Control and Variance Management',
    section_type: 'governance',
    required: true,
    description: 'Monitoring actuals, thresholds, corrective actions (Control Costs).',
    prompt_guidance: `PMBOK process: **Control Costs**. Minimum 50 words of narrative prose — do not leave the control approach vague.

Include:
1. **Control methods** — REQUIRED: name specific techniques used (e.g. earned value analysis, trend analysis, variance analysis at work-package level, invoice reconciliation, burn-rate tracking for adaptive delivery).
2. **Tracking frequency** — how often actuals are collected and reconciled against the baseline.
3. **Variance thresholds** — green/amber/red bands with numeric examples (e.g. CV ±5%, ±10%).
4. **Corrective action process** — root cause → options → approval → implementation → verification.
5. **Forecasting methods** — EAC/ETC formulas (BAC/CPI, bottom-up ETC) with when each applies.
6. **Actionable control metrics** — table: Metric | Formula | Threshold | Corrective action trigger | Owner.
7. **Audit trail** — records retained for compliance.

Use H8 tags for financial_variances and cost_actuals where applicable.`,
  },
  {
    order: 7,
    section_name: 'Performance Measurement and Earned Value',
    section_type: 'metrics',
    required: true,
    description: 'EVM metrics, KPIs, and performance interpretation.',
    prompt_guidance: `Minimum 50 words of narrative prose. Define actionable performance measurement:
1. **EVM applicability** — full EVM vs simplified metrics for this project size and lifecycle.
2. **Key metrics with formulas** — REQUIRED table: Metric | Formula | Target | Interpretation (green/amber/red) | Data source | Owner — include PV, EV, AC, CV, SV, CPI, SPI, VAC, TCPI.
3. **Measurement points** — reporting periods, work package level for EV.
4. **Decision triggers** — what CPI/SPI or CV threshold triggers escalation (link Section 8).

Do NOT duplicate the full reporting cadence (Section 8).`,
  },
  {
    order: 8,
    section_name: 'Cost Reporting and Communication',
    section_type: 'communication',
    required: true,
    description: 'Report types, audiences, frequency, and escalation for cost status.',
    prompt_guidance: `Minimum 50 words of narrative prose. REQUIRED **communications cadence matrix**:
Table: Report | Audience | Frequency | Format | Owner | Content summary | **Escalation trigger**.

Cover at minimum: cost status dashboard, variance analysis, forecast update, executive summary, audit/compliance report.
Define escalation paths when Section 6 thresholds or Section 7 metric targets are breached (who is notified, within what timeframe).`,
  },
  {
    order: 9,
    section_name: 'Roles and Responsibilities for Cost Management',
    section_type: 'governance',
    required: true,
    description: 'RACI for estimation, approval, tracking, and reporting.',
    prompt_guidance: `Minimum 50 words of narrative prose. Expand the role summary from Section 1:
1. Role definitions — Sponsor, PM, Finance/PMO, Technical Lead, procurement (use names from context).
2. RACI matrix mapped to PMBOK cost processes: Plan Cost Management | Estimate Costs | Determine Budget | Control Costs × roles.
3. Delegation limits — spend authority and approval thresholds by role.

Use named stakeholders from context; H8 tags for stakeholders if named.`,
  },
  {
    order: 10,
    section_name: 'Cost-Related Risks and Contingency',
    section_type: 'risk',
    required: true,
    description: 'Cost risks, reserve strategy, and linkage to the risk register.',
    prompt_guidance: `Minimum 50 words of narrative prose.

Include:
1. **Cost risk register table** — Risk | Cost impact | Probability | Mitigation | Reserve link | Owner.
   Focus on: vendor price volatility, scope creep cost, FX, resource rate changes, cloud/API usage spikes.
2. **Risk escalation levels** — REQUIRED table: Level | Condition (trigger fired, mitigation failed, residual impact) | Escalate to | Timeframe | Action. Define at least 3 levels (e.g. PM → Finance/CCB → Sponsor). Distinct from change-authority thresholds in Section 11.

Link contingency reserves (Section 4) to specific risks. H8 tags for risks and contingency_reserves.`,
  },
  {
    order: 11,
    section_name: 'Change Management for Cost',
    section_type: 'governance',
    required: true,
    description: 'Cost-impacting change workflow and baseline update rules.',
    prompt_guidance: `Describe:
1. Change request content for cost impacts — delta, cumulative, schedule impact.
2. Review and approval path — PM → CCB/Finance → Sponsor thresholds.
3. Re-baseline vs management reserve drawdown decision criteria.
4. Integration with integrated change control (reference, do not duplicate full CCB charter).`,
  },
  {
    order: 12,
    section_name: 'Tools, Templates, Repositories, and Approval',
    section_type: 'reference',
    required: true,
    description: 'Systems, templates, document storage, and formal approval.',
    prompt_guidance: `List:
1. **Tools** — Jira, Azure DevOps, ERP, cloud billing consoles, ADPA (from context).
2. **Templates** — estimate sheets, BBS, variance report, funding request.
3. **Repositories** — where baselines, actuals, and approvals are stored.
4. **Plan maintenance** — review triggers (milestones, major changes).
5. **Approval block** — Prepared by / Approved by with roles and dates.

H8 tags for procurement_costs where vendor contracts are named.`,
  },
]

async function updateTemplate() {
  await connectDatabase()

  const check = await pool.query(
    `SELECT id, name, template_paragraphs, length(system_prompt) as sp_len
     FROM templates WHERE id = $1`,
    [COST_TEMPLATE_ID]
  )
  if (check.rows.length === 0) {
    throw new Error(`Template not found: ${COST_TEMPLATE_ID}`)
  }

  const existing = check.rows[0]
  const prevCount = Array.isArray(existing.template_paragraphs)
    ? existing.template_paragraphs.length
    : existing.template_paragraphs == null
      ? 0
      : 'invalid'
  console.log(`Updating "${existing.name}" (${COST_TEMPLATE_ID})`)
  console.log(`  Previous: template_paragraphs=${prevCount}, system_prompt=${existing.sp_len} chars`)

  await pool.query(
    `UPDATE templates
     SET system_prompt = $1,
         template_paragraphs = $2::jsonb,
         framework = 'PMBOK 7',
         updated_at = NOW()
     WHERE id = $3`,
    [systemPrompt, JSON.stringify(templateParagraphs), COST_TEMPLATE_ID]
  )

  console.log(`  Updated: 12 template_paragraphs, system_prompt=${systemPrompt.length} chars`)
  templateParagraphs.forEach((s) => console.log(`    ${s.order}. ${s.section_name}`))
  console.log('Done.')
  await pool.end()
}

updateTemplate().catch((err) => {
  console.error(err)
  process.exit(1)
})
