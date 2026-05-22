export type OpenUIStarterPrompt = {
  id: string
  title: string
  description: string
  prompt: string
  reportMode?: boolean
}

export const openUIStarterPrompts: OpenUIStarterPrompt[] = [
  {
    id: "charter",
    title: "Project charter",
    description: "Accordion charter with a summary card — grounded in project context.",
    prompt:
      "Create a project charter: Card with CardHeader and summary TextContent, then an Accordion with sections for overview, objectives, scope, stakeholders, risks, success criteria, and timeline. Use Bullets for list items inside each section.",
  },
  {
    id: "status",
    title: "Leadership status",
    description: "Executive card plus tables for blockers and owners.",
    prompt:
      "Give a leadership status update: a summary Card at the top, Bullets for highlights and decisions, and a Table for blockers or open items (owner, status, due). Only use facts from this project.",
  },
  {
    id: "risks",
    title: "Risk scan",
    description: "Risk table or accordion ranked by severity.",
    prompt:
      "List the top project risks in a Table (risk, severity, likelihood, owner, mitigation) or Accordion items per risk. Add a Callout for the highest-severity gap if context supports it.",
  },
]