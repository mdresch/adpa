"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
                        
                        {/* Custom Metadata Fields - Always Show */}
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                          <p className="text-sm">{document?.metadata?.category || <span className="text-muted-foreground italic">Not set</span>}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                          {document?.metadata?.priority ? (
                            <Badge variant="outline" className="capitalize">
                              {document.metadata.priority}
                            </Badge>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Not set</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Author</Label>
                          <p className="text-sm">{document?.metadata?.author || <span className="text-muted-foreground italic">Not set</span>}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Reviewer</Label>
                          <p className="text-sm">{document?.metadata?.reviewer || <span className="text-muted-foreground italic">Not set</span>}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                          <p className="text-sm">
                            {document?.metadata?.due_date 
                              ? new Date(document.metadata.due_date).toLocaleDateString() 
                              : <span className="text-muted-foreground italic">Not set</span>}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                          {document?.tags && document.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {document.tags.map((tag: string, idx: number) => (
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
                            {document?.metadata?.description || <span className="italic">No description</span>}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {document?.metadata?.notes || <span className="italic">No notes</span>}
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
                          <span className="text-sm font-medium">
                            {document?.generation_metadata?.aiProcessing?.provider && document?.generation_metadata?.aiProcessing?.model
                              ? `${document.generation_metadata.aiProcessing.provider} - ${document.generation_metadata.aiProcessing.model}`
                              : document?.metadata?.ai_model || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Processing Time</span>
                          <span className="text-sm font-medium">
                            {document?.generation_metadata?.generation?.duration || document?.metadata?.processing_time || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Compression Ratio</span>
                          <span className="text-sm font-medium">{document?.metadata?.compression_ratio || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Tokens Used</span>
                          <span className="text-sm font-medium">
                            {document?.generation_metadata?.aiProcessing?.tokens?.total || document?.metadata?.generation_stats?.tokens_used?.toLocaleString() || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Generation Cost</span>
                          <span className="text-sm font-medium">
                            {document?.generation_metadata?.aiProcessing?.tokens?.cost || `$${document?.metadata?.generation_stats?.cost || "0.00"}`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  {/* Content Metrics */}
                  {(document?.generation_metadata?.contentMetrics || document?.word_count) && (
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
                            if (document?.word_count) {
                              wordCount = document.word_count
                            }
                            // Priority 2: Use generation_metadata.wordCount if available
                            else if (document?.generation_metadata?.wordCount) {
                              wordCount = document.generation_metadata.wordCount
                            }
                            // Priority 3: Parse contentMetrics.words (formatted string)
                            else if (document?.generation_metadata?.contentMetrics?.words) {
                              const wordsValue = document.generation_metadata.contentMetrics.words
                              if (typeof wordsValue === 'string') {
                                // Remove both commas AND periods (European format) as thousands separators
                                wordCount = parseInt(wordsValue.replace(/[,\.]/g, ''), 10) || 0
                              } else {
                                wordCount = wordsValue
                              }
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
                                      if (document?.character_count) {
                                        charCount = document.character_count
                                      }
                                      // Priority 2: Use generation_metadata.characterCount if available
                                      else if (document?.generation_metadata?.characterCount) {
                                        charCount = document.generation_metadata.characterCount
                                      }
                                      // Priority 3: Parse contentMetrics.characters (formatted string)
                                      else if (document?.generation_metadata?.contentMetrics?.characters) {
                                        const charsValue = document.generation_metadata.contentMetrics.characters
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
                                      const sentenceCount = document?.sentence_count || 
                                                           document?.generation_metadata?.contentMetrics?.sentences || 
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
                                      const paragraphCount = document?.paragraph_count || 
                                                            document?.generation_metadata?.contentMetrics?.paragraphs || 
                                                            0
                                      return paragraphCount > 0 ? paragraphCount.toLocaleString('en-US') : "N/A"
                                    })()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Avg Words/Sentence:</span>
                                  <span className="text-sm font-medium">
                                    {(() => {
                                      // Calculate from actual values
                                      const wc = document?.word_count || document?.generation_metadata?.wordCount || 0
                                      const sc = document?.sentence_count || document?.generation_metadata?.contentMetrics?.sentences || 0
                                      const avg = (wc > 0 && sc > 0) ? (wc / sc).toFixed(1) : null
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
                          if (document?.generation_metadata?.qualityMetrics) {
                            console.log('📊 Quality Metrics from metadata:', document.generation_metadata.qualityMetrics)
                          }
                          
                          const overallQuality = document?.generation_metadata?.qualityMetrics?.overallQuality || 
                                                document?.metadata?.quality_score || 
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
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.completeness || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.completeness || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Structure</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.structureScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.structureScore || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Formatting & Style</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-orange-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.formattingScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.formattingScore || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Content Depth</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.contentDepth || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.contentDepth || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Accuracy</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.accuracy || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.accuracy || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Consistency</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-teal-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.consistency || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.consistency || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Context Relevance</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-cyan-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.contextRelevance || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.contextRelevance || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Professional Quality</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-pink-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.professionalQuality || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.professionalQuality || 0}%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Standards Compliance</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-600 h-2 rounded-full" 
                                style={{ width: `${document?.generation_metadata?.qualityMetrics?.standardsCompliance || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{document?.generation_metadata?.qualityMetrics?.standardsCompliance || 0}%</span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                            <span className="text-sm font-semibold text-red-700">Complexity Score</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-red-600 h-2 rounded-full" 
                                  style={{ width: `${document?.generation_metadata?.qualityMetrics?.complexityScore || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-red-700">{document?.generation_metadata?.qualityMetrics?.complexityScore || 0}%</span>
                            </div>
                          </div>
                          
                          {/* Complexity Time Estimate with Research Breakdown */}
                          {(() => {
                            const complexity = document?.generation_metadata?.qualityMetrics?.complexityScore || 0
                            const research = document?.generation_metadata?.researchComplexity
                            
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
                                  <span className={`text-sm font-bold ${color}`}>
                                    {sourceDocCount > 0 ? `${readingTimeDisplay} + ${writingTime}` : writingTime}
                                  </span>
                                </div>
                                
                                {document?.generation_metadata?.generation?.duration && (
                                  <div className="text-xs text-muted-foreground italic mt-2 pt-2 border-t">
                                    ⚡ AI generated in {document.generation_metadata.generation.duration}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  {/* Compliance Metrics - Reserved for Future Implementation */}
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
                      <div className="flex flex-col items-center justify-center py-8 px-4 bg-muted/30 rounded-lg border border-dashed">
                        <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                          Compliance Metrics Not Yet Available
                        </h3>
                        <p className="text-xs text-muted-foreground text-center max-w-md mb-4">
                          This section will display framework compliance (PMBOK, BABOK, DMBOK), 
                          regulatory adherence (GDPR, HIPAA, SOC2), and standards compliance 
                          once the compliance validation workflow is implemented.
                        </p>
                        <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
                          <div className="text-center p-3 bg-background rounded border">
                            <p className="text-xs text-muted-foreground mb-1">Framework</p>
                            <p className="text-sm font-semibold text-muted-foreground">—</p>
                          </div>
                          <div className="text-center p-3 bg-background rounded border">
                            <p className="text-xs text-muted-foreground mb-1">Regulatory</p>
                            <p className="text-sm font-semibold text-muted-foreground">—</p>
                          </div>
                          <div className="text-center p-3 bg-background rounded border">
                            <p className="text-xs text-muted-foreground mb-1">Standards</p>
                            <p className="text-sm font-semibold text-muted-foreground">—</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </div>

                {/* Source Documents */}
                {document?.generation_metadata?.source_documents && document.generation_metadata.source_documents.length > 0 && (
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
                        {/* Individual Document Details */}
                        <div className="space-y-3">
                          {document.generation_metadata.source_documents.map((source: any, idx: number) => (
                            <Link
                              key={source.id}
                              href={`/projects/${document.project_id}/documents/${source.id}/view`}
                              className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                                    {source.priority_rank || idx + 1}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="text-sm font-semibold truncate">
                                      {source.title || source.name}
                                    </h4>
                                    {source.status && (
                                      <Badge variant="outline" className="capitalize flex-shrink-0">
                                        {source.status}
                                      </Badge>
                                    )}
                                    {source.dependency_level && (
                                      <Badge 
                                        variant="secondary" 
                                        className={`flex-shrink-0 ${
                                          source.dependency_level >= 4 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
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
                                    {source.priority_rank && (
                                      <>
                                        <span>•</span>
                                        <span className="font-medium">Score: {Math.round(source.priority_rank as number)}</span>
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
                                      <span className="font-medium">⏱️ ~{source.reading_time_minutes} min read</span>
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </Link>
                          ))}
                        </div>
                        
                        {/* Context Stats Summary */}
                        {document.generation_metadata.context_stats && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            {(() => {
                              // Calculate total reading metrics from all source documents
                              const totalChars = document.generation_metadata.source_documents.reduce((sum: number, doc: any) => sum + (doc.character_count || 0), 0)
                              const totalWords = document.generation_metadata.source_documents.reduce((sum: number, doc: any) => sum + (doc.word_count || 0), 0)
                              const totalReadingTime = document.generation_metadata.source_documents.reduce((sum: number, doc: any) => sum + (doc.reading_time_minutes || 0), 0)
                              
                              return (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Documents Used:</span>
                                      <span className="ml-2 font-medium">
                                        {document.generation_metadata.context_stats.documents_used} / {document.generation_metadata.context_stats.total_documents}
                                      </span>
                                    </div>
                                    {document.generation_metadata.context_stats.stakeholders_included > 0 && (
                                      <div>
                                        <span className="text-muted-foreground">Stakeholders:</span>
                                        <span className="ml-2 font-medium">
                                          {document.generation_metadata.context_stats.stakeholders_included}
                                        </span>
                                      </div>
                                    )}
                                    {document.generation_metadata.context_stats.estimated_context_tokens && (
                                      <div>
                                        <span className="text-muted-foreground">Est. Context Tokens:</span>
                                        <span className="ml-2 font-medium">
                                          {document.generation_metadata.context_stats.estimated_context_tokens.toLocaleString()}
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
                                          <span className="ml-2 font-bold text-primary">
                                            ⏱️ ~{Math.round(totalReadingTime)} minutes ({Math.round(totalReadingTime / 60 * 10) / 10} hours)
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
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                )}

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
                          <p className="text-sm font-mono">
                            {document?.metadata?.technical_metadata?.file_hash || 
                             (document?.id ? `${document.id.substring(0, 16)}...` : "N/A")}
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">SHA-256 (truncated)</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Encoding</Label>
                          <p className="text-sm">
                            {document?.metadata?.technical_metadata?.encoding || "UTF-8"}
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">Standard text encoding</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Language</Label>
                          <p className="text-sm">
                            {document?.metadata?.technical_metadata?.language || "en (English)"}
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-1">Detected language</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">MIME Type</Label>
                          <p className="text-sm">
                            {document?.mime_type || document?.metadata?.mime_type || "text/markdown"}
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
                            {document?.generation_metadata?.aiProcessing?.provider ? "AI Generated" : "Uploaded"}
                          </Badge>
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {document?.generation_metadata?.aiProcessing?.provider 
                              ? `via ${document.generation_metadata.aiProcessing.provider}` 
                              : "User uploaded"}
                          </p>
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