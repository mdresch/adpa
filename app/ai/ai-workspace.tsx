"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Brain,
  Sparkles,
  Settings,
  Play,
  Download,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
  Plus,
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket, useJobUpdates } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import * as ritualApi from "@/lib/ritual-api"
import { isRitualOrchestratorUnavailableError } from "@/lib/ritual-api"
import { toast } from '@/lib/notify'

async function buildEnhancedPromptWithProjectContext(
  projectId: string,
  userPrompt: string,
): Promise<string> {
  const [project, contextResult, docsResult] = await Promise.all([
    apiClient.getProject(projectId),
    apiClient
      .getProjectContextItems(projectId, { is_active: true })
      .catch(() => ({ success: false, items: [] as { title?: string; type: string; content?: string }[] })),
    apiClient
      .getProjectDocuments(projectId, { limit: 15 })
      .catch(() => ({ documents: [] as { title?: string }[], pagination: null })),
  ])

  const contextLines = (contextResult.items ?? [])
    .slice(0, 8)
    .map((item) => {
      const excerpt = (item.content || "").replace(/\s+/g, " ").slice(0, 200)
      return `- ${item.title || item.type}: ${excerpt || "(no content)"}`
    })

  const docTitles = (docsResult.documents ?? []).map((d) => d.title).filter(Boolean).join(", ")

  return `PROJECT CONTEXT:
Project: ${project.name}
Description: ${project.description || "No description"}
Context items:
${contextLines.length ? contextLines.join("\n") : "None"}
Documents: ${docTitles || "None"}

USER REQUEST:
${userPrompt}

Please create a document that considers the project context above and ensures consistency with existing project documentation.`
}

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

interface AIProvider {
  id: string
  name: string
  provider_type: string
  is_active: boolean
}

interface Variable {
  name: string
  description?: string
  required?: boolean
  type?: string
}

interface Template {
  id: string
  name: string
  description?: string
  framework: string
  category?: string
  variables: Variable[]
  development_status?: 'draft' | 'testing' | 'compliance' | 'validated' | 'production' | 'deprecated' | 'archived'
  validation_count?: number
  success_count?: number
  success_rate?: number
  health_rating?: string
  last_validated_at?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status?: string
  document_count?: number
}

// AI Provider type for selection
type AIProviderType = "" | "google" | "openai" | "azure" | "mistral" | "groq" | "anthropic" | "deepseek" | "moonshot" | "xai" | "copilot" | "ollama"

const DATA_FETCH_TIMEOUT_MS = 20_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    }),
  ])
}

export default function AIWorkspace() {
  const router = useRouter()
  const { hasPermission, loading: authLoading, isAuthenticated } = useAuth()
  const { isConnected } = useWebSocket()
  const jobUpdates = useJobUpdates()

  const [providers, setProviders] = useState<AIProvider[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>("ollama")
  const [selectedModel, setSelectedModel] = useState<string>("llama3")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [prompt, setPrompt] = useState("")
  const [temperature, setTemperature] = useState([0.7])
  const [maxTokens, setMaxTokens] = useState([8000])
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Project selection state
  const [saveMode, setSaveMode] = useState<'new-project' | 'existing-project'>('new-project')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")


  const fetchWorkspaceData = async () => {
    setLoading(true)
    setLoadError(null)

    const [providersResult, templatesResult, projectsResult] = await Promise.allSettled([
      withTimeout(apiClient.getAIProviders(), DATA_FETCH_TIMEOUT_MS, "AI providers"),
      withTimeout(
        apiClient.getTemplates({ is_public: true, limit: 50 }),
        DATA_FETCH_TIMEOUT_MS,
        "Templates"
      ),
      withTimeout(apiClient.getProjects({ limit: 100 }), DATA_FETCH_TIMEOUT_MS, "Projects"),
    ])

      if (providersResult.status === "fulfilled") {
        const providersData = providersResult.value
        setProviders(providersData)

        const ollamaProvider = providersData.find((p) => p.provider_type === "ollama" && p.is_active)
        const activeProvider = ollamaProvider || providersData.find((p) => p.is_active)
        if (activeProvider) {
          setSelectedProvider(activeProvider.name as AIProviderType)
        }
      } else {
        console.error("Failed to fetch AI providers:", providersResult.reason)
      }

      if (templatesResult.status === "fulfilled") {
        setTemplates(templatesResult.value.templates)
      } else {
        console.error("Failed to fetch templates:", templatesResult.reason)
      }

      if (projectsResult.status === "fulfilled") {
        setProjects(projectsResult.value.projects || [])
      } else {
        console.error("Failed to fetch projects:", projectsResult.reason)
      }

      const failures = [providersResult, templatesResult, projectsResult].filter(
        (r) => r.status === "rejected"
      ).length
    if (failures === 3) {
      const message =
        "Could not load AI workspace data. Ensure the backend is running (port 5000) and you are signed in."
      setLoadError(message)
      toast.error(message)
    } else if (failures > 0) {
      toast.error("Some AI workspace data could not be loaded.")
    }

    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    void fetchWorkspaceData()
  }, [authLoading, isAuthenticated])

  // Update job status from WebSocket
  useEffect(() => {
    if (currentJobId && jobUpdates[currentJobId]) {
      const jobUpdate = jobUpdates[currentJobId]

      if (jobUpdate.status === "completed") {
        setIsGenerating(false)
        setResult(jobUpdate.result)
        setCurrentJobId(null)

        // Check if document was saved to project
        const documentId = jobUpdate.result?.documentId
        const projectId = jobUpdate.result?.projectId ||
          (saveMode === 'existing-project' ? selectedProjectId : null)

        if (documentId && projectId) {
          const projectName = projects.find(p => p.id === projectId)?.name || 'Project'
          toast.success("Document generated and saved!", {
            description: `Your document has been saved to ${projectName}. Click to view.`,
            duration: 8000,
            action: {
              label: "View Document",
              onClick: () => {
                router.push(`/projects/${projectId}?tab=documents&highlight=${documentId}`)
              }
            }
          })
        } else {
          toast.success("Document generation completed!", {
            description: "Your generated content is ready.",
            duration: 5000
          })
        }
      } else if (jobUpdate.status === "failed") {
        setIsGenerating(false)
        setCurrentJobId(null)
        toast.error("Document generation failed", {
          description: jobUpdate.error || "An error occurred during generation",
          duration: 8000
        })
      }
    }
  }, [currentJobId, jobUpdates, projects, saveMode, selectedProjectId, router])

  const handleGenerate = async () => {
    if (!selectedProvider) {
      toast.error("Please select an AI provider")
      return
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    if (saveMode === 'existing-project' && !selectedProjectId) {
      toast.error("Please select a project to save the document to")
      return
    }

    try {
      setIsGenerating(true)
      setResult(null)

      // Fetch project context if saving to existing project
      let enhancedPrompt = prompt
      if (saveMode === 'existing-project' && selectedProjectId) {
        try {
          enhancedPrompt = await buildEnhancedPromptWithProjectContext(selectedProjectId, prompt)
        } catch (error) {
          console.error("Failed to fetch project context:", error)
          toast.warning("Continuing without project context")
        }
      }

      const selectedTemplateInfo = templates.find(t => t.id === selectedTemplate)
      const generateData = {
        prompt: enhancedPrompt,
        provider: selectedProvider,
        temperature: temperature[0],
        max_tokens: maxTokens[0],
        template_id: selectedTemplate || undefined,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        projectId: saveMode === 'existing-project' && selectedProjectId ? selectedProjectId : undefined,
        projectName: saveMode === 'existing-project' && selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name : undefined,
      }

      // Special handling for RPAS-CM Rituals (Phase 0)
      const templateNameLower = selectedTemplateInfo?.name.toLowerCase() || "";
      const isRitual = templateNameLower.includes("ideation") || templateNameLower.includes("business case");

      if (isRitual) {
        toast.info("Executing RPAS-CM Ritual via Orchestrator...")

        try {
          if (templateNameLower.includes("ideation")) {
            const ritualResult = await ritualApi.ingestIdeation({
              filename: "Direct Input",
              content: prompt,
            })
            setResult({ content: ritualResult.proposed_solution, ...ritualResult })
            toast.success("Ideation Ritual Complete: Captured in Governance Ledger.")
          } else {
            const ritualResult = await ritualApi.generateBusinessCase(prompt)
            setResult({ content: ritualResult.executive_summary, ...ritualResult })
            toast.success("Business Case Ritual Complete: Captured in Governance Ledger.")
          }
          setIsGenerating(false)
          return
        } catch (ritualError: unknown) {
          const ritualMessage =
            ritualError instanceof Error ? ritualError.message : String(ritualError)
          if (isRitualOrchestratorUnavailableError(ritualMessage)) {
            console.warn(
              "Orchestrator not available; falling back to standard AI generation:",
              ritualMessage,
            )
            toast.warning(
              "Governance orchestrator is not running. Generating via standard AI instead.",
            )
          } else {
            console.error("Ritual Execution Failed:", ritualError)
            toast.error(`Governance Ritual Failed: ${ritualMessage}`)
            setIsGenerating(false)
            return
          }
        }
      }

      const projectIdForJob =
        saveMode === "existing-project" && selectedProjectId ? selectedProjectId : undefined

      if (projectIdForJob) {
        try {
          const queueResult = await apiClient.enqueueAiGenerateJob({
            projectId: projectIdForJob,
            prompt: enhancedPrompt,
            provider: selectedProvider,
            templateId: selectedTemplate || undefined,
            maxTokens: maxTokens[0],
            temperature: temperature[0],
            variables: generateData.variables,
            useContext: true,
          })

          if (queueResult?.jobId) {
            setCurrentJobId(queueResult.jobId)
            setIsGenerating(false)

            const projectName =
              projects.find((p) => p.id === projectIdForJob)?.name ?? "project"

            toast.success("Document generation started", {
              description: `Generating in background. You will be notified when complete. Document will be saved to ${projectName}.`,
              duration: 5000,
            })

            setPrompt("")
            setResult(null)
            return
          }
        } catch (queueErr: unknown) {
          const queueMessage =
            queueErr instanceof Error ? queueErr.message : String(queueErr)
          console.warn(
            "Job queue unavailable; falling back to inline AI generation:",
            queueMessage,
          )
          toast.info("Running generation in this session", {
            description:
              "The background job queue was not available. This may take longer.",
          })
        }
      }

      const response = await apiClient.generateContent(generateData)

      const inlineContent =
        response?.result?.content ??
        response?.result?.text ??
        response?.content ??
        response?.text

      if (response?.jobId) {
        setCurrentJobId(response.jobId)
        setIsGenerating(false)
        toast.success("Document generation started", {
          description: "Generating in background.",
          duration: 5000,
        })
        setPrompt("")
        setResult(null)
      } else if (inlineContent) {
        setResult(response.result ?? response)
        setIsGenerating(false)
        toast.success("AI generation completed!")
      } else {
        throw new Error("AI returned no content")
      }
    } catch (error) {
      console.error("AI generation failed:", error)
      toast.error("AI generation failed: " + (error instanceof Error ? error.message : "Unknown error"))
      setIsGenerating(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    // Handle "no template" selection
    if (templateId === "__none__") {
      setSelectedTemplate("")
      setVariables({})
      return
    }

    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)

    if (template) {
      // Initialize variables for template
      const newVariables: Record<string, string> = {}
      template.variables.forEach(variable => {
        newVariables[variable.name] = ""
      })
      setVariables(newVariables)
    } else {
      setVariables({})
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)
  const activeProviders = providers.filter(p => p.is_active)

  if (authLoading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Checking your session…</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!isAuthenticated) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Sign in required</h2>
                  <p className="text-muted-foreground mb-4">
                    AI template generation needs an active session. Use demo login or Firebase auth, then return here.
                  </p>
                  <Button onClick={() => router.push("/login")}>Go to login</Button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading AI interface...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!hasPermission("ai.generate")) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Access denied</h2>
                  <p className="text-muted-foreground mb-4">
                    Your account does not have the <code className="text-sm">ai.generate</code> permission.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/openui-chat">Open OpenUI Chat instead</Link>
                  </Button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (loadError) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center max-w-lg">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">AI workspace unavailable</h2>
                  <p className="text-muted-foreground mb-4">{loadError}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => void fetchWorkspaceData()}>Retry</Button>
                    <Button variant="outline" asChild>
                      <Link href="/openui-chat">OpenUI Chat</Link>
                    </Button>
                  </div>
                </div>
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
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <Brain className="h-8 w-8 text-purple-500" />
                      AI Content Generation
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Generate architecture documentation using AI-powered templates. For project chat with
                      structured UI, use{" "}
                      <Link href="/openui-chat" className="font-medium text-emerald-700 underline-offset-2 hover:underline">
                        OpenUI Chat
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-muted-foreground">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Configuration Panel */}
                  <div className="lg:col-span-2 space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Generation Settings
                        </CardTitle>
                        <CardDescription>
                          Configure your AI generation parameters
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Tabs defaultValue="basic" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="basic">Basic</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced</TabsTrigger>
                          </TabsList>

                          <TabsContent value="basic" className="space-y-4">
                            {/* Provider Selection */}
                            <div className="space-y-2">
                              <Label htmlFor="provider">AI Provider</Label>
                              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an AI provider" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeProviders.map(provider => (
                                    <SelectItem key={provider.id} value={provider.name}>
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        {provider.name}
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{provider.provider_type}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Template Selection */}
                            <div className="space-y-2">
                              <Label htmlFor="template">Template (Optional)</Label>
                              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a template or leave empty" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">No template</SelectItem>
                                  {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                      <div className="flex items-center gap-2 w-full">
                                        {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] && (
                                          <span className="text-xs">
                                            {statusConfig[template.development_status as keyof typeof statusConfig].emoji}
                                          </span>
                                        )}
                                        <span className="text-xs px-2 py-0.5 rounded border border-border">{template.framework}</span>
                                        <span className="flex-1">{template.name}</span>
                                        {template.development_status === 'production' && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-green-500 text-white">✓</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Template Status Information */}
                            {selectedTemplateData && (
                              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Template Status:</span>
                                    {selectedTemplateData.development_status && statusConfig[selectedTemplateData.development_status as keyof typeof statusConfig] && (
                                      <Badge variant={statusConfig[selectedTemplateData.development_status as keyof typeof statusConfig].variant}>
                                        <>{statusConfig[selectedTemplateData.development_status as keyof typeof statusConfig].emoji} {statusConfig[selectedTemplateData.development_status as keyof typeof statusConfig].label}</>
                                      </Badge>
                                    )}
                                  </div>
                                  {selectedTemplateData.health_rating && healthConfig[selectedTemplateData.health_rating as keyof typeof healthConfig] && (
                                    <Badge variant="outline" className={`text-xs ${healthConfig[selectedTemplateData.health_rating as keyof typeof healthConfig].color}`}>
                                      <>{healthConfig[selectedTemplateData.health_rating as keyof typeof healthConfig].icon} {selectedTemplateData.health_rating}</>
                                    </Badge>
                                  )}
                                </div>

                                {selectedTemplateData.validation_count !== undefined && selectedTemplateData.validation_count > 0 && (
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground text-xs">Success Rate</span>
                                      <span className="font-semibold">
                                        {selectedTemplateData.success_rate !== undefined
                                          ? `${Number(selectedTemplateData.success_rate).toFixed(1)}%`
                                          : selectedTemplateData.success_count && selectedTemplateData.validation_count
                                            ? `${Math.round((selectedTemplateData.success_count / selectedTemplateData.validation_count) * 100)}%`
                                            : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground text-xs">Test Runs</span>
                                      <span className="font-semibold">{selectedTemplateData.validation_count}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Warning for non-production templates */}
                                {selectedTemplateData.development_status && selectedTemplateData.development_status !== 'production' && (
                                  <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                        {selectedTemplateData.development_status === 'draft' && 'Draft Template - Untested'}
                                        {selectedTemplateData.development_status === 'testing' && 'Testing Template - Limited validation'}
                                        {selectedTemplateData.development_status === 'validated' && 'Validated Template - Not yet production-ready'}
                                        {selectedTemplateData.development_status === 'deprecated' && 'Deprecated Template - Not recommended'}
                                      </p>
                                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                        This template is still being tested. Results may vary in quality.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Success indicator for production templates */}
                                {selectedTemplateData.development_status === 'production' && (
                                  <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                        Production Template - Fully Validated
                                      </p>
                                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                        This template has been thoroughly tested and is ready for production use.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Prompt */}
                            <div className="space-y-2">
                              <Label htmlFor="prompt">Prompt</Label>
                              <Textarea
                                id="prompt"
                                placeholder="Enter your prompt here..."
                                value={prompt}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                                rows={6}
                                className="resize-none"
                              />
                            </div>

                            {/* Project Selection */}
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                <Label className="text-base font-semibold">Save Generated Document To:</Label>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="new-project"
                                    name="save-mode"
                                    checked={saveMode === 'new-project'}
                                    onChange={() => {
                                      setSaveMode('new-project')
                                      setSelectedProjectId("")
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor="new-project" className="font-normal cursor-pointer">
                                    Create New Project
                                  </Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="existing-project"
                                    name="save-mode"
                                    checked={saveMode === 'existing-project'}
                                    onChange={() => setSaveMode('existing-project')}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor="existing-project" className="font-normal cursor-pointer">
                                    Save to Existing Project
                                  </Label>
                                </div>

                                {/* Project Dropdown (shown when existing-project is selected) */}
                                {saveMode === 'existing-project' && (
                                  <div className="ml-6 space-y-2">
                                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a project..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {projects.length === 0 ? (
                                          <div className="p-4 text-sm text-muted-foreground text-center">
                                            No projects available. Create a new project first.
                                          </div>
                                        ) : (
                                          projects.map(project => (
                                            <SelectItem key={project.id} value={project.id}>
                                              <div className="flex flex-col">
                                                <span>{project.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                  {project.document_count || 0} documents
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>

                                    {selectedProjectId && (
                                      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <p className="text-sm text-blue-900 dark:text-blue-100">
                                          <strong>Document will be saved to:</strong>{' '}
                                          {projects.find(p => p.id === selectedProjectId)?.name}
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                          AI will include project context for better results
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="advanced" className="space-y-4">
                            {/* Temperature */}
                            <div className="space-y-2">
                              <Label>Temperature: {temperature[0]}</Label>
                              <Slider
                                value={temperature}
                                onValueChange={setTemperature}
                                max={2}
                                min={0}
                                step={0.1}
                                className="w-full"
                              />
                              <p className="text-sm text-muted-foreground">
                                Controls randomness. Lower values are more focused and deterministic.
                              </p>
                            </div>

                            {/* Max Tokens */}
                            <div className="space-y-2">
                              <Label>Max Tokens: {maxTokens[0]}</Label>
                              <Slider
                                value={maxTokens}
                                onValueChange={setMaxTokens}
                                max={4000}
                                min={100}
                                step={100}
                                className="w-full"
                              />
                              <p className="text-sm text-muted-foreground">
                                Maximum number of tokens to generate.
                              </p>
                            </div>

                            {/* Template Variables */}
                            {selectedTemplateData && selectedTemplateData.variables.length > 0 && (
                              <div className="space-y-4">
                                <Label>Template Variables</Label>
                                {selectedTemplateData.variables.map(variable => (
                                  <div key={variable.name} className="space-y-2">
                                    <Label htmlFor={variable.name}>
                                      {variable.name}
                                      {variable.required && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Input
                                      id={variable.name}
                                      placeholder={variable.description}
                                      value={variables[variable.name] || ""}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariables(prev => ({
                                        ...prev,
                                        [variable.name]: e.target.value
                                      }))}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>

                        {/* Generate Button */}
                        <Button
                          onClick={handleGenerate}
                          disabled={isGenerating || !selectedProvider || !prompt.trim()}
                          className="w-full"
                          size="lg"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Generate Content
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </AnimatedCard>
                  </div>

                  {/* Results Panel */}
                  <div className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Generation Result
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isGenerating && (
                          <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
                            <p className="text-muted-foreground">Generating content...</p>
                            {currentJobId && jobUpdates[currentJobId] && (
                              <div className="mt-4">
                                <Progress value={jobUpdates[currentJobId].progress || 0} className="w-full" />
                                <p className="text-sm text-muted-foreground mt-2">
                                  Progress: {jobUpdates[currentJobId].progress || 0}%
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {result && !isGenerating && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-green-600">
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Generated
                                </>
                              </Badge>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(result.content || result.text || JSON.stringify(result))}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const content = result.content || result.text || JSON.stringify(result)
                                    const blob = new Blob([content], { type: 'text/markdown' })
                                    const url = window.URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `${selectedTemplateData?.name || 'Generated Content'} - ${new Date().toISOString().split('T')[0]}.md`
                                    a.click()
                                    window.URL.revokeObjectURL(url)
                                    toast.success('Document downloaded!')
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Create Project Prompt for Business Case/Ideation templates */}
                            {selectedTemplateData && (
                              selectedTemplateData.name.toLowerCase().includes('business case') ||
                              selectedTemplateData.name.toLowerCase().includes('ideation') ||
                              selectedTemplateData.category?.toLowerCase().includes('business case')
                            ) && (
                                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-blue-500 rounded-full p-2 mt-1">
                                      <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                        Ready to turn this into a project?
                                      </h4>
                                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                        Start a formal project with this {selectedTemplateData.name.includes('Ideation') ? 'ideation' : 'business case'} as the foundation.
                                      </p>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            if (saveMode === 'existing-project' && selectedProjectId) {
                                              // Save to existing project
                                              try {
                                                const selectedProject = projects.find(p => p.id === selectedProjectId)
                                                const templateName = selectedTemplateData?.name || 'AI Generated Document'
                                                const documentTitle = `${templateName} - ${new Date().toLocaleDateString()}`

                                                await apiClient.request(`/projects/${selectedProjectId}/documents`, {
                                                  method: 'POST',
                                                  body: JSON.stringify({
                                                    title: documentTitle,
                                                    content: result.content || result.text,
                                                    template_id: selectedTemplate || null,
                                                    generation_metadata: {
                                                      prompt: prompt,
                                                      provider: selectedProvider,
                                                      template: selectedTemplate,
                                                      ...(result.metadata || {})
                                                    }
                                                  })
                                                })

                                                toast.success(`Document saved to project: ${selectedProject?.name}`)
                                                window.location.href = `/projects/${selectedProjectId}?tab=documents`
                                              } catch (error: any) {
                                                console.error("Failed to save document:", error)
                                                toast.error(error?.message || 'Failed to save document to project')
                                              }
                                            } else {
                                              // Store the generated content in sessionStorage for the project creation page
                                              sessionStorage.setItem('project-draft', JSON.stringify({
                                                content: result.content || result.text,
                                                templateId: selectedTemplate,
                                                templateName: selectedTemplateData.name,
                                                framework: selectedTemplateData.framework,
                                                prompt: prompt,
                                                metadata: result.metadata || {}
                                              }))
                                              // Set flag to auto-open create dialog
                                              sessionStorage.setItem('auto-create-project', 'true')
                                              // Redirect to projects page (which has the create dialog)
                                              window.location.href = '/projects'
                                            }
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          {saveMode === 'existing-project' && selectedProjectId ? 'Save to Project' : 'Create Project'}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            // Store for process flow instead
                                            sessionStorage.setItem('process-flow-draft', JSON.stringify({
                                              content: result.content || result.text,
                                              templateId: selectedTemplate,
                                              templateName: selectedTemplateData.name,
                                              framework: selectedTemplateData.framework,
                                              prompt: prompt
                                            }))
                                            window.location.href = '/process-flow'
                                          }}
                                        >
                                          Use in Pipeline
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                            <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-sm">
                                {result.content || result.text || JSON.stringify(result, null, 2)}
                              </pre>
                            </div>

                            {result.usage && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Tokens used: {result.usage.total_tokens}</p>
                                <p>Model: {result.model}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {!result && !isGenerating && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Generated content will appear here</p>
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>

                    {/* Provider Status */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Provider Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {providers.map(provider => (
                            <div key={provider.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${provider.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="text-sm font-medium">{provider.name}</span>
                              </div>
                              <Badge variant={provider.is_active ? "default" : "secondary"}>
                                <>{provider.is_active ? "Active" : "Inactive"}</>
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </div>
                </div>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
