/**
 * SSE helpers for OpenUI Lang text streaming from /api/v1/openui-chat/chat
 */

export type OpenUILangStreamEvent =
  | { type: "text"; text: string; threadId?: string | null }
  | { type: "done"; threadId: string | null; length?: number }
  | { type: "error"; message: string }

export type ParsedOpenUILangStream = {
  events: OpenUILangStreamEvent[]
  remainder: string
}

/**
 * Parse one or more complete SSE events from a buffer.
 * Supports `event: text` / `event: done` / `event: error` with JSON data lines.
 */
export function parseOpenUILangSSEBuffer(buffer: string): ParsedOpenUILangStream {
  const events: OpenUILangStreamEvent[] = []
  const blocks = buffer.split("\n\n")
  const remainder = blocks.pop() ?? ""

  for (const block of blocks) {
    const event = parseSSEBlock(block)
    if (event) {
      events.push(event)
    }
  }

  return { events, remainder }
}

function parseSSEBlock(block: string): OpenUILangStreamEvent | null {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) {
    return null
  }

  let eventName = "message"
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  try {
    const payload = JSON.parse(dataLines.join("\n")) as Record<string, unknown>

    if (eventName === "text" && typeof payload.text === "string") {
      return {
        type: "text",
        text: payload.text,
        threadId: typeof payload.threadId === "string" ? payload.threadId : null,
      }
    }

    if (eventName === "done") {
      return {
        type: "done",
        threadId: typeof payload.threadId === "string" ? payload.threadId : null,
        length: typeof payload.length === "number" ? payload.length : undefined,
      }
    }

    if (eventName === "error") {
      return {
        type: "error",
        message: typeof payload.message === "string" ? payload.message : "Stream failed",
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Read an entire fetch Response body as accumulated OpenUI Lang text.
 */
export async function readOpenUILangStream(
  response: Response,
  onChunk?: (accumulated: string, chunk: string) => void
): Promise<{ text: string; threadId: string | null }> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("Response has no body")
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let accumulated = ""
  let threadId: string | null = response.headers.get("x-thread-id") || null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const { events, remainder } = parseOpenUILangSSEBuffer(buffer)
    buffer = remainder

    for (const event of events) {
      if (event.type === "text") {
        accumulated += event.text
        if (event.threadId) threadId = event.threadId
        onChunk?.(accumulated, event.text)
      } else if (event.type === "done") {
        if (event.threadId) threadId = event.threadId
      } else if (event.type === "error") {
        throw new Error(event.message)
      }
    }
  }

  return { text: accumulated, threadId }
}
