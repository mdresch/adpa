"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
  Settings,
  History,
  Folder,
  Tag,
  MessageSquare,
  Star,
  MoreHorizontal,
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, TextRun } from "docx"
import { saveAs } from "file-saver"

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
  const [versions, setVersions] = useState<VersionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [showVersions, setShowVersions] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")

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

  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true)
      try {
        // Fetch document from API
        const [documentResponse, versionsResponse] = await Promise.all([
          apiClient.get(`/projects/${projectId}/documents/${documentId}`),
          apiClient.get(`/projects/${projectId}/documents/${documentId}/versions`)
        ])
        
        const documentData = documentResponse
        const versionsData = versionsResponse || []
        
        // Convert content to string if it's an object
        let contentString = ''
        if (typeof documentData.content === 'string') {
          contentString = documentData.content
        } else if (documentData.content && typeof documentData.content === 'object') {
          // Handle different content object formats
          if (documentData.content.text) {
            contentString = documentData.content.text
          } else if (documentData.content.markdown) {
            contentString = documentData.content.markdown
          } else {
            // Fallback: stringify the object
            contentString = JSON.stringify(documentData.content, null, 2)
          }
        }
        
        setDocument({...documentData, content: contentString})
        setVersions(versionsData)
        setEditedContent(contentString)
      } catch (error) {
        console.error("Failed to load document:", error)
        
        // Fallback to mock data if API fails (for development/demo purposes)
        console.log("Falling back to mock data for demonstration")
        setDocument(mockDocument)
        setVersions(mockVersions)
        setEditedContent(mockDocument.content)
        
        // Show error toast but don't break the UI
        toast.error("Failed to load document from API, showing demo data")
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [projectId, documentId])

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
      
      // Update local state with the response data
      setDocument({ ...document, content: editedContent, updated_at: new Date().toISOString() })
      toast.success("Document saved successfully")
      setIsEditing(false)
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
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
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
                        onClick={() => setShowVersions(!showVersions)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        Versions ({versions.length})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowComments(!showComments)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comments ({document.comments?.length || 0})
                      </Button>
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-3">
                    <AnimatedCard>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center space-x-2">
                            <FileText className="h-5 w-5" />
                            <span>Document Content</span>
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
                              </>
                            ) : (
                              <>
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
                          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:pb-2 prose-h1:border-b prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-6 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-5 prose-p:mb-4 prose-p:leading-7 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-ul:my-4 prose-ol:my-4 prose-li:my-1">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1({ children }) {
                                  return (
                                    <h1 className="text-4xl font-bold mb-6 mt-8 pb-2 border-b border-gray-200 dark:border-gray-700">
                                      {children}
                                    </h1>
                                  );
                                },
                                h2({ children }) {
                                  return (
                                    <h2 className="text-3xl font-bold mb-4 mt-6 text-gray-900 dark:text-gray-100">
                                      {children}
                                    </h2>
                                  );
                                },
                                h3({ children }) {
                                  return (
                                    <h3 className="text-2xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
                                      {children}
                                    </h3>
                                  );
                                },
                                h4({ children }) {
                                  return (
                                    <h4 className="text-xl font-semibold mb-2 mt-4 text-gray-800 dark:text-gray-200">
                                      {children}
                                    </h4>
                                  );
                                },
                                p({ children }) {
                                  return (
                                    <p className="mb-4 leading-7 text-gray-700 dark:text-gray-300">
                                      {children}
                                    </p>
                                  );
                                },
                                a({ href, children }) {
                                  return (
                                    <a 
                                      href={href} 
                                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {children}
                                    </a>
                                  );
                                },
                                ul({ children }) {
                                  return (
                                    <ul className="my-4 ml-6 list-disc space-y-2">
                                      {children}
                                    </ul>
                                  );
                                },
                                ol({ children }) {
                                  return (
                                    <ol className="my-4 ml-6 list-decimal space-y-2">
                                      {children}
                                    </ol>
                                  );
                                },
                                li({ children }) {
                                  return (
                                    <li className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                      {children}
                                    </li>
                                  );
                                },
                                blockquote({ children }) {
                                  return (
                                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 italic bg-blue-50 dark:bg-blue-900/20 rounded-r">
                                      {children}
                                    </blockquote>
                                  );
                                },
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      showLineNumbers={true}
                                      customStyle={{ 
                                        margin: '1.5rem 0', 
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        fontSize: '0.9rem'
                                      }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono text-red-600 dark:text-red-400" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                pre({ children }) {
                                  return (
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                                      {children}
                                    </pre>
                                  );
                                },
                                table({ children }) {
                                  return (
                                    <div className="overflow-x-auto my-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
                                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        {children}
                                      </table>
                                    </div>
                                  );
                                },
                                thead({ children }) {
                                  return (
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750">
                                      {children}
                                    </thead>
                                  );
                                },
                                tbody({ children }) {
                                  return (
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                      {children}
                                    </tbody>
                                  );
                                },
                                tr({ children }) {
                                  return (
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                      {children}
                                    </tr>
                                  );
                                },
                                th({ children }) {
                                  return (
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b-2 border-gray-300 dark:border-gray-600">
                                      {children}
                                    </th>
                                  );
                                },
                                td({ children }) {
                                  return (
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 align-top">
                                      <div className="max-w-prose">
                                        {children}
                                      </div>
                                    </td>
                                  );
                                },
                                hr() {
                                  return <hr className="my-8 border-gray-200 dark:border-gray-700" />;
                                },
                                strong({ children }) {
                                  return (
                                    <strong className="font-semibold text-gray-900 dark:text-gray-100">
                                      {children}
                                    </strong>
                                  );
                                },
                                em({ children }) {
                                  return (
                                    <em className="italic text-gray-800 dark:text-gray-200">
                                      {children}
                                    </em>
                                  );
                                },
                              }}
                            >
                              {typeof document.content === 'string' ? document.content : JSON.stringify(document.content, null, 2)}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
                            placeholder="Edit document content..."
                          />
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
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
                            {(document as any).version && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Version:</span>
                                <span className="font-medium">v{(document as any).version}</span>
                              </div>
                            )}
                            {(document as any).template_id && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Template:</span>
                                <span className="font-medium text-xs">{(document as any).template_id.substring(0, 8)}...</span>
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
                              <span className="ml-2 font-medium">{document.word_count || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Characters:</span>
                              <span className="ml-2 font-medium">{document.character_count || 0}</span>
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

                    {/* Generation Stats */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5" />
                          <span>Generation Stats</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Compression</p>
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Ratio:</span>
                              <span className="font-medium">{document.compression_ratio}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Original:</span>
                              <span className="font-medium">{document.original_size}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Compressed:</span>
                              <span className="font-medium">{document.compressed_size}</span>
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">AI Processing</p>
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Model:</span>
                              <span className="font-medium">{document.ai_model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Time:</span>
                              <span className="font-medium">{document.processing_time}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Input Tokens:</span>
                              <span className="font-medium">{document.input_tokens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Output Tokens:</span>
                              <span className="font-medium">{document.output_tokens}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* Export Options */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Download className="h-5 w-5" />
                          <span>Export Options</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
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

                    {/* Source Documents */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <ExternalLink className="h-5 w-5" />
                          <span>Source Documents</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(document.source_documents || []).map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                              <div>
                                <p className="text-sm font-medium">{doc.title}</p>
                                <p className="text-xs text-muted-foreground">{doc.type}</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
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
                                <Button variant="outline" size="sm">
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
    </div>
  )
}
