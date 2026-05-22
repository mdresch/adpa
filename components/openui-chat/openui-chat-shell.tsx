"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Clock3, Loader2, Lock, Plus, RefreshCcw } from "lucide-react"

import "@/app/openui-chat/openui-chat.css"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useApi } from "@/hooks/use-api"
import { fetchBackendJson } from "@/lib/openui/fetch-backend"
import {
  formatMessageTimestamp,
  type OpenUIProjectsResponse,
  type OpenUIThreadSummary,
} from "@/lib/openui/library"
import { ProjectSelector } from "@/components/openui-chat/project-selector"

const OpenUIChatFullScreenPanel = dynamic(
  () =>
    import("@/components/openui-chat/openui-chat-fullscreen-panel").then((mod) => ({
      default: mod.OpenUIChatFullScreenPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-slate-50 text-sm text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p>Loading OpenUI advisor…</p>
        <p className="max-w-sm text-center text-xs text-slate-500">
          First load compiles the chat UI bundle; later visits are faster.
        </p>
      </div>
    ),
  }
)

export function OpenUIChatShell() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get("documentId")?.trim() ?? ""

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
  const [chatSessionKey, setChatSessionKey] = useState(0)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [backendWaitMessage, setBackendWaitMessage] = useState<string | null>(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const loadThreads = useCallback(
    async (projectId: string, preferredThreadId?: string, signal?: AbortSignal) => {
      setThreadsLoading(true)
      setRuntimeError(null)
      setBackendWaitMessage("Connecting to API on port 5000…")

      try {
        const { data: payload } = await fetchBackendJson<{ threads?: OpenUIThreadSummary[]; error?: string }>(
          `/api/v1/openui-chat/threads?projectId=${encodeURIComponent(projectId)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
          { signal }
        )

        if (signal?.aborted) return

        const nextThreads = Array.isArray(payload.threads) ? payload.threads : []
        setThreads(nextThreads)
        setBackendWaitMessage(null)

        if (preferredThreadId && nextThreads.some((thread) => thread.id === preferredThreadId)) {
          setActiveThreadId(preferredThreadId)
          return
        }

        setActiveThreadId((current) => {
          if (current && nextThreads.some((thread) => thread.id === current)) {
            return current
          }
          return nextThreads[0]?.id ?? ""
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        setRuntimeError(error instanceof Error ? error.message : "Unable to load chat threads")
        setBackendWaitMessage(null)
      } finally {
        if (!signal?.aborted) {
          setThreadsLoading(false)
        }
      }
    },
    [token]
  )

  useEffect(() => {
    if (!selectedProjectId) {
      setThreads([])
      setActiveThreadId("")
      setBackendWaitMessage(null)
      return
    }

    const controller = new AbortController()
    void loadThreads(selectedProjectId, undefined, controller.signal)
    return () => controller.abort()
  }, [selectedProjectId, loadThreads])

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    setActiveThreadId("")
    setChatSessionKey((key) => key + 1)
    setRuntimeError(null)
  }

  const handleStartNewChat = () => {
    setActiveThreadId("")
    setChatSessionKey((key) => key + 1)
    setRuntimeError(null)
  }

  const handleThreadResolved = useCallback(
    (threadId: string) => {
      if (!selectedProjectId) return
      setActiveThreadId(threadId)
      void loadThreads(selectedProjectId, threadId)
    },
    [loadThreads, selectedProjectId]
  )

  if (authLoading) {
    return <ShellFrame title="Loading chat access" subtitle="Checking session and project access." />
  }

  if (!isAuthenticated) {
    return (
      <ShellFrame
        title="Authentication required"
        subtitle="OpenUI chat is only available to signed-in users with project access."
      >
        <div className="flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="h-4 w-4" />
          Sign in before opening project chat threads.
        </div>
      </ShellFrame>
    )
  }

  return (
    <ShellFrame
      title="OpenUI chat"
      subtitle="Project-scoped advisor with OpenUI Lang rendering — tables, charts, and structured summaries from project context."
    >
      <div className="openui-chat-workspace grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">Project scope</CardTitle>
              <CardDescription>
                Authenticated access only. Retrieval stays scoped to the selected project.
                {documentId ? " Document context is included when opened from a document link." : null}
              </CardDescription>
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
                  Select a project to unlock thread history and the project advisor.
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
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  aria-label="New chat"
                  className="h-9 w-9 shrink-0 rounded-full"
                  disabled={!selectedProjectId}
                  onClick={handleStartNewChat}
                  size="icon"
                  title="New chat"
                  type="button"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  aria-label="Refresh threads"
                  className="h-9 w-9 shrink-0 rounded-full"
                  disabled={!selectedProjectId || threadsLoading}
                  onClick={() => (selectedProjectId ? void loadThreads(selectedProjectId) : undefined)}
                  size="icon"
                  title="Refresh threads"
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw className={`h-4 w-4 ${threadsLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {threadsLoading ? (
                  <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading project threads…
                    </div>
                    {backendWaitMessage ? (
                      <p className="text-xs text-slate-400">{backendWaitMessage}</p>
                    ) : null}
                  </div>
                ) : null}
                {!threadsLoading && selectedProjectId && threads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                    No threads yet. Start a new chat from the panel on the right.
                  </div>
                ) : null}
                {!selectedProjectId ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                    Choose a project before loading thread history.
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
                    onClick={() => {
                      setActiveThreadId(thread.id)
                      setChatSessionKey((key) => key + 1)
                    }}
                    type="button"
                  >
                    <div className="truncate text-sm font-medium">{thread.title}</div>
                    <div
                      className={`mt-2 flex items-center gap-2 text-xs ${
                        activeThreadId === thread.id ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatMessageTimestamp(thread.updatedAt)}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="min-h-[560px]">
          {runtimeError ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {runtimeError}
            </div>
          ) : null}
          <Card className="h-full min-h-[560px] border-slate-200 bg-white/92 shadow-xl shadow-slate-200/40 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">
                {selectedProject ? `${selectedProject.name} advisor` : "Select a project to begin"}
              </CardTitle>
              <CardDescription>
                Powered by OpenUI Lang and the GenUI component library for richer interactive answers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-5rem)] min-h-[480px] flex-col pb-6">
              <OpenUIChatFullScreenPanel
                activeThreadId={activeThreadId}
                authToken={token}
                documentId={documentId}
                onThreadResolved={handleThreadResolved}
                project={selectedProject}
                projectId={selectedProjectId}
                sessionKey={chatSessionKey}
              />
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
