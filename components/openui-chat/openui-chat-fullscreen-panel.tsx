"use client"

import { useCallback, useMemo } from "react"
import "@openuidev/react-ui/defaults.css"
import "@openuidev/react-ui/components.css"
import { FullScreen } from "@openuidev/react-ui"
import { projectOpenUILibrary } from "@/lib/openui/projectOpenUILibrary"
import { Sparkles } from "lucide-react"

import { adpaOpenUIChatStreamAdapter } from "@/lib/openui/streaming"
import { getProjectChatPrompts } from "@/lib/openui/project-chat-prompts"
import {
  extractMessageText,
  type OpenUIMessage,
  type OpenUIProject,
} from "@/lib/openui/library"
import { CustomAssistantMessage } from "@/components/openui-chat/AssistantMessage"
import { OpenUIChatThreadSync } from "@/components/openui-chat/openui-chat-thread-sync"

type OpenUIChatFullScreenPanelProps = {
  project: OpenUIProject | null
  projectId: string
  documentId?: string
  activeThreadId: string
  authToken: string | null
  sessionKey: number
  onThreadResolved: (threadId: string) => void
}

export function OpenUIChatFullScreenPanel({
  project,
  projectId,
  documentId,
  activeThreadId,
  authToken,
  sessionKey,
  onThreadResolved,
}: OpenUIChatFullScreenPanelProps) {
  const starterPrompts = useMemo(
    () => getProjectChatPrompts(project?.name ?? "Project", project?.framework),
    [project?.name, project?.framework]
  )

  const conversationStarters = useMemo(
    () => ({
      variant: "short" as const,
      options: starterPrompts.map((prompt) => ({
        displayText: prompt,
        prompt,
      })),
    }),
    [starterPrompts]
  )

  const loadThread = useCallback(
    async (threadId: string) => {
      const response = await fetch(
        `/api/v1/openui-chat/threads/${encodeURIComponent(threadId)}?projectId=${encodeURIComponent(projectId)}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        }
      )
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load chat history")
      }

      const messages = (payload.thread?.messages ?? []) as OpenUIMessage[]
      return messages.map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant" | "system",
        content: extractMessageText(message.content) || "",
      }))
    },
    [authToken, projectId]
  )

  const processMessage = useCallback(
    async ({
      threadId,
      messages,
      abortController,
    }: {
      threadId: string
      messages: { role: string; content: string }[]
      abortController: AbortController
    }) => {
      const effectiveThreadId =
        threadId && threadId !== "ephemeral" ? threadId : activeThreadId || undefined

      const response = await fetch("/api/v1/openui-chat/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          projectId,
          documentId: documentId || undefined,
          threadId: effectiveThreadId,
          messages: messages.map((message) => ({
            role: message.role,
            content:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
          })),
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const raw = await response.text()
        throw new Error(raw || "Unable to send chat message")
      }

      return response
    },
    [activeThreadId, authToken, documentId, projectId]
  )

  const streamProtocol = useMemo(
    () =>
      adpaOpenUIChatStreamAdapter({
        onStreamDone: (threadId) => {
          if (threadId) {
            onThreadResolved(threadId)
          }
        },
      }),
    [onThreadResolved]
  )

  if (!projectId) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
        Select a project to start chatting.
      </div>
    )
  }

  const agentLabel = project?.name ? `${project.name} advisor` : "Project advisor"

  return (
    <div className="openui-chat-openui-root h-full min-h-[520px] w-full">
      <FullScreen
        key={`${projectId}-${documentId ?? ""}-${sessionKey}`}
        fetchThreadList={async () => ({ threads: [] })}
        loadThread={loadThread}
        processMessage={processMessage}
        streamProtocol={streamProtocol}
        componentLibrary={projectOpenUILibrary}
        agentName={agentLabel}
        welcomeMessage={{
          title: project?.name ? `Explore “${project.name}”` : "Project advisor",
          description:
            "Ask questions about this project. Responses use OpenUI Lang — tables, charts, checklists, and summaries grounded in project context.",
          image: (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <Sparkles className="h-7 w-7" />
            </div>
          ),
        }}
        conversationStarters={conversationStarters}
        assistantMessage={CustomAssistantMessage}
        threadHeader={<OpenUIChatThreadSync activeThreadId={activeThreadId} />}
      />
    </div>
  )
}
