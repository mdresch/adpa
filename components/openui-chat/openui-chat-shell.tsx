"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Clock3,
  Loader2,
  Lock,
  MessageSquareText,
  Plus,
  RefreshCcw,
  SendHorizontal,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useApi } from "@/hooks/use-api"
import {
  buildThreadPreview,
  extractMessageText,
  formatMessageTimestamp,
  isLegacyComponentPayload,
  looksLikeOpenUILang,
  type OpenUIAssistantPayload,
  type OpenUIMessage,
  type OpenUIProjectsResponse,
  type OpenUIThread,
  type OpenUIThreadSummary,
} from "@/lib/openui/library"
import { parseOpenUILangSSEBuffer } from "@/lib/openui/streaming"
import { DynamicComponentRenderer } from "./DynamicComponentRenderer"
import { openUIStarterPrompts, type OpenUIStarterPrompt } from "@/lib/openui/system-prompt"

import { ProjectSelector } from "./project-selector"
import { ReportComponents } from "./report-components"
import { ReportEmptyState } from "./report-empty-state"

type LocalMessage = OpenUIMessage & {
  pending?: boolean
}

export function OpenUIChatShell() {
  const { isAuthenticated, loading: authLoading, token } = useAuth()
  const { data, loading: projectsLoading, error: projectsError } = useApi<OpenUIProjectsResponse>(
    "/projects?limit=100",
    {
      enabled: isAuthenticated && !authLoading,
      dependencies: [isAuthenticated, authLoading],
    }
  )

  const projects = data?.projects ?? []
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [threads, setThreads] = useState<OpenUIThreadSummary[]>([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState("")
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState<string | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  useEffect(() => {
    if (!selectedProjectId) {
      setThreads([])
      setMessages([])
      setActiveThreadId("")
      return
    }

    void loadThreads(selectedProjectId)
  }, [selectedProjectId])

  async function loadThreads(projectId: string, nextThreadId?: string) {
    setThreadsLoading(true)
    setRuntimeError(null)

    try {
      const response = await fetch(`/api/v1/openui-chat/threads?projectId=${encodeURIComponent(projectId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load chat threads")
      }

      const nextThreads = Array.isArray(payload.threads) ? (payload.threads as OpenUIThreadSummary[]) : []
      setThreads(nextThreads)

      const preferredThreadId = nextThreadId || activeThreadId
      if (preferredThreadId && nextThreads.some((thread) => thread.id === preferredThreadId)) {
        setActiveThreadId(preferredThreadId)
        return
      }

      if (!activeThreadId && nextThreads[0]) {
        setActiveThreadId(nextThreads[0].id)
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Unable to load chat threads")
    } finally {
      setThreadsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedProjectId || !activeThreadId) {
      return
    }

    void loadThread(activeThreadId, selectedProjectId)
  }, [activeThreadId, selectedProjectId])

  async function loadThread(threadId: string, projectId: string) {
    setMessagesLoading(true)
    setRuntimeError(null)

    try {
      const response = await fetch(
        `/api/v1/openui-chat/threads/${encodeURIComponent(threadId)}?projectId=${encodeURIComponent(projectId)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load chat history")
      }

      const thread = payload.thread as OpenUIThread
      setMessages(thread?.messages ?? [])
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Unable to load chat history")
    } finally {
      setMessagesLoading(false)
    }
  }

  async function sendMessage(prompt: string) {
    const content = prompt.trim()
    if (!selectedProjectId || !content || isSending) {
      return
    }

    setRuntimeError(null)
    setIsSending(true)

    const optimisticUserMessage: LocalMessage = {
      id: `local-user-${Date.now()}`,
      threadId: activeThreadId,
      userId: "local-user",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    }

    const conversation = [
      ...messages.map((message) => ({ role: message.role, content: message.content })),
      { role: "user", content },
    ]

    setMessages((current) => [...current, optimisticUserMessage])
    setDraft("")

    setStreamingResponse("")

    try {
      const response = await fetch("/api/v1/openui-chat/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          threadId: activeThreadId || undefined,
          messages: conversation,
        }),
      })

      if (!response.ok) {
        const raw = await response.text()
        throw new Error(raw || "Unable to send chat message")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Response has no body")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let accumulated = ""
      let resolvedThreadId = response.headers.get("x-thread-id") || activeThreadId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { events, remainder } = parseOpenUILangSSEBuffer(buffer)
        buffer = remainder

        for (const event of events) {
          if (event.type === "text") {
            accumulated += event.text
            if (event.threadId) resolvedThreadId = event.threadId
            setStreamingResponse(accumulated)
          } else if (event.type === "done" && event.threadId) {
            resolvedThreadId = event.threadId
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      }

      if (!accumulated) {
        throw new Error("Assistant response was empty")
      }

      const assistantMessage: LocalMessage = {
        id: `local-assistant-${Date.now()}`,
        threadId: resolvedThreadId || activeThreadId,
        userId: "assistant",
        role: "assistant",
        content: accumulated,
        createdAt: new Date().toISOString(),
      }

      setMessages((current) =>
        current
          .map((message) => (message.id === optimisticUserMessage.id ? { ...message, pending: false } : message))
          .concat(assistantMessage)
      )
      setStreamingResponse(null)

      await loadThreads(selectedProjectId, resolvedThreadId || activeThreadId)

      if (!activeThreadId && resolvedThreadId) {
        setActiveThreadId(resolvedThreadId)
      }
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== optimisticUserMessage.id))
      setStreamingResponse(null)
      setRuntimeError(error instanceof Error ? error.message : "Unable to send chat message")
    } finally {
      setIsSending(false)
    }
  }

  function handlePromptSelect(prompt: OpenUIStarterPrompt) {
    void sendMessage(prompt.prompt)
  }

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId)
    setActiveThreadId("")
    setMessages([])
    setRuntimeError(null)
  }

  function handleStartNewChat() {
    setActiveThreadId("")
    setMessages([])
    setDraft("")
    setRuntimeError(null)
  }

  const canSend = Boolean(selectedProjectId) && !isSending

  if (authLoading) {
    return <ShellFrame title="Loading chat access" subtitle="Checking session and project access." />
  }

  if (!isAuthenticated) {
    return (
      <ShellFrame title="Authentication required" subtitle="OpenUI chat is only available to signed-in users with project access.">
        <div className="flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="h-4 w-4" />
          Sign in before opening project chat threads or generating reports.
        </div>
      </ShellFrame>
    )
  }

  return (
    <ShellFrame
      title="OpenUI chat"
      subtitle="Project-scoped chat threads with structured report responses and backend-assisted context assembly."
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">Project scope</CardTitle>
              <CardDescription>Authenticated access only. All retrieval stays scoped to the selected project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ProjectSelector
                disabled={projectsLoading || projects.length === 0}
                onChange={handleProjectChange}
                projects={projects}
                selectedProjectId={selectedProjectId}
              />
              {projectsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {projectsError}
                </div>
              ) : null}
              {selectedProject ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Active project</div>
                      <div className="mt-1 text-base font-semibold text-slate-950">{selectedProject.name}</div>
                    </div>
                    {selectedProject.status ? <Badge variant="secondary">{selectedProject.status}</Badge> : null}
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {selectedProject.framework || "Framework not specified"}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
                  Select a project to unlock thread history and project-bound responses.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg text-slate-950">Threads</CardTitle>
                <CardDescription>Resume previous chats for the selected project.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="h-9 rounded-full"
                  disabled={!selectedProjectId || isSending}
                  onClick={handleStartNewChat}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New chat
                </Button>
                <Button
                  className="h-9 rounded-full"
                  disabled={!selectedProjectId || threadsLoading}
                  onClick={() => selectedProjectId ? void loadThreads(selectedProjectId) : undefined}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {threadsLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading project threads...
                  </div>
                ) : null}
                {!threadsLoading && selectedProjectId && threads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                    No threads yet. Start with a project question or generate a charter report.
                  </div>
                ) : null}
                {!selectedProjectId ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                    Choose a project before loading any thread history.
                  </div>
                ) : null}
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      activeThreadId === thread.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveThreadId(thread.id)}
                    type="button"
                  >
                    <div className="truncate text-sm font-medium">{thread.title}</div>
                    <div className={`mt-2 flex items-center gap-2 text-xs ${activeThreadId === thread.id ? "text-slate-300" : "text-slate-500"}`}>
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatMessageTimestamp(thread.updatedAt)}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-5">
          <ReportEmptyState disabled={!selectedProjectId || isSending} onPromptSelect={handlePromptSelect} prompts={openUIStarterPrompts} />

          <Card className="border-slate-200 bg-white/92 shadow-xl shadow-slate-200/40 backdrop-blur">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  In-app chat experience
                </div>
                <CardTitle className="mt-2 text-2xl text-slate-950">
                  {selectedProject ? `${selectedProject.name} conversation` : "Select a project to begin"}
                </CardTitle>
                <CardDescription>
                  Send normal questions for text replies or ask for a charter/report to receive a richer structured response.
                </CardDescription>
              </div>
              <Badge className="w-fit bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                {messages.length} messages
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {runtimeError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {runtimeError}
                </div>
              ) : null}

              <div className="min-h-[420px] space-y-4 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(248,250,252,1),_rgba(255,255,255,0.96))] p-4 md:p-6">
                {messagesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading thread messages...
                  </div>
                ) : null}

                {!messagesLoading && messages.length === 0 ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm leading-7 text-slate-500">
                    <div>
                      <MessageSquareText className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                      Start a project-scoped conversation or use one of the starter prompts above.
                    </div>
                  </div>
                ) : null}

                {isSending && streamingResponse ? (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      <DynamicComponentRenderer response={streamingResponse} isStreaming />
                    </div>
                  </div>
                ) : null}

                {messages.map((message) => {
                  const isAssistant = message.role === "assistant"
                  const isReport = isAssistant && isStructuredReport(message.content)

                  return (
                    <div key={message.id} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[88%] space-y-2 ${isAssistant ? "items-start" : "items-end"}`}>
                        <div className={`text-xs uppercase tracking-[0.22em] ${isAssistant ? "text-slate-500" : "text-emerald-700"}`}>
                          {isAssistant ? "Assistant" : "You"}
                        </div>
                        {isReport ? (
                          <ReportComponents payload={message.content} />
                        ) : isAssistant && shouldRenderOpenUI(message.content) ? (
                          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                            <DynamicComponentRenderer
                              response={getOpenUILangResponse(message.content)}
                              payload={isLegacyComponentPayload(message.content) ? message.content : undefined}
                            />
                          </div>
                        ) : (
                          <div className={`rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm ${
                            isAssistant
                              ? "border border-slate-200 bg-white text-slate-700"
                              : "bg-slate-950 text-white"
                          }`}>
                            {buildThreadPreview(message.content)}
                          </div>
                        )}
                        <div className="text-xs text-slate-400">
                          {formatMessageTimestamp(message.createdAt)}
                          {message.pending ? " • sending" : ""}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-4 shadow-inner shadow-white">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {openUIStarterPrompts.map((prompt) => (
                    <Button
                      key={prompt.id}
                      className="rounded-full"
                      disabled={!selectedProjectId || isSending}
                      onClick={() => handlePromptSelect(prompt)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {prompt.title}
                    </Button>
                  ))}
                </div>
                <form
                  className="flex flex-col gap-3 md:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void sendMessage(draft)
                  }}
                >
                  <Input
                    className="h-12 rounded-2xl border-slate-200 bg-white"
                    disabled={!selectedProjectId || isSending}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={selectedProjectId ? "Ask a project question or request a report..." : "Select a project to start chatting"}
                    value={draft}
                  />
                  <Button className="h-12 rounded-2xl px-6" disabled={!canSend || draft.trim().length === 0} type="submit">
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizontal className="mr-2 h-4 w-4" />}
                    Send
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </ShellFrame>
  )
}

function ShellFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7faf7_0%,_#ecfdf5_34%,_#f8fafc_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[32px] border border-white/80 bg-white/75 p-6 shadow-2xl shadow-emerald-100/60 backdrop-blur md:p-8">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.32em] text-emerald-700">OpenUI workspace</div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function isStructuredReport(payload: OpenUIAssistantPayload): boolean {
  return Boolean(payload && typeof payload === "object" && !Array.isArray(payload) && (payload as Record<string, unknown>).type === "report")
}

function shouldRenderOpenUI(content: OpenUIAssistantPayload): boolean {
  if (typeof content === "string") {
    return looksLikeOpenUILang(content)
  }
  return isLegacyComponentPayload(content)
}

function getOpenUILangResponse(content: OpenUIAssistantPayload): string | undefined {
  if (typeof content === "string" && looksLikeOpenUILang(content)) {
    return content
  }
  const text = extractMessageText(content)
  return looksLikeOpenUILang(text) ? text : undefined
}