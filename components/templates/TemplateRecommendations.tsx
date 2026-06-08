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
import { toast } from '@/lib/notify'
import { SideBySideDiff } from '@/components/drift/SideBySideDiff'
import { getApiBaseUrl } from '@/lib/api-url'

interface TemplateSuggestion {
  id: string
  template_id: string
  common_issues: any[]
  suggested_improvements: any[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending_review' | 'approved' | 'implemented' | 'rejected'
  avg_quality_score?: number
  current_avg_quality?: number
  expected_quality_gain: number
  document_count: number
  created_at: string
  updated_at: string
  implemented_at?: string
  implemented_by?: string
  analysis_metadata?: {
    optimization_type?: 'ai_generated'
    trigger?: 'quality_regression'
    score_before?: number
    score_after?: number
    regression_amount?: number
  }
}

function stringifyRecommendationText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const candidate =
      record.proposed_change ||
      record.description ||
      record.recommendation ||
      record.issue_addressed ||
      record.title

    if (candidate) {
      return stringifyRecommendationText(candidate)
    }

    return JSON.stringify(value)
  }

  return String(value)
}

function buildDiffAppendix(title: string, values: unknown[] = []): string {
  const lines = values
    .map(stringifyRecommendationText)
    .filter((line) => line.length > 0)

  if (lines.length === 0) return ''

  return [
    '',
    '',
    '---',
    '',
    title,
    ...lines.map((line) => `- ${line}`),
  ].join('\n')
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

      const API_BASE_URL = getApiBaseUrl()
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
    try {
      // Fetch detailed optimization data with current vs suggested content
      const API_BASE_URL = getApiBaseUrl()
      const response = await fetch(
        `${API_BASE_URL}/quality-audits/template-optimization/${suggestion.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          const opt = data.suggestion?.optimization
          console.log('[TemplateOptimization] Fetched optimization data:', {
            hasOptimization: !!opt,
            status: data.suggestion?.status,
            usingDiffFields: !!(opt?.suggested_system_prompt_for_diff || opt?.suggested_content_for_diff),
            isRegularSuggestion: opt?.is_regular_suggestion,
            currentSystemPromptLength: opt?.current_system_prompt?.length,
            currentSystemPromptPreview: opt?.current_system_prompt?.substring(0, 100),
            suggestedSystemPromptLength: (opt?.suggested_system_prompt_for_diff || opt?.suggested_system_prompt)?.length,
            suggestedSystemPromptPreview: (opt?.suggested_system_prompt_for_diff || opt?.suggested_system_prompt)?.substring(0, 100),
            currentContentLength: opt?.current_content?.length,
            suggestedContentLength: (opt?.suggested_content_for_diff || opt?.suggested_content)?.length,
            systemPromptsAreDifferent: opt?.current_system_prompt !== (opt?.suggested_system_prompt_for_diff || opt?.suggested_system_prompt),
            contentsAreDifferent: opt?.current_content !== (opt?.suggested_content_for_diff || opt?.suggested_content)
          })
        }
        
        // Merge the detailed optimization data with the suggestion
        const optimizationData = {
          ...suggestion,
          optimization: data.suggestion?.optimization
        }
        
        setSelectedOptimization(optimizationData)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch optimization details:', errorData)
        toast.error('Failed to load optimization details. Showing basic information.')
        // Fallback to basic suggestion data
        setSelectedOptimization(suggestion)
      }
    } catch (error) {
      console.error('Failed to fetch optimization details:', error)
      toast.error('Failed to load optimization details. Showing basic information.')
      // Fallback to basic suggestion data
      setSelectedOptimization(suggestion)
    }
    setShowOptimizationDialog(true)
  }

  const applyOptimization = async (suggestionId: string, isRegularSuggestion = false) => {
    try {
      setApplyingOptimization(true)

      const apiBase = new URL(getApiBaseUrl())
      if (apiBase.protocol !== 'http:' && apiBase.protocol !== 'https:') {
        throw new Error('Unsupported API base URL protocol')
      }
      // Use different endpoint for regular suggestions vs AI optimizations
      const endpoint = isRegularSuggestion
        ? new URL(`/quality-audits/template-improvements/${encodeURIComponent(suggestionId)}/implement`, apiBase)
        : new URL(`/quality-audits/template-optimization/${encodeURIComponent(suggestionId)}/apply`, apiBase)

      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to apply optimization')
      }

      toast.success(isRegularSuggestion 
        ? 'Template improvements implemented! New template version created.'
        : 'Template optimization applied! Template version incremented.')
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
                        <br />
                        <span className="text-xs text-muted-foreground mt-1 block">
                          Generated: {new Date(suggestion.created_at).toLocaleString()}
                        </span>
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
                          {improvement.changes_summary.key_improvements.map((imp: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{typeof imp === 'string' ? imp : JSON.stringify(imp)}</span>
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
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Applied Successfully
                        </Badge>
                        {suggestion.implemented_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(suggestion.implemented_at).toLocaleString()}
                          </span>
                        )}
                      </div>
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
                    <Progress value={suggestion.current_avg_quality || suggestion.avg_quality_score || 0} className="w-24" />
                    <span className="text-sm font-bold">{suggestion.current_avg_quality || suggestion.avg_quality_score || 0}%</span>
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
                            {typeof issue === 'string' ? 'General' : (issue.dimension || 'General')}
                          </Badge>
                          <p className="text-xs flex-1">{typeof issue === 'string' ? issue : (issue.description || JSON.stringify(issue))}</p>
                          {issue && typeof issue === 'object' && issue.count && (
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
                              {String(improvement.change_type || 'improvement')}
                            </Badge>
                            <p className="text-sm font-medium flex-1">
                              {String(improvement.issue_addressed || improvement.title || `Improvement #${idx + 1}`)}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {typeof improvement.proposed_change === 'string' 
                              ? improvement.proposed_change 
                              : typeof improvement.description === 'string'
                              ? improvement.description
                              : JSON.stringify(improvement.proposed_change || improvement.description || 'No description')}
                          </p>
                          {improvement.section && (
                            <Badge variant="secondary" className="text-xs">
                              Section: {String(improvement.section)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
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
                      onClick={() => applyOptimization(suggestion.id, true)}
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
                          ✅ Apply Improvements
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

      {/* Optimization Diff Dialog */}
      <Dialog open={showOptimizationDialog} onOpenChange={setShowOptimizationDialog}>
        <DialogContent className="w-[96vw] max-w-[1800px] max-h-[92vh] overflow-y-auto">
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
                {selectedOptimization.optimization ? (
                  <>
                    {selectedOptimization.optimization.is_regular_suggestion ? (
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Regular Improvement Suggestions</AlertTitle>
                        <AlertDescription>
                          This suggestion contains individual improvements rather than a full template replacement. 
                          View the "Change Summary" tab to see specific proposed changes. The diff view shows the current template.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        System Prompt
                      </h4>
                      {(() => {
                        // Use diff-specific fields if available (for implemented suggestions showing original vs current)
                        // Otherwise use the regular fields (for pending suggestions showing current vs suggested)
                        let currentPrompt = selectedOptimization.optimization.current_system_prompt || ''
                        let suggestedPrompt = selectedOptimization.optimization.suggested_system_prompt_for_diff 
                          || selectedOptimization.optimization.suggested_system_prompt
                          || ''
                        
                        // Ensure both are strings and trim
                        currentPrompt = String(currentPrompt || '').trim()
                        suggestedPrompt = String(suggestedPrompt || '').trim()
                        
                        // Default to "No system prompt" if empty
                        if (!currentPrompt) currentPrompt = 'No system prompt defined'
                        if (!suggestedPrompt) suggestedPrompt = currentPrompt

                        const regularSuggestionPromptAppendix = selectedOptimization.optimization?.is_regular_suggestion
                          ? buildDiffAppendix(
                              'Proposed system prompt changes',
                              selectedOptimization.optimization.changes_summary?.system_prompt_changes ||
                                selectedOptimization.suggested_improvements?.filter((improvement: any) =>
                                  String(improvement.section || '').toLowerCase().includes('system_prompt'),
                                ),
                            )
                          : ''

                        if (currentPrompt === suggestedPrompt && regularSuggestionPromptAppendix) {
                          suggestedPrompt = `${suggestedPrompt}${regularSuggestionPromptAppendix}`
                        }

                        const isIdentical = currentPrompt === suggestedPrompt
                        
                        if (process.env.NODE_ENV === 'development') {
                          console.log('[TemplateOptimization] System Prompt Comparison:', {
                            currentLength: currentPrompt.length,
                            suggestedLength: suggestedPrompt.length,
                            isIdentical,
                            currentPreview: currentPrompt.substring(0, 100),
                            suggestedPreview: suggestedPrompt.substring(0, 100)
                          })
                        }
                        
                        return (
                          <>
                            {isIdentical && !selectedOptimization.optimization?.is_regular_suggestion && (
                              <Alert className="mb-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  System prompts are identical. The optimization may have already been applied, or no system prompt changes were proposed.
                                </AlertDescription>
                              </Alert>
                            )}
                            {isIdentical && selectedOptimization.optimization?.is_regular_suggestion && (
                              <Alert className="mb-2">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  System prompt changes are shown as additions below. View the "Change Summary" tab for detailed proposed changes.
                                </AlertDescription>
                              </Alert>
                            )}
                            <div
                              data-testid="optimization-diff-system-prompt"
                              className="optimization-diff-shell border rounded-lg overflow-x-auto"
                            >
                              <SideBySideDiff
                                oldContent={currentPrompt}
                                newContent={suggestedPrompt}
                                filename="system_prompt.txt"
                              />
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    <Separator />

                    {/* Template Content Comparison */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Template Content
                      </h4>
                      {(() => {
                        // Use diff-specific fields if available (for implemented suggestions showing original vs current)
                        // Otherwise use the regular fields (for pending suggestions showing current vs suggested)
                        let currentContent = selectedOptimization.optimization.current_content || ''
                        let suggestedContent = selectedOptimization.optimization.suggested_content_for_diff
                          || selectedOptimization.optimization.suggested_content
                          || ''
                        
                        // If content is an object, try to extract the markdown/text
                        if (typeof currentContent === 'object' && currentContent !== null) {
                          currentContent = currentContent.content || currentContent.markdown || JSON.stringify(currentContent, null, 2)
                        }
                        if (typeof suggestedContent === 'object' && suggestedContent !== null) {
                          suggestedContent = suggestedContent.content || suggestedContent.markdown || JSON.stringify(suggestedContent, null, 2)
                        }
                        
                        // Ensure both are strings and trim
                        currentContent = String(currentContent || '').trim()
                        suggestedContent = String(suggestedContent || '').trim()
                        
                        // Default to \"No content\" if empty
                        if (!currentContent) currentContent = 'No template content defined'
                        if (!suggestedContent) suggestedContent = currentContent

                        const regularSuggestionContentAppendix = selectedOptimization.optimization?.is_regular_suggestion
                          ? buildDiffAppendix(
                              'Proposed template content changes',
                              selectedOptimization.optimization.changes_summary?.content_changes?.length
                                ? selectedOptimization.optimization.changes_summary.content_changes
                                : selectedOptimization.suggested_improvements?.filter((improvement: any) =>
                                    !String(improvement.section || '').toLowerCase().includes('system_prompt'),
                                  ),
                            )
                          : ''

                        if (currentContent === suggestedContent && regularSuggestionContentAppendix) {
                          suggestedContent = `${suggestedContent}${regularSuggestionContentAppendix}`
                        }

                        const isIdentical = currentContent === suggestedContent
                        
                        if (process.env.NODE_ENV === 'development') {
                          console.log('[TemplateOptimization] Template Content Comparison:', {
                            currentLength: currentContent.length,
                            suggestedLength: suggestedContent.length,
                            isIdentical,
                            currentPreview: currentContent.substring(0, 200),
                            suggestedPreview: suggestedContent.substring(0, 200)
                          })
                        }
                        
                        return (
                          <>
                            {isIdentical && !selectedOptimization.optimization?.is_regular_suggestion && (
                              <Alert className="mb-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  Template content is identical. The optimization may have already been applied, or no content changes were proposed.
                                </AlertDescription>
                              </Alert>
                            )}
                            {isIdentical && selectedOptimization.optimization?.is_regular_suggestion && (
                              <Alert className="mb-2">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  Proposed template additions are shown below. These are incremental changes (new sections, modifications) rather than a full template replacement. 
                                  View the "Change Summary" tab for detailed descriptions of each proposed change.
                                </AlertDescription>
                              </Alert>
                            )}
                            <div
                              data-testid="optimization-diff-template-content"
                              className="optimization-diff-shell border rounded-lg overflow-x-auto"
                            >
                              <SideBySideDiff
                                oldContent={currentContent}
                                newContent={suggestedContent}
                                filename="template.md"
                              />
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>Loading optimization details...</p>
                    <p className="text-xs mt-2">Fetching current and suggested template content for comparison...</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="explanation" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {(() => {
                        // Use optimization data if available, otherwise fall back to suggested_improvements
                        if (selectedOptimization.optimization?.change_explanation) {
                          return selectedOptimization.optimization.change_explanation
                        }
                        const improvement = selectedOptimization.suggested_improvements?.[0]
                        const explanation = improvement?.proposed_change || improvement?.change_explanation || 'No explanation provided'
                        return typeof explanation === 'string' ? explanation : JSON.stringify(explanation, null, 2)
                      })()}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="changes" className="mt-4">
                {(() => {
                  // Use optimization data if available, otherwise fall back to suggested_improvements
                  const changesSummary = selectedOptimization.optimization?.changes_summary || 
                                        selectedOptimization.suggested_improvements?.[0]?.changes_summary
                  
                  if (!changesSummary) {
                    return (
                      <div className="p-8 text-center text-muted-foreground">
                        <p>No change summary available</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {changesSummary.system_prompt_changes && changesSummary.system_prompt_changes.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">System Prompt Changes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {changesSummary.system_prompt_changes.map((change: any, idx: number) => (
                                <li key={idx}>{typeof change === 'string' ? change : JSON.stringify(change)}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {changesSummary.content_changes && changesSummary.content_changes.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Template Content Changes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {changesSummary.content_changes.map((change: any, idx: number) => (
                                <li key={idx}>{typeof change === 'string' ? change : JSON.stringify(change)}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {changesSummary.key_improvements && changesSummary.key_improvements.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Expected Quality Improvements</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                              {changesSummary.key_improvements.map((imp: any, idx: number) => (
                                <li key={idx}>{typeof imp === 'string' ? imp : JSON.stringify(imp)}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )
                })()}
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
                  const isRegular = selectedOptimization.optimization?.is_regular_suggestion || false
                  applyOptimization(selectedOptimization.id, isRegular)
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

