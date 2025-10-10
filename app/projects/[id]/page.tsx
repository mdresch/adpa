"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { apiClient, Project, Template } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { toast } from "sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FolderOpen,
  FileText,
  Plus,
  Search,
  Edit,
  Download,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Loader2,
} from "lucide-react"
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

interface Document {
  id: string
  project_id: string
  name: string
  content?: any
  template_id?: string
  status: string
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

interface Stakeholder {
  id: string
  project_id: string
  name?: string
  role: string
  department?: string
  email: string
  phone?: string
  interest_level: 'high' | 'medium' | 'low'
  influence_level: 'high' | 'medium' | 'low'
  engagement_approach: 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'
  communication_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'
  stakeholder_type: 'internal' | 'external'
  stakeholder_category: 'primary' | 'secondary'
  expectations?: string
  potential_impact?: string
  created_at: string
  updated_at: string
}

export default function ProjectDetail() {
  const params = useParams()
  const projectId = params.id as string
  const { isAuthenticated } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [stakeholdersLoading, setStakeholdersLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [documentsPagination, setDocumentsPagination] = useState<{
    page: number
    limit: number
    total: number
    pages: number
  }>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [documentName, setDocumentName] = useState("")
  const [documentDescription, setDocumentDescription] = useState("")
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [stakeholderDialogOpen, setStakeholderDialogOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  const [savingStakeholder, setSavingStakeholder] = useState(false)
  
  // Document upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [uploadForm, setUploadForm] = useState<{
    name: string
    file: File | null
    template_id: string
  }>({
    name: "",
    file: null,
    template_id: "",
  })
  
  // Edit form state
  const [editForm, setEditForm] = useState<{
    name: string
    description: string
    framework: string
    status: string
    priority: string
    start_date: string
    end_date: string
    budget: string
    manager: string
    team_members: string[]
  }>({
    name: "",
    description: "",
    framework: "",
    status: "",
    priority: "",
    start_date: "",
    end_date: "",
    budget: "",
    manager: "",
    team_members: []
  })

  // Stakeholder form state
  const [stakeholderForm, setStakeholderForm] = useState<{
    name: string
    role: string
    department: string
    email: string
    phone: string
    interest_level: 'high' | 'medium' | 'low'
    influence_level: 'high' | 'medium' | 'low'
    engagement_approach: 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'
    communication_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'
    stakeholder_type: 'internal' | 'external'
    stakeholder_category: 'primary' | 'secondary'
    expectations: string
    potential_impact: string
  }>({
    name: "",
    role: "",
    department: "",
    email: "",
    phone: "",
    interest_level: "medium",
    influence_level: "medium",
    engagement_approach: "keep_informed",
    communication_frequency: "weekly",
    stakeholder_type: "internal",
    stakeholder_category: "primary",
    expectations: "",
    potential_impact: ""
  })

  // Fetch project data
  const fetchProject = async () => {
    try {
      setLoading(true)
      const projectData = await apiClient.getProject(projectId)
      setProject(projectData)
      
      // Also fetch documents and stakeholders for this project
      await Promise.all([fetchDocuments(), fetchStakeholders()])
    } catch (error) {
      console.error("Failed to fetch project:", error)
      toast.error("Failed to load project")
      
      // Fallback to mock data
      setProject({
        id: projectId,
        name: "Customer Portal Redesign",
        description: "Complete redesign of the customer-facing portal with improved UX and new features",
        status: "active",
        framework: "PMBOK 7",
        priority: "high",
        owner_id: "user1",
        team_members: ["John Doe", "Jane Smith", "Mike Wilson", "Lisa Chen"],
        start_date: "2024-01-15",
        end_date: "2024-06-30",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-20T00:00:00Z",
      })
      
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch documents separately
  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true)
      const params = {
        page: documentsPagination.page,
        limit: documentsPagination.limit,
        search: searchTerm || undefined,
      }
      const documentsData = await apiClient.getProjectDocuments(projectId, params)
      setDocuments(documentsData.documents || [])
      setDocumentsPagination(documentsData.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      })
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      // Don't show error toast for documents, just use empty array
      setDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }

  // Fetch stakeholders separately
  const fetchStakeholders = async () => {
    try {
      setStakeholdersLoading(true)
      const stakeholdersData = await apiClient.getProjectStakeholders(projectId)
      setStakeholders(Array.isArray(stakeholdersData.stakeholders) ? stakeholdersData.stakeholders : [])
    } catch (error) {
      console.error("Failed to fetch stakeholders:", error)
      // Fallback to empty array if API fails
      setStakeholders([])
    } finally {
      setStakeholdersLoading(false)
    }
  }

  // Returns template content based on selected template
  function getTemplateContent(templateId: string) {
    switch (templateId) {
      case "project-charter":
        return { title: "Project Charter", sections: ["Purpose", "Objectives", "Stakeholders"] }
      case "scope-statement":
        return { title: "Scope Statement", sections: ["Scope", "Deliverables", "Exclusions"] }
      case "wbs":
        return { title: "Work Breakdown Structure", sections: ["Tasks", "Milestones"] }
      case "risk-plan":
        return { title: "Risk Management Plan", sections: ["Risks", "Mitigation", "Owners"] }
      case "comm-plan":
        return { title: "Communication Plan", sections: ["Audience", "Channels", "Frequency"] }
      case "requirements-analysis":
        return { title: "Requirements Analysis", sections: ["Business Requirements", "Functional Requirements"] }
      case "stakeholder-analysis":
        return { title: "Stakeholder Analysis", sections: ["Stakeholders", "Interests", "Influence"] }
      case "business-case":
        return { title: "Business Case", sections: ["Problem", "Solution", "Benefits"] }
      case "solution-assessment":
        return { title: "Solution Assessment", sections: ["Options", "Evaluation", "Recommendation"] }
      case "data-governance":
        return { title: "Data Governance Framework", sections: ["Policies", "Roles", "Processes"] }
      case "data-quality":
        return { title: "Data Quality Assessment", sections: ["Criteria", "Findings", "Recommendations"] }
      case "data-architecture":
        return { title: "Data Architecture", sections: ["Models", "Standards", "Tools"] }
      default:
        return { title: "Untitled Document", sections: [] }
    }
  }

  // Create new document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!documentName.trim()) {
      toast.error("Document name is required")
      return
    }

    if (!selectedTemplate) {
      toast.error("Please select a template")
      return
    }

    try {
      setCreatingDocument(true)

      // Build a helpful prompt for the AI using template + project context
      const templateContent = getTemplateContent(selectedTemplate)
      const sections = Array.isArray(templateContent.sections) ? templateContent.sections.join(', ') : ''
      const projectDesc = project?.description || 'No project description available.'

      const aiPrompt = `Generate a ${templateContent.title} for the project named "${project?.name || 'Unknown Project'}". ` +
        `Project description: ${projectDesc}. Include the following sections: ${sections}. ` +
        `Return the document body text only. Keep it professional and concise.`

      // Enqueue AI generation job via jobs API
      let jobId: string | undefined

      try {
        const resp = await fetch('/api/jobs/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            prompt: aiPrompt,
            templateId: selectedTemplate,
            name: documentName,
            description: documentDescription,
          }),
        })

        if (resp.ok) {
          const body = await resp.json()
          jobId = body.jobId
          toast.success('Document generation job queued — you can monitor it in Jobs')
        } else {
          console.warn('Failed to enqueue job, falling back to direct generation', await resp.text())
        }
      } catch (err) {
        console.warn('Failed to enqueue job, falling back to direct generation', err)
      }

      // If we enqueued a job, just close dialog and refresh list (document will be created by worker)
      if (jobId) {
        setDocumentName("")
        setDocumentDescription("")
        setSelectedTemplate("")
        setCreateDialogOpen(false)
        await fetchDocuments()
        setCreatingDocument(false)
        return
      }

      // Fallback: synchronous generation via API client (legacy path)
      let generatedText: string | undefined
      try {
        const genResult = await apiClient.generateDocument(aiPrompt, selectedTemplate)
        if (genResult?.result?.content) generatedText = genResult.result.content
        else if (genResult?.result?.choices?.[0]?.message?.content) generatedText = genResult.result.choices[0].message.content
        else if (genResult?.content) generatedText = genResult.content
        else if (typeof genResult === 'string') generatedText = genResult
        else generatedText = JSON.stringify(genResult)
      } catch (aiError) {
        console.warn('AI generation failed, falling back to template content', aiError)
      }

      const documentData = {
        name: documentName,
        content: generatedText ? { text: generatedText } : templateContent,
        template_id: selectedTemplate,
        status: 'draft' as const,
      }

      await apiClient.createDocument(projectId, documentData)

      toast.success("Document created successfully!")

      // Reset form
      setDocumentName("")
      setDocumentDescription("")
      setSelectedTemplate("")
      setCreateDialogOpen(false)

      // Refresh documents list
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to create document:", error)
      toast.error("Failed to create document")
    } finally {
      setCreatingDocument(false)
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

  // Fetch templates for upload
  const fetchTemplatesForUpload = async () => {
    try {
      setLoadingTemplates(true)
      const response = await apiClient.getTemplates({ 
        framework: project?.framework || undefined,
        limit: 50 
      })
      setTemplates(Array.isArray(response.templates) ? response.templates : [])
    } catch (error) {
      console.error("Failed to fetch templates:", error)
      toast.error("Failed to load templates")
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Handle upload document button click
  const handleUploadDocumentClick = () => {
    setUploadForm({
      name: "",
      file: null,
      template_id: "",
    })
    setUploadDialogOpen(true)
    fetchTemplatesForUpload()
  }

  // Upload document handler
  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
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
        // Handle text files - wrap in object as expected by backend
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

  // Legacy upload handler (for backward compatibility)
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Show template selection dialog instead of direct upload
    setUploadForm({
      name: file.name,
      file: file,
      template_id: "",
    })
    setUploadDialogOpen(true)
    fetchTemplatesForUpload()
  }

  // Edit document (redirect to editor)
  const handleEditDocument = (documentId: string) => {
    window.location.href = `/projects/${projectId}/documents/${documentId}`
  }

  // Download document
  const handleDownloadDocument = async (documentId: string) => {
    try {
      const docData = await apiClient.getDocument(documentId)
      
      // Create a blob with the document content
      const content = typeof docData.content === 'string' 
        ? docData.content 
        : docData.content ? JSON.stringify(docData.content) : 'No content available'
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link and trigger download
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${docData.name}.txt`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      toast.success("Document downloaded successfully!")
    } catch (error) {
      console.error("Failed to download document:", error)
      toast.error("Failed to download document")
    }
  }

  // Handle opening edit dialog
  const handleEditProject = () => {
    if (!project) return
    
    // Format dates for input fields (YYYY-MM-DD)
    const formatDateForInput = (dateString?: string | null) => {
      if (!dateString) return ""
      try {
        // Handle different date formats that might come from the database
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ""
        
        // Ensure we get the date in local timezone for the input
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch (error) {
        console.warn("Error formatting date:", dateString, error)
        return ""
      }
    }
    
    // Extract manager from team_members (assuming first member is manager)
    const manager = project.team_members && project.team_members.length > 0 ? project.team_members[0] : ""
    const teamMembers = project.team_members || []
    
    setEditForm({
      name: project.name || "",
      description: project.description || "",
      framework: project.framework || "",
      status: project.status || "",
      priority: project.priority || "",
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date),
      budget: project.budget?.toString() || "",
      manager: manager,
      team_members: teamMembers
    })
    
    setEditProjectDialogOpen(true)
  }

  // Update project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editForm.name || !editForm.framework) {
      toast.error("Please fill in required fields (Name and Framework)")
      return
    }

    // Validate dates if provided
    if (editForm.start_date && editForm.end_date) {
      const startDate = new Date(editForm.start_date)
      const endDate = new Date(editForm.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    // Validate budget if provided
    if (editForm.budget && isNaN(parseFloat(editForm.budget))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setUpdating(true)
      
      // Prepare team members array (include manager as first member if specified)
      let teamMembers = [...editForm.team_members]
      if (editForm.manager && !teamMembers.includes(editForm.manager)) {
        teamMembers = [editForm.manager, ...teamMembers]
      }
      
      const updateData = {
        name: editForm.name,
        description: editForm.description,
        framework: editForm.framework,
        status: editForm.status,
        priority: editForm.priority,
        start_date: editForm.start_date || undefined,
        end_date: editForm.end_date || undefined,
        budget: editForm.budget ? parseFloat(editForm.budget) : undefined,
        team_members: teamMembers
      }
      
      await apiClient.updateProject(projectId, updateData)
      
      toast.success("Project updated successfully!")
      setEditProjectDialogOpen(false)
      await fetchProject()
    } catch (error) {
      console.error("Failed to update project:", error)
      toast.error("Failed to update project. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  // Add team member
  const handleAddTeamMember = () => {
    const memberName = prompt("Enter team member name:")
    if (memberName && memberName.trim()) {
      const trimmedName = memberName.trim()
      // Check if member already exists
      if (editForm.team_members.includes(trimmedName)) {
        toast.error("Team member already exists")
        return
      }
      setEditForm(prev => ({
        ...prev,
        team_members: [...prev.team_members, trimmedName]
      }))
      toast.success("Team member added successfully")
    }
  }

  // Remove team member
  const handleRemoveTeamMember = (index: number) => {
    const memberName = editForm.team_members[index]
    setEditForm(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }))
    toast.success(`Removed ${memberName} from team`)
  }

  // Handle opening new stakeholder dialog
  const handleAddStakeholder = () => {
    setEditingStakeholder(null)
    setStakeholderForm({
      name: "",
      role: "",
      department: "",
      email: "",
      phone: "",
      interest_level: "medium",
      influence_level: "medium",
      engagement_approach: "keep_informed",
      communication_frequency: "weekly",
      stakeholder_type: "internal",
      stakeholder_category: "primary",
      expectations: "",
      potential_impact: ""
    })
    setStakeholderDialogOpen(true)
  }

  // Handle opening edit stakeholder dialog
  const handleEditStakeholder = (stakeholder: Stakeholder) => {
    setEditingStakeholder(stakeholder)
    setStakeholderForm({
      name: stakeholder.name,
      role: stakeholder.role,
      department: stakeholder.department,
      email: stakeholder.email,
      phone: stakeholder.phone || "",
      interest_level: stakeholder.interest_level,
      influence_level: stakeholder.influence_level,
      engagement_approach: stakeholder.engagement_approach,
      communication_frequency: stakeholder.communication_frequency,
      stakeholder_type: stakeholder.stakeholder_type,
      stakeholder_category: stakeholder.stakeholder_category,
      expectations: stakeholder.expectations,
      potential_impact: stakeholder.potential_impact
    })
    setStakeholderDialogOpen(true)
  }

  // Save stakeholder (create or update)
  const handleSaveStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stakeholderForm.role || !stakeholderForm.email) {
      toast.error("Please fill in required fields (Role, Email)")
      return
    }

    try {
      setSavingStakeholder(true)
      
      if (editingStakeholder) {
        // Update existing stakeholder
        await apiClient.updateStakeholder(editingStakeholder.id, stakeholderForm)
        toast.success("Stakeholder updated successfully!")
      } else {
        // Create new stakeholder
        await apiClient.createStakeholder({
          project_id: projectId,
          ...stakeholderForm
        })
        toast.success("Stakeholder added successfully!")
      }
      
      setStakeholderDialogOpen(false)
      // Refresh stakeholders list
      await fetchStakeholders()
    } catch (error) {
      console.error("Failed to save stakeholder:", error)
      toast.error("Failed to save stakeholder")
    } finally {
      setSavingStakeholder(false)
    }
  }

  // Delete stakeholder
  const handleDeleteStakeholder = async (stakeholderId: string) => {
    if (!confirm("Are you sure you want to delete this stakeholder? This action cannot be undone.")) {
      return
    }
    
    try {
      await apiClient.deleteStakeholder(stakeholderId)
      toast.success("Stakeholder deleted successfully!")
      // Refresh stakeholders list
      await fetchStakeholders()
    } catch (error) {
      console.error("Failed to delete stakeholder:", error)
      toast.error("Failed to delete stakeholder")
    }
  }

  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchProject()
    }
  }, [projectId, isAuthenticated])

  // Fetch documents when pagination or search changes
  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchDocuments()
    }
  }, [documentsPagination.page, searchTerm])

  // Listen for document creation events via WebSocket and refresh documents for this project
  const { on, off } = useWebSocket()
  useEffect(() => {
    const handleDocumentCreated = (data: { document?: { project_id: string; name: string } }) => {
      try {
        const doc = data?.document
        if (doc && doc.project_id && doc.name && String(doc.project_id) === String(projectId)) {
          toast.success(`New document created: ${doc.name}`)
          fetchDocuments()
        }
      } catch (err) {
        console.warn('Error handling document:created event', err)
      }
    }

    on("document:created", handleDocumentCreated)

    return () => {
      off("document:created", handleDocumentCreated)
    }
  }, [projectId, on, off])

  // Documents are now filtered server-side, so we use them directly
  const displayDocuments = documents

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "draft":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "secondary"
    }
  }

  // Helper functions for stakeholder display
  const getInterestLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getInfluenceLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "default"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getEngagementApproachColor = (approach: string) => {
    switch (approach) {
      case "manage_closely":
        return "default"
      case "keep_satisfied":
        return "secondary"
      case "keep_informed":
        return "outline"
      case "monitor":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatEngagementApproach = (approach: string) => {
    switch (approach) {
      case "manage_closely":
        return "Manage Closely"
      case "keep_satisfied":
        return "Keep Satisfied"
      case "keep_informed":
        return "Keep Informed"
      case "monitor":
        return "Monitor"
      default:
        return approach
    }
  }

  const formatCommunicationFrequency = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "bi_weekly":
        return "Bi-weekly"
      case "monthly":
        return "Monthly"
      case "as_needed":
        return "As Needed"
      default:
        return frequency
    }
  }

  // Calculate progress based on project timeline
  const getProjectProgress = () => {
    if (!project?.start_date || !project?.end_date) return 0
    
    const startDate = new Date(project.start_date)
    const endDate = new Date(project.end_date)
    const now = new Date()
    
    if (now < startDate) return 0
    if (now > endDate) return 100
    
    const totalDays = endDate.getTime() - startDate.getTime()
    const elapsedDays = now.getTime() - startDate.getTime()
    return Math.round((elapsedDays / totalDays) * 100)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access this project.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading project...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
              <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
              <Button asChild>
                <Link href="/projects">Back to Projects</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const progress = getProjectProgress()

  // Determine project manager and other members for Team tab ordering
  const managerName = (project as any).owner_name || (project.team_members && project.team_members.length > 0 ? project.team_members[0] : 'Not assigned')
  const otherMembers = project.team_members ? project.team_members.filter((m) => m !== managerName) : []

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Project Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <FolderOpen className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                    <p className="text-muted-foreground">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="default">{project.status}</Badge>
                  <Badge variant="outline">{project.framework}</Badge>
                  <Badge variant="secondary">{project.priority}</Badge>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleEditProject}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleCreateDocument}>
                      <DialogHeader>
                        <DialogTitle>Generate New Document</DialogTitle>
                        <DialogDescription>
                          Create a new document from available templates for this project.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="template">Select Template</Label>
                          <select
                            id="template"
                            aria-label="Select Template"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            required
                          >
                            <option value="">Choose a template</option>
                            <optgroup label="PMBOK 7 Templates">
                              <option value="project-charter">Project Charter</option>
                              <option value="scope-statement">Project Scope Statement</option>
                              <option value="wbs">Work Breakdown Structure</option>
                              <option value="risk-plan">Risk Management Plan</option>
                              <option value="comm-plan">Communication Plan</option>
                            </optgroup>
                            <optgroup label="BABOK v3 Templates">
                              <option value="requirements-analysis">Requirements Analysis</option>
                              <option value="stakeholder-analysis">Stakeholder Analysis</option>
                              <option value="business-case">Business Case</option>
                              <option value="solution-assessment">Solution Assessment</option>
                            </optgroup>
                            <optgroup label="DMBOK 2.0 Templates">
                              <option value="data-governance">Data Governance Framework</option>
                              <option value="data-quality">Data Quality Assessment</option>
                              <option value="data-architecture">Data Architecture</option>
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="doc-name">Document Name</Label>
                          <Input 
                            id="doc-name" 
                            placeholder="Enter document name" 
                            className="mt-1"
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="doc-description">Description (Optional)</Label>
                          <Input 
                            id="doc-description" 
                            placeholder="Brief description of the document" 
                            className="mt-1"
                            value={documentDescription}
                            onChange={(e) => setDocumentDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={creatingDocument}>
                          {creatingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {creatingDocument ? "Creating..." : "Generate Document"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
                  <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdateProject}>
                      <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>
                          Update project details, team members, and timeline.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-project-name" className="text-sm font-semibold">
                              Project Name *
                            </Label>
                            <Input 
                              id="edit-project-name" 
                              placeholder="Enter project name" 
                              className="mt-2"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-priority" className="text-sm font-semibold">
                              Priority
                            </Label>
                            <select
                              id="edit-priority"
                              aria-label="Priority"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={editForm.priority}
                              onChange={(e) => setEditForm(prev => ({...prev, priority: e.target.value}))}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-framework" className="text-sm font-semibold">
                              Framework *
                            </Label>
                            <select
                              id="edit-framework"
                              aria-label="Framework"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={editForm.framework}
                              onChange={(e) => setEditForm(prev => ({...prev, framework: e.target.value}))}
                              required
                            >
                              <option value="">Select framework</option>
                              <option value="BABOK v3">BABOK v3</option>
                              <option value="PMBOK 7">PMBOK 7</option>
                              <option value="DMBOK 2.0">DMBOK 2.0</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="edit-status" className="text-sm font-semibold">
                              Status
                            </Label>
                            <select
                              id="edit-status"
                              aria-label="Status"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={editForm.status}
                              onChange={(e) => setEditForm(prev => ({...prev, status: e.target.value}))}
                            >
                              <option value="planning">Planning</option>
                              <option value="active">Active</option>
                              <option value="on-hold">On Hold</option>
                              <option value="completed">Completed</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="edit-description" className="text-sm font-semibold">
                            Description
                          </Label>
                          <Textarea
                            id="edit-description"
                            placeholder="Describe the project objectives and scope"
                            className="mt-2"
                            value={editForm.description}
                            onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                            rows={3}
                          />
                        </div>

                        {/* Timeline and Budget */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="edit-start-date" className="text-sm font-semibold">
                              Start Date
                            </Label>
                            <Input
                              id="edit-start-date"
                              type="date"
                              className="mt-2"
                              value={editForm.start_date}
                              onChange={(e) => setEditForm(prev => ({...prev, start_date: e.target.value}))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-end-date" className="text-sm font-semibold">
                              End Date
                            </Label>
                            <Input
                              id="edit-end-date"
                              type="date"
                              className="mt-2"
                              value={editForm.end_date}
                              onChange={(e) => setEditForm(prev => ({...prev, end_date: e.target.value}))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-budget" className="text-sm font-semibold">
                              Budget
                            </Label>
                            <Input
                              id="edit-budget"
                              type="number"
                              placeholder="0"
                              className="mt-2"
                              value={editForm.budget}
                              onChange={(e) => setEditForm(prev => ({...prev, budget: e.target.value}))}
                            />
                          </div>
                        </div>

                        {/* Project Manager */}
                        <div>
                          <Label htmlFor="edit-manager" className="text-sm font-semibold">
                            Project Manager
                          </Label>
                          <Input
                            id="edit-manager"
                            placeholder="Enter project manager name"
                            className="mt-2"
                            value={editForm.manager}
                            onChange={(e) => setEditForm(prev => ({...prev, manager: e.target.value}))}
                          />
                        </div>

                        {/* Team Members */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">Team Members</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddTeamMember}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Member
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {editForm.team_members.map((member, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{member}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTeamMember(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {editForm.team_members.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                No team members added yet
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditProjectDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updating}>
                          {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {updating ? "Updating..." : "Update Project"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Stakeholder Dialog */}
                <Dialog open={stakeholderDialogOpen} onOpenChange={setStakeholderDialogOpen}>
                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSaveStakeholder}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingStakeholder 
                            ? 'Update stakeholder information and PMBOK parameters.'
                            : 'Add a new stakeholder with their PMBOK management parameters. You can create placeholders for roles that need to be recruited by leaving the name field blank.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stakeholder-role" className="text-sm font-semibold">
                              Role *
                            </Label>
                            <Input 
                              id="stakeholder-role" 
                              placeholder="Enter role/title (e.g., Project Manager, Business Analyst)" 
                              className="mt-2"
                              value={stakeholderForm.role}
                              onChange={(e) => setStakeholderForm(prev => ({...prev, role: e.target.value}))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="stakeholder-name" className="text-sm font-semibold">
                              Name (Optional)
                            </Label>
                            <Input 
                              id="stakeholder-name" 
                              placeholder="Enter stakeholder name (leave blank if to be recruited)" 
                              className="mt-2"
                              value={stakeholderForm.name}
                              onChange={(e) => setStakeholderForm(prev => ({...prev, name: e.target.value}))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stakeholder-department" className="text-sm font-semibold">
                              Department
                            </Label>
                            <Input 
                              id="stakeholder-department" 
                              placeholder="Enter department" 
                              className="mt-2"
                              value={stakeholderForm.department}
                              onChange={(e) => setStakeholderForm(prev => ({...prev, department: e.target.value}))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="stakeholder-email" className="text-sm font-semibold">
                              Email *
                            </Label>
                            <Input 
                              id="stakeholder-email" 
                              type="email"
                              placeholder="Enter email address" 
                              className="mt-2"
                              value={stakeholderForm.email}
                              onChange={(e) => setStakeholderForm(prev => ({...prev, email: e.target.value}))}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stakeholder-phone" className="text-sm font-semibold">
                              Phone
                            </Label>
                            <Input 
                              id="stakeholder-phone" 
                              placeholder="Enter phone number" 
                              className="mt-2"
                              value={stakeholderForm.phone}
                              onChange={(e) => setStakeholderForm(prev => ({...prev, phone: e.target.value}))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="stakeholder-type" className="text-sm font-semibold">
                              Stakeholder Type
                            </Label>
                            <select
                              id="stakeholder-type"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={stakeholderForm.stakeholder_type}
                              onChange={(e) => setStakeholderForm(prev => ({...prev, stakeholder_type: e.target.value as 'internal' | 'external'}))}
                            >
                              <option value="internal">Internal</option>
                              <option value="external">External</option>
                            </select>
                          </div>
                        </div>

                        {/* PMBOK Parameters */}
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4">PMBOK Stakeholder Parameters</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="interest-level" className="text-sm font-semibold">
                                Interest Level
                              </Label>
                              <select
                                id="interest-level"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.interest_level}
                                onChange={(e) => setStakeholderForm(prev => ({...prev, interest_level: e.target.value as 'high' | 'medium' | 'low'}))}
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="influence-level" className="text-sm font-semibold">
                                Influence Level
                              </Label>
                              <select
                                id="influence-level"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.influence_level}
                                onChange={(e) => setStakeholderForm(prev => ({...prev, influence_level: e.target.value as 'high' | 'medium' | 'low'}))}
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor="engagement-approach" className="text-sm font-semibold">
                                Engagement Approach
                              </Label>
                              <select
                                id="engagement-approach"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.engagement_approach}
                                onChange={(e) => setStakeholderForm(prev => ({...prev, engagement_approach: e.target.value as 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'}))}
                              >
                                <option value="manage_closely">Manage Closely</option>
                                <option value="keep_satisfied">Keep Satisfied</option>
                                <option value="keep_informed">Keep Informed</option>
                                <option value="monitor">Monitor</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="communication-frequency" className="text-sm font-semibold">
                                Communication Frequency
                              </Label>
                              <select
                                id="communication-frequency"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.communication_frequency}
                                onChange={(e) => setStakeholderForm(prev => ({...prev, communication_frequency: e.target.value as 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'}))}
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="bi_weekly">Bi-weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="as_needed">As Needed</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor="stakeholder-category" className="text-sm font-semibold">
                                Stakeholder Category
                              </Label>
                              <select
                                id="stakeholder-category"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.stakeholder_category}
                                onChange={(e) => setStakeholderForm(prev => ({...prev, stakeholder_category: e.target.value as 'primary' | 'secondary'}))}
                              >
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Expectations and Impact */}
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4">Stakeholder Analysis</h3>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="expectations" className="text-sm font-semibold">
                                Expectations
                              </Label>
                              <Textarea
                                id="expectations"
                                placeholder="Describe what this stakeholder expects from the project"
                                className="mt-2"
                                value={stakeholderForm.expectations}
                                onChange={(e) => setStakeholderForm(prev => ({...prev, expectations: e.target.value}))}
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="potential-impact" className="text-sm font-semibold">
                                Potential Impact on Project
                              </Label>
                              <Textarea
                                id="potential-impact"
                                placeholder="Describe how this stakeholder can impact the project"
                                className="mt-2"
                                value={stakeholderForm.potential_impact}
                                onChange={(e) => setStakeholderForm(prev => ({...prev, potential_impact: e.target.value}))}
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setStakeholderDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={savingStakeholder}>
                          {savingStakeholder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {savingStakeholder ? "Saving..." : (editingStakeholder ? "Update Stakeholder" : "Add Stakeholder")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Upload Document Dialog */}
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handleUploadDocumentSubmit}>
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                          Upload a document to {project?.name}. Select a template to ensure proper metadata tagging.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        <div>
                          <Label htmlFor="upload-doc-name" className="text-sm font-semibold">
                            Document Name *
                          </Label>
                          <Input
                            id="upload-doc-name"
                            placeholder="Enter document name"
                            value={uploadForm.name}
                            onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                            className="mt-2"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="upload-template-select" className="text-sm font-semibold">
                            Template *
                          </Label>
                          <select 
                            id="upload-template-select"
                            title="Select a template for metadata tagging"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                            value={uploadForm.template_id}
                            onChange={(e) => setUploadForm({...uploadForm, template_id: e.target.value})}
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
                          <Label htmlFor="file-upload" className="text-sm font-semibold">
                            File *
                          </Label>
                          <Input
                            id="file-upload"
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.md"
                            onChange={(e) => {
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
                      <DialogFooter>
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
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4">
                {/* Search */}
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" onClick={handleUploadDocumentClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                {/* Loading state for documents */}
                {documentsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading documents...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayDocuments.map((doc) => (
                      <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {getStatusIcon(doc.status)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <Link
                                    href={`/projects/${projectId}/documents/${doc.id}/view`}
                                    className="font-semibold hover:text-primary transition-colors"
                                  >
                                    {doc.name}
                                  </Link>
                                  <Badge variant={getStatusColor(doc.status)} className="text-xs">
                                    {doc.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <span>v{doc.version}</span>
                                  <span>•</span>
                                  <span>Modified {new Date(doc.updated_at).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>by {doc.updated_by}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${projectId}/documents/${doc.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${projectId}/documents/${doc.id}/view`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditDocument(doc.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit in Text Editor
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/projects/${projectId}/documents/${doc.id}/view`}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View in Rich Editor
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadDocument(doc.id)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {displayDocuments.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm 
                            ? "Try adjusting your search criteria" 
                            : "Start by generating your first document for this project"
                          }
                        </p>
                        {!searchTerm && (
                          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Generate First Document
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        )}
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {displayDocuments.length > 0 && documentsPagination.pages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {((documentsPagination.page - 1) * documentsPagination.limit) + 1} to {Math.min(documentsPagination.page * documentsPagination.limit, documentsPagination.total)} of {documentsPagination.total} documents
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocumentsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={documentsPagination.page <= 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {documentsPagination.page} of {documentsPagination.pages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocumentsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={documentsPagination.page >= documentsPagination.pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Progress</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{progress}%</div>
                      <Progress value={progress} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Budget</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                      </div>
                      <p className="text-xs text-muted-foreground">Total allocated</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Manager</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">{managerName || 'Not assigned'}</div>
                      <p className="text-xs text-muted-foreground">Project manager</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{project.team_members?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Team members</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Documents</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{documents.length}</div>
                      <p className="text-xs text-muted-foreground">Generated docs</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stakeholders" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Project Stakeholders</h2>
                    <p className="text-muted-foreground">Manage stakeholders and their PMBOK parameters</p>
                  </div>
                  <Button onClick={handleAddStakeholder}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stakeholder
                  </Button>
                </div>

                {/* Loading state for stakeholders */}
                {stakeholdersLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading stakeholders...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stakeholders.length > 0 ? (
                      stakeholders.map((stakeholder) => (
                        <Card key={stakeholder.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-4">
                                {/* Header with role as primary identifier */}
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold">{stakeholder.role}</h3>
                                    <p className="text-muted-foreground">
                                      {stakeholder.name ? `${stakeholder.name} • ` : ''}{stakeholder.department}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Badge variant={stakeholder.stakeholder_type === 'internal' ? 'default' : 'secondary'}>
                                        {stakeholder.stakeholder_type === 'internal' ? 'Internal' : 'External'}
                                      </Badge>
                                      <Badge variant={stakeholder.stakeholder_category === 'primary' ? 'default' : 'outline'}>
                                        {stakeholder.stakeholder_category === 'primary' ? 'Primary' : 'Secondary'}
                                      </Badge>
                                      {!stakeholder.name && (
                                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                                          To Be Recruited
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Contact Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <p className="text-sm">{stakeholder.email}</p>
                                  </div>
                                  {stakeholder.phone && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                      <p className="text-sm">{stakeholder.phone}</p>
                                    </div>
                                  )}
                                </div>

                                {/* PMBOK Parameters */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Interest Level</p>
                                    <Badge variant={getInterestLevelColor(stakeholder.interest_level)}>
                                      {stakeholder.interest_level.charAt(0).toUpperCase() + stakeholder.interest_level.slice(1)}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Influence Level</p>
                                    <Badge variant={getInfluenceLevelColor(stakeholder.influence_level)}>
                                      {stakeholder.influence_level.charAt(0).toUpperCase() + stakeholder.influence_level.slice(1)}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Engagement Approach</p>
                                    <Badge variant={getEngagementApproachColor(stakeholder.engagement_approach)}>
                                      {formatEngagementApproach(stakeholder.engagement_approach)}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Communication</p>
                                    <Badge variant="outline">
                                      {formatCommunicationFrequency(stakeholder.communication_frequency)}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Expectations and Impact */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Expectations</p>
                                    <p className="text-sm">{stakeholder.expectations || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Potential Impact</p>
                                    <p className="text-sm">{stakeholder.potential_impact || 'Not specified'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditStakeholder(stakeholder)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteStakeholder(stakeholder.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No stakeholders found</h3>
                        <p className="text-muted-foreground mb-4">
                          Start by adding stakeholders or creating placeholders for roles that need to be recruited
                        </p>
                        <Button onClick={handleAddStakeholder}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Stakeholder
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Timeline</CardTitle>
                    <CardDescription>Key milestones and deadlines</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {project.start_date && (
                        <div className="flex items-center space-x-4">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Project Start</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(project.start_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Current Phase: {project.status}</p>
                          <p className="text-sm text-muted-foreground">In progress</p>
                        </div>
                      </div>
                      
                      {project.end_date && (
                        <div className="flex items-center space-x-4">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Project End</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(project.end_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
