'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import { Loader2, RefreshCw, TriangleAlert, CheckCircle2, XCircle, TrendingUp, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Project {
  id: string
  name: string
  status?: string
}

interface DriftDetection {
  id: string
  project_id: string
  baseline_id?: string
  drift_type: string
  drift_category: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  drift_data: Record<string, any>
  affected_entity_ids: string[]
  affected_entity_types: string[]
  detection_method: string
  detection_confidence?: number
  status: 'open' | 'acknowledged' | 'accepted' | 'reverted' | 'resolved' | 'false_positive'
  resolution_action?: string
  resolution_notes?: string
  detected_at: string
  jira_issue_key?: string
  jira_issue_url?: string
}

export default function DriftPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [drifts, setDrifts] = useState<DriftDetection[]>([])
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedDrift, setSelectedDrift] = useState<DriftDetection | null>(null)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolutionAction, setResolutionAction] = useState<string>('accept')
  const [resolutionNotes, setResolutionNotes] = useState('')

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
      loadDrifts()
    }
  }, [projectId, filterSeverity, filterStatus, filterType])

  const loadDrifts = async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSeverity !== 'all') params.append('severity', filterSeverity)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterType !== 'all') params.append('driftType', filterType)

      const response = await apiClient.request<{ success: boolean; data: DriftDetection[] }>(
        `/entities/drift/project/${projectId}?${params.toString()}`
      )
      
      if (response.success) {
        setDrifts(response.data || [])
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load drift detections',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDetectDrift = async () => {
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'Please select a project',
        variant: 'destructive'
      })
      return
    }

    setDetecting(true)
    try {
      const response = await apiClient.request<{ success: boolean; count: number }>(
        `/entities/drift/detect/project/${projectId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            autoCreateJiraIssue: true
          })
        }
      )
      
      if (response.success) {
        toast({
          title: 'Drift Detection Complete',
          description: `Found ${response.count} drift detection${response.count !== 1 ? 's' : ''}`
        })
        await loadDrifts()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to detect drift',
        variant: 'destructive'
      })
    } finally {
      setDetecting(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedDrift) return

    try {
      const response = await apiClient.request<{ success: boolean }>(
        `/entities/drift/${selectedDrift.id}/resolve`,
        {
          method: 'POST',
          body: JSON.stringify({
            resolutionAction,
            resolutionNotes
          })
        }
      )
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Drift resolved'
        })
        setResolveDialogOpen(false)
        setSelectedDrift(null)
        setResolutionNotes('')
        await loadDrifts()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve drift',
        variant: 'destructive'
      })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'info':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-500'
      case 'acknowledged':
        return 'bg-yellow-500'
      case 'resolved':
      case 'accepted':
        return 'bg-green-500'
      case 'false_positive':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const stats = {
    total: drifts.length,
    critical: drifts.filter(d => d.severity === 'critical').length,
    warning: drifts.filter(d => d.severity === 'warning').length,
    open: drifts.filter(d => d.status === 'open').length,
    resolved: drifts.filter(d => d.status === 'resolved' || d.status === 'accepted').length
  }

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId)
    localStorage.setItem('selectedProjectId', newProjectId)
    router.push(`/drift?projectId=${newProjectId}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Drift Detection</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage project drift from baselines
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadDrifts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleDetectDrift}
            disabled={detecting || !projectId}
          >
            {detecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Detect Drift
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>
            Choose a project to detect and manage drift
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
                Please select a project to detect and manage drift.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Drifts</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl text-red-500">{stats.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Warnings</CardDescription>
            <CardTitle className="text-2xl text-yellow-500">{stats.warning}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open</CardDescription>
            <CardTitle className="text-2xl text-red-500">{stats.open}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved</CardDescription>
            <CardTitle className="text-2xl text-green-500">{stats.resolved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Drift Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="scope">Scope</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Drift Detections</CardTitle>
          <CardDescription>
            {drifts.length} drift detection{drifts.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drifts.length === 0 ? (
            <Alert>
              <AlertDescription>
                No drift detections found. Click "Detect Drift" to run drift detection.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drifts.map((drift) => (
                  <TableRow key={drift.id}>
                    <TableCell>
                      <Badge className={getSeverityColor(drift.severity)}>
                        {drift.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{drift.drift_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{drift.title}</TableCell>
                    <TableCell>{drift.drift_category}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(drift.status)}>
                        {drift.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(drift.detected_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {drift.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDrift(drift)
                              setResolveDialogOpen(true)
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                        {drift.jira_issue_key && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(drift.jira_issue_url, '_blank')}
                          >
                            View Jira
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

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Drift Detection</DialogTitle>
            <DialogDescription>
              {selectedDrift?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="resolutionAction">Resolution Action</Label>
              <Select value={resolutionAction} onValueChange={setResolutionAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">Accept</SelectItem>
                  <SelectItem value="revert">Revert</SelectItem>
                  <SelectItem value="adjust">Adjust</SelectItem>
                  <SelectItem value="ignore">Ignore (False Positive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resolutionNotes">Resolution Notes</Label>
              <Textarea
                id="resolutionNotes"
                value={resolutionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionNotes(e.target.value)}
                placeholder="Add notes about the resolution..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


