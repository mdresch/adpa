import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ModelSelector } from "@/components/ai/ModelSelector"
import { FallbackChainVisualizer } from "@/components/ai/FallbackChainVisualizer"
import { toast } from "@/lib/notify"
import { Brain, Layers, Wallet, Sparkles, Loader2 } from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"

const taskTypes = [
  { key: "chat", label: "Chat", description: "Interactive assistance and general chat" },
  { key: "extraction", label: "Extraction", description: "Structured data extraction workflows" },
  { key: "completion", label: "Completion", description: "Long form text completion" },
  { key: "embedding", label: "Embedding", description: "Semantic search and indexing" },
  { key: "code", label: "Code", description: "Code analysis and generation" }
 ] as const

type TaskType = typeof taskTypes[number]["key"]

export default function AIModelSettingsPage() {
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [taskPreferences, setTaskPreferences] = useState<Record<TaskType, string>>({
    chat: "",
    extraction: "",
    completion: "",
    embedding: "",
    code: ""
  })
  const [costWeight, setCostWeight] = useState([35])
  const [qualityWeight, setQualityWeight] = useState([65])
  const [preferLocal, setPreferLocal] = useState(false)

  // Fetch all providers and their models
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const providersData = await apiClient.request<any[]>('/ai-providers')
        setProviders(providersData)
        
        // Initialize preferences from defaults if available
        const prefs: any = {}
        taskTypes.forEach(task => {
          // Find first active provider with a default model
          const activeWithDefault = providersData.find(p => (p.is_active || p.enabled) && p.default_model)
          if (activeWithDefault) {
            prefs[task.key] = activeWithDefault.default_model
          }
        })
        setTaskPreferences(prev => ({ ...prev, ...prefs }))
      } catch (error) {
        console.error('Failed to load AI settings data:', error)
        toast.error('Failed to load model settings')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Flatten all models from all active providers
  const allModels = useMemo(() => {
    const models: any[] = []
    providers.forEach(provider => {
      if (!(provider.is_active || provider.enabled)) return
      
      const providerModels = provider.configuration?.models || provider.models || []
      providerModels.forEach((m: any) => {
        const modelId = typeof m === 'string' ? m : (m.id || m.name)
        const modelName = typeof m === 'string' ? m : (m.name || m.id)
        
        // Avoid duplicates
        if (!models.find(existing => existing.id === modelId)) {
          models.push({
            id: modelId,
            name: modelId,
            display_name: modelName,
            provider: { name: provider.name },
            is_active: true,
            quality_score: m.quality_score || 4,
            context_length: m.context_window || 128000
          })
        }
      })
    })
    return models
  }, [providers])

  const mockChains = [
    {
      id: "chain-chat-balanced",
      name: "Chat Balanced",
      entries: [
        {
          id: "chain-chat-1",
          model: { name: "gpt-4o", display_name: "GPT-4o", provider: { name: "OpenAI" } },
          timeout_ms: 20000,
          retry_attempts: 2,
          success_rate: 0.98
        }
      ]
    }
  ]

  const handleSave = () => {
    toast.success("AI model preferences saved")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Brain className="h-7 w-7 text-blue-600" />
                  AI Model Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure default models, fallback chains, and cost preferences for each task.
                </p>
              </div>
              <Button onClick={handleSave}>
                <Sparkles className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </div>

            <Tabs defaultValue="tasks" className="space-y-4">
              <TabsList>
                <TabsTrigger value="tasks">Task Preferences</TabsTrigger>
                <TabsTrigger value="chains">Fallback Chains</TabsTrigger>
                <TabsTrigger value="cost">Cost Optimization</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-4">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Task Defaults
                    </CardTitle>
                    <CardDescription>
                      Pick a model or a smart fallback chain for each task type.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {taskTypes.map((task) => (
                      <div key={task.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-semibold">{task.label}</Label>
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          </div>
                          <Badge variant="secondary">Default</Badge>
                        </div>
                        <ModelSelector
                          taskType={task.key}
                          value={taskPreferences[task.key]}
                          onChange={(modelId) => {
                            setTaskPreferences((prev) => ({ ...prev, [task.key]: modelId }))
                          }}
                          models={allModels}
                          fallbackChains={mockChains}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chains" className="space-y-4">
                {/* Fallback chains implementation remains largely static for now */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Fallback Chains
                    </CardTitle>
                    <CardDescription>
                      Review chain order and retry policy for critical workflows.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {mockChains.map((chain) => (
                      <div key={chain.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{chain.name}</div>
                          <Badge variant="secondary">{chain.entries.length} steps</Badge>
                        </div>
                        <FallbackChainVisualizer chain={chain} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cost" className="space-y-4">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Cost Optimization
                    </CardTitle>
                    <CardDescription>
                      Balance quality, cost, and local model usage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Cost Sensitivity</Label>
                        <span className="text-sm text-muted-foreground">{costWeight[0]}%</span>
                      </div>
                      <Slider value={costWeight} onValueChange={setCostWeight} max={100} step={5} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Quality Priority</Label>
                        <span className="text-sm text-muted-foreground">{qualityWeight[0]}%</span>
                      </div>
                      <Slider value={qualityWeight} onValueChange={setQualityWeight} max={100} step={5} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                      <div>
                        <p className="text-sm font-medium">Prefer Local Models</p>
                        <p className="text-xs text-muted-foreground">
                          Route to Ollama first when quality meets the threshold.
                        </p>
                      </div>
                      <Switch checked={preferLocal} onCheckedChange={setPreferLocal} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
