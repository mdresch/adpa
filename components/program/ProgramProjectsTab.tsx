"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [projectSearchOpen, setProjectSearchOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<SearchableItem | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    fetchProgramProjects()
    fetchAllProjects()
  }, [programId])

  const fetchProgramProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/projects`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects?limit=1000`, {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/add-project`, {
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

  const handleRemoveProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Remove "${projectName}" from this program?`)) return
    
    try {
      setRemoving(projectId)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/remove-project/${projectId}`, {
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
            <Button onClick={() => setAssignDialogOpen(true)} disabled={unassignedProjects.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Project
            </Button>
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
                    {(selectedProject as any).budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Budget: ${(selectedProject as any).budget.toLocaleString()}</span>
                      </div>
                    )}
                    {(selectedProject as any).start_date && (selectedProject as any).end_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date((selectedProject as any).start_date).toLocaleDateString()} - {new Date((selectedProject as any).end_date).toLocaleDateString()}
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
              document_count: (p as any).document_count,
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
    </div>
  )
}

