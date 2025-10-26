"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Brain,
  Wand2,
  Crosshair,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Edit,
  Database
} from "@/components/ui/icons-shim"

interface ContentVariable {
  id: string
  name: string
  type: string
  description: string
  required: boolean
  value?: any
}

interface ContentRecommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  impact: string
}

interface ContentAnalysis {
  wordCount: number
  readingTime: number
  complexity: 'high' | 'medium' | 'low'
  structure: string
}

interface ContentStructuringTabProps {
  generatedDocument: string
  setGeneratedDocument: (content: string) => void
  isAnalyzingContent: boolean
  isOptimizingContent: boolean
  contentAnalysis: ContentAnalysis | null
  templateVariables: ContentVariable[]
  showVariableEditor: boolean
  setShowVariableEditor: (show: boolean) => void
  contentRecommendations: ContentRecommendation[]
  analyzeContentStructure: (content: string) => void
  optimizeContentStructure: (content: string) => void
  applyVariableReplacements: () => void
}

export function ContentStructuringTab({
  generatedDocument,
  setGeneratedDocument,
  isAnalyzingContent,
  isOptimizingContent,
  contentAnalysis,
  templateVariables,
  showVariableEditor,
  setShowVariableEditor,
  contentRecommendations,
  analyzeContentStructure,
  optimizeContentStructure,
  applyVariableReplacements
}: ContentStructuringTabProps) {
  return (
    <div className="space-y-6">
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
      {Object.keys((window as any).availableVariables || {}).length > 0 && (
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
              {Object.entries((window as any).availableVariables || {}).map(([category, variables]: [string, any]) => (
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
    </div>
  )
}

