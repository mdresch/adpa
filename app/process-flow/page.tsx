"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { 
  FileText, 
  ArrowRight, 
  Plus, 
  Edit, 
  Trash2, 
  BarChart3, 
  Settings,
  Zap,
  TrendingUp,
  Layers,
  Database,
  Cpu,
  MemoryStickIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  XCircle,
  ExternalLink,
  Download,
  Brain,
  Wand2,
  Crosshair,
  Sparkles
} from "@/components/ui/icons-shim"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { getApiUrl as getApiUrlUtil } from '@/lib/api-url'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import ReactMarkdown from "react-markdown"
// @ts-ignore
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
// @ts-ignore
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"

// Imported components
import { ProcessFlowMetrics } from "./components/ProcessFlowMetrics"
import { ProcessingProgressVisualization } from "./components/ProcessingProgressVisualization"
import { WorkflowTab } from "./components/WorkflowTab"
import { ConfigurationTab } from "./components/ConfigurationTab"
import { DocumentsTab } from "./components/DocumentsTab"
import { OptimizationTab } from "./components/OptimizationTab"
import { ContentStructuringTab } from "./components/ContentStructuringTab"
import { formatNumber } from "./utils/formatters"
import type { Template, Project, AIProvider, ProcessingStep, WorkflowConfig } from "./types"

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

export default function ProcessFlowWorkflow() {
  const router = useRouter()
  const apiUrl = (path: string) => getApiUrlUtil(path)

  // Initialize API client with token
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !(apiClient as any).token) {
      ;(apiClient as any).setToken(token)
    }
  }, [])

  // State management
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedAIProvider, setSelectedAIProvider] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [availableTemplates, setAvailableTemplates] = useState<Array<{
    id: string
    name: string
    description: string
    category: string
    content?: string
    development_status?: 'draft' | 'testing' | 'compliance' | 'validated' | 'production' | 'deprecated' | 'archived'
    validation_count?: number
    success_count?: number
    success_rate?: number
    health_rating?: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'
    framework?: string
  }>>([])
  const [availableProjects, setAvailableProjects] = useState<Array<{
    id: string
    name: string
    description: string
    status: string
    framework?: string
  }>>([])
  const [availableAIProviders, setAvailableAIProviders] = useState<Array<{
    id: string
    name: string
    type: string
    status: string
    description?: string
  }>>([])
  const [availableModels, setAvailableModels] = useState<Array<{
    id: string
    name: string
    providerId: string
    maxTokens: number
    contextWindow: number
  }>>([])
  const [projectDocuments, setProjectDocuments] = useState<Array<{
    id: string
    name: string
    type: string
    size: number
    tokens: number
    content?: string
    content_length?: number
    title?: string
    updated_at?: string
    lastModified?: string
  }>>([])
  const [projectStakeholders, setProjectStakeholders] = useState<Array<{
    id: string
    name?: string
    role: string
    email: string
    department?: string
    stakeholder_type: 'internal' | 'external'
    stakeholder_category: 'primary' | 'secondary'
  }>>([])
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle')
  const [contextWindow, setContextWindow] = useState<number[]>([2000000]) // 2M tokens
  const [currentTokenCount, setCurrentTokenCount] = useState(0)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])
  const [finalContext, setFinalContext] = useState<string>('')
  const [showContextPreview, setShowContextPreview] = useState(false)
  const [stepDetails, setStepDetails] = useState<{[key: string]: string}>({})
  const [workflowProgress, setWorkflowProgress] = useState(0)
  const [modelParameters, setModelParameters] = useState<{
    id: string
    name: string
    providerId: string
    maxTokens: number
    contextWindow: number
    temperature?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    type?: string
  } | null>(null)
  
  // Context Window Analysis states
  const [templateBaseTokens, setTemplateBaseTokens] = useState(150000)
  const [projectMetadataTokens, setProjectMetadataTokens] = useState(75000)
  const [stakeholderTokens, setStakeholderTokens] = useState(0)
  const [documentContentTokens, setDocumentContentTokens] = useState(0)
  const [totalUsageTokens, setTotalUsageTokens] = useState(0)
  const [availableTokens, setAvailableTokens] = useState(2000000)
  
  // Content Structuring states
  const [contentStructure, setContentStructure] = useState<any>(null)
  const [templateVariables, setTemplateVariables] = useState<Array<{
    id: string
    name: string
    type: string
    defaultValue: any
    description: string
    required: boolean
    value?: any
  }>>([])
  const [availableVariables, setAvailableVariables] = useState<any>({})
  const [contentAnalysis, setContentAnalysis] = useState<any>(null)
  const [showVariableEditor, setShowVariableEditor] = useState(false)
  const [isAnalyzingContent, setIsAnalyzingContent] = useState(false)
  const [isOptimizingContent, setIsOptimizingContent] = useState(false)
  const [contentRecommendations, setContentRecommendations] = useState<Array<{
    type: string
    priority: string
    title: string
    description: string
    suggestion: string
    impact: string
  }>>([])

  // Dialog states
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false)
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)
  const [generatedDocument, setGeneratedDocument] = useState<string>("")
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  
  // Form states
  const [workflowConfig, setWorkflowConfig] = useState<{
    templateId: string
    projectId: string
    maxTokens: number
    priorityStrategy: string
    compressionLevel: number
    compressionMethod: 'truncate' | 'summarize' | 'smart' | 'keyword'
    includeMetadata: boolean
    includeRelationships: boolean
    includeStakeholders: boolean
    modelId: string
    modelName: string
    modelMaxTokens: number
    modelContextWindow: number
  }>({
    templateId: "",
    projectId: "",
    maxTokens: 2000000,
    priorityStrategy: "relevance",
    compressionLevel: 0.8,
    compressionMethod: "summarize",
    includeMetadata: true,
    includeRelationships: true,
    includeStakeholders: false,
    modelId: "",
    modelName: "",
    modelMaxTokens: 4096,
    modelContextWindow: 2000000
  })

  // Load available templates
  const loadAvailableTemplates = async () => {
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: Array<{
          id: string
          name: string
          description: string
          category: string
          content?: string
          content_length?: number
        }>
      }>('/process-flow/templates', { method: 'GET' })
      if (response.success) {
        setAvailableTemplates(response.data || [])
        console.log('Templates loaded:', response.data?.length, 'templates')
        if (response.data && response.data.length > 0) {
          console.log('First template:', response.data[0].name, 'Content length:', response.data[0].content?.length)
        }
      }
    } catch (error) {
      console.error('Error loading available templates:', error)
      // toast.error('Failed to load templates')
    }
  }

  // Load available projects
  const loadAvailableProjects = async () => {
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: Array<{
          id: string
          name: string
          description: string
          status: string
        }>
      }>('/process-flow/projects', { method: 'GET' })
      if (response.success) {
        setAvailableProjects(response.data || [])
      }
    } catch (error) {
      console.error('Error loading available projects:', error)
      // toast.error('Failed to load projects')
    }
  }

  // Load project documents
  const loadProjectDocuments = async (projectId: string) => {
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: Array<{
          id: string
          name: string
          type: string
          size: number
          tokens: number
        }>
      }>(`/process-flow/projects/${projectId}/documents`, { method: 'GET' })
      if (response.success) {
        console.log('Raw project documents from API:', response.data)
        console.log('First document structure:', response.data?.[0])
        setProjectDocuments(response.data || [])
      }
    } catch (error) {
      console.error('Error loading project documents:', error)
      // toast.error('Failed to load project documents')
    }
  }

  // Load project stakeholders
  const loadProjectStakeholders = async (projectId: string) => {
    try {
      const response = await apiClient.getProjectStakeholders(projectId)
      console.log('Project stakeholders loaded:', response.stakeholders)
      setProjectStakeholders(response.stakeholders || [])
    } catch (error) {
      console.error('Error loading project stakeholders:', error)
      setProjectStakeholders([])
    }
  }

  // Load available AI providers
  const loadAvailableAIProviders = async () => {
    try {
      const response = await apiClient.request<{
        providers: Array<{
          id: string
          name: string
          type: string
          status: string
        }>
      }>('/ai/providers', { method: 'GET' })
      // The AI providers endpoint returns { providers: [...] } directly
      setAvailableAIProviders(response.providers || [])
    } catch (error) {
      console.error('Error loading available AI providers:', error)
      // toast.error('Failed to load AI providers')
    }
  }

  // Load available models for selected provider
  const loadAvailableModels = async (providerId: string) => {
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: Array<{
          id: string
          name: string
          providerId: string
          maxTokens: number
          contextWindow: number
        }>
      }>(`/process-flow/providers/${providerId}/models`, { method: 'GET' })
      if (response.success) {
        setAvailableModels(response.data || [])
      }
    } catch (error) {
      console.error('Error loading available models:', error)
      // toast.error('Failed to load AI models')
    }
  }

  // Initialize data
  useEffect(() => {
    loadAvailableTemplates()
    loadAvailableProjects()
    loadAvailableAIProviders()
  }, [])

  // Load documents and stakeholders when project changes
  useEffect(() => {
    if (selectedProject) {
      loadProjectDocuments(selectedProject)
      loadProjectStakeholders(selectedProject)
    } else {
      // Clear data when no project is selected
      setProjectDocuments([])
      setProjectStakeholders([])
    }
  }, [selectedProject])

  // Recalculate document priorities when priority strategy changes
  useEffect(() => {
    if (projectDocuments.length > 0 && workflowConfig.priorityStrategy) {
      calculateDocumentPriorities(projectDocuments, workflowConfig.priorityStrategy)
    }
  }, [workflowConfig.priorityStrategy, projectDocuments])

  // Calculate context window analysis
  const calculateContextWindowAnalysis = () => {
    // Calculate template base tokens based on selected template
    const selectedTemplateData = availableTemplates.find(t => t.id === selectedTemplate)
    const templateTokens = selectedTemplateData ? 
      Math.ceil((selectedTemplateData.content?.length || 0) / 4) : 150000
    
    // Calculate project metadata tokens based on selected project
    const selectedProjectData = availableProjects.find(p => p.id === selectedProject)
    const metadataTokens = selectedProjectData ? 
      Math.ceil((JSON.stringify(selectedProjectData).length || 0) / 4) : 75000
    
    // Calculate stakeholder tokens if enabled and project is selected
    const stakeholderTokens = (workflowConfig.includeStakeholders && selectedProject && projectStakeholders.length > 0) ? 
      Math.ceil(JSON.stringify({
        stakeholders: projectStakeholders.map(stakeholder => ({
          name: stakeholder.name || 'Unnamed Stakeholder',
          role: stakeholder.role,
          email: stakeholder.email,
          department: stakeholder.department,
          type: stakeholder.stakeholder_type,
          category: stakeholder.stakeholder_category
        }))
      }).length / 4) : 0
    
    // Calculate document content tokens based on selected documents
    const docTokens = projectDocuments.reduce((total, doc) => {
      if (!doc.content) return total
      
      try {
        // Content is now stored as simple markdown text
        let actualContent = ''
        
        if (typeof doc.content === 'string') {
          // Content is already markdown text
          actualContent = doc.content
        } else {
          // Fallback: convert to string
          actualContent = String(doc.content)
        }
        
        // Estimate tokens based on markdown content (rough approximation: 1 token ≈ 4 characters)
        const contentLength = actualContent.length
        const rawTokens = Math.ceil(contentLength / 4)
        
        // Apply compression level by truncating content to the specified percentage
        const compressedContentLength = Math.floor(contentLength * workflowConfig.compressionLevel)
        const compressedTokens = Math.ceil(compressedContentLength / 4)
        
        // Debug logging for first few documents
        if (total === 0) {
          console.log(`Document: ${doc.name}`)
          console.log(`Content length: ${contentLength}`)
          console.log(`Raw tokens: ${rawTokens}`)
          console.log(`Compression level: ${(workflowConfig.compressionLevel * 100).toFixed(0)}%`)
          console.log(`Compressed tokens: ${compressedTokens}`)
          console.log(`Content preview: ${actualContent.substring(0, 200)}...`)
        }
        
        return total + compressedTokens
      } catch (error) {
        console.error('Error processing document content:', error, doc.name)
        // Fallback: use content length if available
        const contentLength = doc.content_length || (typeof doc.content === 'string' ? doc.content.length : 0)
        const rawTokens = Math.ceil(contentLength / 4)
        const compressedContentLength = Math.floor(contentLength * workflowConfig.compressionLevel)
        const compressedTokens = Math.ceil(compressedContentLength / 4)
        return total + compressedTokens
      }
    }, 0)
    
    // Update individual token counts
    setTemplateBaseTokens(templateTokens)
    setProjectMetadataTokens(metadataTokens)
    setStakeholderTokens(stakeholderTokens)
    setDocumentContentTokens(docTokens)
    
    // Calculate total usage
    const total = templateTokens + metadataTokens + stakeholderTokens + docTokens
    setTotalUsageTokens(total)
    
    // Calculate available tokens
    const available = contextWindow[0] - total
    setAvailableTokens(available)
    
    // Update current token count for header
    setCurrentTokenCount(total)
  }

  // Content Structuring Functions
  const analyzeContentStructure = async (content: string) => {
    if (!content.trim()) {
      toast.error("Please provide content to analyze")
      return
    }

    setIsAnalyzingContent(true)
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: {
          variables?: any[]
          metadata?: any
          recommendations?: any[]
        }
      }>('/content-structuring/analyze', {
        method: 'POST',
        body: JSON.stringify({
          content,
          projectId: selectedProject
        })
      })

      if (response.success && response.data) {
        setContentStructure(response.data)
        setTemplateVariables(response.data.variables || [])
        setContentAnalysis(response.data.metadata)
        setContentRecommendations(response.data.recommendations || [])
        toast.success("Content analysis completed successfully")
      } else {
        toast.error("Failed to analyze content structure")
      }
    } catch (error) {
      console.error('Content analysis error:', error)
      toast.error("Failed to analyze content structure")
    } finally {
      setIsAnalyzingContent(false)
    }
  }

  const optimizeContentStructure = async (content: string) => {
    if (!content.trim()) {
      toast.error("Please provide content to optimize")
      return
    }

    setIsOptimizingContent(true)
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: {
          optimizedContent?: string
        }
      }>('/content-structuring/optimize', {
        method: 'POST',
        body: JSON.stringify({
          content,
          projectId: selectedProject
        })
      })

      if (response.success && response.data) {
        setGeneratedDocument(response.data.optimizedContent || '')
        toast.success("Content structure optimized successfully")
      } else {
        toast.error("Failed to optimize content structure")
      }
    } catch (error) {
      console.error('Content optimization error:', error)
      toast.error("Failed to optimize content structure")
    } finally {
      setIsOptimizingContent(false)
    }
  }

  const replaceVariables = async (content: string, variables: Record<string, any>) => {
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: {
          processedContent?: string
          replacementCount?: number
        }
      }>('/content-structuring/replace-variables', {
        method: 'POST',
        body: JSON.stringify({
          content,
          variables,
          projectId: selectedProject
        })
      })

      if (response.success && response.data) {
        setGeneratedDocument(response.data.processedContent || '')
        toast.success(`Replaced ${response.data.replacementCount || 0} variables successfully`)
      } else {
        toast.error("Failed to replace variables")
      }
    } catch (error) {
      console.error('Variable replacement error:', error)
      toast.error("Failed to replace variables")
    }
  }

  const loadAvailableVariables = async () => {
    if (!selectedProject) return

    try {
      const response = await apiClient.request<{
        success: boolean
        data?: any
      }>(`/content-structuring/variables/${selectedProject}`, {
        method: 'GET'
      })

      if (response.success && response.data) {
        setAvailableVariables(response.data)
      }
    } catch (error) {
      console.error('Error loading available variables:', error)
    }
  }

  const updateVariableValue = (variableId: string, value: any) => {
    setTemplateVariables(prev => 
      prev.map(variable => 
        variable.id === variableId 
          ? { ...variable, value }
          : variable
      )
    )
  }

  const applyVariableReplacements = () => {
    const variables: Record<string, any> = {}
    templateVariables.forEach(variable => {
      if (variable.value !== undefined && variable.value !== null) {
        variables[variable.name] = variable.value
      }
    })

    if (Object.keys(variables).length > 0) {
      replaceVariables(generatedDocument, variables)
    } else {
      toast.warning("No variables have values to replace")
    }
  }

  // Recalculate context window analysis when documents or selections change
  useEffect(() => {
    calculateContextWindowAnalysis()
  }, [projectDocuments.length, projectStakeholders.length, selectedTemplate, selectedProject, contextWindow[0], workflowConfig.compressionLevel, workflowConfig.compressionMethod, workflowConfig.includeStakeholders])

  // Load available variables when project changes
  useEffect(() => {
    if (selectedProject) {
      loadAvailableVariables()
    }
  }, [selectedProject])

  // Load models when AI provider changes
  useEffect(() => {
    if (selectedAIProvider) {
      loadAvailableModels(selectedAIProvider)
      setSelectedModel("") // Reset model selection
    }
  }, [selectedAIProvider])

  // Format numbers consistently to avoid hydration errors
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US')
  }

  // Start workflow processing
  const startWorkflow = async () => {
    try {
      if (!selectedTemplate || !selectedProject) {
        toast("Please select a template and project", {
          type: "error"
        })
        return
      }

      const config = {
        templateId: selectedTemplate,
        projectId: selectedProject,
        maxTokens: contextWindow[0],
        priorityStrategy: workflowConfig.priorityStrategy,
        compressionLevel: workflowConfig.compressionLevel,
        compressionMethod: workflowConfig.compressionMethod,
        includeMetadata: workflowConfig.includeMetadata,
        includeRelationships: workflowConfig.includeRelationships,
        includeStakeholders: workflowConfig.includeStakeholders
      }

      toast("Starting workflow processing...", {
        type: "info",
        description: "Processing your documents with AI compression"
      })
      
      const response = await apiClient.post('/process-flow/start-workflow', config)
      
      if (response.data.success) {
        setWorkflowResult(response.data.data)
        setGeneratedDocument(response.data.data.finalDocument)
        setShowWorkflowDialog(false)
        setShowDocumentViewer(true)
        
        // Show success message with document info
        const savedDoc = response.data.data.savedDocument
        toast("Workflow completed!", {
          type: "success",
          description: `Document "${savedDoc.name}" saved to project.`,
          action: {
            label: "View Document",
            onClick: () => {
              // Navigate to document view (you can implement this)
              window.open(`/documents/${savedDoc.id}`, '_blank')
            }
          }
        })
      } else {
        toast("Workflow processing failed", {
          type: "error"
        })
      }
    } catch (error) {
      console.error('Error starting workflow:', error)
      toast("Failed to start workflow processing", {
        type: "error"
      })
    }
  }

  // Update context window and max tokens when model changes
  useEffect(() => {
    if (selectedModel && availableModels.length > 0) {
      const model = availableModels.find(m => m.id === selectedModel)
      if (model) {
        // Update context window based on model's context window
        if (model.contextWindow) {
          setContextWindow([model.contextWindow])
        }
        
        // Update workflow config with model parameters
        setWorkflowConfig(prev => ({
          ...prev,
          maxTokens: model.contextWindow || 2000000,
          modelId: model.id,
          modelName: model.name,
          modelMaxTokens: model.maxTokens || 4096
        }))
        
        setModelParameters(model)
        
        // Show toast with model information
        toast("Model Selected", {
          description: `Selected ${model.name} with ${model.contextWindow ? formatNumber(model.contextWindow) : 'Unknown'} token context window`,
        })
      }
    }
  }, [selectedModel, availableModels])

  // Start workflow processing
  const startWorkflowProcessing = async () => {
    if (!selectedTemplate || !selectedProject || !selectedAIProvider || !selectedModel) {
      toast("Selection Required", {
        description: "Please select template, project, AI provider, and model",
        type: "error",
      })
      return
    }

    setProcessingStatus('processing')
    setWorkflowProgress(0)
    setProcessingSteps([])

    try {
      console.log('Starting workflow processing with config:', {
        templateId: selectedTemplate,
        projectId: selectedProject,
        maxTokens: contextWindow[0],
        priorityStrategy: workflowConfig.priorityStrategy,
        compressionLevel: workflowConfig.compressionLevel,
        compressionMethod: workflowConfig.compressionMethod,
        includeMetadata: workflowConfig.includeMetadata,
        includeRelationships: workflowConfig.includeRelationships,
        includeStakeholders: workflowConfig.includeStakeholders
      })

      // Call the backend API to start workflow processing
      const response = await apiClient.request('/process-flow/start-workflow', {
        method: 'POST',
        body: JSON.stringify({
          templateId: selectedTemplate,
          projectId: selectedProject,
          maxTokens: contextWindow[0],
          priorityStrategy: workflowConfig.priorityStrategy,
          compressionLevel: workflowConfig.compressionLevel,
          compressionMethod: workflowConfig.compressionMethod,
          includeMetadata: workflowConfig.includeMetadata,
          includeRelationships: workflowConfig.includeRelationships,
          includeStakeholders: workflowConfig.includeStakeholders
        })
      }) as any

      console.log('API response received:', response)

      if (response.success) {
        // Check if this is the new async response format (with jobId)
        if (response.data.jobId) {
          // New async format - job queued
          console.log('Process-flow job queued:', response.data.jobId)
          
          toast.success('Document generation started!', {
            description: response.data.message || 'Check the Jobs page to monitor progress.',
            duration: 5000
          })
          
          // Redirect to jobs page after a short delay
          setTimeout(() => {
            router.push('/jobs')
          }, 2000)
          
          return
        }
        
        // Old synchronous format (legacy support)
        console.log('Backend response:', response)
        console.log('Backend steps:', response.data.steps)
        const backendSteps = response.data.steps || []
        console.log('Processing backend steps:', backendSteps)
        
        // Convert backend steps to frontend format
        const frontendSteps = backendSteps.map((step: any) => ({
          id: step.id.toString(),
          name: step.name,
          status: step.status,
          progress: step.status === 'completed' ? 100 : step.status === 'processing' ? 50 : 0,
          metadata: step.metadata, // Include metadata for document details
          result: {
            description: step.description,
            tokens: step.tokens,
            startTime: step.startTime,
            endTime: step.endTime,
            contextAdded: step.contextAdded // Add the context content
          }
        }))
        
        console.log('Frontend steps:', frontendSteps)
        setProcessingSteps(frontendSteps)
        console.log('Processing steps state set to:', frontendSteps)
        
        // Calculate total progress and tokens
        const completedSteps = frontendSteps.filter((step: { status: string }) => step.status === 'completed').length
        const totalProgress = (completedSteps / frontendSteps.length) * 100
        const totalTokens = frontendSteps.reduce((sum: number, step: { result?: { tokens?: number } }) => sum + (step.result?.tokens || 0), 0)
        
        setWorkflowProgress(totalProgress)
        setCurrentTokenCount(totalTokens)
        
        // Set status based on backend response
        if (completedSteps === frontendSteps.length) {
          setProcessingStatus('completed')
          
          // Store final document if available
          if (response.data.finalDocument) {
            setFinalContext(response.data.finalDocument)
            setGeneratedDocument(response.data.finalDocument) // Also set for document viewer
          }
          
          // Store workflow result for document link
          if (response.data.savedDocument) {
            setWorkflowResult({ savedDocument: response.data.savedDocument })
          }
          
          toast("Processing Complete", {
            description: "Workflow processing completed successfully! Click 'View Generated Document' to review.",
          })
        } else {
          setProcessingStatus('processing')
        }
      } else {
        throw new Error(response.error || 'Failed to start workflow processing')
      }
    } catch (error: any) {
      console.error('Error starting workflow processing:', error)
      console.error('Error details:', error?.message)
      console.error('Error stack:', error?.stack)
      setProcessingStatus('error')
      toast("Processing Failed", {
        description: "Failed to start workflow processing",
        type: "error",
      })
    }
  }

  // Reset workflow
  const resetWorkflow = () => {
    setProcessingStatus('idle')
    setWorkflowProgress(0)
    setProcessingSteps([])
    setCurrentTokenCount(0)
    setFinalContext('')
    setShowContextPreview(false)
    setSelectedTemplate("")
    setSelectedProject("")
    setSelectedAIProvider("")
    setSelectedModel("")
    setModelParameters(null)
    setContextWindow([2000000]) // Reset to default
  }

  // Calculate document priorities using backend API
  const calculateDocumentPriorities = async (documents: any[], strategy: string = 'hybrid') => {
    console.log('Calculating priorities for documents:', documents)
    console.log('Using strategy:', strategy)
    
    try {
      const response = await apiClient.post('/process-flow/prioritize-documents', {
        documents,
        strategy
      })

      console.log('Backend API response:', response)

      if (response.success) {
        return response.data || []
      }
      return []
    } catch (error) {
      console.error('Error calculating document priorities:', error)
      console.log('Using fallback calculation with documents:', documents)
      // Fallback to local calculation with real token counts
      return documents.map(doc => ({
        ...doc,
        name: doc.name || doc.title || `Document ${doc.id || 'Unknown'}`,
        priorityScore: Math.random() * 0.4 + 0.3,
        estimatedTokens: doc.content_length ? Math.ceil(doc.content_length / 4) : 0,
        lastModified: doc.updated_at || doc.lastModified || new Date().toISOString()
      })).sort((a, b) => b.priorityScore - a.priorityScore)
    }
  }

  // State for prioritized documents
  const [prioritizedDocuments, setPrioritizedDocuments] = useState<any[]>([])
  const [isLoadingPriorities, setIsLoadingPriorities] = useState(false)

  // Helper function to format date
  const formatLastModified = (lastModified: string | undefined) => {
    if (!lastModified) return 'Unknown'
    try {
      const date = new Date(lastModified)
      if (isNaN(date.getTime())) return 'Unknown'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Unknown'
    }
  }

  // Get prioritized documents using the backend API
  const getPrioritizedDocuments = async () => {
    if (projectDocuments.length === 0) {
      setPrioritizedDocuments([])
      return
    }
    
    setIsLoadingPriorities(true)
    try {
      const prioritized = await calculateDocumentPriorities(projectDocuments, workflowConfig.priorityStrategy)
      console.log('Prioritized documents from API:', prioritized)
      setPrioritizedDocuments(prioritized)
    } catch (error) {
      console.error('Error getting prioritized documents:', error)
      // Fallback to local calculation with real token counts
      console.log('Using fallback calculation with projectDocuments:', projectDocuments)
      const fallback = projectDocuments.map(doc => ({
        ...doc,
        name: doc.name || doc.title || `Document ${doc.id || 'Unknown'}`,
        priorityScore: Math.random() * 0.4 + 0.3,
        estimatedTokens: doc.content_length ? Math.ceil(doc.content_length / 4) : 0,
        lastModified: doc.updated_at || doc.lastModified || new Date().toISOString()
      })).sort((a, b) => b.priorityScore - a.priorityScore)
      console.log('Fallback prioritized documents:', fallback)
      setPrioritizedDocuments(fallback)
    } finally {
      setIsLoadingPriorities(false)
    }
  }

  // Update prioritized documents when documents or strategy changes
  useEffect(() => {
    getPrioritizedDocuments()
  }, [projectDocuments.length, workflowConfig.priorityStrategy])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Process Flow Workflow</h1>
                  <p className="text-muted-foreground">
                    Visualize template processing with project information injection and document prioritization
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={startWorkflowProcessing} 
                  disabled={processingStatus === 'processing' || !selectedTemplate || !selectedProject || !selectedAIProvider || !selectedModel}
                  className="flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Processing</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetWorkflow}
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>

            {/* Configuration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Context Window</CardTitle>
                  <MemoryStickIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(contextWindow[0])}</div>
                  <p className="text-xs text-muted-foreground">Max tokens available</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Usage</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(totalUsageTokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    {((totalUsageTokens / contextWindow[0]) * 100).toFixed(1)}% utilized
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing Status</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{processingStatus}</div>
                  <p className="text-xs text-muted-foreground">
                    {processingStatus === 'processing' ? `${workflowProgress.toFixed(0)}% complete` : 'Ready to process'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectDocuments.length}</div>
                  <p className="text-xs text-muted-foreground">Available for processing</p>
                </CardContent>
              </Card>
            </div>

            {/* Processing Progress Visualization */}
            {processingStatus !== 'idle' && (
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {processingStatus === 'processing' && (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      )}
                      {processingStatus === 'completed' && (
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                      )}
                      {processingStatus === 'error' && (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )}
                      <div>
                        <CardTitle>Document Processing Pipeline</CardTitle>
                        <CardDescription>
                          {processingStatus === 'processing' && 'Processing your document...'}
                          {processingStatus === 'completed' && 'Processing completed successfully!'}
                          {processingStatus === 'error' && 'An error occurred during processing'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">{workflowProgress.toFixed(0)}%</div>
                      <p className="text-xs text-muted-foreground">Overall Progress</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing Steps</span>
                      <span className="font-medium">{processingSteps.filter(s => s.status === 'completed').length} / {processingSteps.length} Complete</span>
                    </div>
                    <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${workflowProgress}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white drop-shadow-md">
                          {workflowProgress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Steps */}
                  {processingSteps.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Processing Steps</h4>
                      <div className="space-y-3">
                        {processingSteps.map((step, index) => (
                          <div key={step.id} className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                            step.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700' :
                            step.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700 shadow-lg' :
                            step.status === 'error' ? 'bg-destructive/10 border-destructive/20' :
                            'bg-muted/30 border-muted'
                          }`}>
                            {/* Step Number & Status Icon */}
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                                step.status === 'completed' ? 'bg-emerald-500 text-white' :
                                step.status === 'processing' ? 'bg-blue-500 text-white animate-pulse' :
                                step.status === 'error' ? 'bg-destructive text-destructive-foreground' :
                                'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                              }`}>
                                {step.status === 'completed' && <CheckCircle className="h-5 w-5" />}
                                {step.status === 'processing' && <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />}
                                {step.status === 'error' && <XCircle className="h-5 w-5" />}
                                {step.status === 'pending' && <span className="text-sm">{index + 1}</span>}
                              </div>
                              {index < processingSteps.length - 1 && (
                                <div className={`w-0.5 h-12 ${
                                  step.status === 'completed' ? 'bg-emerald-500' :
                                  step.status === 'processing' ? 'bg-blue-500' :
                                  'bg-gray-300 dark:bg-gray-600'
                                }`} />
                              )}
                            </div>

                            {/* Step Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-base">{step.name}</h4>
                                <Badge variant={
                                  step.status === 'completed' ? 'default' :
                                  step.status === 'processing' ? 'secondary' :
                                  step.status === 'error' ? 'destructive' :
                                  'outline'
                                }>
                                  {step.status === 'completed' && '✓ Complete'}
                                  {step.status === 'processing' && '⟳ Processing...'}
                                  {step.status === 'error' && '✗ Error'}
                                  {step.status === 'pending' && '○ Pending'}
                                </Badge>
                              </div>
                              
                              {/* Step Details */}
                              {step.result && (
                                <div className="space-y-2 text-sm">
                                  {step.result.description && (
                                    <p className="text-muted-foreground">{step.result.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs">
                                    {step.result.tokens !== undefined && (
                                      <div className="flex items-center gap-1">
                                        <Database className="h-3 w-3" />
                                        <span className="font-mono">{formatNumber(step.result.tokens)} tokens</span>
                                      </div>
                                    )}
                                    {step.result.startTime && step.result.endTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{((new Date(step.result.endTime).getTime() - new Date(step.result.startTime).getTime()) / 1000).toFixed(2)}s</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Document Compression Details */}
                                  {step.metadata && step.metadata.documents && step.metadata.documents.length > 0 && (
                                    <details className="mt-3" open={step.status === 'completed'}>
                                      <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        View individual document results ({step.metadata.compressedCount} documents)
                                      </summary>
                                      <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20">
                                        {step.metadata.documents.map((doc: any, docIndex: number) => (
                                          <div key={docIndex} className="p-2 bg-muted/50 rounded-lg border border-border/50">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                                  <span className="text-xs font-semibold truncate">{doc.name}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                  <div className="flex items-center gap-1">
                                                    <span className="font-mono">📥 {formatNumber(doc.originalTokens)}</span>
                                                    <span className="text-[10px]">→</span>
                                                    <span className="font-mono">📤 {formatNumber(doc.compressedTokens)}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                      🎯 {doc.compressionPercent}% saved
                                                    </span>
                                                  </div>
                                                </div>
                                                {doc.note && (
                                                  <div className="text-[10px] text-muted-foreground mt-1 italic">
                                                    {doc.note}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        <div className="pt-2 mt-2 border-t border-border/50 text-xs">
                                          <div className="flex items-center justify-between text-muted-foreground">
                                            <span>Total Summary</span>
                                            <div className="flex items-center gap-4">
                                              <span className="font-mono">
                                                {formatNumber(step.metadata.originalTokens)} → {formatNumber(step.metadata.compressedTokens)}
                                              </span>
                                              <Badge variant="outline" className="text-[10px]">
                                                {formatNumber(step.metadata.tokensSaved)} tokens saved
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </details>
                                  )}
                                  
                                  {/* Context Preview */}
                                  {step.result.contextAdded && (
                                    <details className="mt-2">
                                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                                        View full compression report
                                      </summary>
                                      <div className="mt-2 p-3 bg-background border rounded-lg max-h-40 overflow-y-auto">
                                        <pre className="text-xs whitespace-pre-wrap font-mono">
                                          {step.result.contextAdded.slice(0, 500)}
                                          {step.result.contextAdded.length > 500 && '...'}
                                        </pre>
                                      </div>
                                    </details>
                                  )}
                                </div>
                              )}

                              {/* Step Progress Bar (for processing steps) */}
                              {step.status === 'processing' && (
                                <div className="mt-3 space-y-1">
                                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full transition-all duration-300 animate-pulse"
                                      style={{ width: `${step.progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Results */}
                  {processingStatus === 'completed' && finalContext && (
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={() => setShowDocumentViewer(true)}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View Generated Document
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="workflow" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="workflow">Workflow Visualization</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="documents">Document Prioritization</TabsTrigger>
                <TabsTrigger value="optimization">Context Optimization</TabsTrigger>
                <TabsTrigger value="content-structuring">Content Structuring</TabsTrigger>
              </TabsList>

              {/* Workflow Visualization Tab */}
              <TabsContent value="workflow" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Template Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>Template Selection</span>
                      </CardTitle>
                      <CardDescription>
                        Select a template to process with project information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-select">Template</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex items-center gap-2 w-full">
                                  {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] && (
                                    <span className="text-xs">
                                      {statusConfig[template.development_status as keyof typeof statusConfig].emoji}
                                    </span>
                                  )}
                                  <span>{template.name} ({template.category || template.framework})</span>
                                  {template.development_status === 'production' && (
                                    <span className="text-xs">✓</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedTemplate && (() => {
                        const template = availableTemplates.find(t => t.id === selectedTemplate)
                        if (!template) return null
                        
                        return (
                          <div className="space-y-3">
                            {/* Template Status Information Panel */}
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Template Status:</span>
                                  {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] && (
                                    // @ts-expect-error - Badge accepts children via HTMLAttributes
                                    <Badge variant={statusConfig[template.development_status as keyof typeof statusConfig].variant}>
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
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">Success Rate</span>
                                    <span className="font-semibold">
                                      {template.success_rate !== undefined 
                                        ? `${Number(template.success_rate).toFixed(1)}%`
                                        : template.success_count && template.validation_count
                                          ? `${Math.round((template.success_count / template.validation_count) * 100)}%`
                                          : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-muted-foreground text-xs">Test Runs</span>
                                    <span className="font-semibold">{template.validation_count}</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Batch Generation Warning for Non-Production Templates */}
                              {template.development_status && template.development_status !== 'production' && (
                                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                      {template.development_status === 'draft' && 'Draft Template - Not Ready for Batch Generation'}
                                      {template.development_status === 'testing' && 'Testing Template - Limited Validation'}
                                      {template.development_status === 'validated' && 'Validated Template - Use Caution in Batch Operations'}
                                      {template.development_status === 'deprecated' && 'Deprecated Template - Not Recommended'}
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                      This template is not production-ready. Batch processing may produce inconsistent results.
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Success indicator for production templates */}
                              {template.development_status === 'production' && (
                                <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                      Production Template - Ready for Batch Generation
                                    </p>
                                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                      This template has been thoroughly tested and is ready for high-volume processing.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Template Description */}
                        <div className="p-4 bg-muted rounded-lg">
                              <h4 className="font-medium">Template Description</h4>
                          <p className="text-sm text-muted-foreground">
                                {template.description}
                          </p>
                        </div>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>

                  {/* Project Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>Project Information</span>
                      </CardTitle>
                      <CardDescription>
                        Select a project to inject information into the template
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="project-select">Project</Label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProjects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} ({project.framework})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedProject && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium">Selected Project</h4>
                          <p className="text-sm text-muted-foreground">
                            {availableProjects.find(p => p.id === selectedProject)?.description}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* AI Provider and Model Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* AI Provider Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5" />
                        <span>AI Provider Selection</span>
                      </CardTitle>
                      <CardDescription>
                        Select an AI provider for processing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="ai-provider-select">AI Provider</Label>
                        <Select value={selectedAIProvider} onValueChange={setSelectedAIProvider}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an AI provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAIProviders.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name} ({provider.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedAIProvider && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium">Selected Provider</h4>
                          <p className="text-sm text-muted-foreground">
                            {availableAIProviders.find(p => p.id === selectedAIProvider)?.description || 'AI Provider selected'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Model Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Cpu className="h-5 w-5" />
                        <span>Model Selection</span>
                      </CardTitle>
                      <CardDescription>
                        Select a model with specific context window parameters
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="model-select">Model</Label>
                        <Select 
                          value={selectedModel} 
                          onValueChange={setSelectedModel}
                          disabled={!selectedAIProvider}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedAIProvider ? "Select a model" : "Select AI provider first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name} ({model.contextWindow ? formatNumber(model.contextWindow) : 'Unknown'} tokens)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedModel && modelParameters && (
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                          <h4 className="font-medium">Model Parameters</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">Context Window:</span>
                              <div className="text-muted-foreground">{modelParameters.contextWindow ? formatNumber(modelParameters.contextWindow) : 'Unknown'} tokens</div>
                            </div>
                            <div>
                              <span className="font-medium">Max Tokens:</span>
                              <div className="text-muted-foreground">{modelParameters.maxTokens ? formatNumber(modelParameters.maxTokens) : 'Unknown'}</div>
                            </div>
                            <div>
                              <span className="font-medium">Temperature:</span>
                              <div className="text-muted-foreground">{modelParameters.temperature || 'Default'}</div>
                            </div>
                            <div>
                              <span className="font-medium">Model Type:</span>
                              <div className="text-muted-foreground">{modelParameters.type || 'Unknown'}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Processing Steps */}
                {processingSteps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>Processing Steps</span>
                        <div className="ml-auto flex items-center space-x-2">
                          <div className="text-sm text-muted-foreground">
                            {processingSteps.filter(s => s.status === 'completed').length} / {processingSteps.length} completed
                          </div>
                          {processingStatus === 'completed' && finalContext && (
                            <button
                              onClick={() => setShowContextPreview(!showContextPreview)}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                              <span>{showContextPreview ? 'Hide' : 'Show'} Context Preview</span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${showContextPreview ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Real-time workflow processing visualization with stakeholder integration
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {processingSteps.map((step, index) => (
                          <div key={step.id} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center space-x-4 p-4">
                              <div className="flex-shrink-0">
                                {step.status === 'completed' ? (
                                  <CheckCircle className="h-6 w-6 text-green-500" />
                                ) : step.status === 'processing' ? (
                                  <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : step.status === 'error' ? (
                                  <XCircle className="h-6 w-6 text-red-500" />
                                ) : (
                                  <div className="h-6 w-6 border-2 border-gray-300 rounded-full" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{step.name}</h4>
                                <p className="text-sm text-muted-foreground">{step.result?.description || step.name}</p>
                                {step.result?.tokens && (
                                  <div className="mt-1 text-xs text-blue-600">
                                    {formatNumber(step.result.tokens)} tokens processed
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{formatNumber(step.result?.tokens || 0)}</div>
                                <div className="text-xs text-muted-foreground">tokens</div>
                              </div>
                            </div>
                            
                            {/* Step Details (expandable) */}
                            {step.status === 'completed' && step.result && (
                              <div className="border-t bg-gray-50 p-3">
                                <div className="text-xs text-muted-foreground">
                                  <strong>Details:</strong> {step.result.description}
                                </div>
                                {step.result.contextAdded && (
                                  <div className="mt-3">
                                    <details className="group">
                                      <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800">
                                        📄 Show Context Added ({Math.ceil(step.result.contextAdded.length / 4)} tokens)
                                      </summary>
                                      <div className="mt-2 p-2 bg-white border rounded text-xs font-mono max-h-40 overflow-y-auto">
                                        <pre className="whitespace-pre-wrap">{step.result.contextAdded}</pre>
                                      </div>
                                    </details>
                                  </div>
                                )}
                                {step.name.includes('Stakeholder') && (
                                  <div className="mt-2 text-xs text-green-600">
                                    ✅ Stakeholder data successfully integrated into context
                                    {projectStakeholders.length > 0 && (
                                      <div className="mt-1 text-green-700">
                                        Added {projectStakeholders.length} stakeholders: {projectStakeholders.map(s => s.name).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {step.name.includes('AI Document Compression') && (
                                  <div className="mt-2 text-xs text-blue-600">
                                    🤖 AI summarization enhanced with template context for focused compression
                                    {projectDocuments.length > 0 && (
                                      <div className="mt-1 text-blue-700">
                                        Processing {projectDocuments.length} documents with template-specific guidance
                                      </div>
                                    )}
                                  </div>
                                )}
                                {step.name.includes('Content Injection') && (
                                  <div className="mt-2 text-xs text-purple-600">
                                    🔗 All context components merged into final AI prompt
                                    <div className="mt-1 text-purple-700">
                                      • Template structure and system prompt
                                      • Project metadata and stakeholders
                                      • {projectDocuments.length} compressed documents
                                    </div>
                                  </div>
                                )}
                                {step.name.includes('AI Document Generation') && (
                                  <div className="mt-2 text-xs text-orange-600">
                                    🎯 AI generating final document using all injected context
                                    <div className="mt-1 text-orange-700">
                                      Context sent to AI provider for intelligent document creation
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Context Preview Section */}
                      {showContextPreview && finalContext && (
                        <div className="mt-6 border-t pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-lg">Final Context Sent to AI Provider</h4>
                            <div className="text-sm text-muted-foreground">
                              {formatNumber(Math.ceil(finalContext.length / 4))} tokens
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                              {finalContext}
                            </pre>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            This is the complete context that was sent to the AI provider to generate the final document.
                            It includes template structure, project information, stakeholder data, and compressed document content.
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Configuration Tab */}
              <TabsContent value="configuration" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Configuration</CardTitle>
                    <CardDescription>
                      Configure the processing parameters for optimal context window utilization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Model-Specific Parameters */}
                    {selectedModel && modelParameters && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Model-Specific Parameters</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-blue-800 dark:text-blue-200">Model:</span>
                            <div className="text-blue-700 dark:text-blue-300">{modelParameters.name}</div>
                          </div>
                          <div>
                            <span className="font-medium text-blue-800 dark:text-blue-200">Context Window:</span>
                            <div className="text-blue-700 dark:text-blue-300">{modelParameters.contextWindow ? formatNumber(modelParameters.contextWindow) : 'Unknown'} tokens</div>
                          </div>
                          <div>
                            <span className="font-medium text-blue-800 dark:text-blue-200">Max Output Tokens:</span>
                            <div className="text-blue-700 dark:text-blue-300">{modelParameters.maxTokens ? formatNumber(modelParameters.maxTokens) : 'Unknown'}</div>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          These parameters are automatically set based on the selected model and cannot be modified.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="max-tokens">Context Window (Model-Defined)</Label>
                        <div className="space-y-2">
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="text-2xl font-bold">{formatNumber(contextWindow[0])}</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedModel ? 'Set by selected model' : 'Default value'}
                            </div>
                          </div>
                          {!selectedModel && (
                            <Slider
                              value={contextWindow}
                              onValueChange={setContextWindow}
                              max={5000000}
                              min={1000}
                              step={1000}
                              className="w-full"
                            />
                          )}
                          {!selectedModel && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>1K</span>
                              <span className="font-medium">{formatNumber(contextWindow[0])}</span>
                              <span>5M</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="priority-strategy">Priority Strategy</Label>
                        <Select 
                          value={workflowConfig.priorityStrategy} 
                          onValueChange={(value: string) => setWorkflowConfig(prev => ({ ...prev, priorityStrategy: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="relevance">Relevance-based</SelectItem>
                            <SelectItem value="recency">Recency-based</SelectItem>
                            <SelectItem value="importance">Importance-based</SelectItem>
                            <SelectItem value="hybrid">Hybrid Approach</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="compression-level">Compression Level</Label>
                        <div className="space-y-2">
                          <Slider
                            value={[workflowConfig.compressionLevel]}
                            onValueChange={(value: number[]) => setWorkflowConfig(prev => ({ ...prev, compressionLevel: value[0] }))}
                            max={1}
                            min={0.1}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Minimal</span>
                            <span className="font-medium">{(workflowConfig.compressionLevel * 100).toFixed(0)}%</span>
                            <span>Maximum</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="compression-method">🔧 Compression Method</Label>
                        <Select
                          value={workflowConfig.compressionMethod}
                          onValueChange={(value: 'truncate' | 'summarize' | 'smart' | 'keyword') => 
                            setWorkflowConfig(prev => ({ ...prev, compressionMethod: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select compression method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="truncate">
                              <div className="flex flex-col">
                                <span className="font-medium">1. Content Truncation (Simple)</span>
                                <span className="text-xs text-muted-foreground">Take first X% of document content</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="summarize">
                              <div className="flex flex-col">
                                <span className="font-medium">2. AI Summarization (Advanced)</span>
                                <span className="text-xs text-muted-foreground">AI-powered intelligent summarization</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="smart">
                              <div className="flex flex-col">
                                <span className="font-medium">3. Section-Based Compression (Intelligent)</span>
                                <span className="text-xs text-muted-foreground">Preserve structure and important content</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="keyword">
                              <div className="flex flex-col">
                                <span className="font-medium">4. Keyword-Based Compression (Smart)</span>
                                <span className="text-xs text-muted-foreground">Extract key information and compress non-essential</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">
                          {workflowConfig.compressionMethod === 'truncate' && "Fastest method - takes first portion of document"}
                          {workflowConfig.compressionMethod === 'summarize' && "Most intelligent - AI creates coherent summary"}
                          {workflowConfig.compressionMethod === 'smart' && "Balanced approach - preserves structure and key content"}
                          {workflowConfig.compressionMethod === 'keyword' && "Smart extraction - keeps important terms and concepts"}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="include-metadata">Include Metadata</Label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            checked={workflowConfig.includeMetadata}
                            onChange={(e) => setWorkflowConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                            className="rounded" 
                          />
                          <span className="text-sm">Include document metadata</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            checked={workflowConfig.includeRelationships}
                            onChange={(e) => setWorkflowConfig(prev => ({ ...prev, includeRelationships: e.target.checked }))}
                            className="rounded" 
                          />
                          <span className="text-sm">Include relationships</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            checked={workflowConfig.includeStakeholders}
                            onChange={(e) => setWorkflowConfig(prev => ({ ...prev, includeStakeholders: e.target.checked }))}
                            className="rounded" 
                          />
                          <span className="text-sm">Include project stakeholders</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Document Prioritization Tab */}
              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Prioritization</CardTitle>
                    <CardDescription>
                      Documents prioritized by relevance and importance for optimal context injection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPriorities ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Calculating document priorities...</p>
                        </div>
                      </div>
                    ) : prioritizedDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No documents available for prioritization</p>
                        <p className="text-sm text-muted-foreground mt-1">Select a project to load documents</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {prioritizedDocuments.slice(0, 10).map((doc, index) => (
                          <div key={`doc-${index}-${doc.id || doc.name || 'unknown'}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${index < 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-base text-foreground mb-1">
                                  <Link 
                                    href={selectedProject ? `/projects/${selectedProject}/documents/${doc.id}/view` : `/documents/${doc.id}/view`}
                                    className="text-primary hover:text-primary/80 hover:underline transition-colors"
                                  >
                                    {doc.name || doc.title || `Document ${index + 1}`}
                                  </Link>
                                </h4>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    Priority Score: <span className="font-medium">{(doc.priorityScore * 100).toFixed(1)}%</span>
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Last updated: {formatLastModified(doc.lastModified)}
                                  </p>
                                  {doc.type && (
                                    <p className="text-sm text-muted-foreground">
                                      Type: <span className="font-medium">{doc.type}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium font-mono">{formatNumber(doc.estimatedTokens)}</div>
                              <div className="text-xs text-muted-foreground">estimated tokens</div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Summary */}
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-semibold">{prioritizedDocuments.length}</div>
                              <div className="text-xs text-muted-foreground">Total Documents</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                {formatNumber(prioritizedDocuments.reduce((sum, doc) => sum + (doc.estimatedTokens || 0), 0))}
                              </div>
                              <div className="text-xs text-muted-foreground">Total Tokens</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                {formatNumber(Math.round(prioritizedDocuments.reduce((sum, doc) => sum + (doc.estimatedTokens || 0), 0) / prioritizedDocuments.length))}
                              </div>
                              <div className="text-xs text-muted-foreground">Avg Tokens</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Context Optimization Tab */}
              <TabsContent value="optimization" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Context Window Analysis</CardTitle>
                      <CardDescription>
                        Real-time analysis of context window utilization
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Template Base</span>
                          <span className="text-sm font-medium">{formatNumber(templateBaseTokens)} tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Project Metadata</span>
                          <span className="text-sm font-medium">{formatNumber(projectMetadataTokens)} tokens</span>
                        </div>
                        {workflowConfig.includeStakeholders && selectedProject && projectStakeholders.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-sm">Stakeholders ({projectStakeholders.length})</span>
                            <span className="text-sm font-medium">{formatNumber(stakeholderTokens)} tokens</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm">Document Content</span>
                          <span className="text-sm font-medium">{formatNumber(documentContentTokens)} tokens</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Compression: {(workflowConfig.compressionLevel * 100).toFixed(0)}% ({workflowConfig.compressionMethod})</span>
                          <span>Raw: {formatNumber(Math.ceil(documentContentTokens / workflowConfig.compressionLevel))} tokens</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total Usage</span>
                            <span>{formatNumber(totalUsageTokens)} tokens</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Available</span>
                            <span>{formatNumber(availableTokens)} tokens</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(totalUsageTokens / contextWindow[0]) * 100}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Optimization Recommendations</CardTitle>
                      <CardDescription>
                        AI-powered suggestions for optimal context utilization
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900">High Priority Documents</h4>
                            <p className="text-sm text-blue-700">
                              Consider including more high-priority documents to maximize context value
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-green-900">Optimal Compression</h4>
                            <p className="text-sm text-green-700">
                              Current compression level is optimal for maintaining quality while maximizing content
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-900">Token Efficiency</h4>
                            <p className="text-sm text-yellow-700">
                              Consider removing low-priority documents to improve processing speed
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Content Structuring Tab */}
              <TabsContent value="content-structuring" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Content Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Brain className="h-5 w-5" />
                        <span>Content Analysis</span>
                      </CardTitle>
                      <CardDescription>
                        Analyze content structure and extract variables intelligently
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="content-input">Content to Analyze</Label>
                        <Textarea
                          id="content-input"
                          placeholder="Paste your content here to analyze structure and variables..."
                          className="min-h-[200px]"
                          value={generatedDocument}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGeneratedDocument(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => analyzeContentStructure(generatedDocument)}
                          disabled={isAnalyzingContent || !generatedDocument.trim()}
                          className="flex-1"
                        >
                          {isAnalyzingContent ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4 mr-2" />
                              Analyze Content
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => optimizeContentStructure(generatedDocument)}
                          disabled={isOptimizingContent || !generatedDocument.trim()}
                          variant="outline"
                        >
                          {isOptimizingContent ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                              Optimizing...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Optimize
                            </>
                          )}
                        </Button>
                      </div>

                      {contentAnalysis && (
                        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium">Content Analysis Results</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Word Count:</span>
                              <span className="ml-2 font-medium">{contentAnalysis.wordCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reading Time:</span>
                              <span className="ml-2 font-medium">{contentAnalysis.readingTime} min</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Complexity:</span>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                contentAnalysis.complexity === 'high' ? 'bg-destructive text-destructive-foreground' : 
                                contentAnalysis.complexity === 'medium' ? 'bg-primary text-primary-foreground' : 
                                'bg-secondary text-secondary-foreground'
                              }`}>
                                {contentAnalysis.complexity}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Structure:</span>
                              <span className="ml-2 font-medium capitalize">{contentAnalysis.structure}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Variable Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Crosshair className="h-5 w-5" />
                        <span>Variable Management</span>
                      </CardTitle>
                      <CardDescription>
                        Manage template variables and dynamic content replacement
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {templateVariables.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Found Variables ({templateVariables.length})</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowVariableEditor(!showVariableEditor)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Values
                            </Button>
                          </div>
                          
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {templateVariables.map((variable) => (
                              <div key={variable.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <code className="text-xs bg-white px-1 rounded">{variable.name}</code>
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background text-foreground">
                                      {variable.type}
                                    </span>
                                    {variable.required && (
                                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-destructive text-destructive-foreground">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {variable.description}
                                  </p>
                                </div>
                                {variable.value !== undefined && (
                                  <div className="text-xs text-green-600 font-medium">
                                    ✓ Set
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <Button 
                            onClick={applyVariableReplacements}
                            disabled={templateVariables.every(v => v.value === undefined)}
                            className="w-full"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Apply Variable Replacements
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Crosshair className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No variables found in content</p>
                          <p className="text-xs">Analyze content to extract variables</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Content Recommendations */}
                {contentRecommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Sparkles className="h-5 w-5" />
                        <span>Content Recommendations</span>
                      </CardTitle>
                      <CardDescription>
                        AI-powered suggestions to improve your content structure
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {contentRecommendations.map((recommendation, index) => (
                          <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
                            recommendation.priority === 'high' ? 'bg-red-50 border border-red-200' :
                            recommendation.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                            'bg-blue-50 border border-blue-200'
                          }`}>
                            <div className={`h-5 w-5 mt-0.5 ${
                              recommendation.priority === 'high' ? 'text-red-500' :
                              recommendation.priority === 'medium' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`}>
                              {recommendation.priority === 'high' ? <AlertCircle className="h-5 w-5" /> :
                               recommendation.priority === 'medium' ? <AlertCircle className="h-5 w-5" /> :
                               <CheckCircle className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium">{recommendation.title}</h4>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                  recommendation.priority === 'high' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                                }`}>
                                  {recommendation.priority}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {recommendation.description}
                              </p>
                              <div className="text-sm">
                                <p className="font-medium text-green-700">Suggestion:</p>
                                <p className="text-green-600">{recommendation.suggestion}</p>
                                <p className="font-medium text-blue-700 mt-1">Impact:</p>
                                <p className="text-blue-600">{recommendation.impact}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Available Variables */}
                {Object.keys(availableVariables).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>Available Variables</span>
                      </CardTitle>
                      <CardDescription>
                        Project and system variables available for use in templates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(availableVariables).map(([category, variables]: [string, any]) => (
                          <div key={category}>
                            <h4 className="font-medium mb-2 capitalize">{category} Variables</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Object.entries(variables).map(([key, variable]: [string, any]) => (
                                <div key={key} className="p-2 bg-gray-50 rounded text-sm">
                                  <div className="flex items-center justify-between">
                                    <code className="text-xs">{key}</code>
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background text-foreground">
                                      {variable.type}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {variable.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Document Viewer Dialog */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Generated Document</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Review the generated document from your workflow
            </p>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {generatedDocument || finalContext ? (
              <div className="h-[70vh] overflow-y-auto">
                <div className="prose prose-lg max-w-none p-4">
                  <ReactMarkdown
                    components={{
                                code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            showLineNumbers={true}
                            customStyle={{ margin: '1rem 0', borderRadius: '8px' }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      table({ children }: any) {
                        return (
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse border border-gray-300">
                              {children}
                            </table>
                          </div>
                        );
                      },
                      th({ children }: any) {
                        return (
                          <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold">
                            {children}
                          </th>
                        );
                      },
                      td({ children }: any) {
                        return (
                          <td className="border border-gray-300 px-4 py-2">
                            {children}
                          </td>
                        );
                      },
                    }}
                  >
                    {generatedDocument || finalContext}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[70vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading document...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (workflowResult?.savedDocument?.id && selectedProject) {
                    window.open(`/projects/${selectedProject}/documents/${workflowResult.savedDocument.id}/view`, '_blank')
                  } else if (workflowResult?.savedDocument?.id) {
                    window.open(`/documents/${workflowResult.savedDocument.id}/view`, '_blank')
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Full Viewer
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  const content = generatedDocument || finalContext
                  if (content) {
                    const blob = new Blob([content], { type: 'text/markdown' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `generated-document-${new Date().toISOString().split('T')[0]}.md`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast("Document Downloaded", {
                      description: "Document downloaded as Markdown"
                    })
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => setShowDocumentViewer(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
