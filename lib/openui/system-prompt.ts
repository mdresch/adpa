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
    description: "Generate a structured charter-style view from the selected project's available context.",
    prompt: "Create a project charter report with objectives, risks, milestones, and recommended next actions.",
    reportMode: true,
  },
  {
    id: "status",
    title: "Leadership status",
    description: "Ask for a concise leadership-ready update with evidence from the project context.",
    prompt: "Give me a concise project status update with the most relevant evidence from this project only.",
  },
  {
    id: "risks",
    title: "Risk scan",
    description: "Surface implementation risks, blockers, and missing dependencies in one pass.",
    prompt: "Identify the top project risks, blockers, and dependencies that need attention right now.",
  },
]