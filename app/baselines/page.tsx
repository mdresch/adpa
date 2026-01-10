'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import { Loader2, Plus, RefreshCw, CheckCircle2, Archive, TrendingUp, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Project {
  id: string
  name: string
  status?: string
}

interface Baseline {
  id: string
  project_id: string
  baseline_name: string
  baseline_type: string
  baseline_version: number
  entity_count: Record<string, number>
  is_approved: boolean
  approved_at?: string
  approved_by?: string
  status: string
  created_at: string
  created_by?: string
}

export default function BaselinesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [newBaseline, setNewBaseline] = useState({
    baselineName: '',
    baselineType: 'project' as 'project' | 'phase' | 'milestone' | 'version' | 'custom',
    includeMetadata: true
  })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const response = await apiClient.getProjects({ limit: 100 })
      setProjects(response.projects || [])
    } catch (error: any) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    const queryProjectId = searchParams?.get('projectId')
    if (queryProjectId) {
      setProjectId(queryProjectId)
      localStorage.setItem('selectedProjectId', queryProjectId)
      return
    }

    const pathParts = window.location.pathname.split('/')
    const projectIdx = pathParts.indexOf('projects')
    if (projectIdx !== -1 && pathParts[projectIdx + 1]) {
      const id = pathParts[projectIdx + 1]
      setProjectId(id)
      localStorage.setItem('selectedProjectId', id)
      return
    }

    const stored = localStorage.getItem('selectedProjectId')
    if (stored) {
      setProjectId(stored)
    }
  }, [searchParams])

  useEffect(() => {
    if (projectId) {
      loadBaselines()
    }
  }, [projectId])

  const loadBaselines = async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const response = await apiClient.request<{ success: boolean; data: Baseline[] }>(
        `/entities/baselines/project/${projectId}`
      )
      
      if (response.success) {
        setBaselines(response.data || [])
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load baselines',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBaseline = async () => {
    if (!projectId || !newBaseline.baselineName) {
      toast({
        title: 'Error',
        description: 'Please provide a baseline name',
        variant: 'destructive'
      })
      return
    }

    setCreating(true)
    try {
      const response = await apiClient.request<{ success: boolean }>(
        `/entities/baselines/project/${projectId}`,
        {
          method: 'POST',
          body: JSON.stringify(newBaseline)
        }
      )
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Baseline created successfully'
        })
        setOpenDialog(false)
        setNewBaseline({
          baselineName: '',
          baselineType: 'project',
          includeMetadata: true
        })
        await loadBaselines()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create baseline',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleApprove = async (baselineId: string) => {
    try {
      const response = await apiClient.request<{ success: boolean }>(
        `/entities/baselines/${baselineId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      )
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Baseline approved'
        })
        await loadBaselines()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve baseline',
        variant: 'destructive'
      })
    }
  }

  const handleArchive = async (baselineId: string) => {
    try {
      const response = await apiClient.request<{ success: boolean }>(
        `/entities/baselines/${baselineId}/archive`,
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      )
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Baseline archived'
        })
        await loadBaselines()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive baseline',
        variant: 'destructive'
      })
    }
  }

  const handleCompare = async (baselineId: string) => {
    try {
      const response = await apiClient.request<{ success: boolean; data: { drift_detected: boolean; drift_summary?: string } }>(
        `/entities/baselines/${baselineId}/compare`,
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      )
      
      if (response.success) {
        toast({
          title: 'Comparison Complete',
          description: response.data.drift_detected 
            ? `Drift detected: ${response.data.drift_summary}`
            : 'No drift detected'
        })
        // Navigate to drift page or show comparison results
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to compare baseline',
        variant: 'destructive'
      })
    }
  }

  const getTotalEntities = (baseline: Baseline) => {
    return Object.values(baseline.entity_count || {}).reduce((sum, count) => sum + count, 0)
  }

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId)
    localStorage.setItem('selectedProjectId', newProjectId)
    router.push(`/baselines?projectId=${newProjectId}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Baseline Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage project entity baselines
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadBaselines}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Baseline
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Baseline</DialogTitle>
                <DialogDescription>
                  Create a snapshot of current project entities as a baseline
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="baselineName">Baseline Name</Label>
                  <Input
                    id="baselineName"
                    value={newBaseline.baselineName}
                    onChange={(e) => setNewBaseline({ ...newBaseline, baselineName: e.target.value })}
                    placeholder="e.g., Project Kickoff Baseline"
                  />
                </div>
                <div>
                  <Label htmlFor="baselineType">Baseline Type</Label>
                  <Select
                    value={newBaseline.baselineType}
                    onValueChange={(value: any) => setNewBaseline({ ...newBaseline, baselineType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="phase">Phase</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="version">Version</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBaseline} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>
            Choose a project to manage baselines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="project-select">Project</Label>
              <Select
                value={projectId}
                onValueChange={handleProjectChange}
                disabled={loadingProjects}
              >
                <SelectTrigger id="project-select">
                  <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} {project.status ? `(${project.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {projectId && (
              <Button
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}`)}
              >
                View Project
              </Button>
            )}
          </div>
          {!projectId && (
            <Alert className="mt-4">
              <AlertDescription>
                Please select a project to manage baselines.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Baselines</CardDescription>
            <CardTitle className="text-2xl">{baselines.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Baselines</CardDescription>
            <CardTitle className="text-2xl">
              {baselines.filter(b => b.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl">
              {baselines.filter(b => b.is_approved).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest Version</CardDescription>
            <CardTitle className="text-2xl">
              {baselines.length > 0 
                ? Math.max(...baselines.map(b => b.baseline_version))
                : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Baselines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Baselines</CardTitle>
          <CardDescription>
            {baselines.length} baseline{baselines.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : baselines.length === 0 ? (
            <Alert>
              <AlertDescription>
                No baselines found. Create a baseline to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Entities</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baselines.map((baseline) => (
                  <TableRow key={baseline.id}>
                    <TableCell className="font-medium">{baseline.baseline_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{baseline.baseline_type}</Badge>
                    </TableCell>
                    <TableCell>v{baseline.baseline_version}</TableCell>
                    <TableCell>{getTotalEntities(baseline)}</TableCell>
                    <TableCell>
                      <Badge variant={baseline.status === 'active' ? 'default' : 'secondary'}>
                        {baseline.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {baseline.is_approved ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(baseline.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompare(baseline.id)}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Compare
                        </Button>
                        {!baseline.is_approved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(baseline.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        {baseline.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(baseline.id)}
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

