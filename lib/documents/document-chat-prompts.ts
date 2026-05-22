const DOCUMENT_PROMPTS: { keywords: string[]; prompts: string[] }[] = [
  {
    keywords: ["risk"],
    prompts: [
      "Show all risks as a table",
      "Which risks are critical?",
      "Visualize risk probability vs impact",
      "List mitigation strategies",
    ],
  },
  {
    keywords: ["stakeholder"],
    prompts: [
      "Show stakeholder matrix",
      "List all stakeholders by influence",
      "Who are the key decision makers?",
      "Engagement level by stakeholder",
    ],
  },
  {
    keywords: ["charter", "project"],
    prompts: [
      "Charter as Card + Accordion with Bullets in each section",
      "Add a milestones section as Steps or Bullets inside the Accordion",
      "Expand scope and deliverables in a Table from this document",
      "Who is the project sponsor? Use a Callout if not stated in the document",
    ],
  },
  {
    keywords: ["quality"],
    prompts: [
      "List quality metrics",
      "Show quality gates",
      "What are the acceptance criteria?",
      "Quality KPIs table",
    ],
  },
  {
    keywords: ["communication", "plan"],
    prompts: [
      "Show communication matrix",
      "List reporting cadence",
      "Who receives which reports?",
      "Visualize communication flow",
    ],
  },
]

/** Suggested chat prompts based on document name / template keywords. */
export function getDocumentChatPrompts(docName: string, templateName?: string): string[] {
  const haystack = `${docName} ${templateName ?? ""}`.toLowerCase()
  for (const entry of DOCUMENT_PROMPTS) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      return entry.prompts
    }
  }
  return [
    "Render the full document: cover page, table of contents, then one Card per numbered chapter (### subsections inside chapters). Dark report theme — black background, gray sunk cards. Use Bullets for lists; Team only for named rosters.",
    "Summarize this document in a short executive overview",
    "Show the main sections as a structured table",
    "List every action item and owner mentioned",
    "What are the top risks or gaps in this document?",
    "Transform this document: root = Stack with intro Card + Accordion or section Cards (no Report component)",
  ]
}
