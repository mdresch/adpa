/**
 * ADPA OpenUI System Prompt
 * Uses adpaLibrary.prompt() to auto-generate the LLM system prompt.
 * Safe to import from the Express backend (component renderers are not invoked).
 */

import { adpaLibrary } from "./adpaLibrary"

const ADPA_ADDITIONAL_RULES = [
  "Render the ENTIRE document — not just the first section. Read every section before responding.",
  "Always wrap multi-section documents in a <Tabs> component with one tab per major section.",
  "For project charters: use Tabs with Authorization, Governance Board, Stakeholder Register, Objectives, Scope, Assumptions, Budget, Milestones, and Risks.",
  "Extract REAL data from the provided document — never invent placeholder names, dates, or numbers.",
  "Chart `data` values must be numbers, not strings.",
  "Start your response immediately with the root component — no preamble, markdown, or JSON.",
]

/**
 * Base system prompt generated from the ADPA component library schema.
 */
export function buildADPALibraryPrompt(documentContext?: {
  documentName?: string
  documentType?: string
}): string {
  const preamble = documentContext?.documentName
    ? `You are an ADPA document visualization assistant rendering "${documentContext.documentName}"${documentContext.documentType ? ` (${documentContext.documentType})` : ""}.`
    : "You are an ADPA document visualization assistant for project management documents."

  return adpaLibrary.prompt({
    preamble,
    additionalRules: ADPA_ADDITIONAL_RULES,
  })
}

/**
 * Build the full ADPA OpenUI system prompt for a chat request.
 */
export function buildOpenUISystemPrompt(options?: {
  documentName?: string
  documentType?: string
}): string {
  return buildADPALibraryPrompt({
    documentName: options?.documentName,
    documentType: options?.documentType,
  })
}

/**
 * Assemble the full user message from document context + user request.
 */
export function buildOpenUIUserMessage(options: {
  prompt: string
  documentContent?: string
  documentName?: string
  ragContext?: string
  projectName?: string
  projectDescription?: string
}): string {
  const parts: string[] = []

  if (options.documentName && options.documentContent) {
    parts.push(`=== DOCUMENT: ${options.documentName} ===`)
    parts.push(options.documentContent)
    parts.push("=== END DOCUMENT ===")
  } else if (options.ragContext && !options.ragContext.startsWith("No internal")) {
    parts.push("=== CONTEXT ===")
    parts.push(options.ragContext)
    parts.push("=== END CONTEXT ===")
  } else if (options.projectName) {
    parts.push(`Project: ${options.projectName}`)
    if (options.projectDescription) {
      parts.push(`Description: ${options.projectDescription}`)
    }
  }

  parts.push(`\nUser request: ${options.prompt}`)
  parts.push("\nGenerate the full OpenUI Lang visualization now:")

  return parts.join("\n")
}
