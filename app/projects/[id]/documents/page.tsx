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
import { toast } from "sonner"

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
}

interface DocumentStats {
  totalDocuments: number
  byStatus: {
    draft: number
    review: number
    approved: number
    published: number
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
  recentActivity: Array<{
    document_name: string
    action: string
    timestamp: string
    user: string
  }>
  totalWords: number
  totalSize: number
  avgProcessingTime: number
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
  })

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
      
      const response = await apiClient.get(`/documents/project/${projectId}?${new URLSearchParams(params).toString()}`)
      setDocuments(response.documents || [])
      setPagination(response.pagination || pagination)
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      // Use mock data for demonstration
      setDocuments([
        {
          id: "doc-1",
          name: "Project Requirements Document",
          template_id: "template-1",
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

  // Calculate document statistics
  const calculateStats = (docs: Document[]): DocumentStats => {
    const byStatus = docs.reduce((acc, doc) => {
      acc[doc.status as keyof typeof acc] = (acc[doc.status as keyof typeof acc] || 0) + 1
      return acc
    }, { draft: 0, review: 0, approved: 0, published: 0 })

    const byTemplate = docs.reduce((acc, doc) => {
      if (doc.template_name) {
        const existing = acc.find(t => t.template_name === doc.template_name)
        if (existing) {
          existing.count++
        } else {
          acc.push({
            template_name: doc.template_name,
            template_framework: doc.template_framework || 'Unknown',
            count: 1
          })
        }
      }
      return acc
    }, [] as Array<{ template_name: string; template_framework: string; count: number }>)

    const byFramework = docs.reduce((acc, doc) => {
      const framework = doc.template_framework || 'Unknown'
      const existing = acc.find(f => f.framework === framework)
      if (existing) {
        existing.count++
      } else {
        acc.push({ framework, count: 1 })
      }
      return acc
    }, [] as Array<{ framework: string; count: number }>)

    const recentActivity = docs
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map(doc => ({
        document_name: doc.name,
        action: 'Updated',
        timestamp: doc.updated_at,
        user: doc.updated_by
      }))

    const totalWords = docs.reduce((sum, doc) => sum + (doc.word_count || 0), 0)
    const totalSize = docs.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
    const avgProcessingTime = docs.length > 0 
      ? docs.reduce((sum, doc) => sum + (parseFloat(doc.metadata?.processing_time?.replace('s', '') || '0')), 0) / docs.length
      : 0

    return {
      totalDocuments: docs.length,
      byStatus,
      byTemplate,
      byFramework,
      recentActivity,
      totalWords,
      totalSize,
      avgProcessingTime
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
    
    if (!uploadForm.name || !uploadForm.file || !uploadForm.template_id) {
      toast.error("Please fill in all required fields including template selection")
      return
    }

    try {
      setUploadingDocument(true)
      
      // Handle file content
      let content: any
      if (uploadForm.file.type === 'text/plain' || 
          uploadForm.file.type === 'application/json' ||
          uploadForm.file.name.endsWith('.txt') ||
          uploadForm.file.name.endsWith('.md')) {
        const textContent = await uploadForm.file.text()
        content = {
          text: textContent,
          fileName: uploadForm.file.name,
          fileType: uploadForm.file.type,
          uploadedAt: new Date().toISOString()
        }
      } else {
        content = {
          fileName: uploadForm.file.name,
          fileSize: uploadForm.file.size,
          fileType: uploadForm.file.type,
          uploadedAt: new Date().toISOString(),
          note: "Binary file uploaded - content stored separately"
        }
      }
      
      await apiClient.createDocument(projectId, {
        name: uploadForm.name,
        content: content,
        template_id: uploadForm.template_id,
        status: "draft"
      })
      
      toast.success("Document uploaded successfully!")
      setUploadDialogOpen(false)
      setUploadForm({
        name: "",
        file: null,
        template_id: "",
      })
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to upload document:", error)
      toast.error("Failed to upload document")
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
        template_id: generateForm.template_id || undefined,
      })

      // Extract Markdown content from response
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

  // Delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return
    }
    
    try {
      await apiClient.deleteDocument(documentId)
      toast.success("Document deleted successfully!")
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to delete document:", error)
      toast.error("Failed to delete document")
    }
  }

  // Documents are now filtered server-side, so we use them directly
  const displayDocuments = documents

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
  }, [pagination.page, searchTerm, statusFilter, templateFilter])

  // Calculate stats when documents change
  useEffect(() => {
    if (documents.length > 0) {
      setStats(calculateStats(documents))
    }
  }, [documents])

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
                    </div>
                  </div>
                </motion.div>

                {/* Dashboard Stats */}
                {stats && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                  >
                    <AnimatedCard>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                        <p className="text-xs text-muted-foreground">
                          {stats.totalWords.toLocaleString()} total words
                        </p>
                      </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Published</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.byStatus.published}</div>
                        <p className="text-xs text-muted-foreground">
                          {((stats.byStatus.published / stats.totalDocuments) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Review</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats.byStatus.review}</div>
                        <p className="text-xs text-muted-foreground">
                          {((stats.byStatus.review / stats.totalDocuments) * 100).toFixed(1)}% of total
                        </p>
                      </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
                        <p className="text-xs text-muted-foreground">
                          Avg: {formatFileSize(stats.totalSize / stats.totalDocuments)}
                        </p>
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}

                {/* Metadata Dashboard */}
                {stats && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
                  >
                    {/* Template Distribution */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <PieChart className="h-5 w-5" />
                          <span>Template Distribution</span>
                        </CardTitle>
                        <CardDescription>
                          Documents organized by template and framework
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {stats.byTemplate.map((template, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-medium">{template.template_name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold">{template.count}</div>
                                <div className="text-xs text-muted-foreground">{template.template_framework}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* Framework Distribution */}
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
                        <div className="space-y-4">
                          {stats.byFramework.map((framework, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span className="text-sm font-medium">{framework.framework}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold">{framework.count}</div>
                                <div className="text-xs text-muted-foreground">
                                  {((framework.count / stats.totalDocuments) * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}

                {/* Search and Filters */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center space-x-4 mb-6"
                >
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={statusFilter}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="review">Review</option>
                      <option value="approved">Approved</option>
                      <option value="published">Published</option>
                    </select>
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  </div>
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
                          {searchTerm || statusFilter !== "all" || templateFilter !== "all"
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
                      {displayDocuments.map((document, index) => (
                        <AnimatedCard key={document.id}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                  <h3 className="text-lg font-semibold">{document.name}</h3>
                                  <div className={getStatusColor(document.status)}>
                                    {document.status}
                                  </div>
                                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                                    v{document.version}
                                  </div>
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadForm({...uploadForm, name: e.target.value})}
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
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadForm({...uploadForm, template_id: e.target.value})}
                            required
                          >
                            <option value="">Select a template (required)</option>
                            {loadingTemplates ? (
                              <option disabled>Loading templates...</option>
                            ) : (
                              templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name} ({template.framework})
                                </option>
                              ))
                            )}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Template selection is required to ensure proper document metadata and review compliance
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="file-upload">File *</Label>
                          <Input
                            id="file-upload"
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.md"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0] || null
                              setUploadForm({...uploadForm, file})
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateForm({...generateForm, name: e.target.value})}
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
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenerateForm({...generateForm, template_id: e.target.value})}
                          >
                            <option value="">Select a template</option>
                            {loadingTemplates ? (
                              <option disabled>Loading templates...</option>
                            ) : (
                              templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name} ({template.framework})
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="generate-prompt">Generation Prompt *</Label>
                          <Textarea
                            id="generate-prompt"
                            placeholder="Describe what you want the document to contain..."
                            value={generateForm.prompt}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGenerateForm({...generateForm, prompt: e.target.value})}
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
