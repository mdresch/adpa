'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiClient, ExtractedEntity, Project } from "@/lib/api"
import { Loader2, Search, Filter, Download, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'


export default function EntitiesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [entities, setEntities] = useState<ExtractedEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingVerification, setPendingVerification] = useState<{ entityId: string; verified: boolean } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    averageConfidence: 0
  })

  const entityTypes = [
    'stakeholder',
    'deliverable',
    'milestone',
    'risk',
    'requirement',
    'activity',
    'assumption',
    'constraint',
    'dependency',
    'resource'
  ]

  // Load projects list
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const response = await apiClient.getProjects({ limit: 100 })
      setProjects(response.projects || [])
    } catch (error: unknown) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Get project ID from query params, URL, or localStorage
  useEffect(() => {
    // First check query params
    const queryProjectId = searchParams?.get('projectId')
    if (queryProjectId) {
      setProjectId(queryProjectId)
      localStorage.setItem('selectedProjectId', queryProjectId)
      return
    }

    // Then check URL path
    const pathParts = window.location.pathname.split('/')
    const projectIdx = pathParts.indexOf('projects')
    if (projectIdx !== -1 && pathParts[projectIdx + 1]) {
      const id = pathParts[projectIdx + 1]
      setProjectId(id)
      localStorage.setItem('selectedProjectId', id)
      return
    }

    // Finally check localStorage
    const stored = localStorage.getItem('selectedProjectId')
    if (stored) {
      setProjectId(stored)
    }
  }, [searchParams])

  // Load entities
  useEffect(() => {
    if (projectId) {
      loadEntities()
    }
  }, [projectId, filterType, filterStatus])

  const loadEntities = async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const response = await apiClient.getProjectEntities(projectId, {
        entityType: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      })
      
      if (response.success) {
        setEntities(response.data || [])
        calculateStats(response.data || [])
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load entities',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (entitiesList: ExtractedEntity[]) => {
    const byType: Record<string, number> = {}
    let totalConfidence = 0

    entitiesList.forEach(entity => {
      byType[entity.entity_type] = (byType[entity.entity_type] || 0) + 1
      if (entity.extraction_confidence) {
        totalConfidence += entity.extraction_confidence
      }
    })

    setStats({
      total: entitiesList.length,
      byType,
      averageConfidence: entitiesList.length > 0 
        ? Math.round(totalConfidence / entitiesList.length) 
        : 0
    })
  }

  const handleExtract = async () => {
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'Please select a project',
        variant: 'destructive'
      })
      return
    }

    setExtracting(true)
    try {
      const response = await apiClient.extractProjectEntities(projectId)
      
      if (response.success) {
        toast({
          title: 'Success',
          description: `Extracted ${response.data.totalExtracted} entities`
        })
        await loadEntities()
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to extract entities',
        variant: 'destructive'
      })
    } finally {
      setExtracting(false)
    }
  }

  const handleVerify = async (entityId: string, verified: boolean) => {
    // Find entity to check confidence
    const entity = entities.find(e => e.id === entityId)
    const confidence = entity?.extraction_confidence || 50

    // Check if confirmation is required for low confidence verification
    if (verified && confidence < 50) {
      setPendingVerification({ entityId, verified })
      setShowConfirmDialog(true)
      return
    }

    // Proceed with verification
    await performVerification(entityId, verified)
  }

  const performVerification = async (entityId: string, verified: boolean) => {
    try {
      setVerifying(true)
      const response = await apiClient.verifyEntity(entityId, { 
        verified,
        confirmed: true // Always confirm when called from dialog
      })
      
      if (response.error === 'CONFIRMATION_REQUIRED') {
        setPendingVerification({ entityId, verified })
        setShowConfirmDialog(true)
        return
      }
      
      toast({
        title: 'Success',
        description: `Entity ${verified ? 'verified' : 'unverified'}`
      })
      await loadEntities()
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('CONFIRMATION_REQUIRED')) {
        setPendingVerification({ entityId, verified })
        setShowConfirmDialog(true)
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to verify entity',
          variant: 'destructive'
        })
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleConfirmVerification = async () => {
    if (pendingVerification) {
      await performVerification(pendingVerification.entityId, pendingVerification.verified)
      setShowConfirmDialog(false)
      setPendingVerification(null)
    }
  }

  const filteredEntities = entities.filter(entity => {
    const matchesSearch = searchTerm === '' || 
      entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(entity.entity_data).toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId)
    localStorage.setItem('selectedProjectId', newProjectId)
    // Update URL with query param
    router.push(`/entities?projectId=${newProjectId}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entity Extraction</h1>
          <p className="text-muted-foreground mt-1">
            View and manage extracted project entities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadEntities}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExtract}
            disabled={extracting || !projectId}
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Extract Entities
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
            Choose a project to view and extract entities
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
                Please select a project to view and extract entities.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Entities</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Confidence</CardDescription>
            <CardTitle className="text-2xl">{stats.averageConfidence}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.averageConfidence} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified</CardDescription>
            <CardTitle className="text-2xl">
              {entities.filter(e => e.is_verified).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entity Types</CardDescription>
            <CardTitle className="text-2xl">{Object.keys(stats.byType).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entity Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Entities by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-sm">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Entities</CardTitle>
          <CardDescription>
            {filteredEntities.length} of {entities.length} entities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntities.length === 0 ? (
            <Alert>
              <AlertDescription>
                No entities found. Click "Extract Entities" to start extraction.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell>
                      <Badge variant="outline">{entity.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entity.entity_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={entity.extraction_confidence || 0} className="w-20" />
                        <span className="text-sm">{entity.extraction_confidence || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entity.extraction_method || 'ai'}</Badge>
                    </TableCell>
                    <TableCell>
                      {entity.is_verified ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(entity.id, !entity.is_verified)}
                        >
                          {entity.is_verified ? (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Unverify
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verify
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            router.push(`/projects/${projectId}/entities/${entity.id}`)
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Low Confidence Verification */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Confidence Entity
            </DialogTitle>
            <DialogDescription>
              {pendingVerification && (() => {
                const entity = entities.find(e => e.id === pendingVerification.entityId)
                return `This entity has a low confidence score (${entity?.extraction_confidence || 0}%). Are you sure you want to verify it?`
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Low confidence entities may contain inaccurate or incomplete information. 
              Please review the entity data carefully before verifying.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setPendingVerification(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmVerification}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Yes, Verify Anyway
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

