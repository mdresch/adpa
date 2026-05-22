import {
  parseOpenUILangSSEBuffer,
  adpaOpenUIChatStreamAdapter,
} from "@/lib/openui/streaming"
import { EventType } from "@openuidev/react-headless"

describe("parseOpenUILangSSEBuffer", () => {
  it("parses text and done events from a complete buffer", () => {
    const buffer =
      'event: text\ndata: {"text":"Hello "}\n\n' +
      'event: text\ndata: {"text":"world"}\n\n' +
      'event: done\ndata: {"threadId":"thread-1","length":11}\n\n'

    const { events, remainder } = parseOpenUILangSSEBuffer(buffer)
    expect(remainder).toBe("")
    expect(events).toHaveLength(3)
    expect(events[0]).toEqual({ type: "text", text: "Hello ", threadId: null })
    expect(events[1]).toEqual({ type: "text", text: "world", threadId: null })
    expect(events[2]).toEqual({
      type: "done",
      threadId: "thread-1",
      length: 11,
    })
  })

  it("keeps incomplete trailing block in remainder", () => {
    const buffer = 'event: text\ndata: {"text":"Hi"}\n\nevent: text\ndata: {"te'
    const { events, remainder } = parseOpenUILangSSEBuffer(buffer)
    expect(events).toHaveLength(1)
    expect(remainder).toContain('event: text')
  })
})

describe("adpaOpenUIChatStreamAdapter", () => {
  it("maps SSE to AG-UI text events and calls onStreamDone once", async () => {
    const onStreamDone = jest.fn()
    const adapter = adpaOpenUIChatStreamAdapter({ onStreamDone })

    const body =
      'event: text\ndata: {"text":"Answer"}\n\n' +
      'event: done\ndata: {"threadId":"t-99"}\n\n'

    const response = new Response(body, {
      headers: { "x-thread-id": "t-header" },
    })

    const events: { type: string; delta?: string }[] = []
    for await (const event of adapter.parse(response)) {
      events.push(event as { type: string; delta?: string })
    }

    expect(events.some((e) => e.type === EventType.TEXT_MESSAGE_START)).toBe(true)
    expect(events.some((e) => e.type === EventType.TEXT_MESSAGE_CONTENT)).toBe(true)
    expect(
      events.filter((e) => e.type === EventType.TEXT_MESSAGE_CONTENT).map((e) => e.delta).join("")
    ).toBe("Answer")
    expect(events.some((e) => e.type === EventType.TEXT_MESSAGE_END)).toBe(true)
    expect(onStreamDone).toHaveBeenCalledTimes(1)
    expect(onStreamDone).toHaveBeenCalledWith("t-99")
  })
})
