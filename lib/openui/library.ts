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

// Helper to check if payload is text

export function isTextPayload(payload: OpenUIAssistantPayload): payload is TextPayload {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload)
    && "type" in payload && payload.type === "text"
}

// Extract readable text from any payload
export function extractMessageText(content: OpenUIChatJson): string {
  if (typeof content === "string") {
    return content
  }

  if (typeof content === "number" || typeof content === "boolean") {
    return String(content)
  }

  if (content === null) {
    return ""
  }

  if (Array.isArray(content)) {
    return content.map(extractMessageText).join(" ")
  }

  if (typeof content === "object") {
    const payload = content as Record<string, OpenUIChatJson>

    if (payload.text && typeof payload.text === "string") {
      return payload.text
    }

    if (payload.title && typeof payload.title === "string") {
      return payload.title
    }

    return Object.values(payload).map(extractMessageText).filter(Boolean).join(" ")
=======
export type OpenUIAssistantPayload = OpenUIChatJson

export function extractMessageText(content: OpenUIChatJson): string {
  if (typeof content === "string") {
    return content.trim()
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
>>>>>>> adpa-project-charter
  }

  return ""
}

<<<<<<< HEAD
// Parse SSE payload from response
=======
>>>>>>> adpa-project-charter
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

<<<<<<< HEAD
// Infer thread ID from payload
=======
>>>>>>> adpa-project-charter
export function inferThreadId(payload: OpenUIAssistantPayload | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }

<<<<<<< HEAD
  const record = payload as Record<string, OpenUIChatJson>

  // Check component payload structure
  if (isComponentPayload(record as any)) {
    const props = record.props as Record<string, OpenUIChatJson> | undefined
    const threadId = props?.threadId
    return typeof threadId === "string" && threadId.length > 0 ? threadId : null
  }

  // Fallback for legacy structure
  const props = record.props
=======
  const props = (payload as Record<string, OpenUIChatJson>).props
>>>>>>> adpa-project-charter
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return null
  }

  const threadId = (props as Record<string, OpenUIChatJson>).threadId
  return typeof threadId === "string" && threadId.length > 0 ? threadId : null
}

<<<<<<< HEAD
// Format timestamp for display
export function formatMessageTimestamp(value?: string): string {
  if (!value) return ""

  try {
    const date = new Date(value)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

// Build thread preview text
export function buildThreadPreview(content: OpenUIChatJson): string {
  const text = extractMessageText(content)
  const maxLength = 200
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text
}
=======
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
>>>>>>> adpa-project-charter
