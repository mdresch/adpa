"use client"

/**
 * Regenerate Version Modal
 * Dialog for configuring document regeneration with AI
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sparkles, FileText, Users, Target } from '@/components/ui/icons-shim'
import { apiClient } from '@/lib/api'

interface RegenerateVersionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  currentTemplate?: string
  currentVersion?: string
  projectId?: string
  onRegenerate: (params: {
    templateId?: string
    provider: string
    model?: string
    versionType: 'patch' | 'minor' | 'major'
    temperature: number
  }) => void
}

interface Template {
  id: string
  name: string
  description?: string
}

interface AIProvider {
  id: string
  name: string
  provider_type: string
  models?: string[]
}

interface ProjectStats {
  documents: number
  stakeholders: number
  baselines: number
}

export function RegenerateVersionModal({
  open,
  onOpenChange,
  documentId,
  currentTemplate,
  currentVersion = '1.0',
  projectId,
  onRegenerate
}: RegenerateVersionModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats>({ documents: 0, stakeholders: 0, baselines: 0 })
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>(currentTemplate || '')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [versionType, setVersionType] = useState<'patch' | 'minor' | 'major'>('patch')
  const [temperature, setTemperature] = useState<number>(0.7)
  
  const [loading, setLoading] = useState(false)

  // Fetch templates and providers
  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, projectId])

  const fetchData = async () => {
    try {
      // Fetch templates
      const templatesResponse = await apiClient.request<Template[]>('/templates')
      if (Array.isArray(templatesResponse)) {
        setTemplates(templatesResponse)
      }

      // Fetch AI providers
      const providersResponse = await apiClient.request<AIProvider[]>('/ai-providers')
      if (Array.isArray(providersResponse)) {
        const activeProviders = providersResponse.filter((p: any) => p.is_active)
        setProviders(activeProviders)
        
        // Set default provider
        if (activeProviders.length > 0 && !selectedProvider) {
          setSelectedProvider(activeProviders[0].provider_type)
        }
      }

      // Fetch project stats if projectId is available
      if (projectId) {
        try {
          const statsResponse = await apiClient.request<any>(`/projects/${projectId}/stats`)
          if (statsResponse) {
            setProjectStats({
              documents: statsResponse.document_count || 0,
              stakeholders: statsResponse.stakeholder_count || 0,
              baselines: statsResponse.baseline_count || 0
            })
          }
        } catch (err) {
          console.error('Failed to fetch project stats:', err)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  // Get available models for selected provider
  const getModelsForProvider = () => {
    const provider = providers.find(p => p.provider_type === selectedProvider)
    if (!provider) return []
    
    // Default models by provider type
    const defaultModels: Record<string, string[]> = {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      google: ['gemini-pro', 'gemini-1.5-pro'],
      anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      mistral: ['mistral-small', 'mistral-medium', 'mistral-large']
    }
    
    return provider.models || defaultModels[selectedProvider] || []
  }

  const handleGenerate = () => {
    onRegenerate({
      templateId: selectedTemplate && selectedTemplate !== 'none' ? selectedTemplate : undefined,
      provider: selectedProvider,
      model: selectedModel && selectedModel !== 'default' ? selectedModel : undefined,
      versionType,
      temperature
    })
    
    // Reset and close
    onOpenChange(false)
  }

  const calculateNextVersion = () => {
    const parts = currentVersion.split('.')
    const major = parseInt(parts[0] || '1')
    const minor = parseInt(parts[1] || '0')
    const patch = parseInt(parts[2] || '0')
    
    if (versionType === 'major') {
      return `${major + 1}.0.0`
    } else if (versionType === 'minor') {
      return `${major}.${minor + 1}.0`
    } else {
      return `${major}.${minor}.${patch + 1}`
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Create New Version with AI</span>
          </DialogTitle>
          <DialogDescription>
            Regenerate this document with updated project context using AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Context Preview */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{projectStats.documents}</p>
                    <p className="text-xs text-muted-foreground">Documents</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{projectStats.stakeholders}</p>
                    <p className="text-xs text-muted-foreground">Stakeholders</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{projectStats.baselines}</p>
                    <p className="text-xs text-muted-foreground">Baselines</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                This context will be included in the AI generation
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Document Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select template (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template (freeform)</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {currentTemplate ? `Current: ${templates.find(t => t.id === currentTemplate)?.name || 'Unknown'}` : 'No template currently applied'}
            </p>
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider *</Label>
            <Select value={selectedProvider} onValueChange={(val) => {
              setSelectedProvider(val)
              setSelectedModel('') // Reset model when provider changes
            }}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.provider_type}>
                    <div className="flex items-center space-x-2">
                      <span>{provider.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {provider.provider_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          {selectedProvider && getModelsForProvider().length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="model">Model (optional)</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default model</SelectItem>
                  {getModelsForProvider().map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Version Type */}
          <div className="space-y-3">
            <Label>Version Type *</Label>
            <RadioGroup value={versionType} onValueChange={(val) => setVersionType(val as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="patch" id="patch" />
                <Label htmlFor="patch" className="font-normal cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Patch ({currentVersion} → {currentVersion.split('.').slice(0, 2).join('.')}.{parseInt(currentVersion.split('.')[2] || '0') + 1})</span>
                    <Badge variant="secondary" className="text-xs">Minor changes</Badge>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minor" id="minor" />
                <Label htmlFor="minor" className="font-normal cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Minor ({currentVersion} → {currentVersion.split('.')[0]}.{parseInt(currentVersion.split('.')[1] || '0') + 1}.0)</span>
                    <Badge variant="secondary" className="text-xs">New features</Badge>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Next version will be: <strong>{calculateNextVersion()}</strong>
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-sm font-medium text-muted-foreground">{temperature.toFixed(1)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[temperature]}
              onValueChange={(vals) => setTemperature(vals[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More focused</span>
              <span>More creative</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={!selectedProvider || loading}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate New Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

