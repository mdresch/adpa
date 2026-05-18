/**
 * ADPA OpenUI System Prompt
 * Uses adpaLibrary.prompt() + document transformation agent spec.
 * Safe to import from the Express backend (component renderers are not invoked).
 */

import { adpaLibrary } from "./adpaLibrary"
import { buildDocumentTransformationAgentPrompt } from "./documentTransformationAgent"

const ADPA_OPENUI_RULES = [
  "Output ONLY OpenUI Lang statement syntax — never XML tags, never JSON, never raw Markdown outside Prose strings.",
  "The FIRST line must be: root = Report(title, subtitle, meta, [sectionRef1, sectionRef2, ...])",
  "Create one Section for every major heading in the source markdown, in the same order. Do not skip or merge sections.",
  "COMPLETE FIDELITY: Every paragraph, list item, table row, and field from the source must appear. Never summarize, abbreviate with 'etc.', or invent content.",
  "Default section body is Prose(null, paragraphs) or Prose(null, null, body) with full section text from the source.",
  "Use Table, Bullets, Card, or Team ONLY when that block can hold ALL information from that section without loss. Otherwise use Prose.",
  "For 4+ major sections, add an early Section('Table of Contents', ...) whose content is TableOfContents with every section title.",
  "Report meta: include Status, Version, Author, Date from the source when present — do not fabricate.",
  "Layout is a vertical formal report — no tabs unless explicitly requested.",
  "Chart values must be numbers. Use Chart only for numeric data already in the source.",
  "Use positional arguments in Zod key order; omit optional trailing args rather than passing null when possible.",
]

const ADPA_PROMPT_EXAMPLE = `root = Report("Project Charter", "PMBOK", {Status: "Draft", Version: "1.0"}, [tocSec, sec1, sec2, sec3])
tocSec = Section("Table of Contents", null, 1, toc)
toc = TableOfContents("Table of Contents", [{title: "1. Purpose", level: 1}, {title: "2. Objectives", level: 1}, {title: "3. Authorization", level: 1}])
sec1 = Section("1. Purpose", null, 1, purposeProse)
purposeProse = Prose(null, ["The purpose of this project is to deliver the customer portal upgrade by Q4.", "Success criteria include user adoption above 80% and zero critical defects at launch."])
sec2 = Section("2. Objectives", null, 1, objectives)
objectives = Bullets(null, "numbered", ["Deliver MVP by 31 Dec 2025", "Stay within approved budget of $1.2M", "Maintain ISO 27001 compliance throughout"])
sec3 = Section("3. Authorization", null, 1, authProse)
authProse = Prose(null, ["This charter authorizes the project manager to apply organizational resources to project activities.", "The executive sponsor approves scope changes over $50k."])`

/**
 * Base system prompt: transformation agent + component library schema.
 */
export function buildADPALibraryPrompt(documentContext?: {
  documentName?: string
  documentType?: string
}): string {
  const agent = buildDocumentTransformationAgentPrompt()

  const documentLine = documentContext?.documentName
    ? `Current document: "${documentContext.documentName}"${documentContext.documentType ? ` (${documentContext.documentType})` : ""}.`
    : ""

  const preamble = [agent, documentLine].filter(Boolean).join("\n\n")

  return adpaLibrary.prompt({
    preamble,
    additionalRules: ADPA_OPENUI_RULES,
    examples: [ADPA_PROMPT_EXAMPLE],
  })
}

export function buildOpenUISystemPrompt(options?: {
  documentName?: string
  documentType?: string
}): string {
  return buildADPALibraryPrompt({
    documentName: options?.documentName,
    documentType: options?.documentType,
  })
}

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
    parts.push(`=== SOURCE MARKDOWN: ${options.documentName} ===`)
    parts.push(options.documentContent)
    parts.push("=== END SOURCE ===")
    parts.push(
      "Transform this markdown into a complete OpenUI Report: preserve all content and meaning; improve presentation only. One Section per heading; Prose for full narrative; structured blocks only when nothing is omitted."
    )
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
  parts.push(
    "\nRespond with OpenUI Lang only. root = Report(...). Faithful transformation — no content changes unless the user explicitly asked to edit."
  )

  return parts.join("\n")
}
