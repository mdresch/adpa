"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"


import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import {
  DocumentPageToolbar,
  type DocumentSummary,
} from "@/components/documents/DocumentPageToolbar"
import NovelEditor from "@/components/editor/novel-editor"
import { motion } from "framer-motion"
import {
  trackPageEngagement,
  trackEntityHighlighting,
  trackDocumentExport,
  trackFeatureUsage,
  trackPerformance,
  trackDocumentShare,
  trackCollaboration
} from "@/lib/analytics/clarity"
import {
  Download,
  Edit,
  Share,
  Copy,
  FileText,
  Calendar,
  User,
  Clock,
  BarChart3,
  ExternalLink,
  ArrowLeft,
  Eye,
  Settings,
  History,
  Folder,
  Tag,
  MessageSquare,
  Star,
  MoreHorizontal,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  Award,
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { getDocumentApiPath } from "@/lib/documents/document-api-routes"
import { getProjectContextPath, getProjectSourceDocumentPath, isProjectContextDocumentId } from "@/lib/documents/document-routes"
import { normalizeMermaidMarkdown } from "@/lib/documents/mermaid"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { toast } from '@/lib/notify'
import { saveAs } from "file-saver"
import { RegenerateVersionModal } from "@/components/documents/RegenerateVersionModal"
import { RegenerationProgress } from "@/components/documents/RegenerationProgress"
import { VersionViewerDialog } from "@/components/documents/VersionViewerDialog"
import { VersionListDialog, DocumentVersion as DocVersion } from "@/components/documents/VersionListDialog"

import { useDocumentRegeneration } from "@/hooks/use-document-regeneration"

import {
  ADPADocument as ADPADoc,
  GenerationMetadata,
  DocumentMetadata
} from "@/types/adpa"

export default function ProjectDocumentViewer() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated, token } = useAuth()

  const projectId = params.id as string
  const documentId = params.docId as string

  const [documentData, setDocumentData] = useState<ADPADoc | null>(null)
  const [versions, setVersions] = useState<DocVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editedContent, setEditedContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showVersions, setShowVersions] = useState(false) // For dialog
  const [showVersionsDialog, setShowVersionsDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showSummaries, setShowSummaries] = useState(false)
  const [summaries, setSummaries] = useState<any[]>([])
  const [loadingSummaries, setLoadingSummaries] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; text: string; level: number; isDrift?: boolean }>>([])
  const [activeSection, setActiveSection] = useState<string>("")
  const [templateName, setTemplateName] = useState<string>("")
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<DocVersion | null>(null)
  const [showVersionDialog, setShowVersionDialog] = useState(false)
  const [drifts, setDrifts] = useState<any[]>([])
  const [showDriftHighlights, setShowDriftHighlights] = useState(true)
  const [baseContentSnapshot, setBaseContentSnapshot] = useState<string>("")
  const [latestContentSnapshot, setLatestContentSnapshot] = useState<string>("")
  const [jiraLinkage, setJiraLinkage] = useState<{ issueKey: string; issueUrl: string; created: boolean } | null>(null)
  const [showInjectedContextDialog, setShowInjectedContextDialog] = useState(false)
  const [injectedContextData, setInjectedContextData] = useState<{
    markdown: string
    unitsCount: number
    documentsCount: number
    entityTypes: string[]
    strategy?: Record<string, unknown>
  } | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingWord, setIsExportingWord] = useState(false)
  const [projectDocuments, setProjectDocuments] = useState<DocumentSummary[]>([])
  const [docsListLoading, setDocsListLoading] = useState(true)

  // Feedback state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    comment: "",
    rating: 5,
    category: "general"
  })

  // Document regeneration hook
  const { regenerate, progress, isRegenerating, error: regenerationError, result, reset: resetRegeneration } = useDocumentRegeneration()

  // WebSocket event handlers for conflict and regeneration events
  const { on, off, joinRoom, leaveRoom } = useWebSocket()

  // Extract table of contents from markdown
  const extractTableOfContents = useCallback((content: string) => {
    const headings: Array<{ id: string; text: string; level: number; isDrift?: boolean }> = []
    const lines = (typeof content === 'string' ? content : '').split('\n')
    const idCounts = new Map<string, number>() // Track duplicate IDs

    lines.forEach((line) => {
      const h1Match = line.match(/^#\s+(.+)$/)
      const h2Match = line.match(/^##\s+(.+)$/)
      const h3Match = line.match(/^###\s+(.+)$/)
      const h4Match = line.match(/^####\s+(.+)$/)
      const h5Match = line.match(/^#####\s+(.+)$/)

      if (h1Match) {
        const text = h1Match[1].replace(/\*/g, '').trim() // Remove markdown formatting
        let baseId = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        const count = idCounts.get(baseId) || 0
        idCounts.set(baseId, count + 1)
        const id = count > 0 ? `${baseId}-${count}` : baseId
        headings.push({ id, text, level: 1 })
      } else if (h2Match) {
        const text = h2Match[1].replace(/\*/g, '').trim()
        let baseId = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        const count = idCounts.get(baseId) || 0
        idCounts.set(baseId, count + 1)
        const id = count > 0 ? `${baseId}-${count}` : baseId
        headings.push({ id, text, level: 2 })
      } else if (h3Match) {
        const text = h3Match[1].replace(/\*/g, '').trim()
        let baseId = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        const count = idCounts.get(baseId) || 0
        idCounts.set(baseId, count + 1)
        const id = count > 0 ? `${baseId}-${count}` : baseId
        headings.push({ id, text, level: 3 })
      } else if (h4Match) {
        const text = h4Match[1].replace(/\*/g, '').trim()
        const isDrift = /[🔴🟠🟡🔵⚪]/.test(text) && text.includes('DRIFT')
        const idPrefix = isDrift ? 'drift-' : 'heading-'
        let baseId = `${idPrefix}${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        const count = idCounts.get(baseId) || 0
        idCounts.set(baseId, count + 1)
        const id = count > 0 ? `${baseId}-${count}` : baseId
        headings.push({ id, text, level: 4, isDrift })
      } else if (h5Match) {
        const text = h5Match[1].replace(/\*/g, '').trim()
        const isDrift = /[🔴🟠🟡🔵⚪]/.test(text) && text.includes('DRIFT')
        const idPrefix = isDrift ? 'drift-' : 'heading-'
        let baseId = `${idPrefix}${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        const count = idCounts.get(baseId) || 0
        idCounts.set(baseId, count + 1)
        const id = count > 0 ? `${baseId}-${count}` : baseId
        headings.push({ id, text, level: 5, isDrift })
      }
    })

    setTableOfContents(headings)
  }, [])

  // Extract fetchDocument so it can be reused
  const fetchDocument = async () => {
    setIsLoading(true)
    try {
      // Fetch document from API (including drift data and Jira linkage)
      const [documentResponse, versionsResponse, driftResponse, jiraLinkageResponse] = await Promise.all([
        apiClient.get<ADPADoc>(`/documents/${documentId}`),
        apiClient.get<DocVersion[]>(`/documents/${documentId}/versions`),
        apiClient.request<{ driftRecords: any[] }>(
          `/drift/project/${projectId}`,
          { suppressNotFoundError: true } as Record<string, unknown>
        ).catch(() => ({ driftRecords: [] })),
        apiClient.request<{ linked: boolean; issueKey?: string; issueUrl?: string }>(
          `/jira-linkage/document/${documentId}`,
          { suppressNotFoundError: true } as Record<string, unknown>
        ).catch(() => ({ linked: false }))
      ])

      // Filter drifts for this specific document
      const documentDrifts = (driftResponse.driftRecords || []).filter((d: any) => d.source_document_id === documentId)
      setDrifts(documentDrifts)

      // Set Jira linkage if available
      if ('issueKey' in jiraLinkageResponse && jiraLinkageResponse.issueKey && jiraLinkageResponse.issueUrl) {
        setJiraLinkage({
          issueKey: jiraLinkageResponse.issueKey,
          issueUrl: jiraLinkageResponse.issueUrl,
          created: true
        })
      } else {
        setJiraLinkage(null)
      }

      const fetchedDoc = (documentResponse as any).document || (documentResponse as any).data || documentResponse
      const rawVersions = (versionsResponse as any).versions || (versionsResponse as any).data || versionsResponse
      const versionsData = Array.isArray(rawVersions) ? rawVersions : []

      console.log('[DocumentView] Loaded document:', fetchedDoc)
      console.log('[DocumentView] Loaded versions count:', versionsData.length)

      // Find the latest version (highest semantic version)
      let latestVersion = null
      if (versionsData.length > 0) {
        const parseVersion = (versionStr: string): [number, number, number] => {
          const parts = versionStr.split('.').map(p => parseInt(p, 10) || 0)
          return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
        }

        const sortedVersions = [...versionsData].sort((a: any, b: any) => {
          const [aMajor, aMinor, aPatch] = parseVersion(a.version)
          const [bMajor, bMinor, bPatch] = parseVersion(b.version)
          if (bMajor !== aMajor) return bMajor - aMajor
          if (bMinor !== aMinor) return bMinor - aMinor
          return bPatch - aPatch
        })
        latestVersion = sortedVersions[0]
      }

      const dataToDisplay = latestVersion || fetchedDoc

      // Convert content to string if it's an object (robust extraction)
      let contentString = ''
      const rawContent = dataToDisplay.content
      if (typeof rawContent === 'string') {
        contentString = rawContent
      } else if (rawContent && typeof rawContent === 'object') {
        contentString = (rawContent as any).text || 
                        (rawContent as any).markdown || 
                        (rawContent as any).content || 
                        JSON.stringify(rawContent, null, 2)
      }

      contentString = normalizeMermaidMarkdown(contentString)

      // Template name handling
      if (fetchedDoc.template_name) {
        setTemplateName(fetchedDoc.template_name)
      } else if (fetchedDoc.template_id) {
        try {
          const templateResponse = await apiClient.get(`/templates/${fetchedDoc.template_id}`)
          setTemplateName((templateResponse as any).template?.name || (templateResponse as any).name || 'Unknown Template')
        } catch (error) {
          console.error('Failed to fetch template name:', error)
          setTemplateName('Unknown Template')
        }
      }

      // Source documents handling
      const sourceDocuments = (dataToDisplay as any).metadata?.source_documents ||
        (dataToDisplay as any).metadata?.source_documentDatas ||
        (dataToDisplay as any).generation_metadata?.source_documents ||
        (dataToDisplay as any).generation_metadata?.source_documentDatas ||
        (dataToDisplay as any).source_documents ||
        []

      setDocumentData({
        ...fetchedDoc,
        ...dataToDisplay,
        content: contentString,
        source_documents: sourceDocuments,
        loaded_version: latestVersion ? latestVersion.version : null,
        loaded_version_id: latestVersion ? latestVersion.id : null
      })
      setVersions(versionsData)
      setEditedContent(contentString)
      setBaseContentSnapshot(contentString)
      setLatestContentSnapshot(contentString)

      if (contentString) {
        extractTableOfContents(contentString)
      }
    } catch (error) {
      console.error("Failed to load document:", error)
      toast.error("Failed to load document from API")
      setDocumentData(null)
      setVersions([])
      setEditedContent("")
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and engagement tracking
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isProjectContextDocumentId(documentId)) {
      router.replace(getProjectContextPath(projectId))
      return
    }

    if (authLoading) {
      return
    }

    if (!isAuthenticated || !token) {
      setIsLoading(false)
      return
    }

    void fetchDocument()

    const startTime = Date.now()
    let interactionCount = 0
    const handleInteraction = () => { interactionCount++ }

    window.document.addEventListener('click', handleInteraction)
    window.document.addEventListener('scroll', handleInteraction)

    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      trackPageEngagement(`/projects/${projectId}/documents/${documentId}/view`, timeSpent, interactionCount)
      window.document.removeEventListener('click', handleInteraction)
      window.document.removeEventListener('scroll', handleInteraction)
    }
  }, [projectId, documentId, router, authLoading, isAuthenticated, token])

  useEffect(() => {
    if (!projectId || !isAuthenticated) return
    const fetchProjectDocuments = async () => {
      setDocsListLoading(true)
      try {
        const res = await apiClient.get<{ documents: DocumentSummary[] }>(
          `/documents/project/${projectId}?limit=100`
        )
        setProjectDocuments(res.documents ?? [])
      } catch (err) {
        console.error("Failed to fetch project documents", err)
        setProjectDocuments([])
      } finally {
        setDocsListLoading(false)
      }
    }
    void fetchProjectDocuments()
  }, [projectId, isAuthenticated])

  const handleDocChange = (newDocId: string) => {
    router.push(`/projects/${projectId}/documents/${newDocId}/view`)
  }

  // WebSocket effect
  useEffect(() => {
    const documentRoom = `document:${documentId}`
    const projectRoom = `project:${projectId}`
    joinRoom(documentRoom)
    joinRoom(projectRoom)

    const recentNotifications = new Set<string>()

    const handleConflictDetected = (data: any) => {
      const key = `conflict-detected-${data.conflictId}`
      if (!recentNotifications.has(key)) {
        recentNotifications.add(key)
        toast.warning(`Template conflict detected: ${data.conflictDetails.template?.name || 'Unknown'}`)
        setTimeout(() => recentNotifications.delete(key), 5000)
      }
    }

    const handleConflictResolved = (data: any) => {
      if (data.documentId === documentId) {
        toast.success(`Conflict resolved using ${data.resolutionMethod}`)
        fetchDocument()
      }
    }

    const handleRegenerationCompleted = (data: any) => {
      const key = `regeneration-completed-${data.versionId}`
      if (!recentNotifications.has(key)) {
        recentNotifications.add(key)
        toast.success(`Document regeneration completed (v${data.versionNumber})`)
        setTimeout(() => recentNotifications.delete(key), 5000)
      }
      fetchDocument()
    }

    on("document:regeneration:conflict_detected", handleConflictDetected)
    on("document:conflict_resolved", handleConflictResolved)
    on("document:regeneration:completed", handleRegenerationCompleted)

    return () => {
      off("document:regeneration:conflict_detected", handleConflictDetected)
      off("document:conflict_resolved", handleConflictResolved)
      off("document:regeneration:completed", handleRegenerationCompleted)
      leaveRoom(documentRoom)
      leaveRoom(projectRoom)
    }
  }, [documentId, projectId, on, off, joinRoom, leaveRoom])

  // Submit feedback
  const handleSubmitFeedback = async () => {
    if (!feedbackForm.comment.trim()) {
      toast.error("Please enter a comment")
      return
    }

    try {
      const response = await apiClient.submitDocumentFeedback(documentId, {
        comment: feedbackForm.comment.trim(),
        rating: feedbackForm.rating,
        category: feedbackForm.category,
      })

      if (response.success) {
        toast.success("Feedback submitted successfully!")
        setFeedbackDialogOpen(false)
        setFeedbackForm({ comment: "", rating: 5, category: "general" })
        fetchDocument()
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error)
      toast.error("Failed to submit feedback")
    }
  }

  const addComment = async () => {
    if (!newComment.trim() || !documentData) return

    try {
      const response = await apiClient.post(`/projects/${projectId}/documents/${documentId}/comments`, {
        content: newComment,
        author_id: user?.id
      })

      const newCommentObj = (response as any).data || (response as any).comment

      setDocumentData({
        ...documentData,
        comments: [...(documentData.comments || []), newCommentObj]
      })
      setNewComment("")
      toast.success("Comment added successfully")
    } catch (error) {
      console.error("Failed to add comment:", error)
      toast.error("Failed to add comment")
    }
  }

  const saveDocument = async (isAutosave = false) => {
    if (!documentData) return
    if (isAutosave) setIsSaving(true)

    trackCollaboration('edit', documentData.id, 1)

    try {
      await apiClient.put(getDocumentApiPath(documentId), {
        content: normalizeMermaidMarkdown(editedContent),
        title: documentData.title || documentData.name,
        tags: documentData.tags || []
      })

      if (!isAutosave) {
        toast.success("Document saved successfully!")
        await fetchDocument()
      } else {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error("Failed to save document:", error)
      if (!isAutosave) toast.error("Failed to save document")
    } finally {
      if (isAutosave) setIsSaving(false)
    }
  }

  const debouncedAutosave = useDebouncedCallback(() => {
    saveDocument(true)
  }, 2000)

  const copyToClipboard = () => {
    if (!documentData) return
    navigator.clipboard.writeText(documentData.content)
    toast.success("Copied to clipboard")
  }

  const shareDocument = () => {
    if (!documentData) return
    trackDocumentShare(documentData.id, 'native_share', 1)
    if (navigator.share) {
      navigator.share({
        title: documentData.title || documentData.name,
        text: (documentData.content || "").substring(0, 200) + "...",
        url: window.location.href,
      })
    } else {
      copyToClipboard()
    }
  }

  const exportToPDF = async () => {
    if (!documentData) return
    try {
      setIsExportingPdf(true)
      const blob = await apiClient.exportDocumentPdf(documentId)
      const url = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${documentData.title || documentData.name || 'document'}.pdf`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success("Exported to PDF")
    } catch (error) {
      toast.error("Failed to export PDF")
    } finally {
      setIsExportingPdf(false)
    }
  }

  const exportToWord = async () => {
    if (!documentData) return
    try {
      setIsExportingWord(true)
      const blob = await apiClient.exportDocumentDocx(documentId)
      const url = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${documentData.title || documentData.name || 'document'}.docx`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success("Exported to Word")
    } catch (error) {
      toast.error("Failed to export Word")
    } finally {
      setIsExportingWord(false)
    }
  }

  const exportToMarkdown = () => {
    if (!documentData) return
    const blob = new Blob([documentData.content], { type: "text/markdown" })
    saveAs(blob, `${documentData.title || documentData.name || 'document'}.md`)
    toast.success("Exported to Markdown")
  }

  const printDocument = () => {
    if (!documentData) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<html><head><title>${documentData.title || documentData.name}</title></head><body>${documentData.content}</body></html>`)
    printWindow.document.close()
    printWindow.print()
  }

  const handlePublishToConfluence = async () => {
    try {
      const resp: any = await apiClient.post(`/integrations/confluence/latest/export`, { documentId })
      const url = resp?.confluenceUrl || resp?.data?.confluenceUrl
      if (url) {
        setDocumentData(prev => prev ? ({ ...prev, confluence_page_url: url }) : null)
        toast.success('Published to Confluence')
      }
    } catch (e) {
      toast.error('Failed to publish to Confluence')
    }
  }

  const handlePublishToJira = async () => {
    try {
      const resp: any = await apiClient.post(`/jira-linkage/create-issue`, {
        documentId,
        issueTitle: documentData?.title || documentData?.name || 'Document',
        issueDescription: `Document: ${documentData?.title || documentData?.name}`,
        confluenceUrl: documentData?.confluence_page_url
      })
      if (resp.issueKey) {
        setJiraLinkage({ issueKey: resp.issueKey, issueUrl: resp.issueUrl, created: resp.created })
        toast.success('Published to Jira')
      }
    } catch (e) {
      toast.error('Failed to publish to Jira')
    }
  }

  const pageShell = (content: React.ReactNode, toolbarDocId = documentId) => (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <DocumentPageToolbar
          projectId={projectId}
          mode="view"
          documents={projectDocuments}
          docsLoading={docsListLoading}
          selectedDocId={toolbarDocId}
          onDocChange={handleDocChange}
        />
        {content}
      </div>
    </div>
  )

  if (isLoading) {
    return pageShell(
      <main className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </main>
    )
  }

  if (!documentData) {
    return pageShell(
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-slate-900">Document not found</h2>
        <Button onClick={() => router.push(`/projects/${projectId}/documents`)}>
          Back to documents
        </Button>
      </main>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <DocumentPageToolbar
          projectId={projectId}
          mode="view"
          documents={projectDocuments}
          docsLoading={docsListLoading}
          selectedDocId={documentId}
          onDocChange={handleDocChange}
          docSelectorDisabled={isSaving}
        >
          <Badge variant="secondary" className="text-[10px] uppercase">
            {documentData.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowVersionsDialog(true)}
          >
            <History className="h-3.5 w-3.5" />
            v{documentData.loaded_version || documentData.version}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {documentData.comments?.length || 0}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowRegenerateModal(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={`/projects/${projectId}/documents/${documentId}`}>
              <Settings className="h-3.5 w-3.5" />
              Metadata
            </Link>
          </Button>
        </DocumentPageToolbar>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <AnimatedLayout>
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
              <div className="mb-6">
                <p className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  <Folder className="h-3.5 w-3.5" />
                  {documentData.project_name || "Project"}
                  {templateName ? (
                    <>
                      <span className="text-slate-300">·</span>
                      {templateName}
                    </>
                  ) : null}
                </p>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  {documentData.title || documentData.name}
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Editor Column */}
                  <div className="lg:col-span-3">
                    <AnimatedCard>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">Content</CardTitle>
                        <div className="flex items-center gap-2">
                          {isSaving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
                          <Button variant="ghost" size="sm" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={shareDocument}><Share className="h-4 w-4" /></Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <NovelEditor
                          initialValue={documentData.content}
                          onChange={(json, html, markdown) => {
                            setEditedContent(markdown)
                            debouncedAutosave()
                          }}
                          storageKey={`novel-doc-${documentId}`}
                          enableInlineMermaid={false}
                        />
                      </CardContent>
                    </AnimatedCard>
                  </div>

                  {/* Sidebar Column */}
                  <div className="space-y-6">
                    {/* Metadata Card */}
                    <AnimatedCard>
                      <CardHeader><CardTitle className="text-sm font-medium">Info</CardTitle></CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Author:</span>
                          <span className="font-medium">{documentData.author || 'AI Agent'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{new Date(documentData.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Words:</span>
                          <span>{documentData.word_count?.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex flex-wrap gap-1">
                          {(documentData.tags || []).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* AI Stats Card */}
                    {documentData.generation_metadata && (
                      <AnimatedCard>
                        <CardHeader><CardTitle className="text-sm font-medium">AI Insights</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model:</span>
                            <span>{documentData.ai_model || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tokens:</span>
                            <span>{(documentData.input_tokens || 0) + (documentData.output_tokens || 0)}</span>
                          </div>
                          {documentData.generation_metadata.qualityMetrics && (
                            <div className="mt-2">
                              <p className="mb-1">Quality Score: {documentData.generation_metadata.qualityMetrics.overallQuality}%</p>
                              <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                                <div className="bg-primary h-full" style={{ width: `${documentData.generation_metadata.qualityMetrics.overallQuality}%` }} />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Export Card */}
                    <AnimatedCard>
                      <CardHeader><CardTitle className="text-sm font-medium">Actions</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={exportToPDF} disabled={isExportingPdf}>
                          <Download className="h-3 w-3 mr-2" /> PDF
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={exportToWord} disabled={isExportingWord}>
                          <Download className="h-3 w-3 mr-2" /> Word
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={exportToMarkdown}>
                          <Download className="h-3 w-3 mr-2" /> Markdown
                        </Button>
                        {documentData.confluence_page_url ? (
                          <Button variant="default" className="w-full justify-start text-xs h-8" asChild>
                            <a href={documentData.confluence_page_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-2" /> Confluence</a>
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={handlePublishToConfluence}>
                            <ExternalLink className="h-3 w-3 mr-2" /> Publish to Confluence
                          </Button>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </div>
                </div>

                {/* Source Documents Section */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers className="h-5 w-5" /> Source Context
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(documentData.source_documents || []).map((doc: any, i: number) => (
                      <Card key={i} className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{doc.title}</p>
                              <p className="text-[10px] text-muted-foreground">{doc.type}</p>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={getProjectSourceDocumentPath(projectId, doc.id)}><Eye className="h-3 w-3" /></Link>
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                    {(documentData.source_documents || []).length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No source context recorded.</p>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                {showComments && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-semibold">Comments</h3>
                    <div className="space-y-4">
                      {(documentData.comments || []).map((c: any) => (
                        <Card key={c.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between text-xs text-muted-foreground mb-2">
                              <span>{c.author}</span>
                              <span>{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm">{c.content}</p>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="flex gap-2">
                        <Textarea 
                          placeholder="Add a comment..." 
                          value={newComment} 
                          onChange={e => setNewComment(e.target.value)} 
                          className="min-h-[80px]"
                        />
                        <Button className="self-end" onClick={addComment} disabled={!newComment.trim()}>Post</Button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </AnimatedLayout>
        </main>
      </div>

      {/* Dialogs & Modals */}
      <VersionListDialog
        open={showVersionsDialog}
        onOpenChange={setShowVersionsDialog}
        versions={versions}
        documentName={documentData.name}
        loadedVersionId={(documentData as any).loaded_version_id}
        // @ts-ignore - DocumentVersion type mismatch from aliased import
        onLoadVersion={(version) => {
          setDocumentData({
            ...documentData,
            content: version.content,
            version: parseFloat(version.version),
            loaded_version: version.version,
            loaded_version_id: version.id
          } as any)
          setEditedContent(version.content)
          toast.success(`Loaded version ${version.version}`)
        }}
      />

      <RegenerateVersionModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        documentId={documentId}
        currentTemplate={documentData.template_id}
        currentVersion={documentData.version?.toString() || '1.0'}
        projectId={projectId}
        onRegenerate={async (params) => {
          await regenerate({ documentId, ...params })
        }}
      />

      <RegenerationProgress
        jobId={progress?.jobId || null}
        progress={progress}
        isRegenerating={isRegenerating}
        error={regenerationError}
        result={result}
        onClose={resetRegeneration}
        documentId={documentId}
      />
    </div>
  )
}
