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
import { apiClient, Project } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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

export default function ProjectDetail() {
  const params = useParams()
  const projectId = params.id as string
  const { isAuthenticated } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [documentName, setDocumentName] = useState("")
  const [documentDescription, setDocumentDescription] = useState("")
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false)

  // Fetch project data
  const fetchProject = async () => {
    try {
      setLoading(true)
      const projectData = await apiClient.getProject(projectId)
      setProject(projectData)
      
      // Also fetch documents for this project
      await fetchDocuments()
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
      const documentsData = await apiClient.getProjectDocuments(projectId)
      setDocuments(documentsData.documents || [])
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      // Don't show error toast for documents, just use empty array
      setDocuments([])
    } finally {
      setDocumentsLoading(false)
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
      
      // Get template content (for now, we'll use a basic structure)
      const templateContent = getTemplateContent(selectedTemplate)
      
      const documentData = {
        name: documentName,
        content: templateContent,
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

  // Upload document
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // For now, we'll create a document with the file content
      // In a real implementation, you'd upload the file to storage first
      const content = await file.text()
      
      await apiClient.createDocument(projectId, {
        name: file.name,
        content: { text: content },
        status: "draft"
      })
      
      toast.success("Document uploaded successfully!")
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to upload document:", error)
      toast.error("Failed to upload document")
    }
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
        : JSON.stringify(docData.content)
      
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

  // Update project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!project) return

    try {
      setCreatingDocument(true)
      await apiClient.updateProject(projectId, {
        name: project.name,
        description: project.description,
        status: project.status
      })
      
      toast.success("Project updated successfully!")
      setEditProjectDialogOpen(false)
      await fetchProject()
    } catch (error) {
      console.error("Failed to update project:", error)
      toast.error("Failed to update project")
    } finally {
      setCreatingDocument(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchProject()
    }
  }, [projectId, isAuthenticated])

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                <Button variant="outline" onClick={() => setEditProjectDialogOpen(true)}>
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
                  <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleUpdateProject}>
                      <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>
                          Update project details and settings.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="project-name">Project Name</Label>
                          <Input 
                            id="project-name" 
                            placeholder="Enter project name" 
                            className="mt-1"
                            value={project?.name || ""}
                            onChange={(e) => setProject(prev => prev ? {...prev, name: e.target.value} : null)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-description">Description</Label>
                          <Input 
                            id="project-description" 
                            placeholder="Enter project description" 
                            className="mt-1"
                            value={project?.description || ""}
                            onChange={(e) => setProject(prev => prev ? {...prev, description: e.target.value} : null)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-status">Status</Label>
                          <select
                            id="project-status"
                            aria-label="Project Status"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                            value={project?.status || ""}
                            onChange={(e) => setProject(prev => prev ? {...prev, status: e.target.value} : null)}
                          >
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="on-hold">On Hold</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={creatingDocument}>
                          {creatingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {creatingDocument ? "Updating..." : "Update Project"}
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
                <TabsTrigger value="team">Team</TabsTrigger>
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
                  <Button variant="outline" onClick={() => document.getElementById('document-upload')?.click()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  <input
                    id="document-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleDocumentUpload}
                    title="Upload document"
                  />
                </div>

                {/* Loading state for documents */}
                {documentsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading documents...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDocuments.map((doc) => (
                      <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {getStatusIcon(doc.status)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <Link
                                    href={`/projects/${projectId}/documents/${doc.id}`}
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
                                    Edit
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
                    
                    {filteredDocuments.length === 0 && (
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
                  </div>
                )}
              </TabsContent>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <div className="text-2xl font-bold">{project.budget || 'Not set'}</div>
                      <p className="text-xs text-muted-foreground">Total allocated</p>
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

              <TabsContent value="team" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Team</CardTitle>
                    <CardDescription>Team members and their roles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {project.team_members?.map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {member
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{member}</p>
                              <p className="text-sm text-muted-foreground">Team Member</p>
                            </div>
                          </div>
                          <Badge variant="outline">Member</Badge>
                        </div>
                      ))}
                      
                      {(!project.team_members || project.team_members.length === 0) && (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No team members</h3>
                          <p className="text-muted-foreground">Add team members to get started</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
