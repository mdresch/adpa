/**
 * OpenUI Chat system prompts — GenUI library grammar via projectOpenUIPromptLibrary (openui + Bullets).
 * Safe to import from the Express backend (prompt() only; no React renderers).
 */

import { projectOpenUIPromptLibrary, openuiPromptOptions } from "@/lib/openui/projectOpenUIPromptLibrary"
import {
  buildLayoutPlan,
  formatLayoutPlanForExecutor,
  OPENUI_EXECUTOR_RULES,
  wantsGenuiReportDarkTheme,
} from "@/lib/openui/layoutPlan"

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
    description: "Report-style charter: summary card plus one Card per major section.",
    prompt:
      "Create a project charter: intro Card with CardHeader and summary TextContent, then one Card per section (overview, objectives, scope, stakeholders, risks, success criteria) each with CardHeader and body (Bullets, Table, Team, or TextContent). Use Bullets for lists; Accordion only if the user explicitly asks for collapsible sections.",
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

const PROJECT_OPENUI_RULES = [
  "Respond with valid OpenUI Lang only — use the component grammar from the library prompt above (full GenUI catalog: Card, Stack, Accordion, Table, Tabs, Steps, Callout, charts, TextContent, Bullets, etc.).",
  "Always assign root = … first line; never use the legacy Report(...) component.",
  "Never make the entire answer a single Bullets(...) assignment. Compose root = Stack([...]) or a primary Card/Accordion with multiple child components.",
  "Do not wrap OpenUI Lang in markdown code fences or prose outside component assignments.",
  "Ground every claim in project or document context in the user message — do not invent sponsors, dates, budgets, or metrics.",
  "When data is missing, use Callout with variant warning or TextContent stating \"Not specified in context\" — do not use [To be defined] placeholders.",
  "CardHeader must appear inside Card, never alone at the root.",
  "CardHeader: positional only — CardHeader(\"title\") or CardHeader(\"title\", \"subtitle\"). Never title= named syntax. Never three arguments; never pass \"default\", TextContent, or children as extra args.",
  "Use Bullets for real bullet or numbered lists inside a section Card — not as the sole top-level widget.",
  "Multi-section reports: one top-level Card per major chapter (numbered ## or H1); ### / 1.1 subsections go inside that Card. Do not create 20+ sibling Cards or repeat heading text as empty TextContent.",
  "Accordion + AccordionItem only when the user explicitly asks for accordion/collapsible/FAQ and Bullets is not the better alternative for that content.",
  "Use Table for comparisons, registers, and matrices; Table([Col(\"Header\", [row1, row2, ...]), ...]) with a single argument — never Table(..., \"caption\").",
  "Use Tabs when the user asks to compare categories side by side.",
  "Use Steps for phased plans; use BarChart/LineChart/PieChart only when numeric series exist in context (values must be numbers).",
  "Prefer rich layouts: charter = intro Card + section Cards; status = intro Card + section Cards + Table; risks = Table or section Cards (+ Callout for top risk).",
]

const ADPA_EXTENSION_RULES = [
  "ADPA extensions (merged with GenUI): Bullets, Timeline, Team, Comparison, TableOfContents, ReportCoverHero, TwoColumnProse — use GenUI Callout (not Alert) for banners.",
  "Timeline vs Steps: Timeline when milestones have dates or phase labels and optional status; GenUI Steps for procedural workflows without a dated roadmap.",
  "Team vs Table: Team for people (name, role, responsibility); Table for homogeneous registers (risks, requirements, RAID).",
  "Comparison vs Table: Comparison for 2–4 side-by-side option columns (in-scope vs out-of-scope); Table for many rows sharing the same columns.",
  "TwoColumnProse vs Stack: TwoColumnProse for long subsection intros with exactly two narrative columns (e.g. §1.1 Overview); never three stacked TextContent blocks.",
  "TableOfContents: top of Stack when the answer has 4+ major sections; entries must match real section titles from context.",
]

const OPENUI_LAYOUT_HINTS = [
  "Report pattern: intro Card + one Card per major chapter (## 1. …, ## 2. …); ### subsections nest inside that chapter as Stack([CardHeader(\"1.1 …\"), Table|Bullets|TextContent]) — not one Card per ###.",
  "Charter pattern: headerCard = Card([CardHeader(\"Document title\"), TextContent(summary, \"default\")]); each section = Card([CardHeader(\"Section name\"), Bullets|Table|TextContent]); root = Stack([headerCard, sectionCard1, sectionCard2, ...]).",
  "Status pattern: root = Stack([summaryCard, highlightsBullets, blockersTable]) with summaryCard = Card([CardHeader(\"Status\"), TextContent(lead, \"default\")]).",
  "Risk pattern: root = Stack([Callout(optionalTopRisk, \"warning\"), riskTable]) or Accordion of AccordionItem per risk.",
  "Roadmap pattern: root = Stack([summaryCard, Timeline(milestones=[...])]) or Timeline alone under a Card header.",
  "Long report pattern: root = Stack([cover Card with CardHeader(document title, optional subtitle) + TextContent(short cover blurb only), TableOfContents(entries=[...]), chapter Cards with full section text...]).",
  "Cover blurb vs chapter 1: cover TextContent is a 2-4 sentence teaser; the Executive Summary chapter keeps the full narrative.",
  "Do not dump duplicate KPI/risk/budget tables in the final subsection; each table belongs under its chapter only.",
]

/**
 * Base system prompt: OpenUI GenUI component library schema + project rules.
 */
export function buildOpenUIGenuiLibraryPrompt(context?: {
  documentName?: string
  documentType?: string
  projectName?: string
  framework?: string | null
}): string {
  const base = projectOpenUIPromptLibrary.prompt(openuiPromptOptions)

  const lines: string[] = []
  if (context?.projectName) {
    lines.push(`Active project: "${context.projectName}"${context.framework ? ` (${context.framework})` : ""}.`)
  }
  if (context?.documentName) {
    lines.push(
      `Focused document: "${context.documentName}"${context.documentType ? ` (${context.documentType})` : ""}.`
    )
  }

  return [
    base,
    lines.join("\n"),
    "### Layout rules\n" + PROJECT_OPENUI_RULES.map((r) => `- ${r}`).join("\n"),
    "### ADPA extensions (when to use)\n" + ADPA_EXTENSION_RULES.map((r) => `- ${r}`).join("\n"),
    "### Patterns (adapt to context)\n" + OPENUI_LAYOUT_HINTS.map((h) => `- ${h}`).join("\n"),
    "### Layout plan execution (strict)\n" + OPENUI_EXECUTOR_RULES.map((r) => `- ${r}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n")
}

/** Text used for segment → component planning (not necessarily duplicated in the user message). */
export function getLayoutSourceText(options: {
  documentContent?: string
  ragContext?: string
}): string {
  const parts: string[] = []
  if (options.documentContent?.trim()) {
    parts.push(options.documentContent.trim())
  }
  if (options.ragContext?.trim() && !options.ragContext.startsWith("No internal")) {
    parts.push(options.ragContext.trim())
  }
  return parts.join("\n\n")
}

export function buildOpenUISystemPrompt(options?: {
  documentName?: string
  documentType?: string
  projectName?: string
  framework?: string | null
}): string {
  return buildOpenUIGenuiLibraryPrompt(options)
}

export function buildOpenUIUserMessage(options: {
  prompt: string
  documentContent?: string
  documentName?: string
  ragContext?: string
  projectName?: string
  projectDescription?: string
  /** When false, document/RAG text is only used for layout planning (e.g. GenUI doc already in system prompt). */
  includeSourceInUserMessage?: boolean
  /** Explicit text for segment → component planning (defaults to document + RAG). */
  layoutSourceText?: string
  documentId?: string
  /** AI- or heuristic-generated short cover blurb (doc-cover only). */
  coverSummary?: string
}): string {
  const parts: string[] = []
  const includeSource = options.includeSourceInUserMessage !== false
  const layoutSource =
    options.layoutSourceText?.trim() ||
    getLayoutSourceText({
      documentContent: options.documentContent,
      ragContext: options.ragContext,
    })

  if (includeSource) {
    if (options.documentName && options.documentContent) {
      parts.push(`=== SOURCE DOCUMENT: ${options.documentName} ===`)
      parts.push(options.documentContent)
      parts.push("=== END SOURCE ===")
      parts.push(
        "Use this document as the primary source. Answer with OpenUI Lang components grounded in the text above."
      )
    } else if (options.ragContext && !options.ragContext.startsWith("No internal")) {
      parts.push("=== PROJECT CONTEXT (retrieved) ===")
      parts.push(options.ragContext)
      parts.push("=== END CONTEXT ===")
    } else if (options.projectName) {
      parts.push(`Project: ${options.projectName}`)
      if (options.projectDescription) {
        parts.push(`Description: ${options.projectDescription}`)
      }
    }
  } else if (options.projectName) {
    parts.push(`Project: ${options.projectName}`)
  }

  parts.push(`\nUser request: ${options.prompt}`)

  const plan = buildLayoutPlan({
    prompt: options.prompt,
    sourceText: layoutSource || undefined,
    documentId: options.documentId,
  })
  parts.push("")
  parts.push(
    formatLayoutPlanForExecutor(plan, {
      reportDarkTheme: wantsGenuiReportDarkTheme(options.prompt),
    })
  )

  parts.push(
    "\nRespond with OpenUI Lang only. Implement the REQUIRED LAYOUT PLAN exactly. Use TextContent only where a node is marked typography-fallback — preserve that sourceText in full.",
    "Emit the complete report through the last planned node (including Appendices). Do not truncate Bullets items, Table rows, or prose mid-sentence.",
    "CardHeader titles must be plain text (no ** markdown bold)."
  )

  return parts.join("\n")
}

export type OpenUIApiMessage = { role: string; content: string }

/**
 * Attach strict layout plan to the last user message (GenUI Mistral / OpenAI-format chat).
 */
export function enrichOpenUIApiMessages(
  messages: OpenUIApiMessage[],
  options: {
    layoutSourceText: string
    includeSourceInUserMessage?: boolean
    documentName?: string
    ragContext?: string
    projectName?: string
    documentId?: string
    coverSummary?: string
  }
): OpenUIApiMessage[] {
  if (messages.length === 0) return messages

  const lastIdx = [...messages].map((m, i) => ({ m, i })).reverse().find((x) => x.m.role === "user")?.i
  if (lastIdx === undefined) return messages

  const last = messages[lastIdx]
  const prompt = typeof last.content === "string" ? last.content : String(last.content)

  const enrichedContent = buildOpenUIUserMessage({
    prompt,
    documentContent: options.includeSourceInUserMessage !== false ? options.layoutSourceText : undefined,
    layoutSourceText: options.layoutSourceText,
    documentName: options.documentName,
    ragContext: options.ragContext,
    projectName: options.projectName,
    documentId: options.documentId,
    coverSummary: options.coverSummary,
    includeSourceInUserMessage: options.includeSourceInUserMessage,
  })

  return messages.map((m, i) => (i === lastIdx ? { ...m, content: enrichedContent } : m))
}

/** @deprecated Use buildOpenUIGenuiLibraryPrompt — kept for imports that expected ADPA Report grammar */
export const buildADPALibraryPrompt = buildOpenUIGenuiLibraryPrompt
