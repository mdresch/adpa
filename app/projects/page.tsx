"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { apiClient, Project, Template } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  // Form state for creating new project
  const [newProject, setNewProject] = useState<{
    name: string
    description: string
    framework: string
    priority: string
    start_date: string
    end_date: string
    budget: string
    manager: string
  }>({
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
  const [documentGenerationForm, setDocumentGenerationForm] = useState<{
    name: string
    template_id: string
    prompt: string
    provider: string
    model: string
    temperature: number
  }>({
    name: "",
    template_id: "",
    prompt: "",
    provider: "Groq AI",
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
  })
  
  // Generation progress tracking
  const [generationProgress, setGenerationProgress] = useState({
    step: 0,
    totalSteps: 4,
    message: '',
    percentage: 0,
  })

  // Document upload state
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedProjectForUpload, setSelectedProjectForUpload] = useState<Project | null>(null)
  const [documentUploadForm, setDocumentUploadForm] = useState<{
    name: string
    file: File | null
    template_id: string
  }>({
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
      
      if (documentUploadForm.file.type === 'text/plain' || 
          documentUploadForm.file.type === 'application/json' ||
          documentUploadForm.file.name.endsWith('.txt') ||
          documentUploadForm.file.name.endsWith('.md')) {
        // Handle text files - wrap in object as expected by backend
        const textContent = await documentUploadForm.file.text()
        content = {
          text: textContent,
          fileName: documentUploadForm.file.name,
          fileType: documentUploadForm.file.type,
          uploadedAt: new Date().toISOString()
        }
      } else {
        // For binary files, create a placeholder
        content = {
          fileName: documentUploadForm.file.name,
          fileSize: documentUploadForm.file.size,
          fileType: documentUploadForm.file.type,
          uploadedAt: new Date().toISOString(),
          note: "Binary file uploaded - content stored separately"
        }
      }
      
      await apiClient.createDocument(selectedProjectForUpload.id, {
        name: documentUploadForm.name,
        content: content,
        template_id: documentUploadForm.template_id,
        status: "draft",
      })

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
    } catch (error) {
      console.error("Failed to upload document:", error)
      toast.error("Failed to upload document")
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
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0
    return bTime - aTime
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
      case "planning":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "completed":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
      case "on-hold":
        return "bg-gradient-to-r from-orange-500 to-red-500 text-white"
      default:
        return "bg-gradient-to-r from-slate-500 to-gray-500 text-white"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-50 dark:bg-red-900/20"
      case "medium":
        return "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
      case "low":
        return "text-green-500 bg-green-50 dark:bg-green-900/20"
      default:
        return "text-slate-500 bg-slate-50 dark:bg-slate-900/20"
    }
  }

  // Mock progress calculation (in real app, this would come from API)
  const getProjectProgress = (project: Project) => {
    const startDate = new Date(project.start_date || Date.now())
    const endDate = new Date(project.end_date || Date.now())
    const now = new Date()
    
    if (now < startDate) return 0
    if (now > endDate) return 100
    
    const totalDays = endDate.getTime() - startDate.getTime()
    const elapsedDays = now.getTime() - startDate.getTime()
    return Math.round((elapsedDays / totalDays) * 100)
  }

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
              {/* Hero Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                    >
                      <FolderOpen className="h-8 w-8 text-white" />
                    </motion.div>
                    <div>
                      <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                      >
                        Projects
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-slate-600 dark:text-slate-300 text-lg"
                      >
                        Manage projects and their associated documentation libraries ({pagination.total} total)
                      </motion.p>
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        >
                          <Sparkles className="h-4 w-4 ml-2" />
                        </motion.div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                      <form onSubmit={handleCreateProject}>
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Create New Project
                          </DialogTitle>
                          <DialogDescription className="text-slate-600 dark:text-slate-300">
                            Create a new project with document library and template integration.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="project-name" className="text-sm font-semibold">
                                Project Name *
                              </Label>
                              <Input
                                id="project-name"
                                placeholder="Enter project name"
                                value={newProject.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({...newProject, name: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="priority" className="text-sm font-semibold">
                                Priority
                              </Label>
                              <select 
                                id="priority"
                                title="Priority"
                                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                                value={newProject.priority}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewProject({...newProject, priority: e.target.value})}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="framework" className="text-sm font-semibold">
                                Framework *
                              </Label>
                              <Label htmlFor="framework" className="sr-only">
                                Framework
                              </Label>
                              <select 
                                id="framework"
                                title="Framework"
                                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                                value={newProject.framework}
                                onChange={(e) => setNewProject({...newProject, framework: e.target.value})}
                                required
                              >
                                <option value="">Select framework</option>
                                <option value="BABOK v3">BABOK v3</option>
                                <option value="PMBOK 7">PMBOK 7</option>
                                <option value="DMBOK 2.0">DMBOK 2.0</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="manager" className="text-sm font-semibold">
                                Project Manager
                              </Label>
                              <Input
                                id="manager"
                                placeholder="Enter manager name"
                                value={newProject.manager}
                                onChange={(e) => setNewProject({...newProject, manager: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="description" className="text-sm font-semibold">
                              Description
                            </Label>
                            <Textarea
                              id="description"
                              placeholder="Describe the project objectives and scope"
                              value={newProject.description}
                              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                              className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="start-date" className="text-sm font-semibold">
                                Start Date
                              </Label>
                              <Input
                                id="start-date"
                                type="date"
                                value={newProject.start_date}
                                onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <Label htmlFor="end-date" className="text-sm font-semibold">
                                End Date
                              </Label>
                              <Input
                                id="end-date"
                                type="date"
                                value={newProject.end_date}
                                onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <Label htmlFor="budget" className="text-sm font-semibold">
                                Budget
                              </Label>
                              <Input
                                id="budget"
                                placeholder="$0"
                                value={newProject.budget}
                                onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={creating}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                          >
                            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Project
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </motion.div>

              {/* Edit Project Dialog */}
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                  <form onSubmit={handleUpdateProject}>
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Edit Project
                      </DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-300">
                        Update project details and settings.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-project-name" className="text-sm font-semibold">
                            Project Name *
                          </Label>
                          <Input
                            id="edit-project-name"
                            placeholder="Enter project name"
                            value={editingProject?.name || ""}
                            onChange={(e) => setEditingProject({...editingProject!, name: e.target.value})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-priority" className="text-sm font-semibold">
                            Priority
                          </Label>
                          <select 
                            id="edit-priority"
                            title="Priority"
                            className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                            value={editingProject?.priority || "medium"}
                            onChange={(e) => setEditingProject({...editingProject!, priority: e.target.value})}
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
                            title="Framework"
                            className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                            value={editingProject?.framework || ""}
                            onChange={(e) => setEditingProject({...editingProject!, framework: e.target.value})}
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
                            title="Project Status"
                            className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                            value={editingProject?.status || ""}
                            onChange={(e) => setEditingProject({...editingProject!, status: e.target.value})}
                          >
                            <option value="active">Active</option>
                            <option value="planning">Planning</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
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
                          value={editingProject?.description || ""}
                          onChange={(e) => setEditingProject({...editingProject!, description: e.target.value})}
                          className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="edit-start-date" className="text-sm font-semibold">
                            Start Date
                          </Label>
                          <Input
                            id="edit-start-date"
                            type="date"
                            value={editingProject?.start_date || ""}
                            onChange={(e) => setEditingProject({...editingProject!, start_date: e.target.value})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-end-date" className="text-sm font-semibold">
                            End Date
                          </Label>
                          <Input
                            id="edit-end-date"
                            type="date"
                            value={editingProject?.end_date || ""}
                            onChange={(e) => setEditingProject({...editingProject!, end_date: e.target.value})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-budget" className="text-sm font-semibold">
                            Budget
                          </Label>
                          <Input
                            id="edit-budget"
                            placeholder="$0"
                            value={editingProject?.budget?.toString() || ""}
                            onChange={(e) => setEditingProject({...editingProject!, budget: Number(e.target.value)})}
                            className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={updating}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      >
                        {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Update Project
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Generate Document Dialog */}
              <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                  <form onSubmit={handleGenerateDocumentSubmit}>
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Generate Document
                      </DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-300">
                        Generate a new document for {selectedProjectForGeneration?.name} using AI
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div>
                        <Label htmlFor="doc-name" className="text-sm font-semibold">
                          Document Name *
                        </Label>
                        <Input
                          id="doc-name"
                          placeholder="Enter document name"
                          value={documentGenerationForm.name}
                          onChange={(e) => setDocumentGenerationForm({...documentGenerationForm, name: e.target.value})}
                          className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-select" className="text-sm font-semibold">
                          Template (Optional)
                        </Label>
                        <select 
                          id="template-select"
                          title="Select a template"
                          className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                          value={documentGenerationForm.template_id}
                          onChange={(e) => setDocumentGenerationForm({...documentGenerationForm, template_id: e.target.value})}
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
                        {documentGenerationForm.template_id && templates.find(t => t.id === documentGenerationForm.template_id) && (() => {
                          const selectedTemplate = templates.find(t => t.id === documentGenerationForm.template_id)!
                          return (
                            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Template Status:</span>
                                  {selectedTemplate.development_status && statusConfig[selectedTemplate.development_status as keyof typeof statusConfig] && (
                                    // @ts-expect-error - Badge accepts children via HTMLAttributes
                                    <Badge variant={statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].variant}>
                                      <>{statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].emoji} {statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].label}</>
                                    </Badge>
                                  )}
                                </div>
                                {selectedTemplate.health_rating && healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig] && (
                                  // @ts-expect-error - Badge accepts children via HTMLAttributes
                                  <Badge variant="outline" className={`text-xs ${healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].color}`}>
                                    <>{healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].icon} {selectedTemplate.health_rating}</>
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
                        <Label htmlFor="generation-prompt" className="text-sm font-semibold">
                          Generation Prompt *
                        </Label>
                        <Textarea
                          id="generation-prompt"
                          placeholder="Describe what you want the document to contain..."
                          value={documentGenerationForm.prompt}
                          onChange={(e) => setDocumentGenerationForm({...documentGenerationForm, prompt: e.target.value})}
                          className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          rows={4}
                          required
                        />
                      </div>
                      
                      {/* Progress Indicator */}
                      {generatingDocument && generationProgress.step > 0 && (
                        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">
                              Step {generationProgress.step} of {generationProgress.totalSteps}
                            </span>
                            <span className="text-muted-foreground">
                              {generationProgress.percentage}%
                            </span>
                          </div>
                          <Progress value={generationProgress.percentage} className="h-2" />
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">
                              {generationProgress.message}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={generatingDocument}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      >
                        {generatingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Document
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Upload Document Dialog */}
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                  <form onSubmit={handleUploadDocumentSubmit}>
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Upload Document
                      </DialogTitle>
                      <DialogDescription className="text-slate-600 dark:text-slate-300">
                        Upload a document to {selectedProjectForUpload?.name}. Select a template to ensure proper metadata tagging.
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
                          value={documentUploadForm.name}
                          onChange={(e) => setDocumentUploadForm({...documentUploadForm, name: e.target.value})}
                          className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
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
                          className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                          value={documentUploadForm.template_id}
                          onChange={(e) => setDocumentUploadForm({...documentUploadForm, template_id: e.target.value})}
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                            setDocumentUploadForm({...documentUploadForm, file})
                          }}
                          className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                          required
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Supported formats: PDF, DOC, DOCX, TXT, MD
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={uploadingDocument}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      >
                        {uploadingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <FileUp className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Search and Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex items-center space-x-4"
              >
                <div className="relative flex-1 max-w-md group">
                  <motion.div whileHover={{ scale: 1.02 }} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 transition-colors group-focus-within:text-blue-500" />
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20"
                    />
                  </motion.div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <motion.select
                    whileHover={{ scale: 1.02 }}
                    className="flex h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-blue-500 transition-colors"
                    value={statusFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="planning">Planning</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </motion.select>
                </div>
              </motion.div>

              {/* Loading State */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-slate-600 dark:text-slate-300">Loading projects...</span>
                </div>
              )}

              {/* Projects Grid */}
              {!loading && (
                <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedProjects.map((project, index) => {
                    const progress = getProjectProgress(project)
                    const documentsCount = (project as any).document_count || 0
                    
                    return (
                      <AnimatedGridItem key={project.id}>
                        <Card className="glass border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <CardHeader className="relative">
                            <div className="flex items-start justify-between">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                              >
                                <FolderOpen className="h-6 w-6 text-white" />
                              </motion.div>
                              <div className="flex flex-col space-y-2">
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                                >
                                  <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                                </motion.div>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.4, type: "spring" }}
                                >
                                  <Badge variant="outline" className="border-slate-300 dark:border-slate-600">
                                    {project.framework}
                                  </Badge>
                                </motion.div>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.5, type: "spring" }}
                                >
                                  <Badge className={getPriorityColor(project.priority)}>{project.priority}</Badge>
                                </motion.div>
                              </div>
                            </div>
                            <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                                {project.name}
                              </Link>
                            </CardTitle>
                            <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-300">
                              {project.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="relative space-y-6">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium text-slate-700 dark:text-slate-200">Progress</span>
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: index * 0.1 + 0.6 }}
                                  className="font-bold text-blue-600 dark:text-blue-400"
                                >
                                  {progress}%
                                </motion.span>
                              </div>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ delay: index * 0.1 + 0.7, duration: 0.8 }}
                              >
                                <Progress value={progress} className="h-3 bg-slate-100 dark:bg-slate-700">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ delay: index * 0.1 + 0.8, duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                                  />
                                </Progress>
                              </motion.div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 + 0.9 }}
                                className="space-y-1"
                              >
                                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                                  <Calendar className="h-3 w-3" />
                                  <span>Timeline</span>
                                </div>
                                <p className="font-medium text-xs text-slate-700 dark:text-slate-200">
                                  {project.start_date && new Date(project.start_date).toLocaleDateString()} -{" "}
                                  {project.end_date && new Date(project.end_date).toLocaleDateString()}
                                </p>
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 + 1.0 }}
                                className="space-y-1"
                              >
                                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                                  <FileText className="h-3 w-3" />
                                  <span>Documents</span>
                                </div>
                                <p className="font-medium text-slate-700 dark:text-slate-200">
                                  {documentsCount} files
                                </p>
                              </motion.div>
                            </div>

                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 + 1.1 }}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                                <Users className="h-3 w-3" />
                                <span className="text-sm">Team</span>
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-sm text-slate-700 dark:text-slate-200">
                                  {project.team_members?.length || 0} members
                                </p>
                                {(project as any).owner_name && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Manager: {(project as any).owner_name}
                                  </p>
                                )}
                              </div>
                            </motion.div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(project.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 + 1.2, type: "spring" }}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="glass border-0 shadow-xl">
                                    <DropdownMenuItem 
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                                      onClick={() => handleEditProject(project)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Project
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                                      onClick={() => handleGenerateDocument(project)}
                                    >
                                      <Wand2 className="h-4 w-4 mr-2" />
                                      Generate Document
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                                      onClick={() => handleUploadDocument(project)}
                                    >
                                      <FileUp className="h-4 w-4 mr-2" />
                                      Upload Document
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                                      onClick={() => handleArchiveProject(project.id)}
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => handleDeleteProject(project.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </motion.div>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedGridItem>
                    )
                  })}
                </AnimatedGrid>
              )}

              {!loading && sortedProjects.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-16"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl inline-block mb-6"
                  >
                    <FolderOpen className="h-16 w-16 text-slate-400 mx-auto" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No projects found</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                    {searchTerm || statusFilter !== "all"
                      ? "Try adjusting your search or filter criteria to find what you're looking for"
                      : "Create your first project to get started with document automation"}
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Project
                            <Sparkles className="h-4 w-4 ml-2" />
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Pagination */}
              {!loading && sortedProjects.length > 0 && pagination.pages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="flex items-center justify-between"
                >
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} projects
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
                    <span className="text-sm text-slate-600 dark:text-slate-300">
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
                </motion.div>
              )}
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
