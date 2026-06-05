import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

// The two Project Charter template IDs in the `templates` table
const CHARTER_IDS = [
  'ffbcf898-0486-46fa-939f-e5629737de0e', // "Project Charter"
  '27788b37-2aa2-473f-accc-5a9e7eec7c48', // "Project Charter - Template Builder"
]

const sections = [
  {
    order: 1,
    section_name: 'Charter Metadata',
    section_type: 'header',
    required: true,
    description: 'Document identification, version, dates, approval signatures, and security classification.',
    prompt_guidance: `Include the following fields in a structured metadata block at the top of the document:
- Document Title
- Project Name
- Version Number (e.g. v1.0)
- Date (ISO format: YYYY-MM-DD)
- Prepared By (name and role)
- Approved By (Project Sponsor name and role)
- Change History table (Version | Date | Author | Description)

MANDATORY SECURITY CLASSIFICATION — you MUST include exactly this line format (required by GOV-SEC-001):
**Security Classification:** CONFIDENTIAL

Valid tiers are: PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED
Do NOT use alternative labels such as "Confidentiality Level", "Sensitivity Level", or any other variation.
Do NOT append extra context to the classification line itself — place any access restrictions on a separate line below it.
Example of correct format:
**Security Classification:** CONFIDENTIAL
*Access restricted to: Project Sponsor, Project Manager, Steering Committee members.*`,
  },
  {
    order: 2,
    section_name: 'Executive Summary',
    section_type: 'narrative',
    required: true,
    description: 'High-level overview of the project purpose, value, and authorization.',
    prompt_guidance: 'Write a concise 2-3 paragraph executive summary covering: (1) What the project is and why it is being initiated, (2) The primary business problem or opportunity it addresses, (3) The expected high-level outcome and value delivered. This section should stand alone for a senior executive who reads only this section.',
  },
  {
    order: 3,
    section_name: 'Project Authorization & PM Authority',
    section_type: 'governance',
    required: true,
    description: 'Formal authorization of the project and the Project Manager\'s authority level.',
    prompt_guidance: `State the Project Sponsor's formal authorization of the project. This section MUST include all of the following:
1. **Sponsoring Authority**: Name, title, and organization unit of the Project Sponsor formally authorizing this charter.
2. **Project Manager Designation**: Full name, role title, and reporting line of the appointed Project Manager.
3. **Authority Matrix** — define explicit authority levels for the Project Manager across three dimensions:
   - Budget Authority: maximum spend the PM can approve without escalation
   - Resource Authority: ability to assign, re-assign, or release project team members
   - Decision Authority: types of decisions the PM can make unilaterally vs. those requiring sponsor/board approval
4. **Authorization Statement**: A formal paragraph stating that this document constitutes official authorization for the project to proceed, resources to be allocated, and the Project Manager to act on behalf of the organization.

Failure to define explicit roles and authority levels is a PMBOK compliance gap — all four items above are mandatory.`,
  },
  {
    order: 4,
    section_name: 'Business Need & Problem Statement',
    section_type: 'narrative',
    required: true,
    description: 'Detailed description of the business problem, opportunity, or strategic need driving the project.',
    prompt_guidance: `This section MUST address all five dimensions below to prevent ambiguity and ensure strategic traceability:
1. **Current State / Operational Gap**: Describe the specific operational deficiency, process failure, or capability gap that exists today. Be concrete — include metrics (e.g., processing time, error rates, manual effort hours, cost of current state).
2. **Root Cause Analysis**: Identify the underlying cause driving the need — not just symptoms. Why does the gap exist? What has prevented it from being resolved?
3. **Cost of Inaction**: Quantify what happens if the project is NOT executed — financial impact, regulatory risk, competitive disadvantage, or operational degradation.
4. **Strategic Alignment**: Explicitly state which organizational strategic objective(s) or programme this project supports. Use the exact names of strategic goals/initiatives from the organization's strategic plan. Vague references like "supports digital transformation" are NOT acceptable — name the specific objective.
5. **Expected Benefits**: List the 3-5 primary benefits the project will deliver upon completion. Each benefit must be measurable (e.g., "Reduce document processing time from 4 hours to 30 minutes — 87.5% reduction"). Use H8 tags for benefit_realization_plan entities.`,
  },
  {
    order: 5,
    section_name: 'Project Objectives & Success Criteria',
    section_type: 'requirements',
    required: true,
    description: 'SMART objectives and measurable success criteria for the project.',
    prompt_guidance: 'List 4-8 SMART (Specific, Measurable, Achievable, Relevant, Time-bound) objectives. For each objective, define a measurable success criterion and how it will be measured. Include KPIs where applicable. Use H8 entity tags for success_criteria entities.',
  },
  {
    order: 6,
    section_name: 'Project Scope',
    section_type: 'scope',
    required: true,
    description: 'High-level scope definition including in-scope and out-of-scope items.',
    prompt_guidance: 'Define: (1) In-Scope: list major deliverables, work packages, and boundaries explicitly included, (2) Out-of-Scope: explicitly list what is excluded and why (prevents scope creep), (3) Scope Boundaries: clarify interfaces with other projects or systems. Use H8 tags for scope_items and deliverables.',
  },
  {
    order: 7,
    section_name: 'Key Deliverables & Milestones',
    section_type: 'schedule',
    required: true,
    description: 'Major project deliverables and high-level milestone schedule.',
    prompt_guidance: 'List all key deliverables with their acceptance criteria. Then provide a milestone schedule table with: Milestone Name, Target Date, and Dependencies. Include project start, key phase gates, and project closure milestone. Use H8 tags for milestones and deliverables.',
  },
  {
    order: 8,
    section_name: 'Budget & Financial Authority',
    section_type: 'financial',
    required: true,
    description: 'High-level budget summary, funding source, and financial authorization.',
    prompt_guidance: 'Include: (1) Total Approved Budget with breakdown by major category (labor, infrastructure, licenses, contingency), (2) Funding Source / Cost Centre, (3) Financial Authority (who can approve spend up to what limit), (4) Contingency Reserve %. Use H8 tags for budget_baseline and cost_estimates.',
  },
  {
    order: 9,
    section_name: 'Stakeholder Register',
    section_type: 'stakeholders',
    required: true,
    description: 'Identification of key stakeholders with their roles, influence, and interests.',
    prompt_guidance: 'Create a stakeholder register table with columns: Name, Role/Title, Organization, Influence Level (High/Medium/Low), Interest Level (High/Medium/Low), Engagement Strategy. Include at minimum: Project Sponsor, Project Manager, Key Business Owner, and primary end-user groups. Use H8 tags for every stakeholder.',
  },
  {
    order: 10,
    section_name: 'Project Team & Organizational Structure',
    section_type: 'resources',
    required: true,
    description: 'Project team structure, roles, and responsibilities (RACI overview).',
    prompt_guidance: `This section directly addresses PMBOK's requirement to define project roles and responsibilities. It MUST contain all of the following:
1. **Organizational Chart**: A text-based or table representation of the project team hierarchy showing reporting lines from Sponsor → PM → workstream leads → team members.
2. **Role Definitions Table**: For each project role, define:
   - Role Title
   - Assigned Person or Team
   - Key Responsibilities (3-5 bullet points per role)
   - Reporting Line
   - % Allocation (Full-time / Part-time / As-needed)
   Roles must include at minimum: Project Sponsor, Project Manager, Business Analyst, Technical Lead, QA Lead, and Change Manager (or equivalent).
3. **RACI Matrix**: A matrix table with Roles as columns and 6-10 key project activities/decisions as rows. Each cell must contain R (Responsible), A (Accountable), C (Consulted), or I (Informed). Every row must have exactly ONE 'A'.
   Activities to cover: Project Charter Approval, Budget Approval, Scope Change Decisions, Risk Escalation, Milestone Sign-off, Vendor Selection, Go/No-Go Decision, Lessons Learned Review.
4. Use H8 tags for every roles_and_responsibilities entity defined in this section.`
  },
  {
    order: 11,
    section_name: 'Assumptions & Constraints',
    section_type: 'risks',
    required: true,
    description: 'Project assumptions and constraints that bound the project.',
    prompt_guidance: 'List: (1) Assumptions — things believed to be true that the project plan depends on (at least 5), (2) Constraints — fixed limitations (budget, schedule, regulatory, technology, resource). For each, state the assumption/constraint and its impact if it proves false or is violated. Use H8 tags for constraints.',
  },
  {
    order: 12,
    section_name: 'Risk Summary',
    section_type: 'risks',
    required: true,
    description: 'High-level identification of top project risks with initial mitigation strategies.',
    prompt_guidance: 'Identify the top 6-10 project risks. For each risk provide: Risk Description, Category (technical/schedule/budget/resource/external), Probability (H/M/L), Impact (H/M/L), Risk Score, and Initial Mitigation Strategy. Present as a risk register table. Use H8 tags for risks and risk_responses.',
  },
  {
    order: 13,
    section_name: 'Project Governance & Decision Framework',
    section_type: 'governance',
    required: true,
    description: 'Governance model, decision-making framework, escalation paths, and reporting cadence.',
    prompt_guidance: 'Define: (1) Governance bodies (Steering Committee, Project Board) with mandate and cadence, (2) Decision authority matrix (who decides what), (3) Escalation path and thresholds, (4) Reporting cadence (status reports, dashboards), (5) Change control process overview. Use H8 tags for steering_committees and governance_decisions.',
  },
  {
    order: 14,
    section_name: 'Communication Plan',
    section_type: 'communications',
    required: false,
    description: 'How project information will be communicated to stakeholders.',
    prompt_guidance: 'Create a communication plan table: Audience, Information Type, Frequency, Format/Channel, Owner. Include at minimum: status updates, steering committee reports, team standups, and executive dashboards.',
  },
  {
    order: 15,
    section_name: 'Dependencies & Interfaces',
    section_type: 'scope',
    required: false,
    description: 'Internal and external dependencies, and interfaces with other projects or systems.',
    prompt_guidance: 'List: (1) Internal Dependencies — other projects or workstreams this project depends on or impacts, (2) External Dependencies — third-party vendors, regulatory bodies, or external systems, (3) System Interfaces — technical integration points. For each, state the dependency, owner, and risk if not met.',
  },
  {
    order: 16,
    section_name: 'Quality Standards & Acceptance Criteria',
    section_type: 'quality',
    required: false,
    description: 'Quality standards, testing requirements, and high-level acceptance criteria.',
    prompt_guidance: 'Define: (1) Applicable quality standards and frameworks (ISO, PMBOK, internal standards), (2) Key quality requirements (performance benchmarks, reliability targets, compliance requirements), (3) High-level acceptance criteria for the final project deliverable. Use H8 tags for quality_standards and requirements.',
  },
  {
    order: 17,
    section_name: 'Procurement Summary',
    section_type: 'procurement',
    required: false,
    description: 'Overview of procurement needs and vendor engagement approach.',
    prompt_guidance: 'Identify major procurement needs: goods, services, or works to be procured externally. For each: Item/Service, Estimated Value, Procurement Method (RFQ/RFP/sole source), Expected Timeline, and Key Vendor Risks. Only include if significant external procurement is planned.',
  },
  {
    order: 18,
    section_name: 'Charter Approval & Sign-off',
    section_type: 'approval',
    required: true,
    description: 'Formal sign-off section for the Project Sponsor and key governance approvers.',
    prompt_guidance: 'Create a formal approval section with: (1) A statement that signatories formally authorize the project to proceed as described in this charter, (2) A signature table with columns: Name, Role, Signature, Date — for Project Sponsor, Project Manager, and any required governance approvers, (3) Brief notes on what approval means and any conditions attached.',
  },
]

async function main() {
  await connectDatabase()

  for (const templateId of CHARTER_IDS) {
    // Verify the template exists
    const check = await pool.query(`SELECT id, name, template_paragraphs FROM templates WHERE id = '${templateId}'`)
    if (check.rows.length === 0) {
      console.warn(`Template ${templateId} not found — skipping`)
      continue
    }

    const existing = check.rows[0]
    const existingParagraphs = existing.template_paragraphs
    const existingCount = Array.isArray(existingParagraphs) 
      ? existingParagraphs.length 
      : (existingParagraphs ? 'non-array' : 'null')
    console.log(`\nUpdating: "${existing.name}" (${templateId})`)
    console.log(`  Current template_paragraphs: ${existingCount} sections`)

    await pool.query(
      `UPDATE templates SET template_paragraphs = $1::jsonb, updated_at = NOW() WHERE id = '${templateId}'`,
      [JSON.stringify(sections)]
    )

    // Verify
    const verify = await pool.query(`SELECT template_paragraphs FROM templates WHERE id = '${templateId}'`)
    const saved = verify.rows[0].template_paragraphs  // pg returns JSONB already parsed
    const savedArr = Array.isArray(saved) ? saved : JSON.parse(saved)
    console.log(`  ✅ Saved ${savedArr.length} sections:`)
    savedArr.forEach((s: any) => console.log(`     ${s.order}. ${s.section_name} (required: ${s.required})`))
  }

  console.log('\n✅ All Project Charter templates updated successfully.')
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
