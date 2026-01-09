/**
 * Template Improvements Dashboard
 * Admin page for reviewing and implementing AI-generated template improvement suggestions
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Check,
  X,
  Wrench,
  RefreshCw,
  TrendingUp,
  TriangleAlert,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/use-toast'

interface CommonIssueItem {
  description: string
  count: number
  severity?: string
  dimension?: string
}

interface ImprovementItem {
  issue_addressed: string
  proposed_change: string
  change_type: string
  section?: string
  expected_impact?: {
    dimension: string
    current_score: number
    predicted_score: number
    gain: number
  }
  priority?: string
  implementation_difficulty?: string
  rationale?: string
}

interface ImprovementSuggestion {
  id: string
  template_id: string
  template_name: string
  template_type: string
  framework: string
  documents_analyzed: number
  current_avg_quality: number
  current_completeness: number
  current_consistency: number
  current_professional_quality: number
  current_standards_compliance: number
  common_issues: CommonIssueItem[]
  issue_frequency: Record<string, number>
  suggested_improvements: ImprovementItem[]
  improvement_rationale: string
  expected_quality_gain: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending_review' | 'approved' | 'implemented' | 'rejected'
  created_at: string
  reviewed_by: string | null
  reviewed_at: string | null
}

export default function TemplateImprovementsPage() {
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'pending_review',
    priority: 'all'
  })
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const { token } = useAuth()

  useEffect(() => {
    loadSuggestions().catch((error) => {
      console.error('Failed to load suggestions:', error)
    })
  }, [filters, token])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const queryParams = new URLSearchParams()
      if (filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters.priority !== 'all') queryParams.append('priority', filters.priority)

      const queryString = queryParams.toString()
      const response = await fetch(`${API_BASE_URL}/quality-audits/template-improvements${queryString ? `?${queryString}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load template improvement suggestions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerAnalysis = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_BASE_URL}/quality-audits/analyze-templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Analysis Started',
          description: 'Template analysis is running. Check back in a few minutes.',
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to trigger template analysis',
        variant: 'destructive'
      })
    }
  }

  const handleApprove = async (suggestionId: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_BASE_URL}/quality-audits/template-improvements/${suggestionId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Suggestion Approved',
          description: 'Template improvement suggestion has been approved.',
        })
        loadSuggestions()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve suggestion',
        variant: 'destructive'
      })
    }
  }

  const handleReject = (suggestionId: string) => {
    setSelectedSuggestion(suggestionId)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }

  const confirmReject = async () => {
    if (!selectedSuggestion || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      })
      return
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_BASE_URL}/quality-audits/template-improvements/${selectedSuggestion}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectionReason })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Suggestion Rejected',
          description: 'Template improvement suggestion has been rejected.',
        })
        setRejectDialogOpen(false)
        setSelectedSuggestion(null)
        setRejectionReason('')
        loadSuggestions()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject suggestion',
        variant: 'destructive'
      })
    }
  }

  const handleImplement = async (suggestionId: string) => {
    if (!confirm('This will create a new template version and apply the improvements. Continue?')) {
      return
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      const response = await fetch(`${API_BASE_URL}/quality-audits/template-improvements/${suggestionId}/implement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Improvements Implemented',
          description: 'New template version created successfully. Quality will be tracked over the next 30 days.',
        })
        loadSuggestions()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to implement improvements',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            Template Improvement Suggestions
          </h1>
          <p className="text-gray-600 mt-2">
            AI-powered recommendations to enhance document template quality
          </p>
        </div>
        <Button onClick={handleTriggerAnalysis} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Run Analysis Now
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select 
          value={filters.status} 
          onValueChange={(v) => { setFilters({ ...filters, status: v }) }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.priority} 
          onValueChange={(v) => { setFilters({ ...filters, priority: v }) }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm text-gray-600">Loading suggestions...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            No template improvement suggestions found. Run analysis to generate suggestions.
          </AlertDescription>
        </Alert>
      )}

      {/* Suggestion Cards */}
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <ImprovementSuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onApprove={() => { 
              handleApprove(suggestion.id).catch(console.error)
            }}
            onReject={() => { 
              handleReject(suggestion.id)
            }}
            onImplement={() => { 
              handleImplement(suggestion.id).catch(console.error)
            }}
          />
        ))}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Improvement Suggestion</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this suggestion
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={rejectionReason}
            onChange={(e) => { setRejectionReason(e.target.value) }}
            placeholder="Enter rejection reason (minimum 10 characters)..."
            className="min-h-[100px]"
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={rejectionReason.trim().length < 10}
            >
              Reject Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Improvement Suggestion Card Component
 */
function ImprovementSuggestionCard({
  suggestion,
  onApprove,
  onReject,
  onImplement
}: {
  suggestion: ImprovementSuggestion
  onApprove: () => void
  onReject: () => void
  onImplement: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500 text-white border-red-600',
    high: 'bg-orange-500 text-white border-orange-600',
    medium: 'bg-yellow-500 text-white border-yellow-600',
    low: 'bg-blue-500 text-white border-blue-600'
  }

  const statusColors: Record<string, string> = {
    pending_review: 'bg-blue-100 text-blue-800 border-blue-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    implemented: 'bg-purple-100 text-purple-800 border-purple-300',
    rejected: 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle>{suggestion.template_name}</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span>📊 {suggestion.documents_analyzed} documents analyzed</span>
              <span>📈 Current quality: {suggestion.current_avg_quality}%</span>
              <span className="text-green-600 font-semibold">
                🎯 Expected gain: +{suggestion.expected_quality_gain}%
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className={`${priorityColors[suggestion.priority]} px-3 py-1`}>
              {suggestion.priority.toUpperCase()}
            </Badge>
            <Badge className={`${statusColors[suggestion.status]} border px-3 py-1`}>
              {suggestion.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quality Breakdown */}
        <div className="grid grid-cols-5 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
          <QualityDimensionBadge label="Completeness" score={suggestion.current_completeness} />
          <QualityDimensionBadge label="Consistency" score={suggestion.current_consistency} />
          <QualityDimensionBadge label="Professional" score={suggestion.current_professional_quality} />
          <QualityDimensionBadge label="Standards" score={suggestion.current_standards_compliance} />
          <QualityDimensionBadge label="Overall" score={suggestion.current_avg_quality} highlight />
        </div>

        {/* Common Issues */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-orange-600" />
            Common Issues Found:
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {suggestion.common_issues.slice(0, 3).map((issue: CommonIssueItem, idx: number) => (
              <li key={idx} className="text-sm text-gray-700">
                {issue.description} 
                <span className="text-gray-500 ml-2">
                  ({issue.count} occurrence{issue.count !== 1 ? 's' : ''})
                </span>
              </li>
            ))}
            {suggestion.common_issues.length > 3 && (
              <li className="text-sm text-gray-500 italic">
                ... and {suggestion.common_issues.length - 3} more issues
              </li>
            )}
          </ul>
        </div>

        {/* Suggested Improvements */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Suggested Improvements ({suggestion.suggested_improvements.length}):
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <><ChevronUp className="h-4 w-4 mr-1" /> Show Less</>
              ) : (
                <><ChevronDown className="h-4 w-4 mr-1" /> Show All</>
              )}
            </Button>
          </div>
          
          {expanded ? (
            <div className="space-y-3">
              {suggestion.suggested_improvements.map((improvement: ImprovementItem, idx: number) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">
                      {improvement.change_type?.replace('_', ' ').toUpperCase()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {improvement.implementation_difficulty}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Issue:</span> {improvement.issue_addressed}
                  </p>
                  
                  <div className="bg-white p-3 rounded text-sm font-mono mb-2 border">
                    {improvement.proposed_change}
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2">{improvement.rationale}</p>
                  
                  {improvement.expected_impact && (
                    <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded inline-block">
                      Expected: {improvement.expected_impact.dimension}{' '}
                      {improvement.expected_impact.current_score}% → {improvement.expected_impact.predicted_score}%
                      {' '}(+{improvement.expected_impact.gain}%)
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded border">
              {suggestion.suggested_improvements[0]?.proposed_change.substring(0, 200)}
              {suggestion.suggested_improvements[0]?.proposed_change.length > 200 ? '...' : ''}
            </p>
          )}
        </div>

        {/* Rationale */}
        {suggestion.improvement_rationale && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-900">
              <span className="font-semibold">AI Rationale:</span> {suggestion.improvement_rationale}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {suggestion.status === 'pending_review' && (
            <>
              <Button onClick={onApprove} variant="default" className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button onClick={onImplement} variant="secondary" className="flex-1">
                <Wrench className="mr-2 h-4 w-4" />
                Implement Now
              </Button>
              <Button onClick={onReject} variant="destructive" className="flex-1">
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {suggestion.status === 'approved' && (
            <Button onClick={onImplement} className="w-full">
              <Wrench className="mr-2 h-4 w-4" />
              Implement Changes
            </Button>
          )}

          {suggestion.status === 'implemented' && (
            <div className="w-full text-center text-sm text-green-600 font-semibold py-2">
              ✓ Implemented on {new Date(suggestion.reviewed_at || '').toLocaleDateString()}
            </div>
          )}

          {suggestion.status === 'rejected' && (
            <div className="w-full text-center text-sm text-gray-600 py-2">
              ✗ Rejected
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="text-xs text-gray-500 mt-4 pt-4 border-t">
          <div className="flex justify-between">
            <span>Created: {new Date(suggestion.created_at).toLocaleDateString()}</span>
            <span>Framework: {suggestion.framework}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Quality Dimension Badge
 */
function QualityDimensionBadge({ 
  label, 
  score, 
  highlight = false 
}: { 
  label: string
  score: number
  highlight?: boolean
}) {
  const getColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-300'
    if (score >= 80) return 'text-green-500 bg-green-50 border-green-200'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-300'
    if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-300'
    return 'text-red-600 bg-red-50 border-red-300'
  }

  return (
    <div className={`text-center p-2 rounded border ${highlight ? 'ring-2 ring-blue-400' : ''} ${getColor(score)}`}>
      <div className="text-xs font-medium mb-1">{label}</div>
      <div className="text-lg font-bold">{score}%</div>
    </div>
  )
}


