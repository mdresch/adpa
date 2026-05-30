"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  FileText,
  Edit,
  MessageSquare,
  Save,
  ArrowLeft,
  Calendar,
  User,
  Tag,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Share,
  History,
  Eye,
  Settings,
  Wand2,
  Loader2,
  RefreshCw,
  Shield,
  Database,
  Activity,
  TrendingUp,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Presentation,
  FileArchive,
  FileAudio,
  FileVideo,
  File,
  Info,
  ExternalLink,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Brain,
  Wifi,
  WifiOff,
  Cpu,
  MemoryStick,
  Building,
  HardDrive,
  Play,
  Pause,
  Bold,
  Italic,
  Underline,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Undo,
  Redo,
  Edit3,
  Crown,
  Key,
  Mail,
  Sparkles,
  Filter,
  DollarSign,
  Archive,
  FileUp,
  Star,
  Lock,
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Cloud,
  GitBranch,
  GitPullRequest,
  Sync,
  TestTube,
  Crosshair,
  ChevronRight,
} from "@/components/ui/icons-shim"
import { FileSignature } from "lucide-react"
import { SignatureRequestDialog, SignatureStatusBadge } from "@/components/signature"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient, Project, Template } from "@/lib/api"
import { toast } from '@/lib/notify'
import {
  getDocumentSignPath,
  getProjectDocumentEntitiesPath,
  getProjectDocumentGenUIPath,
  getProjectDocumentsPath,
  getProjectDocumentViewPath,
} from '@/lib/documents/document-routes'
import { RegenerateVersionModal } from "@/components/documents/RegenerateVersionModal"
import { RegenerationProgress } from "@/components/documents/RegenerationProgress"
import { useDocumentRegeneration } from "@/hooks/use-document-regeneration"
import { QualityAuditModal } from "@/components/quality/QualityAuditModal"

import { 
  ADPADocument, 
  GenerationMetadata, 
  QualityAudit, 
  DocumentMetadata,
  Feedback,
  AIProcessing,
  ContentMetrics,
  QualityMetrics,
  QualityGateCriterion,
  QualityGate,
  ContextStats
} from "@/types/adpa"


export default function DocumentMetadataPage({ params }: { params: Promise<{ id: string; docId: string }> | { id: string; docId: string } }) {
  const router = useRouter()
  // Handle both Promise and direct params (for Next.js 15 compatibility)
  const resolvedParams = 'then' in params ? use(params) : params
  const projectId = resolvedParams.id
  const docId = resolvedParams.docId
  const { isAuthenticated, user, token } = useAuth()

  const [documentData, setDocumentData] = useState<ADPADocument | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    comment: "",
    rating: 5,
    category: "general"
  })
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [analyzingTemplate, setAnalyzingTemplate] = useState(false)
  const [showSignatureRequestDialog, setShowSignatureRequestDialog] = useState(false)
  const [signatureRequest, setSignatureRequest] = useState<any>(null)
  const [signatureRecipients, setSignatureRecipients] = useState<any[]>([])
  const [templateCategory, setTemplateCategory] = useState<string | null>(null)
  const [showQualityAuditModal, setShowQualityAuditModal] = useState(false)
  const [runningQualityAudit, setRunningQualityAudit] = useState(false)
  const [qualityAudit, setQualityAudit] = useState<QualityAudit | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)
  // Ref to store timeout ID for quality audit refresh to prevent stale state updates
  const qualityAuditTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Document regeneration hook
  const { regenerate, progress, isRegenerating, error: regenerationError, result, reset: resetRegeneration } = useDocumentRegeneration()

  // Metadata form state
  const [metadataForm, setMetadataForm] = useState<DocumentMetadata>({
    name: "",
    status: "draft",
    tags: [],
    template_id: "",
    framework: "",
    category: "",
    priority: "medium",
    author: "",
    reviewer: "",
    due_date: "",
    description: "",
    notes: "",
    custom_fields: {}
  })

  // Fetch signature request status and recipients
  const fetchSignatureRequest = async () => {
    try {
      const response = await apiClient.get<{ data: any[] }>(`/signatures/requests?documentDataId=${docId}`)
      if (response.data && response.data.length > 0) {
        const request = response.data[0]
        setSignatureRequest(request)

        // Fetch signed recipients (reviewers)
        if (request.recipients) {
          const signedRecipients = request.recipients.filter((r: any) => r.status === 'signed')
          setSignatureRecipients(signedRecipients)
        }
      }

      // Also try to get signature status directly
      try {
        const statusResponse = await apiClient.get<{ data: any }>(`/signatures/documentData/${docId}`, {
          suppressNotFoundError: true // Suppress 404 logging - expected when no signature request exists
        })
        if (statusResponse.data && statusResponse.data.recipients) {
          const signedRecipients = statusResponse.data.recipients.filter((r: any) => r.status === 'signed')
          setSignatureRecipients(signedRecipients)
        }
      } catch (statusError: any) {
        // No signature status, that's okay - 404 is expected when no signature request exists
        // Only log non-404 errors
        if (statusError?.status !== 404) {
          console.warn('[METADATA-PAGE] Error fetching signature status:', statusError)
        }
      }
    } catch (error) {
      // No signature request yet, that's okay
      console.log('No signature request found')
    }
  }

  // Fetch quality audit data
  const fetchQualityAudit = async () => {
    try {
      setLoadingAudit(true)
      const { getApiBaseUrl } = await import('@/lib/api-url')
      const API_BASE_URL = getApiBaseUrl()
      const authToken = token || localStorage.getItem('auth_token') || localStorage.getItem('token')

      if (!authToken || !docId) {
        return
      }

      // First, check if quality audit exists
      const response = await fetch(`${API_BASE_URL}/quality-audits/documentData/${docId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.audit) {
          console.log('[QUALITY-AUDIT] Existing audit found:', { docId, overallScore: data.audit.overallScore })
          setQualityAudit(data.audit)
          return
        }
      }

      // If no audit exists (404 or no data), automatically trigger one
      if (response.status === 404 || !response.ok) {
        console.log('[QUALITY-AUDIT] No audit found, automatically triggering quality audit for documentData:', docId)

        // Automatically trigger quality audit
        // The backend will fetch the documentData content itself, so we don't need to check it here
        try {
          const triggerResponse = await fetch(`${API_BASE_URL}/quality-audits/trigger`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ documentDataId: docId })
          })

          if (triggerResponse.ok) {
            const triggerData = await triggerResponse.json()
            if (triggerData.success) {
              console.log('[QUALITY-AUDIT] Auto-triggered successfully, will refresh in 5 seconds')
              toast.success("Quality audit started automatically. Results will appear shortly.")
              // Wait a bit longer for audit to complete (quality audits can take 10-30 seconds)
              setTimeout(async () => {
                await fetchQualityAudit()
              }, 5000)
            } else {
              console.error('[QUALITY-AUDIT] Auto-trigger failed:', triggerData.error)
              toast.warning("Quality audit could not be started automatically. You can trigger it manually.")
            }
          } else {
            const errorData = await triggerResponse.json().catch(() => ({}))
            const errorMessage = errorData.error || triggerResponse.statusText
            console.error('[QUALITY-AUDIT] Auto-trigger failed:', errorMessage)
            // Only show toast if it's not a "no content" error (which is expected for some documentDatas)
            if (!errorMessage.includes('no content')) {
              toast.warning("Quality audit could not be started automatically. You can trigger it manually.")
            }
          }
        } catch (triggerError) {
          console.error('[QUALITY-AUDIT] Error auto-triggering audit:', triggerError)
          // Don't show error toast - user can trigger manually if needed
        }
      }
    } catch (error) {
      console.error("Failed to fetch quality audit:", error)
      // Don't show error toast - audit might not exist yet
    } finally {
      setLoadingAudit(false)
    }
  }

  // Fetch template category
  const fetchTemplateCategory = async (templateId: string | undefined) => {
    if (!templateId) {
      setTemplateCategory(null)
      return
    }

    try {
      const template = templates.find(t => t.id === templateId)
      if (template && template.category) {
        setTemplateCategory(template.category)
      } else {
        // Try to fetch template details if not in local state
        try {
          const template = await apiClient.getTemplate(templateId)
          if (template.category) {
            setTemplateCategory(template.category)
          }
        } catch (error) {
          console.error('Failed to fetch template category:', error)
        }
      }
    } catch (error) {
      console.error('Failed to fetch template category:', error)
    }
  }

  // Fetch documentData data
  const fetchDocument = async () => {
    if (!docId) {
      console.error('[METADATA-PAGE] docId is missing:', { docId, projectId })
      throw new Error("Document ID is required")
    }

    try {
      console.log('[METADATA-PAGE] Fetching documentData:', { docId, projectId })

      const fetchedDocument = await apiClient.getDocument(docId)

      if (!fetchedDocument) {
        console.error('[METADATA-PAGE] Document data is null or undefined')
        throw new Error("Document not found")
      }

      const genMetadata = fetchedDocument.generation_metadata
      // Handle both snake_case (source_documentDatas) and camelCase (sourceDocuments) for backward compatibility
      const sourceDocs = genMetadata?.source_documentDatas || genMetadata?.sourceDocuments || []
      const hasProjectContext = Array.isArray(sourceDocs) && sourceDocs.some((doc: any) => doc.is_project_context || (doc.id && doc.id.startsWith('project_context:')))

      console.log('[METADATA-PAGE] Document fetched successfully:', {
        id: fetchedDocument.id,
        name: fetchedDocument.name,
        title: fetchedDocument.title,
        status: fetchedDocument.status,
        hasMetadata: !!fetchedDocument.metadata,
        metadataKeys: fetchedDocument.metadata ? Object.keys(fetchedDocument.metadata) : [],
        metadata: fetchedDocument.metadata,
        hasGenerationMetadata: !!genMetadata,
        generationMetadataKeys: genMetadata ? Object.keys(genMetadata) : [],
        hasSourceDocuments: !!(genMetadata?.source_documentDatas || genMetadata?.sourceDocuments),
        sourceDocumentsCount: Array.isArray(sourceDocs) ? sourceDocs.length : 0,
        sourceDocuments: sourceDocs,
        hasProjectContext: hasProjectContext,
        projectContextEntry: sourceDocs.find((doc: any) => doc.is_project_context || (doc.id && doc.id.startsWith('project_context:')))
      })

      // Also log the full generation_metadata as JSON for debugging
      console.log('[METADATA-PAGE] Full generation_metadata JSON:', JSON.stringify(genMetadata, null, 2))
      console.log('[METADATA-PAGE] Source documentDatas array:', JSON.stringify(sourceDocs, null, 2))

      setDocumentData(fetchedDocument as any)
      await fetchSignatureRequest()

      // Fetch template category if template_id exists
      if (fetchedDocument.template_id) {
        await fetchTemplateCategory(fetchedDocument.template_id)
      }

      // Populate metadata form
      // Handle both 'name' and 'title' fields (database may have either)
      const documentDataName = fetchedDocument.name || fetchedDocument.title || ""
      // Handle both 'framework' and 'template_framework' fields
      const documentDataFramework = fetchedDocument.framework || fetchedDocument.template_framework || ""

      const formData = {
        name: documentDataName,
        status: fetchedDocument.status || "draft",
        tags: fetchedDocument.tags || [],
        template_id: fetchedDocument.template_id || "",
        framework: documentDataFramework,
        category: fetchedDocument.metadata?.category || "",
        priority: fetchedDocument.metadata?.priority || "medium",
        author: fetchedDocument.metadata?.author || "",
        reviewer: fetchedDocument.metadata?.reviewer || "",
        due_date: fetchedDocument.metadata?.due_date || "",
        description: fetchedDocument.metadata?.description || "",
        notes: fetchedDocument.metadata?.notes || "",
        custom_fields: fetchedDocument.metadata?.custom_fields || {}
      }

      console.log('[METADATA-PAGE] Populating metadata form:', formData)
      setMetadataForm(formData)
    } catch (error) {
      console.error("[METADATA-PAGE] Failed to fetch documentData:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load documentData metadata"
      toast.error(errorMessage)

      // Set documentData to null so UI can show error state
      setDocumentData(null)
      throw error // Re-throw so Promise.all can catch it
    }
  }

  // Fetch project data
  const fetchProject = async () => {
    try {
      const projectData = await apiClient.getProject(projectId)
      setProject(projectData)
    } catch (error) {
      console.error("Failed to fetch project:", error)
    }
  }

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await apiClient.getTemplates({ limit: 50 })
      setTemplates(response.templates || [])
    } catch (error) {
      console.error("Failed to fetch templates:", error)
    }
  }

  // Run quality audit
  const handleRunQualityAudit = async () => {
    // Validate docId first
    if (!docId) {
      console.error('[QUALITY-AUDIT] docId is missing:', { docId, projectId, documentData: !!documentData })
      toast.error("Document ID is missing. Please refresh the page and try again.")
      return
    }

    if (!documentData) {
      console.error('[QUALITY-AUDIT] Document not loaded:', { docId })
      toast.error("Document not loaded. Please wait for the documentData to load and try again.")
      return
    }

    // Validate documentData has content
    // Handle both string content and object content
    let documentDataContent: string = ""
    if (typeof documentData.content === 'string') {
      documentDataContent = documentData.content
    } else if (documentData.content && typeof documentData.content === 'object') {
      // Try to extract content from object
      documentDataContent = (documentData.content as any).content || (documentData.content as any).text || JSON.stringify(documentData.content)
    }

    if (!documentDataContent || documentDataContent.trim().length === 0) {
      console.warn('[QUALITY-AUDIT] Document has no content:', { docId, contentType: typeof documentData.content })
      toast.error("Document has no content to audit. Please ensure the documentData has been generated.")
      return
    }

    // Clear any existing timeout to prevent stale updates
    if (qualityAuditTimeoutRef.current) {
      clearTimeout(qualityAuditTimeoutRef.current)
      qualityAuditTimeoutRef.current = null
    }

    try {
      setRunningQualityAudit(true)
      console.log('[QUALITY-AUDIT] Starting quality audit:', { docId, projectId, contentLength: documentDataContent.length })

      const { getApiBaseUrl } = await import('@/lib/api-url')
      const API_BASE_URL = getApiBaseUrl()
      const authToken = token || localStorage.getItem('auth_token') || localStorage.getItem('token')

      if (!authToken) {
        console.error('[QUALITY-AUDIT] No auth token available')
        toast.error("Authentication required. Please log in again.")
        setRunningQualityAudit(false)
        return
      }

      // Add timeout to fetch request (60 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      let response: Response
      let data: any

      try {
        console.log('[QUALITY-AUDIT] Sending request to:', `${API_BASE_URL}/quality-audits/trigger`)
        response = await fetch(`${API_BASE_URL}/quality-audits/trigger`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            documentDataId: docId
          }),
          signal: controller.signal
        })

        console.log('[QUALITY-AUDIT] Response received:', { status: response.status, statusText: response.statusText, ok: response.ok })

        clearTimeout(timeoutId)

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          const text = await response.text()
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`)
        }

        if (!response.ok) {
          const errorMessage = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        // Validate response structure
        if (!data || data.success === false) {
          console.error('[QUALITY-AUDIT] Invalid response:', data)
          throw new Error(data?.error || 'Quality audit response was invalid')
        }

        console.log('[QUALITY-AUDIT] Audit completed successfully:', {
          success: data.success,
          hasAudit: !!data.audit,
          overallScore: data.audit?.overallScore
        })

        toast.success(data.message || "Quality audit completed successfully!")

        // Reset loading state immediately after successful trigger
        setRunningQualityAudit(false)

        // Refresh audit data after a delay to show new results
        // Store timeout ID in ref for cleanup
        qualityAuditTimeoutRef.current = setTimeout(async () => {
          console.log('[QUALITY-AUDIT] Refreshing audit data after delay')
          await fetchQualityAudit()
          setShowQualityAuditModal(true)
          qualityAuditTimeoutRef.current = null // Clear ref after execution
        }, 3000)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        console.error('[QUALITY-AUDIT] Fetch error:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        })

        // Handle specific error types
        if (fetchError.name === 'AbortError') {
          throw new Error('Quality audit request timed out. The audit may still be processing. Please check back in a moment.')
        } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection and try again.')
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      console.error("[QUALITY-AUDIT] Failed to run quality audit:", {
        error,
        docId,
        projectId,
        hasDocument: !!documentData,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error)
      })

      // More descriptive error messages
      let errorMessage = "Failed to run quality audit"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as any).message)
      }

      toast.error(errorMessage)
      setRunningQualityAudit(false)

      // Clear timeout if it was set before error occurred
      if (qualityAuditTimeoutRef.current) {
        clearTimeout(qualityAuditTimeoutRef.current)
        qualityAuditTimeoutRef.current = null
      }
    }
  }

  // Save metadata
  const handleSaveMetadata = async () => {
    try {
      setSaving(true)

      const updateData = {
        name: metadataForm.name || undefined,
        status: metadataForm.status || undefined,
        tags: metadataForm.tags.length > 0 ? metadataForm.tags : undefined,
        template_id: metadataForm.template_id && metadataForm.template_id.trim() !== "" ? metadataForm.template_id : undefined,
        metadata: {
          ...documentData?.metadata,
          category: metadataForm.category || undefined,
          priority: metadataForm.priority || undefined,
          author: metadataForm.author || undefined,
          reviewer: metadataForm.reviewer || undefined,
          due_date: metadataForm.due_date || undefined,
          description: metadataForm.description || undefined,
          notes: metadataForm.notes || undefined,
          custom_fields: metadataForm.custom_fields || undefined
        }
      }

      console.log("Saving metadata:", updateData)

      await apiClient.updateDocument(docId, updateData)

      toast.success("Document metadata updated successfully!")
      setIsEditing(false)
      await fetchDocument() // Refresh data
    } catch (error: any) {
      console.error("Failed to save metadata:", error)

      // Handle validation errors specifically
      if (error.response?.status === 400 && error.response?.data?.details) {
        const validationErrors = error.response.data.details
        const errorMessages = validationErrors.map((err: any) => `${err.field}: ${err.message}`).join(', ')
        toast.error(`Validation failed: ${errorMessages}`)
      } else if (error instanceof Error) {
        toast.error(`Failed to save metadata: ${error.message}`)
      } else {
        toast.error("Failed to save metadata. Please check your connection and try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  // Trigger template analysis
  const handleTriggerTemplateAnalysis = async () => {
    try {
      setAnalyzingTemplate(true)

      const { getApiBaseUrl } = await import('@/lib/api-url')
      const API_BASE_URL = getApiBaseUrl()

      const response = await fetch(`${API_BASE_URL}/quality-audits/analyze-templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: documentData?.template_id
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Template analysis started! Check ow /admin/quality/template-improvements in a few minutes.')
      } else {
        toast.error(data.error || 'Failed to trigger analysis')
      }
    } catch (error) {
      toast.error('Failed to trigger template analysis')
    } finally {
      setAnalyzingTemplate(false)
    }
  }

  // Submit feedback
  const handleSubmitFeedback = async () => {
    try {
      // Validate feedback form
      if (!feedbackForm.comment.trim()) {
        toast.error("Please enter a comment")
        return
      }

      if (feedbackForm.rating < 1 || feedbackForm.rating > 5) {
        toast.error("Please select a valid rating")
        return
      }

      // Test feedback endpoint first
      console.log("Testing feedback endpoint...")
      try {
        await apiClient.testFeedbackEndpoint({
          comment: feedbackForm.comment.trim(),
          rating: feedbackForm.rating,
          category: feedbackForm.category
        })
        console.log("Test endpoint working, proceeding with real submission...")
      } catch (testError) {
        console.error("Test endpoint failed:", testError)
        toast.error("Feedback system is not available. Please try again later.")
        return
      }

      // Submit feedback to backend
      console.log("Submitting feedback:", {
        docId,
        feedback: {
          comment: feedbackForm.comment.trim(),
          rating: feedbackForm.rating,
          category: feedbackForm.category
        }
      })

      const response = await apiClient.submitDocumentFeedback(docId, {
        comment: feedbackForm.comment.trim(),
        rating: feedbackForm.rating,
        category: feedbackForm.category
      })

      console.log("Feedback response:", response)

      if (response.success) {
        // Update local documentData state with the new feedback
        if (documentData) {
          const updatedDocument = {
            ...documentData,
            metadata: {
              ...documentData.metadata,
              stakeholder_feedback: [
                ...(documentData.metadata?.stakeholder_feedback || []),
                response.feedback
              ]
            }
          }
          setDocumentData(updatedDocument)
        }

        toast.success("Feedback submitted successfully!")
        setFeedbackDialogOpen(false)
        setFeedbackForm({
          comment: "",
          rating: 5,
          category: "general"
        })
      } else {
        toast.error("Failed to submit feedback")
      }
    } catch (error: any) {
      console.error("Failed to submit feedback:", error)

      // Handle specific error cases
      if (error.response?.status === 400) {
        toast.error(`Validation error: ${error.response.data?.error || "Invalid feedback data"}`)
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to submit feedback for this documentData")
      } else if (error.response?.status === 404) {
        toast.error("Document not found")
      } else {
        toast.error("Failed to submit feedback. Please try again.")
      }
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
      case "approved":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "review":
        return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
      case "draft":
        return "bg-gradient-to-r from-gray-500 to-slate-500 text-white"
      case "failed":
        return "bg-gradient-to-r from-red-500 to-rose-500 text-white"
      default:
        return "bg-gradient-to-r from-slate-500 to-gray-500 text-white"
    }
  }

  // Handle documentData regeneration
  const handleRegenerate = async (params: {
    templateId?: string
    provider: string
    model?: string
    versionType: 'patch' | 'minor' | 'major'
    temperature: number
    max_tokens?: number
  }) => {
    if (!docId) return

    try {
      await regenerate({
        documentId: docId,
        ...params
      })
    } catch (error) {
      console.error('Regeneration failed:', error)
    }
  }

  // Refresh documentData when regeneration completes
  useEffect(() => {
    if (result) {
      void fetchDocument()
    }
  }, [result])

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Load data on component mount
  useEffect(() => {
    let isMounted = true

    if (!isAuthenticated) {
      console.log('[METADATA-PAGE] Not authenticated, skipping data fetch')
      setLoading(false)
      return
    }

    if (!docId || !projectId) {
      console.warn('[METADATA-PAGE] Missing required data:', { isAuthenticated, docId, projectId })
      setLoading(false)
      toast.error("Missing documentData or project ID. Please check the URL and try again.")
      return
    }

    console.log('[METADATA-PAGE] useEffect triggered - fetching data:', { docId, projectId, isAuthenticated })
    setLoading(true)

    Promise.all([fetchDocument(), fetchProject(), fetchTemplates(), fetchQualityAudit()]).then(() => {
      if (isMounted) {
        setLoading(false)
        console.log('[METADATA-PAGE] All data loaded successfully')
      }
    }).catch((error) => {
      if (isMounted) {
        console.error('[METADATA-PAGE] Error loading data:', error)
        setLoading(false)
        const errorMessage = error instanceof Error ? error.message : "Failed to load documentData metadata"
        toast.error(errorMessage || "Failed to load documentData metadata. Please try refreshing the page.")
      }
    })

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, docId, projectId])

  // Cleanup timeout on unmount to prevent stale state updates
  useEffect(() => {
    return () => {
      if (qualityAuditTimeoutRef.current) {
        clearTimeout(qualityAuditTimeoutRef.current)
        qualityAuditTimeoutRef.current = null
      }
    }
  }, [])

  // Update template category when templates are loaded or documentData template changes
  useEffect(() => {
    if (documentData?.template_id && templates.length > 0) {
      fetchTemplateCategory(documentData.template_id)
    }
  }, [documentData?.template_id, templates])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access documentData metadata.</p>
        </div>
      </div>
    )
  }

  // Show error state if documentData failed to load
  if (!loading && !documentData && docId) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Failed to Load Document</h2>
            <p className="text-muted-foreground mb-4">
              Unable to load documentData metadata. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={documentData?.name || documentData?.title || "Document Details"} />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading documentData metadata...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={documentData?.name || documentData?.title || "Document Details"} />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <PageTransition>
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(getProjectDocumentsPath(projectId))}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Documents
                      </Button>
                      <div>
                        <Breadcrumb>
                          <BreadcrumbList>
                            <BreadcrumbItem>
                              <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                              <BreadcrumbLink href={`/projects/${projectId}`}>{project?.name || "Project"}</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                              <BreadcrumbLink href={getProjectDocumentsPath(projectId)}>Documents</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                              <BreadcrumbPage>{documentData?.name || "Document"}</BreadcrumbPage>
                            </BreadcrumbItem>
                          </BreadcrumbList>
                        </Breadcrumb>
                        <h1 className="text-3xl font-bold mt-2">Document Metadata</h1>
                        <p className="text-muted-foreground">
                          Manage documentData metadata, compliance, and stakeholder feedback
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => router.push(getProjectDocumentViewPath(projectId, docId))}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(getProjectDocumentEntitiesPath(projectId, docId))}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        View Entities
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(getProjectDocumentGenUIPath(projectId, docId))}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        GenUI Workspace
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setFeedbackDialogOpen(true)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Start Feedback Session
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {isEditing ? "Cancel Edit" : "Edit Metadata"}
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Document Overview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
                >
                  {/* Document Info */}
                  <AnimatedCard className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>Document Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Document Name</Label>
                          <p className="text-lg font-semibold">{documentData?.name || documentData?.title || "Loading..."}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <div className={getStatusColor(documentData?.status || "draft") + " inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"}>
                            {documentData?.status}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Version</Label>
                          <p className="text-sm">v{documentData?.version}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                          <p className="text-sm">{documentData?.template_name || "No template"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Framework</Label>
                          <p className="text-sm">
                            {documentData?.framework ||
                              documentData?.template_framework ||
                              documentData?.generation_metadata?.framework ||
                              "Not specified"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">File Size</Label>
                          <p className="text-sm">
                            {formatFileSize(
                              documentData?.file_size ||
                              (documentData?.content ? new Blob([documentData.content]).size : 0)
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Word Count</Label>
                          <p className="text-sm">
                            {(
                              documentData?.word_count ||
                              documentData?.generation_metadata?.contentMetrics?.words ||
                              0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                          <p className="text-sm">{new Date(documentData?.updated_at || "").toLocaleDateString()}</p>
                        </div>

                        {/* Custom Metadata Fields - Always Show */}
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                          <p className="text-sm">
                            {templateCategory || documentData?.metadata?.category || <span className="text-muted-foreground italic">Not set</span>}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                          {documentData?.metadata?.priority ? (
                            <Badge variant="outline" className="capitalize">
                              {documentData.metadata.priority}
                            </Badge>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Not set</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Author</Label>
                          <p className="text-sm">
                            {documentData?.created_by_name || documentData?.metadata?.author || documentData?.created_by || <span className="text-muted-foreground italic">Not set</span>}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Reviewers</Label>
                          {signatureRecipients.length > 0 ? (
                            <div className="space-y-1 mt-1">
                              {signatureRecipients.map((recipient: any, index: number) => (
                                <div key={recipient.id || index} className="flex items-center space-x-2">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <p className="text-sm">
                                    {recipient.name || recipient.email}
                                    {recipient.signed_at && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({new Date(recipient.signed_at).toLocaleDateString()})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No reviewers yet</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                          <p className="text-sm">
                            {documentData?.metadata?.due_date
                              ? new Date(documentData.metadata.due_date).toLocaleDateString()
                              : <span className="text-muted-foreground italic">Not set</span>}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                          {documentData?.tags && documentData.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {documentData.tags.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No tags</p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {documentData?.metadata?.description || <span className="italic">No description</span>}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {documentData?.metadata?.notes || <span className="italic">No notes</span>}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  {/* Quick Actions */}
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>Quick Actions</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => router.push(getDocumentSignPath(docId))}
                      >
                        <FileSignature className="h-4 w-4 mr-2" />
                        Sign Document
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Download Document
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Share className="h-4 w-4 mr-2" />
                        Share Document
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <History className="h-4 w-4 mr-2" />
                        Version History
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowRegenerateModal(true)}
                        disabled={isRegenerating}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create new Version
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleRunQualityAudit}
                        disabled={runningQualityAudit || !documentData}
                      >
                        {runningQualityAudit ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Running Audit...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Run Quality Audit
                          </>
                        )}
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Export Metadata
                      </Button>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>

                {/* Metadata Editing Section */}
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                  >
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Edit className="h-5 w-5" />
                          <span>Edit Document Metadata</span>
                        </CardTitle>
                        <CardDescription>
                          Update documentData metadata, tags, and custom fields
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="doc-name">Document Name</Label>
                              <Input
                                id="doc-name"
                                value={metadataForm.name}
                                onChange={(e) => setMetadataForm({ ...metadataForm, name: e.target.value })}
                                placeholder="Enter documentData name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-status">Status</Label>
                              <Select value={metadataForm.status} onValueChange={(value: string) => setMetadataForm({ ...metadataForm, status: value })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="review">Review</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="published">Published</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="doc-template">Template</Label>
                              <Select value={metadataForm.template_id} onValueChange={(value: string) => setMetadataForm({ ...metadataForm, template_id: value })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name} ({template.framework})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="doc-category">Category</Label>
                              <Select value={metadataForm.category} onValueChange={(value: string) => setMetadataForm({ ...metadataForm, category: value })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Technical Documentation">Technical Documentation</SelectItem>
                                  <SelectItem value="Business Requirements">Business Requirements</SelectItem>
                                  <SelectItem value="Project Charter">Project Charter</SelectItem>
                                  <SelectItem value="Risk Management">Risk Management</SelectItem>
                                  <SelectItem value="Quality Assurance">Quality Assurance</SelectItem>
                                  <SelectItem value="Architecture">Architecture</SelectItem>
                                  <SelectItem value="Process Documentation">Process Documentation</SelectItem>
                                  <SelectItem value="Compliance">Compliance</SelectItem>
                                  <SelectItem value="Training Materials">Training Materials</SelectItem>
                                  <SelectItem value="User Guides">User Guides</SelectItem>
                                  <SelectItem value="API Documentation">API Documentation</SelectItem>
                                  <SelectItem value="System Design">System Design</SelectItem>
                                  <SelectItem value="Test Plans">Test Plans</SelectItem>
                                  <SelectItem value="Change Management">Change Management</SelectItem>
                                  <SelectItem value="Security Documentation">Security Documentation</SelectItem>
                                  <SelectItem value="Data Management">Data Management</SelectItem>
                                  <SelectItem value="Integration Guides">Integration Guides</SelectItem>
                                  <SelectItem value="Deployment Guides">Deployment Guides</SelectItem>
                                  <SelectItem value="Maintenance Procedures">Maintenance Procedures</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="doc-priority">Priority</Label>
                              <Select value={metadataForm.priority} onValueChange={(value: string) => setMetadataForm({ ...metadataForm, priority: value })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="doc-author">Author</Label>
                              <Input
                                id="doc-author"
                                value={metadataForm.author}
                                onChange={(e) => setMetadataForm({ ...metadataForm, author: e.target.value })}
                                placeholder="Enter author"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-reviewer">Reviewer</Label>
                              <Input
                                id="doc-reviewer"
                                value={metadataForm.reviewer}
                                onChange={(e) => setMetadataForm({ ...metadataForm, reviewer: e.target.value })}
                                placeholder="Enter reviewer"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-due-date">Due Date</Label>
                              <Input
                                id="doc-due-date"
                                type="date"
                                value={metadataForm.due_date}
                                onChange={(e) => setMetadataForm({ ...metadataForm, due_date: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-tags">Tags</Label>
                              <Input
                                id="doc-tags"
                                value={metadataForm.tags.join(", ")}
                                onChange={(e) => setMetadataForm({ ...metadataForm, tags: e.target.value.split(", ").filter(tag => tag.trim()) })}
                                placeholder="Enter tags separated by commas"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-description">Description</Label>
                              <Textarea
                                id="doc-description"
                                value={metadataForm.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMetadataForm({ ...metadataForm, description: e.target.value })}
                                placeholder="Enter documentData description"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-6">
                          <Label htmlFor="doc-notes">Notes</Label>
                          <Textarea
                            id="doc-notes"
                            value={metadataForm.notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMetadataForm({ ...metadataForm, notes: e.target.value })}
                            placeholder="Enter additional notes"
                            rows={4}
                          />
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveMetadata} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Save className="h-4 w-4 mr-2" />
                            Save Metadata
                          </Button>
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}

                {/* Metadata Display Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* AI Processing Metrics */}
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Brain className="h-5 w-5" />
                        <span>AI Processing Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">AI Model</span>
                          <span className="text-sm font-medium">
                            {documentData?.generation_metadata?.aiProcessing?.provider && documentData?.generation_metadata?.aiProcessing?.model
                              ? `${documentData.generation_metadata.aiProcessing.provider} - ${documentData.generation_metadata.aiProcessing.model}`
                              : documentData?.metadata?.ai_model || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Processing Time</span>
                          <span className="text-sm font-medium">
                            {(() => {
                              // Try formatted version first
                              const formatted = documentData?.generation_metadata?.aiProcessing?.processingTime ||
                                documentData?.generation_metadata?.generation?.durationFormatted
                              if (formatted) return formatted

                              // Fall back to raw milliseconds and format
                              const rawMs = documentData?.generation_metadata?.aiProcessing?.processingTimeMs ||
                                documentData?.generation_metadata?.generation?.duration ||
                                documentData?.metadata?.processing_time

                              if (typeof rawMs === 'number' && rawMs > 0) {
                                return (rawMs / 1000).toFixed(1) + 's'
                              }

                              return "N/A"
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Compression Ratio</span>
                          <span className="text-sm font-medium">{documentData?.metadata?.compression_ratio || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Tokens Used</span>
                          <span className="text-sm font-medium">
                            {documentData?.generation_metadata?.aiProcessing?.tokens?.total || documentData?.metadata?.generation_stats?.tokens_used?.toLocaleString() || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Generation Cost</span>
                          <span className="text-sm font-medium">
                            {documentData?.generation_metadata?.aiProcessing?.tokens?.cost || `$${documentData?.metadata?.generation_stats?.cost || "0.00"}`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  {/* Content Metrics */}
                  {(documentData?.generation_metadata?.contentMetrics || documentData?.word_count) && (
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>Content Metrics</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(() => {
                            // Extract raw word count (handle both number and formatted string)
                            let wordCount = 0

                            // Priority 1: Use raw word_count from top-level column
                            if (documentData?.word_count) {
                              wordCount = documentData.word_count
                            }
                            // Priority 2: Use generation_metadata.wordCount if available
                            else if (documentData?.generation_metadata?.wordCount) {
                              wordCount = documentData.generation_metadata.wordCount
                            }
                            // Priority 3: Parse contentMetrics.words (formatted string)
                            else if (documentData?.generation_metadata?.contentMetrics) {
                              const wordsValue = documentData.generation_metadata.contentMetrics.words;
                              wordCount = typeof wordsValue === 'string'
                                ? (parseInt(wordsValue.replace(/[,\\.]/g, ''), 10) || 0)
                                : (typeof wordsValue === 'number' ? wordsValue : 0);
                            }

                            const readingTimeMinutes = wordCount > 0 ? Math.round((wordCount / 250) * 10) / 10 : 0

                            return (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Word Count:</span>
                                  <span className="text-sm font-medium">
                                    {wordCount > 0 ? wordCount.toLocaleString('en-US') : "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Characters:</span>
                                  <span className="text-sm font-medium">
                                    {(() => {
                                      let charCount = 0
                                      // Priority 1: Use raw character_count from top-level column
                                      if (documentData?.character_count) {
                                        charCount = documentData.character_count
                                      }
                                      // Priority 2: Use generation_metadata.characterCount if available
                                      else if (documentData?.generation_metadata?.characterCount) {
                                        charCount = documentData.generation_metadata.characterCount
                                      }
                                      // Priority 3: Parse contentMetrics.characters (formatted string)
                                      else if (documentData?.generation_metadata?.contentMetrics?.characters) {
                                        const charsValue = documentData.generation_metadata.contentMetrics.characters
                                        if (typeof charsValue === 'string') {
                                          // Remove both commas AND periods as thousands separators
                                          charCount = parseInt(charsValue.replace(/[,\.]/g, ''), 10) || 0
                                        } else {
                                          charCount = charsValue
                                        }
                                      }
                                      return charCount > 0 ? charCount.toLocaleString('en-US') : "N/A"
                                    })()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Sentences:</span>
                                  <span className="text-sm font-medium">
                                    {(() => {
                                      // Priority 1: Use raw sentence_count from top-level column
                                      const sentenceCount = documentData?.sentence_count ||
                                        documentData?.generation_metadata?.contentMetrics?.sentences ||
                                        0
                                      return sentenceCount > 0 ? sentenceCount.toLocaleString('en-US') : "N/A"
                                    })()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Paragraphs:</span>
                                  <span className="text-sm font-medium">
                                    {(() => {
                                      // Priority 1: Use raw paragraph_count from top-level column
                                      const paragraphCount = documentData?.paragraph_count ||
                                        documentData?.generation_metadata?.contentMetrics?.paragraphs ||
                                        0
                                      return paragraphCount > 0 ? paragraphCount.toLocaleString('en-US') : "N/A"
                                    })()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Avg Words/Sentence:</span>
                                  <span className="text-sm font-medium">
                                    {(() => {
                                      // Try generation_metadata first (most accurate)
                                      const avgFromMeta = documentData?.generation_metadata?.contentMetrics?.avgWordsPerSentence
                                      if (avgFromMeta) return avgFromMeta

                                      // Calculate from actual values as fallback
                                      const wc = documentData?.word_count ||
                                        documentData?.generation_metadata?.contentMetrics?.words ||
                                        0
                                      const sc = documentData?.sentence_count ||
                                        documentData?.generation_metadata?.contentMetrics?.sentences ||
                                        0
                                      const avg = (wc > 0 && sc > 0) ? Math.round(wc / sc) : null
                                      return avg ? avg : "N/A"
                                    })()}
                                  </span>
                                </div>

                                {/* Reading Time */}
                                {wordCount > 0 && (
                                  <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-sm font-medium text-muted-foreground">⏱️ Reading Time:</span>
                                    <span className="text-sm font-bold text-primary">
                                      ~{readingTimeMinutes} min ({Math.round(readingTimeMinutes / 60 * 10) / 10} hours)
                                    </span>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  )}

                  {/* Quality Gates Section */}
                  {(() => {
                    const qualityGates = documentData?.generation_metadata?.quality_gate_results ||
                      documentData?.generation_metadata?.quality_gates || []
                    const euAIActGate = qualityGates.find((gate: any) =>
                      gate.gate_id === 'EU_AI_ACT_COMPLIANCE_GATE' ||
                      gate.gate_name?.includes('EU AI Act')
                    )

                    if (qualityGates.length > 0 || euAIActGate) {
                      return (
                        <AnimatedCard>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <ShieldCheck className="h-5 w-5" />
                              <span>Quality Gates</span>
                            </CardTitle>
                            <CardDescription>
                              Quality gate validation results from documentData generation
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* EU AI Act Quality Gate */}
                              {euAIActGate && (
                                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-blue-600 text-white text-xs">EU AI Act</Badge>
                                      <span className="text-sm font-semibold">EU AI Act Compliance Gate</span>
                                    </div>
                                    {euAIActGate.passed ? (
                                      <Badge className="bg-green-500 text-white text-xs">✓ Passed</Badge>
                                    ) : (
                                      <Badge className="bg-red-500 text-white text-xs">✗ Failed</Badge>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">Overall Score</span>
                                      <div className="flex items-center space-x-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full ${(euAIActGate.score || 0) >= 75 ? 'bg-green-500' :
                                                (euAIActGate.score || 0) >= 60 ? 'bg-yellow-500' :
                                                  'bg-red-500'
                                              }`}
                                            style={{ width: `${euAIActGate.score || 0}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">{euAIActGate.score || 0}%</span>
                                      </div>
                                    </div>

                                    {euAIActGate.criteria_results && euAIActGate.criteria_results.length > 0 && (
                                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                        {euAIActGate.criteria_results.map((criterion: any, idx: number) => {
                                          const criterionName = criterion.criterion_id?.includes('TRANSPARENCY') ? 'Transparency' :
                                            criterion.criterion_id?.includes('HUMAN_OVERSIGHT') ? 'Human Oversight' :
                                              criterion.criterion_id?.includes('ACCURACY') ? 'Accuracy' :
                                                criterion.criterion_id?.includes('DATA_GOVERNANCE') ? 'Data Governance' :
                                                  criterion.criterion_id?.includes('RECORD_KEEPING') ? 'Record Keeping' :
                                                    criterion.criterion_name || 'Unknown'

                                          return (
                                            <div key={idx} className="flex justify-between">
                                              <span className="text-muted-foreground">{criterionName}:</span>
                                              <span className={`font-medium ${criterion.passed !== false ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {criterion.score || 0}%
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}

                                    {euAIActGate.message && (
                                      <p className="text-xs text-muted-foreground mt-2 italic">
                                        {euAIActGate.message}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Other Quality Gates */}
                              {qualityGates.filter((gate: any) =>
                                gate.gate_id !== 'EU_AI_ACT_COMPLIANCE_GATE' &&
                                !gate.gate_name?.includes('EU AI Act')
                              ).map((gate: any, idx: number) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{gate.gate_name || gate.gate_id || 'Quality Gate'}</span>
                                    {gate.passed ? (
                                      <Badge className="bg-green-500 text-white text-xs">✓ Passed</Badge>
                                    ) : (
                                      <Badge className="bg-red-500 text-white text-xs">✗ Failed</Badge>
                                    )}
                                  </div>
                                  {gate.score !== undefined && (
                                    <div className="mt-2 flex items-center space-x-2">
                                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full ${gate.score >= 80 ? 'bg-green-500' :
                                              gate.score >= 60 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                            }`}
                                          style={{ width: `${gate.score}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground">{gate.score}%</span>
                                    </div>
                                  )}
                                  {gate.message && (
                                    <p className="text-xs text-muted-foreground mt-1">{gate.message}</p>
                                  )}
                                </div>
                              ))}

                              {qualityGates.length === 0 && !euAIActGate && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No quality gates available for this documentData
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </AnimatedCard>
                      )
                    }
                    return null
                  })()}

                  {/* Quality Audit Results */}
                  {qualityAudit && (
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="h-5 w-5" />
                            <span>Quality Audit</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowQualityAuditModal(true)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Full Report
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Overall Score */}
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className={`text-4xl font-bold ${qualityAudit.overall_score >= 90 ? 'text-green-600' :
                                qualityAudit.overall_score >= 80 ? 'text-blue-600' :
                                  qualityAudit.overall_score >= 70 ? 'text-yellow-600' :
                                    qualityAudit.overall_score >= 60 ? 'text-orange-600' :
                                      'text-red-600'
                              }`}>
                              {qualityAudit.overall_score}%
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-2">
                              <Badge className={`${qualityAudit.overall_grade === 'A' ? 'bg-green-500' :
                                  qualityAudit.overall_grade === 'B' ? 'bg-blue-500' :
                                    qualityAudit.overall_grade === 'C' ? 'bg-yellow-500' :
                                      qualityAudit.overall_grade === 'D' ? 'bg-orange-500' :
                                        'bg-red-500'
                                } text-white`}>
                                Grade {qualityAudit.overall_grade}
                              </Badge>
                              <span className="text-sm text-gray-600">{qualityAudit.quality_level}</span>
                            </div>
                          </div>

                          {/* Key Dimensions */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Completeness</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${qualityAudit.completeness_score >= 90 ? 'bg-green-500' :
                                        qualityAudit.completeness_score >= 80 ? 'bg-blue-500' :
                                          qualityAudit.completeness_score >= 70 ? 'bg-yellow-500' :
                                            'bg-orange-500'
                                      }`}
                                    style={{ width: `${qualityAudit.completeness_score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-12 text-right">{qualityAudit.completeness_score}%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Consistency</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${qualityAudit.consistency_score >= 90 ? 'bg-green-500' :
                                        qualityAudit.consistency_score >= 80 ? 'bg-blue-500' :
                                          qualityAudit.consistency_score >= 70 ? 'bg-yellow-500' :
                                            'bg-orange-500'
                                      }`}
                                    style={{ width: `${qualityAudit.consistency_score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-12 text-right">{qualityAudit.consistency_score}%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Standards Compliance</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${qualityAudit.standards_compliance_score >= 90 ? 'bg-green-500' :
                                        qualityAudit.standards_compliance_score >= 80 ? 'bg-blue-500' :
                                          qualityAudit.standards_compliance_score >= 70 ? 'bg-yellow-500' :
                                            'bg-orange-500'
                                      }`}
                                    style={{ width: `${qualityAudit.standards_compliance_score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-12 text-right">{qualityAudit.standards_compliance_score}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Compliance Metrics Summary */}
                          {qualityAudit.compliance_metrics && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-muted-foreground mb-2">Compliance Rating</div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Overall Compliance</span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${qualityAudit.compliance_metrics.overallComplianceRating >= 90 ? 'bg-green-500' :
                                            qualityAudit.compliance_metrics.overallComplianceRating >= 80 ? 'bg-blue-500' :
                                              qualityAudit.compliance_metrics.overallComplianceRating >= 70 ? 'bg-yellow-500' :
                                                'bg-orange-500'
                                          }`}
                                        style={{ width: `${qualityAudit.compliance_metrics.overallComplianceRating}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium w-12 text-right">{qualityAudit.compliance_metrics.overallComplianceRating}%</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">PMBOK:</span>
                                    <span className="font-medium">{qualityAudit.compliance_metrics.pmbokGuide}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">GDPR:</span>
                                    <span className="font-medium">{qualityAudit.compliance_metrics.gdpr}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">HIPAA:</span>
                                    <span className="font-medium">{qualityAudit.compliance_metrics.hipaa}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">SOC 2:</span>
                                    <span className="font-medium">{qualityAudit.compliance_metrics.soc2}%</span>
                                  </div>
                                </div>

                                {/* EU AI Act Compliance Section */}
                                {qualityAudit.compliance_metrics.euAIAct && (
                                  <>
                                    <Separator className="my-3" />
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-blue-600 text-white text-xs">EU AI Act</Badge>
                                        <span className="text-sm font-semibold">EU AI Act Compliance</span>
                                        {qualityAudit.compliance_metrics.euAIAct.passed ? (
                                          <Badge className="bg-green-500 text-white text-xs">✓ Passed</Badge>
                                        ) : (
                                          <Badge className="bg-red-500 text-white text-xs">✗ Failed</Badge>
                                        )}
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Overall Score</span>
                                        <div className="flex items-center space-x-2">
                                          <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full ${qualityAudit.compliance_metrics.euAIAct.overallScore >= 75 ? 'bg-green-500' :
                                                  qualityAudit.compliance_metrics.euAIAct.overallScore >= 60 ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`}
                                              style={{ width: `${qualityAudit.compliance_metrics.euAIAct.overallScore}%` }}
                                            />
                                          </div>
                                          <span className="text-sm font-medium w-12 text-right">{qualityAudit.compliance_metrics.euAIAct.overallScore}%</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Transparency:</span>
                                          <span className={`font-medium ${qualityAudit.compliance_metrics.euAIAct.criteria.transparency.passed ? 'text-green-600' : 'text-red-600'}`}>
                                            {qualityAudit.compliance_metrics.euAIAct.criteria.transparency.score}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Human Oversight:</span>
                                          <span className={`font-medium ${qualityAudit.compliance_metrics.euAIAct.criteria.humanOversight.passed ? 'text-green-600' : 'text-red-600'}`}>
                                            {qualityAudit.compliance_metrics.euAIAct.criteria.humanOversight.score}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Accuracy:</span>
                                          <span className={`font-medium ${qualityAudit.compliance_metrics.euAIAct.criteria.accuracy.passed ? 'text-green-600' : 'text-red-600'}`}>
                                            {qualityAudit.compliance_metrics.euAIAct.criteria.accuracy.score}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Data Governance:</span>
                                          <span className={`font-medium ${qualityAudit.compliance_metrics.euAIAct.criteria.dataGovernance.passed ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {qualityAudit.compliance_metrics.euAIAct.criteria.dataGovernance.score}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Record Keeping:</span>
                                          <span className={`font-medium ${qualityAudit.compliance_metrics.euAIAct.criteria.recordKeeping.passed ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {qualityAudit.compliance_metrics.euAIAct.criteria.recordKeeping.score}%
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2 italic">
                                        View full EU AI Act compliance matrix in the Quality Audit Report
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}

                          {/* Issues Count */}
                          {qualityAudit.issues && qualityAudit.issues.length > 0 && (
                            <>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Issues Found</span>
                                <Badge variant="destructive">{qualityAudit.issues.length}</Badge>
                              </div>
                            </>
                          )}

                          {/* Audit Date */}
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            Audited: {new Date(qualityAudit.audited_at).toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  )}

                  {/* Quality Metrics */}
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Quality Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Overall Quality Score */}
                        {(() => {
                          // Debug: Log quality metrics to console
                          if (documentData?.generation_metadata?.qualityMetrics) {
                            console.log('📊 Quality Metrics from metadata:', documentData.generation_metadata.qualityMetrics)
                          }

                          const overallQuality = documentData?.generation_metadata?.qualityMetrics?.overallQuality ||
                            documentData?.metadata?.quality_score ||
                            0
                          return (
                            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
                              <span className="text-sm font-semibold">Overall Quality Score</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-2xl font-bold text-purple-600">
                                  {overallQuality}%
                                </span>
                                {(() => {
                                  if (overallQuality >= 90) return <span className="text-xs font-semibold text-green-600 ml-2">A (Excellent)</span>
                                  if (overallQuality >= 80) return <span className="text-xs font-semibold text-blue-600 ml-2">B (Good)</span>
                                  if (overallQuality >= 70) return <span className="text-xs font-semibold text-yellow-600 ml-2">C (Fair)</span>
                                  if (overallQuality >= 60) return <span className="text-xs font-semibold text-orange-600 ml-2">D (Poor)</span>
                                  if (overallQuality > 0) return <span className="text-xs font-semibold text-red-600 ml-2">F (Needs Improvement)</span>
                                  return null
                                })()}
                              </div>
                            </div>
                          )
                        })()}

                        <Separator />

                        {/* All 9 Quality Dimensions */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Completeness</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.completeness || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.completeness || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Structure</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.structureScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.structureScore || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Formatting & Style</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-orange-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.formattingScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.formattingScore || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Content Depth</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.contentDepth || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.contentDepth || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Accuracy</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.accuracy || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.accuracy || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Consistency</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-teal-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.consistency || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.consistency || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Context Relevance</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-cyan-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.contextRelevance || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.contextRelevance || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Professional Quality</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-pink-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.professionalQuality || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.professionalQuality || 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Standards Compliance</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-emerald-600 h-2 rounded-full"
                                style={{ width: `${documentData?.generation_metadata?.qualityMetrics?.standardsCompliance || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{documentData?.generation_metadata?.qualityMetrics?.standardsCompliance || 0}%</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          {(() => {
                            // Calculate complexity score for display (same logic as below)
                            // Handle both snake_case (source_documentDatas) and camelCase (sourceDocuments) for backward compatibility
                            const sourceDocuments = documentData?.generation_metadata?.source_documentDatas || documentData?.generation_metadata?.sourceDocuments || []
                            const wordCount = documentData?.generation_metadata?.contentMetrics?.words || 0
                            const paragraphs = documentData?.generation_metadata?.contentMetrics?.paragraphs || 0
                            const framework = documentData?.generation_metadata?.framework || documentData?.template_framework
                            const overallQuality = documentData?.generation_metadata?.qualityMetrics?.overallQuality || 0

                            let complexity = 0
                            if (wordCount > 5000) complexity += 30
                            else if (wordCount > 3000) complexity += 25
                            else if (wordCount > 1500) complexity += 20
                            else if (wordCount > 800) complexity += 15
                            else complexity += 10

                            const avgWordsPerParagraph = paragraphs > 0 ? wordCount / paragraphs : 0
                            if (avgWordsPerParagraph > 100) complexity += 25
                            else if (avgWordsPerParagraph > 70) complexity += 20
                            else if (avgWordsPerParagraph > 50) complexity += 15
                            else complexity += 10

                            if (sourceDocuments.length > 10) complexity += 20
                            else if (sourceDocuments.length > 5) complexity += 15
                            else if (sourceDocuments.length > 3) complexity += 10
                            else if (sourceDocuments.length > 0) complexity += 5

                            if (framework && framework !== 'Not specified') complexity += 15

                            if (overallQuality > 85) complexity += 10
                            else if (overallQuality > 70) complexity += 7
                            else if (overallQuality > 50) complexity += 5

                            complexity = Math.min(100, Math.max(0, complexity))

                            return (
                              <div className="flex justify-between items-center p-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                                <span className="text-sm font-semibold text-red-700">Complexity Score</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-red-600 h-2 rounded-full"
                                      style={{ width: `${complexity}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-bold text-red-700">{complexity}%</span>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Complexity Time Estimate with Research Breakdown */}
                          {(() => {
                            // Get source documentDatas from generation_metadata
                            // Handle both snake_case (source_documentDatas) and camelCase (sourceDocuments) for backward compatibility
                            const sourceDocuments = documentData?.generation_metadata?.source_documentDatas || documentData?.generation_metadata?.sourceDocuments || []
                            const sourceDocCount = sourceDocuments.length

                            // Calculate total words in source documentDatas
                            const totalSourceWords = sourceDocuments.reduce((sum: number, doc: any) => {
                              // Estimate words from tokens (1 token ≈ 0.75 words)
                              const estimatedWords = Math.round((doc.originalTokens || 0) * 0.75)
                              return sum + estimatedWords
                            }, 0)

                            // Calculate reading time (250 words/min average)
                            const readingTimeMinutes = Math.round(totalSourceWords / 250)
                            const readingTimeHours = Math.round(readingTimeMinutes / 60 * 10) / 10

                            // Get generated documentData metrics
                            const wordCount = documentData?.generation_metadata?.contentMetrics?.words || 0
                            const sentences = documentData?.generation_metadata?.contentMetrics?.sentences || 0
                            const paragraphs = documentData?.generation_metadata?.contentMetrics?.paragraphs || 0

                            // Calculate complexity score based on documentData characteristics
                            let complexity = 0

                            // Base complexity from word count (0-30 points)
                            if (wordCount > 5000) complexity += 30
                            else if (wordCount > 3000) complexity += 25
                            else if (wordCount > 1500) complexity += 20
                            else if (wordCount > 800) complexity += 15
                            else complexity += 10

                            // Structure complexity (0-25 points)
                            const avgWordsPerParagraph = paragraphs > 0 ? wordCount / paragraphs : 0
                            if (avgWordsPerParagraph > 100) complexity += 25 // Very long paragraphs = complex
                            else if (avgWordsPerParagraph > 70) complexity += 20
                            else if (avgWordsPerParagraph > 50) complexity += 15
                            else complexity += 10

                            // Source documentData complexity (0-20 points)
                            if (sourceDocCount > 10) complexity += 20
                            else if (sourceDocCount > 5) complexity += 15
                            else if (sourceDocCount > 3) complexity += 10
                            else if (sourceDocCount > 0) complexity += 5

                            // Framework compliance adds complexity (0-15 points)
                            const framework = documentData?.generation_metadata?.framework || documentData?.template_framework
                            if (framework && framework !== 'Not specified') complexity += 15

                            // Quality metrics contribution (0-10 points)
                            const overallQuality = documentData?.generation_metadata?.qualityMetrics?.overallQuality || 0
                            if (overallQuality > 85) complexity += 10
                            else if (overallQuality > 70) complexity += 7
                            else if (overallQuality > 50) complexity += 5

                            // Ensure complexity is 0-100
                            complexity = Math.min(100, Math.max(0, complexity))

                            // Determine complexity level and writing time estimate
                            let level = 'Simple'
                            let writingTimeMin = 2
                            let writingTimeMax = 4
                            let color = 'text-green-600'
                            let bgColor = 'bg-green-50'
                            let borderColor = 'border-green-200'

                            if (complexity >= 76) {
                              level = 'Very Complex'
                              writingTimeMin = 16
                              writingTimeMax = 32
                              color = 'text-red-600'
                              bgColor = 'bg-red-50'
                              borderColor = 'border-red-200'
                            } else if (complexity >= 51) {
                              level = 'Complex'
                              writingTimeMin = 8
                              writingTimeMax = 16
                              color = 'text-orange-600'
                              bgColor = 'bg-orange-50'
                              borderColor = 'border-orange-200'
                            } else if (complexity >= 26) {
                              level = 'Moderate'
                              writingTimeMin = 4
                              writingTimeMax = 8
                              color = 'text-yellow-600'
                              bgColor = 'bg-yellow-50'
                              borderColor = 'border-yellow-200'
                            }

                            const writingTime = writingTimeMax >= 16
                              ? `${writingTimeMin / 8}-${writingTimeMax / 8} days (${writingTimeMin}-${writingTimeMax} hours)`
                              : `${writingTimeMin}-${writingTimeMax} hours`

                            // Format reading time display
                            const readingTimeDisplay = readingTimeHours >= 8
                              ? `${Math.round(readingTimeHours / 8 * 10) / 10} day${readingTimeHours >= 16 ? 's' : ''}`
                              : `${readingTimeHours} hour${readingTimeHours !== 1 ? 's' : ''}`

                            // Calculate total manual effort
                            const totalManualHours = readingTimeHours + (writingTimeMin + writingTimeMax) / 2
                            const totalManualDisplay = totalManualHours >= 8
                              ? `${Math.round(totalManualHours / 8 * 10) / 10} days`
                              : `${Math.round(totalManualHours * 10) / 10} hours`

                            return (
                              <div className={`p-3 ${bgColor} rounded-lg border ${borderColor}`}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs text-muted-foreground">Complexity Level:</span>
                                  <span className={`text-sm font-semibold ${color}`}>{level}</span>
                                </div>

                                {sourceDocCount > 0 && (
                                  <>
                                    <Separator className="my-2" />
                                    <div className="space-y-2 mb-2">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">📚 Context Research:</span>
                                        <span className={`font-medium ${color}`}>
                                          {sourceDocCount} doc{sourceDocCount !== 1 ? 's' : ''} (~{readingTimeDisplay})
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">✍️ Writing Time:</span>
                                        <span className={`font-medium ${color}`}>{writingTime}</span>
                                      </div>
                                    </div>
                                  </>
                                )}

                                <Separator className="my-2" />
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-muted-foreground">Total Manual Effort:</span>
                                  <span className={`text-sm font-bold ${color}`}>{totalManualDisplay}</span>
                                </div>

                                {(() => {
                                  // Get AI generation time (formatted)
                                  const aiTime = documentData?.generation_metadata?.aiProcessing?.processingTime ||
                                    documentData?.generation_metadata?.generation?.durationFormatted

                                  // Get raw milliseconds for speedup calculation
                                  const aiTimeMs = documentData?.generation_metadata?.aiProcessing?.processingTimeMs ||
                                    documentData?.generation_metadata?.generation?.duration || 0

                                  if (aiTime || aiTimeMs) {
                                    const displayTime = aiTime || (aiTimeMs > 0 ? `${(aiTimeMs / 1000).toFixed(1)}s` : 'N/A')

                                    // Calculate speedup
                                    const aiHours = aiTimeMs / 1000 / 60 / 60
                                    const speedup = totalManualHours > 0 && aiHours > 0
                                      ? Math.round(totalManualHours / aiHours)
                                      : 0

                                    return (
                                      <div className="mt-2 pt-2 border-t space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-muted-foreground">⚡ AI Generation Time:</span>
                                          <span className="font-bold text-green-600">{displayTime}</span>
                                        </div>
                                        {speedup > 0 && (
                                          <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground">🚀 Productivity Gain:</span>
                                            <span className="font-bold text-blue-600">{speedup}x faster</span>
                                          </div>
                                        )}
                                        {totalManualHours > 0 && (
                                          <>
                                            <div className="text-xs text-muted-foreground italic mt-1">
                                              💰 Saved ~{Math.round(totalManualHours * 10) / 10} hours of expert time
                                            </div>
                                            {(() => {
                                              // Get reading time from content metrics
                                              const readingTimeMin = documentData?.generation_metadata?.contentMetrics?.readingTime ||
                                                Math.ceil(wordCount / 250)
                                              const readingTimeDisplay = readingTimeMin >= 60
                                                ? `${Math.round(readingTimeMin / 60 * 10) / 10} hours`
                                                : `${readingTimeMin} minutes`

                                              const roi = Math.round((totalManualHours * 60) / readingTimeMin)

                                              return (
                                                <div className="text-xs font-medium text-purple-600 mt-1">
                                                  📖 Result reading time: ~{readingTimeDisplay}
                                                  {roi > 0 && (
                                                    <span className="ml-1 text-purple-500">
                                                      ({roi}x ROI)
                                                    </span>
                                                  )}
                                                </div>
                                              )
                                            })()}
                                          </>
                                        )}
                                      </div>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  {/* Compliance Metrics */}
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span>Compliance Metrics</span>
                      </CardTitle>
                      <CardDescription>
                        Framework adherence and regulatory compliance tracking
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        // Get compliance data from quality metrics
                        const standardsScore = documentData?.generation_metadata?.qualityMetrics?.standardsCompliance || 0
                        const overallQuality = documentData?.generation_metadata?.qualityMetrics?.overallQuality || 0
                        const framework = documentData?.template_framework || documentData?.generation_metadata?.template?.framework || 'PMBOK'
                        const documentDataType = documentData?.template_name || documentData?.name || ''

                        // Determine framework compliance
                        const isPMBOK = framework.toUpperCase().includes('PMBOK')
                        const isBABOK = framework.toUpperCase().includes('BABOK')
                        const isDMBOK = framework.toUpperCase().includes('DMBOK')

                        // Determine regulatory applicability based on documentData type and content
                        const hasPersonalData = documentDataType.toLowerCase().includes('stakeholder') ||
                          documentDataType.toLowerCase().includes('hr') ||
                          documentDataType.toLowerCase().includes('resource')
                        const hasHealthData = documentDataType.toLowerCase().includes('health') ||
                          documentDataType.toLowerCase().includes('medical')
                        const hasSecurityControls = documentDataType.toLowerCase().includes('security') ||
                          documentDataType.toLowerCase().includes('risk') ||
                          documentDataType.toLowerCase().includes('compliance')

                        return (
                          <div className="space-y-6">
                            {/* Framework Compliance */}
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <span className="text-blue-600">📚</span> Framework Adherence
                              </h4>
                              <div className="space-y-3">
                                {isPMBOK && (
                                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div>
                                      <p className="text-sm font-medium text-blue-900">PMBOK Guide</p>
                                      <p className="text-xs text-blue-600">Project Management Body of Knowledge</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-2xl font-bold text-blue-600">{standardsScore}%</div>
                                      <div className="text-xs text-blue-500">
                                        {standardsScore >= 90 ? '✅ Excellent' : standardsScore >= 80 ? '✅ Good' : standardsScore >= 70 ? '⚠️ Fair' : '❌ Poor'}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {isBABOK && (
                                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div>
                                      <p className="text-sm font-medium text-green-900">BABOK Guide v3</p>
                                      <p className="text-xs text-green-600">Business Analysis Body of Knowledge</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-2xl font-bold text-green-600">{standardsScore}%</div>
                                      <div className="text-xs text-green-500">
                                        {standardsScore >= 90 ? '✅ Excellent' : standardsScore >= 80 ? '✅ Good' : standardsScore >= 70 ? '⚠️ Fair' : '❌ Poor'}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {isDMBOK && (
                                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div>
                                      <p className="text-sm font-medium text-purple-900">DMBOK Framework</p>
                                      <p className="text-xs text-purple-600">Data Management Body of Knowledge</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-2xl font-bold text-purple-600">{standardsScore}%</div>
                                      <div className="text-xs text-purple-500">
                                        {standardsScore >= 90 ? '✅ Excellent' : standardsScore >= 80 ? '✅ Good' : standardsScore >= 70 ? '⚠️ Fair' : '❌ Poor'}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {!isPMBOK && !isBABOK && !isDMBOK && (
                                  <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                    <p className="text-xs text-muted-foreground">No specific framework detected</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <Separator />

                            {/* Regulatory Compliance */}
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <span className="text-amber-600">⚖️</span> Regulatory Adherence
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className={`text-center p-3 rounded border ${hasPersonalData ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                  <p className="text-xs text-muted-foreground mb-1">GDPR</p>
                                  <p className="text-sm font-semibold">
                                    {hasPersonalData ? '✅ Applicable' : '➖ N/A'}
                                  </p>
                                  {hasPersonalData && (
                                    <p className="text-xs text-green-600 mt-1">Data privacy considered</p>
                                  )}
                                </div>

                                <div className={`text-center p-3 rounded border ${hasHealthData ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                  <p className="text-xs text-muted-foreground mb-1">HIPAA</p>
                                  <p className="text-sm font-semibold">
                                    {hasHealthData ? '✅ Applicable' : '➖ N/A'}
                                  </p>
                                  {hasHealthData && (
                                    <p className="text-xs text-green-600 mt-1">Health data protected</p>
                                  )}
                                </div>

                                <div className={`text-center p-3 rounded border ${hasSecurityControls ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                  <p className="text-xs text-muted-foreground mb-1">SOC 2</p>
                                  <p className="text-sm font-semibold">
                                    {hasSecurityControls ? '✅ Applicable' : '➖ N/A'}
                                  </p>
                                  {hasSecurityControls && (
                                    <p className="text-xs text-green-600 mt-1">Controls documentDataed</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Standards & Best Practices */}
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <span className="text-purple-600">🎯</span> Standards Compliance
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded">
                                  <span className="text-sm text-muted-foreground">Industry Standards</span>
                                  <span className="text-sm font-bold text-blue-600">{standardsScore}%</span>
                                </div>

                                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded">
                                  <span className="text-sm text-muted-foreground">Best Practices</span>
                                  <span className="text-sm font-bold text-purple-600">{overallQuality}%</span>
                                </div>

                                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded">
                                  <span className="text-sm text-muted-foreground">Template Adherence</span>
                                  <span className="text-sm font-bold text-green-600">{documentData?.generation_metadata?.qualityMetrics?.structureScore || standardsScore}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Compliance Summary */}
                            <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs opacity-90 mb-1">Overall Compliance Rating</p>
                                  <p className="text-2xl font-bold">
                                    {standardsScore >= 90 ? 'Fully Compliant' : standardsScore >= 80 ? 'Compliant' : standardsScore >= 70 ? 'Mostly Compliant' : 'Needs Review'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-4xl font-bold">{standardsScore}%</div>
                                  <div className="text-xs opacity-90">{framework} Adherence</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </AnimatedCard>

                  {/* Admin Actions - Template Analysis removed (now automatic on generation/edits) */}
                </div>

                {/* Source Documents */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mb-8"
                >
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>Source Documents</span>
                      </CardTitle>
                      <CardDescription>
                        Documents used as context during AI generation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        // Handle both snake_case (source_documentDatas) and camelCase (sourceDocuments) for backward compatibility
                        const sourceDocs = documentData?.generation_metadata?.source_documentDatas || documentData?.generation_metadata?.sourceDocuments || []

                        if (sourceDocs.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No source documentDatas - this was the first documentData generated or no context was available.
                            </p>
                          )
                        }

                        return (
                          <>
                            {/* Individual Document Details */}
                            <div className="space-y-3">
                              {sourceDocs.map((source: any, idx: number) => {
                                // Handle project context entries specially
                                const isProjectContext = source.is_project_context || (source.id && source.id.startsWith('project_context:'))
                                const linkUrl = isProjectContext
                                  ? `/projects/${projectId}` // Link to project page for project context
                                  : getProjectDocumentViewPath(projectId, source.id) // Link to document for regular source documents

                                return (
                                  <Link
                                    key={source.id || idx}
                                    href={linkUrl}
                                    className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-start space-x-3">
                                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isProjectContext
                                          ? 'bg-purple-100 dark:bg-purple-900'
                                          : 'bg-blue-100 dark:bg-blue-900'
                                        }`}>
                                        <span className={`text-sm font-bold ${isProjectContext
                                            ? 'text-purple-600 dark:text-purple-300'
                                            : 'text-blue-600 dark:text-blue-300'
                                          }`}>
                                          {isProjectContext ? '🏗️' : (source.priority_rank || idx + 1)}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <h4 className="text-sm font-semibold truncate">
                                            {source.title || source.name}
                                          </h4>
                                          {isProjectContext && (
                                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex-shrink-0">
                                              Project Context
                                            </Badge>
                                          )}
                                          {!isProjectContext && source.status && (
                                            <Badge variant="outline" className="capitalize flex-shrink-0">
                                              {source.status}
                                            </Badge>
                                          )}
                                          {source.dependency_level && (
                                            <Badge
                                              variant="secondary"
                                              className={`flex-shrink-0 ${source.dependency_level >= 4 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                                  source.dependency_level === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                                                    source.dependency_level === 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                                      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                }`}
                                            >
                                              {source.dependency_level >= 4 ? '🔴 Critical' :
                                                source.dependency_level === 3 ? '🟠 High' :
                                                  source.dependency_level === 2 ? '🟡 Medium' : '🟢 Low'}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                          {source.phase_name && (
                                            <span className="flex items-center space-x-1">
                                              <span className="font-medium">{source.phase_name}</span>
                                            </span>
                                          )}
                                          {source.type && (
                                            <>
                                              <span>•</span>
                                              <span>{source.type}</span>
                                            </>
                                          )}
                                          {source.priority_rank && typeof source.priority_rank === 'number' && (
                                            <>
                                              <span>•</span>
                                              <span className="font-medium">Score: {Math.round(source.priority_rank)}</span>
                                            </>
                                          )}
                                        </div>
                                        {/* Reading Metrics */}
                                        {source.character_count && (
                                          <div className="flex items-center space-x-2 text-xs text-muted-foreground/80 mt-1">
                                            <span>📄 {source.character_count.toLocaleString()} chars</span>
                                            <span>•</span>
                                            <span>📖 {source.word_count?.toLocaleString() || 'N/A'} words</span>
                                            <span>•</span>
                                            <span className="font-medium">⏱️ ~{source.reading_time_minutes || Math.round((source.word_count || 0) / 250)} min read</span>
                                          </div>
                                        )}
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    </div>
                                  </Link>
                                )
                              })}
                            </div>

                            {/* Context Stats Summary */}
                            {documentData?.generation_metadata?.context_stats && (
                              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                                {(() => {
                                  const contextStats = documentData.generation_metadata!.context_stats!
                                  const totalChars = sourceDocs.reduce((sum: number, doc: any) => sum + (doc.character_count || 0), 0)
                                  const totalWords = sourceDocs.reduce((sum: number, doc: any) => sum + (doc.word_count || 0), 0)
                                  const totalReadingTime = sourceDocs.reduce((sum: number, doc: any) => sum + (doc.reading_time_minutes || 0), 0)

                                  return (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                          <span className="text-muted-foreground">Documents Used:</span>
                                          <span className="ml-2 font-medium">
                                            {Number(contextStats.documents_used || contextStats.documents_used_as_context || sourceDocs.length)} / {Number(contextStats.total_documents || contextStats.total_documents_available || 0)}
                                          </span>
                                        </div>
                                        {contextStats.project_context_used && (
                                          <div>
                                            <span className="text-muted-foreground">Project Context:</span>
                                            <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
                                              ✓ Used
                                            </span>
                                          </div>
                                        )}
                                        {Number(contextStats.stakeholders_included || 0) > 0 && (
                                          <div>
                                            <span className="text-muted-foreground">Stakeholders:</span>
                                            <span className="ml-2 font-medium">
                                              {contextStats.stakeholders_included}
                                            </span>
                                          </div>
                                        )}
                                        {contextStats.estimated_context_tokens && (
                                          <div>
                                            <span className="text-muted-foreground">Est. Context Tokens:</span>
                                            <span className="ml-2 font-medium">
                                              {Number(contextStats.estimated_context_tokens).toLocaleString()}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Total Reading Metrics */}
                                      {totalChars > 0 && (
                                        <div className="pt-2 border-t">
                                          <div className="text-xs font-medium text-muted-foreground mb-2">📚 Total Research Material:</div>
                                          <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                              <span className="text-muted-foreground">Total Characters:</span>
                                              <span className="ml-2 font-medium">
                                                {totalChars.toLocaleString()}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Total Words:</span>
                                              <span className="ml-2 font-medium">
                                                {totalWords.toLocaleString()}
                                              </span>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-muted-foreground">Total Reading Time:</span>
                                              <span className="ml-2 font-medium">
                                                {totalReadingTime >= 60
                                                  ? `${Math.round(totalReadingTime / 60 * 10) / 10} hours`
                                                  : `${Math.round(totalReadingTime)} minutes`}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </CardContent>
                  </AnimatedCard>
                </motion.div>


                {/* Stakeholder Feedback */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5" />
                        <span>Stakeholder Feedback</span>
                      </CardTitle>
                      <CardDescription>
                        Feedback and reviews from stakeholders
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {documentData?.metadata?.stakeholder_feedback && documentData.metadata.stakeholder_feedback.length > 0 ? (
                        <div className="space-y-4">
                          {documentData.metadata.stakeholder_feedback.map((feedback) => (
                            <div key={feedback.id} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{feedback.user}</span>
                                  <div className="flex items-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(feedback.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{feedback.comment}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No feedback yet</p>
                          <Button
                            variant="outline"
                            className="mt-2"
                            onClick={() => setFeedbackDialogOpen(true)}
                          >
                            Start Feedback Session
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </AnimatedCard>
                </motion.div>

                {/* Technical Metadata */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>Technical Metadata</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">File Hash</Label>
                          <p className="text-sm font-mono">
                            {documentData?.metadata?.technical_metadata?.file_hash ||
                              (documentData?.id ? `${documentData.id.substring(0, 16)}...` : "N/A")}
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">SHA-256 (truncated)</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Encoding</Label>
                          <p className="text-sm">
                            {documentData?.metadata?.technical_metadata?.encoding || "UTF-8"}
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">Standard text encoding</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Language</Label>
                          <p className="text-sm">
                            {documentData?.metadata?.technical_metadata?.language || "en (English)"}
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">Detected language</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">MIME Type</Label>
                          <p className="text-sm">
                            {documentData?.mime_type || documentData?.metadata?.mime_type || "text/markdown"}
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">Content type</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Format</Label>
                          <Badge variant="outline">Markdown</Badge>
                          <p className="text-xs text-muted-foreground italic mt-1">Storage format</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Generation Method</Label>
                          <Badge variant="secondary">
                            {documentData?.generation_metadata?.aiProcessing?.provider ? "AI Generated" : "Uploaded"}
                          </Badge>
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {documentData?.generation_metadata?.aiProcessing?.provider
                              ? `via ${documentData.generation_metadata.aiProcessing.provider}`
                              : "User uploaded"}
                          </p>
                        </div>
                        {documentData?.metadata?.technical_metadata?.structure_analysis && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-muted-foreground">Structure Analysis</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{documentData.metadata.technical_metadata.structure_analysis.sections}</div>
                                <div className="text-xs text-muted-foreground">Sections</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{documentData.metadata.technical_metadata.structure_analysis.subsections}</div>
                                <div className="text-xs text-muted-foreground">Subsections</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{documentData.metadata.technical_metadata.structure_analysis.tables}</div>
                                <div className="text-xs text-muted-foreground">Tables</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{documentData.metadata.technical_metadata.structure_analysis.figures}</div>
                                <div className="text-xs text-muted-foreground">Figures</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>

                {/* Feedback Dialog */}
                <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Submit Feedback</DialogTitle>
                      <DialogDescription>
                        Provide feedback for this documentData to help improve its quality and compliance.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="feedback-category">Category</Label>
                        <Select value={feedbackForm.category} onValueChange={(value: string) => setFeedbackForm({ ...feedbackForm, category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                            <SelectItem value="quality">Quality</SelectItem>
                            <SelectItem value="clarity">Clarity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="feedback-rating">Rating</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setFeedbackForm({ ...feedbackForm, rating })}
                              className={`p-1 ${feedbackForm.rating >= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            >
                              <Star className="h-6 w-6" />
                            </button>
                          ))}
                          <span className="text-sm text-muted-foreground ml-2">
                            {feedbackForm.rating} out of 5
                          </span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="feedback-comment">Comment</Label>
                        <Textarea
                          id="feedback-comment"
                          value={feedbackForm.comment}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                          placeholder="Enter your feedback..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitFeedback}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </AnimatedLayout>
          </PageTransition>
        </main>
      </div>

      {/* Regeneration Modal */}
      <RegenerateVersionModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        documentId={docId}
        currentTemplate={documentData?.template_id}
        currentTemplateName={documentData?.template_name}
        currentVersion={documentData?.version?.toString() || '1.0'}
        projectId={projectId}
        onRegenerate={handleRegenerate}
      />

      {/* Regeneration Progress */}
      <RegenerationProgress
        jobId={progress?.jobId || null}
        progress={progress}
        isRegenerating={isRegenerating}
        error={regenerationError}
        result={result}
        onClose={resetRegeneration}
        documentId={docId}
      />

      {/* Signature Request Dialog */}
      <SignatureRequestDialog
        open={showSignatureRequestDialog}
        onOpenChange={setShowSignatureRequestDialog}
        onSubmit={async (data) => {
          try {
            const response = await apiClient.post('/signatures/initiate', {
              documentId: docId,
              ...data,
            })
            toast.success('Signature request sent successfully!')
            await fetchSignatureRequest()
          } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to send signature request')
            throw error
          }
        }}
        documentTitle={documentData?.name}
        disabled={saving}
      />

      {/* Quality Audit Modal */}
      {showQualityAuditModal && (
        <QualityAuditModal
          documentId={docId}
          onClose={() => setShowQualityAuditModal(false)}
        />
      )}
    </div>
  )
}