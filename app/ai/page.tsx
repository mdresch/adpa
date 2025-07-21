"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Square,
  Download,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket, useJobUpdates } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

interface AIProvider {
  id: string
  name: string
  provider_type: string
  is_active: boolean
}

interface Template {
  id: string
  name: string
  description: string
  framework: string
  variables: any[]
}

export default function AIPage() {
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()
  const jobUpdates = useJobUpdates()
  
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [prompt, setPrompt] = useState("")
  const [temperature, setTemperature] = useState([0.7])
  const [maxTokens, setMaxTokens] = useState([1000])
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [providersData, templatesData] = await Promise.all([
          apiClient.getAIProviders(),
          apiClient.getTemplates({ is_public: true, limit: 50 })
        ])
        
        setProviders(providersData)
        setTemplates(templatesData.templates)
        
        // Set default provider
        const activeProvider = providersData.find(p => p.is_active)
        if (activeProvider) {
          setSelectedProvider(activeProvider.name)
        }
      } catch (error) {
        console.error("Failed to fetch AI data:", error)
        toast.error("Failed to load AI providers and templates")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Update job status from WebSocket
  useEffect(() => {
    if (currentJobId && jobUpdates[currentJobId]) {
      const jobUpdate = jobUpdates[currentJobId]
      
      if (jobUpdate.status === "completed") {
        setIsGenerating(false)
        setResult(jobUpdate.result)
        setCurrentJobId(null)
        toast.success("AI generation completed!")
      } else if (jobUpdate.status === "failed") {
        setIsGenerating(false)
        setCurrentJobId(null)
        toast.error("AI generation failed: " + jobUpdate.error)
      }
    }
  }, [currentJobId, jobUpdates])

  const handleGenerate = async () => {
    if (!selectedProvider) {
      toast.error("Please select an AI provider")
      return
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    try {
      setIsGenerating(true)
      setResult(null)

      const generateData = {
        prompt,
        provider: selectedProvider,
        temperature: temperature[0],
        max_tokens: maxTokens[0],
        template_id: selectedTemplate || undefined,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
      }

      const response = await apiClient.generateContent(generateData)

      if (response.jobId) {
        // Long-running job
        setCurrentJobId(response.jobId)
        toast.info("AI generation started", {
          description: "This may take a few moments..."
        })
      } else {
        // Immediate response
        setResult(response.result)
        setIsGenerating(false)
        toast.success("AI generation completed!")
      }
    } catch (error) {
      console.error("AI generation failed:", error)
      toast.error("AI generation failed: " + (error instanceof Error ? error.message : "Unknown error"))
      setIsGenerating(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
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
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground">You don't have permission to access AI generation features.</p>
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
                      Generate architecture documentation using AI-powered templates
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
                                        <Badge variant="secondary">{provider.provider_type}</Badge>
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
                                  <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No template</SelectItem>
                                  {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{template.framework}</Badge>
                                        {template.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Prompt */}
                            <div className="space-y-2">
                              <Label htmlFor="prompt">Prompt</Label>
                              <Textarea
                                id="prompt"
                                placeholder="Enter your prompt here..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={6}
                                className="resize-none"
                              />
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
                                      onChange={(e) => setVariables(prev => ({
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
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Generated
                              </Badge>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(result.content || result.text || JSON.stringify(result))}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
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
                                {provider.is_active ? "Active" : "Inactive"}
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
