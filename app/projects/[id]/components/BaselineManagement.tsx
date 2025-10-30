"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { BaselineGanttChart } from "@/components/BaselineGanttChart"
import { 
  Plus, 
  RefreshCw, 
  Eye, 
  FileText, 
  CheckCircle, 
  Clock, 
  Target, 
  XCircle, 
  AlertCircle,
  Loader2,
  Zap,
  Copy,
  Lightbulb,
  Database,
  BarChart3,
  DollarSign
} from "@/components/ui/icons-shim"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"

interface Document {
  id: string
  project_id: string
  name: string
  content?: Record<string, unknown>
  template_id?: string
  template_name?: string
  status: string
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  priority_rank?: number
  dependency_level?: number
  character_count?: number
  word_count?: number
  document?: Record<string, unknown>
}

interface Baseline {
  id: string
  project_id: string
  version: number
  scope_baseline?: string
  technical_baseline?: string
  timeline_baseline?: string
  cost_baseline?: string
  success_criteria?: string
  extracted_from_documents?: string[]
  status: 'pending' | 'approved' | 'declined' | 'active'
  created_by: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

interface DriftDetection {
  id: string
  baseline_id: string
  drift_type: 'scope' | 'technical' | 'timeline' | 'cost' | 'criteria'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detected_at: string
  resolved: boolean
  resolution_notes?: string
}

interface MissingDocument {
  id: string
  name: string
  type: string
  reason: string
}

interface BaselineManagementProps {
  projectId: string
  documents: Document[]
}

export function BaselineManagement({ projectId, documents }: BaselineManagementProps) {
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [drifts, setDrifts] = useState<DriftDetection[]>([])
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [showExtractDialog, setShowExtractDialog] = useState(false)
  const [viewingBaseline, setViewingBaseline] = useState<Baseline | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [formalDocument, setFormalDocument] = useState<string>('')
  const [missingDocuments, setMissingDocuments] = useState<MissingDocument[]>([])
  const [showFormalDocDialog, setShowFormalDocDialog] = useState(false)
  const [creationMethod, setCreationMethod] = useState<'entities' | 'documents'>('entities')
  const [entityCount, setEntityCount] = useState<number>(0)
  const [loadingEntityCount, setLoadingEntityCount] = useState(false)

  // Fetch active baseline
  const fetchBaseline = async () => {
    try {
      const response = await apiClient.request<{ baseline: Baseline }>(
        `/baselines/project/${projectId}/active`,
        { suppressNotFoundError: true } as Record<string, unknown> // 404 is expected when no baseline exists yet
      )
      setBaseline(response.baseline)
    } catch (error: unknown) {
      // 404 is expected when no baseline has been created yet - gracefully handle it
      const err = error as { status?: number; message?: string }
      if (err?.status === 404) {
        setBaseline(null) // Ensure baseline is null when not found
      } else {
        console.error('Error fetching baseline:', error)
      }
    }
  }

  // Fetch all baselines
  const fetchBaselines = async () => {
    try {
      const response = await apiClient.request<{ baselines: Baseline[] }>(
        `/baselines/project/${projectId}`,
        { suppressNotFoundError: true } as Record<string, unknown> // 404 is expected when no baselines exist yet
      )
      setBaselines(response.baselines || [])
    } catch (error: unknown) {
      // 404 is expected when no baselines have been created yet
      const err = error as { status?: number; message?: string }
      if (err?.status === 404) {
        setBaselines([]) // Empty array when none found
      } else {
        console.error('Error fetching baselines:', error)
      }
    }
  }

  // Fetch drift detections
  const fetchDrifts = async () => {
    if (!baseline) return
    try {
      const response = await apiClient.request<{ drifts: DriftDetection[] }>(`/baselines/${baseline.id}/drift`)
      setDrifts(response.drifts || [])
    } catch (error) {
      console.error('Error fetching drifts:', error)
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchBaseline(), fetchBaselines()]).finally(() => {
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (baseline) {
      fetchDrifts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline])

  // Check for extracted entities when dialog opens
  const checkForEntities = async () => {
    setLoadingEntityCount(true)
    try {
      const response = await apiClient.request<{ entities: any[], total: number }>(
        `/project-data-extraction/entities/${projectId}`
      )
      setEntityCount(response.total || 0)
      
      // Default to entities method if they exist, otherwise documents
      if (response.total > 0) {
        setCreationMethod('entities')
      } else {
        setCreationMethod('documents')
      }
    } catch (error) {
      console.error('Error checking for entities:', error)
      setEntityCount(0)
      setCreationMethod('documents')
    } finally {
      setLoadingEntityCount(false)
    }
  }

  // Check for entities when dialog opens
  useEffect(() => {
    if (showExtractDialog) {
      checkForEntities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showExtractDialog])

  const handleExtractBaseline = async () => {
    setExtracting(true)
    try {
      if (creationMethod === 'entities') {
        // Create baseline from extracted entities (Phase 2 enhancement)
        if (entityCount === 0) {
          toast.error('No extracted entities found. Run AI extraction first.')
          return
        }

        const response = await apiClient.request<{
          success: boolean
          baseline: any
          message: string
          stats: {
            duration_ms: number
            entity_count: number
            completeness_score: number
          }
        }>('/baselines/create-from-entities', {
          method: 'POST',
          body: JSON.stringify({
            project_id: projectId
          })
        })

        toast.success(response.message || `Baseline created from ${response.stats.entity_count} entities in ${Math.round(response.stats.duration_ms / 1000)}s!`)
        setShowExtractDialog(false)
        setSelectedDocuments([])
        
        // Refresh baseline data
        await fetchBaseline()
        await fetchBaselines()
      } else {
        // Traditional: Extract from documents using AI
        if (documents.length === 0) {
          toast.error('No documents available to create baseline')
          return
        }

        const response = await apiClient.request('/baselines/extract', {
          method: 'POST',
          body: JSON.stringify({
            project_id: projectId,
            document_ids: selectedDocuments.length > 0 ? selectedDocuments : undefined
            // Backend will look up project_name from database
          })
        })

        // Close dialog immediately - user can continue working!
        toast.success('Baseline extraction started! You will be notified when complete.')
        setShowExtractDialog(false)
        setSelectedDocuments([])
        
        // Show job ID for reference
        if (response.jobId) {
          toast.info(`Job ID: ${response.jobId}`, { duration: 3000 })
        }
      }
    } catch (error: any) {
      console.error('Error creating baseline:', error)
      toast.error(error?.message || 'Failed to create baseline')
    } finally {
      setExtracting(false)
    }
  }
  
  // Listen for baseline:created event to refresh when job completes
  useEffect(() => {
    const socket = apiClient.getSocket()
    
    if (socket) {
      socket.on('baseline:created', (data: any) => {
        if (data.projectId === projectId) {
          // Refresh baseline data when new baseline is created
          fetchBaselines()
          fetchBaseline()
          toast.success('Baseline extraction complete!')
        }
      })
      
      return () => {
        socket.off('baseline:created')
      }
    }
  }, [projectId])

  const handleApproveBaseline = async (baselineId: string) => {
    try {
      await apiClient.request(`/baselines/${baselineId}/approve`, {
        method: 'POST'
      })
      toast.success('Baseline approved and activated!')
      await fetchBaseline()
      await fetchBaselines()
      setShowDetailsDialog(false)
    } catch (error: any) {
      console.error('Error approving baseline:', error)
      toast.error(error?.message || 'Failed to approve baseline')
    }
  }

  const handleDeclineBaseline = async (baselineId: string) => {
    const reason = prompt('Please provide a reason for declining this baseline (insights will be preserved):')
    if (!reason) {
      toast.error('Decline reason is required')
      return
    }

    try {
      await apiClient.request(`/baselines/${baselineId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      })
      toast.success('Baseline declined and archived. Analysis preserved for future reference.')
      await fetchBaseline()
      await fetchBaselines()
      setShowDetailsDialog(false)
    } catch (error: any) {
      console.error('Error declining baseline:', error)
      toast.error(error?.message || 'Failed to decline baseline')
    }
  }

  const handleRerunBaseline = () => {
    // Close the details dialog and open the extract dialog with current documents selected
    setShowDetailsDialog(false)
    setSelectedDocuments(documents.map(d => d.id))
    setShowExtractDialog(true)
    toast.info('Select additional documents (like WBS, Activity List) to include in the re-extraction')
  }

  const handleViewBaseline = async (baselineId: string) => {
    try {
      const response = await apiClient.request<{ baseline: any }>(`/baselines/${baselineId}`)
      setViewingBaseline(response.baseline)
      setShowDetailsDialog(true)
    } catch (error: any) {
      console.error('Error fetching baseline:', error)
      toast.error('Failed to load baseline details')
    }
  }

  const handleGenerateFormalDocument = async (baselineId: string) => {
    try {
      const response = await apiClient.request<{ 
        document: string
        missing_documents: any[]
        project_name: string
      }>(`/baselines/${baselineId}/formal-document`)
      
      setFormalDocument(response.document)
      setMissingDocuments(response.missing_documents || [])
      setShowFormalDocDialog(true)
    } catch (error: any) {
      console.error('Error generating formal document:', error)
      toast.error('Failed to generate formal baseline document')
    }
  }

  const getDriftSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Baseline Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Project Baseline
              </CardTitle>
              <CardDescription>
                AI-extracted project baseline for drift detection
              </CardDescription>
            </div>
            {!baseline ? (
              <Button onClick={() => setShowExtractDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Baseline
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowExtractDialog(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Baseline
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {baseline ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="text-lg font-semibold">{baseline.version}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={baseline.status === 'active' ? 'default' : 'secondary'}>
                    {baseline.status}
                  </Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-lg font-semibold">{Math.round(baseline.extraction_confidence * 100)}%</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Completeness</p>
                  <p className="text-lg font-semibold">{Math.round(baseline.completeness_score * 100)}%</p>
                </div>
              </div>

              {/* Baseline Components */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {baseline.scope_baseline && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Scope Baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.scope_baseline.key_deliverables && Array.isArray(baseline.scope_baseline.key_deliverables) && (
                        <div>
                          <p className="font-medium">Deliverables:</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {baseline.scope_baseline.key_deliverables.slice(0, 3).map((d: string, i: number) => (
                              <li key={i} className="truncate">{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {baseline.technical_baseline && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Technical Baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.technical_baseline.technology_stack && Array.isArray(baseline.technical_baseline.technology_stack) && (
                        <div>
                          <p className="font-medium">Tech Stack:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {baseline.technical_baseline.technology_stack.slice(0, 6).map((tech: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {baseline.timeline_baseline && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Timeline Baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.timeline_baseline.project_duration && (
                        <p><span className="font-medium">Duration:</span> {baseline.timeline_baseline.project_duration}</p>
                      )}
                      {Array.isArray(baseline.timeline_baseline.key_milestones) && baseline.timeline_baseline.key_milestones.length > 0 && (
                        <p className="text-muted-foreground">{baseline.timeline_baseline.key_milestones.length} milestones</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {baseline.cost_baseline && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Cost Baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.cost_baseline.total_budget && (
                        <p className="text-lg font-semibold text-green-600">
                          {typeof baseline.cost_baseline.total_budget === 'number' 
                            ? `$${baseline.cost_baseline.total_budget.toLocaleString()}`
                            : baseline.cost_baseline.total_budget}
                        </p>
                      )}
                      {baseline.cost_baseline.cost_categories && Array.isArray(baseline.cost_baseline.cost_categories) && (
                        <p className="text-muted-foreground text-xs">{baseline.cost_baseline.cost_categories.length} cost categories</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {baseline.success_criteria && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Success Criteria
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.success_criteria.kpis && (
                        <p className="text-muted-foreground">{baseline.success_criteria.kpis.length} KPIs defined</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No Baseline Created</p>
              <p className="text-sm">Create a baseline to enable automated drift detection</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extract/Update Baseline Dialog */}
      <Dialog open={showExtractDialog} onOpenChange={setShowExtractDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{baseline ? 'Update' : 'Create'} Project Baseline</DialogTitle>
            <DialogDescription>
              Choose how to create your baseline: from extracted entities (instant) or by analyzing documents with AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Creation Method Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Baseline Creation Method</Label>
              
              {/* Option 1: From Entities (Recommended) */}
              <label 
                className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  creationMethod === 'entities' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${entityCount === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => entityCount > 0 && setCreationMethod('entities')}
              >
                <input
                  type="radio"
                  name="creationMethod"
                  value="entities"
                  checked={creationMethod === 'entities'}
                  onChange={(e) => e.target.checked && setCreationMethod('entities')}
                  disabled={entityCount === 0}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">Use Extracted Entities</span>
                    {entityCount > 0 && (
                      <Badge variant="default" className="bg-green-500">Recommended</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create baseline from {entityCount} AI-extracted entities already in the database
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-medium">✓ 5-10 seconds</span>
                    <span className="text-green-600 font-medium">✓ Free (no AI calls)</span>
                    <span className="text-green-600 font-medium">✓ Instant results</span>
                  </div>
                  {entityCount === 0 && (
                    <p className="text-xs text-orange-600 mt-2">
                      ⚠️ No entities found. Run AI Extraction first from the project page.
                    </p>
                  )}
                  {loadingEntityCount && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking for entities...
                    </div>
                  )}
                </div>
              </label>

              {/* Option 2: From Documents (Traditional) */}
              <label 
                className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  creationMethod === 'documents' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCreationMethod('documents')}
              >
                <input
                  type="radio"
                  name="creationMethod"
                  value="documents"
                  checked={creationMethod === 'documents'}
                  onChange={(e) => e.target.checked && setCreationMethod('documents')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold">Extract from Documents</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Traditional AI extraction from {documents.length} project documents
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>⏱️ 30-60 seconds</span>
                    <span>💰 Uses AI credits</span>
                    <span>🔄 Queued job</span>
                  </div>
                </div>
              </label>
            </div>

            {/* Document Selection (only for documents method) */}
            {creationMethod === 'documents' && (
              <div>
                <Label>Select Documents (optional)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Leave empty to use all {documents.length} documents, or select specific documents:
                </p>
                <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
                  {documents.map(doc => (
                    <label key={doc.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments([...selectedDocuments, doc.id])
                          } else {
                            setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{doc.name}</span>
                      {doc.template_name && (
                        <Badge variant="secondary" className="text-xs">{doc.template_name}</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtractDialog(false)} disabled={extracting}>
              Cancel
            </Button>
            <Button 
              onClick={handleExtractBaseline} 
              disabled={extracting || (creationMethod === 'entities' && entityCount === 0)}
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {creationMethod === 'entities' ? 'Creating...' : 'Extracting...'}
                </>
              ) : (
                <>
                  {creationMethod === 'entities' ? (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Create from {entityCount} Entities
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Extract from Documents
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drift Detections */}
      {baseline && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Drift Detections
              {drifts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{drifts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              AI-detected deviations from the established baseline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {drifts.length > 0 ? (
              <div className="space-y-3">
                {drifts.map(drift => (
                  <div key={drift.id} className={`p-4 border rounded-lg ${getDriftSeverityColor(drift.drift_severity)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{drift.detection_type.replace('_', ' ')}</Badge>
                          <Badge variant="outline" className="text-xs">{drift.drift_severity}</Badge>
                        </div>
                        <p className="font-medium">{drift.drift_description}</p>
                        {drift.drift_impact && (
                          <p className="text-sm mt-1 opacity-75">Impact: {drift.drift_impact}</p>
                        )}
                      </div>
                      <div className="text-right text-xs opacity-75">
                        {new Date(drift.detection_date).toLocaleDateString()}
                      </div>
                    </div>
                    {drift.document_title && (
                      <p className="text-xs mt-2 opacity-75">
                        Source: {drift.document_title}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="font-medium mb-1">No Drift Detected</p>
                <p className="text-sm">All documents align with the baseline</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Baseline History */}
      {baselines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Baseline History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {baselines.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {b.version}</span>
                      <Badge variant={b.status === 'active' ? 'default' : 'secondary'}>
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {new Date(b.created_at).toLocaleDateString()} by {b.created_by_name}
                      {b.approved_at && ` • Approved ${new Date(b.approved_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewBaseline(b.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateFormalDocument(b.id)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Formal Document
                    </Button>
                    {b.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveBaseline(b.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Baseline Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Baseline Details - Version {viewingBaseline?.version}
            </DialogTitle>
            <DialogDescription>
              Review baseline components before approving
            </DialogDescription>
          </DialogHeader>
          
          {viewingBaseline && (
            <div className="space-y-4">
              {/* Overall Quality Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <p className="text-xs text-blue-700 font-medium">Extraction Confidence</p>
                  <p className="text-2xl font-bold text-blue-900">{Math.round((viewingBaseline.extraction_confidence || 0) * 100)}%</p>
                </div>
                <div className="p-3 border rounded-lg bg-gradient-to-br from-green-50 to-green-100">
                  <p className="text-xs text-green-700 font-medium">Overall Completeness</p>
                  <p className="text-2xl font-bold text-green-900">{Math.round((viewingBaseline.completeness_score || 0) * 100)}%</p>
                </div>
                <div className={`p-3 border rounded-lg ${
                  (viewingBaseline.consistency_score || 0) * 100 >= 70 ? 'bg-gradient-to-br from-purple-50 to-purple-100' :
                  (viewingBaseline.consistency_score || 0) * 100 >= 60 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                  'bg-gradient-to-br from-red-50 to-red-100'
                }`}>
                  <p className={`text-xs font-medium ${
                    (viewingBaseline.consistency_score || 0) * 100 >= 70 ? 'text-purple-700' :
                    (viewingBaseline.consistency_score || 0) * 100 >= 60 ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>Consistency {(viewingBaseline.consistency_score || 0) * 100 < 60 && '⚠️'}</p>
                  <p className={`text-2xl font-bold ${
                    (viewingBaseline.consistency_score || 0) * 100 >= 70 ? 'text-purple-900' :
                    (viewingBaseline.consistency_score || 0) * 100 >= 60 ? 'text-yellow-900' :
                    'text-red-900'
                  }`}>{Math.round((viewingBaseline.consistency_score || 0) * 100)}%</p>
                </div>
              </div>

              {/* Quality Audit: Red Flags */}
              {viewingBaseline.ai_processing_metadata?.quality_audit?.red_flags && Array.isArray(viewingBaseline.ai_processing_metadata.quality_audit.red_flags) && viewingBaseline.ai_processing_metadata.quality_audit.red_flags.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-red-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      🚨 Critical Issues Detected ({viewingBaseline.ai_processing_metadata.quality_audit.red_flags.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {viewingBaseline.ai_processing_metadata.quality_audit.red_flags.map((flag: any, idx: number) => (
                      <div key={idx} className="p-3 border border-red-300 rounded-lg bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-red-900">{flag.title}</h5>
                          <Badge variant={flag.severity === 'critical' ? 'destructive' : 'default'} className="ml-2">
                            {flag.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{flag.description}</p>
                        <div className="space-y-1 text-xs">
                          <p className="font-medium text-gray-900">Evidence:</p>
                          <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                            {Array.isArray(flag.evidence) && flag.evidence.map((e: string, i: number) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs font-medium text-yellow-900">Required Action:</p>
                          <p className="text-xs text-yellow-800 mt-1">{flag.required_action}</p>
                        </div>
                        {flag.blocking && (
                          <Badge variant="destructive" className="mt-2">
                            ⛔ BLOCKS APPROVAL
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quality Audit: Warnings */}
              {viewingBaseline.ai_processing_metadata?.quality_audit?.warnings && Array.isArray(viewingBaseline.ai_processing_metadata.quality_audit.warnings) && viewingBaseline.ai_processing_metadata.quality_audit.warnings.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-yellow-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      ⚠️ Warnings ({viewingBaseline.ai_processing_metadata.quality_audit.warnings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {viewingBaseline.ai_processing_metadata.quality_audit.warnings.map((warning: any, idx: number) => (
                      <div key={idx} className="p-2 border border-yellow-300 rounded bg-white text-sm">
                        <p className="font-medium text-yellow-900">{warning.title}</p>
                        <p className="text-gray-700 text-xs mt-1">{warning.description}</p>
                        <p className="text-gray-600 text-xs mt-1"><strong>Recommendation:</strong> {warning.recommendation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quality Audit: Feasibility Score */}
              {viewingBaseline.ai_processing_metadata?.quality_audit?.feasibility_score !== undefined && (
                <div className={`p-4 border rounded-lg ${
                  viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 70 ? 'bg-green-50 border-green-200' :
                  viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 50 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Feasibility Assessment</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 70 ? 'Project is FEASIBLE as scoped' :
                         viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 50 ? 'Project feasibility is QUESTIONABLE' :
                         'Project is NOT FEASIBLE as currently scoped'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${
                        viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 70 ? 'text-green-700' :
                        viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 50 ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {Math.round(viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score)}%
                      </p>
                      <p className="text-xs text-gray-600">Feasibility Score</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Baseline Component Completeness Cards */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Baseline Component Completeness
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { name: 'Scope', key: 'scope_baseline', completeness: 100, color: 'blue' },
                    { name: 'Technical', key: 'technical_baseline', completeness: 100, color: 'green' },
                    { name: 'Schedule', key: 'timeline_baseline', completeness: 75, color: 'yellow' },
                    { name: 'Cost', key: 'cost_baseline', completeness: 50, color: 'orange' },
                    { name: 'Resource', key: 'resource_baseline', completeness: 60, color: 'purple' },
                    { name: 'Success Criteria', key: 'success_criteria', completeness: 90, color: 'emerald' }
                  ].map((component) => {
                    const hasData = viewingBaseline[component.key] && Object.keys(viewingBaseline[component.key]).length > 0
                    const colorClass = hasData
                      ? `border-${component.color}-200 bg-${component.color}-50`
                      : 'border-gray-200 bg-gray-50'
                    
                    return (
                      <div key={component.key} className={`p-2 border rounded-lg ${colorClass}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">{component.name}</p>
                          <span className="text-xs">{hasData ? '✅' : '❌'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={hasData ? component.completeness : 0} className="h-1.5 flex-1" />
                          <span className="text-xs font-semibold">{hasData ? component.completeness : 0}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Scope Baseline */}
              {viewingBaseline.scope_baseline && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Scope Baseline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.scope_baseline.key_deliverables && Array.isArray(viewingBaseline.scope_baseline.key_deliverables) && (
                      <div>
                        <p className="font-medium mb-1">Key Deliverables:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.scope_baseline.key_deliverables.map((d: string, i: number) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {viewingBaseline.scope_baseline.scope_boundaries && Array.isArray(viewingBaseline.scope_baseline.scope_boundaries) && (
                      <div>
                        <p className="font-medium mb-1">Scope Boundaries:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.scope_baseline.scope_boundaries.map((b: string, i: number) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Technical Baseline */}
              {viewingBaseline.technical_baseline && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Technical Baseline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.technical_baseline.technology_stack && Array.isArray(viewingBaseline.technical_baseline.technology_stack) && (
                      <div>
                        <p className="font-medium mb-1">Technology Stack:</p>
                        <div className="flex flex-wrap gap-1">
                          {viewingBaseline.technical_baseline.technology_stack.map((tech: string, i: number) => (
                            <Badge key={i} variant="secondary">{tech}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewingBaseline.technical_baseline.architecture && (
                      <div>
                        <p className="font-medium mb-1">Architecture:</p>
                        <p className="text-muted-foreground">{viewingBaseline.technical_baseline.architecture}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timeline Baseline */}
              {viewingBaseline.timeline_baseline && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timeline Baseline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                    {viewingBaseline.timeline_baseline.project_duration && (
                      <div>
                        <p className="font-medium">Duration:</p>
                        <p className="text-muted-foreground">{viewingBaseline.timeline_baseline.project_duration}</p>
                      </div>
                    )}
                    
                    {/* Gantt Chart Visualization */}
                    <div className="pt-4 border-t">
                      <p className="font-medium mb-3">Visual Timeline:</p>
                      <BaselineGanttChart baseline={viewingBaseline} viewMode="Month" />
                    </div>
                    
                    {viewingBaseline.timeline_baseline.key_milestones && Array.isArray(viewingBaseline.timeline_baseline.key_milestones) && (
                      <div className="pt-4 border-t">
                        <p className="font-medium mb-1">Key Milestones:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.timeline_baseline.key_milestones.map((m: any, i: number) => (
                            <li key={i} className="text-muted-foreground">
                              {typeof m === 'string' ? m : (m.name || `Milestone ${i + 1}`)}
                              {m.target_date && ` - ${m.target_date}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Cost Baseline */}
              {viewingBaseline.cost_baseline && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cost Baseline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.cost_baseline.total_budget && (
                      <div>
                        <p className="font-medium mb-1">Total Budget:</p>
                        <p className="text-2xl font-bold text-green-600">
                          {typeof viewingBaseline.cost_baseline.total_budget === 'number' 
                            ? `$${viewingBaseline.cost_baseline.total_budget.toLocaleString()}`
                            : viewingBaseline.cost_baseline.total_budget}
                        </p>
                      </div>
                    )}
                    
                    {viewingBaseline.cost_baseline.budget_by_phase && (
                      <div>
                        <p className="font-medium mb-1">Budget by Phase:</p>
                        <div className="space-y-1">
                          {Object.entries(viewingBaseline.cost_baseline.budget_by_phase).map(([phase, amount]: [string, any], i: number) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{phase}:</span>
                              <span className="font-semibold">
                                {typeof amount === 'number' ? `$${amount.toLocaleString()}` : amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {viewingBaseline.cost_baseline.contingency_reserve && (
                      <div className="pt-2 border-t">
                        <p className="font-medium mb-1">Contingency Reserve:</p>
                        <p className="text-lg font-semibold text-orange-600">
                          {typeof viewingBaseline.cost_baseline.contingency_reserve === 'number'
                            ? `$${viewingBaseline.cost_baseline.contingency_reserve.toLocaleString()}`
                            : viewingBaseline.cost_baseline.contingency_reserve}
                        </p>
                      </div>
                    )}
                    
                    {viewingBaseline.cost_baseline.cost_categories && Array.isArray(viewingBaseline.cost_baseline.cost_categories) && (
                      <div className="pt-2 border-t">
                        <p className="font-medium mb-1">Cost Categories:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.cost_baseline.cost_categories.map((category: any, i: number) => (
                            <li key={i} className="text-muted-foreground">
                              {typeof category === 'string' ? category : (category.name || category.category)}
                              {category.amount && ` - $${typeof category.amount === 'number' ? category.amount.toLocaleString() : category.amount}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Success Criteria */}
              {viewingBaseline.success_criteria && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Success Criteria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.success_criteria.kpis && Array.isArray(viewingBaseline.success_criteria.kpis) && (
                      <div>
                        <p className="font-medium mb-1">KPIs:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.success_criteria.kpis.map((kpi: string, i: number) => (
                            <li key={i}>{kpi}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {viewingBaseline?.status === 'draft' && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDeclineBaseline(viewingBaseline.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline & Archive
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleRerunBaseline}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rerun with More Documents
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
              {viewingBaseline?.status === 'draft' && (
                <Button onClick={() => handleApproveBaseline(viewingBaseline.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Baseline
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formal Baseline Document Dialog */}
      <Dialog open={showFormalDocDialog} onOpenChange={setShowFormalDocDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Formal Project Baseline Document
            </DialogTitle>
            <DialogDescription>
              PMBOK-style baseline document with completeness assessment and recommendations
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="document" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="document">Baseline Document</TabsTrigger>
              <TabsTrigger value="gaps">
                Missing Details
                {missingDocuments.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{missingDocuments.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="document" className="flex-1 overflow-y-auto prose prose-sm max-w-none p-4 border rounded-md bg-muted/30">
              <div className="bg-background p-6 rounded-lg">
                <pre className="whitespace-pre-wrap font-sans text-sm">{formalDocument}</pre>
              </div>
            </TabsContent>
            
            <TabsContent value="gaps" className="flex-1 overflow-y-auto p-4">
              {missingDocuments.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-900">
                      {missingDocuments.length} Baseline Detail{missingDocuments.length > 1 ? 's' : ''} Missing
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Consider creating these documents to enhance baseline completeness and enable deeper project insights.
                    </p>
                  </div>
                  
                  {missingDocuments.map((doc, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-orange-500" />
                              {doc.documentType}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {doc.purpose}
                            </CardDescription>
                          </div>
                          <Badge variant={
                            doc.priority === 'Critical' ? 'destructive' :
                            doc.priority === 'High' ? 'default' :
                            'secondary'
                          }>
                            {doc.priority}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        <div>
                          <span className="font-medium">What it provides:</span>
                          <p className="text-muted-foreground mt-1">{doc.whatItProvides}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {doc.template}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p className="font-medium mb-1">Baseline is Complete!</p>
                  <p className="text-sm">All critical baseline components are present.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {missingDocuments.length > 0 && (
                <span>💡 Tip: Create missing documents to enhance baseline depth</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFormalDocDialog(false)}>
                Close
              </Button>
              <Button onClick={() => {
                navigator.clipboard.writeText(formalDocument)
                toast.success('Baseline document copied to clipboard!')
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Document
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

