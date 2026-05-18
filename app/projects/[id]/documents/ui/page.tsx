"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DynamicComponentRenderer } from "@/components/openui-chat/DynamicComponentRenderer"
import { parseOpenUILangSSEBuffer } from "@/lib/openui/streaming"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  Plus,
  ArrowLeft,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentSummary {
  id: string
  name: string
  template_name?: string
  status: string
}

interface UserMessage {
  id: string
  role: "user"
  text: string
}

interface AssistantMessage {
  id: string
  role: "assistant"
  response: string
}

type ChatMessage = UserMessage | AssistantMessage

// Document-specific prompt chips keyed loosely by template name keywords
const DOCUMENT_PROMPTS: { keywords: string[]; prompts: string[] }[] = [
  {
    keywords: ["risk"],
    prompts: [
      "Show all risks as a table",
      "Which risks are critical?",
      "Visualize risk probability vs impact",
      "List mitigation strategies",
    ],
  },
  {
    keywords: ["stakeholder"],
    prompts: [
      "Show stakeholder matrix",
      "List all stakeholders by influence",
      "Who are the key decision makers?",
      "Engagement level by stakeholder",
    ],
  },
  {
    keywords: ["charter", "project"],
    prompts: [
      "Summarize the project objectives",
      "Show project timeline",
      "List key deliverables",
      "Who is the project sponsor?",
    ],
  },
  {
    keywords: ["quality"],
    prompts: [
      "List quality metrics",
      "Show quality gates",
      "What are the acceptance criteria?",
      "Quality KPIs table",
    ],
  },
  {
    keywords: ["communication", "plan"],
    prompts: [
      "Show communication matrix",
      "List reporting cadence",
      "Who receives which reports?",
      "Visualize communication flow",
    ],
  },
]

function getDocumentPrompts(docName: string, templateName?: string): string[] {
  const haystack = `${docName} ${templateName ?? ""}`.toLowerCase()
  for (const entry of DOCUMENT_PROMPTS) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      return entry.prompts
    }
  }
  return [
    "Summarize this document",
    "Show key data as a table",
    "What are the main findings?",
    "Create a visual overview",
    "List action items",
  ]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDocumentUIPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, token } = useAuth()

  const projectId = params?.id as string | undefined
  const initialDocId = searchParams?.get("docId") ?? undefined

  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId ?? "")

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [langResponse, setLangResponse] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoVisualizedDocs = useRef<Record<string, boolean>>({})

  // Fetch project documents
  useEffect(() => {
    if (!projectId || !user) return
    const fetchDocs = async () => {
      setDocsLoading(true)
      try {
        const res = await apiClient.get<{ documents: DocumentSummary[] }>(
          `/documents/project/${projectId}?limit=100`
        )
        const docs = res.documents ?? []
        setDocuments(docs)
        // If a docId came in via query param and exists, keep it; otherwise default to first
        if (!initialDocId && docs.length > 0) {
          setSelectedDocId(docs[0].id)
        } else if (initialDocId && !docs.find((d) => d.id === initialDocId) && docs.length > 0) {
          setSelectedDocId(docs[0].id)
        }
      } catch (err) {
        console.error("Failed to fetch project documents", err)
      } finally {
        setDocsLoading(false)
      }
    }
    fetchDocs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Reset thread when document changes
  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId)
    setMessages([])
    setThreadId(null)
    setLangResponse(null)
    if (autoVisualizedDocs.current[docId]) {
      delete autoVisualizedDocs.current[docId]
    }
  }

  const canSend = !docsLoading && !!selectedDocId && !streaming

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim()
      if (!text || streaming || !canSend || !selectedDocId) return

      const userMsg: UserMessage = { id: crypto.randomUUID(), role: "user", text }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setStreaming(true)
      setLangResponse("")

      try {
        const history = messages.map((m) =>
          m.role === "user"
            ? { role: "user", content: m.text }
            : { role: "assistant", content: (m as AssistantMessage).response }
        )

        const res = await fetch("/api/v1/openui-chat/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            projectId,
            documentId: selectedDocId,
            threadId,
            messages: [...history, { role: "user", content: text }],
          }),
        })

        if (!res.ok) throw new Error(`Server error ${res.status}`)

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let accumulated = ""
        let newThreadId: string | null = res.headers.get("x-thread-id")

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const { events, remainder } = parseOpenUILangSSEBuffer(buffer)
          buffer = remainder

          for (const event of events) {
            if (event.type === "text") {
              accumulated += event.text
              if (event.threadId) newThreadId = event.threadId
              setLangResponse(accumulated)
            } else if (event.type === "done" && event.threadId) {
              newThreadId = event.threadId
            } else if (event.type === "error") {
              throw new Error(event.message)
            }
          }
        }

        if (newThreadId) setThreadId(newThreadId)
        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", response: accumulated },
          ])
        }
      } catch (err) {
        const msg = (err instanceof Error ? err.message : String(err)).replace(/"/g, "'")
        setLangResponse(
          `<Alert severity="error" alerts={[{"category": "Generation Failed", "impact": "${msg}", "mitigation": "Try again or re-visualize the document."}]} />`
        )
      } finally {
        setStreaming(false)
      }
    },
    [input, streaming, canSend, selectedDocId, messages, token, projectId, threadId]
  )

  // Auto-visualize document by default when selected or loaded with empty thread
  useEffect(() => {
    if (!docsLoading && selectedDocId && !streaming && !autoVisualizedDocs.current[selectedDocId] && messages.length === 0) {
      autoVisualizedDocs.current[selectedDocId] = true
      
      const doc = documents.find((d) => d.id === selectedDocId)
      const docLabel = doc ? `"${doc.name}"` : "this document"
      
      setTimeout(() => {
        sendMessage(`Visualize ${docLabel} as a comprehensive dashboard with appropriate tables, lists, and status indicators.`)
      }, 100)
    }
  }, [docsLoading, selectedDocId, streaming, documents, messages.length, sendMessage])

  const refreshDashboard = () => {
    if (!selectedDocId || streaming) return
    setLangResponse(null)
    setMessages([])
    setThreadId(null)
    if (autoVisualizedDocs.current[selectedDocId]) {
      delete autoVisualizedDocs.current[selectedDocId]
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <PageTransition>
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back to documents */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-slate-500 hover:text-slate-900 shrink-0"
                  onClick={() => router.push(`/projects/${projectId}/documents`)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Documents
                </Button>
                <div className="h-4 w-px bg-slate-200 shrink-0" />

                {/* Page identity */}
                <div className="flex items-center gap-2 shrink-0">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <span className="font-semibold text-slate-900">Document Dashboard</span>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                    Live UI
                  </Badge>
                </div>
                <div className="h-4 w-px bg-slate-200 shrink-0" />

                {/* Document selector */}
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  {docsLoading ? (
                    <div className="flex h-8 w-[240px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading documents…
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex h-8 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs text-amber-600">
                      No documents found in this project
                    </div>
                  ) : (
                    <Select
                      value={selectedDocId}
                      onValueChange={handleDocChange}
                      disabled={streaming}
                    >
                      <SelectTrigger className="h-8 w-[280px] border-slate-200 bg-slate-50 text-xs focus:ring-indigo-500">
                        <SelectValue placeholder="Select a document…" />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">
                            <span className="truncate max-w-[260px]">{d.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshDashboard}
                  disabled={streaming || !selectedDocId}
                  className="h-8 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-all shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Re-visualize
                </Button>
              </div>
            </div>

            {/* Main Pane */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full">
                {docsLoading ? (
                  <DashboardLoader docName="documents" />
                ) : streaming && !langResponse ? (
                  <DashboardLoader docName={selectedDoc?.name} />
                ) : !selectedDocId ? (
                  <EmptyDashboardState />
                ) : langResponse ? (
                  <div className="mx-auto max-w-7xl w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {streaming && (
                      <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-700 shadow-sm animate-pulse">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Compiling live dashboard edits...</span>
                        </div>
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-indigo-500">Streaming</span>
                      </div>
                    )}
                    <DynamicComponentRenderer response={langResponse} isStreaming={streaming} />
                  </div>
                ) : (
                  <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100">
                      <Sparkles className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">Generate Dashboard</h2>
                    <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                      Click the button below to compile a gorgeous, interactive interface from "{selectedDoc?.name}".
                    </p>
                    <Button
                      onClick={refreshDashboard}
                      className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Compile UI Dashboard
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  )
}

// ─── Simplified Sub-components ──────────────────────────────────────────────────

function DashboardLoader({ docName }: { docName?: string }) {
  return (
    <div className="flex h-full min-h-[75vh] flex-col items-center justify-center gap-4 p-8 text-center animate-pulse">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Compiling Generative UI Dashboard</h2>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
        Parsing {docName ? `"${docName}"` : "document content"} and building high-integrity visual structures...
      </p>
    </div>
  )
}

function EmptyDashboardState() {
  return (
    <div className="flex h-full min-h-[75vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <FileText className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">No Document Selected</h2>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
        Choose a document from the selector in the toolbar above to generate its dashboard.
      </p>
    </div>
  )
}
