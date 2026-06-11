import type { NewProjectForm } from "../types"

export type ProjectDraftPayload = {
  content?: string
  templateId?: string
  templateName?: string
  framework?: string
  metadata?: Record<string, unknown>
}

const EMPTY_FORM: NewProjectForm = {
  name: "",
  description: "",
  framework: "",
  priority: "medium",
  start_date: "",
  end_date: "",
  budget: "",
  manager: "",
}

export function getDefaultNewProjectForm(): NewProjectForm {
  return { ...EMPTY_FORM }
}

function extractProjectName(content: string, templateName?: string): string {
  let titleMatch = content.match(/^#\s*Business Case:\s*(.+?)$/m)
  if (titleMatch?.[1]) return titleMatch[1].trim()

  titleMatch = content.match(/^#\s*💡\s*Ideation:\s*(.+?)$/m)
  if (titleMatch?.[1]) return titleMatch[1].trim()

  titleMatch = content.match(/^#\s+(.+?)$/m)
  if (
    titleMatch?.[1] &&
    !titleMatch[1].includes("Business Case") &&
    !titleMatch[1].includes("Ideation")
  ) {
    return titleMatch[1].trim()
  }

  const projectNameMatch = content.match(/\*\*Project Name:\*\*\s*(.+?)(?:\n|$)/m)
  return projectNameMatch
    ? projectNameMatch[1].trim()
    : templateName?.replace(" Template", "") || "New Project"
}

function extractDescription(content: string): string {
  let descMatch = content.match(/###\s*1\.2\s*Business Need\s*\n([\s\S]+?)(?=\n###|\n##|$)/i)
  if (descMatch?.[1]) return descMatch[1].trim().substring(0, 2000)

  descMatch = content.match(
    /##\s*1\.\s*The Spark[:\s]+What's the Big Idea\?\s*\n([\s\S]+?)(?=\n##\s*2\.|$)/i
  )
  if (descMatch?.[1]) {
    const sparkText = descMatch[1].trim().replace(/###\s*[\d.]+\s*[^\n]+\n/g, "")
    return sparkText.substring(0, 2000)
  }

  descMatch = content.match(/###\s*1\.1\s*Core Concept\s*\n([\s\S]+?)(?=\n###|\n##|$)/i)
  if (descMatch?.[1]) return descMatch[1].trim().substring(0, 2000)

  descMatch = content.match(/##\s*1\.\s*Executive Summary\s*\n([\s\S]+?)(?=\n##|$)/i)
  if (descMatch?.[1]) return descMatch[1].trim().substring(0, 2000)

  return content.substring(0, 2000)
}

function extractManager(content: string): string {
  const pmMatch = content.match(/\*\*Project Manager:\*\*\s*(.+?)(?:\n|,|$)/m)
  if (pmMatch?.[1]) return pmMatch[1].trim()

  const preparedByMatch = content.match(/\*\*Prepared By:\*\*\s*(.+?)(?:\n|,|$)/m)
  return preparedByMatch?.[1]?.trim() ?? ""
}

function extractBudget(content: string): string {
  const budgetMatches = [
    content.match(/\*\*Estimated Cost:\*\*\s*\$?([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)?/i),
    content.match(/budget.*?\$?([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)?/i),
    content.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)/i),
    content.match(/investment.*?\$?([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)?/i),
  ]

  for (const match of budgetMatches) {
    if (!match?.[1]) continue
    const budgetValue = match[1].replace(/,/g, "")
    const parsedValue = parseFloat(budgetValue)
    if (isNaN(parsedValue) || parsedValue <= 0) continue

    if (match[0].match(/M|Million/i)) return (parsedValue * 1_000_000).toString()
    if (match[0].match(/K|Thousand/i)) return (parsedValue * 1_000).toString()
    return parsedValue.toString()
  }

  return ""
}

function extractTimeline(content: string): { startDate: string; endDate: string } {
  let startDate = ""
  let endDate = ""

  const timelineMatch = content.match(/\*\*High-level Timeline:\*\*\s*(.+?)(?:\n|$)/m)
  if (timelineMatch?.[1]) {
    const monthsMatch = timelineMatch[1].match(/(\d+)(?:-(\d+))?\s*months?/i)
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1], 10)
      const today = new Date()
      startDate = today.toISOString().split("T")[0]
      const endDateObj = new Date(today)
      endDateObj.setMonth(endDateObj.getMonth() + months)
      endDate = endDateObj.toISOString().split("T")[0]
    }
  }

  if (!startDate) {
    const dateRangeMatch = content.match(
      /(?:October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\s*[–-]\s*(?:October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i
    )
    if (dateRangeMatch) {
      const dates = dateRangeMatch[0].split(/[–-]/)
      if (dates.length === 2) {
        try {
          startDate = new Date(dates[0].trim()).toISOString().split("T")[0]
          endDate = new Date(dates[1].trim()).toISOString().split("T")[0]
        } catch {
          // leave blank
        }
      }
    }
  }

  return { startDate, endDate }
}

function extractFramework(content: string, draftFramework?: string): string {
  let framework = draftFramework || "Custom"

  if (!framework || framework === "Custom") {
    const frameworkMatch = content.match(/\*\*Framework:\*\*\s*(.+?)(?:\n|,|$)/m)
    if (frameworkMatch?.[1]) {
      framework = frameworkMatch[1].trim()
    } else if (content.includes("PMBOK") || content.includes("Project Management")) {
      framework = "PMBOK 7"
    } else if (content.includes("BABOK") || content.includes("Business Analysis")) {
      framework = "BABOK"
    } else {
      framework = draftFramework || "Custom"
    }
  }

  return framework
}

export function parseProjectDraftForm(draft: ProjectDraftPayload): NewProjectForm {
  const content = draft.content || ""
  const { startDate, endDate } = extractTimeline(content)

  return {
    name: extractProjectName(content, draft.templateName),
    description: extractDescription(content),
    framework: extractFramework(content, draft.framework),
    priority: "high",
    start_date: startDate,
    end_date: endDate,
    budget: extractBudget(content),
    manager: extractManager(content),
  }
}

/** Read AI-routed project draft and clear the auto-create flag. Returns null if not applicable. */
export function consumeAutoCreateProjectDraft(): NewProjectForm | null {
  if (typeof window === "undefined") return null

  const autoCreate = sessionStorage.getItem("auto-create-project")
  const projectDraft = sessionStorage.getItem("project-draft")

  if (autoCreate !== "true" || !projectDraft) return null

  try {
    const draft = JSON.parse(projectDraft) as ProjectDraftPayload
    sessionStorage.removeItem("auto-create-project")
    return parseProjectDraftForm(draft)
  } catch {
    sessionStorage.removeItem("auto-create-project")
    sessionStorage.removeItem("project-draft")
    return null
  }
}

export function readProjectDraftFromSession(): ProjectDraftPayload | null {
  if (typeof window === "undefined") return null

  const raw = sessionStorage.getItem("project-draft")
  if (!raw) return null

  try {
    return JSON.parse(raw) as ProjectDraftPayload
  } catch {
    return null
  }
}

export function clearProjectDraftFromSession(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("project-draft")
}
