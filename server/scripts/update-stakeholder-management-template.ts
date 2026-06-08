/**
 * Update Stakeholder Management Plan template — extract structure from bloated
 * system_prompt into 12 template_paragraphs; archive prior version + bump prompt_version.
 *
 * Template ID: 8d66dba0-c4f2-4b4f-807a-ca4c71e395ad
 */
import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

const STAKEHOLDER_SMP_ID = '8d66dba0-c4f2-4b4f-807a-ca4c71e395ad'

const CHANGE_SUMMARY =
  'v2: Split mega system_prompt into 12 template_paragraphs; PMBOK 7 Stakeholders performance domain; tailoring, escalation, comms cadence, H8 tags.'

const systemPrompt = `You are an expert Project Management Consultant and Communications Specialist with deep knowledge of the *PMBOK® Guide – Seventh Edition* **Stakeholders performance domain** and the **Engagement principle**. Your task is to construct a comprehensive Stakeholder Management Plan (SMP) as a subsidiary component of the Project Management Plan (PMP), based on user-provided project context (including the Stakeholder Register when available).

STRUCTURAL CONSISTENCY: This template defines exactly twelve sections via template_paragraphs. Each paragraph maps to one document section in the same order. Do not merge, split, or rename sections unless the user request explicitly overrides the template.

General rules:
- Map sections to stakeholder engagement lifecycle: Identify Stakeholders → Analyze → Plan Engagement → Manage Engagement → Monitor Engagement (PMBOK 7 Stakeholders domain).
- Use project-specific stakeholder names, roles, and organizations from context — never "[Insert]" when data exists.
- Avoid 'Vacancy' placeholders; use '[TBD - Role]' if a role is unassigned.
- Maintain consistent stakeholder naming across all sections.
- Use active voice; each narrative section MUST contain a minimum of 50 words of substantive prose (excluding tables and lists).
- **Tailoring (PMBOK 7 Development Approach):** State the project's lifecycle (predictive, adaptive, or hybrid) and explain how stakeholder identification, engagement planning, and monitoring are tailored.
- Focus on proactive engagement, expectation management, and conflict mitigation — not reactive reporting only.
- Use H8 entity tags for named entities: stakeholders, stakeholder_engagements, engagement_actions, stakeholder_issues, relationship_health.`

const templateParagraphs = [
  {
    order: 1,
    section_name: 'Stakeholder Management Plan Overview',
    section_type: 'header',
    required: true,
    description:
      'Document identification, purpose, scope of the SMP, PMP linkage, and PMBOK alignment (Plan Stakeholder Engagement).',
    prompt_guidance: `PMBOK: **Plan Stakeholder Engagement** / Stakeholders domain. Open with metadata:
- Document Title: Stakeholder Management Plan
- Project Name (from context)
- Version, Date, Prepared By, Approved By

Then write (minimum 50 words of narrative prose per subsection, excluding tables):
1. **Purpose** — achieve and maintain commitment, support, and collaboration of all parties.
2. **Scope of this SMP** — REQUIRED: which stakeholder groups, project phases, and engagement activities this plan covers; explicit exclusions.
3. **Linkage to the PMP** — REQUIRED: how this SMP integrates as a subsidiary of the Project Management Plan; references to Communication Management Plan and Stakeholder Register.
4. **PMBOK 7 alignment** — Engagement principle; map lifecycle phases (Identify → Analyze → Plan → Manage → Monitor) to document sections.
5. **Development Approach Tailoring** — REQUIRED: predictive, adaptive, or hybrid; how engagement cadence and formality are tailored.
6. **Key roles (summary)** — table: Role | Name (from context) | Stakeholder responsibility — preview; detail in Section 7.
7. **Communications cadence (summary)** — table: Audience | Touchpoint | Frequency | Owner — preview; full matrix in Section 6.

Do NOT include detailed engagement matrices here (Sections 4–5).`,
  },
  {
    order: 2,
    section_name: 'Stakeholder Identification and Analysis Approach',
    section_type: 'narrative',
    required: true,
    description: 'How stakeholders are identified, classified, and analyzed (Identify Stakeholders).',
    prompt_guidance: `PMBOK: **Identify Stakeholders**. Minimum 50 words of narrative prose.

Include:
1. **Identification process** — sources (charter, register, workshops, org chart, contracts); continuous identification triggers.
2. **Classification dimensions** — internal/external, primary/secondary, role-based groups relevant to this project.
3. **Analysis techniques** — power/influence, interest, impact, attitude (support/neutral/resist); salience model if applicable.
4. **Update cadence** — when the stakeholder list is refreshed (phase gates, org changes, new vendors).
5. **Link to Stakeholder Register** — this plan governs engagement; register holds master data (reference, do not duplicate full register).`,
  },
  {
    order: 3,
    section_name: 'Stakeholder Register Integration and Categorization',
    section_type: 'stakeholder',
    required: true,
    description: 'Summary table of key stakeholders from context with categorization fields.',
    prompt_guidance: `Minimum 50 words of narrative prose before tables.

REQUIRED **stakeholder summary table** (at least 6 rows from project context):
| ID | Name/Role | Organization | Power/Influence | Interest | Attitude | Engagement quadrant | Owner |

Use named stakeholders from context; mark inferred entries as "(Inferred)" with one-line justification.
Use H8 tags for stakeholders entity type on named individuals/groups.`,
  },
  {
    order: 4,
    section_name: 'Power/Interest Matrix and Engagement Strategies',
    section_type: 'matrix',
    required: true,
    description: 'Quadrant-based engagement strategies (Manage Closely, Keep Satisfied, Keep Informed, Monitor).',
    prompt_guidance: `Minimum 50 words of narrative prose.

Include:
1. **Matrix definition** — explain quadrants (High/Low Power × High/Low Interest) and PMBOK engagement categories.
2. **Quadrant strategy table** — REQUIRED: Quadrant | Stakeholder examples (from context) | Engagement goal | Strategy summary | Default frequency.
3. **Strategy rationale** — tie strategies to project value proposition and risk posture.

Map each key stakeholder from Section 3 to a quadrant. Use H8 tags for stakeholder_engagements where strategies are named.`,
  },
  {
    order: 5,
    section_name: 'Tailored Engagement Actions by Stakeholder Group',
    section_type: 'narrative',
    required: true,
    description: 'Specific actionable engagement steps per quadrant or key stakeholder group.',
    prompt_guidance: `Minimum 50 words of narrative prose.

REQUIRED table: Stakeholder/Group | Engagement actions (3+ concrete steps) | Owner | Frequency | Success indicator.

Cover at minimum: Manage Closely, Keep Satisfied, Keep Informed groups with project-specific actions (not generic placeholders).
High-power/low-interest change-management tactics for adoption resistance.
Use H8 tags for engagement_actions.`,
  },
  {
    order: 6,
    section_name: 'Communication Plan and Cadence Matrix',
    section_type: 'communication',
    required: true,
    description: 'Information requirements, channels, frequency, and escalation for stakeholder communications.',
    prompt_guidance: `Minimum 50 words of narrative prose.

REQUIRED **communications cadence matrix**:
| Stakeholder group | Required information | Format/channel | Frequency | Owner | Escalation trigger |

Cover: executives/sponsor, execution team, end-users/operations, GRC/compliance, vendors — tailored to project context.
Define escalation when messages are unanswered or conflict arises (link Section 8).`,
  },
  {
    order: 7,
    section_name: 'Roles and Responsibilities for Stakeholder Management',
    section_type: 'governance',
    required: true,
    description: 'RACI for identification, analysis, engagement planning, execution, and monitoring.',
    prompt_guidance: `Minimum 50 words of narrative prose.

Include:
1. Role definitions — Sponsor, PM, Business Analyst, Change Manager, PMO, Technical Lead (use names from context).
2. RACI matrix — Identify | Analyze | Plan engagement | Manage engagement | Monitor × roles.
3. Delegation — who can approve engagement plan changes and communication exceptions.

Use H8 tags for stakeholders on named roles.`,
  },
  {
    order: 8,
    section_name: 'Expectation and Conflict Management',
    section_type: 'governance',
    required: true,
    description: 'Expectation alignment, conflict resolution paths, and dissent handling.',
    prompt_guidance: `Minimum 50 words of narrative prose.

Include:
1. **Expectation management** — anchor discussions to scope/charter/value proposition; kick-off alignment tactics.
2. **Conflict resolution** — PM-level resolution → Steering Committee/CCB escalation criteria.
3. **Stakeholder dissent protocol** — steps for high-power dissenters (1-on-1, root cause, CCB referral).
4. **Documentation** — how conflicts and resolutions are recorded.`,
  },
  {
    order: 9,
    section_name: 'Change Management and Adoption Strategy',
    section_type: 'narrative',
    required: true,
    description: 'Organizational change, training, UAT/pilot, and operational handover for stakeholder adoption.',
    prompt_guidance: `Minimum 50 words of narrative prose.

Include:
1. **Adoption strategy** — co-creation, UAT/pilot involvement, champions/network, training plan outline.
2. **Readiness criteria** — when stakeholders are considered ready to adopt deliverables.
3. **Resistance mitigation** — tactics for Keep Informed/Consult groups at risk of resistance.
4. **Handover** — operational transition responsibilities and sign-off.`,
  },
  {
    order: 10,
    section_name: 'Stakeholder Engagement Monitoring',
    section_type: 'metrics',
    required: true,
    description: 'Metrics, review cadence, and triggers to update engagement strategies (Monitor Stakeholder Engagement).',
    prompt_guidance: `PMBOK: **Monitor Stakeholder Engagement**. Minimum 50 words of narrative prose.

Include:
1. **Engagement metrics table** — Metric | Target | Data source | Review frequency | Owner (e.g. satisfaction pulse, attendance, issue closure rate, relationship health).
2. **Review cadence** — formal SMP review (phase-end or quarterly); triggers when power/interest ratings change.
3. **Corrective actions** — when metrics fall below target, what changes to engagement strategy.

Use H8 tags for relationship_health or satisfaction_surveys where applicable.`,
  },
  {
    order: 11,
    section_name: 'Risk and Escalation Linkage',
    section_type: 'risk',
    required: true,
    description: 'Stakeholder-related risks, escalation levels, and link to risk register.',
    prompt_guidance: `Minimum 50 words of narrative prose.

Include:
1. **Stakeholder risk table** — Risk | Stakeholder link | Impact on engagement | Mitigation | Owner.
   Focus: opposition, disengagement, conflicting priorities, key person dependency, communication breakdown.
2. **Escalation levels** — REQUIRED table: Level | Condition | Escalate to | Timeframe | Action (at least PM → Sponsor/Steering → Executive).
3. Link to project risk register — do not duplicate full RMP.

Use H8 tags for stakeholder_issues and risks.`,
  },
  {
    order: 12,
    section_name: 'Tools, Templates, and Plan Maintenance',
    section_type: 'reference',
    required: true,
    description: 'Systems, artifacts, review triggers, and formal approval.',
    prompt_guidance: `List:
1. **Tools** — ADPA, Confluence, Jira, email, collaboration platforms (from context).
2. **Templates** — Stakeholder Register, engagement log, meeting minutes, satisfaction survey, escalation form.
3. **Repositories** — where SMP, register, and engagement records are stored and version-controlled.
4. **Plan maintenance** — review triggers (org change, phase gate, rating shift); approval block (Prepared by / Approved by).
5. **Living document statement** — how updates are controlled and communicated.`,
  },
]

async function archiveCurrentVersion(
  client: Awaited<ReturnType<typeof pool.connect>>,
  templateId: string,
  versionNumber: number,
  changeSummary: string
): Promise<string | null> {
  const existing = await client.query(
    `SELECT id FROM template_versions WHERE template_id = $1 AND version_number = $2`,
    [templateId, String(versionNumber)]
  )
  if (existing.rows.length > 0) {
    console.log(`  Version archive v${versionNumber} already exists — skipping duplicate snapshot`)
    return existing.rows[0].id
  }

  const archived = await client.query(
    `SELECT create_template_version($1, $2, $3, $4, $5) AS id`,
    [templateId, String(versionNumber), 'structural_update', changeSummary, null]
  )
  return archived.rows[0]?.id ?? null
}

async function updateTemplate() {
  await connectDatabase()

  const check = await pool.query(
    `SELECT id, name, prompt_version, template_paragraphs, length(system_prompt) as sp_len
     FROM templates WHERE id = $1`,
    [STAKEHOLDER_SMP_ID]
  )
  if (check.rows.length === 0) {
    throw new Error(`Template not found: ${STAKEHOLDER_SMP_ID}`)
  }

  const existing = check.rows[0]
  const oldVersion = Number(existing.prompt_version ?? 1)
  const newVersion = oldVersion + 1
  const prevCount = Array.isArray(existing.template_paragraphs)
    ? existing.template_paragraphs.length
    : existing.template_paragraphs == null
      ? 0
      : 'invalid'

  console.log(`Updating "${existing.name}" (${STAKEHOLDER_SMP_ID})`)
  console.log(`  Previous: template_paragraphs=${prevCount}, system_prompt=${existing.sp_len} chars, prompt_version=v${oldVersion}`)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const archiveId = await archiveCurrentVersion(client, STAKEHOLDER_SMP_ID, oldVersion, CHANGE_SUMMARY)
    if (archiveId) {
      console.log(`  Archived pre-update snapshot → template_versions.id=${archiveId} (v${oldVersion})`)
    }

    await client.query(
      `INSERT INTO template_version_history (template_id, version_number, changes)
       VALUES ($1, $2, $3)`,
      [STAKEHOLDER_SMP_ID, String(newVersion), CHANGE_SUMMARY]
    )

    const res = await client.query(
      `UPDATE templates
       SET system_prompt = $1,
           template_paragraphs = $2::jsonb,
           framework = 'PMBOK 7',
           prompt_version = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, prompt_version, template_paragraphs`,
      [systemPrompt, JSON.stringify(templateParagraphs), newVersion, STAKEHOLDER_SMP_ID]
    )

    await client.query('COMMIT')

    const updated = res.rows[0]
    const sections = updated.template_paragraphs as typeof templateParagraphs
    console.log(`  Updated: ${sections.length} template_paragraphs, system_prompt=${systemPrompt.length} chars, prompt_version=v${updated.prompt_version}`)
    sections.forEach((s) => console.log(`    ${s.order}. ${s.section_name}`))
    console.log('Done.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

updateTemplate().catch((err) => {
  console.error(err)
  process.exit(1)
})
