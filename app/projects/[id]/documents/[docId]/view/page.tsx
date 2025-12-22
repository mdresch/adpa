"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
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
} from "@/components/ui/icons-shim"
import { Award } from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, TextRun } from "docx"
import { saveAs } from "file-saver"
import { RegenerateVersionModal } from "@/components/documents/RegenerateVersionModal"
import { RegenerationProgress } from "@/components/documents/RegenerationProgress"
import { VersionViewerDialog } from "@/components/documents/VersionViewerDialog"
import { VersionListDialog } from "@/components/documents/VersionListDialog"
import { DriftHighlighter } from "@/components/documents/DriftHighlighter"
import { useDocumentRegeneration } from "@/hooks/use-document-regeneration"
import { Sparkles } from "@/components/ui/icons-shim"
import { DocumentEntityEditor } from "@/components/documents/DocumentEntityEditor"

interface DocumentData {
  id: string
  title: string
  content: string
  author: string
  created_at: string
  updated_at: string
  status: string
  project_id: string
  project_name: string
  template_id?: string
  template_name?: string
  version?: number
  word_count: number
  character_count: number
  compression_ratio: number
  original_size: string
  compressed_size: string
  processing_time: string
  ai_model: string
  input_tokens: number
  output_tokens: number
  tags: string[]
  source_documents: Array<{
    id: string
    title: string
    type: string
    url?: string
  }>
  comments: Array<{
    id: string
    author: string
    content: string
    created_at: string
  }>
}

interface VersionData {
  id: string
  version: string
  created_at: string
  author: string
  changes: string
  word_count: number
  content?: string
}

export default function ProjectDocumentViewer() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const projectId = params.id as string
  const documentId = params.docId as string

  const [document, setDocument] = useState<DocumentData | null>(null)
  const [confluenceUrl, setConfluenceUrl] = useState<string | null>(null)
  const [versions, setVersions] = useState<VersionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
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
  const [selectedVersion, setSelectedVersion] = useState<VersionData | null>(null)
  const [showVersionDialog, setShowVersionDialog] = useState(false)
  const [drifts, setDrifts] = useState<any[]>([])
  const [showDriftHighlights, setShowDriftHighlights] = useState(true)
  const [baseContentSnapshot, setBaseContentSnapshot] = useState<string>("")
  const [latestContentSnapshot, setLatestContentSnapshot] = useState<string>("")

  // Document regeneration hook
  const { regenerate, progress, isRegenerating, error: regenerationError, result, reset: resetRegeneration } = useDocumentRegeneration()

  // WebSocket event handlers for conflict and regeneration events
  const { on, off, joinRoom, leaveRoom } = useWebSocket()
  useEffect(() => {
    // Join the document and project rooms to receive events
    const documentRoom = `document:${documentId}`
    const projectRoom = `project:${projectId}`
    joinRoom(documentRoom)
    joinRoom(projectRoom)

    const handleConflictDetected = (data: {
      jobId: string;
      conflictId: string;
      conflictDetails: any;
      resolutionOptions: string[];
    }) => {
      try {
        toast.warning(`Template conflict detected during regeneration: ${data.conflictDetails.template?.name || 'Unknown Template'}`)
        // The conflict dialog will be shown by the project page
      } catch (err) {
        console.warn('Error handling document:regeneration:conflict_detected event', err)
      }
    }

    const handleConflictResolved = (data: {
      conflictId: string;
      resolutionMethod: string;
      documentId: string;
      newVersionId?: string;
    }) => {
      try {
        if (data.documentId === documentId) {
          toast.success(`Conflict resolved using ${data.resolutionMethod}`)
          fetchDocument() // Refresh document to show updates
        }
      } catch (err) {
        console.warn('Error handling document:conflict_resolved event', err)
      }
    }

    const handleRegenerationCompleted = (data: {
      jobId: string;
      versionId: string;
      versionNumber: string;
      documentName?: string;
    }) => {
      try {
        toast.success(`Document regeneration completed (v${data.versionNumber})`)
        fetchDocument() // Refresh document to show the new version
      } catch (err) {
        console.warn('Error handling document:regeneration:completed event', err)
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, projectId]) // joinRoom, leaveRoom, on, off are stable callbacks

  // Mock data for demonstration
  const mockDocument: DocumentData = {
    id: documentId,
    title: "Project Requirements Document",
    content: `# Project Requirements Document

## Project Overview
This document outlines the comprehensive requirements for the **Advanced Document Processing & Automation (ADPA)** project.

## Executive Summary
The ADPA system is designed to revolutionize document processing workflows through AI-powered automation, intelligent content analysis, and seamless integration capabilities.

## Functional Requirements

### 1. Document Processing Engine
- **AI-Powered Analysis**: Advanced natural language processing for document understanding
- **Multi-Format Support**: PDF, DOCX, TXT, MD, and other common formats
- **Batch Processing**: Handle multiple documents simultaneously
- **Real-time Processing**: Sub-second response times for simple operations

### 2. Template Management System
- **Dynamic Templates**: Create and manage document templates
- **Variable Injection**: Inject project-specific data into templates
- **Version Control**: Track template changes and rollback capabilities
- **Collaboration**: Multi-user template editing and approval workflows

### 3. AI Provider Integration
- **Multi-Provider Support**: OpenAI, Azure AI, Google AI, Mistral, and more
- **Failover Mechanisms**: Automatic provider switching for reliability
- **Cost Optimization**: Intelligent provider selection based on cost and performance
- **API Management**: Centralized API key and configuration management

### 4. Workflow Automation
- **Process Flow Builder**: Visual workflow design interface
- **Conditional Logic**: Smart routing based on document content and metadata
- **Scheduling**: Automated processing schedules and triggers
- **Monitoring**: Real-time workflow execution monitoring

## Technical Requirements

### Architecture
\`\`\`typescript
interface DocumentProcessor {
  processDocument(document: File): Promise<ProcessedDocument>
  extractMetadata(document: File): Promise<DocumentMetadata>
  generateSummary(content: string): Promise<string>
  compressContent(content: string): Promise<CompressedContent>
}

class ADPADocumentProcessor implements DocumentProcessor {
  private aiProviders: AIProvider[]
  private templateEngine: TemplateEngine
  private workflowEngine: WorkflowEngine

  async processDocument(document: File): Promise<ProcessedDocument> {
    const metadata = await this.extractMetadata(document)
    const content = await this.extractContent(document)
    const summary = await this.generateSummary(content)
    
    return {
      id: generateId(),
      content,
      metadata,
      summary,
      processedAt: new Date(),
      status: 'completed'
    }
  }
}
\`\`\`

### Database Schema
\`\`\`sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  author_id UUID REFERENCES users(id)
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  version_number INTEGER,
  content TEXT,
  changes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  author_id UUID REFERENCES users(id)
);
\`\`\`

## Performance Requirements
- **Response Time**: < 2 seconds for document processing
- **Throughput**: 1000+ documents per hour
- **Availability**: 99.9% uptime SLA
- **Scalability**: Horizontal scaling support

## Security Requirements
- **Authentication**: Multi-factor authentication support
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: End-to-end encryption for sensitive documents
- **Audit Trail**: Comprehensive logging and audit capabilities
- **Compliance**: GDPR, HIPAA, and SOC2 compliance

## Integration Requirements
- **API Gateway**: RESTful and GraphQL APIs
- **Webhook Support**: Real-time notifications and integrations
- **Third-party Services**: SharePoint, Confluence, Google Drive integration
- **Export Formats**: PDF, DOCX, HTML, JSON, XML

## Quality Assurance
- **Testing Strategy**: Unit, integration, and end-to-end testing
- **Code Coverage**: Minimum 80% test coverage
- **Performance Testing**: Load testing and stress testing
- **Security Testing**: Penetration testing and vulnerability assessment

## Deployment and Operations
- **Containerization**: Docker and Kubernetes deployment
- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring**: Application performance monitoring (APM)
- **Backup and Recovery**: Automated backup and disaster recovery

## Success Metrics
- **User Adoption**: 90% of target users actively using the system
- **Processing Efficiency**: 50% reduction in document processing time
- **Cost Savings**: 30% reduction in manual document processing costs
- **User Satisfaction**: 4.5+ star rating from user feedback

## Conclusion
The ADPA system represents a significant advancement in document processing automation, combining cutting-edge AI technology with robust engineering practices to deliver a scalable, secure, and user-friendly solution.`,
    author: "Project Manager",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T14:45:00Z",
    status: "published",
    project_id: projectId,
    project_name: "ADPA Development Project",
    word_count: 847,
    character_count: 5234,
    compression_ratio: 78,
    original_size: "3.2MB",
    compressed_size: "704KB",
    processing_time: "4.2s",
    ai_model: "GPT-4 Turbo",
    input_tokens: 2847,
    output_tokens: 1956,
    tags: ["requirements", "technical", "architecture", "ai", "automation"],
    source_documents: [
      { id: "src-1", title: "Business Requirements", type: "PDF" },
      { id: "src-2", title: "Technical Architecture", type: "DOCX" },
      { id: "src-3", title: "User Stories", type: "MD" },
      { id: "src-4", title: "API Specifications", type: "JSON" }
    ],
    comments: [
      {
        id: "comment-1",
        author: "Technical Lead",
        content: "The architecture section looks solid. Consider adding more details about the microservices communication patterns.",
        created_at: "2024-01-15T11:15:00Z"
      },
      {
        id: "comment-2",
        author: "Product Manager",
        content: "Great work on the requirements! The performance metrics are well-defined and achievable.",
        created_at: "2024-01-15T12:30:00Z"
      }
    ]
  }

  const mockVersions: VersionData[] = [
    {
      id: "v1",
      version: "1.0",
      created_at: "2024-01-15T10:30:00Z",
      author: "Project Manager",
      changes: "Initial document creation with basic requirements",
      word_count: 456
    },
    {
      id: "v2",
      version: "1.1",
      created_at: "2024-01-15T12:15:00Z",
      author: "Technical Lead",
      changes: "Added technical architecture and database schema",
      word_count: 723
    },
    {
      id: "v3",
      version: "1.2",
      created_at: "2024-01-15T14:45:00Z",
      author: "Project Manager",
      changes: "Enhanced with performance requirements and success metrics",
      word_count: 847
    }
  ]

  // Extract fetchDocument so it can be reused by saveEdit
  const fetchDocument = async () => {
    setIsLoading(true)
    try {
      // Fetch document from API (including drift data)
      const [documentResponse, versionsResponse, driftResponse] = await Promise.all([
        apiClient.get(`/projects/${projectId}/documents/${documentId}`),
        apiClient.get(`/projects/${projectId}/documents/${documentId}/versions`),
        apiClient.request<{ drifts: any[] }>(
          `/projects/${projectId}/drift-detections?limit=100`,
          { suppressNotFoundError: true } as Record<string, unknown>
        ).catch(() => ({ drifts: [] }))
      ])

      // Filter drifts for this specific document
      const documentDrifts = (driftResponse.drifts || []).filter((d: any) => d.source_document_id === documentId)
      setDrifts(documentDrifts)

      const documentData = documentResponse
      const versionsData = versionsResponse || []

      console.log('[DocumentView] Loaded document:', documentData)
      console.log('[DocumentView] Loaded versions count:', versionsData.length)
      console.log('[DocumentView] All versions with timestamps:', versionsData.map((v: any) => ({
        version: v.version,
        created_at: v.created_at,
        timestamp: new Date(v.created_at).getTime()
      })))

      // 🆕 Find the latest version (highest semantic version)
      let latestVersion = null
      if (versionsData.length > 0) {
        // Helper function to parse semantic version
        const parseVersion = (versionStr: string): [number, number, number] => {
          const parts = versionStr.split('.').map(p => parseInt(p, 10) || 0)
          return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
        }

        // Sort by semantic version DESC (highest version first)
        const sortedVersions = [...versionsData].sort((a: any, b: any) => {
          const [aMajor, aMinor, aPatch] = parseVersion(a.version)
          const [bMajor, bMinor, bPatch] = parseVersion(b.version)

          // Compare major, then minor, then patch
          if (bMajor !== aMajor) return bMajor - aMajor
          if (bMinor !== aMinor) return bMinor - aMinor
          return bPatch - aPatch
        })
        latestVersion = sortedVersions[0]
        console.log('[DocumentView] Sorted versions (highest first):', sortedVersions.map((v: any) => v.version))
        console.log('[DocumentView] Latest version selected:', latestVersion.version, 'created:', latestVersion.created_at)
      }

      // Use latest version's content if available, otherwise fall back to current document
      const dataToDisplay = latestVersion || documentData

      console.log('[DocumentView] Displaying version:', latestVersion ? latestVersion.version : 'current')
      console.log('[DocumentView] Version contents available:', versionsData.map((v: any) => ({
        version: v.version,
        hasContent: !!v.content,
        contentLength: v.content?.length || 0
      })))

      // Convert content to string if it's an object
      let contentString = ''
      if (typeof dataToDisplay.content === 'string') {
        contentString = dataToDisplay.content
      } else if (dataToDisplay.content && typeof dataToDisplay.content === 'object') {
        // Handle different content object formats
        if (dataToDisplay.content.text) {
          contentString = dataToDisplay.content.text
        } else if (dataToDisplay.content.markdown) {
          contentString = dataToDisplay.content.markdown
        } else {
          // Fallback: stringify the object
          contentString = JSON.stringify(dataToDisplay.content, null, 2)
        }
      }

      // Use template_name from document response (backend already provides it)
      if (documentData.template_name) {
        setTemplateName(documentData.template_name)
      } else if (documentData.template_id) {
        // Fallback: fetch template name if not included in response
        try {
          const templateResponse = await apiClient.get(`/templates/${documentData.template_id}`)
          setTemplateName(templateResponse.name || 'Unknown Template')
        } catch (error) {
          console.error('Failed to fetch template name:', error)
          setTemplateName('Unknown Template')
        }
      }

      // 🆕 Extract source_documents from metadata if available
      const sourceDocuments = dataToDisplay.metadata?.source_documents ||
        dataToDisplay.generation_metadata?.source_documents ||
        []

      setDocument({
        ...documentData, // Keep base document metadata (project_id, template_id, etc.)
        ...dataToDisplay, // Override with latest version's data
        content: contentString,
        source_documents: sourceDocuments, // Expose at top level for UI
        loaded_version: latestVersion ? latestVersion.version : null,
        loaded_version_id: latestVersion ? latestVersion.id : null
      })
      setVersions(versionsData)
      setEditedContent(contentString)
      setBaseContentSnapshot(contentString)
      setLatestContentSnapshot(contentString)

      // Extract TOC from real document content
      if (contentString) {
        extractTableOfContents(contentString)
      }
    } catch (error) {
      console.error("Failed to load document:", error)

      // Fallback to mock data if API fails (for development/demo purposes)
      setDocument(mockDocument)
      setVersions(mockVersions)
      setEditedContent(mockDocument.content)
      setBaseContentSnapshot(mockDocument.content)
      setLatestContentSnapshot(mockDocument.content)

      // Show error toast but don't break the UI
      toast.error("Failed to load document from API, showing demo data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocument()

    // Extract TOC when document loads
    if (mockDocument.content) {
      extractTableOfContents(mockDocument.content)
    }
  }, [projectId, documentId])

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

  // Stable callback for drift marker ToC regeneration
  const handleEnhancedContentReady = useCallback((enhancedContent: string) => {
    if (!enhancedContent) return

    if (showDriftHighlights && drifts.length > 0) {
      setLatestContentSnapshot(enhancedContent)
      extractTableOfContents(enhancedContent)
    }
  }, [showDriftHighlights, drifts, extractTableOfContents])

  // Recompute table of contents when toggling highlights off
  useEffect(() => {
    if (!showDriftHighlights) {
      if (baseContentSnapshot) {
        extractTableOfContents(baseContentSnapshot)
      }
    }
  }, [showDriftHighlights, baseContentSnapshot, extractTableOfContents])

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    console.log('[TOC] Attempting to scroll to:', sectionId)
    console.log('[TOC] Current TOC items:', tableOfContents.map(h => ({ id: h.id, text: h.text })))

    // Use window.document to avoid conflicts
    const element = window.document.getElementById(sectionId)

    if (element) {
      console.log('[TOC] ✅ Element found! Scrolling...')
      console.log('[TOC] Element position:', {
        top: element.getBoundingClientRect().top,
        scrollY: window.scrollY,
        offsetHeight: element.offsetHeight
      })

      // Use modern scrollIntoView with offset
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - 120 // 120px offset for header

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })

      setActiveSection(sectionId)
      console.log('[TOC] Scroll command sent')
    } else {
      console.warn('[TOC] ❌ Element not found with ID:', sectionId)
      console.log('[TOC] All element IDs on page:',
        Array.from(window.document.querySelectorAll('[id]')).map(el => el.id).filter(id => id.startsWith('heading-') || id.startsWith('drift-'))
      )

      // Fallback: Try to find by text content
      const allHeadings = Array.from(window.document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      const sectionText = tableOfContents.find(h => h.id === sectionId)?.text

      console.log('[TOC] Searching for heading with text:', sectionText)
      console.log('[TOC] All heading texts on page:', allHeadings.map(h => h.textContent?.trim()))

      if (sectionText) {
        // Try exact match first
        let matchingHeading = allHeadings.find(h =>
          h.textContent?.trim() === sectionText.trim()
        ) as HTMLElement | undefined

        // Try case-insensitive partial match if exact fails
        if (!matchingHeading) {
          matchingHeading = allHeadings.find(h =>
            h.textContent?.toLowerCase().includes(sectionText.toLowerCase())
          ) as HTMLElement | undefined
        }

        if (matchingHeading) {
          console.log('[TOC] ✅ Found heading by text content, scrolling...')
          matchingHeading.scrollIntoView({ behavior: 'smooth', block: 'start' })
          window.scrollBy({ top: -120, behavior: 'smooth' }) // Offset for sticky header
          setActiveSection(sectionId)
        } else {
          console.error('[TOC] ❌ Could not find heading by ID or text')
        }
      }
    }
  }

  // Scroll spy for active section tracking
  useEffect(() => {
    if (isEditing || tableOfContents.length === 0) return

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150

      for (let i = tableOfContents.length - 1; i >= 0; i--) {
        const heading = tableOfContents[i]
        const element = window.document.getElementById(heading.id)

        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(heading.id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [tableOfContents, isEditing])

  const handlePublishToConfluence = async () => {
    try {
      const resp = await apiClient.post(`/integrations/confluence/latest/export`, { documentId })
      const url = (resp as any)?.confluenceUrl || (resp as any)?.data?.confluenceUrl
      if (url) {
        toast.success('Published to Confluence')
      } else if ((resp as any)?.data?.error) {
        const r = (resp as any).data
        const hint = r.reason === 'space_not_configured' ? 'No project mapping or integration target space is set.'
          : r.reason === 'space_not_found' ? 'Space not found. Check Project Settings → Confluence Space Key or Integration Target Space Key.'
          : r.reason === 'not_authorized' ? 'Confluence rejected the request. Check API token permissions.'
          : r.reason === 'title_conflict' ? 'A page with this title already exists. Updated the existing page if found.'
          : 'See server logs.'
        toast.error(`Failed to publish to Confluence: ${r.error}. ${hint}`)
        return
      }
      if (url) {
        setConfluenceUrl(url)
        setDocument(prev => prev ? ({ ...(prev as any), confluence_page_url: url }) as any : prev)
      } else {
        toast.info('Export completed, but URL not returned. Check Confluence.')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Export failed'
      toast.error(`Failed to publish to Confluence: ${msg}`)
    }
  }

  const exportToPDF = () => {
    if (!document) return

    const pdf = new jsPDF()
    pdf.text(document.content, 10, 10, { maxWidth: 180 })
    pdf.save(`${document.title}.pdf`)
    toast.success("Document exported to PDF")
  }

  const exportToWord = async () => {
    if (!document) return

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: document.title,
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: document.content,
                size: 24,
              }),
            ],
          }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
    saveAs(blob, `${document.title}.docx`)
    toast.success("Document exported to Word")
  }

  const exportToMarkdown = () => {
    if (!document) return

    const blob = new Blob([document.content], { type: "text/markdown" })
    saveAs(blob, `${document.title}.md`)
    toast.success("Document exported to Markdown")
  }

  const copyToClipboard = () => {
    if (!document) return

    navigator.clipboard.writeText(document.content)
    toast.success("Document content copied to clipboard")
  }

  const shareDocument = () => {
    if (!document) return

    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: document.content.substring(0, 200) + "...",
        url: window.location.href,
      })
    } else {
      copyToClipboard()
    }
  }

  const saveEdit = async () => {
    if (!document) return

    try {
      // Save to the API
      const response = await apiClient.put(`/projects/${projectId}/documents/${documentId}`, {
        content: editedContent,
        title: document.title,
        tags: document.tags || []
      })

      toast.success("Document saved successfully! Refreshing...")
      setIsEditing(false)

      // 🔄 Reload document data to get new version number and updated metadata
      await fetchDocument()

      // Re-extract TOC from new content
      if (editedContent) {
        extractTableOfContents(editedContent)
      }
    } catch (error) {
      console.error("Failed to save document:", error)
      toast.error("Failed to save document")
    }
  }

  const cancelEdit = () => {
    if (!document) return
    setEditedContent(document.content)
    setIsEditing(false)
  }

  // Handle document regeneration
  const handleRegenerate = async (params: {
    templateId?: string
    provider: string
    model?: string
    versionType: 'patch' | 'minor' | 'major'
    temperature: number
    max_tokens?: number
  }) => {
    if (!documentId) return

    try {
      await regenerate({
        documentId,
        ...params
      })
    } catch (error) {
      console.error('Regeneration failed:', error)
    }
  }

  // Refresh document when regeneration completes
  useEffect(() => {
    const reloadAfterRegeneration = async () => {
      if (result && documentId && projectId) {
        try {
          // Reload document and versions
          const [documentResponse, versionsResponse] = await Promise.all([
            apiClient.get(`/projects/${projectId}/documents/${documentId}`),
            apiClient.get(`/projects/${projectId}/documents/${documentId}/versions`)
          ])

          const documentData = documentResponse
          const versionsData = versionsResponse || []

          // Convert content to string
          let contentString = ''
          if (typeof documentData.content === 'string') {
            contentString = documentData.content
          } else if (documentData.content && typeof documentData.content === 'object') {
            if (documentData.content.text) {
              contentString = documentData.content.text
            } else if (documentData.content.markdown) {
              contentString = documentData.content.markdown
            } else {
              contentString = JSON.stringify(documentData.content, null, 2)
            }
          }

          const sourceDocuments = documentData.metadata?.source_documents ||
            documentData.generation_metadata?.source_documents ||
            []

          setDocument({
            ...documentData,
            content: contentString,
            source_documents: sourceDocuments
          })
          setVersions(versionsData)
          setEditedContent(contentString)

          if (contentString) {
            extractTableOfContents(contentString)
          }

          toast.success('Document reloaded with new version!')
        } catch (error) {
          console.error('Failed to reload after regeneration:', error)
        }
      }
    }

    reloadAfterRegeneration()
  }, [result, documentId, projectId])

  const addComment = async () => {
    if (!newComment.trim() || !document) return

    try {
      // Save comment to the API
      const response = await apiClient.post(`/projects/${projectId}/documents/${documentId}/comments`, {
        content: newComment,
        author_id: user?.id
      })

      const newCommentObj = response.data

      setDocument({
        ...document,
        comments: [...(document.comments || []), newCommentObj]
      })
      setNewComment("")
      toast.success("Comment added successfully")
    } catch (error) {
      console.error("Failed to add comment:", error)
      toast.error("Failed to add comment")
    }
  }

  const fetchSummaries = async () => {
    setLoadingSummaries(true)
    setShowSummaries(true)

    try {
      const response = await apiClient.request(
        `/documents/${documentId}/summaries`
      )

      if (response.summaries) {
        setSummaries(response.summaries)
        if (response.summaries.length === 0) {
          toast.info("No cached summaries yet. They will be created when you run process-flow jobs.")
        } else {
          toast.success(`Found ${response.summaries.length} cached summaries!`)
        }
      }
    } catch (error) {
      console.error("Failed to fetch summaries:", error)
      toast.error("Failed to load summaries")
      setSummaries([])
    } finally {
      setLoadingSummaries(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading document...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">Document not found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden" style={{ scrollBehavior: 'smooth' }}>
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <PageTransition>
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/projects/${projectId}/documents`)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Documents
                      </Button>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{document.project_name}</span>
                        </div>
                        <h1 className="text-3xl font-bold">{document.title}</h1>
                        <p className="text-muted-foreground">
                          Project Document Viewer
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{document.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVersionsDialog(true)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        {(document as any).loaded_version
                          ? `v${(document as any).loaded_version} (${versions.length} versions)`
                          : `Versions (${versions.length})`
                        }
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comments ({document.comments?.length || 0})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchSummaries}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Summaries
                      </Button>
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-3 space-y-4">
                    {/* Drift Alerts Banner */}
                    {drifts.length > 0 && showDriftHighlights && (
                      <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <AlertTriangle className="h-6 w-6 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-orange-900">
                                  ⚠️ {drifts.length} Drift{drifts.length > 1 ? 's' : ''} Detected in This Document
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowDriftHighlights(false)}
                                  className="text-orange-700 hover:text-orange-900"
                                >
                                  Hide
                                </Button>
                              </div>
                              <p className="text-sm text-orange-800 mb-3">
                                This document contains content that deviates from the approved baseline.
                              </p>
                              <div className="space-y-2">
                                {drifts.slice(0, 3).map((drift: any) => (
                                  <div key={drift.id} className="p-3 bg-white border border-orange-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        {drift.detection_type.replace(/_/g, ' ').toUpperCase()}
                                      </Badge>
                                      <Badge variant={drift.drift_severity === 'high' ? 'destructive' : 'secondary'}>
                                        {drift.drift_severity}
                                      </Badge>
                                    </div>
                                    <p className="text-sm font-medium text-orange-900">{drift.drift_description}</p>
                                  </div>
                                ))}
                                {drifts.length > 3 && (
                                  <p className="text-xs text-orange-700 text-center py-1">
                                    + {drifts.length - 3} more drifts
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => router.push(`/projects/${projectId}/drift`)}
                                className="mt-3 bg-orange-600 hover:bg-orange-700 text-white"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View All in Drift Management Center
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {drifts.length > 0 && !showDriftHighlights && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDriftHighlights(true)}
                        className="border-orange-300 text-orange-700"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Show {drifts.length} Drift Alert{drifts.length > 1 ? 's' : ''}
                      </Button>
                    )}

                    <AnimatedCard>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>Document Content</span>
                            {drifts.length > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {drifts.length} Drift{drifts.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            {!isEditing ? (
                              <>
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </Button>
                                <Button variant="outline" size="sm" onClick={shareDocument}>
                                  <Share className="h-4 w-4 mr-2" />
                                  Share
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowRegenerateModal(true)}
                                  disabled={isRegenerating}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Create new Version
                                </Button>
                                <Link href={`/projects/${projectId}/documents/${documentId}`}>
                                  <Button variant="default" size="sm">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Metadata
                                  </Button>
                                </Link>
                              </>
                            ) : (
                              <>
                                <DocumentEntityEditor
                                  projectId={projectId}
                                  documentContent={editedContent}
                                  onContentChange={setEditedContent}
                                />
                                <Button variant="outline" size="sm" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={saveEdit}>
                                  Save Changes
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8">
                        {!isEditing ? (
                          <DriftHighlighter
                            content={typeof document.content === 'string' ? document.content : JSON.stringify(document.content, null, 2)}
                            drifts={drifts}
                            showHighlights={showDriftHighlights}
                            onEnhancedContentReady={handleEnhancedContentReady}
                          />
                        ) : (
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full min-h-[600px] max-h-[800px] p-6 border-2 rounded-lg font-mono text-sm resize-y focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            placeholder="Edit document content in Markdown format..."
                            style={{ height: 'calc(100vh - 400px)' }}
                          />
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </div>

                  {/* Sidebar - Sticky */}
                  <div className="space-y-6 sticky top-6 self-start">
                    {/* Table of Contents */}
                    {!isEditing && tableOfContents.length > 0 && (
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>Table of Contents</span>
                          </CardTitle>
                          <CardDescription>
                            Click to jump to section
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <nav className="space-y-1">
                            {tableOfContents.map((heading) => (
                              <button
                                key={heading.id}
                                onClick={() => scrollToSection(heading.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${activeSection === heading.id
                                  ? 'bg-primary text-primary-foreground font-medium'
                                  : heading.isDrift
                                    ? (heading.level === 4
                                      ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 border-l-4 border-red-500'
                                      : 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 border-l-4 border-yellow-400')
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                  } ${heading.isDrift
                                    ? 'font-semibold ml-6'
                                    : heading.level === 1 ? 'font-semibold' :
                                      heading.level === 2 ? 'ml-3' :
                                        heading.level === 3 ? 'ml-6 text-xs' :
                                          heading.level === 4 ? 'ml-9 text-xs' :
                                            'ml-12 text-xs'
                                  }`}
                              >
                                {heading.isDrift && (
                                  <AlertTriangle className="inline-block h-3 w-3 mr-1 -mt-0.5" />
                                )}
                                {heading.text}
                              </button>
                            ))}
                          </nav>
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Document Information */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>Document Information</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Author</p>
                            <p className="text-sm text-muted-foreground">{document.author || 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Created</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(document.created_at).toLocaleDateString()} at {new Date(document.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Last Updated</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(document.updated_at).toLocaleDateString()} at {new Date(document.updated_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">File Information</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Version:</span>
                              <span className="font-medium font-mono">
                                v{(document as any).loaded_version || (versions.length > 0 ? versions[versions.length - 1].version : ((document as any).version || '1.0'))}
                              </span>
                            </div>
                            {((document as any).template_id || templateName) && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Template:</span>
                                <span className="font-medium">{templateName || 'Loading...'}</span>
                              </div>
                            )}
                            {(document as any).framework && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Framework:</span>
                                <span className="font-medium">{(document as any).framework}</span>
                              </div>
                            )}
                            {(document as any).status && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="outline" className="text-xs">
                                  {(document as any).status}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Content Statistics</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Words:</span>
                              <span className="ml-2 font-medium">
                                {(document.word_count ||
                                  (document as any).generation_metadata?.contentMetrics?.words ||
                                  0).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Characters:</span>
                              <span className="ml-2 font-medium">
                                {(document.character_count ||
                                  (document as any).generation_metadata?.contentMetrics?.characters ||
                                  0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {document.tags && document.tags.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Tags</p>
                              <div className="flex flex-wrap gap-1">
                                {document.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </AnimatedCard>

                    {/* AI Processing Metrics */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5" />
                          <span>AI Processing Metrics</span>
                        </CardTitle>
                        <CardDescription>
                          How this document was generated
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Provider & Model</p>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Provider:</span>
                              <span className="font-medium">
                                {(document as any).generation_metadata?.aiProcessing?.provider ||
                                  (document as any).metadata?.ai_usage?.provider_used ||
                                  'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Model:</span>
                              <span className="font-medium">
                                {(document as any).generation_metadata?.aiProcessing?.model ||
                                  (document as any).metadata?.ai_usage?.model_used ||
                                  document.ai_model || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Temperature:</span>
                              <span className="font-medium">
                                {(document as any).generation_metadata?.aiProcessing?.temperature || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Token Usage</p>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Input Tokens:</span>
                              <span className="font-medium">
                                {(document as any).generation_metadata?.aiProcessing?.tokens?.input ||
                                  document.input_tokens || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Output Tokens:</span>
                              <span className="font-medium">
                                {(document as any).generation_metadata?.aiProcessing?.tokens?.output ||
                                  document.output_tokens || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Tokens:</span>
                              <span className="font-medium text-primary">
                                {(document as any).generation_metadata?.aiProcessing?.tokens?.total ||
                                  ((document.input_tokens || 0) + (document.output_tokens || 0)) || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Est. Cost:</span>
                              <span className="font-medium text-green-600">
                                {(document as any).generation_metadata?.aiProcessing?.tokens?.cost || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Performance</p>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Processing Time:</span>
                              <span className="font-medium">
                                {(document as any).generation_metadata?.aiProcessing?.processingTime ||
                                  (document as any).generation_metadata?.generation?.durationFormatted ||
                                  ((document as any).generation_metadata?.generation?.duration ?
                                    `${((document as any).generation_metadata.generation.duration / 1000).toFixed(2)}s` :
                                    'N/A')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant="secondary" className="text-xs">
                                {(document as any).generation_metadata?.generation?.status || 'unknown'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* Quality Metrics */}
                    {(document as any).generation_metadata?.qualityMetrics && (
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Award className="h-5 w-5" />
                            <span>Quality Metrics</span>
                          </CardTitle>
                          <CardDescription>
                            AI-analyzed document quality indicators
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Overall Quality</p>
                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-bold text-primary">
                                {(document as any).generation_metadata.qualityMetrics.overallQuality ||
                                  (document as any).generation_metadata.qualityMetrics.overall || 0}%
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-sm px-3 py-1"
                              >
                                {(() => {
                                  const score = (document as any).generation_metadata.qualityMetrics.overallQuality ||
                                    (document as any).generation_metadata.qualityMetrics.overall || 0
                                  if (score >= 90) return 'A (Excellent)'
                                  if (score >= 80) return 'B (Good)'
                                  if (score >= 70) return 'C (Fair)'
                                  if (score >= 60) return 'D (Poor)'
                                  return 'F (Needs Improvement)'
                                })()}
                              </Badge>
                            </div>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Detailed Scores</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Completeness</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 transition-all"
                                      style={{ width: `${(document as any).generation_metadata.qualityMetrics.completeness || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-12 text-right">
                                    {(document as any).generation_metadata.qualityMetrics.completeness || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Structure</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500 transition-all"
                                      style={{ width: `${(document as any).generation_metadata.qualityMetrics.structureScore || (document as any).generation_metadata.qualityMetrics.structure || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-12 text-right">
                                    {(document as any).generation_metadata.qualityMetrics.structureScore || (document as any).generation_metadata.qualityMetrics.structure || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Formatting & Style</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-purple-500 transition-all"
                                      style={{ width: `${(document as any).generation_metadata.qualityMetrics.formattingScore || (document as any).generation_metadata.qualityMetrics.formatting || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-12 text-right">
                                    {(document as any).generation_metadata.qualityMetrics.formattingScore || (document as any).generation_metadata.qualityMetrics.formatting || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Content Depth</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-orange-500 transition-all"
                                      style={{ width: `${(document as any).generation_metadata.qualityMetrics.contentDepth || (document as any).generation_metadata.qualityMetrics.depth || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-12 text-right">
                                    {(document as any).generation_metadata.qualityMetrics.contentDepth || (document as any).generation_metadata.qualityMetrics.depth || 0}%
                                  </span>
                                </div>
                              </div>

                              {/* New Dimensions 5-9 */}
                              {(document as any).generation_metadata.qualityMetrics.accuracy !== undefined && (
                                <>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Accuracy</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-indigo-500 transition-all"
                                          style={{ width: `${(document as any).generation_metadata.qualityMetrics.accuracy}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-12 text-right">
                                        {(document as any).generation_metadata.qualityMetrics.accuracy}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Consistency</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-teal-500 transition-all"
                                          style={{ width: `${(document as any).generation_metadata.qualityMetrics.consistency}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-12 text-right">
                                        {(document as any).generation_metadata.qualityMetrics.consistency}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Context Relevance</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-cyan-500 transition-all"
                                          style={{ width: `${(document as any).generation_metadata.qualityMetrics.contextRelevance}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-12 text-right">
                                        {(document as any).generation_metadata.qualityMetrics.contextRelevance}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Professional Quality</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-pink-500 transition-all"
                                          style={{ width: `${(document as any).generation_metadata.qualityMetrics.professionalQuality}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-12 text-right">
                                        {(document as any).generation_metadata.qualityMetrics.professionalQuality}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Standards Compliance</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-emerald-500 transition-all"
                                          style={{ width: `${(document as any).generation_metadata.qualityMetrics.standardsCompliance}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-12 text-right">
                                        {(document as any).generation_metadata.qualityMetrics.standardsCompliance}%
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Complexity Score with Time Estimate */}
                          {(document as any).generation_metadata.qualityMetrics.complexityScore !== undefined && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Manual Creation Estimate</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Complexity Score</span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-red-500 transition-all"
                                        style={{ width: `${(document as any).generation_metadata.qualityMetrics.complexityScore}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium w-12 text-right">
                                      {(document as any).generation_metadata.qualityMetrics.complexityScore}%
                                    </span>
                                  </div>
                                </div>

                                {/* Time Estimate Card with Research Breakdown */}
                                {(() => {
                                  const complexity = (document as any).generation_metadata.qualityMetrics.complexityScore || 0
                                  const research = (document as any).generation_metadata?.researchComplexity

                                  let level = 'Simple'
                                  let writingTime = '2-4 hours'
                                  let color = 'text-green-600'
                                  let bgColor = 'bg-green-50'
                                  let borderColor = 'border-green-200'

                                  if (complexity >= 76) {
                                    level = 'Very Complex'
                                    writingTime = '2-4 days (16-32 hours)'
                                    color = 'text-red-600'
                                    bgColor = 'bg-red-50'
                                    borderColor = 'border-red-200'
                                  } else if (complexity >= 51) {
                                    level = 'Complex'
                                    writingTime = '1-2 days (8-16 hours)'
                                    color = 'text-orange-600'
                                    bgColor = 'bg-orange-50'
                                    borderColor = 'border-orange-200'
                                  } else if (complexity >= 26) {
                                    level = 'Moderate'
                                    writingTime = '4-8 hours'
                                    color = 'text-yellow-600'
                                    bgColor = 'bg-yellow-50'
                                    borderColor = 'border-yellow-200'
                                  }

                                  // Calculate research time based on source documents
                                  const sourceDocCount = research?.sourceDocuments || 0
                                  const readingTimeHours = research?.estimatedReadingTimeHours || 0
                                  const readingTimeDisplay = readingTimeHours >= 8
                                    ? `${Math.round(readingTimeHours / 8)} day${readingTimeHours >= 16 ? 's' : ''}`
                                    : `${Math.round(readingTimeHours)} hour${readingTimeHours !== 1 ? 's' : ''}`

                                  return (
                                    <div className={`p-3 ${bgColor} rounded-lg border ${borderColor} mt-2`}>
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-muted-foreground">Complexity Level:</span>
                                        <span className={`text-sm font-semibold ${color}`}>{level}</span>
                                      </div>

                                      {sourceDocCount > 0 && (
                                        <div className="space-y-1 mb-2 pb-2 border-b">
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
                                      )}

                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-medium text-muted-foreground">Total Manual Effort:</span>
                                        <span className={`text-sm font-bold ${color}`}>
                                          {sourceDocCount > 0 ? `${readingTimeDisplay} + ${writingTime}` : writingTime}
                                        </span>
                                      </div>

                                      <div className="text-xs text-muted-foreground italic pt-2 border-t">
                                        ⚡ Time savings: AI generated in {(document as any).generation_metadata?.generation?.duration || 'N/A'}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </>
                          )}
                          {(document as any).generation_metadata.qualityMetrics.recommendations?.length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Recommendations</p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {(document as any).generation_metadata.qualityMetrics.recommendations.map((rec: string, idx: number) => (
                                    <li key={idx} className="flex items-start space-x-2">
                                      <span className="text-blue-500 mt-0.5">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Content Metrics */}
                    {((document as any).word_count || (document as any).generation_metadata?.contentMetrics) && (
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>Content Metrics</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Word Count:</span>
                              <span className="font-medium">
                                {((document as any).word_count || (document as any).generation_metadata?.contentMetrics?.words || 0).toLocaleString('en-US')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Characters:</span>
                              <span className="font-medium">
                                {((document as any).character_count || (document as any).generation_metadata?.contentMetrics?.characters || 0).toLocaleString('en-US')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sentences:</span>
                              <span className="font-medium">
                                {(() => {
                                  const sc = (document as any).sentence_count || (document as any).generation_metadata?.contentMetrics?.sentences || 0
                                  return sc > 0 ? sc.toLocaleString('en-US') : 'N/A'
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Paragraphs:</span>
                              <span className="font-medium">
                                {(() => {
                                  const pc = (document as any).paragraph_count || (document as any).generation_metadata?.contentMetrics?.paragraphs || 0
                                  return pc > 0 ? pc.toLocaleString('en-US') : 'N/A'
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Words/Sentence:</span>
                              <span className="font-medium">
                                {(() => {
                                  // Try pre-calculated value first
                                  const preCalc = (document as any).generation_metadata?.contentMetrics?.avgWordsPerSentence
                                  if (preCalc && preCalc !== 'N/A') return preCalc

                                  // Otherwise calculate it
                                  const wc = (document as any).word_count || (document as any).generation_metadata?.contentMetrics?.wordCount || 0
                                  const sc = (document as any).sentence_count || (document as any).generation_metadata?.contentMetrics?.sentenceCount || 0
                                  return (wc > 0 && sc > 0) ? (wc / sc).toFixed(1) : 'N/A'
                                })()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Export Options */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Download className="h-5 w-5" />
                          <span>Export Options</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(document as any)?.confluence_page_url ? (
                          <Button asChild variant="default" className="w-full justify-start">
                            <a href={(document as any).confluence_page_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View in Confluence
                            </a>
                          </Button>
                        ) : (
                          <Button variant="default" className="w-full justify-start" onClick={handlePublishToConfluence}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Publish to Confluence
                          </Button>
                        )}

                        <Button variant="outline" className="w-full justify-start" onClick={exportToPDF}>
                          <Download className="h-4 w-4 mr-2" />
                          Export as PDF
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={exportToWord}>
                          <Download className="h-4 w-4 mr-2" />
                          Export as Word
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={exportToMarkdown}>
                          <Download className="h-4 w-4 mr-2" />
                          Export as Markdown
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Settings className="h-4 w-4 mr-2" />
                          Print Document
                        </Button>
                      </CardContent>
                    </AnimatedCard>

                    {/* Context Statistics */}
                    {(document as any).metadata?.context_stats && (
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5" />
                            <span>Context Statistics</span>
                          </CardTitle>
                          <CardDescription>
                            What context was used to generate this document
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Documents in Project:</span>
                              <span className="font-medium">
                                {(document as any).metadata.context_stats.total_documents_available}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Used as Context:</span>
                              <span className="font-medium text-primary">
                                {(document as any).metadata.context_stats.documents_used_as_context}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Stakeholders Available:</span>
                              <span className="font-medium">
                                {(document as any).metadata.context_stats.stakeholders_available}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Custom Settings:</span>
                              <span className="font-medium">
                                {(document as any).metadata.context_stats.custom_settings_count}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Custom Metadata:</span>
                              <span className="font-medium">
                                {(document as any).metadata.context_stats.custom_metadata_count}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Context Tokens:</span>
                              <span className="font-medium text-blue-600">
                                ~{(document as any).metadata.context_stats.estimated_context_tokens?.toLocaleString() || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Source Documents */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <ExternalLink className="h-5 w-5" />
                          <span>Source Documents</span>
                        </CardTitle>
                        <CardDescription>
                          Documents used as context during generation
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(document.source_documents || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              No source documents - this was the first document generated or no context was available.
                            </p>
                          ) : (
                            (document.source_documents || []).map((doc: any, idx: number) => (
                              <div key={doc.id || doc.title || idx} className="flex items-center justify-between p-3 rounded border hover:bg-accent transition-colors">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    {doc.priority_rank || idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <p className="text-sm font-medium">{doc.title}</p>
                                      {doc.status && (
                                        <Badge variant="secondary" className="text-xs">
                                          {doc.status}
                                        </Badge>
                                      )}
                                      {doc.phase_name && doc.phase_name !== 'Other' && (
                                        <Badge variant="outline" className="text-xs">
                                          Phase {doc.lifecycle_phase}: {doc.phase_name}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{doc.type}</p>
                                  </div>
                                </div>
                                <Link href={doc.url || `/projects/${projectId}/documents/${doc.id}/view`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </div>
                </div>

                {/* Version History */}
                {showVersions && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <History className="h-5 w-5" />
                          <span>Version History</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(versions || []).map((version) => (
                            <div key={version.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-4">
                                <Badge variant="outline">v{version.version}</Badge>
                                <div>
                                  <p className="font-medium">{version.changes}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {version.author} • {new Date(version.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">
                                  {version.word_count} words
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedVersion(version)
                                    setShowVersionDialog(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}

                {/* Comments Section */}
                {showComments && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <MessageSquare className="h-5 w-5" />
                          <span>Comments ({(document.comments || []).length})</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {(document.comments || []).map((comment) => (
                            <div key={comment.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{comment.author}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          ))}

                          {/* Add Comment Form */}
                          <div className="p-4 border rounded-lg">
                            <div className="space-y-2">
                              <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full p-2 border rounded-lg text-sm"
                                rows={3}
                              />
                              <div className="flex justify-end">
                                <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
                                  Add Comment
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}
              </div>
            </AnimatedLayout>
          </PageTransition>
        </main>
      </div>

      {/* Summaries Dialog */}
      <Dialog open={showSummaries} onOpenChange={setShowSummaries}>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Document Summaries - {document?.title}
            </DialogTitle>
            <DialogDescription>
              View cached AI-generated summaries at different compression levels. These are reused in process-flow jobs to save time and API costs.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {loadingSummaries ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading summaries...</p>
                </div>
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Summaries Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Summaries will be automatically created when you run process-flow jobs with AI compression.
                </p>
                <p className="text-sm text-muted-foreground">
                  Once created, they'll be cached and reused to save time (~60s AI call becomes instant!)
                </p>
              </div>
            ) : (
              <Tabs defaultValue={summaries[0]?.compression_level?.toString() || "0.2"} className="w-full">
                <TabsList className="grid grid-cols-auto gap-2 mb-4" aria-label="Document summary compression levels">
                  {Array.from(new Set(summaries.map(s => s.compression_level)))
                    .sort((a, b) => a - b)
                    .map((level) => (
                      <TabsTrigger key={level} value={level.toString()}>
                        {(level * 100).toFixed(0)}% Compression
                      </TabsTrigger>
                    ))}
                </TabsList>

                {Array.from(new Set(summaries.map(s => s.compression_level))).map((level) => {
                  const summary = summaries.find(s => s.compression_level === level)
                  if (!summary) return null

                  return (
                    <TabsContent key={level} value={level.toString()} className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Summary Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Compression Level</p>
                            <p className="text-2xl font-bold">{(summary.compression_level * 100).toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Original Tokens</p>
                            <p className="text-2xl font-bold">{summary.original_tokens.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Compressed Tokens</p>
                            <p className="text-2xl font-bold">{summary.compressed_tokens.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Times Reused</p>
                            <p className="text-2xl font-bold text-green-600">{summary.times_reused || 0}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Compressed Content</CardTitle>
                            <div className="flex items-center gap-2">
                              {summary.ai_provider && (
                                <Badge variant="outline">
                                  {summary.ai_provider}
                                </Badge>
                              )}
                              {summary.is_valid ? (
                                <Badge variant="default" className="bg-green-600">Valid</Badge>
                              ) : (
                                <Badge variant="destructive">Invalid</Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                              >
                                {summary.compressed_content}
                              </ReactMarkdown>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Created:</span>{' '}
                              {new Date(summary.created_at).toLocaleString()}
                            </div>
                            {summary.last_reused_at && (
                              <div>
                                <span className="font-medium">Last Reused:</span>{' '}
                                {new Date(summary.last_reused_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )
                })}
              </Tabs>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Regeneration Modal */}
      <RegenerateVersionModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        documentId={documentId}
        currentTemplate={document?.template_id}
        currentTemplateName={document?.template_name || (document as any)?.metadata?.templateName}
        currentVersion={document?.version?.toString() || '1.0'}
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
        documentId={documentId}
      />

      {/* Version List Dialog */}
      <VersionListDialog
        open={showVersionsDialog}
        onOpenChange={setShowVersionsDialog}
        versions={versions}
        documentName={document?.name}
        loadedVersionId={(document as any)?.loaded_version_id}
        onLoadVersion={(version) => {
          // Load selected version into the main view with all metadata
          setDocument({
            ...document!,
            content: version.content,
            version: parseFloat(version.version),
            word_count: version.word_count || 0,
            // Preserve version metadata
            generation_metadata: version.metadata || {},
            // Add version tracking
            loaded_version: version.version,
            loaded_version_id: version.id
          } as any)
          setEditedContent(version.content)
          extractTableOfContents(version.content)

          // Show success with metadata info
          const metaInfo = version.metadata?.provider
            ? ` (Generated with ${version.metadata.provider}${version.metadata.model ? ` - ${version.metadata.model}` : ''})`
            : ''
          toast.success(`Loaded version ${version.version}${metaInfo}`)
        }}
      />

      {/* Version Viewer Dialog (standalone - for inline history) */}
      <VersionViewerDialog
        open={showVersionDialog}
        onOpenChange={setShowVersionDialog}
        version={selectedVersion}
        documentName={document?.name}
      />
    </div>
  )
}
