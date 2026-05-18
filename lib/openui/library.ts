/**
 * OpenUI Chat Library
 * Type definitions and utilities for structured component rendering
 */

// Component types - what the LLM can suggest
export type ComponentType =
  | "Table"
  | "Chart"
  | "Form"
  | "Card"
  | "Timeline"
  | "Kanban"
  | "Bullets"
  | "Tabs"
  | "Accordion"
  | "Carousel"
  | "Alert"
  | "Steps"
  | "Breadcrumb"
  | "Sidebar"
  | "Comparison"
  | "Calendar"
  | "Team"
  | "Text"
  | "Prose"
  | "TableOfContents"

// Structured JSON type for chat messages
export type OpenUIChatJson =
  | string
  | number
  | boolean
  | null
  | OpenUIChatJson[]
  | { [key: string]: OpenUIChatJson }

export type OpenUIThreadSummary = {
  id: string
  userId: string
  projectId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type OpenUIMessage = {
  id: string
  threadId: string
  userId: string
  role: "user" | "assistant" | "system" | string
  content: OpenUIChatJson
  createdAt: string
}

export type OpenUIThread = OpenUIThreadSummary & {
  messages: OpenUIMessage[]
}

export type OpenUIProject = {
  id: string
  name: string
  status?: string | null
  framework?: string | null
}

export type OpenUIProjectsResponse = {
  projects: OpenUIProject[]
}

// Component-based payload structure
export type ComponentPayload<T extends ComponentType = ComponentType> = {
  type: "component"
  component: T
  props: Record<string, OpenUIChatJson>
  data?: Array<Record<string, OpenUIChatJson>>
  schema?: Record<string, OpenUIChatJson>
  metadata?: {
    supportingEvidence?: number
    prompt?: string
    synopsis?: string
  }
}

// Text-based payload (fallback)
export type TextPayload = {
  type: "text"
  text: string
}

// Union of all possible assistant payloads
export type OpenUIAssistantPayload = ComponentPayload | TextPayload | OpenUIChatJson

// Helper to check if payload is a component
export function isComponentPayload(payload: OpenUIAssistantPayload): payload is ComponentPayload {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload)
    && "type" in payload && payload.type === "component"
}

/** Legacy JSON component payload (pre–OpenUI Lang threads) */
export function isLegacyComponentPayload(
  payload: OpenUIChatJson
): payload is ComponentPayload {
  return isComponentPayload(payload as OpenUIAssistantPayload)
}

/** Heuristic: assistant content looks like OpenUI Lang (statement syntax, not XML) */
export function looksLikeOpenUILang(text: string): boolean {
  const trimmed = text.trim()
  if (/^root\s*=/m.test(trimmed)) return true
  if (trimmed.startsWith("<") && /<[A-Z][a-zA-Z]*/.test(trimmed)) return false
  return /^[A-Za-z][\w]*\s*=/.test(trimmed)
}

// Helper to check if payload is text

export function isTextPayload(payload: OpenUIAssistantPayload): payload is TextPayload {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload)
    && "type" in payload && payload.type === "text"
}

// Extract readable text from any payload
export function extractMessageText(content: OpenUIChatJson): string {
  if (typeof content === "string") {
    return content.trim()
  }
  if (typeof content === "number" || typeof content === "boolean") {
    return String(content)
  }
  if (content === null) {
    return ""
  }
  if (Array.isArray(content)) {
    return content
      .map((value) => extractMessageText(value))
      .filter(Boolean)
      .join(" ")
      .trim()
  }
  if (content && typeof content === "object") {
    const record = content as Record<string, OpenUIChatJson>
    if (typeof record.text === "string") {
      return record.text.trim()
    }
    if (typeof record.content === "string") {
      return record.content.trim()
    }
    if (typeof record.title === "string") {
      return record.title.trim()
    }
    return Object.values(record).map(extractMessageText).filter(Boolean).join(" ")
  }
  return ""
}

// Parse SSE payload from response
export function parseAssistantPayload(raw: string): OpenUIAssistantPayload | null {
  const dataLine = raw
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("data:"))

  if (!dataLine) {
    return null
  }

  const payload = dataLine.replace(/^data:\s*/, "")

  try {
    return JSON.parse(payload) as OpenUIAssistantPayload
  } catch {
    return null
  }
}

// Infer thread ID from payload
export function inferThreadId(payload: OpenUIAssistantPayload | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }

  const props = (payload as Record<string, OpenUIChatJson>).props
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return null
  }

  const threadId = (props as Record<string, OpenUIChatJson>).threadId
  return typeof threadId === "string" && threadId.length > 0 ? threadId : null
}

// Format timestamp for display
export function formatMessageTimestamp(value?: string): string {
  if (!value) {
    return "Just now"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

// Build thread preview text
export function buildThreadPreview(content: OpenUIChatJson): string {
  const text = extractMessageText(content)
  if (text) {
    return text
  }

  if (content && typeof content === "object" && !Array.isArray(content)) {
    const type = (content as Record<string, OpenUIChatJson>).type
    if (type === "report") {
      return "Report response"
    }
  }

  return "Structured response"
}
