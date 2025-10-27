"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  Download as FileDown,
  Settings,
  History,
  Star,
  Sparkles,
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { RegenerateVersionModal } from "@/components/documents/RegenerateVersionModal"
import { RegenerationProgress } from "@/components/documents/RegenerationProgress"
import { useDocumentRegeneration } from "@/hooks/use-document-regeneration"
// @ts-ignore
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
// @ts-ignore
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, TextRun } from "docx"
// @ts-ignore
import { saveAs } from "file-saver"

interface DocumentData {
  id: string
  title: string
  content: string
  author: string
  created_at: string
  updated_at: string
  status: string
  project_id?: string
  metadata?: {
    generatedAt: Date
    compressionStats: CompressionStats
    sourceDocuments: string[]
    workflowId: string
    templateId: string
    projectId: string
  }
}

interface CompressionStats {
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  method: string
}

interface DocumentVersion {
  id: string
  version: number
  content: string
  changes_summary: string
  created_at: string
  created_by: string
}

export default function DocumentViewerPage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [showMetadata, setShowMetadata] = useState(true)
  const [showVersions, setShowVersions] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showTableOfContents, setShowTableOfContents] = useState(false)
  const [tableOfContents, setTableOfContents] = useState<Array<{id: string, title: string, level: number}>>([])
  const [readingMode, setReadingMode] = useState<'normal' | 'focus' | 'print'>('normal')
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base')
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('normal')
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  
  // Document regeneration hook
  const { regenerate, progress, isRegenerating, error: regenerationError, result, reset: resetRegeneration } = useDocumentRegeneration()

  useEffect(() => {
    if (documentId && user) {
      fetchDocument()
    }
  }, [documentId, user])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      const response = await apiClient.request<{
        document: DocumentData
      }>(`/documents/${documentId}`)
      
      if (response.document) {
        setDocument(response.document)
        setEditedContent(response.document.content)
        // Fetch versions using the project ID from the document
        if (response.document.project_id) {
          fetchVersions(response.document.project_id)
        }
      } else {
        // Fallback to mock data for demonstration
        const mockDocument: DocumentData = {
          id: documentId,
          title: "Enterprise Security Architecture",
          content: `# Enterprise Security Architecture

## Overview
This document outlines the comprehensive security architecture for our enterprise systems, focusing on defense-in-depth strategies and zero-trust principles.

## Security Domains

### 1. Identity and Access Management
- Multi-factor authentication requirements
- Role-based access control (RBAC)
- Privileged access management (PAM)

### 2. Network Security
- Network segmentation strategies
- Firewall configurations
- Intrusion detection and prevention

### 3. Data Protection
- Data classification framework
- Encryption standards
- Data loss prevention (DLP)

### 4. Application Security
- Secure development lifecycle
- Code review processes
- Vulnerability management

## Implementation Timeline
- **Phase 1**: Identity and Access Management (Q1 2024)
- **Phase 2**: Network Security Enhancements (Q2 2024)
- **Phase 3**: Data Protection Implementation (Q3 2024)
- **Phase 4**: Application Security Integration (Q4 2024)

## Compliance Requirements
- SOC 2 Type II
- ISO 27001
- GDPR compliance
- Industry-specific regulations

## Code Example
\`\`\`typescript
interface SecurityConfig {
  encryption: {
    algorithm: 'AES-256'
    keyRotation: '90 days'
  }
  authentication: {
    mfa: true
    sessionTimeout: '30 minutes'
  }
}
\`\`\`

## Risk Assessment Matrix

| Risk Level | Probability | Impact | Mitigation |
|------------|-------------|--------|------------|
| High       | Medium      | High   | Immediate action required |
| Medium     | Low         | Medium | Monitor and review |
| Low        | Low         | Low    | Accept with monitoring |

## Conclusion
This security architecture provides a comprehensive framework for protecting our enterprise assets while maintaining operational efficiency and regulatory compliance.`,
          author: "John Smith",
          created_at: "2024-01-15T10:00:00Z",
          updated_at: new Date().toISOString(),
          status: "published",
          metadata: {
            generatedAt: new Date("2024-01-15T10:00:00Z"),
            compressionStats: {
              originalTokens: 15000,
              compressedTokens: 12000,
              compressionRatio: 0.8,
              method: "ai-summarize"
            },
            sourceDocuments: [
              "Security Requirements Document",
              "Network Architecture Spec",
              "Compliance Checklist"
            ],
            workflowId: "wf-123",
            templateId: "template-security",
            projectId: "project-enterprise"
          }
        }
        setDocument(mockDocument)
        setEditedContent(mockDocument.content)
      }
    } catch (error) {
      console.error("Failed to fetch document:", error)
      toast.error("Failed to load document")
    } finally {
      setLoading(false)
    }
  }

  const fetchVersions = async (projectId?: string) => {
    if (!projectId) return
    
    try {
      const response = await apiClient.request<DocumentVersion[]>(`/projects/${projectId}/documents/${documentId}/versions`)
      
      if (response && Array.isArray(response)) {
        setVersions(response)
      } else {
        // Mock versions for demonstration
        const mockVersions: DocumentVersion[] = [
          {
            id: "v1",
            version: 1,
            content: "Initial version",
            changes_summary: "Initial document creation",
            created_at: "2024-01-15T10:00:00Z",
            created_by: "John Smith"
          },
          {
            id: "v2",
            version: 2,
            content: "Updated security requirements",
            changes_summary: "Added new compliance requirements and updated risk matrix",
            created_at: "2024-01-20T14:30:00Z",
            created_by: "Sarah Johnson"
          }
        ]
        setVersions(mockVersions)
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error)
    }
  }

  const handleSave = async () => {
    if (!document || !documentId || !editedContent) return
    
    try {
      const response = await apiClient.request(`/documents/${documentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: editedContent,
          changes_summary: "Updated document content"
        })
      })
      
      if ((response as any).message) {
        setDocument(prev => prev ? { ...prev, content: editedContent, updated_at: new Date().toISOString() } : null)
        setIsEditing(false)
        toast.success("Document saved successfully")
      }
    } catch (error) {
      console.error("Failed to save document:", error)
      toast.error("Failed to save document")
    }
  }

  const handleExport = async (format: 'pdf' | 'docx' | 'md') => {
    if (!document || !document.content) {
      toast.error("No document content to export")
      return
    }

    try {
      switch (format) {
        case 'pdf':
          await exportToPDF(document)
          break
        case 'docx':
          await exportToDocx(document)
          break
        case 'md':
          await exportToMarkdown(document)
          break
      }
      toast.success(`Document exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error)
      toast.error(`Failed to export as ${format.toUpperCase()}`)
    }
  }

  const exportToPDF = async (doc: DocumentData) => {
    if (!doc.content) {
      throw new Error("No content to export")
    }

    const pdf = new jsPDF()
    
    // Add title
    pdf.setFontSize(20)
    pdf.text(doc.title || 'Untitled Document', 20, 30)
    
    // Add metadata
    pdf.setFontSize(12)
    pdf.text(`Author: ${doc.author || 'Unknown'}`, 20, 50)
    pdf.text(`Created: ${new Date(doc.created_at).toLocaleDateString()}`, 20, 60)
    pdf.text(`Updated: ${new Date(doc.updated_at).toLocaleDateString()}`, 20, 70)
    
    // Add content (simplified - in production, you'd want proper markdown to PDF conversion)
    pdf.setFontSize(10)
    const lines = doc.content.split('\n')
    let yPosition = 90
    
    lines.forEach(line => {
      if (yPosition > 280) {
        pdf.addPage()
        yPosition = 20
      }
      pdf.text(line.substring(0, 80), 20, yPosition)
      yPosition += 10
    })
    
    pdf.save(`${doc.title || 'document'}.pdf`)
  }

  const exportToDocx = async (doc: DocumentData) => {
    if (!doc.content) {
      throw new Error("No content to export")
    }

    const docxDoc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: doc.title || 'Untitled Document',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Author: ${doc.author || 'Unknown'}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Created: ${new Date(doc.created_at).toLocaleDateString()}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: doc.content,
                size: 24,
              }),
            ],
          }),
        ],
      }],
    })
    
    const buffer = await Packer.toBuffer(docxDoc)
    saveAs(new Blob([buffer as any]), `${doc.title || 'document'}.docx`)
  }

  const exportToMarkdown = async (doc: DocumentData) => {
    if (!doc.content) {
      throw new Error("No content to export")
    }

    const markdownContent = `# ${doc.title || 'Untitled Document'}

**Author:** ${doc.author || 'Unknown'}  
**Created:** ${new Date(doc.created_at).toLocaleDateString()}  
**Updated:** ${new Date(doc.updated_at).toLocaleDateString()}  
**Status:** ${doc.status || 'Unknown'}

---

${doc.content}
`
    
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    saveAs(blob, `${doc.title || 'document'}.md`)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard")
  }

  const handlePrint = () => {
    window.print()
  }

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    toast.success(isBookmarked ? "Bookmark removed" : "Document bookmarked")
  }

  // Generate table of contents from markdown content
  const generateTableOfContents = (content: string | null | undefined) => {
    // Add null/undefined checks
    if (!content || typeof content !== 'string') {
      setTableOfContents([])
      return
    }

    try {
      const lines = content.split('\n')
      const toc: Array<{id: string, title: string, level: number}> = []
      
      lines.forEach((line, index) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/)
        if (match) {
          const level = match[1].length
          const title = match[2].trim()
          const id = `heading-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          toc.push({ id, title, level })
        }
      })
      
      setTableOfContents(toc)
    } catch (error) {
      console.error('Error generating table of contents:', error)
      setTableOfContents([])
    }
  }

  // Auto-save functionality
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (document && document.content) {
      generateTableOfContents(document.content)
    } else {
      setTableOfContents([])
    }
  }, [document])

  // Refresh versions when regeneration completes
  useEffect(() => {
    if (result && document?.project_id) {
      fetchVersions(document.project_id)
    }
  }, [result, document])

  // Auto-save effect
  useEffect(() => {
    if (!autoSaveEnabled || !isEditing || !editedContent || !document) return

    const timer = setTimeout(async () => {
      if (editedContent !== document.content) {
        await handleAutoSave()
      }
    }, 3000) // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timer)
  }, [editedContent, isEditing, autoSaveEnabled, document])

  const handleAutoSave = async () => {
    if (!document || !documentId || isSaving || !editedContent) return
    
    setIsSaving(true)
    try {
      const response = await apiClient.request(`/documents/${documentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: editedContent,
          changes_summary: "Auto-saved changes"
        })
      })
      
      if ((response as any).message) {
        setLastSaved(new Date())
        setDocument(prev => prev ? { ...prev, content: editedContent, updated_at: new Date().toISOString() } : null)
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerate = async (params: {
    templateId?: string
    provider: string
    model?: string
    versionType: 'patch' | 'minor' | 'major'
    temperature: number
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

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
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
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h1>
              <p className="text-gray-600 mb-6">The document you're looking for doesn't exist or has been deleted.</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <PageTransition>
              <AnimatedLayout>
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between mb-6"
                >
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.back()}
                      className="flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </Button>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{document.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(document.created_at).toLocaleDateString()}</span>
                        </div>
                        <Badge variant={document.status === 'published' ? 'default' : 'secondary'}>
                          <span>{document.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Reading Mode Controls */}
                    <div className="flex items-center space-x-1 border rounded-md p-1">
                      <Button
                        variant={readingMode === 'normal' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setReadingMode('normal')}
                        className="h-8 px-2"
                      >
                        Normal
                      </Button>
                      <Button
                        variant={readingMode === 'focus' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setReadingMode('focus')}
                        className="h-8 px-2"
                      >
                        Focus
                      </Button>
                      <Button
                        variant={readingMode === 'print' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setReadingMode('print')}
                        className="h-8 px-2"
                      >
                        Print
                      </Button>
                    </div>

                    {/* Font Size Controls */}
                    <div className="flex items-center space-x-1 border rounded-md p-1">
                      <Button
                        variant={fontSize === 'sm' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFontSize('sm')}
                        className="h-8 px-2 text-xs"
                      >
                        A
                      </Button>
                      <Button
                        variant={fontSize === 'base' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFontSize('base')}
                        className="h-8 px-2 text-sm"
                      >
                        A
                      </Button>
                      <Button
                        variant={fontSize === 'lg' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFontSize('lg')}
                        className="h-8 px-2 text-base"
                      >
                        A
                      </Button>
                      <Button
                        variant={fontSize === 'xl' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFontSize('xl')}
                        className="h-8 px-2 text-lg"
                      >
                        A
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTableOfContents(!showTableOfContents)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleBookmark}
                    >
                      {isBookmarked ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <Star className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit className="h-4 w-4" />
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
                    <div className="relative group">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                        <button
                          onClick={() => handleExport('pdf')}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          Export PDF
                        </button>
                        <button
                          onClick={() => handleExport('docx')}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          Export Word
                        </button>
                        <button
                          onClick={() => handleExport('md')}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          Export Markdown
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Full Screen Mode */}
                {isFullScreen ? (
                  <div className="fixed inset-0 z-50 bg-white">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h1 className="text-xl font-bold">{document.title}</h1>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFullScreen(false)}
                        >
                          Exit Full Screen
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrint}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="h-full overflow-y-auto p-8">
                      <div className={`prose max-w-4xl mx-auto ${
                        fontSize === 'sm' ? 'prose-sm' : 
                        fontSize === 'lg' ? 'prose-lg' : 
                        fontSize === 'xl' ? 'prose-xl' : 'prose-base'
                      } ${
                        lineHeight === 'tight' ? 'prose-tight' : 
                        lineHeight === 'relaxed' ? 'prose-relaxed' : ''
                      }`}>
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  showLineNumbers={true}
                                  customStyle={{ margin: '1rem 0', borderRadius: '8px' }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            table({ children }: any) {
                              return (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full border-collapse border border-gray-300">
                                    {children}
                                  </table>
                                </div>
                              );
                            },
                            th({ children }: any) {
                              return (
                                <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold">
                                  {children}
                                </th>
                              );
                            },
                            td({ children }: any) {
                              return (
                                <td className="border border-gray-300 px-4 py-2">
                                  {children}
                                </td>
                              );
                            },
                          }}
                        >
                          {document.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content */}
                    <div className={`${showTableOfContents ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                      <AnimatedCard>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center space-x-2">
                              <FileText className="h-5 w-5" />
                              <span>Document Content</span>
                              {isSaving && (
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  <span>Saving...</span>
                                </div>
                              )}
                              {lastSaved && !isSaving && (
                                <div className="text-sm text-muted-foreground">
                                  Last saved: {lastSaved.toLocaleTimeString()}
                                </div>
                              )}
                            </CardTitle>
                            {isEditing && (
                              <div className="flex items-center space-x-2">
                                <label className="flex items-center space-x-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={autoSaveEnabled}
                                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                                    className="rounded"
                                  />
                                  <span>Auto-save</span>
                                </label>
                                <Button size="sm" onClick={handleSave}>
                                  Save Changes
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {isEditing ? (
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="w-full h-96 p-4 border rounded-md font-mono text-sm"
                              placeholder="Edit document content..."
                            />
                          ) : (
                            <div className={`prose max-w-none ${
                              readingMode === 'focus' ? 'prose-lg max-w-3xl mx-auto' :
                              readingMode === 'print' ? 'prose-print' : 'prose-base'
                            } ${
                              fontSize === 'sm' ? 'prose-sm' : 
                              fontSize === 'lg' ? 'prose-lg' : 
                              fontSize === 'xl' ? 'prose-xl' : 'prose-base'
                            } ${
                              lineHeight === 'tight' ? 'prose-tight' : 
                              lineHeight === 'relaxed' ? 'prose-relaxed' : ''
                            }`}>
                              <ReactMarkdown
                                components={{
                                  code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        showLineNumbers={true}
                                        customStyle={{ margin: '1rem 0', borderRadius: '8px' }}
                                        {...props}
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                  table({ children }: any) {
                                    return (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full border-collapse border border-gray-300">
                                          {children}
                                        </table>
                                      </div>
                                    );
                                  },
                                  th({ children }: any) {
                                    return (
                                      <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold">
                                        {children}
                                      </th>
                                    );
                                  },
                                  td({ children }: any) {
                                    return (
                                      <td className="border border-gray-300 px-4 py-2">
                                        {children}
                                      </td>
                                    );
                                  },
                                }}
                              >
                                {document.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </CardContent>
                      </AnimatedCard>
                    </div>

                    {/* Table of Contents */}
                    {showTableOfContents && (
                      <div className="lg:col-span-1">
                        <AnimatedCard>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <FileText className="h-5 w-5" />
                              <span>Table of Contents</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {tableOfContents.map((item) => (
                                <div
                                  key={item.id}
                                  className={`cursor-pointer hover:text-primary transition-colors ${
                                    item.level === 1 ? 'font-medium text-sm' :
                                    item.level === 2 ? 'text-sm ml-4' :
                                    item.level === 3 ? 'text-xs ml-8' :
                                    'text-xs ml-12'
                                  }`}
                                  onClick={() => {
                                    const element = window.document.querySelector(`#${item.id}`)
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth' })
                                    }
                                  }}
                                >
                                  {item.title}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </AnimatedCard>
                      </div>
                    )}
                  </div>
                )}

                {/* Sidebar - Only show when not in full screen */}
                {!isFullScreen && (
                  <div className="space-y-6">
                    {/* Metadata Panel */}
                    {showMetadata && (
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5" />
                            <span>Document Information</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Status</span>
                              <Badge variant={document.status === 'published' ? 'default' : 'secondary'}>
                                <span>{document.status}</span>
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Created</span>
                              <span className="text-sm">{new Date(document.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Updated</span>
                              <span className="text-sm">{new Date(document.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Author</span>
                              <span className="text-sm">{document.author}</span>
                            </div>
                          </div>

                          {document.metadata && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Generation Info</h4>
                                <div className="space-y-1 text-xs text-gray-600">
                                  <div>Generated: {new Date(document.metadata.generatedAt).toLocaleDateString()}</div>
                                  <div>Workflow: {document.metadata.workflowId}</div>
                                  <div>Template: {document.metadata.templateId}</div>
                                  <div>Project: {document.metadata.projectId}</div>
                                </div>
                              </div>

                              <Separator />
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Compression Stats</h4>
                                <div className="space-y-1 text-xs text-gray-600">
                                  {document.metadata.compressionStats ? (
                                    <>
                                      <div>Original: {document.metadata.compressionStats.originalTokens.toLocaleString()} tokens</div>
                                      <div>Compressed: {document.metadata.compressionStats.compressedTokens.toLocaleString()} tokens</div>
                                      <div>Ratio: {(document.metadata.compressionStats.compressionRatio * 100).toFixed(1)}%</div>
                                      <div>Method: {document.metadata.compressionStats.method}</div>
                                    </>
                                  ) : (
                                    <div>No compression stats available</div>
                                  )}
                                </div>
                              </div>

                              <Separator />
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Source Documents</h4>
                                <div className="space-y-1">
                                  {document.metadata.sourceDocuments && Array.isArray(document.metadata.sourceDocuments) ? (
                                    document.metadata.sourceDocuments.map((doc, index) => (
                                      <div key={index} className="text-xs text-gray-600 flex items-center space-x-1">
                                        <FileText className="h-3 w-3" />
                                        <span>{typeof doc === 'string' ? doc : JSON.stringify(doc)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-600">No source documents available</div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Version History */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <History className="h-5 w-5" />
                          <span>Version History</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {versions.map((version) => (
                            <div key={version.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                              <div className="flex-shrink-0">
                                <Badge variant="outline" className="text-xs">
                                  <span>v{version.version}</span>
                                </Badge>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{version.changes_summary}</p>
                                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                                  <span>{version.created_by}</span>
                                  <span>•</span>
                                  <span>{new Date(version.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </div>
                )}
              </AnimatedLayout>
            </PageTransition>
          </div>
        </main>
      </div>

      {/* Regeneration Modal */}
      <RegenerateVersionModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        documentId={documentId}
        currentTemplate={document?.template_id}
        currentVersion={document?.version || '1.0'}
        projectId={document?.project_id}
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
    </div>
  )
}
