"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DynamicComponentRenderer } from "@/components/openui-chat/DynamicComponentRenderer"
import type { ComponentPayload } from "@/lib/openui/library"
import { useAuth } from "@/contexts/AuthContext"
import { Send, Loader2, Sparkles, MessageSquare, Plus } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserMessage {
  id: string
  role: "user"
  text: string
}

interface AssistantMessage {
  id: string
  role: "assistant"
  payload: ComponentPayload
}

type ChatMessage = UserMessage | AssistantMessage

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpenUIChatPage() {
  const { user, token } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || streaming) return

    const userMsg: UserMessage = { id: crypto.randomUUID(), role: "user", text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setStreaming(true)

    try {
      const history = messages.map((m) =>
        m.role === "user"
          ? { role: "user", content: m.text }
          : { role: "assistant", content: JSON.stringify((m as AssistantMessage).payload) }
      )

      const res = await fetch("/api/v1/openui-chat/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId: user?.defaultProjectId || "default",
          threadId,
          messages: [...history, { role: "user", content: text }],
        }),
      })

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`)
      }

      // Parse SSE stream
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let assistantPayload: ComponentPayload | null = null
      let newThreadId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6))
              if (json.threadId) newThreadId = json.threadId
              else if (json.props?.threadId) newThreadId = json.props.threadId
              if (json.component) {
                assistantPayload = json as ComponentPayload
              }
            } catch {
              // incomplete chunk, skip
            }
          }
        }
      }

      if (newThreadId) setThreadId(newThreadId)

      if (assistantPayload) {
        const assistantMsg: AssistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          payload: assistantPayload,
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch (err) {
      const errorPayload: ComponentPayload = {
        type: "component",
        component: "Text",
        props: { title: "Error" },
        data: [],
        metadata: {},
        content: `Request failed: ${err instanceof Error ? err.message : String(err)}`,
      } as unknown as ComponentPayload
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", payload: errorPayload },
      ])
    } finally {
      setStreaming(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [input, streaming, messages, token, threadId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNew = () => {
    setMessages([])
    setThreadId(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <PageTransition>
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold text-slate-900">OpenUI Chat</span>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-xs">
                  Beta
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={startNew} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New conversation
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4 md:px-8">
              {messages.length === 0 ? (
                <EmptyState onSend={(text) => {
                  setInput(text)
                  setTimeout(() => sendMessage(text), 0)
                }} />
              ) : (
                <div className="mx-auto max-w-4xl space-y-6">
                  {messages.map((msg) =>
                    msg.role === "user" ? (
                      <UserBubble key={msg.id} text={msg.text} />
                    ) : (
                      <AssistantBubble key={msg.id} payload={(msg as AssistantMessage).payload} />
                    )
                  )}
                  {streaming && <StreamingIndicator />}
                  <div ref={bottomRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-slate-200 bg-white px-4 py-4 md:px-8">
              <div className="mx-auto flex max-w-4xl items-end gap-3">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything — tables, charts, timelines, team members…"
                  rows={2}
                  className="flex-1 resize-none rounded-xl border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  disabled={streaming}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 p-0 hover:bg-indigo-700"
                >
                  {streaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mx-auto mt-2 max-w-4xl text-center text-xs text-slate-400">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-xl rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-3 text-sm text-white shadow-sm">
        {text}
      </div>
    </div>
  )
}

function AssistantBubble({ payload }: { payload: ComponentPayload }) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-4xl">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          OpenUI
        </div>
        <DynamicComponentRenderer payload={payload} />
      </div>
    </div>
  )
}

function StreamingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
        Thinking…
      </div>
    </div>
  )
}

const EXAMPLE_PROMPTS = [
  "Show me the project team members",
  "List all high-priority risks as a table",
  "Create a timeline for Q3 milestones",
  "Compare our delivery options side by side",
  "Show upcoming deadlines on a calendar",
]

function EmptyState({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
          <MessageSquare className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">What would you like to see?</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ask a question and get an automatically-formatted response
        </p>
      </div>
      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onSend(p)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
