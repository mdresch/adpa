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
  }

  return ""
}

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