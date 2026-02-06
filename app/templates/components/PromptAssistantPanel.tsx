"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Lightbulb, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Save,
  Library,
  Star,
  Users,
  TrendingUp
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'

interface PromptScore {
  overall: number
  clarity: number
  specificity: number
  context_awareness: number
  extraction_focus: number
  negative_rules: number
  details: {
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
  }
}

interface PromptSuggestion {
  system_prompt: string
  explanation: string
  context_requirements: string[]
  expected_output_format: string
  confidence: number
}

interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  methodology: string
  system_prompt: string
  context_requirements: string[]
  is_public: boolean
  created_by_name?: string
  usage_count: number
  avg_feedback?: number
}

interface PromptAssistantPanelProps {
  currentPrompt: string
  onPromptChange: (prompt: string) => void
  templateType: string
  methodology: string
  context: {
    projectType?: string
    industry?: string
    documentPurpose?: string
    targetAudience?: string
  }
}

export default function PromptAssistantPanel({
  currentPrompt,
  onPromptChange,
  templateType,
  methodology,
  context
}: PromptAssistantPanelProps) {
  const [score, setScore] = useState<PromptScore | null>(null)
  const [suggestion, setSuggestion] = useState<PromptSuggestion | null>(null)
  const [library, setLibrary] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("score")
  const [libraryFilters, setLibraryFilters] = useState({
    category: "",
    methodology: ""
  })

  // Score current prompt
  useEffect(() => {
    if (currentPrompt) {
      scorePrompt(currentPrompt)
    }
  }, [currentPrompt])

  // Load prompt library
  useEffect(() => {
    loadPromptLibrary()
  }, [libraryFilters])

  const scorePrompt = async (prompt: string) => {
    try {
      setLoading(true)
      const response = await apiClient.post('/prompt-assistant/score', { prompt })
      setScore(response.data)
    } catch (error) {
      toast.error('Failed to score prompt')
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestion = async () => {
    try {
      setLoading(true)
      const response = await apiClient.post('/prompt-assistant/suggest', {
        templateType,
        methodology,
        context
      })
      setSuggestion(response.data)
      setActiveTab("suggest")
    } catch (error) {
      toast.error('Failed to generate suggestion')
    } finally {
      setLoading(false)
    }
  }

  const optimizePrompt = async () => {
    if (!score) return
    
    try {
      setLoading(true)
      const issues = [
        ...score.details.weaknesses.map(w => ({ type: 'warning', message: w })),
        ...score.details.suggestions.map(s => ({ type: 'suggestion', message: s }))
      ]
      
      const response = await apiClient.post('/prompt-assistant/optimize', {
        currentPrompt,
        issues,
        context
      })
      
      setSuggestion(response.data)
      setActiveTab("suggest")
    } catch (error) {
      toast.error('Failed to optimize prompt')
    } finally {
      setLoading(false)
    }
  }

  const applySuggestion = () => {
    if (suggestion) {
      onPromptChange(suggestion.system_prompt)
      toast.success('Prompt suggestion applied')
    }
  }

  const loadPromptLibrary = async () => {
    try {
      const filters = {
        ...(libraryFilters.category && { category: libraryFilters.category }),
        ...(libraryFilters.methodology && { methodology: libraryFilters.methodology }),
        is_public: true
      }
      const response = await apiClient.get('/prompt-assistant/library', { params: filters })
      setLibrary(response.data)
    } catch (error) {
      console.error('Failed to load prompt library', error)
    }
  }

  const applyLibraryPrompt = (template: PromptTemplate) => {
    onPromptChange(template.system_prompt)
    toast.success(`Applied "${template.name}" template`)
  }

  const saveToLibrary = async () => {
    if (!currentPrompt || !score || score.overall < 70) {
      toast.error('Please improve the prompt quality before saving to library')
      return
    }

    try {
      await apiClient.post('/prompt-assistant/save', {
        name: `${templateType} Template - ${new Date().toLocaleDateString()}`,
        description: `AI-optimized ${templateType} prompt`,
        category: templateType,
        methodology: methodology || 'Custom',
        system_prompt: currentPrompt,
        context_requirements: suggestion?.context_requirements || [],
        is_public: false
      })
      toast.success('Template saved to your library')
    } catch (error) {
      toast.error('Failed to save template')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Prompt Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="score">Score</TabsTrigger>
            <TabsTrigger value="suggest">Suggest</TabsTrigger>
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-4">
            {score && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Overall Score</span>
                    <Badge variant={getScoreColor(score.overall)}>
                      {score.overall.toFixed(0)}/100
                    </Badge>
                  </div>
                  <Progress value={score.overall} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(score).map(([key, value]) => {
                    if (key === 'overall' || key === 'details') return null
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace('_', ' ')}</span>
                          <span>{value.toFixed(0)}</span>
                        </div>
                        <Progress value={value} className="h-1" />
                      </div>
                    )
                  })}
                </div>

                {score.details.strengths.length > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Strengths:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {score.details.strengths.map((strength, i) => (
                          <li key={i} className="text-sm">{strength}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {score.details.weaknesses.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Areas to Improve:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {score.details.weaknesses.map((weakness, i) => (
                          <li key={i} className="text-sm">{weakness}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={optimizePrompt} disabled={loading} className="flex-1">
                    <Zap className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Optimize with AI
                  </Button>
                  <Button onClick={saveToLibrary} variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="suggest" className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={generateSuggestion} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Generate Suggestion
              </Button>
              {suggestion && (
                <Button onClick={applySuggestion} variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Suggestion
                </Button>
              )}
            </div>

            {suggestion && (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Explanation:</strong> {suggestion.explanation}
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-medium mb-2">Suggested Prompt:</h4>
                  <Textarea
                    value={suggestion.system_prompt}
                    readOnly
                    className="font-mono text-sm"
                    rows={10}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Context Requirements:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {suggestion.context_requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Expected Output:</h4>
                    <p className="text-sm">{suggestion.expected_output_format}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Confidence:</span>
                  <Progress value={suggestion.confidence * 100} className="h-2 flex-1" />
                  <span className="text-sm">{(suggestion.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="optimize" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Click "Optimize with AI" to automatically improve your prompt based on identified weaknesses and best practices.
                </AlertDescription>
              </Alert>

              {score && (
                <Button onClick={optimizePrompt} disabled={loading} className="w-full">
                  <Zap className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Optimize Current Prompt
                </Button>
              )}

              {suggestion && activeTab === "optimize" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Optimized Prompt:</h4>
                    <Textarea
                      value={suggestion.system_prompt}
                      readOnly
                      className="font-mono text-sm"
                      rows={10}
                    />
                  </div>
                  <Button onClick={applySuggestion} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Optimized Prompt
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <select
                value={libraryFilters.category}
                onChange={(e) => setLibraryFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="">All Categories</option>
                <option value="stakeholder">Stakeholder</option>
                <option value="risk">Risk</option>
                <option value="requirements">Requirements</option>
                <option value="charter">Charter</option>
              </select>
              <select
                value={libraryFilters.methodology}
                onChange={(e) => setLibraryFilters(prev => ({ ...prev, methodology: e.target.value }))}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="">All Methodologies</option>
                <option value="PMBOK">PMBOK</option>
                <option value="PRINCE2">PRINCE2</option>
                <option value="Agile">Agile</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              {library.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyLibraryPrompt(template)}
                    >
                      Apply
                    </Button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary">{template.category}</Badge>
                    <Badge variant="outline">{template.methodology}</Badge>
                    {template.is_public && <Badge>Public</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {template.avg_feedback && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {template.avg_feedback.toFixed(1)}/5
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {template.usage_count} uses
                    </div>
                    {template.created_by_name && (
                      <div>by {template.created_by_name}</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
