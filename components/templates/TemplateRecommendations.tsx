'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Sparkles, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle, Info } from 'lucide-react'
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
}

export function TemplateRecommendations({ templateId }: { templateId: string }) {
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.map((suggestion) => {
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
    </div>
  )
}

