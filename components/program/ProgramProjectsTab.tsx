"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProjectSearchDialog, SearchableItem } from '@/components/ui/search-dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { getApiUrl } from '@/lib/api-url'
import { 
  Plus, 
  Loader2, 
  FolderOpen,
  Calendar,
  DollarSign,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search
} from '@/components/ui/icons-shim'

interface Project {
  id: string
  name: string
  description: string
  status: string
  budget?: number
  start_date?: string
  end_date?: string
  owner_name?: string
  program_id?: string
  document_count?: number
}

interface ProgramProjectsTabProps {
  programId: string
}

export function ProgramProjectsTab({ programId }: ProgramProjectsTabProps) {
  const router = useRouter()
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [projectSearchOpen, setProjectSearchOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<SearchableItem | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  
  // Create project form state
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    framework: '',
    priority: 'medium',
    start_date: '',
    end_date: '',
    budget: '',
  })

  useEffect(() => {
    void fetchProgramProjects()
    void fetchAllProjects()
  }, [programId])

  const fetchProgramProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch(getApiUrl(`/programs/${programId}/projects`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch program projects')
      }
      
      const data = await response.json()
      setAssignedProjects(data.data || [])
    } catch (error) {
      console.error('Failed to fetch program projects:', error)
      toast.error('Failed to load program projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllProjects = async () => {
    try {
      // Request all projects with high limit (no pagination for dropdown)
      const response = await fetch(getApiUrl(`/projects?limit=1000`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      setAllProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to fetch all projects:', error)
    }
  }

  const handleProjectSelect = (project: SearchableItem) => {
    setSelectedProjectId(project.id)
    setSelectedProject(project)
    setProjectSearchOpen(false)
  }

  const handleAssignProject = async () => {
    if (!selectedProjectId) return
    
    try {
      setAssigning(true)
      
      const response = await fetch(getApiUrl(`/programs/${programId}/add-project`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ projectId: selectedProjectId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to assign project')
      }
      
      toast.success('Project assigned to program successfully')
      setAssignDialogOpen(false)
      setSelectedProjectId('')
      setSelectedProject(null)
      fetchProgramProjects()
      fetchAllProjects() // Refresh to update available projects
      
    } catch (error) {
      console.error('Failed to assign project:', error)
      toast.error('Failed to assign project to program')
    } finally {
      setAssigning(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name || !newProject.framework) {
      toast.error('Please fill in required fields (Name and Framework)')
      return
    }

    // Validate dates if provided
    if (newProject.start_date && newProject.end_date) {
      const startDate = new Date(newProject.start_date)
      const endDate = new Date(newProject.end_date)
      if (endDate <= startDate) {
        toast.error('End date must be after start date')
        return
      }
    }

    // Validate budget if provided
    if (newProject.budget && isNaN(parseFloat(newProject.budget))) {
      toast.error('Please enter a valid budget amount')
      return
    }

    try {
      setCreating(true)
      
      const projectData = {
        name: newProject.name,
        description: newProject.description || undefined,
        framework: newProject.framework,
        priority: newProject.priority,
        start_date: newProject.start_date || undefined,
        end_date: newProject.end_date || undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        program_id: programId, // Automatically assign to this program
      }
      
      const createdProject = await apiClient.createProject(projectData)
      
      toast.success('Project created and assigned to program successfully!')
      setCreateDialogOpen(false)
      setNewProject({
        name: '',
        description: '',
        framework: '',
        priority: 'medium',
        start_date: '',
        end_date: '',
        budget: '',
      })
      
      // Refresh projects list
      await fetchProgramProjects()
      await fetchAllProjects()
      
      // Navigate to the newly created project
      if (createdProject?.id) {
        router.push(`/projects/${createdProject.id}`)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error('Failed to create project. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleRemoveProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Remove "${projectName}" from this program?`)) return
    
    try {
      setRemoving(projectId)
      
      const response = await fetch(getApiUrl(`/programs/${programId}/remove-project/${projectId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove project')
      }
      
      toast.success('Project removed from program')
      fetchProgramProjects()
      fetchAllProjects()
      
    } catch (error) {
      console.error('Failed to remove project:', error)
      toast.error('Failed to remove project from program')
    } finally {
      setRemoving(null)
    }
  }

  // Get unassigned projects
  const unassignedProjects = allProjects.filter(p => !p.program_id)

  // Get status configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20', label: 'Completed' }
      case 'active':
        return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20', label: 'Active' }
      case 'at_risk':
        return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20', label: 'At Risk' }
      case 'on_hold':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/20', label: 'On Hold' }
      default:
        return { icon: FolderOpen, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/20', label: status }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Assign Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Program Projects</CardTitle>
              <CardDescription className="mt-1.5">
                {assignedProjects.length} projects assigned to this program
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
              <Button onClick={() => setAssignDialogOpen(true)} disabled={unassignedProjects.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Project
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3">Loading projects...</span>
        </div>
      ) : assignedProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {assignedProjects.map((project) => {
            const statusConfig = getStatusConfig(project.status)
            const StatusIcon = statusConfig.icon
            
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Project Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/projects/${project.id}`} className="hover:underline">
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                        </Link>
                        <Badge className={statusConfig.bg}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {project.description || 'No description'}
                      </p>
                      
                      {/* Project Metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        {project.budget && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">Budget</div>
                              <div className="font-semibold">${project.budget.toLocaleString()}</div>
                            </div>
                          </div>
                        )}
                        
                        {project.start_date && project.end_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">Timeline</div>
                              <div className="font-semibold text-xs">
                                {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {typeof project.document_count !== 'undefined' && (
                          <div className="flex items-center gap-2 text-sm">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">Documents</div>
                              <div className="font-semibold">{project.document_count}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProject(project.id, project.name)}
                      disabled={removing === project.id}
                      className="ml-4"
                    >
                      {removing === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Assigned</h3>
            <p className="text-muted-foreground mb-4">
              Assign projects to this program to start tracking program-level metrics
            </p>
            <Button onClick={() => setAssignDialogOpen(true)} disabled={unassignedProjects.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Assign First Project
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assign Project Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Project to Program</DialogTitle>
            <DialogDescription>
              Select a project to assign to this program. Only projects not currently assigned to any program are shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Project</Label>
              <Button
                variant="outline"
                onClick={() => setProjectSearchOpen(true)}
                className="w-full justify-between mt-1.5"
              >
                {selectedProject ? (
                  <span>{selectedProject.name}</span>
                ) : (
                  <span className="text-muted-foreground">Search for a project to assign...</span>
                )}
                <Search className="h-4 w-4 ml-2" />
              </Button>
              
              {unassignedProjects.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  No unassigned projects available
                </p>
              )}
            </div>
            
            {selectedProject && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Selected Project Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">{selectedProject.name}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {selectedProject.description || 'No description'}
                    </div>
                    {('budget' in selectedProject) && typeof selectedProject.budget === 'number' && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Budget: ${selectedProject.budget.toLocaleString()}</span>
                      </div>
                    )}
                    {('start_date' in selectedProject) && ('end_date' in selectedProject) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(selectedProject.start_date as string).toLocaleDateString()} - {new Date(selectedProject.end_date as string).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Project Search Dialog */}
          <ProjectSearchDialog
            open={projectSearchOpen}
            onOpenChange={setProjectSearchOpen}
            projects={unassignedProjects.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              status: p.status,
              type: p.status,
              document_count: p.document_count,
              budget: p.budget,
              start_date: p.start_date,
              end_date: p.end_date
            }))}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleProjectSelect}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={handleAssignProject} disabled={!selectedProjectId || assigning}>
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project and automatically assign it to this program.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Name and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-project-name" className="text-sm font-semibold">
                    Project Name *
                  </Label>
                  <Input
                    id="create-project-name"
                    placeholder="Enter project name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-priority" className="text-sm font-semibold">
                    Priority
                  </Label>
                  <select
                    id="create-priority"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Framework */}
              <div>
                <Label htmlFor="create-framework" className="text-sm font-semibold">
                  Framework *
                </Label>
                <select
                  id="create-framework"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                  value={newProject.framework}
                  onChange={(e) => setNewProject({ ...newProject, framework: e.target.value })}
                  required
                >
                  <option value="">Select framework</option>
                  <option value="BABOK v3">BABOK v3</option>
                  <option value="PMBOK 7">PMBOK 7</option>
                  <option value="DMBOK 2.0">DMBOK 2.0</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="create-description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="create-description"
                  placeholder="Describe the project objectives and scope"
                  className="mt-2"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Timeline and Budget */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="create-start-date" className="text-sm font-semibold">
                    Start Date
                  </Label>
                  <Input
                    id="create-start-date"
                    type="date"
                    className="mt-2"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="create-end-date" className="text-sm font-semibold">
                    End Date
                  </Label>
                  <Input
                    id="create-end-date"
                    type="date"
                    className="mt-2"
                    value={newProject.end_date}
                    onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="create-budget" className="text-sm font-semibold">
                    Budget
                  </Label>
                  <Input
                    id="create-budget"
                    type="number"
                    placeholder="0"
                    className="mt-2"
                    value={newProject.budget}
                    onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

