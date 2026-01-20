"use client"

import React, { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  Sparkles,
  Clock,
  Loader2,
  FileUp,
  Wand2,
  AlertCircle,
  CheckCircle,
} from "@/components/ui/icons-shim"
import { apiClient, Project, Template } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from '@/lib/notify'
import Link from "next/link"

// Utility imports
import { getStatusColor, getPriorityColor, getProjectProgress } from "./utils/helpers"

// Component imports
import { ProjectsHeader } from "./components/ProjectsHeader"
import { ProjectsGrid } from "./components/ProjectsGrid"
import { EmptyState } from "./components/EmptyState"
import { Pagination } from "./components/Pagination"
import { CreateProjectDialog } from "./components/CreateProjectDialog"
import { EditProjectDialog } from "./components/EditProjectDialog"
import { GenerateDocumentDialog } from "./components/GenerateDocumentDialog"
import { UploadDocumentDialog } from "./components/UploadDocumentDialog"

// Type imports
import type { NewProjectForm, DocumentGenerationForm, DocumentUploadForm, GenerationProgress, PaginationState } from "./types"

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

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 9,
    total: 0,
    pages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  // Form state for creating new project
  const [newProject, setNewProject] = useState<NewProjectForm>({
    name: "",
    description: "",
    framework: "",
    priority: "medium",
    start_date: "",
    end_date: "",
    budget: "",
    manager: "",
  })

  // Form state for editing project
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Document generation state
  const [generatingDocument, setGeneratingDocument] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedProjectForGeneration, setSelectedProjectForGeneration] = useState<Project | null>(null)
  const [documentGenerationForm, setDocumentGenerationForm] = useState<DocumentGenerationForm>({
    name: "",
    template_id: "",
    prompt: "",
    provider: "Groq AI",
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
  })
  
  // Generation progress tracking
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    step: 0,
    totalSteps: 4,
    message: '',
    percentage: 0,
  })

  // Document upload state
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedProjectForUpload, setSelectedProjectForUpload] = useState<Project | null>(null)
  const [documentUploadForm, setDocumentUploadForm] = useState<DocumentUploadForm>({
    name: "",
    file: null,
    template_id: "",
  })

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true)
      let params: any = {
        page: pagination.page,
        limit: pagination.limit,
      }

      if (statusFilter !== "all") {
        params.status = statusFilter
      }

      if (searchTerm) {
        params.search = searchTerm
      }

      const response = await apiClient.getProjects(params)
      setProjects(response.projects || [])
      setPagination(response.pagination || pagination)
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      toast.error("Failed to load projects")
      // Use fallback mock data if API fails
      setProjects([
        {
          id: "1",
          name: "Customer Portal Redesign",
          description: "Complete redesign of the customer-facing portal with improved UX and new features",
          status: "active",
          framework: "PMBOK 7",
          priority: "high",
          owner_id: "user1",
          team_members: ["John Doe", "Jane Smith", "Mike Wilson"],
          start_date: "2024-01-15",
          end_date: "2024-06-30",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-20T00:00:00Z",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Create new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name || !newProject.framework) {
      toast.error("Please fill in required fields (Name and Framework)")
      return
    }

    // Validate dates if provided
    if (newProject.start_date && newProject.end_date) {
      const startDate = new Date(newProject.start_date)
      const endDate = new Date(newProject.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    // Validate budget if provided
    if (newProject.budget && isNaN(parseFloat(newProject.budget))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setCreating(true)
      const projectData = {
        ...newProject,
        team_members: newProject.manager ? [newProject.manager] : [],
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        start_date: newProject.start_date || undefined,
        end_date: newProject.end_date || undefined,
      }
      
      const createdProject = await apiClient.createProject(projectData)
      
      // Check if there's a business case draft to save as a document
      const projectDraft = sessionStorage.getItem('project-draft')
      console.log('🔍 Checking for project draft in sessionStorage:', {
        hasDraft: !!projectDraft,
        draftLength: projectDraft?.length
      })
      
      if (projectDraft) {
        try {
          const draft = JSON.parse(projectDraft)
          const content = draft.content || ''
          
          console.log('🔍 Project draft parsed:', {
            hasContent: !!content,
            contentLength: content.length,
            templateId: draft.templateId,
            templateName: draft.templateName,
            framework: draft.framework
          })
          
          // Create a document from the business case
          if (content && createdProject && createdProject.id) {
            try {
              console.log('📄 Attempting to save business case as document...', {
                projectId: createdProject.id,
                projectName: createdProject.name,
                contentLength: content.length,
                templateId: draft.templateId
              })
              
              // Create document via API (expects JSON, not file upload)
              const documentData = {
                name: draft.templateName || `${newProject.name} - Business Case`,
                content: content,
                template_id: draft.templateId || null,
                status: 'draft', // Changed from 'final' to 'draft'
                metadata: draft.metadata || {}
              }
              
              console.log('📄 Sending document data:', {
                ...documentData,
                content: `${content.substring(0, 100)}... (${content.length} chars total)`
              })
              
              // Use apiClient instead of raw fetch to avoid URL duplication
              const createdDocument = await apiClient.createDocument(createdProject.id, documentData)
              
              console.log('✅ Document created successfully:', createdDocument)
              toast.success(`Project created with ${draft.templateName || 'initial document'}!`)
            } catch (docCreateError: any) {
              console.error('❌ Document creation failed:', docCreateError)
              toast.error(`Project created, but document failed to save: ${docCreateError.message || 'Unknown error'}`)
            }
          } else {
            console.log('⚠️ Skipping document creation:', {
              hasContent: !!content,
              contentLength: content?.length,
              hasProject: !!createdProject,
              hasProjectId: !!createdProject?.id,
              projectId: createdProject?.id
            })
            toast.success("Project created successfully!")
          }
          
          // Clear the draft from session storage
          sessionStorage.removeItem('project-draft')
        } catch (docError) {
          console.error("❌ Failed to save business case as document:", docError)
          toast.error("Project created, but initial document could not be saved. You can upload it manually.")
        }
      } else {
        console.log('ℹ️ No project draft found in sessionStorage - creating project without initial document')
        toast.success("Project created successfully!")
      }
      
      setDialogOpen(false)
      setNewProject({
        name: "",
        description: "",
        framework: "",
        priority: "medium",
        start_date: "",
        end_date: "",
        budget: "",
        manager: "",
      })
      fetchProjects() // Refresh the list
    } catch (error) {
      console.error("Failed to create project:", error)
      toast.error("Failed to create project. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  // Update project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingProject?.name || !editingProject?.framework) {
      toast.error("Please fill in required fields (Name and Framework)")
      return
    }

    // Validate dates if provided
    if (editingProject.start_date && editingProject.end_date) {
      const startDate = new Date(editingProject.start_date)
      const endDate = new Date(editingProject.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    // Validate budget if provided
    if (editingProject.budget && isNaN(parseFloat(editingProject.budget.toString()))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setUpdating(true)
      const projectData = {
        ...editingProject,
        budget: editingProject.budget ? parseFloat(editingProject.budget.toString()) : undefined,
        start_date: editingProject.start_date || undefined,
        end_date: editingProject.end_date || undefined,
      }
      
      await apiClient.updateProject(editingProject.id, projectData)
      toast.success("Project updated successfully!")
      setEditDialogOpen(false)
      setEditingProject(null)
      fetchProjects() // Refresh the list
    } catch (error) {
      console.error("Failed to update project:", error)
      toast.error("Failed to update project. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  // Handle edit project
  const handleEditProject = (project: Project) => {
    // Normalize dates to YYYY-MM-DD so <input type="date"> displays them correctly
    const normalizeDate = (d?: string | null) => {
      try {
        if (!d) return ""
        const dt = new Date(d)
        if (isNaN(dt.getTime())) return ""
        
        // Ensure we get the date in local timezone for the input
        const year = dt.getFullYear()
        const month = String(dt.getMonth() + 1).padStart(2, '0')
        const day = String(dt.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch (e) {
        console.warn("Error formatting date:", d, e)
        return ""
      }
    }

    setEditingProject({
      ...project,
      start_date: normalizeDate(project.start_date as any),
      end_date: normalizeDate(project.end_date as any),
    })
    setEditDialogOpen(true)
  }

  // Handle archive project
  const handleArchiveProject = async (projectId: string) => {
    try {
      await apiClient.updateProject(projectId, { status: "archived" })
      toast.success("Project archived successfully!")
      fetchProjects()
    } catch (error) {
      console.error("Failed to archive project:", error)
      toast.error("Failed to archive project")
    }
  }

  // Handle delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return
    }
    try {
      await apiClient.deleteProject(projectId)
      toast.success("Project deleted successfully!")
      fetchProjects()
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast.error("Failed to delete project")
    }
  }

  // Handle generate document
  const handleGenerateDocument = (project: Project) => {
    setSelectedProjectForGeneration(project)
    setDocumentGenerationForm({
      name: `${project.name} - Generated Document`,
      template_id: "",
      prompt: `Generate a comprehensive document for the ${project.name} project using the ${project.framework} framework. Include project overview, objectives, timeline, and key deliverables.`,
      provider: "Groq AI",
      model: "llama-3.1-8b-instant",
      temperature: 0.7
    })
    setGenerateDialogOpen(true)
    fetchTemplates()
  }

  // Handle upload document
  const handleUploadDocument = (project: Project) => {
    setSelectedProjectForUpload(project)
    setDocumentUploadForm({
      name: "",
      file: null,
      template_id: "",
    })
    setUploadDialogOpen(true)
    fetchTemplatesForUpload(project.framework)
  }

  // Fetch templates for document generation (fetch ALL templates)
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await apiClient.getTemplates({ 
        limit: 100  // Increased limit to get more templates
      })
      setTemplates(response.templates || [])
    } catch (error) {
      console.error("Failed to fetch templates:", error)
      toast.error("Failed to load templates")
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Fetch templates for document upload (fetch ALL templates)
  const fetchTemplatesForUpload = async (framework: string) => {
    try {
      setLoadingTemplates(true)
      const response = await apiClient.getTemplates({ 
        limit: 100  // Increased limit to get more templates
      })
      setTemplates(response.templates || [])
    } catch (error) {
      console.error("Failed to fetch templates:", error)
      toast.error("Failed to load templates")
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Generate document handler
  const handleGenerateDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProjectForGeneration || !documentGenerationForm.name || !documentGenerationForm.prompt) {
      toast.error("Please fill in required fields")
      return
    }

    try {
      setGeneratingDocument(true)
      
      // Step 1: Preparing context
      setGenerationProgress({
        step: 1,
        totalSteps: 4,
        message: 'Preparing project context...',
        percentage: 25,
      })
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Step 2: Generating content with AI
      setGenerationProgress({
        step: 2,
        totalSteps: 4,
        message: `Generating content with ${documentGenerationForm.provider}...`,
        percentage: 50,
      })
      
      // Generate content using AI Gateway
      const aiResponse = await apiClient.generateContent({
        prompt: documentGenerationForm.prompt,
        provider: documentGenerationForm.provider || "Groq AI",
        model: documentGenerationForm.model || "llama-3.1-8b-instant",
        temperature: documentGenerationForm.temperature || 0.7,
        template_id: documentGenerationForm.template_id || undefined,
      })

      // Extract Markdown content from response
      const content = aiResponse.result?.content || aiResponse.result?.text || aiResponse.content || aiResponse.text || "# Document content not generated"
      
      // Step 3: Saving document
      setGenerationProgress({
        step: 3,
        totalSteps: 4,
        message: 'Content generated! Saving document...',
        percentage: 75,
      })

      // Create document with generated content
      await apiClient.createDocument(selectedProjectForGeneration.id, {
        name: documentGenerationForm.name,
        content: content,
        template_id: documentGenerationForm.template_id || undefined,
        status: "draft",
      })
      
      // Step 4: Complete!
      setGenerationProgress({
        step: 4,
        totalSteps: 4,
        message: 'Document created successfully! ✓',
        percentage: 100,
      })
      
      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 800))

      toast.success("Document generated successfully!")
      setGenerateDialogOpen(false)
      setSelectedProjectForGeneration(null)
      setDocumentGenerationForm({
        name: "",
        template_id: "",
        prompt: "",
        provider: "Groq AI",
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
      })
      setGenerationProgress({ step: 0, totalSteps: 4, message: '', percentage: 0 })
    } catch (error) {
      console.error("Failed to generate document:", error)
      toast.error("Failed to generate document")
      setGenerationProgress({ step: 0, totalSteps: 4, message: '', percentage: 0 })
    } finally {
      setGeneratingDocument(false)
    }
  }

  // Upload document handler
  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProjectForUpload || !documentUploadForm.name || !documentUploadForm.file || !documentUploadForm.template_id) {
      toast.error("Please fill in all required fields including template selection")
      return
    }

    try {
      setUploadingDocument(true)
      
      // For binary files, we'll store them as base64 or use FormData
      // For now, let's handle text files and create a placeholder for binary files
      let content: any
      
      // CRITICAL: Validate file object is actually a File, not a metadata object
      if (!(documentUploadForm.file instanceof File)) {
        console.error('❌ Invalid file object:', documentUploadForm.file)
        throw new Error("Invalid file object. Please select a valid file.")
      }

      // CRITICAL: For PDF/DOCX files, use the upload endpoint that converts to Markdown
      // For text files, we can create directly with Markdown content
      // Use case-insensitive file extension checks as primary detection method
      const fileName = documentUploadForm.file.name.toLowerCase()
      const fileType = documentUploadForm.file.type?.toLowerCase() || ''
      
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
        fileName: documentUploadForm.file.name,
        fileType: documentUploadForm.file.type,
        isPDF,
        isDOCX,
        isTXT,
        isMD,
        isBinaryFile,
        isTextFile
      })
      
      if (isBinaryFile) {
        // For binary files (PDF/DOCX), use the upload endpoint
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }

        const formData = new FormData()
        formData.append('files', documentUploadForm.file)
        formData.append('projectId', selectedProjectForUpload.id)
        formData.append('assessmentName', documentUploadForm.name)
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/onboarding/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
          throw new Error(error.error?.message || error.message || 'Failed to upload document')
        }

        const result = await response.json()
        
        toast.success("Document uploaded successfully! Processing will begin shortly.")
        setUploadDialogOpen(false)
        setSelectedProjectForUpload(null)
        setDocumentUploadForm({
          name: "",
          file: null,
          template_id: "",
        })
        
        // Refresh projects to update document count
        fetchProjects()
        return // Exit early - don't continue to createDocument
      } else if (isTextFile) {
        // For text files, read content and create document directly with Markdown
        const textContent = await documentUploadForm.file.text()
        
        // CRITICAL: Ensure content is a string, never an object
        if (typeof textContent !== 'string' || textContent.trim() === '') {
          throw new Error("File content is empty or invalid. Cannot create document.")
        }

        // Ensure we're not sending any file metadata
        const documentData = {
          name: documentUploadForm.name,
          content: textContent, // Store as plain Markdown string (never an object)
          template_id: documentUploadForm.template_id,
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

        await apiClient.createDocument(selectedProjectForUpload.id, documentData)

      toast.success("Document uploaded successfully!")
      setUploadDialogOpen(false)
      setSelectedProjectForUpload(null)
      setDocumentUploadForm({
        name: "",
        file: null,
        template_id: "",
      })
      
      // Refresh projects to update document count
      fetchProjects()
      } else {
        // If file type cannot be determined, reject it to prevent sending metadata objects
        console.error('❌ Unsupported file type:', {
          fileName: documentUploadForm.file.name,
          fileType: documentUploadForm.file.type,
          fileSize: documentUploadForm.file.size,
          isBinaryFile,
          isTextFile
        })
        throw new Error(`Unsupported file type: ${documentUploadForm.file.name}. Please upload PDF, DOCX, TXT, or Markdown files. The file type could not be determined.`)
      }
    } catch (error: any) {
      console.error("❌ Failed to upload document:", {
        error: error.message,
        fileName: documentUploadForm.file?.name,
        fileType: documentUploadForm.file?.type,
        stack: error.stack
      })
      toast.error(error.message || "Failed to upload document. Please ensure the file is a PDF, DOCX, TXT, or Markdown file.")
    } finally {
      setUploadingDocument(false)
    }
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort by most recently updated first
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    // Sort by last_activity (most recent document or project update)
    const aTime = (a as any).last_activity ? new Date((a as any).last_activity).getTime() : 
                  a.updated_at ? new Date(a.updated_at).getTime() : 0
    const bTime = (b as any).last_activity ? new Date((b as any).last_activity).getTime() : 
                  b.updated_at ? new Date(b.updated_at).getTime() : 0
    return bTime - aTime
  })

  // Utility functions now in utils/helpers.ts
  // Fetch projects on component mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    }
  }, [isAuthenticated, statusFilter, searchTerm, pagination.page])

  // Auto-open create dialog if coming from AI page
  useEffect(() => {
    const autoCreate = sessionStorage.getItem('auto-create-project')
    const projectDraft = sessionStorage.getItem('project-draft')
    
    if (autoCreate === 'true' && projectDraft) {
      try {
        const draft = JSON.parse(projectDraft)
        const content = draft.content || ''
        
        // Extract project name from business case or ideation title
        let projectName = ''
        
        // Try Business Case format first
        let titleMatch = content.match(/^#\s*Business Case:\s*(.+?)$/m)
        if (titleMatch && titleMatch[1]) {
          projectName = titleMatch[1].trim()
        } else {
          // Try Ideation format
          titleMatch = content.match(/^#\s*💡\s*Ideation:\s*(.+?)$/m)
          if (titleMatch && titleMatch[1]) {
            projectName = titleMatch[1].trim()
          } else {
            // Try generic heading format
            titleMatch = content.match(/^#\s+(.+?)$/m)
            if (titleMatch && titleMatch[1] && !titleMatch[1].includes('Business Case') && !titleMatch[1].includes('Ideation')) {
              projectName = titleMatch[1].trim()
            } else {
              // Fallback: try to find "Project Name:" in the content
              const projectNameMatch = content.match(/\*\*Project Name:\*\*\s*(.+?)(?:\n|$)/m)
              projectName = projectNameMatch ? projectNameMatch[1].trim() : (draft.templateName?.replace(' Template', '') || 'New Project')
            }
          }
        }
        
        // Extract description from Business Need or Core Concept section (increased to 2000 chars)
        let description = ''
        
        // Try Business Case format (1.2 Business Need)
        let descMatch = content.match(/###\s*1\.2\s*Business Need\s*\n([\s\S]+?)(?=\n###|\n##|$)/i)
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim().substring(0, 2000)
        } else {
          // Try Ideation format - get entire "The Spark" section including Core Concept
          descMatch = content.match(/##\s*1\.\s*The Spark[:\s]+What's the Big Idea\?\s*\n([\s\S]+?)(?=\n##\s*2\.|$)/i)
          if (descMatch && descMatch[1]) {
            // Extract the text, removing markdown headers
            let sparkText = descMatch[1].trim()
            // Remove the ### headers but keep the content
            sparkText = sparkText.replace(/###\s*[\d.]+\s*[^\n]+\n/g, '')
            description = sparkText.substring(0, 2000)
          } else {
            // Try just Core Concept section
            descMatch = content.match(/###\s*1\.1\s*Core Concept\s*\n([\s\S]+?)(?=\n###|\n##|$)/i)
            if (descMatch && descMatch[1]) {
              description = descMatch[1].trim().substring(0, 2000)
            } else {
              // Fallback to executive summary
              descMatch = content.match(/##\s*1\.\s*Executive Summary\s*\n([\s\S]+?)(?=\n##|$)/i)
              if (descMatch && descMatch[1]) {
                description = descMatch[1].trim().substring(0, 2000)
              } else {
                description = content.substring(0, 2000)
              }
            }
          }
        }
        
        // Extract Project Manager
        let manager = ''
        const pmMatch = content.match(/\*\*Project Manager:\*\*\s*(.+?)(?:\n|,|$)/m)
        if (pmMatch && pmMatch[1]) {
          manager = pmMatch[1].trim()
        } else {
          const preparedByMatch = content.match(/\*\*Prepared By:\*\*\s*(.+?)(?:\n|,|$)/m)
          if (preparedByMatch && preparedByMatch[1]) {
            manager = preparedByMatch[1].trim()
          }
        }
        
        // Extract Budget
        let budget = ''
        const budgetMatches = [
          content.match(/\*\*Estimated Cost:\*\*\s*\$?([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)?/i),
          content.match(/budget.*?\$?([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)?/i),
          content.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)/i),
          content.match(/investment.*?\$?([\d,]+(?:\.\d+)?)\s*(?:M|Million|K|Thousand)?/i)
        ]
        for (const match of budgetMatches) {
          if (match && match[1]) {
            let budgetValue = match[1].replace(/,/g, '')
            const parsedValue = parseFloat(budgetValue)
            
            // Only set budget if we got a valid number
            if (!isNaN(parsedValue) && parsedValue > 0) {
              // If the text mentions "M" or "Million", multiply by 1,000,000
              if (match[0].match(/M|Million/i)) {
                budget = (parsedValue * 1000000).toString()
              } else if (match[0].match(/K|Thousand/i)) {
                budget = (parsedValue * 1000).toString()
              } else {
                budget = parsedValue.toString()
              }
              break
            }
          }
        }
        // If no budget found, leave empty (not NaN)
        if (!budget || budget === 'NaN') {
          budget = ''
        }
        
        // Extract Timeline/Dates
        let startDate = ''
        let endDate = ''
        
        // Try to find timeline mentions
        const timelineMatch = content.match(/\*\*High-level Timeline:\*\*\s*(.+?)(?:\n|$)/m)
        if (timelineMatch && timelineMatch[1]) {
          const timeline = timelineMatch[1]
          // Try to extract months (e.g., "12 months", "18-24 months")
          const monthsMatch = timeline.match(/(\d+)(?:-(\d+))?\s*months?/i)
          if (monthsMatch) {
            const months = parseInt(monthsMatch[1])
            const today = new Date()
            startDate = today.toISOString().split('T')[0]
            const endDateObj = new Date(today)
            endDateObj.setMonth(endDateObj.getMonth() + months)
            endDate = endDateObj.toISOString().split('T')[0]
          }
        }
        
        // Try to extract specific dates (e.g., "Q2 2026", "June 1, 2026")
        if (!startDate) {
          const dateRangeMatch = content.match(/(?:October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\s*[–-]\s*(?:October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i)
          if (dateRangeMatch) {
            const dates = dateRangeMatch[0].split(/[–-]/)
            if (dates.length === 2) {
              try {
                startDate = new Date(dates[0].trim()).toISOString().split('T')[0]
                endDate = new Date(dates[1].trim()).toISOString().split('T')[0]
              } catch (e) {
                // Invalid date format, leave blank
              }
            }
          }
        }
        
        // Extract Framework (fallback chain)
        // For ideations and business cases, use the template's framework as default
        let framework = draft.framework || 'Custom'
        
        // Try to find explicit framework mention in content (for business cases)
        if (!framework || framework === 'Custom') {
          const frameworkMatch = content.match(/\*\*Framework:\*\*\s*(.+?)(?:\n|,|$)/m)
          if (frameworkMatch && frameworkMatch[1]) {
            framework = frameworkMatch[1].trim()
          } else {
            // For business cases, try to infer from content
            if (content.includes('PMBOK') || content.includes('Project Management')) {
              framework = 'PMBOK 7'
            } else if (content.includes('BABOK') || content.includes('Business Analysis')) {
              framework = 'BABOK'
            } else {
              // Use template framework or default to Custom
              framework = draft.framework || 'Custom'
            }
          }
        }
        
        // Pre-fill the form with extracted business case data
        setNewProject({
          name: projectName,
          description: description,
          framework: framework,
          priority: 'high',
          start_date: startDate,
          end_date: endDate,
          budget: budget,
          manager: manager,
        })
        
        // Open the create dialog
        setDialogOpen(true)
        
        // Clear the flags so it doesn't auto-open again
        sessionStorage.removeItem('auto-create-project')
        
        toast.success('Business case loaded! Review and complete the project details.')
      } catch (error) {
        console.error('Failed to load project draft:', error)
        toast.error('Failed to load business case data')
        sessionStorage.removeItem('auto-create-project')
        sessionStorage.removeItem('project-draft')
      }
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access projects.</p>
        </div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatedLayout className="space-y-8">
              {/* Hero Header with Search and Filter */}
              <ProjectsHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onCreateClick={() => setDialogOpen(true)}
                projectsCount={pagination.total}
              />

              {/* Create Project Dialog */}
              <CreateProjectDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                newProject={newProject}
                onProjectChange={setNewProject}
                onSubmit={handleCreateProject}
                creating={creating}
              />

              {/* Edit Project Dialog */}
              <EditProjectDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                project={editingProject}
                onProjectChange={setEditingProject}
                onSubmit={handleUpdateProject}
                updating={updating}
              />

              {/* Generate Document Dialog */}
              <GenerateDocumentDialog
                open={generateDialogOpen}
                onOpenChange={setGenerateDialogOpen}
                project={selectedProjectForGeneration}
                templates={templates}
                form={documentGenerationForm}
                onFormChange={setDocumentGenerationForm}
                onSubmit={handleGenerateDocumentSubmit}
                generating={generatingDocument}
                progress={generationProgress}
              />

              {/* Upload Document Dialog */}
              <UploadDocumentDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                project={selectedProjectForUpload}
                templates={templates}
                form={documentUploadForm}
                onFormChange={setDocumentUploadForm}
                onSubmit={handleUploadDocumentSubmit}
                uploading={uploadingDocument}
              />

              {/* Projects Grid */}
              <ProjectsGrid
                projects={sortedProjects}
                loading={loading}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                onArchive={handleArchiveProject}
                onGenerateDocument={handleGenerateDocument}
                onUploadDocument={handleUploadDocument}
              />

              {/* Empty State */}
              {!loading && sortedProjects.length === 0 && (
                <EmptyState
                  searchTerm={searchTerm}
                  statusFilter={statusFilter}
                  onCreateClick={() => setDialogOpen(true)}
                />
              )}

              {/* Pagination */}
              <Pagination
                pagination={pagination}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                loading={loading}
                hasProjects={sortedProjects.length > 0}
              />
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
