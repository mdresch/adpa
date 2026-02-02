"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileText, 
  Download, 
  Settings, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Users,
  Target,
  BookOpen,
  RefreshCw
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface PlaybookTemplate {
  key: string
  name: string
  description: string
  config: {
    playbookType: 'program' | 'framework' | 'operational'
    targetAudience: 'executive' | 'technical' | 'operational'
    complexity: 'basic' | 'standard' | 'comprehensive'
    includeGkgContext: boolean
  }
}

interface GenerationRequest {
  projectId: string
  playbookType: 'program' | 'framework' | 'operational'
  targetAudience: 'executive' | 'technical' | 'operational'
  complexity: 'basic' | 'standard' | 'comprehensive'
  outputFormat: 'markdown' | 'pdf' | 'docx'
  customVariables: Record<string, string>
  includeGkgContext: boolean
}

interface GenerationStatus {
  generationId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  documentId?: string
  downloadUrl?: string
  error?: string
}

export function PlaybookGenerator() {
  const [templates, setTemplates] = useState<PlaybookTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PlaybookTemplate | null>(null)
  const [projects, setProjects] = useState<Array<{
    id: string
    name: string
    description?: string
    type: 'project' | 'program'
    status?: string
    owner_id: string
    owner_name?: string
    document_count?: number
    last_activity?: string
    program_id?: string
    program_name?: string
    child_projects?: Array<{
      id: string
      name: string
      description?: string
      status?: string
      document_count?: number
    }>
  }>>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null)
  const [activeTab, setActiveTab] = useState("quick-start")

  // Form state
  const [formData, setFormData] = useState<GenerationRequest>({
    projectId: "",
    playbookType: "program",
    targetAudience: "executive",
    complexity: "standard",
    outputFormat: "pdf",
    customVariables: {},
    includeGkgContext: true
  })

  useEffect(() => {
    loadTemplates()
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      console.log('🔍 [Frontend Debug] Starting to load projects...')
      
      const response = await apiClient.get<{ success: boolean; projects: any[]; summary: any; debug?: any }>("/playbook-projects")
      
      console.log('📄 [Frontend Debug] API Response:', response)
      
      if (response.success) {
        setProjects(response.projects)
        console.log(`   ✅ Retrieved ${response.projects.length} projects (${response.summary.standalone} standalone, ${response.summary.programs} programs)`)
        
        if (response.debug) {
          console.log('🐛 [Frontend Debug] Debug info:', response.debug)
        }
        
        // Log project details
        response.projects.forEach((project: any, index: number) => {
          console.log(`   📋 Project ${index + 1}:`, {
            id: project.id,
            name: project.name,
            type: project.type,
            childCount: project.child_projects?.length || 0
          })
        })
      } else {
        console.error('❌ [Frontend Debug] API returned failure:', response)
      }
    } catch (error: any) {
      console.error('❌ [Frontend Debug] Failed to load projects:', error)
      toast({
        title: "Error loading projects",
        description: error?.response?.data?.error || "Failed to load projects",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{ success: boolean; templates: PlaybookTemplate[] }>("/playbook-generation/templates")
      if (response.success) {
        setTemplates(response.templates)
      }
    } catch (error: any) {
      toast({
        title: "Error loading templates",
        description: error?.response?.data?.error || "Failed to load playbook templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: PlaybookTemplate) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      playbookType: template.config.playbookType,
      targetAudience: template.config.targetAudience,
      complexity: template.config.complexity,
      includeGkgContext: template.config.includeGkgContext
    }))
  }

  const handleQuickGenerate = async (templateKey: string) => {
    if (!formData.projectId) {
      toast({
        title: "Project required",
        description: "Please select a project before generating a playbook",
        variant: "destructive",
      })
      return
    }

    try {
      setGenerating(true)
      setGenerationStatus(null)

      const response = await apiClient.post("/playbook-generation/generate/standard", {
        templateKey,
        projectId: formData.projectId,
        outputFormat: formData.outputFormat
      })

      if (response.success) {
        setGenerationStatus({
          generationId: response.generationId || `gen-${Date.now()}`,
          status: 'completed',
          progress: 100,
          documentId: response.documentId,
          downloadUrl: response.downloadUrl
        })

        toast({
          title: "Playbook generated successfully!",
          description: "Your playbook has been generated and is ready for download.",
        })
      } else {
        throw new Error(response.error || "Generation failed")
      }

    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error?.response?.data?.error || "Failed to generate playbook",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCustomGenerate = async () => {
    if (!formData.projectId) {
      toast({
        title: "Project required",
        description: "Please select a project before generating a playbook",
        variant: "destructive",
      })
      return
    }

    try {
      setGenerating(true)
      setGenerationStatus(null)

      const response = await apiClient.post("/playbook-generation/generate", formData)

      if (response.success) {
        setGenerationStatus({
          generationId: response.generationId || `gen-${Date.now()}`,
          status: 'completed',
          progress: 100,
          documentId: response.documentId,
          downloadUrl: response.downloadUrl
        })

        toast({
          title: "Playbook generated successfully!",
          description: "Your custom playbook has been generated and is ready for download.",
        })
      } else {
        throw new Error(response.error || "Generation failed")
      }

    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error?.response?.data?.error || "Failed to generate playbook",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (generationStatus?.downloadUrl) {
      window.open(generationStatus.downloadUrl, '_blank')
    }
  }

  const getTemplateIcon = (playbookType: string) => {
    switch (playbookType) {
      case 'program': return <BookOpen className="h-4 w-4" />
      case 'framework': return <Settings className="h-4 w-4" />
      case 'operational': return <Target className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'executive': return 'bg-blue-100 text-blue-800'
      case 'technical': return 'bg-green-100 text-green-800'
      case 'operational': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'basic': return 'bg-green-100 text-green-800'
      case 'standard': return 'bg-yellow-100 text-yellow-800'
      case 'comprehensive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Playbook Generator</h2>
        </div>
        <div className="grid gap-6">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Playbook Generator</h2>
          <p className="text-muted-foreground">
            Generate standardized ADPA playbooks from project data using AI-powered templates
          </p>
        </div>
        <Button onClick={loadTemplates} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Templates
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="quick-start">Quick Start</TabsTrigger>
          <TabsTrigger value="custom">Custom Generation</TabsTrigger>
          <TabsTrigger value="templates">Template Library</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-start" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Select a project and choose from predefined templates for rapid playbook generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="project-select">Select Project</Label>
                <Select value={formData.projectId} onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project or program..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{project.name}</span>
                          {project.type === 'program' && (
                            <span className="text-xs text-muted-foreground">
                              Program ({project.child_projects?.length || 0} projects)
                            </span>
                          )}
                          {project.type === 'project' && project.program_id && (
                            <span className="text-xs text-muted-foreground">
                              Part of {project.program_name || 'Unknown Program'}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Output Format</Label>
                <Select value={formData.outputFormat} onValueChange={(value: any) => setFormData(prev => ({ ...prev, outputFormat: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <Card 
                    key={template.key} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.key === template.key ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTemplateIcon(template.config.playbookType)}
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuickGenerate(template.key)
                          }}
                          disabled={!formData.projectId || generating}
                        >
                          {generating ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getAudienceColor(template.config.targetAudience)}>
                          {template.config.targetAudience}
                        </Badge>
                        <Badge className={getComplexityColor(template.config.complexity)}>
                          {template.config.complexity}
                        </Badge>
                        {template.config.includeGkgContext && (
                          <Badge variant="outline">GKG Context</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Generation</CardTitle>
              <CardDescription>
                Configure custom playbook generation with detailed options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="project-select-custom">Project</Label>
                  <Select value={formData.projectId} onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="playbook-type">Playbook Type</Label>
                  <Select value={formData.playbookType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, playbookType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="program">Program Playbook</SelectItem>
                      <SelectItem value="framework">Framework Playbook</SelectItem>
                      <SelectItem value="operational">Operational Playbook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <Select value={formData.targetAudience} onValueChange={(value: any) => setFormData(prev => ({ ...prev, targetAudience: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="complexity">Complexity</Label>
                  <Select value={formData.complexity} onValueChange={(value: any) => setFormData(prev => ({ ...prev, complexity: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="output-format">Output Format</Label>
                <Select value={formData.outputFormat} onValueChange={(value: any) => setFormData(prev => ({ ...prev, outputFormat: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="gkg-context"
                  checked={formData.includeGkgContext}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeGkgContext: checked }))}
                />
                <Label htmlFor="gkg-context">Include GKG Context (semantic data from project)</Label>
              </div>

              <div>
                <Label htmlFor="custom-variables">Custom Variables (JSON)</Label>
                <Textarea
                  id="custom-variables"
                  placeholder='{"targetObjective": "Standardize workflows", "expectedBenefits": "Operational efficiency"}'
                  value={JSON.stringify(formData.customVariables, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      setFormData(prev => ({ ...prev, customVariables: parsed }))
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="h-24"
                />
              </div>

              <Button 
                onClick={handleCustomGenerate} 
                disabled={!formData.projectId || generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generating Playbook...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Custom Playbook
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTemplateIcon(template.config.playbookType)}
                      <div>
                        <CardTitle>{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getAudienceColor(template.config.targetAudience)}>
                        {template.config.targetAudience}
                      </Badge>
                      <Badge className={getComplexityColor(template.config.complexity)}>
                        {template.config.complexity}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>Type: {template.config.playbookType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Audience: {template.config.targetAudience}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>Complexity: {template.config.complexity}</span>
                    </div>
                    {template.config.includeGkgContext && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        <span>GKG Context Enabled</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {generationStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {generationStatus.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : generationStatus.status === 'failed' ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Clock className="h-5 w-5 text-blue-600" />
              )}
              Generation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generationStatus.status === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your playbook has been generated successfully! You can download it using the button below.
                </AlertDescription>
              </Alert>
            )}

            {generationStatus.status === 'failed' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {generationStatus.error || "An error occurred during playbook generation."}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Status: {generationStatus.status}</p>
                <p className="text-xs text-muted-foreground">Generation ID: {generationStatus.generationId}</p>
              </div>
              
              {generationStatus.status === 'completed' && generationStatus.downloadUrl && (
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Playbook
                </Button>
              )}
            </div>

            {generationStatus.status === 'in_progress' && (
              <Progress value={generationStatus.progress} className="w-full" />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
