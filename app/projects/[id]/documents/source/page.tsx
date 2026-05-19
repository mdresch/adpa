"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { extractDocumentMarkdown } from "@/lib/documents/extractContent"
import {
  DocumentPageToolbar,
  type DocumentSummary,
} from "@/components/documents/DocumentPageToolbar"
import { Copy, Check, Loader2 } from "lucide-react"

export default function ProjectDocumentSourcePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const projectId = params?.id as string | undefined
  const initialDocId = searchParams?.get("docId") ?? undefined

  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId ?? "")
  const [contentLoading, setContentLoading] = useState(false)
  const [markdown, setMarkdown] = useState<string>("")
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null

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

  const loadDocumentContent = useCallback(async (docId: string) => {
    if (!docId) {
      setMarkdown("")
      setUpdatedAt(null)
      return
    }
    setContentLoading(true)
    try {
      const doc = await apiClient.getDocument(docId)
      setMarkdown(extractDocumentMarkdown(doc.content))
      setUpdatedAt(doc.updated_at ?? doc.created_at ?? null)
    } catch (err) {
      console.error("Failed to load document content", err)
      setMarkdown("")
      setUpdatedAt(null)
    } finally {
      setContentLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedDocId) {
      void loadDocumentContent(selectedDocId)
    }
  }, [selectedDocId, loadDocumentContent])

  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId)
    router.replace(`/projects/${projectId}/documents/source?docId=${docId}`)
  }

  const handleCopy = async () => {
    if (!markdown) return
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard may be unavailable */
    }
  }

  const charCount = markdown.length
  const lineCount = markdown ? markdown.split("\n").length : 0

  if (!projectId) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <DocumentPageToolbar
          projectId={projectId}
          mode="source"
          documents={documents}
          docsLoading={docsLoading}
          selectedDocId={selectedDocId}
          onDocChange={handleDocChange}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleCopy}
            disabled={!markdown || contentLoading}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </DocumentPageToolbar>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8">
            {!selectedDocId ? (
              <p className="text-sm text-slate-500">Select a document to view its stored markdown.</p>
            ) : contentLoading ? (
              <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading document from database…
              </div>
            ) : markdown ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{lineCount.toLocaleString()} lines</span>
                  <span>{charCount.toLocaleString()} characters</span>
                  {updatedAt ? (
                    <span>Updated {new Date(updatedAt).toLocaleString()}</span>
                  ) : null}
                  {selectedDoc?.template_name ? (
                    <span>Template: {selectedDoc.template_name}</span>
                  ) : null}
                </div>
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 sm:p-6 text-[13px] leading-relaxed text-slate-800 font-mono whitespace-pre-wrap break-words shadow-sm">
                  {markdown}
                </pre>
              </>
            ) : (
              <p className="text-sm text-slate-500">This document has no stored content.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
