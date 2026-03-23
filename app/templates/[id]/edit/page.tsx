"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown } from "lucide-react"
import {
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  Brain,
  Code,
  Settings,
  Eye,
  AlertCircle,
  Info,
  Sparkles,
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'

/** GKG context strategy: which semantic search to run for LLM context. See docs/07-architecture/GKG_CONTEXT_STRATEGY.md */
interface GkgContextStrategy {
  profile?: 'governance_full' | 'charter_light' | 'requirements_only' | 'risks_only' | 'stakeholders_only' | 'custom'
  entityTypes?: string[]
  scope?: 'same_project' | 'same_project_top_docs' | 'dependent_projects' | 'all_accessible'
  maxDocuments?: number
  maxUnits?: number
  traceableOnly?: boolean
  documentStatusFilter?: 'approved_published_only' | 'include_draft_review'
}

interface Template {
  id: string
  name: string
  description?: string
  framework: string
  category?: string
  development_status?: string
  content: any
  variables: any[]
  system_prompt?: string | null
  quality_threshold?: number
  prompt_version?: number
  is_public: boolean
  gkg_context_strategy?: GkgContextStrategy | null
  created_by?: string
  created_at?: string
  updated_at?: string
}

interface Variable {
  name: string
  description: string
  type: string
  default_value?: string
  required: boolean
}

const frameworks = [
  "PMBOK 7",
  "PMBOK",
  "BABOK v3",
  "BABOK",
  "DMBOK 2.0",
  "DMBOK",
  "TOGAF",
  "SABSA",
  "COBIT",
  "ITIL",
  "Custom"
]

const categories = [
  "Business Architecture",
  "Planning",
  "Management Plans",
  "Requirements",
  "Analysis",
  "Documentation",
  "Governance",
  "Strategy",
  "Design",
  "Implementation",
  "Custom"
]

/** Entity types available in the GKG for custom profile. Align with server GKG mapping. */
const GKG_ENTITY_TYPES = [
  "Requirement",
  "Risk",
  "Stakeholder",
  "Milestone",
  "Constraint",
  "Deliverable",
  "Phase",
  "ActionItem",
  "GovernanceDecision",
  "Issue",
  "Opportunity",
  "WorkItem",
  "WBSNode",
  "ScopeBaseline",
  "ScheduleBaseline",
  "BudgetBaseline",
  "BestPractice",
  "SuccessCriteria",
  "DTAsset",
] as const

export default function TemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const templateId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  
  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [framework, setFramework] = useState("PMBOK 7")
  const [category, setCategory] = useState("Planning")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [qualityThreshold, setQualityThreshold] = useState(70)
  const [promptVersion, setPromptVersion] = useState(1)
  const [isPublic, setIsPublic] = useState(false)
  const [variables, setVariables] = useState<Variable[]>([])
  const [templateContent, setTemplateContent] = useState("")
  // GKG context strategy (template-driven semantic search for LLM context)
  const [gkgEnabled, setGkgEnabled] = useState(false)
  const [gkgProfile, setGkgProfile] = useState<GkgContextStrategy['profile']>('charter_light')
  const [gkgScope, setGkgScope] = useState<GkgContextStrategy['scope']>('same_project_top_docs')
  const [gkgMaxDocuments, setGkgMaxDocuments] = useState(5)
  const [gkgMaxUnits, setGkgMaxUnits] = useState(500)
  const [gkgTraceableOnly, setGkgTraceableOnly] = useState(true)
  const [gkgDocumentStatusFilter, setGkgDocumentStatusFilter] = useState<GkgContextStrategy['documentStatusFilter']>('approved_published_only')
  const [gkgEntityTypes, setGkgEntityTypes] = useState<string[]>([])

  useEffect(() => {
    fetchTemplate()
  }, [templateId])

  const fetchTemplate = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getTemplate(templateId)
      setTemplate(data)
      
      // Populate form fields
      setName(data.name || "")
      setDescription(data.description || "")
      setFramework(data.framework || "PMBOK 7")
      setCategory(data.category || "Planning")
      setSystemPrompt(data.system_prompt || "")
      setQualityThreshold(data.quality_threshold ? data.quality_threshold * 100 : 70)
      setPromptVersion(data.prompt_version || 1)
      setIsPublic(data.is_public || false)
      setVariables(data.variables || [])
      setTemplateContent(data.content ? JSON.stringify(data.content, null, 2) : "{}")
      const gkg = (data as any).gkg_context_strategy
      setGkgEnabled(!!gkg)
      if (gkg) {
        setGkgProfile(gkg.profile ?? 'charter_light')
        setGkgScope(gkg.scope ?? 'same_project_top_docs')
        setGkgMaxDocuments(gkg.maxDocuments ?? 5)
        setGkgMaxUnits(gkg.maxUnits ?? 500)
        setGkgTraceableOnly(gkg.traceableOnly !== false)
        setGkgDocumentStatusFilter(gkg.documentStatusFilter === 'include_draft_review' ? 'include_draft_review' : 'approved_published_only')
        setGkgEntityTypes(Array.isArray(gkg.entityTypes) ? gkg.entityTypes : [])
      }
    } catch (error) {
      console.error('Failed to fetch template:', error)
      toast.error('Failed to load template')
      router.push('/templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }

    if (!description.trim()) {
      toast.error('Template description is required')
      return
    }

    try {
      setSaving(true)
      
      // Parse template content
      let contentObj
      try {
        contentObj = templateContent.trim() ? JSON.parse(templateContent) : {}
      } catch (e) {
        toast.error('Invalid JSON in template content')
        return
      }

      const gkg_context_strategy = gkgEnabled
        ? {
            profile: gkgProfile,
            scope: gkgScope,
            maxDocuments: gkgMaxDocuments,
            maxUnits: gkgMaxUnits,
            traceableOnly: gkgTraceableOnly,
            documentStatusFilter: gkgDocumentStatusFilter,
            ...(gkgProfile === 'custom' && gkgEntityTypes.length > 0 ? { entityTypes: gkgEntityTypes } : {}),
          }
        : null

      const payload = {
        name,
        description,
        framework,
        category,
        system_prompt: systemPrompt || null,
        content: contentObj,
        variables,
        quality_threshold: qualityThreshold / 100, // Convert percentage to 0-1
        prompt_version: promptVersion,
        is_public: isPublic,
        gkg_context_strategy,
      }

      await apiClient.request(`/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })

      toast.success('Template updated successfully!')
      router.push(`/templates/${templateId}`)
      
    } catch (error: any) {
      console.error('Failed to update template:', error)
      toast.error(error.message || 'Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/templates/${templateId}`)
  }

  const addVariable = () => {
    setVariables([
      ...variables,
      {
        name: "",
        description: "",
        type: "text",
        required: false
      }
    ])
  }

  const updateVariable = (index: number, field: keyof Variable, value: any) => {
    const updated = [...variables]
    updated[index] = { ...updated[index], [field]: value }
    setVariables(updated)
  }

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }

  const incrementPromptVersion = () => {
    setPromptVersion(prev => prev + 1)
    toast.info(`Prompt version incremented to v${promptVersion + 1}`)
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-5xl mx-auto">
                <p className="text-center text-muted-foreground">Loading template...</p>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!template) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-5xl mx-auto">
                <p className="text-center text-muted-foreground">Template not found</p>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                      >
                        ← Back
                      </Button>
                    </div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <FileText className="h-8 w-8 text-purple-500" />
                      Edit Template
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Modify template configuration, prompts, and content
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <Badge variant="outline">{template.development_status}</Badge>
                      <Badge variant="secondary">Version {promptVersion}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Main Edit Form */}
                <Tabs defaultValue="basic" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="prompts">AI Prompts</TabsTrigger>
                    <TabsTrigger value="content">Template Content</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="gkg">GKG Context</TabsTrigger>
                  </TabsList>

                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Template Configuration
                        </CardTitle>
                        <CardDescription>
                          Basic template information and metadata
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        
                        {/* Template Name */}
                        <div className="space-y-2">
                          <Label htmlFor="name">Template Name *</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Project Charter - PMBOK 7"
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                            placeholder="Brief description of what this template generates..."
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Framework */}
                          <div className="space-y-2">
                            <Label htmlFor="framework">Framework *</Label>
                            <Select value={framework} onValueChange={setFramework}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {frameworks.map(fw => (
                                  <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Select "Custom" for non-standard frameworks
                            </p>
                          </div>

                          {/* Category */}
                          <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select value={category} onValueChange={setCategory}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator />

                        {/* Quality & Versioning */}
                        <div className="space-y-4">
                          <h3 className="font-semibold">Quality & Versioning</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Quality Threshold */}
                            <div className="space-y-2">
                              <Label htmlFor="quality">Quality Threshold</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="quality"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={qualityThreshold}
                                  onChange={(e) => setQualityThreshold(Number(e.target.value))}
                                  className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Minimum quality score for successful generation (default: 70%)
                              </p>
                            </div>

                            {/* Prompt Version */}
                            <div className="space-y-2">
                              <Label htmlFor="version">Prompt Version</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="version"
                                  type="number"
                                  min="1"
                                  value={promptVersion}
                                  onChange={(e) => setPromptVersion(Number(e.target.value))}
                                  className="w-24"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={incrementPromptVersion}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Increment
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Increment when making significant prompt changes
                              </p>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Visibility */}
                        <div className="space-y-4">
                          <h3 className="font-semibold">Visibility & Sharing</h3>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label htmlFor="public">Public Template</Label>
                              <p className="text-sm text-muted-foreground">
                                Make this template visible to all users
                              </p>
                              {template.development_status !== 'validated' && 
                               template.development_status !== 'production' && isPublic && (
                                <div className="flex items-center gap-2 text-orange-600 text-xs mt-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Recommended: Keep private until Validated stage
                                </div>
                              )}
                            </div>
                            <Switch
                              id="public"
                              checked={isPublic}
                              onCheckedChange={setIsPublic}
                            />
                          </div>
                        </div>

                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>

                  {/* AI Prompts Tab */}
                  <TabsContent value="prompts" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-blue-600" />
                          AI System Prompt
                        </CardTitle>
                        <CardDescription>
                          Define how the AI should generate content with this template
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
                              <p className="font-semibold mb-1">What is a System Prompt?</p>
                              <p className="text-blue-700 dark:text-blue-300">
                                The system prompt guides the AI on how to generate content. It defines the AI's role, 
                                expertise, and instructions for creating documents. This is the most important part 
                                of your template!
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="systemPrompt">System Prompt</Label>
                            <Badge variant="outline" className="text-xs">
                              {systemPrompt.length} characters
                            </Badge>
                          </div>
                          <Textarea
                            id="systemPrompt"
                            value={systemPrompt}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemPrompt(e.target.value)}
                            placeholder={`Example for PMBOK 7 Project Charter:

You are a PROJECT DOCUMENT ANALYST creating a project charter from REAL PROJECT DATA.

CRITICAL EXTRACTION RULES:
1. ✅ EXTRACT project information from the provided context
2. ❌ DO NOT generate a generic template
3. ✅ USE actual project details: real names, dates, objectives
4. ❌ DO NOT create placeholder content like '[Project Name]'

CHARTER STRUCTURE:
## Project Charter: [Extract actual project name]

### 1. Project Overview
**Project Name:** [Extract from context]
**Purpose:** [Extract business need from documentation]

### 2. Project Objectives
[Extract ACTUAL objectives from context]

... and so on`}
                            rows={20}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            💡 Tip: Be specific about what the AI should extract from context and what it should NOT do
                          </p>
                        </div>

                        {/* Prompt Best Practices */}
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                            Best Practices for System Prompts
                          </h4>
                          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
                            <li>Define the AI's role clearly (e.g., "You are a senior PM expert")</li>
                            <li>Specify what to EXTRACT from context vs. what to GENERATE</li>
                            <li>List required document sections explicitly</li>
                            <li>Include DO and DON'T instructions</li>
                            <li>Request specific output format (Markdown)</li>
                            <li>Set tone and style expectations</li>
                          </ul>
                        </div>

                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>

                  {/* Template Content Tab */}
                  <TabsContent value="content" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Code className="h-5 w-5 text-purple-600" />
                          Template Content Structure
                        </CardTitle>
                        <CardDescription>
                          Define the template structure (used by advanced document processors)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                            <div className="flex-1 text-sm text-purple-900 dark:text-purple-100">
                              <p className="font-semibold mb-1">About Template Content</p>
                              <p className="text-purple-700 dark:text-purple-300">
                                For most templates, the <strong>System Prompt</strong> is sufficient. 
                                Template content is used by advanced multi-stage document processors 
                                to define specific sections and structure. You can leave this as empty 
                                JSON <code>{"{}"}</code> if using only system prompts.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="content">Template Content (JSON)</Label>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTemplateContent(JSON.stringify(JSON.parse(templateContent), null, 2))}
                              >
                                Format JSON
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTemplateContent("{}")}
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            id="content"
                            value={templateContent}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTemplateContent(e.target.value)}
                            placeholder={`{
  "blocks": [],
  "sections": [
    {
      "name": "Executive Summary",
      "description": "High-level overview",
      "required": true
    }
  ]
}`}
                            rows={15}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            JSON structure for advanced document processing. Most templates use system prompts only.
                          </p>
                        </div>

                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>

                  {/* Variables Tab */}
                  <TabsContent value="variables" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-yellow-600" />
                              Template Variables
                            </CardTitle>
                            <CardDescription>
                              Define dynamic placeholders for template customization
                            </CardDescription>
                          </div>
                          <Button onClick={addVariable} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Variable
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        {variables.length === 0 ? (
                          <div className="text-center p-8 bg-muted rounded-lg">
                            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground mb-2">No variables defined</p>
                            <p className="text-sm text-muted-foreground">
                              Add variables to make your template dynamic and reusable
                            </p>
                            <Button onClick={addVariable} className="mt-4" variant="outline">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Your First Variable
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {variables.map((variable, index) => (
                              <div key={index} className="p-4 border rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">Variable #{index + 1}</Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeVariable(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Variable Name</Label>
                                    <Input
                                      value={variable.name}
                                      onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                      placeholder="e.g., projectName"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                      value={variable.type}
                                      onValueChange={(value: string) => updateVariable(index, 'type', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="boolean">Boolean</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    value={variable.description}
                                    onChange={(e) => updateVariable(index, 'description', e.target.value)}
                                    placeholder="What is this variable for?"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Default Value (Optional)</Label>
                                  <Input
                                    value={variable.default_value || ""}
                                    onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                                    placeholder="Default value if not provided"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={variable.required}
                                    onCheckedChange={(checked: boolean) => updateVariable(index, 'required', checked)}
                                  />
                                  <Label className="cursor-pointer">Required variable</Label>
                                </div>

                                <div className="bg-muted rounded p-2 text-xs font-mono">
                                  Usage in prompt: <code>{`{{${variable.name || 'variableName'}}}`}</code>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {variables.length > 0 && (
                          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                              How to Use Variables
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                              Reference variables in your system prompt using double curly braces:
                            </p>
                            <code className="block bg-yellow-100 dark:bg-yellow-900 rounded p-2 text-xs">
                              {`Create a project charter for {{projectName}} with a budget of {{budget}}`}
                            </code>
                          </div>
                        )}

                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>

                  {/* GKG Context Tab */}
                  <TabsContent value="gkg" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-indigo-600" />
                          GKG Context for Document Generation
                        </CardTitle>
                        <CardDescription>
                          Choose which semantic search to run against the Governance Knowledge Graph when generating documents from this template. This context is injected into the LLM for better, evidence-based output.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Enable GKG context</Label>
                            <p className="text-sm text-muted-foreground">
                              When enabled, document generation will fetch semantic units (requirements, risks, stakeholders, etc.) from the graph as LLM context.
                            </p>
                          </div>
                          <Switch checked={gkgEnabled} onCheckedChange={setGkgEnabled} />
                        </div>

                        {gkgEnabled && (
                          <>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Profile (entity set)</Label>
                                <p className="text-xs text-muted-foreground">
                                  Which types of entities to include in the context. The graph stores requirements, risks, stakeholders, milestones, constraints, deliverables, etc.; the profile selects which of these are sent to the LLM.
                                </p>
                                <Select value={gkgProfile} onValueChange={(v: string) => setGkgProfile(v as GkgContextStrategy['profile'])}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="governance_full">Governance full — Requirement, Risk, Stakeholder, Milestone, Constraint, Deliverable (PMBOK-style docs)</SelectItem>
                                    <SelectItem value="charter_light">Charter light — Requirement, Risk, Stakeholder (charters, light governance)</SelectItem>
                                    <SelectItem value="requirements_only">Requirements only — Requirement (requirements docs, SRS)</SelectItem>
                                    <SelectItem value="risks_only">Risks only — Risk (risk register, risk report)</SelectItem>
                                    <SelectItem value="stakeholders_only">Stakeholders only — Stakeholder (stakeholder register, communication plan)</SelectItem>
                                    <SelectItem value="custom">Custom — specify entity types below</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Scope</Label>
                                <p className="text-xs text-muted-foreground">
                                  Where to pull context from in the graph: one project, its best documents, dependent projects, or all projects you can access.
                                </p>
                                <Select value={gkgScope} onValueChange={(v: string) => setGkgScope(v as GkgContextStrategy['scope'])}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="same_project">Same project only — entities from the target project only</SelectItem>
                                    <SelectItem value="same_project_top_docs">Same project, top documents — same project; use documents with most units first (best sources first)</SelectItem>
                                    <SelectItem value="dependent_projects">Same project + dependent projects — target project and projects linked via project dependencies</SelectItem>
                                    <SelectItem value="all_accessible">All accessible projects — all projects you can access (e.g. company scope)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Max documents</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={gkgMaxDocuments}
                                  onChange={(e) => setGkgMaxDocuments(Number(e.target.value) || 5)}
                                />
                                <p className="text-xs text-muted-foreground">Max source documents to pull units from</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Max units</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={5000}
                                  value={gkgMaxUnits}
                                  onChange={(e) => setGkgMaxUnits(Number(e.target.value) || 500)}
                                />
                                <p className="text-xs text-muted-foreground">Max semantic units in context</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-base font-medium">Traceable only</Label>
                                <p className="text-sm text-muted-foreground">Include only units that are linked to a source document (default: on). Excludes units not tied to a document for clearer, evidence-based context.</p>
                              </div>
                              <Switch checked={gkgTraceableOnly} onCheckedChange={setGkgTraceableOnly} />
                            </div>
                            <div className="space-y-2">
                              <Label>Document status</Label>
                              <p className="text-xs text-muted-foreground">
                                Restrict context to documents with status Approved or Published only, or include Draft and In Review documents as well.
                              </p>
                              <Select value={gkgDocumentStatusFilter} onValueChange={(v: string) => setGkgDocumentStatusFilter(v as GkgContextStrategy['documentStatusFilter'])}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="approved_published_only">Approved / Published only — only use context from approved or published documents</SelectItem>
                                  <SelectItem value="include_draft_review">Include Draft and In Review — also use context from draft and in-review documents</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {gkgProfile === 'custom' && (
                              <div className="space-y-2">
                                <Label>Entity types</Label>
                                <p className="text-xs text-muted-foreground">
                                  Choose which entity types to include in the context. Only selected types will be fetched from the graph.
                                </p>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between font-normal"
                                    >
                                      {gkgEntityTypes.length > 0
                                        ? `${gkgEntityTypes.length} selected: ${gkgEntityTypes.slice(0, 3).join(", ")}${gkgEntityTypes.length > 3 ? "…" : ""}`
                                        : "Select entity types…"}
                                      <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <ScrollArea className="h-64 rounded-md border-0">
                                      <div className="p-2 space-y-1">
                                        {GKG_ENTITY_TYPES.map((type) => (
                                          <label
                                            key={type}
                                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                                          >
                                            <Checkbox
                                              checked={gkgEntityTypes.includes(type)}
                                              onCheckedChange={(checked) => {
                                                setGkgEntityTypes((prev) =>
                                                  checked
                                                    ? [...prev, type]
                                                    : prev.filter((t) => t !== type)
                                                )
                                              }}
                                            />
                                            {type}
                                          </label>
                                        ))}
                                      </div>
                                    </ScrollArea>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>
                </Tabs>

                {/* Preview Section */}
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Template Preview
                    </CardTitle>
                    <CardDescription>
                      How this template will appear to users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-8 w-8 text-purple-500" />
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{name || "Template Name"}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {description || "Template description"}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline">{framework}</Badge>
                            <Badge variant="outline">{category}</Badge>
                            {isPublic && <Badge variant="secondary">Public</Badge>}
                            <Badge variant="outline">v{promptVersion}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {systemPrompt && (
                      <div>
                        <p className="text-sm font-medium mb-2">System Prompt Preview:</p>
                        <div className="bg-background border rounded-lg p-3 max-h-48 overflow-y-auto">
                          <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                            {systemPrompt.substring(0, 500)}
                            {systemPrompt.length > 500 && '...'}
                          </p>
                        </div>
                      </div>
                    )}

                    {variables.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Variables: {variables.length}</p>
                        <div className="flex flex-wrap gap-2">
                          {variables.map((v, i) => (
                            <Badge key={i} variant="secondary">
                              {v.name || `var${i + 1}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>

                {/* Action Buttons (Bottom) */}
                <div className="flex items-center justify-between pb-6">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} size="lg">
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                      </>
                    )}
                  </Button>
                </div>

              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}

