'use client'

import React, { useState, useEffect } from 'react'
import { getApiBaseUrl } from '@/lib/api-url'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Brain,
  FileText,
  Zap,
  Target,
  Shield,
  Download,
  Settings,
  BarChart3,
  Activity,
  TrendingUp,
  Users,
  Database,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowRight,
  ArrowDown,
  Info,
  Lightbulb,
  Star,
  Award,
  Rocket
} from 'lucide-react'
import { usePipelineAPI } from './hooks/usePipelineAPI'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

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

interface StageStatus {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  startTime?: Date
  endTime?: Date
  duration?: number
  qualityScore?: number
  error?: string
  details?: any
}

interface PipelineJob {
  jobId: string
  requestId: string
  templateId: string
  projectId: string
  userId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStage?: string
  stages: StageStatus[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  totalDuration?: number
  overallQualityScore?: number
  error?: string
}

const STAGE_DEFINITIONS = [
  {
    id: 'context_gathering',
    name: 'Context Gathering',
    description: 'Gather and analyze context from various sources',
    icon: <Database className="h-5 w-5" />,
    color: 'bg-blue-500',
    details: {
      sources: ['Project Data', 'User Profile', 'Document History', 'External APIs'],
      outputs: ['Context Bundle', 'Quality Assessment', 'Source Analysis']
    }
  },
  {
    id: 'template_processing',
    name: 'Template Processing',
    description: 'Process and enhance template with context',
    icon: <FileText className="h-5 w-5" />,
    color: 'bg-green-500',
    details: {
      processes: ['Variable Resolution', 'AI Enhancement', 'Methodology Alignment'],
      outputs: ['Enhanced Template', 'Resolved Variables', 'AI Insights']
    }
  },
  {
    id: 'ai_generation',
    name: 'AI Generation',
    description: 'Generate document content using AI models',
    icon: <Brain className="h-5 w-5" />,
    color: 'bg-purple-500',
    details: {
      models: ['GPT-4', 'Claude-3', 'Cross-Validation'],
      outputs: ['Generated Content', 'Quality Report', 'Refinements']
    }
  },
  {
    id: 'context_injection',
    name: 'Context Injection',
    description: 'Inject context and personalize document',
    icon: <Target className="h-5 w-5" />,
    color: 'bg-orange-500',
    details: {
      strategies: ['Structured', 'Prepend', 'Append', 'Interleave'],
      outputs: ['Contextualized Document', 'Personalization', 'Validation']
    }
  },
  {
    id: 'quality_assurance',
    name: 'Quality Assurance',
    description: 'Assess and validate document quality',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-red-500',
    details: {
      assessments: ['Content Quality', 'Methodology Compliance', 'Stakeholder Requirements', 'Technical Accuracy'],
      outputs: ['Quality Report', 'Recommendations', 'Issues']
    }
  },
  {
    id: 'output_formatting',
    name: 'Output Formatting',
    description: 'Format document for final output',
    icon: <Download className="h-5 w-5" />,
    color: 'bg-indigo-500',
    details: {
      formats: ['PDF', 'DOCX', 'Markdown', 'HTML', 'JSON', 'XML'],
      outputs: ['Formatted Document', 'Metadata', 'Delivery Options']
    }
  }
]

export default function VisualPipelinePage() {
  const { user } = useAuth()
  const {
    jobs: apiJobs,
    isLoading: apiLoading,
    error: apiError,
    startPipeline,
    getJobStatus,
    pollJobStatus
  } = usePipelineAPI()

  const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [isStarting, setIsStarting] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [processingConfig, setProcessingConfig] = useState({
    enableParallelProcessing: false,
    enableQualityGates: true,
    enableRefinement: true,
    enablePersonalization: true,
    maxProcessingTime: 300000,
    retryAttempts: 3
  })
  const [selectedStageForDetails, setSelectedStageForDetails] = useState<string | null>(null)
  const [stageDetailsDialogOpen, setStageDetailsDialogOpen] = useState(false)
  const [selectedStageData, setSelectedStageData] = useState<any>(null)
  const [loadingStageDetails, setLoadingStageDetails] = useState(false)

  // Load templates and projects on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const apiUrl = getApiBaseUrl()
        const [templatesRes, projectsRes] = await Promise.all([
          fetch(`${apiUrl}/pipeline/templates`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          }),
          fetch(`${apiUrl}/pipeline/projects`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          })
        ])

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json()
          setTemplates(templatesData.data || [])
        }

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json()
          setProjects(projectsData.data || [])
        }
      } catch (error) {
        console.error('Error loading templates/projects:', error)
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  // Poll for job status when a job is selected and notify on status changes
  // Elapsed time counter for running jobs
  useEffect(() => {
    if (selectedJob && selectedJob.status === 'running') {
      const startTime = selectedJob.startedAt ? new Date(selectedJob.startedAt).getTime() : Date.now()
      
      const updateElapsed = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedTime(elapsed)
      }
      
      updateElapsed()
      const timerId = setInterval(updateElapsed, 1000)
      
      return () => clearInterval(timerId)
    } else {
      setElapsedTime(0)
    }
  }, [selectedJob?.status, selectedJob?.startedAt])

  useEffect(() => {
    if (selectedJob && (selectedJob.status === 'running' || selectedJob.status === 'pending')) {
      const stopPolling = pollJobStatus(selectedJob.jobId, 1000)
      return stopPolling
    }
    
    // Notify when job completes
    if (selectedJob && selectedJob.status === 'completed') {
      toast.success('Pipeline completed successfully!', {
        description: `Quality Score: ${((selectedJob.overallQualityScore || 0) * 100).toFixed(1)}%`,
        duration: 5000
      })
    }
    
    // Notify when job fails
    if (selectedJob && selectedJob.status === 'failed') {
      toast.error('Pipeline processing failed', {
        description: selectedJob.error || 'An error occurred during processing',
        duration: 7000
      })
    }
  }, [selectedJob, pollJobStatus])

  // Start actual pipeline processing
  const handleViewStageDetails = async (stageId: string) => {
    if (!selectedJob) return
    
    setSelectedStageForDetails(stageId)
    setLoadingStageDetails(true)
    setStageDetailsDialogOpen(true)
    
    try {
      const apiUrl = getApiBaseUrl()
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`${apiUrl}/pipeline/job/${selectedJob.jobId}/stage/${stageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        // The API returns data nested in a 'data' field
        const stageData = result.data || result
        console.log('Stage data received:', stageData)
        setSelectedStageData(stageData)
      } else {
        console.error('Failed to fetch stage details:', response.statusText)
        toast.error('Failed to load stage details')
      }
    } catch (error) {
      console.error('Error fetching stage details:', error)
      toast.error('Failed to load stage details')
    } finally {
      setLoadingStageDetails(false)
    }
  }

  const handleStartPipeline = async () => {
    if (!selectedTemplate || !selectedProject) {
      toast.error('Please select both a template and a project')
      return
    }

    setIsStarting(true)
    toast.loading('Starting pipeline processing...', { id: 'pipeline-start' })

    try {
      const selectedTemplateName = templates.find(t => t.id === selectedTemplate)?.name || 'Selected Template'
      const selectedProjectName = projects.find(p => p.id === selectedProject)?.name || 'Selected Project'

      const job = await startPipeline({
        templateId: selectedTemplate,
        projectId: selectedProject,
        userId: user?.id || '',
        processingConfig: {
          enableParallelProcessing: processingConfig.enableParallelProcessing,
          enableQualityGates: processingConfig.enableQualityGates,
          enableRefinement: processingConfig.enableRefinement,
          enablePersonalization: processingConfig.enablePersonalization,
          maxProcessingTime: processingConfig.maxProcessingTime,
          retryAttempts: processingConfig.retryAttempts
        },
        outputConfig: {
          primary_format: 'markdown',
          secondary_formats: [],
          include_metadata: true
        }
      })

      setSelectedJob(job)
      
      toast.success(`Pipeline started for "${selectedTemplateName}" in project "${selectedProjectName}"`, { 
        id: 'pipeline-start',
        description: `Job ID: ${job.jobId.substring(0, 8)}... • Processing 6 stages`,
        duration: 5000
      })
      
      // Start polling for status updates
      const stopPolling = pollJobStatus(job.jobId, 2000)
      
      // Stop polling after job completes (this will be handled by the useEffect)
      
    } catch (error: any) {
      console.error('Error starting pipeline:', error)
      toast.error('Failed to start pipeline processing', {
        id: 'pipeline-start',
        description: error.message || 'An unexpected error occurred',
        duration: 7000
      })
    } finally {
      setIsStarting(false)
    }
  }

  const generateStageDetails = (stageId: string) => {
    const stage = STAGE_DEFINITIONS.find(s => s.id === stageId)
    if (!stage) return {}

    switch (stageId) {
      case 'context_gathering':
        return {
          sourcesUsed: ['project_data', 'user_profile', 'document_history'],
          contextQuality: 0.9,
          sourcesCount: 3,
          contextSize: '2.5MB'
        }
      case 'template_processing':
        return {
          variablesResolved: 12,
          enhancementsApplied: 4,
          methodologyCompliance: 0.95,
          aiInsightsGenerated: 8
        }
      case 'ai_generation':
        return {
          modelsUsed: ['gpt-4', 'claude-3'],
          generationSteps: 4,
          crossValidationScore: 0.92,
          refinementsApplied: 2
        }
      case 'context_injection':
        return {
          injectionStrategy: 'structured',
          contextSourcesUsed: 3,
          personalizationApplied: true,
          contextRelevanceScore: 0.88
        }
      case 'quality_assurance':
        return {
          assessmentsPerformed: 7,
          qualityGatesPassed: 3,
          issuesFound: 2,
          recommendationsGenerated: 5
        }
      case 'output_formatting':
        return {
          formatsGenerated: 4,
          primaryFormat: 'pdf',
          totalSize: '1.2MB',
          deliveryOptions: 3
        }
      default:
        return {}
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">6-Stage Document Processing Pipeline</h1>
          <p className="text-gray-600 mt-2">Visual interface for testing and monitoring the document processing pipeline</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Configure</span>
          </Button>
        </div>
      </div>

      {/* Active Job Status Banner */}
      {selectedJob && selectedJob.status === 'running' && (
        <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md">
          <div className="flex items-start space-x-3 w-full">
            <div className="relative">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-blue-900 text-lg">Pipeline Processing in Progress</div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-mono text-blue-700">
                    {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">
                    <span className="font-medium">Stage:</span>{' '}
                    {selectedJob.currentStage?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Initializing'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">
                    <span className="font-medium">Progress:</span> {Number(selectedJob.progress || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">
                    <span className="font-medium">Stages:</span> {(selectedJob.stages || []).filter(s => s.status === 'completed').length}/6
                  </span>
                </div>
              </div>
              <Progress value={Number(selectedJob.progress || 0)} className="h-2" />
            </div>
          </div>
        </Alert>
      )}

      {selectedJob && selectedJob.status === 'completed' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="ml-2 flex-1">
            <div className="font-semibold text-green-900">Pipeline Completed Successfully!</div>
            <div className="text-sm text-green-700 mt-1">
              Quality Score: <span className="font-medium">{((selectedJob.overallQualityScore || 0) * 100).toFixed(1)}%</span> • 
              Duration: <span className="font-medium">{selectedJob.totalDuration ? formatDuration(selectedJob.totalDuration) : 'N/A'}</span>
            </div>
            <div className="mt-3">
              <Button 
                size="sm" 
                onClick={() => window.location.href = `/projects/${selectedProject}`}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Document in Project Library
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {selectedJob && selectedJob.status === 'failed' && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <div className="ml-2 flex-1">
            <div className="font-semibold text-red-900">Pipeline Processing Failed</div>
            <div className="text-sm text-red-700 mt-1">
              {selectedJob.error || 'An error occurred during processing'}
            </div>
          </div>
        </Alert>
      )}

      {/* Template and Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Rocket className="h-5 w-5" />
            <span>Start Pipeline Processing</span>
          </CardTitle>
          <CardDescription>
            Select a template and project to begin document processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isStarting}
              >
                <option value="">Select a template...</option>
                {templates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] 
                      ? statusConfig[template.development_status as keyof typeof statusConfig].emoji + ' ' 
                      : ''}
                    {template.name} {template.category ? `(${template.category})` : ''}
                    {template.development_status === 'production' ? ' ✓' : ''}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No templates available</p>
              )}
              
              {/* Template Status Panel */}
              {selectedTemplate && templates.find((t: any) => t.id === selectedTemplate) && (() => {
                const template = templates.find((t: any) => t.id === selectedTemplate)
                if (!template) return null
                
                return (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">Status:</span>
                        {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] && (
                          // @ts-expect-error - Badge accepts children via HTMLAttributes
                          <Badge variant={statusConfig[template.development_status as keyof typeof statusConfig].variant} className="text-xs">
                            {statusConfig[template.development_status as keyof typeof statusConfig].emoji} {statusConfig[template.development_status as keyof typeof statusConfig].label}
                          </Badge>
                        )}
                      </div>
                      {template.health_rating && healthConfig[template.health_rating as keyof typeof healthConfig] && (
                        // @ts-expect-error - Badge accepts children via HTMLAttributes
                        <Badge variant="outline" className={`text-xs ${healthConfig[template.health_rating as keyof typeof healthConfig].color}`}>
                          {healthConfig[template.health_rating as keyof typeof healthConfig].icon} {template.health_rating}
                        </Badge>
                      )}
                    </div>
                    
                    {template.validation_count !== undefined && template.validation_count > 0 && (
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">
                          Success: <span className="font-semibold text-foreground">
                            {template.success_rate !== undefined 
                              ? `${Number(template.success_rate).toFixed(1)}%`
                              : 'N/A'}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Runs: <span className="font-semibold text-foreground">{template.validation_count}</span>
                        </span>
                      </div>
                    )}
                    
                    {template.development_status && template.development_status !== 'production' && (
                      <Alert className="py-2">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          Pipeline processing recommended with production templates only
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Project Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isStarting}
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.status ? `(${project.status})` : ''}
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No projects available</p>
              )}
            </div>
          </div>

          {/* Start Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedTemplate && selectedProject ? (
                <span className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Ready to start processing</span>
                </span>
              ) : (
                <span>Please select both template and project</span>
              )}
            </div>
            <Button
              onClick={handleStartPipeline}
              disabled={!selectedTemplate || !selectedProject || isStarting}
              className="flex items-center space-x-2"
              size="lg"
            >
              {isStarting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Starting Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start Pipeline</span>
              </>
            )}
          </Button>
        </div>

          {apiError && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">{apiError}</AlertDescription>
            </Alert>
          )}

          {isStarting && (
            <div className="flex items-center justify-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <div className="text-sm text-blue-900">
                <div className="font-semibold">Initializing pipeline...</div>
                <div className="text-xs text-blue-700 mt-1">Creating job and queueing for processing</div>
      </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Panel (Collapsible) */}
      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Processing Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={processingConfig.enableQualityGates}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, enableQualityGates: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Quality Gates</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={processingConfig.enableRefinement}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, enableRefinement: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Refinement</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={processingConfig.enablePersonalization}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, enablePersonalization: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Personalization</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={processingConfig.enableParallelProcessing}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, enableParallelProcessing: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Enable Parallel Processing</span>
                </label>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">Max Processing Time (ms)</label>
                  <input
                    type="number"
                    value={processingConfig.maxProcessingTime}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, maxProcessingTime: parseInt(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    min="60000"
                    max="600000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Retry Attempts</label>
                  <input
                    type="number"
                    value={processingConfig.retryAttempts}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                    max="5"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
          <TabsTrigger value="stages">Stage Details</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          {/* Pipeline Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Pipeline Flow</span>
              </CardTitle>
              <CardDescription>
                Visual representation of the 6-stage document processing pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {STAGE_DEFINITIONS.map((stage, index) => {
                  const isCurrentStage = selectedJob?.currentStage === stage.id
                  const stageStatus = selectedJob?.stages?.find(s => s.id === stage.id)?.status || 'pending'
                  const isRunning = isCurrentStage && selectedJob?.status === 'running'
                  
                  return (
                  <div key={stage.id} className="flex items-center space-x-4">
                    {/* Stage Card */}
                    <Card className={`flex-1 transition-all duration-300 ${
                      isRunning ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50 animate-pulse' : 
                      stageStatus === 'completed' ? 'bg-green-50' :
                      stageStatus === 'failed' ? 'bg-red-50' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${stage.color} text-white ${isRunning ? 'animate-pulse' : ''}`}>
                              {stage.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-lg">{stage.name}</h3>
                                {isRunning && (
                                  <Badge className="bg-blue-600 text-white animate-pulse">
                                    Processing...
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{stage.description}</p>
                              {isRunning && (
                                <p className="text-xs text-blue-700 mt-1 font-medium animate-pulse">
                                  ⚡ Active now • Elapsed: {Math.floor(elapsedTime)}s
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedJob && (
                              <>
                                {getStatusIcon(stageStatus)}
                                <Badge className={getStatusColor(stageStatus)}>
                                  {stageStatus}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {selectedJob && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>{selectedJob.stages?.find(s => s.id === stage.id)?.progress || 0}%</span>
                            </div>
                            <Progress 
                              value={selectedJob.stages?.find(s => s.id === stage.id)?.progress || 0} 
                              className="h-2"
                            />
                            
                            {selectedJob.stages?.find(s => s.id === stage.id)?.qualityScore && (
                              <div className="flex items-center justify-between text-sm">
                                <span>Quality Score</span>
                                <span className="font-semibold">
                                  {(selectedJob.stages?.find(s => s.id === stage.id)?.qualityScore! * 100).toFixed(1)}%
                                </span>
                              </div>
                            )}
                            
                            {selectedJob.stages?.find(s => s.id === stage.id)?.duration && (
                              <div className="flex items-center justify-between text-sm">
                                <span>Duration</span>
                                <span>{formatDuration(selectedJob.stages?.find(s => s.id === stage.id)?.duration!)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Arrow */}
                    {index < STAGE_DEFINITIONS.length - 1 && (
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Overall Progress */}
          {selectedJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Overall Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Pipeline Progress</span>
                    <span className="text-lg font-semibold">{Number(selectedJob.progress || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={Number(selectedJob.progress || 0)} className="h-3" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(selectedJob.stages || []).filter(s => s.status === 'completed').length}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(selectedJob.stages || []).filter(s => s.status === 'running').length}
                      </div>
                      <div className="text-sm text-gray-600">Running</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {(selectedJob.stages || []).filter(s => s.status === 'pending').length}
                      </div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {(selectedJob.stages || []).filter(s => s.status === 'failed').length}
                      </div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                  </div>

                  {selectedJob.overallQualityScore && (
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Overall Quality Score</span>
                      <span className="text-lg font-semibold text-green-600">
                        {(selectedJob.overallQualityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {selectedJob.totalDuration && (
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Total Duration</span>
                      <span className="text-lg font-semibold">
                        {formatDuration(selectedJob.totalDuration)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stages" className="space-y-6">
          {/* Stage Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STAGE_DEFINITIONS.map((stage) => (
              <Card key={stage.id} className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${stage.color} text-white`}>
                      {stage.icon}
                    </div>
                    <span>{stage.name}</span>
                  </CardTitle>
                  <CardDescription>{stage.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stage Details */}
                  <div>
                    <h4 className="font-semibold mb-2">Processes</h4>
                    <div className="space-y-1">
                      {Object.entries(stage.details).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="ml-2 text-gray-600">
                            {Array.isArray(value) ? value.join(', ') : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stage Status */}
                  {selectedJob && (
                    <div>
                      <h4 className="font-semibold mb-2">Current Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status</span>
                          <Badge className={getStatusColor(selectedJob.stages?.find(s => s.id === stage.id)?.status || 'pending')}>
                            {selectedJob.stages?.find(s => s.id === stage.id)?.status || 'pending'}
                          </Badge>
                        </div>
                        
                        {selectedJob.stages?.find(s => s.id === stage.id)?.progress !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>{selectedJob.stages?.find(s => s.id === stage.id)?.progress}%</span>
                            </div>
                            <Progress value={selectedJob.stages?.find(s => s.id === stage.id)?.progress || 0} className="h-2" />
                          </div>
                        )}

                        {selectedJob.stages?.find(s => s.id === stage.id)?.qualityScore && (
                          <div className="flex items-center justify-between text-sm">
                            <span>Quality Score</span>
                            <span className="font-semibold">
                              {(selectedJob.stages?.find(s => s.id === stage.id)?.qualityScore! * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}

                        {selectedJob.stages?.find(s => s.id === stage.id)?.duration && (
                          <div className="flex items-center justify-between text-sm">
                            <span>Duration</span>
                            <span>{formatDuration(selectedJob.stages?.find(s => s.id === stage.id)?.duration!)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stage Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleViewStageDetails(stage.id)}
                      disabled={!selectedJob || !selectedJob.stages?.find(s => s.id === stage.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          {/* Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                    <p className="text-2xl font-bold">{apiJobs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Successful</p>
                    <p className="text-2xl font-bold">
                      {apiJobs.filter(job => job.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold">
                      {apiJobs.filter(job => job.status === 'failed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Quality</p>
                    <p className="text-2xl font-bold">
                      {apiJobs.length > 0 
                        ? (apiJobs.reduce((sum, job) => sum + (job.overallQualityScore || 0), 0) / apiJobs.length * 100).toFixed(1)
                        : '0.0'
                      }%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stage Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Stage Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {STAGE_DEFINITIONS.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${stage.color} text-white`}>
                        {stage.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{stage.name}</h3>
                        <p className="text-sm text-gray-600">{stage.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Avg Duration</div>
                      <div className="font-semibold">
                        {apiJobs.length > 0 
                          ? formatDuration(
                              apiJobs.reduce((sum, job) => {
                                const stageData = job.stages?.find(s => s.id === stage.id)
                                return sum + (stageData?.duration || 0)
                              }, 0) / apiJobs.length
                            )
                          : '0ms'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Processing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Processing History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No processing jobs yet</p>
                    <p className="text-sm text-gray-500">Click "Start Pipeline" to begin processing</p>
                  </div>
                ) : (
                  apiJobs.map((job) => (
                    <div 
                      key={job.jobId} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedJob?.jobId === job.jobId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <h3 className="font-semibold">Job {job.jobId.slice(-8)}</h3>
                            <p className="text-sm text-gray-600">
                              Template: {job.templateId} • Project: {job.projectId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          <div className="text-sm text-gray-600 mt-1">
                            {job.createdAt.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{Number(job.progress || 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={Number(job.progress || 0)} className="h-2" />
                      </div>

                      {job.overallQualityScore && (
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span>Quality Score</span>
                          <span className="font-semibold">
                            {((job.overallQualityScore || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {job.totalDuration && (
                        <div className="mt-1 flex items-center justify-between text-sm">
                          <span>Duration</span>
                          <span>{formatDuration(job.totalDuration)}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stage Details Dialog */}
      <Dialog open={stageDetailsDialogOpen} onOpenChange={setStageDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Stage Details: {STAGE_DEFINITIONS.find(s => s.id === selectedStageForDetails)?.name}</span>
              </div>
            </DialogTitle>
            <DialogDescription>
              Comprehensive information about this pipeline stage execution
            </DialogDescription>
          </DialogHeader>

          {loadingStageDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading stage details...</p>
              </div>
            </div>
          ) : selectedStageData ? (
            <div className="space-y-6">
              {/* Stage Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Stage Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Stage ID</label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                        {selectedStageData.stageId || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Stage Type</label>
                      <p className="text-sm font-semibold mt-1">
                        {selectedStageData.stageType || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(selectedStageData.status || 'pending')}>
                          {selectedStageData.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Quality Score</label>
                      <p className="text-sm font-bold text-green-600 mt-1">
                        {selectedStageData.qualityScore 
                          ? (selectedStageData.qualityScore * 100).toFixed(1) + '%' 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Execution Time</label>
                      <p className="text-sm mt-1">
                        {selectedStageData.executionTime 
                          ? formatDuration(selectedStageData.executionTime) 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Completed At</label>
                      <p className="text-sm mt-1">
                        {selectedStageData.completedAt 
                          ? new Date(selectedStageData.completedAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stage Input */}
              {selectedStageData.inputData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <ArrowDown className="h-4 w-4" />
                      <span>Stage Input</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-60">
                      {JSON.stringify(selectedStageData.inputData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Stage Output */}
              {selectedStageData.outputData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Stage Output</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-60">
                      {JSON.stringify(selectedStageData.outputData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Stage Metadata */}
              {selectedStageData.metadata && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Info className="h-4 w-4" />
                      <span>Stage Metadata</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-60">
                      {JSON.stringify(selectedStageData.metadata, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Error Details */}
              {selectedStageData.error && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Error Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-red-700">Error Message</label>
                        <p className="text-sm text-red-600 bg-red-100 p-2 rounded mt-1">
                          {selectedStageData.error_message}
                        </p>
                      </div>
                      {selectedStageData.error_stack && (
                        <div>
                          <label className="text-sm font-medium text-red-700">Stack Trace</label>
                          <pre className="text-xs text-red-600 bg-red-100 p-2 rounded mt-1 overflow-x-auto max-h-40">
                            {selectedStageData.error_stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setStageDetailsDialogOpen(false)}>
                  Close
                </Button>
                {selectedStageData.output && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedStageData.output, null, 2))
                      toast.success('Output copied to clipboard')
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Copy Output
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No stage data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

