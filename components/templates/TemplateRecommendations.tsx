'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Loader2, Sparkles, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle, Info, Zap, Code, FileText, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateSuggestion {
  id: string
  template_id: string
  common_issues: any[]
  suggested_improvements: any[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending_review' | 'approved' | 'implemented' | 'rejected'
  avg_quality_score: number
  expected_quality_gain: number
  document_count: number
  created_at: string
  updated_at: string
  analysis_metadata?: {
    optimization_type?: 'ai_generated'
    trigger?: 'quality_regression'
    score_before?: number
    score_after?: number
    regression_amount?: number
  }
}

export function TemplateRecommendations({ templateId }: { templateId: string }) {
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false)
  const [selectedOptimization, setSelectedOptimization] = useState<any | null>(null)
  const [applyingOptimization, setApplyingOptimization] = useState(false)

  useEffect(() => {
    fetchSuggestions()
  }, [templateId])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(
        `${API_BASE_URL}/quality-audits/template-improvements?templateId=${templateId}&status=all`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch template recommendations')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const viewOptimization = async (suggestion: TemplateSuggestion) => {
    setSelectedOptimization(suggestion)
    setShowOptimizationDialog(true)
  }

  const applyOptimization = async (suggestionId: string) => {
    try {
      setApplyingOptimization(true)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(
        `${API_BASE_URL}/quality-audits/template-optimization/${suggestionId}/apply`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to apply optimization')
      }

      toast.success('Template optimization applied! Template version incremented.')
      setShowOptimizationDialog(false)
      fetchSuggestions() // Reload to show updated status

      // Reload page to show new template version
      setTimeout(() => window.location.reload(), 1500)

    } catch (err: any) {
      console.error('Failed to apply optimization:', err)
      toast.error(err.message || 'Failed to apply template optimization')
    } finally {
      setApplyingOptimization(false)
    }
  }

  const isAIOptimization = (suggestion: TemplateSuggestion) => {
    // Check if this is an AI-generated optimization
    const firstImprovement = suggestion.suggested_improvements?.[0]
    return firstImprovement?.metadata?.optimization_type === 'ai_generated' ||
           firstImprovement?.change_type === 'template_optimization'
  }

  const getOptimizationMetadata = (suggestion: TemplateSuggestion) => {
    return suggestion.suggested_improvements?.[0]?.metadata || {}
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-green-100 text-green-800 border-green-300'
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'pending_review': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'rejected': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented': return CheckCircle
      case 'approved': return TrendingUp
      case 'pending_review': return Clock
      case 'rejected': return XCircle
      default: return Info
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Template improvement recommendations are generated automatically when quality audits identify improvement opportunities.
        </p>
        <div className="mt-6 text-xs text-muted-foreground space-y-1">
          <p>💡 Recommendations are triggered when:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Document quality score &lt; 90%</li>
            <li>At least one quality dimension &lt; 80%</li>
            <li>Multiple documents show similar issues</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{suggestions.length}</p>
              <p className="text-sm text-muted-foreground">Total Suggestions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {suggestions.filter(s => s.status === 'pending_review').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {suggestions.filter(s => s.status === 'implemented').length}
              </p>
              <p className="text-sm text-muted-foreground">Implemented</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI-Generated Template Optimizations (Regression-triggered) */}
      {suggestions.filter(isAIOptimization).length > 0 && (
        <div className="space-y-4">
          <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-300 dark:border-purple-700">
            <Zap className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-900 dark:text-purple-100">🤖 AI-Generated Template Optimization Available!</AlertTitle>
            <AlertDescription className="text-purple-800 dark:text-purple-200">
              Quality regression detected! AI has analyzed your template changes and generated an optimized version.
            </AlertDescription>
          </Alert>

          {suggestions.filter(isAIOptimization).map((suggestion) => {
            const improvement = suggestion.suggested_improvements[0]
            const isOptimization = improvement?.system_prompt && improvement?.template_content
            const metadata = getOptimizationMetadata(suggestion)
            
            if (!isOptimization) return null

            return (
              <Card key={suggestion.id} className="border-2 border-purple-400 dark:border-purple-600 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        AI-Optimized Template Ready for Review
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Quality regression: {metadata.score_before || 89}% → {metadata.score_after || 80}% 
                        (📉 {metadata.regression_amount || 9}% drop)
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">+{suggestion.expected_quality_gain}%</div>
                      <p className="text-xs text-muted-foreground">Predicted Gain</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Quality Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Current (v2)</p>
                      <div className="text-2xl font-bold text-red-600">{metadata.score_after || suggestion.current_avg_quality || 80}%</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Predicted (v3)</p>
                      <div className="text-2xl font-bold text-green-600">{(metadata.score_after || suggestion.current_avg_quality || 80) + suggestion.expected_quality_gain}%</div>
                    </div>
                  </div>

                  {/* Changes Summary */}
                  {improvement.changes_summary && (
                    <div className="space-y-3">
                      <Separator />
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        AI-Generated Improvements
                      </h4>
                      
                      {improvement.changes_summary.key_improvements && (
                        <div className="space-y-2">
                          {improvement.changes_summary.key_improvements.map((imp: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{imp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <Separator />
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => viewOptimization(suggestion)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Full Diff
                    </Button>

                    {suggestion.status === 'pending_review' && (
                      <Button 
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        onClick={() => applyOptimization(suggestion.id)}
                        disabled={applyingOptimization}
                      >
                        {applyingOptimization ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            ✅ Apply to Template (Increment to v3)
                          </>
                        )}
                      </Button>
                    )}

                    {suggestion.status === 'implemented' && (
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Applied Successfully
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Regular Suggestions List */}
      <div className="space-y-4">
        {suggestions.filter(s => !isAIOptimization(s)).map((suggestion) => {
          const StatusIcon = getStatusIcon(suggestion.status)
          
          return (
            <Card key={suggestion.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(suggestion.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {suggestion.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Based on {suggestion.document_count} document{suggestion.document_count !== 1 ? 's' : ''} • 
                      Created {new Date(suggestion.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      +{suggestion.expected_quality_gain}%
                    </div>
                    <p className="text-xs text-muted-foreground">Expected Gain</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Current Quality */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Current Avg Quality</span>
                  <div className="flex items-center gap-2">
                    <Progress value={suggestion.avg_quality_score} className="w-24" />
                    <span className="text-sm font-bold">{suggestion.avg_quality_score}%</span>
                  </div>
                </div>

                {/* Common Issues */}
                {suggestion.common_issues && suggestion.common_issues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Common Issues Found
                    </h4>
                    <div className="space-y-2">
                      {suggestion.common_issues.slice(0, 5).map((issue: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded">
                          <Badge variant="outline" className="text-xs">
                            {issue.dimension || 'General'}
                          </Badge>
                          <p className="text-xs flex-1">{issue.description || issue}</p>
                          {issue.count && (
                            <Badge variant="secondary" className="text-xs">
                              {issue.count}x
                            </Badge>
                          )}
                        </div>
                      ))}
                      {suggestion.common_issues.length > 5 && (
                        <p className="text-xs text-muted-foreground italic">
                          ...and {suggestion.common_issues.length - 5} more issues
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Suggestions */}
                {suggestion.suggested_improvements && suggestion.suggested_improvements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      AI-Generated Improvements
                    </h4>
                    <div className="space-y-3">
                      {suggestion.suggested_improvements.map((improvement: any, idx: number) => (
                        <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                          <div className="flex items-start gap-2 mb-2">
                            <Badge variant="outline" className="text-xs bg-white">
                              {improvement.change_type || 'improvement'}
                            </Badge>
                            <p className="text-sm font-medium flex-1">
                              {improvement.issue_addressed || improvement.title || `Improvement #${idx + 1}`}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {improvement.proposed_change || improvement.description}
                          </p>
                          {improvement.section && (
                            <Badge variant="secondary" className="text-xs">
                              Section: {improvement.section}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Optimization Diff Dialog */}
      <Dialog open={showOptimizationDialog} onOpenChange={setShowOptimizationDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI-Generated Template Optimization
            </DialogTitle>
            <DialogDescription>
              Review the AI-suggested improvements to your template. Click "Apply to Template" to increment version and update.
            </DialogDescription>
          </DialogHeader>

          {selectedOptimization && selectedOptimization.suggested_improvements[0] && (
            <Tabs defaultValue="comparison" className="mt-4">
              <TabsList>
                <TabsTrigger value="comparison">Side-by-Side</TabsTrigger>
                <TabsTrigger value="explanation">Explanation</TabsTrigger>
                <TabsTrigger value="changes">Change Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison" className="space-y-4 mt-4">
                {/* System Prompt Comparison */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    System Prompt
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Badge variant="outline" className="mb-2">Current (v2)</Badge>
                      <pre className="text-xs bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800 overflow-x-auto max-h-64">
                        {selectedOptimization.suggested_improvements[0].system_prompt || 'No system prompt'}
                      </pre>
                    </div>
                    <div>
                      <Badge className="mb-2 bg-green-600">Suggested (v3)</Badge>
                      <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded border border-green-200 dark:border-green-800 overflow-x-auto max-h-64">
                        {selectedOptimization.suggested_improvements[0].system_prompt || 'No changes'}
                      </pre>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Template Content Comparison */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Template Content
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Badge variant="outline" className="mb-2">Current (v2)</Badge>
                      <pre className="text-xs bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800 overflow-x-auto max-h-96">
                        {selectedOptimization.suggested_improvements[0].template_content?.substring(0, 2000) || 'No content'}
                        {selectedOptimization.suggested_improvements[0].template_content?.length > 2000 && '\n\n... (truncated)'}
                      </pre>
                    </div>
                    <div>
                      <Badge className="mb-2 bg-green-600">Suggested (v3)</Badge>
                      <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded border border-green-200 dark:border-green-800 overflow-x-auto max-h-96">
                        {selectedOptimization.suggested_improvements[0].template_content?.substring(0, 2000) || 'No changes'}
                        {selectedOptimization.suggested_improvements[0].template_content?.length > 2000 && '\n\n... (truncated)'}
                      </pre>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="explanation" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedOptimization.suggested_improvements[0]?.proposed_change || 
                       selectedOptimization.suggested_improvements[0]?.change_explanation ||
                       'No explanation provided'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="changes" className="mt-4">
                {selectedOptimization.suggested_improvements[0]?.changes_summary && (
                  <div className="space-y-4">
                    {selectedOptimization.suggested_improvements[0].changes_summary.system_prompt_changes && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">System Prompt Changes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {selectedOptimization.suggested_improvements[0].changes_summary.system_prompt_changes.map((change: string, idx: number) => (
                              <li key={idx}>{change}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {selectedOptimization.suggested_improvements[0].changes_summary.content_changes && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Template Content Changes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {selectedOptimization.suggested_improvements[0].changes_summary.content_changes.map((change: string, idx: number) => (
                              <li key={idx}>{change}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {selectedOptimization.suggested_improvements[0].changes_summary.key_improvements && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Expected Quality Improvements</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                            {selectedOptimization.suggested_improvements[0].changes_summary.key_improvements.map((imp: string, idx: number) => (
                              <li key={idx}>{imp}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowOptimizationDialog(false)}>
              Cancel
            </Button>
            {selectedOptimization?.status === 'pending_review' && (
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={() => {
                  applyOptimization(selectedOptimization.id)
                  setShowOptimizationDialog(false)
                }}
                disabled={applyingOptimization}
              >
                {applyingOptimization ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    ✅ Apply to Template
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

