/**
 * Update Scope Management Plan template — split mega-paragraph into 12 explicit
 * sections so planDocumentStructure and draftSection receive consistent,
 * per-section Writing Guidance (no planner re-invention each run).
 *
 * Template ID: 31bf5ce4-97b7-4a41-b7b2-c9e26011ae68
 */
import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

const SCOPE_TEMPLATE_ID = '31bf5ce4-97b7-4a41-b7b2-c9e26011ae68'

const systemPrompt = `You are an expert Project Management Consultant with deep knowledge of the *PMBOK® Guide – Seventh Edition*, *BABOK*, and their application of principles, performance domains, and tailoring. Your task is to construct a comprehensive Scope Management Plan (SMP) artifact, a subsidiary component of the Project Management Plan (PMP), based on the user-provided project context. The SMP must be professionally structured, tailored to the project details, reflect the guidance of the PMBOK 7th Edition, and adhere to BABOK best practices for requirements management.

STRUCTURAL CONSISTENCY: This template defines exactly twelve sections via template_paragraphs. Each paragraph maps to one document section in the same order. Do not merge, split, or rename sections unless the user request explicitly overrides the template.

General rules:
- Ensure dates are current or realistic future dates from project context.
- Avoid 'Vacancy' placeholders; use '[TBD - Role]' if a role is unassigned.
- Maintain consistent stakeholder naming across all sections.
- Use active voice whenever possible.
- Explicitly map each section to the relevant PMBOK scope management process (Plan Scope Management, Collect Requirements, Define Scope, Create WBS, Validate Scope, Control Scope).
- Maintain consistent date formatting (Month Day, Year).
- Each narrative section MUST contain a minimum of 50 words of substantive prose (excluding tables and lists). Section guidance repeats this where applicable.
- **Tailoring (PMBOK 7 Development Approach):** Every SMP must state the project's development lifecycle (predictive, adaptive, or hybrid) and explain how scope processes are tailored to it — do not treat tailoring as a generic label.
- Use project-specific names, budgets, dates, and stakeholders from context — never generic filler when data is provided.
- Use H8 entity tags where entities are named (scope_items, deliverables, requirements, constraints, risks, stakeholders, milestones).`

const templateParagraphs = [
  {
    order: 1,
    section_name: 'Scope Management Plan Overview',
    section_type: 'header',
    required: true,
    description:
      'Document identification, purpose, objectives, and linkage to the Project Management Plan (Plan Scope Management).',
    prompt_guidance: `Open with a metadata block:
- Document Title: Scope Management Plan
- Project Name (from context)
- Version (e.g. v1.0)
- Date (ISO or Month Day, Year)
- Prepared By (name and role)
- Approved By (Project Sponsor name and role)

Then write (minimum 50 words of narrative prose per subsection, excluding tables):
1. **Purpose** — why this SMP exists and how it supports the PMP.
2. **Objectives** — 3–5 measurable objectives for scope planning, definition, validation, and control.
3. **PMBOK Alignment** — state this section fulfills *Plan Scope Management*; explicitly define all six scope processes (Collect Requirements, Define Scope, Create WBS, Validate Scope, Control Scope) and how this plan governs each.
4. **Development Approach Tailoring** — REQUIRED: identify the project's lifecycle from context (predictive, adaptive, or hybrid) and explain how scope planning, definition, validation, and control are tailored (e.g. rolling-wave WBS for adaptive, fixed baseline for predictive, hybrid cadence for mixed delivery).
5. **Document Scope** — what this SMP covers and how it will be maintained.

Do NOT include detailed in/out-of-scope lists here (Section 2 covers that).`,
  },
  {
    order: 2,
    section_name: 'In-Scope and Out-of-Scope Definition',
    section_type: 'scope',
    required: true,
    description:
      'Project scope statement with explicit in-scope, out-of-scope, and scope baseline summary (Define Scope).',
    prompt_guidance: `PMBOK process: **Define Scope**. Write at least 50 words of narrative before tables.

Include:
1. **Project Scope Statement** — complete narrative of what the project will deliver; must name major deliverables from project context (no incomplete or generic scope statements).
2. **In-Scope** — bulleted list of major deliverables, work packages, and boundaries explicitly included. Use H8 tags for scope_items and deliverables.
3. **Out-of-Scope** — bulleted list of exclusions with rationale (prevents scope creep).
4. **Scope Boundaries** — interfaces with other projects, programmes, or systems.
5. **Scope Baseline Overview** — summarize the three baseline components (approved requirements, WBS, deliverable acceptance criteria) and reference where each is detailed in later sections.

Use concrete project names and deliverables from context. Avoid placeholder brackets when real data exists.`,
  },
  {
    order: 3,
    section_name: 'Requirements Management Process',
    section_type: 'requirements',
    required: true,
    description:
      'How requirements are elicited, analyzed, documented, traced, prioritized, and changed (Collect Requirements).',
    prompt_guidance: `PMBOK process: **Collect Requirements** (BABOK-aligned). Minimum 50 words of narrative prose.

Cover:
1. **Elicitation techniques** — interviews, workshops, document analysis, prototyping (tailor to project lifecycle from Section 1).
2. **Documentation standards** — format, ID scheme, approval workflow.
3. **Prioritization** — MoSCoW or equivalent with decision authority.
4. **Traceability** — Requirements Traceability Matrix (RTM) structure linking requirements → WBS → tests → deliverables.
5. **Requirements change handling** — how requirement changes flow into scope change control; define **acceptance criteria for requirement changes** (what must be true before a changed requirement enters the baseline: impact assessed, traceability updated, approver identified).
6. Reference Section 6 for CCB workflow — do not duplicate full change control here.

Include a sample RTM table (at least 4 rows) when project requirements are known. Use H8 tags for requirements entities.`,
  },
  {
    order: 4,
    section_name: 'Work Breakdown Structure (WBS) and Dictionary',
    section_type: 'planning',
    required: true,
    description: 'WBS development approach, decomposition rules, sample hierarchy, and dictionary (Create WBS).',
    prompt_guidance: `PMBOK process: **Create WBS**. Minimum 50 words of narrative prose — do not leave the WBS approach vague.

Include:
1. **WBS development approach** — top-down decomposition, 100% rule, numbering scheme; state how approach differs for predictive vs adaptive/hybrid if applicable.
2. **Decomposition rules** — explicit stop criteria (work package size in hours/days, assignability, measurability, cost-accountability); who approves decomposition depth.
3. **Sample WBS** — REQUIRED: table or outline with at least 3 levels and project-specific deliverable names (not generic placeholders).
4. **WBS Dictionary** — for each major work package at level 2–3: ID, description, deliverables, acceptance criteria, responsible party, dependencies, effort estimate.

Use H8 tags for deliverables and work_items where named.`,
  },
  {
    order: 5,
    section_name: 'Scope Validation Approach',
    section_type: 'quality',
    required: true,
    description:
      'How completed deliverables are inspected and formally accepted (Validate Scope).',
    prompt_guidance: `PMBOK process: **Validate Scope**.

Cover:
1. **Verification vs validation** — clarify inspection against specs vs stakeholder acceptance.
2. **Validation activities** — reviews, walkthroughs, demos, UAT, formal sign-off ceremonies.
3. **Acceptance criteria** — per major deliverable: measurable criteria and sign-off authority.
4. **Validation schedule** — phase-end, per-deliverable, and milestone-based checkpoints.
5. **Documentation** — acceptance records, defect handling before sign-off.

Include an acceptance criteria table for at least 3 deliverables. Do NOT repeat the full change control process (Section 6).`,
  },
  {
    order: 6,
    section_name: 'Scope Control Process',
    section_type: 'governance',
    required: true,
    description:
      'Scope change control workflow, CCB, impact analysis, and scope performance monitoring (Control Scope).',
    prompt_guidance: `PMBOK process: **Control Scope**.

Include:
1. **Change control workflow** — request → log → impact analysis (scope, schedule, cost, quality, risk) → approval/rejection → baseline update → communication.
2. **Change Control Board (CCB)** — members, chair, quorum, meeting cadence.
3. **Authority thresholds** — minor / major / significant change categories with approval levels (e.g. PM vs CCB vs Sponsor).
4. **Scope creep prevention** — variance thresholds, scope audits, gold-plating detection.
5. **Scope measurement KPIs** — e.g. requirements completion %, approved vs rejected changes, scope creep index.

Include a change request template field list. Reference requirements changes from Section 3 without repeating RTM detail.`,
  },
  {
    order: 7,
    section_name: 'Roles and Responsibilities for Scope Management',
    section_type: 'governance',
    required: true,
    description: 'RACI matrix and role definitions for all scope management activities.',
    prompt_guidance: `Define roles for each scope management phase. Minimum 50 words of narrative prose.

Include:
1. **Role definitions** — Project Sponsor, Project Manager, Business Analyst, Technical Lead, CCB members, QA/UAT lead.
2. **RACI by PMBOK scope process** — matrix rows mapped to: Plan Scope Management, Collect Requirements, Define Scope, Create WBS, Validate Scope, Control Scope (columns R/A/C/I).
3. **RACI for key activities** — define scope, approve baseline, submit change, validate deliverable, update WBS.
4. **Escalation paths for scope disagreements** — when unauthorized scope expansion or baseline disputes occur.

Use named stakeholders from project context. Use H8 tags for stakeholders.`,
  },
  {
    order: 8,
    section_name: 'Assumptions and Constraints',
    section_type: 'narrative',
    required: true,
    description: 'Project assumptions and constraints that affect scope definition and control.',
    prompt_guidance: `List project-specific assumptions and constraints from context (charter, budget, timeline, compliance). Minimum 50 words of narrative prose.

1. **Assumptions** — numbered list; each assumption includes impact on scope if false.
2. **Constraints** — budget caps, fixed dates, regulatory, technology, resource limits; each tied to a scope boundary or exclusion.
3. **Link to scope** — how each assumption/constraint bounds in-scope work or triggers change requests.

Use H8 tags for constraints. Avoid generic "[insert]" placeholders when context provides values.`,
  },
  {
    order: 9,
    section_name: 'Communication Plan for Scope Management',
    section_type: 'communication',
    required: true,
    description: 'Who receives scope artifacts, when, and through which channels.',
    prompt_guidance: `Define how scope-related communications are handled (not a generic project comms plan). Minimum 50 words of narrative prose.

Include a table: **Artifact | Audience | Frequency | Channel | Owner | Escalation trigger**
Cover at minimum: scope baseline updates, change log, validation results, scope status reports, CCB decisions, requirements change notifications.

State reporting cadence (weekly status, monthly performance review) and who is notified when scope variance exceeds thresholds (link to Section 6 KPIs).`,
  },
  {
    order: 10,
    section_name: 'Interfaces and Dependencies',
    section_type: 'integration',
    required: true,
    description: 'Internal and external dependencies affecting scope boundaries and delivery.',
    prompt_guidance: `Identify:
1. **Internal dependencies** — other projects, shared services, platform teams.
2. **External dependencies** — vendors, regulators, third-party APIs/systems.
3. **Interface points** — data flows, handoffs, SLAs at scope boundaries.
4. **Dependency management** — how scope changes propagate across interfaces.

Use a dependency table with: Dependency | Type | Impact on Scope | Owner | Mitigation.`,
  },
  {
    order: 11,
    section_name: 'Risk Management Linkage to Scope',
    section_type: 'risk',
    required: true,
    description: 'Scope-related risks, triggers, and mitigations linked to the risk register.',
    prompt_guidance: `Focus on risks that directly affect scope (creep, ambiguity, gold-plating, incomplete requirements, integration gaps). Minimum 50 words of narrative prose.

Include:
1. **Scope-related risk table**: Risk ID | Description | Probability | Impact | Trigger | Mitigation | Owner | Link to Risk Register.
2. **Risk escalation levels** — REQUIRED table: Level | Condition (e.g. trigger fired, mitigation failed, residual impact) | Escalate to | Timeframe | Action. Define at least 3 levels (e.g. PM → CCB → Sponsor/Steering Committee). This is risk-event escalation, distinct from change-authority thresholds in Section 6.

Use H8 tags for risks. Do not duplicate the full project risk management plan — only scope linkage and escalation.`,
  },
  {
    order: 12,
    section_name: 'Tools, Templates, and Repositories',
    section_type: 'reference',
    required: true,
    description: 'Systems and artifacts used to store and manage scope documentation.',
    prompt_guidance: `List:
1. **Tools** — ADPA, Confluence, Jira, SharePoint, or other systems from project context.
2. **Templates** — WBS template, RTM, change request form, acceptance sign-off sheet.
3. **Repositories** — where scope baseline, approved changes, and validation records are stored.
4. **Access and versioning** — who can edit vs approve; version control rules.

Keep practical and aligned to the organization's stated toolchain.`,
  },
]

async function updateTemplate() {
  await connectDatabase()

  const check = await pool.query(
    `SELECT id, name, template_paragraphs FROM templates WHERE id = $1`,
    [SCOPE_TEMPLATE_ID]
  )
  if (check.rows.length === 0) {
    throw new Error(`Template not found: ${SCOPE_TEMPLATE_ID}`)
  }

  const existing = check.rows[0]
  const prevCount = Array.isArray(existing.template_paragraphs)
    ? existing.template_paragraphs.length
    : 0
  console.log(`Updating "${existing.name}" (${SCOPE_TEMPLATE_ID})`)
  console.log(`  Current template_paragraphs: ${prevCount} sections`)

  const res = await pool.query(
    `UPDATE templates
     SET system_prompt = $1,
         template_paragraphs = $2::jsonb,
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, name, system_prompt, template_paragraphs`,
    [systemPrompt, JSON.stringify(templateParagraphs), SCOPE_TEMPLATE_ID]
  )

  const updated = res.rows[0]
  const sections = updated.template_paragraphs as typeof templateParagraphs
  console.log(`  Updated template_paragraphs: ${sections.length} sections`)
  sections.forEach((s) => {
    console.log(`    ${s.order}. ${s.section_name}`)
  })
  console.log('Done.')
  await pool.end()
}

updateTemplate().catch((err) => {
  console.error(err)
  process.exit(1)
})
