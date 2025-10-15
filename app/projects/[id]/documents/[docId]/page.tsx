"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  metadata: {
    ai_model?: string
    processing_time?: string
    compression_ratio?: number
    framework_compliance?: number
    review_score?: number
    quality_score?: number
    readability_score?: number
    complexity_score?: number
    stakeholder_feedback?: Array<{
      id: string
      user: string
      comment: string
      rating: number
      timestamp: string
    }>
    generation_stats?: {
      tokens_used?: number
      cost?: number
      model_version?: string
      temperature?: number
      max_tokens?: number
    }
    compliance_metrics?: {
      template_alignment?: number
      framework_adherence?: number
      quality_gates_passed?: number
      review_cycles?: number
    }
    technical_metadata?: {
      file_hash?: string
      encoding?: string
      language?: string
      structure_analysis?: any
    }
  }
}

interface DocumentMetadata {
  name: string
  status: string
  tags: string[]
  template_id?: string
  framework?: string
  category?: string
  priority?: string
  author?: string
  reviewer?: string
  due_date?: string
  description?: string
  notes?: string
  custom_fields?: Record<string, any>
}

export default function DocumentMetadataPage({ params }: { params: { id: string; docId: string } }) {
  const router = useRouter()
  const projectId = params.id
  const docId = params.docId
  const { isAuthenticated } = useAuth()

  const [document, setDocument] = useState<Document | null>(null)
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

  // Fetch document data
  const fetchDocument = async () => {
    try {
      setLoading(true)
      const documentData = await apiClient.getDocument(docId)
      setDocument(documentData)
      
      // Populate metadata form
      setMetadataForm({
        name: documentData.name || "",
        status: documentData.status || "draft",
        tags: documentData.tags || [],
        template_id: documentData.template_id || "",
        framework: documentData.template_framework || "",
        category: documentData.metadata?.category || "",
        priority: documentData.metadata?.priority || "medium",
        author: documentData.metadata?.author || "",
        reviewer: documentData.metadata?.reviewer || "",
        due_date: documentData.metadata?.due_date || "",
        description: documentData.metadata?.description || "",
        notes: documentData.metadata?.notes || "",
        custom_fields: documentData.metadata?.custom_fields || {}
      })
    } catch (error) {
      console.error("Failed to fetch document:", error)
      // Use mock data for demonstration
      const mockDocument: Document = {
        id: docId,
        name: "Project Requirements Document",
        template_id: "template-1",
        template_name: "AI-Enhanced Project Charter Template",
        template_framework: "PMBOK 7",
        status: "review",
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
          compression_ratio: 78,
          framework_compliance: 92,
          review_score: 85,
          quality_score: 88,
          readability_score: 82,
          complexity_score: 75,
          stakeholder_feedback: [
            {
              id: "feedback-1",
              user: "Sarah Johnson",
              comment: "Excellent technical depth and clear requirements. Minor suggestions for section 3.2.",
              rating: 4,
              timestamp: "2024-01-18T10:30:00Z"
            },
            {
              id: "feedback-2",
              user: "Michael Chen",
              comment: "Well-structured document. Consider adding more detail on integration points.",
              rating: 5,
              timestamp: "2024-01-19T14:20:00Z"
            }
          ],
          generation_stats: {
            tokens_used: 12500,
            cost: 0.25,
            model_version: "gpt-4-turbo-preview",
            temperature: 0.7,
            max_tokens: 4000
          },
          compliance_metrics: {
            template_alignment: 95,
            framework_adherence: 92,
            quality_gates_passed: 8,
            review_cycles: 3
          },
          technical_metadata: {
            file_hash: "sha256:abc123def456",
            encoding: "utf-8",
            language: "en",
            structure_analysis: {
              sections: 12,
              subsections: 45,
              tables: 3,
              figures: 8
            }
          }
        }
      }
      setDocument(mockDocument)
      setMetadataForm({
        name: mockDocument.name,
        status: mockDocument.status,
        tags: mockDocument.tags || [],
        template_id: mockDocument.template_id || "",
        framework: mockDocument.template_framework || "",
        category: "Technical Documentation",
        priority: "high",
        author: "John Smith",
        reviewer: "Sarah Johnson",
        due_date: "2024-02-15",
        description: "Comprehensive project requirements document outlining technical specifications and implementation details",
        notes: "Document has undergone 3 review cycles with positive stakeholder feedback",
        custom_fields: {
          "business_unit": "Engineering",
          "project_phase": "Planning",
          "compliance_level": "High"
        }
      })
    } finally {
      setLoading(false)
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
          ...document?.metadata,
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
        // Update local document state with the new feedback
        if (document) {
          const updatedDocument = {
            ...document,
            metadata: {
              ...document.metadata,
              stakeholder_feedback: [
                ...(document.metadata?.stakeholder_feedback || []),
                response.feedback
              ]
            }
          }
          setDocument(updatedDocument)
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
        toast.error("You don't have permission to submit feedback for this document")
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
      Promise.all([fetchDocument(), fetchProject(), fetchTemplates()]).then(() => {
        setLoading(false)
      })
    }
  }, [isAuthenticated, docId, projectId])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access document metadata.</p>
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
                  <p className="text-muted-foreground">Loading document metadata...</p>
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
                        onClick={() => router.push(`/projects/${projectId}/documents`)}
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
                              <BreadcrumbLink href={`/projects/${projectId}/documents`}>Documents</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                              <BreadcrumbPage>{document?.name || "Document"}</BreadcrumbPage>
                            </BreadcrumbItem>
                          </BreadcrumbList>
                        </Breadcrumb>
                        <h1 className="text-3xl font-bold mt-2">Document Metadata</h1>
                        <p className="text-muted-foreground">
                          Manage document metadata, compliance, and stakeholder feedback
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => router.push(`/projects/${projectId}/documents/${docId}/view`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Document
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
                          <p className="text-lg font-semibold">{document?.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <div className={getStatusColor(document?.status || "draft") + " inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"}>
                            {document?.status}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Version</Label>
                          <p className="text-sm">v{document?.version}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                          <p className="text-sm">{document?.template_name || "No template"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Framework</Label>
                          <p className="text-sm">{document?.template_framework || "Not specified"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">File Size</Label>
                          <p className="text-sm">{formatFileSize(document?.file_size || 0)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Word Count</Label>
                          <p className="text-sm">{document?.word_count?.toLocaleString() || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                          <p className="text-sm">{new Date(document?.updated_at || "").toLocaleDateString()}</p>
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
                          Update document metadata, tags, and custom fields
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
                                onChange={(e) => setMetadataForm({...metadataForm, name: e.target.value})}
                                placeholder="Enter document name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-status">Status</Label>
                              <Select value={metadataForm.status} onValueChange={(value) => setMetadataForm({...metadataForm, status: value})}>
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
                              <Select value={metadataForm.template_id} onValueChange={(value) => setMetadataForm({...metadataForm, template_id: value})}>
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
                              <Select value={metadataForm.category} onValueChange={(value) => setMetadataForm({...metadataForm, category: value})}>
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
                              <Select value={metadataForm.priority} onValueChange={(value) => setMetadataForm({...metadataForm, priority: value})}>
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
                                onChange={(e) => setMetadataForm({...metadataForm, author: e.target.value})}
                                placeholder="Enter author"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-reviewer">Reviewer</Label>
                              <Input
                                id="doc-reviewer"
                                value={metadataForm.reviewer}
                                onChange={(e) => setMetadataForm({...metadataForm, reviewer: e.target.value})}
                                placeholder="Enter reviewer"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-due-date">Due Date</Label>
                              <Input
                                id="doc-due-date"
                                type="date"
                                value={metadataForm.due_date}
                                onChange={(e) => setMetadataForm({...metadataForm, due_date: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-tags">Tags</Label>
                              <Input
                                id="doc-tags"
                                value={metadataForm.tags.join(", ")}
                                onChange={(e) => setMetadataForm({...metadataForm, tags: e.target.value.split(", ").filter(tag => tag.trim())})}
                                placeholder="Enter tags separated by commas"
                              />
                            </div>
                            <div>
                              <Label htmlFor="doc-description">Description</Label>
                              <Textarea
                                id="doc-description"
                                value={metadataForm.description}
                                onChange={(e) => setMetadataForm({...metadataForm, description: e.target.value})}
                                placeholder="Enter document description"
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
                            onChange={(e) => setMetadataForm({...metadataForm, notes: e.target.value})}
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
                          <span className="text-sm font-medium">{document?.metadata?.ai_model || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Processing Time</span>
                          <span className="text-sm font-medium">{document?.metadata?.processing_time || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Compression Ratio</span>
                          <span className="text-sm font-medium">{document?.metadata?.compression_ratio || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Tokens Used</span>
                          <span className="text-sm font-medium">{document?.metadata?.generation_stats?.tokens_used?.toLocaleString() || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Generation Cost</span>
                          <span className="text-sm font-medium">${document?.metadata?.generation_stats?.cost || "0.00"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

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
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Framework Compliance</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${document?.metadata?.framework_compliance || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.metadata?.framework_compliance || 0}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Review Score</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${document?.metadata?.review_score || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.metadata?.review_score || 0}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Quality Score</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full" 
                                style={{ width: `${document?.metadata?.quality_score || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.metadata?.quality_score || 0}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Readability Score</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-orange-600 h-2 rounded-full" 
                                style={{ width: `${document?.metadata?.readability_score || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.metadata?.readability_score || 0}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Complexity Score</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-red-600 h-2 rounded-full" 
                                style={{ width: `${document?.metadata?.complexity_score || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.metadata?.complexity_score || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </div>

                {/* Stakeholder Feedback */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
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
                      {document?.metadata?.stakeholder_feedback && document.metadata.stakeholder_feedback.length > 0 ? (
                        <div className="space-y-4">
                          {document.metadata.stakeholder_feedback.map((feedback) => (
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
                          <p className="text-sm font-mono">{document?.metadata?.technical_metadata?.file_hash || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Encoding</Label>
                          <p className="text-sm">{document?.metadata?.technical_metadata?.encoding || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Language</Label>
                          <p className="text-sm">{document?.metadata?.technical_metadata?.language || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">MIME Type</Label>
                          <p className="text-sm">{document?.mime_type || "N/A"}</p>
                        </div>
                        {document?.metadata?.technical_metadata?.structure_analysis && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-muted-foreground">Structure Analysis</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{document.metadata.technical_metadata.structure_analysis.sections}</div>
                                <div className="text-xs text-muted-foreground">Sections</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{document.metadata.technical_metadata.structure_analysis.subsections}</div>
                                <div className="text-xs text-muted-foreground">Subsections</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{document.metadata.technical_metadata.structure_analysis.tables}</div>
                                <div className="text-xs text-muted-foreground">Tables</div>
                              </div>
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-lg font-bold">{document.metadata.technical_metadata.structure_analysis.figures}</div>
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
                        Provide feedback for this document to help improve its quality and compliance.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="feedback-category">Category</Label>
                        <Select value={feedbackForm.category} onValueChange={(value) => setFeedbackForm({...feedbackForm, category: value})}>
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
                              onClick={() => setFeedbackForm({...feedbackForm, rating})}
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
                          onChange={(e) => setFeedbackForm({...feedbackForm, comment: e.target.value})}
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
    </div>
  )
}