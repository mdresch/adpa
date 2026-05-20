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
      "Render full charter as a numbered report",
      "Add a milestones timeline section",
      "Expand the scope section with a table",
      "Who is the project sponsor?",
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
    "Summarize this document in a short executive overview",
    "Show the main sections as a structured table",
    "List every action item and owner mentioned",
    "What are the top risks or gaps in this document?",
    "Render the full document as an interactive report",
  ]
}
