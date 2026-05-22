const PROJECT_PROMPTS: { keywords: string[]; prompts: string[] }[] = [
  {
    keywords: ["risk"],
    prompts: [
      "Show top risks in a Table: risk, severity, owner, mitigation",
      "Rank critical risks in an Accordion — one item per risk with Bullets for impact and actions",
      "Add a warning Callout for the single highest-severity gap, then a risk Table",
      "List mitigation priorities as Bullets under a short summary Card",
    ],
  },
  {
    keywords: ["stakeholder"],
    prompts: [
      "Show stakeholders in a Table: name, role, influence, engagement",
      "Build a stakeholder Card summary plus Bullets for key decision makers",
      "Use Tabs for internal vs external stakeholders if context distinguishes them",
      "List open stakeholder actions in a Table with owner and status",
    ],
  },
  {
    keywords: ["charter", "initiation", "unicorn", "coas"],
    prompts: [
      "Project charter: Card header + summary, Accordion for overview, objectives, scope, stakeholders, risks, success criteria, timeline",
      "Charter Accordion with Bullets in each section — ground every field in project context",
      "Add a milestones section as Bullets or Steps inside the charter Accordion",
      "Highlight assumptions and constraints in a Callout inside the charter layout",
    ],
  },
  {
    keywords: ["status", "progress"],
    prompts: [
      "Leadership status: summary Card, Bullets for wins, Table for blockers and owners",
      "Executive update with Tabs for progress, risks, and next steps",
      "What needs escalation? Use a Table with item, owner, urgency, and due date",
      "Two-week focus: Bullets for priorities under a short status Card",
    ],
  },
  {
    keywords: ["pmbok", "prince", "agile", "safe", "babok", "dmbok"],
    prompts: [
      "Map project artifacts to framework practices in a Table: artifact, practice, gap",
      "Governance gaps as Bullets under a Card titled for the active framework",
      "Suggest the next document to produce — Steps or Bullets with rationale from context",
      "Compliance posture: Accordion by domain with Bullets for findings",
    ],
  },
  {
    keywords: ["quality", "maturity", "audit"],
    prompts: [
      "Quality gaps as a Table: area, finding, severity, recommendation",
      "Maturity assessment summary Card plus Bullets for top improvement themes",
      "Use Accordion for PMBOK/BABOK/DMBOK dimensions mentioned in context",
      "Callout for critical quality blockers, then Bullets for remediation order",
    ],
  },
]

/** Suggested chat prompts based on project name and framework. */
export function getProjectChatPrompts(projectName: string, framework?: string | null): string[] {
  const haystack = `${projectName} ${framework ?? ""}`.toLowerCase()
  for (const entry of PROJECT_PROMPTS) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      return entry.prompts
    }
  }
  return [
    "Executive overview: Stack with a summary Card (CardHeader + TextContent) and a second Card or Table for key metrics",
    "Open risks and owners in a Table — only rows supported by project context",
    "What should we focus on in the next two weeks? Card summary plus Table of priorities (owner, due, status)",
    "Charter-style layout: Card header, then Accordion sections (overview, objectives, scope, risks, success criteria)",
    "Dependencies and blockers in a Table with owner and status columns",
  ]
}
