"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  BarChart3,
  PieChartIcon as PieChart,
  TrendingUp,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Folder,
  Tag,
  CheckCircle,
  AlertCircle,
  XCircle,
  ArrowLeft,
  Upload,
  Wand2,
  Loader2,
  AlertTriangle,
  CheckSquare,
  Square,
  FileDown,
  Printer,
  X,
} from "@/components/ui/icons-shim"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient, Project, Template } from "@/lib/api"
import { getApiUrl } from "@/lib/api-url"
import { toast } from "sonner"
import { QualityAuditBadge } from "@/components/quality"

// Status configuration for template badges
const statusConfig = {
  draft: { emoji: '⚪', label: 'Draft', color: 'secondary', variant: 'secondary' as const },
  testing: { emoji: '🔵', label: 'Testing', color: 'blue', variant: 'default' as const },
  compliance: { emoji: '🟣', label: 'Compliance', color: 'purple', variant: 'default' as const },
  validated: { emoji: '🟡', label: 'Validated', color: 'yellow', variant: 'default' as const },
  production: { emoji: '🟢', label: 'Production', color: 'green', variant: 'default' as const },
  archived: { emoji: '📦', label: 'Archived', color: 'gray', variant: 'secondary' as const },
  deprecated: { emoji: '🔴', label: 'Deprecated', color: 'red', variant: 'destructive' as const },
}

const healthConfig = {
  'Excellent': { color: 'text-green-600', bgColor: 'bg-green-50', icon: '⭐' },
  'Good': { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: '✓' },
  'Fair': { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: '◐' },
  'Needs Improvement': { color: 'text-orange-600', bgColor: 'bg-orange-50', icon: '⚠' },
}

interface Document {
  id: string
  name: string
  content?: any
  template_id?: string
  template_name?: string
  template_framework?: string
  status: string
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  word_count?: number
  character_count?: number
  file_size?: number
  mime_type?: string
  tags?: string[]
  metadata?: any
  quality_score?: number
  quality_status?: 'passed' | 'warning' | 'failed' | 'pending' | 'not_audited'
  quality_audit_id?: string
  drift_count?: number
  has_critical_drift?: boolean
  has_high_drift?: boolean
}

interface DocumentStats {
  totalDocuments: number
  byStatus: {
    [key: string]: number
  }
  byTemplate: Array<{
    template_name: string
    template_framework: string
    count: number
  }>
  byFramework: Array<{
    framework: string
    count: number
  }>
  totalWords: number
  totalCharacters: number
  totalSize: number
  readingTimeMinutes: number
  readingTimeFormatted: string
  counts: {
    published: number
    generated: number
    underReview: number
    reviewed: number
    draft: number
  }
}

export default function ProjectDocuments({ params }: { params: { id: string } }) {
  const router = useRouter()
  const projectId = params.id
  const { isAuthenticated } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [templateFilter, setTemplateFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [frameworkFilter, setFrameworkFilter] = useState("all")
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    pages: number
  }>({
    page: 1,
    limit: 9,
    total: 0,
    pages: 0,
  })

  // Document upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    name: "",
    file: null as File | null,
    template_id: "",
  })

  // Document generation state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generatingDocument, setGeneratingDocument] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    name: "",
    template_id: "",
    prompt: "",
    provider: "Groq AI",
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    max_tokens: 8000,
  })

  // AI Providers/Models state
  const [aiProviders, setAIProviders] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])

  // Fetch AI Providers on mount
  useEffect(() => {
    (async () => {
      const providers = await apiClient.getAIProviders?.() || []
      setAIProviders(providers)
      if (providers.length > 0) {
        setGenerateForm(prev => ({ ...prev, provider: providers[0].name }))
        // Fetch models for first provider
        try {
          const response = await apiClient.getProviderModels(providers[0].id)
          setModels(response.models || [])
          if (response.models && response.models.length > 0) {
            setGenerateForm(prev => ({ ...prev, model: response.models[0].name }))
          }
        } catch (err) {
          console.error("Failed to fetch models for initial provider", err)
          setModels([])
        }
      }
    })()
  }, [])

  // When provider changes, fetch models
  useEffect(() => {
    if (generateForm.provider) {
      (async () => {
        const provider = aiProviders.find(p => p.name === generateForm.provider)
        if (provider) {
          try {
            const response = await apiClient.getProviderModels(provider.id)
            setModels(response.models || [])
            if (response.models && response.models.length > 0) {
              setGenerateForm(prev => ({ ...prev, model: response.models[0].name }))
            }
          } catch (err) {
            console.error("Failed to fetch models for selected provider", err)
            setModels([])
          }
        }
      })()
    }
  }, [generateForm.provider])

  // Fetch project data
  const fetchProject = async () => {
    try {
      const projectData = await apiClient.getProject(projectId)
      setProject(projectData)
    } catch (error) {
      console.error("Failed to fetch project:", error)
      toast.error("Failed to load project")
    }
  }

  // Enrich documents with drift data
  const enrichDocumentsWithDriftData = async (docs: Document[]) => {
    try {
      // Fetch all drifts for the project
      const driftResponse = await apiClient.request<{ drifts: any[], total: number }>(
        `/projects/${projectId}/drift-detections`,
        { suppressNotFoundError: true } as Record<string, unknown>
      )

      const drifts = driftResponse.drifts || []

      // Count drifts per document
      const driftsByDoc = new Map<string, { count: number, hasCritical: boolean, hasHigh: boolean }>()

      drifts.forEach((drift: any) => {
        if (drift.source_document_id) {
          const existing = driftsByDoc.get(drift.source_document_id) || { count: 0, hasCritical: false, hasHigh: false }
          existing.count++
          if (drift.drift_severity === 'critical') existing.hasCritical = true
          if (drift.drift_severity === 'high') existing.hasHigh = true
          driftsByDoc.set(drift.source_document_id, existing)
        }
      })

      // Enrich documents with drift data
      docs.forEach(doc => {
        const driftData = driftsByDoc.get(doc.id)
        if (driftData) {
          doc.drift_count = driftData.count
          doc.has_critical_drift = driftData.hasCritical
          doc.has_high_drift = driftData.hasHigh
        }
      })
    } catch (error) {
      console.error('Error fetching drift data:', error)
      // Continue without drift data
    }
  }

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      }
      if (searchTerm) params.search = searchTerm
      if (statusFilter !== "all") params.status = statusFilter
      if (templateFilter !== "all") params.template = templateFilter
      if (gradeFilter !== "all") params.grade = gradeFilter
      if (frameworkFilter !== "all") params.framework = frameworkFilter

      const response = await apiClient.get(`/documents/project/${projectId}?${new URLSearchParams(params).toString()}`)
      const docs = response.documents || []

      // Fetch drift counts for each document
      await enrichDocumentsWithDriftData(docs)

      setDocuments(docs)
      setPagination(response.pagination || pagination)
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      // Use mock data for demonstration
      setDocuments([
        {
          id: "doc-1",
          name: "Project Requirements Document",
          template_id: null, // Mock data - no template ID
          template_name: "AI-Enhanced Project Charter Template",
          template_framework: "PMBOK 7",
          status: "published",
          version: 3,
          created_by: "user-1",
          updated_by: "user-1",
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-20T14:45:00Z",
          word_count: 2847,
          character_count: 15234,
          file_size: 2048576,
          mime_type: "text/markdown",
          tags: ["requirements", "technical", "architecture"],
          metadata: {
            ai_model: "GPT-4 Turbo",
            processing_time: "4.2s",
            compression_ratio: 78
          }
        },
        {
          id: "doc-2",
          name: "Risk Management Plan",
          template_id: "template-2",
          template_name: "Risk Management Plan",
          template_framework: "PMBOK 7",
          status: "review",
          version: 2,
          created_by: "user-2",
          updated_by: "user-1",
          created_at: "2024-01-18T09:15:00Z",
          updated_at: "2024-01-22T11:30:00Z",
          word_count: 1456,
          character_count: 8234,
          file_size: 1024768,
          mime_type: "text/markdown",
          tags: ["risk", "management", "compliance"],
          metadata: {
            ai_model: "Claude Sonnet",
            processing_time: "3.8s",
            compression_ratio: 82
          }
        },
        {
          id: "doc-3",
          name: "Quality Assurance Plan",
          template_id: "template-3",
          template_name: "Quality Management Plan",
          template_framework: "PMBOK 7",
          status: "draft",
          version: 1,
          created_by: "user-1",
          updated_by: "user-1",
          created_at: "2024-01-25T16:20:00Z",
          updated_at: "2024-01-25T16:20:00Z",
          word_count: 892,
          character_count: 4567,
          file_size: 512384,
          mime_type: "text/markdown",
          tags: ["quality", "assurance", "testing"],
          metadata: {
            ai_model: "GPT-4 Turbo",
            processing_time: "2.1s",
            compression_ratio: 75
          }
        }
      ])
    }
  }

  // Fetch templates (fetch ALL templates, not just project framework)
  const fetchTemplates = async () => {
    console.log('🔵 [Documents Page] fetchTemplates starting...')
    try {
      setLoadingTemplates(true)
      console.log('🔵 [Documents Page] Calling apiClient.getTemplates with limit=100')
      const response = await apiClient.getTemplates({
        limit: 100  // Increased limit to get all templates
      })
      console.log('📊 [Documents Page] Templates loaded:', response.templates?.length || 0, 'templates')
      setTemplates(response.templates || [])
    } catch (error) {
      console.error("❌ [Documents Page] Failed to fetch templates:", error)
      toast.error("Failed to load templates")
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
      console.log('🔵 [Documents Page] fetchTemplates completed')
    }
  }


  // Handle document upload
  const handleUploadDocument = () => {
    setUploadForm({
      name: "",
      file: null,
      template_id: "",
    })
    setUploadDialogOpen(true)
    fetchTemplates()
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 [UPLOAD] handleUploadSubmit called', {
      fileName: uploadForm.file?.name,
      fileType: uploadForm.file?.type,
      hasFile: !!uploadForm.file,
      fileInstance: uploadForm.file instanceof File
    })

    if (!uploadForm.name || !uploadForm.file || !uploadForm.template_id) {
      toast.error("Please fill in all required fields including template selection")
      return
    }

    try {
      setUploadingDocument(true)

      // CRITICAL: Validate file object is actually a File, not a metadata object
      if (!(uploadForm.file instanceof File)) {
        console.error('❌ Invalid file object:', uploadForm.file)
        throw new Error("Invalid file object. Please select a valid file.")
      }

      // CRITICAL: For PDF/DOCX files, use the upload endpoint that converts to Markdown
      // For text files, we can create directly with Markdown content
      // Use case-insensitive file extension checks as primary detection method
      const fileName = uploadForm.file.name.toLowerCase()
      const fileType = uploadForm.file.type?.toLowerCase() || ''

      // Check file extension first (more reliable than MIME type)
      const isPDF = fileName.endsWith('.pdf')
      const isDOCX = fileName.endsWith('.docx') || fileName.endsWith('.doc')
      const isTXT = fileName.endsWith('.txt')
      const isMD = fileName.endsWith('.md') || fileName.endsWith('.markdown')

      // Also check MIME types as secondary check
      const isPDFMime = fileType === 'application/pdf'
      const isDOCXMime = fileType.includes('wordprocessingml') ||
        fileType.includes('msword') ||
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword'
      const isTextMime = fileType === 'text/plain' || fileType === 'text/markdown'

      // Determine file category (prioritize extension over MIME type)
      const isBinaryFile = isPDF || isDOCX || isPDFMime || isDOCXMime
      const isTextFile = isTXT || isMD || isTextMime

      console.log('📄 File upload detection:', {
        fileName: uploadForm.file.name,
        fileType: uploadForm.file.type,
        isPDF,
        isDOCX,
        isTXT,
        isMD,
        isBinaryFile,
        isTextFile
      })

      if (isBinaryFile) {
        // Use the upload endpoint that converts PDFs/DOCX to Markdown
        console.log('📤 Uploading binary file via file upload endpoint:', {
          fileName: uploadForm.file.name,
          fileType: uploadForm.file.type,
          fileSize: uploadForm.file.size
        })

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }

        const formData = new FormData()
        formData.append('files', uploadForm.file)
        formData.append('projectId', projectId)
        formData.append('assessmentName', uploadForm.name)

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/onboarding/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
            console.error('❌ Upload endpoint failed:', {
              status: response.status,
              statusText: response.statusText,
              error
            })
            throw new Error(error.error?.message || error.message || 'Failed to upload document via upload endpoint')
          }

          const result = await response.json()
          console.log('✅ Upload endpoint success:', result)

          toast.success("Document uploaded successfully! Processing will begin shortly.")
          setUploadDialogOpen(false)
          setUploadForm({
            name: "",
            file: null,
            template_id: "",
          })

          // Wait a moment for processing, then refresh documents
          setTimeout(() => {
            fetchDocuments()
          }, 2000)
        } catch (uploadError: any) {
          // CRITICAL: Never fall back to createDocument for binary files
          console.error('❌ Upload endpoint error - DO NOT fall back to createDocument:', uploadError)
          throw new Error(`Failed to upload binary file: ${uploadError.message}. Please try again or contact support.`)
        }
      } else if (isTextFile) {
        // FINAL SAFEGUARD: Double-check file extension before allowing createDocument
        // Even if detection says it's a text file, if it has a binary extension, reject it
        const fileNameLower = uploadForm.file.name.toLowerCase()
        if (fileNameLower.endsWith('.pdf') || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
          console.error('❌ SAFEGUARD TRIGGERED: File has binary extension but was detected as text file', {
            fileName: uploadForm.file.name,
            fileType: uploadForm.file.type,
            isBinaryFile,
            isTextFile
          })
          throw new Error(`File "${uploadForm.file.name}" appears to be a binary file (PDF/DOCX) but was not properly detected. Please use the upload endpoint.`)
        }

        // For text files, read content and create document directly with Markdown
        const textContent = await uploadForm.file.text()

        // CRITICAL: Ensure content is a string, never an object
        if (typeof textContent !== 'string' || textContent.trim() === '') {
          throw new Error("File content is empty or invalid. Cannot create document.")
        }

        // Ensure we're not sending any file metadata
        const documentData = {
          name: uploadForm.name,
          content: textContent, // Store as plain Markdown string (never an object)
          template_id: uploadForm.template_id,
          status: "draft"
        }

        // Final validation: ensure content is not a file metadata object
        if (typeof documentData.content === 'object' ||
          (typeof documentData.content === 'string' &&
            (documentData.content.includes('"fileName"') ||
              documentData.content.includes('"fileSize"') ||
              documentData.content.includes('"fileType"')))) {
          console.error('❌ Attempted to send file metadata as content:', documentData)
          throw new Error("Invalid content format. For binary files (PDF/DOCX), please use the upload button which handles conversion automatically.")
        }

        console.log('✅ Creating document with text content (not binary):', {
          fileName: uploadForm.file.name,
          contentLength: textContent.length,
          isBinaryFile,
          isTextFile
        })

        await apiClient.createDocument(projectId, documentData)

        toast.success("Document uploaded successfully!")
        setUploadDialogOpen(false)
        setUploadForm({
          name: "",
          file: null,
          template_id: "",
        })
        await fetchDocuments()
      } else {
        // If file type cannot be determined, reject it to prevent sending metadata objects
        console.error('❌ Unsupported file type:', {
          fileName: uploadForm.file.name,
          fileType: uploadForm.file.type,
          fileSize: uploadForm.file.size,
          isBinaryFile,
          isTextFile
        })
        throw new Error(`Unsupported file type: ${uploadForm.file.name}. Please upload PDF, DOCX, TXT, or Markdown files. The file type could not be determined.`)
      }
    } catch (error: any) {
      console.error("Failed to upload document:", error)
      toast.error(error.message || "Failed to upload document. Please ensure the file is a PDF, DOCX, TXT, or Markdown file.")
    } finally {
      setUploadingDocument(false)
    }
  }

  // Handle document generation
  const handleGenerateDocument = () => {
    setGenerateForm({
      name: `${project?.name} - Generated Document`,
      template_id: "",
      prompt: `Generate a comprehensive document for the ${project?.name} project using the ${project?.framework} framework.`,
    })
    setGenerateDialogOpen(true)
    fetchTemplates()
  }

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!generateForm.name || !generateForm.prompt) {
      toast.error("Please fill in required fields")
      return
    }

    try {
      setGeneratingDocument(true)

      const aiResponse = await apiClient.generateContent({
        prompt: generateForm.prompt,
        provider: generateForm.provider || "Groq AI",
        model: generateForm.model || "llama-3.1-8b-instant",
        temperature: generateForm.temperature || 0.7,
        max_tokens: generateForm.max_tokens || 8000,
        template_id: generateForm.template_id || undefined,
        projectId: projectId,
      })

      // Handle async job response
      if (aiResponse.jobId && aiResponse.status === 'queued') {
        const jobId = aiResponse.jobId
        let jobStatus = 'queued'
        let attempts = 0
        const maxAttempts = 60 // 2 minutes timeout

        while (jobStatus !== 'completed' && jobStatus !== 'failed' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          try {
            const job = await apiClient.getJob(jobId)
            jobStatus = job.status

            if (jobStatus === 'completed') {
              toast.success("Document generated successfully!")
              setGenerateDialogOpen(false)
              setGenerateForm({
                name: "",
                template_id: "",
                prompt: "",
                provider: "Groq AI",
                model: "llama-3.1-8b-instant",
                temperature: 0.7,
              })
              await fetchDocuments()
              return
            } else if (jobStatus === 'failed') {
              throw new Error(job.error_message || "Generation job failed")
            }
            attempts++
          } catch (err) {
            console.error("Error polling job status:", err)
            // Continue polling unless it's a critical error
            attempts++
          }
        }

        if (attempts >= maxAttempts) {
          toast.info("Generation is taking longer than expected. It will continue in the background.")
          setGenerateDialogOpen(false)
          return
        }
      }

      // Legacy synchronous handling (fallback)
      const content = aiResponse.result?.content || aiResponse.result?.text || aiResponse.content || aiResponse.text || "# Document content not generated"

      await apiClient.createDocument(projectId, {
        name: generateForm.name,
        content: content,
        template_id: generateForm.template_id || undefined,
        status: "draft",
      })

      toast.success("Document generated successfully!")
      setGenerateDialogOpen(false)
      setGenerateForm({
        name: "",
        template_id: "",
        prompt: "",
        provider: "Groq AI",
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
      })
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to generate document:", error)
      toast.error("Failed to generate document")
    } finally {
      setGeneratingDocument(false)
    }
  }

  // Delete document (soft delete)
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to move this document to trash? You can restore it later from the Deleted Items page.")) {
      return
    }

    try {
      await apiClient.deleteDocument(documentId)
      toast.success("Document moved to trash. You can restore it later from the Deleted Items page.")
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to delete document:", error)
      toast.error("Failed to move document to trash")
    }
  }

  // Selection handlers
  // Documents are now filtered server-side, so we use them directly
  const displayDocuments = documents
  const [selectingAll, setSelectingAll] = useState(false)
  const [allDocumentIds, setAllDocumentIds] = useState<string[]>([]) // Cache for all document IDs

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(documentId)) {
        newSet.delete(documentId)
      } else {
        newSet.add(documentId)
      }
      return newSet
    })
  }

  // Select all documents on current page only
  const selectAllOnPage = () => {
    setSelectedDocuments(new Set(displayDocuments.map(doc => doc.id)))
  }

  // Select all documents across ALL pages
  const selectAllDocuments = async () => {
    if (pagination.total <= displayDocuments.length) {
      // All documents are on current page, no need for API call
      setSelectedDocuments(new Set(displayDocuments.map(doc => doc.id)))
      return
    }

    try {
      setSelectingAll(true)

      // Fetch all document IDs (without content for performance)
      const params: Record<string, string> = {
        page: '1',
        limit: pagination.total.toString(), // Get all
        fields: 'id', // Only fetch IDs for performance
      }
      if (searchTerm) params.search = searchTerm
      if (statusFilter !== "all") params.status = statusFilter
      if (templateFilter !== "all") params.template = templateFilter
      if (gradeFilter !== "all") params.grade = gradeFilter
      if (frameworkFilter !== "all") params.framework = frameworkFilter

      const response = await apiClient.get(`/documents/project/${projectId}?${new URLSearchParams(params).toString()}`)
      const allDocs = response.documents || []
      const allIds = allDocs.map((doc: any) => doc.id)

      setAllDocumentIds(allIds)
      setSelectedDocuments(new Set(allIds))
      toast.success(`Selected all ${allIds.length} documents across all pages`)
    } catch (error) {
      console.error("Failed to select all documents:", error)
      toast.error("Failed to select all documents. Selecting current page only.")
      setSelectedDocuments(new Set(displayDocuments.map(doc => doc.id)))
    } finally {
      setSelectingAll(false)
    }
  }

  const clearSelection = () => {
    setSelectedDocuments(new Set())
    setAllDocumentIds([])
  }

  // Check if all documents on current page are selected
  const isAllOnPageSelected = displayDocuments.length > 0 &&
    displayDocuments.every(doc => selectedDocuments.has(doc.id))

  // Check if ALL documents across all pages are selected
  const isAllDocumentsSelected = pagination.total > 0 &&
    selectedDocuments.size === pagination.total

  const isSomeSelected = selectedDocuments.size > 0 && !isAllDocumentsSelected

  // Bulk export functions
  const handleBulkExport = async (format: 'pdf' | 'docx' | 'markdown') => {
    if (selectedDocuments.size === 0) {
      toast.error("Please select at least one document")
      return
    }

    try {
      setExporting(true)
      const documentIds = Array.from(selectedDocuments)

      // Get auth token
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        toast.error("Please log in to export documents")
        return
      }

      // Use getApiUrl helper to construct the full URL
      const response = await fetch(getApiUrl(`/documents/bulk-export/${format}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ document_ids: documentIds }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `Export failed: ${response.statusText}`)
      }

      // Determine file name based on format
      // DOCX exports are single combined files, PDF/Markdown exports are ZIP archives
      const fileName = format === 'docx'
        ? `combined-documents-${Date.now()}.docx`
        : `documents-export-${Date.now()}.zip`

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Successfully exported ${documentIds.length} document(s) as ${format.toUpperCase()}`)
      clearSelection()
    } catch (error: any) {
      console.error(`Failed to export as ${format}:`, error)
      toast.error(error.message || `Failed to export documents as ${format.toUpperCase()}`)
    } finally {
      setExporting(false)
    }
  }

  const handleBulkPrint = () => {
    if (selectedDocuments.size === 0) {
      toast.error("Please select at least one document")
      return
    }

    // Open each selected document in a new window for printing
    selectedDocuments.forEach(documentId => {
      const url = `/projects/${projectId}/documents/${documentId}/view`
      window.open(url, '_blank')
    })

    toast.success(`Opening ${selectedDocuments.size} document(s) for printing`)
    // Note: User will need to print each window manually
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
      default:
        return "bg-gradient-to-r from-slate-500 to-gray-500 text-white"
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Calculate quality grade from score
  const calculateGrade = (score: number): string => {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([fetchProject(), fetchDocuments()]).then(() => {
        setLoading(false)
      })
    }
  }, [isAuthenticated, projectId])

  // Fetch documents when pagination or filters change
  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchDocuments()
    }
  }, [pagination.page, searchTerm, statusFilter, templateFilter, gradeFilter, frameworkFilter])

  // Fetch comprehensive stats (across all documents)
  const fetchStats = async () => {
    try {
      const { getApiUrl } = await import('@/lib/api-url')
      const response = await fetch(getApiUrl(`/documents/project/${projectId}/stats`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const statsData = await response.json()
        setStats(statsData)
      } else {
        console.error('Failed to fetch stats:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Fetch stats when component mounts or when documents are updated
  useEffect(() => {
    if (projectId) {
      fetchStats()
    }
  }, [projectId])

  // Refetch stats after documents change (create, update, delete)
  useEffect(() => {
    if (documents.length > 0) {
      fetchStats()
    }
  }, [documents.length])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access documents.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading documents...</p>
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
        <Header />
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
                        onClick={() => router.push(`/projects/${projectId}`)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Project
                      </Button>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{project?.name}</span>
                        </div>
                        <h1 className="text-3xl font-bold">Document Library</h1>
                        <p className="text-muted-foreground">
                          Manage and view all documents for this project
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" onClick={handleGenerateDocument}>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Document
                      </Button>
                      <Button onClick={handleUploadDocument}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/projects/${projectId}/documents/deleted`)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deleted Items
                      </Button>
                    </div>
                  </div>
                </motion.div>


                {/* Framework Distribution */}
                {stats && stats.totalDocuments > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8"
                  >
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5" />
                          <span>Framework Distribution</span>
                        </CardTitle>
                        <CardDescription>
                          Documents organized by framework compliance
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {stats.byFramework.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {stats.byFramework.map((framework, index) => {
                              const percentage = ((framework.count / stats.totalDocuments) * 100).toFixed(1)
                              const colors = [
                                'bg-purple-500',
                                'bg-indigo-500',
                                'bg-blue-500',
                                'bg-teal-500',
                              ]
                              const color = colors[index % colors.length]

                              return (
                                <div key={index} className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border shadow-sm">
                                  <div className="flex items-center space-x-2 mb-3">
                                    <div className={`w-4 h-4 rounded-full ${color}`}></div>
                                    <span className="text-sm font-semibold">{framework.framework}</span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="text-3xl font-bold">{framework.count}</div>
                                    <Progress value={parseFloat(percentage)} className="h-2" />
                                    <div className="text-xs text-muted-foreground">
                                      {percentage}% of total documents
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No framework information available for documents.</p>
                            <p className="text-sm mt-2">Documents may not have templates assigned yet.</p>
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}

                {/* Bulk Action Bar */}
                {selectedDocuments.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                        </span>
                        {selectedDocuments.size > displayDocuments.length && (
                          <span className="text-xs text-muted-foreground">
                            Including documents from other pages
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkExport('pdf')}
                        disabled={exporting}
                      >
                        {exporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4 mr-2" />
                        )}
                        Export as PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkExport('docx')}
                        disabled={exporting}
                      >
                        {exporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4 mr-2" />
                        )}
                        Export as Word
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkExport('markdown')}
                        disabled={exporting}
                      >
                        {exporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4 mr-2" />
                        )}
                        Export as Markdown
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkPrint}
                        disabled={exporting}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Documents
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Search and Filters */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Filter Icon */}
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground mr-2">Filters:</span>
                    </div>

                    {/* Status Filter */}
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[120px]"
                      value={statusFilter}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="review">Review</option>
                      <option value="approved">Approved</option>
                      <option value="published">Published</option>
                    </select>

                    {/* Framework Filter */}
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
                      value={frameworkFilter}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFrameworkFilter(e.target.value)}
                    >
                      <option value="all">All Frameworks</option>
                      {stats?.byFramework.map((fw, index) => (
                        <option key={index} value={fw.framework}>
                          {fw.framework} ({fw.count})
                        </option>
                      ))}
                    </select>

                    {/* Template Filter */}
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
                      value={templateFilter}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTemplateFilter(e.target.value)}
                    >
                      <option value="all">All Templates</option>
                      {stats?.byTemplate.map((template, index) => (
                        <option key={index} value={template.template_name}>
                          {template.template_name}
                        </option>
                      ))}
                    </select>

                    {/* Audit Grade Filter */}
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[130px]"
                      value={gradeFilter}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGradeFilter(e.target.value)}
                    >
                      <option value="all">All Grades</option>
                      <option value="A">⭐ Grade A (90-100)</option>
                      <option value="B">✓ Grade B (80-89)</option>
                      <option value="C">◐ Grade C (70-79)</option>
                      <option value="D">⚠ Grade D (60-69)</option>
                      <option value="F">✗ Grade F (0-59)</option>
                      <option value="not_audited">📋 Not Audited</option>
                    </select>

                    {/* Clear Filters Button */}
                    {(statusFilter !== "all" || frameworkFilter !== "all" || templateFilter !== "all" || gradeFilter !== "all" || searchTerm) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("")
                          setStatusFilter("all")
                          setFrameworkFilter("all")
                          setTemplateFilter("all")
                          setGradeFilter("all")
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Active Filters Summary */}
                  {(statusFilter !== "all" || frameworkFilter !== "all" || templateFilter !== "all" || gradeFilter !== "all") && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">Active filters:</span>
                      {statusFilter !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Status: {statusFilter}
                          <button
                            onClick={() => setStatusFilter("all")}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {frameworkFilter !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Framework: {frameworkFilter}
                          <button
                            onClick={() => setFrameworkFilter("all")}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {templateFilter !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Template: {templateFilter}
                          <button
                            onClick={() => setTemplateFilter("all")}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                      {gradeFilter !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Grade: {gradeFilter}
                          <button
                            onClick={() => setGradeFilter("all")}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Documents List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-4"
                >
                  {displayDocuments.length === 0 ? (
                    <AnimatedCard>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No documents found</h3>
                        <p className="text-muted-foreground mb-6 text-center max-w-md">
                          {searchTerm || statusFilter !== "all" || templateFilter !== "all" || gradeFilter !== "all" || frameworkFilter !== "all"
                            ? "Try adjusting your search or filter criteria"
                            : "Get started by uploading or generating your first document"}
                        </p>
                        <div className="flex space-x-2">
                          <Button onClick={handleUploadDocument}>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Document
                          </Button>
                          <Button variant="outline" onClick={handleGenerateDocument}>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Generate Document
                          </Button>
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  ) : (
                    <>
                      {/* Select All Controls */}
                      {displayDocuments.length > 0 && (
                        <div className="flex items-center justify-between mb-4 p-3 border-b bg-muted/30 rounded-t-lg">
                          <div className="flex items-center space-x-4">
                            {/* Select All on Page */}
                            <button
                              onClick={() => {
                                if (isAllOnPageSelected) {
                                  // Deselect only current page documents
                                  setSelectedDocuments(prev => {
                                    const newSet = new Set(prev)
                                    displayDocuments.forEach(doc => newSet.delete(doc.id))
                                    return newSet
                                  })
                                } else {
                                  selectAllOnPage()
                                }
                              }}
                              className="flex items-center space-x-2 hover:bg-muted rounded p-2 transition-colors"
                              disabled={selectingAll}
                            >
                              {isAllOnPageSelected ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : isSomeSelected ? (
                                <CheckSquare className="h-5 w-5 text-primary opacity-50" />
                              ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium">
                                {isAllOnPageSelected ? 'Deselect Page' : 'Select Page'}
                              </span>
                            </button>

                            {/* Divider */}
                            <div className="h-6 w-px bg-border" />

                            {/* Select All Across Pages */}
                            {pagination.total > displayDocuments.length && (
                              <button
                                onClick={isAllDocumentsSelected ? clearSelection : selectAllDocuments}
                                className="flex items-center space-x-2 hover:bg-muted rounded p-2 transition-colors text-primary"
                                disabled={selectingAll}
                              >
                                {selectingAll ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : isAllDocumentsSelected ? (
                                  <CheckSquare className="h-5 w-5" />
                                ) : (
                                  <Square className="h-5 w-5" />
                                )}
                                <span className="text-sm font-medium">
                                  {selectingAll
                                    ? 'Selecting...'
                                    : isAllDocumentsSelected
                                      ? 'Deselect All'
                                      : `Select All ${pagination.total} Documents`}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Selection Summary */}
                          <div className="text-sm text-muted-foreground">
                            {selectedDocuments.size > 0 ? (
                              <span>
                                <span className="font-medium text-foreground">{selectedDocuments.size}</span>
                                {' of '}
                                <span className="font-medium">{pagination.total}</span>
                                {' selected'}
                                {selectedDocuments.size > displayDocuments.length && (
                                  <span className="ml-1 text-primary">(across all pages)</span>
                                )}
                              </span>
                            ) : (
                              <span>No documents selected</span>
                            )}
                          </div>
                        </div>
                      )}

                      {displayDocuments.map((document, index) => (
                        <AnimatedCard key={document.id}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => toggleDocumentSelection(document.id)}
                                    className="flex-shrink-0 mt-1"
                                  >
                                    {selectedDocuments.has(document.id) ? (
                                      <CheckSquare className="h-5 w-5 text-primary" />
                                    ) : (
                                      <Square className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                  </button>
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold">{document.name}</h3>
                                    {document.template_name && (
                                      <p className="text-sm text-blue-600 font-medium">
                                        📋 {document.template_name}
                                      </p>
                                    )}
                                  </div>
                                  <Badge className={getStatusColor(document.status)}>
                                    {document.status}
                                  </Badge>
                                  <Badge variant="outline">
                                    v{document.version}
                                  </Badge>
                                  {document.quality_score !== undefined && document.quality_score !== null && (
                                    <QualityAuditBadge
                                      documentId={document.id}
                                      score={document.quality_score}
                                      grade={calculateGrade(document.quality_score)}
                                      status={document.quality_status}
                                      compact
                                    />
                                  )}
                                  {document.drift_count && document.drift_count > 0 && (
                                    <Badge
                                      variant={document.has_critical_drift ? "destructive" : document.has_high_drift ? "default" : "secondary"}
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        router.push(`/projects/${projectId}/drift`)
                                      }}
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {document.drift_count} Drift{document.drift_count > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="flex items-center space-x-2">
                                    <Tag className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">Template</p>
                                      <p className="text-sm text-muted-foreground">
                                        {document.template_name || 'No template'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">Last Updated</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(document.updated_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">Size</p>
                                      <p className="text-sm text-muted-foreground">
                                        {document.word_count ? `${document.word_count} words` : formatFileSize(document.file_size || 0)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Template Metadata */}
                                {document.template_name && (
                                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span className="text-sm font-medium">Template Compliance</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Framework:</span>
                                        <span className="ml-2 font-medium">{document.template_framework}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Template:</span>
                                        <span className="ml-2 font-medium">{document.template_name}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Tags */}
                                {document.tags && document.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {document.tags.map((tag) => (
                                      <div key={tag} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                                        {tag}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/projects/${projectId}/documents/${document.id}/view`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/projects/${projectId}/documents/${document.id}`)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <User className="h-4 w-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteDocument(document.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </AnimatedCard>
                      ))}

                      {/* Pagination Controls */}
                      {displayDocuments.length > 0 && pagination.pages > 1 && (
                        <div className="flex items-center justify-between pt-6 border-t">
                          <div className="text-sm text-muted-foreground">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} documents
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                              disabled={pagination.page <= 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {pagination.page} of {pagination.pages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                              disabled={pagination.page >= pagination.pages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>

                {/* Upload Document Dialog */}
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold">Upload Document</h2>
                        <p className="text-sm text-muted-foreground">
                          Upload a document to {project?.name}. Select a template to ensure proper metadata tagging.
                        </p>
                      </div>
                      <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <div className="grid gap-6 py-4">
                          <div>
                            <Label htmlFor="upload-doc-name">Document Name *</Label>
                            <Input
                              id="upload-doc-name"
                              placeholder="Enter document name"
                              value={uploadForm.name}
                              onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                              className="mt-2"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="upload-template-select">Template *</Label>
                            <select
                              id="upload-template-select"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={uploadForm.template_id}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadForm({ ...uploadForm, template_id: e.target.value })}
                              required
                            >
                              <option value="">Select a template (required)</option>
                              {loadingTemplates ? (
                                <option disabled>Loading templates...</option>
                              ) : (
                                templates.map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig]
                                      ? statusConfig[template.development_status as keyof typeof statusConfig].emoji + ' '
                                      : ''}
                                    {template.name} ({template.framework})
                                    {template.development_status === 'production' ? ' ✓' : ''}
                                  </option>
                                ))
                              )}
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                              Template selection is required to ensure proper document metadata and review compliance
                            </p>

                            {/* Template Status Information Panel */}
                            {uploadForm.template_id && templates.find(t => t.id === uploadForm.template_id) && (() => {
                              const selectedTemplate = templates.find(t => t.id === uploadForm.template_id)!
                              return (
                                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">Template Status:</span>
                                      {selectedTemplate.development_status && statusConfig[selectedTemplate.development_status as keyof typeof statusConfig] && (
                                        // @ts-expect-error - Badge accepts children via HTMLAttributes
                                        <Badge variant={statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].variant}>
                                          {statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].emoji} {statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].label}
                                        </Badge>
                                      )}
                                    </div>
                                    {selectedTemplate.health_rating && healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig] && (
                                      // @ts-expect-error - Badge accepts children via HTMLAttributes
                                      <Badge variant="outline" className={`text-xs ${healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].color}`}>
                                        {healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].icon} {selectedTemplate.health_rating}
                                      </Badge>
                                    )}
                                  </div>

                                  {selectedTemplate.validation_count !== undefined && selectedTemplate.validation_count > 0 && (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Success Rate</span>
                                        <span className="font-semibold">
                                          {selectedTemplate.success_rate !== undefined
                                            ? `${Number(selectedTemplate.success_rate).toFixed(1)}%`
                                            : selectedTemplate.success_count && selectedTemplate.validation_count
                                              ? `${Math.round((selectedTemplate.success_count / selectedTemplate.validation_count) * 100)}%`
                                              : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Test Runs</span>
                                        <span className="font-semibold">{selectedTemplate.validation_count}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Info for production templates */}
                                  {selectedTemplate.development_status === 'production' && (
                                    <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                          Production Template - Recommended for Uploads
                                        </p>
                                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                          Using this template ensures proper metadata tagging and compliance tracking.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Note for non-production templates */}
                                  {selectedTemplate.development_status && selectedTemplate.development_status !== 'production' && (
                                    <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                          Template Status: {selectedTemplate.development_status === 'draft' && 'Draft'}
                                          {selectedTemplate.development_status === 'testing' && 'Testing'}
                                          {selectedTemplate.development_status === 'validated' && 'Validated'}
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                          Metadata tagging will use this template's structure. Consider using a production template for better compliance tracking.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                          <div>
                            <Label htmlFor="file-upload">File *</Label>
                            <Input
                              id="file-upload"
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.md"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null
                                setUploadForm({ ...uploadForm, file })
                              }}
                              className="mt-2"
                              required
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Supported formats: PDF, DOC, DOCX, TXT, MD
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setUploadDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={uploadingDocument}
                          >
                            {uploadingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Upload Document
                          </Button>
                        </div>
                      </form>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Generate Document Dialog */}
                <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold">Generate Document</h2>
                        <p className="text-sm text-muted-foreground">
                          Generate a new document for {project?.name} using AI
                        </p>
                      </div>
                      <form onSubmit={handleGenerateSubmit} className="space-y-4">
                        <div className="grid gap-6 py-4">
                          <div>
                            <Label htmlFor="generate-doc-name">Document Name *</Label>
                            <Input
                              id="generate-doc-name"
                              placeholder="Enter document name"
                              value={generateForm.name}
                              onChange={(e) => setGenerateForm({ ...generateForm, name: e.target.value })}
                              className="mt-2"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="generate-template-select">Template (Optional)</Label>
                            <select
                              id="generate-template-select"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={generateForm.template_id}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenerateForm({ ...generateForm, template_id: e.target.value })}
                            >
                              <option value="">Select a template</option>
                              {loadingTemplates ? (
                                <option disabled>Loading templates...</option>
                              ) : (
                                templates.map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig]
                                      ? statusConfig[template.development_status as keyof typeof statusConfig].emoji + ' '
                                      : ''}
                                    {template.name} ({template.framework})
                                    {template.development_status === 'production' ? ' ✓' : ''}
                                  </option>
                                ))
                              )}
                            </select>

                            {/* Template Status Information Panel */}
                            {generateForm.template_id && templates.find(t => t.id === generateForm.template_id) && (() => {
                              const selectedTemplate = templates.find(t => t.id === generateForm.template_id)!
                              return (
                                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">Template Status:</span>
                                      {selectedTemplate.development_status && statusConfig[selectedTemplate.development_status as keyof typeof statusConfig] && (
                                        // @ts-expect-error - Badge accepts children via HTMLAttributes
                                        <Badge variant={statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].variant}>
                                          {statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].emoji} {statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].label}
                                        </Badge>
                                      )}
                                    </div>
                                    {selectedTemplate.health_rating && healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig] && (
                                      // @ts-expect-error - Badge accepts children via HTMLAttributes
                                      <Badge variant="outline" className={`text-xs ${healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].color}`}>
                                        {healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].icon} {selectedTemplate.health_rating}
                                      </Badge>
                                    )}
                                  </div>

                                  {selectedTemplate.validation_count !== undefined && selectedTemplate.validation_count > 0 && (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Success Rate</span>
                                        <span className="font-semibold">
                                          {selectedTemplate.success_rate !== undefined
                                            ? `${Number(selectedTemplate.success_rate).toFixed(1)}%`
                                            : selectedTemplate.success_count && selectedTemplate.validation_count
                                              ? `${Math.round((selectedTemplate.success_count / selectedTemplate.validation_count) * 100)}%`
                                              : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Test Runs</span>
                                        <span className="font-semibold">{selectedTemplate.validation_count}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Warning for non-production templates */}
                                  {selectedTemplate.development_status && selectedTemplate.development_status !== 'production' && (
                                    <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                          {selectedTemplate.development_status === 'draft' && 'Draft Template - Untested'}
                                          {selectedTemplate.development_status === 'testing' && 'Testing Template - Limited validation'}
                                          {selectedTemplate.development_status === 'validated' && 'Validated Template - Not yet production-ready'}
                                          {selectedTemplate.development_status === 'deprecated' && 'Deprecated Template - Not recommended'}
                                        </p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                          This template is still being tested. Results may vary in quality.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Success indicator for production templates */}
                                  {selectedTemplate.development_status === 'production' && (
                                    <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                          Production Template - Fully Validated
                                        </p>
                                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                          This template has been thoroughly tested and is ready for production use.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                          <div>
                            <Label htmlFor="ai_provider">AI Provider</Label>
                            <select
                              id="ai_provider"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={generateForm.provider}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenerateForm({ ...generateForm, provider: e.target.value })}
                            >
                              {aiProviders.map((provider) => (
                                <option key={provider.id} value={provider.name}>{provider.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="ai_model">Model</Label>
                            <select
                              id="ai_model"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={generateForm.model}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenerateForm({ ...generateForm, model: e.target.value })}
                            >
                              {models.map((model) => (
                                <option key={model.name} value={model.name}>{model.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="temperature">Temperature</Label>
                            <input
                              id="temperature"
                              type="number"
                              min={0}
                              max={2}
                              step={0.01}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={generateForm.temperature}
                              onChange={(e) => setGenerateForm({ ...generateForm, temperature: parseFloat(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">Lower = more focused, Higher = more creative</p>
                          </div>
                          <div>
                            <Label htmlFor="max_tokens">Max Output Tokens</Label>
                            <input
                              id="max_tokens"
                              type="number"
                              min={100}
                              max={32000}
                              step={100}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={generateForm.max_tokens}
                              onChange={(e) => setGenerateForm({ ...generateForm, max_tokens: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">Maximum number of tokens the model can generate</p>
                          </div>
                          <div>
                            <Label htmlFor="generate-prompt">Generation Prompt *</Label>
                            <Textarea
                              id="generate-prompt"
                              placeholder="Describe what you want the document to contain..."
                              value={generateForm.prompt}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGenerateForm({ ...generateForm, prompt: e.target.value })}
                              className="mt-2"
                              rows={4}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setGenerateDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={generatingDocument}
                          >
                            {generatingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Wand2 className="h-4 w-4 mr-2" />
                            Generate Document
                          </Button>
                        </div>
                      </form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </AnimatedLayout>
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
