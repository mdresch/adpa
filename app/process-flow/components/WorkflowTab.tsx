"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  Zap,
  Cpu,
  Settings,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  XCircle
} from "@/components/ui/icons-shim"
import type { Template, Project, AIProvider, ProcessingStep, ProcessingStatus, Stakeholder } from "../types"

interface WorkflowTabProps {
  // Templates
  selectedTemplate: string
  setSelectedTemplate: (id: string) => void
  availableTemplates: Template[]
  
  // Projects
  selectedProject: string
  setSelectedProject: (id: string) => void
  availableProjects: Project[]
  
  // AI Providers
  selectedAIProvider: string
  setSelectedAIProvider: (id: string) => void
  availableAIProviders: AIProvider[]
  
  // Models
  selectedModel: string
  setSelectedModel: (id: string) => void
  availableModels: any[]
  modelParameters: any
  
  // Processing
  processingSteps: ProcessingStep[]
  processingStatus: ProcessingStatus
  showContextPreview: boolean
  setShowContextPreview: (show: boolean) => void
  finalContext: string | null
  projectStakeholders: Stakeholder[]
  projectDocuments: any[]
  
  // Status configs
  statusConfig: any
  healthConfig: any
}

// Format numbers consistently
const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

export function WorkflowTab({
  selectedTemplate,
  setSelectedTemplate,
  availableTemplates,
  selectedProject,
  setSelectedProject,
  availableProjects,
  selectedAIProvider,
  setSelectedAIProvider,
  availableAIProviders,
  selectedModel,
  setSelectedModel,
  availableModels,
  modelParameters,
  processingSteps,
  processingStatus,
  showContextPreview,
  setShowContextPreview,
  finalContext,
  projectStakeholders,
  projectDocuments,
  statusConfig,
  healthConfig
}: WorkflowTabProps) {
  return (
    <div className="space-y-6">
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
                        {(template as any).development_status && statusConfig[(template as any).development_status as keyof typeof statusConfig] && (
                          <span className="text-xs">
                            {statusConfig[(template as any).development_status as keyof typeof statusConfig].emoji}
                          </span>
                        )}
                        <span>{template.name} ({(template as any).category || template.framework})</span>
                        {(template as any).development_status === 'production' && (
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
                        {(template as any).development_status && statusConfig[(template as any).development_status as keyof typeof statusConfig] && (
                          <Badge variant={statusConfig[(template as any).development_status as keyof typeof statusConfig].variant}>
                            {statusConfig[(template as any).development_status as keyof typeof statusConfig].emoji} {statusConfig[(template as any).development_status as keyof typeof statusConfig].label}
                          </Badge>
                        )}
                      </div>
                      {template.health_rating && healthConfig[template.health_rating as keyof typeof healthConfig] && (
                        <Badge variant="outline" className={`text-xs ${healthConfig[template.health_rating as keyof typeof healthConfig].color}`}>
                          {healthConfig[template.health_rating as keyof typeof healthConfig].icon} {template.health_rating}
                        </Badge>
                      )}
                    </div>
                    
                    {(template as any).validation_count !== undefined && (template as any).validation_count > 0 && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Success Rate</span>
                          <span className="font-semibold">
                            {(template as any).success_rate !== undefined 
                              ? `${Number((template as any).success_rate).toFixed(1)}%`
                              : (template as any).success_count && (template as any).validation_count
                                ? `${Math.round(((template as any).success_count / (template as any).validation_count) * 100)}%`
                                : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Test Runs</span>
                          <span className="font-semibold">{(template as any).validation_count}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Warnings for non-production templates */}
                    {(template as any).development_status && (template as any).development_status !== 'production' && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                            {(template as any).development_status === 'draft' && 'Draft Template - Not Ready for Batch Generation'}
                            {(template as any).development_status === 'testing' && 'Testing Template - Limited Validation'}
                            {(template as any).development_status === 'validated' && 'Validated Template - Use Caution in Batch Operations'}
                            {(template as any).development_status === 'deprecated' && 'Deprecated Template - Not Recommended'}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            This template is not production-ready. Batch processing may produce inconsistent results.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Success indicator for production templates */}
                    {(template as any).development_status === 'production' && (
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
                value={selectedModel || undefined} 
                onValueChange={(v) => setSelectedModel(v ?? '')}
                disabled={!selectedAIProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedAIProvider ? "Select a model" : "Select AI provider first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => {
                    const id = model?.id != null ? String(model.id) : ''
                    const name = model?.name ?? model?.id ?? 'Unknown'
                    const ctx = typeof model?.contextWindow === 'number' ? model.contextWindow : null
                    if (!id) return null
                    return (
                      <SelectItem key={id} value={id}>
                        {name} ({ctx != null ? formatNumber(ctx) : 'Unknown'} tokens)
                      </SelectItem>
                    )
                  })}
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
                      ) : step.status === 'failed' ? (
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
    </div>
  )
}

