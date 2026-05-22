/**
 * SSE helpers for OpenUI Lang text streaming from /api/v1/openui-chat/chat
 */

import { EventType, type StreamProtocolAdapter } from "@openuidev/react-headless"

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

export type AdpaOpenUIChatStreamAdapterOptions = {
  /**
   * Called when the server sends `event: done` (after all text chunks).
   * Use this to sync sidebar thread id — do NOT resolve the thread from response
   * headers mid-stream (that triggers selectThread and aborts the stream).
   */
  onStreamDone?: (threadId: string | null) => void
}

function* yieldOpenUILangEvents(
  events: OpenUILangStreamEvent[],
  messageId: string,
  messageStarted: boolean,
  streamDoneState: { notified: boolean },
  onStreamDone?: (threadId: string | null) => void
): Generator<
  | { type: typeof EventType.TEXT_MESSAGE_START; messageId: string; role: "assistant" }
  | { type: typeof EventType.TEXT_MESSAGE_CONTENT; messageId: string; delta: string }
  | { type: typeof EventType.RUN_ERROR; message: string },
  boolean
> {
  let started = messageStarted

  for (const event of events) {
    if (event.type === "text") {
      if (!started) {
        yield {
          type: EventType.TEXT_MESSAGE_START,
          messageId,
          role: "assistant",
        }
        started = true
      }
      yield {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId,
        delta: event.text,
      }
    } else if (event.type === "done") {
      if (!streamDoneState.notified) {
        streamDoneState.notified = true
        onStreamDone?.(event.threadId)
      }
    } else if (event.type === "error") {
      yield {
        type: EventType.RUN_ERROR,
        message: event.message,
      }
    }
  }

  return started
}

/**
 * Bridge ADPA OpenUI Chat SSE (`event: text` / `done` / `error`) to AG-UI stream events
 * consumed by @openuidev/react-headless `processStreamedMessage`.
 */
export function adpaOpenUIChatStreamAdapter(
  options: AdpaOpenUIChatStreamAdapterOptions = {}
): StreamProtocolAdapter {
  const { onStreamDone } = options

  return {
    async *parse(response: Response) {
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Response has no body")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      const messageId = crypto.randomUUID()
      let messageStarted = false
      const headerThreadId = response.headers.get("x-thread-id")
      const streamDoneState = { notified: false }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const { events, remainder } = parseOpenUILangSSEBuffer(buffer)
        buffer = remainder

        messageStarted = yield* yieldOpenUILangEvents(
          events,
          messageId,
          messageStarted,
          streamDoneState,
          onStreamDone
        )
      }

      if (buffer.trim()) {
        const { events } = parseOpenUILangSSEBuffer(`${buffer}\n\n`)
        messageStarted = yield* yieldOpenUILangEvents(
          events,
          messageId,
          messageStarted,
          streamDoneState,
          onStreamDone
        )
      }

      if (messageStarted) {
        yield {
          type: EventType.TEXT_MESSAGE_END,
          messageId,
        }
      }

      if (!streamDoneState.notified && headerThreadId) {
        onStreamDone?.(headerThreadId)
      }
    },
  }
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
