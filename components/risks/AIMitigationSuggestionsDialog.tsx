'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Clock, Target, Users, CheckSquare, Square } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { MitigationPlanDialog } from './MitigationPlanDialog'
import type { MitigationPlan } from './MitigationPlanCard'

interface MitigationSuggestion {
  title: string
  description: string
  action_type: 'mitigation' | 'contingency' | 'avoidance' | 'transfer' | 'acceptance'
  priority: 'critical' | 'high' | 'medium' | 'low'
  expected_effectiveness: number
  key_steps: string[]
  estimated_duration_days: number
  resource_requirements: string
  success_criteria: string
}

interface AIMitigationSuggestionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  riskId: string
  riskTitle?: string
  riskDescription?: string
  riskCategory?: string
  riskProbability?: number
  riskImpact?: number
  riskSeverity?: string
  onSuggestionSelected?: (suggestion: MitigationSuggestion) => void
  onPlanCreated?: () => void
}

const actionTypeConfig = {
  mitigation: { label: 'Mitigation', color: 'bg-blue-100 text-blue-800' },
  contingency: { label: 'Contingency', color: 'bg-purple-100 text-purple-800' },
  avoidance: { label: 'Avoidance', color: 'bg-green-100 text-green-800' },
  transfer: { label: 'Transfer', color: 'bg-orange-100 text-orange-800' },
  acceptance: { label: 'Acceptance', color: 'bg-gray-100 text-gray-800' },
} as const

const priorityConfig = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
} as const

export function AIMitigationSuggestionsDialog({
  open,
  onOpenChange,
  riskId,
  riskTitle,
  riskDescription,
  riskCategory,
  riskProbability,
  riskImpact,
  riskSeverity,
  onSuggestionSelected,
  onPlanCreated,
}: AIMitigationSuggestionsDialogProps) {
  const [suggestions, setSuggestions] = useState<MitigationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<MitigationSuggestion | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  const [isCreatingPlans, setIsCreatingPlans] = useState(false)
  
  const generateSuggestions = async () => {
    try {
      setLoading(true)
      setSuggestions([])
      
      const response = await apiClient.post('/mitigation-plans/suggest', {
        risk_id: riskId,
        risk_title: riskTitle,
        risk_description: riskDescription,
        risk_category: riskCategory,
        risk_probability: riskProbability,
        risk_impact: riskImpact,
        risk_severity: riskSeverity,
      })
      
      if (response.success && response.data?.suggestions) {
        setSuggestions(response.data.suggestions)
        toast.success(`Generated ${response.data.suggestions.length} mitigation plan suggestions`)
      } else {
        toast.error('Failed to generate suggestions')
      }
    } catch (error: any) {
      console.error('Failed to generate suggestions:', error)
      toast.error(error.message || 'Failed to generate AI suggestions')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (open && riskId) {
      generateSuggestions()
    } else {
      setSuggestions([])
      setSelectedSuggestion(null)
      setSelectedSuggestions(new Set())
    }
  }, [open, riskId])
  
  const handleUseSuggestion = (suggestion: MitigationSuggestion) => {
    setSelectedSuggestion(suggestion)
    setIsCreateDialogOpen(true)
    onSuggestionSelected?.(suggestion)
  }
  
  const handleToggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedSuggestions(newSelected)
  }
  
  const handleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set())
    } else {
      setSelectedSuggestions(new Set(suggestions.map((_, index) => index)))
    }
  }
  
  const handleCreateSelectedPlans = async () => {
    if (selectedSuggestions.size === 0) {
      toast.error('Please select at least one suggestion')
      return
    }
    
    try {
      setIsCreatingPlans(true)
      const selectedIndices = Array.from(selectedSuggestions)
      const plansToCreate = selectedIndices.map(index => suggestions[index])
      
      // Create plans in parallel
      const createPromises = plansToCreate.map(async (suggestion) => {
        const payload = {
          risk_id: riskId,
          title: suggestion.title,
          description: `${suggestion.description}\n\nKey Steps:\n${suggestion.key_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nResource Requirements: ${suggestion.resource_requirements}\n\nSuccess Criteria: ${suggestion.success_criteria}`,
          action_type: suggestion.action_type,
          status: 'planned',
          completion_percentage: 0,
          priority: suggestion.priority,
          expected_effectiveness: suggestion.expected_effectiveness,
          planned_start_date: new Date().toISOString().split('T')[0],
          planned_completion_date: new Date(Date.now() + suggestion.estimated_duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(Date.now() + suggestion.estimated_duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
        
        return apiClient.post('/mitigation-plans', payload)
      })
      
      await Promise.all(createPromises)
      
      toast.success(`Successfully created ${plansToCreate.length} mitigation plan${plansToCreate.length > 1 ? 's' : ''}`)
      setSelectedSuggestions(new Set())
      onPlanCreated?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to create plans:', error)
      toast.error(error.message || 'Failed to create some mitigation plans')
    } finally {
      setIsCreatingPlans(false)
    }
  }
  
  const handlePlanCreated = () => {
    setIsCreateDialogOpen(false)
    setSelectedSuggestion(null)
    onPlanCreated?.()
    toast.success('Mitigation plan created from AI suggestion')
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Mitigation Plan Suggestions
            </DialogTitle>
            <DialogDescription>
              AI-generated mitigation plan suggestions for this risk. Select one or more suggestions to create plans.
            </DialogDescription>
          </DialogHeader>
          
          {/* Selection Controls */}
          {suggestions.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedSuggestions.size === suggestions.length ? (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Select All
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedSuggestions.size} of {suggestions.length} selected
                </span>
              </div>
              {selectedSuggestions.size > 0 && (
                <Button
                  onClick={handleCreateSelectedPlans}
                  disabled={isCreatingPlans}
                  className="flex items-center gap-2"
                >
                  {isCreatingPlans ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Plans...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Create {selectedSuggestions.size} Plan{selectedSuggestions.size > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
              <p className="text-muted-foreground">Generating AI suggestions...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No suggestions generated</p>
              <p className="text-muted-foreground mb-4">Try generating suggestions again</p>
              <Button onClick={generateSuggestions} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate Suggestions
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => {
                const isSelected = selectedSuggestions.has(index)
                return (
                  <Card 
                    key={index} 
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    onClick={() => handleToggleSuggestion(index)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                            <CardDescription className="mt-2">
                              {suggestion.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Badge className={actionTypeConfig[suggestion.action_type].color}>
                            {actionTypeConfig[suggestion.action_type].label}
                          </Badge>
                          <Badge className={priorityConfig[suggestion.priority].color}>
                            {priorityConfig[suggestion.priority].label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Key Steps */}
                    {suggestion.key_steps && suggestion.key_steps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Key Steps
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                          {suggestion.key_steps.map((step, stepIndex) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Effectiveness</p>
                          <p className="font-medium">{suggestion.expected_effectiveness}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">{suggestion.estimated_duration_days} days</p>
                        </div>
                      </div>
                      {suggestion.resource_requirements && (
                        <div className="flex items-center gap-2 md:col-span-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-muted-foreground">Resources</p>
                            <p className="font-medium truncate">{suggestion.resource_requirements}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Success Criteria */}
                    {suggestion.success_criteria && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                        <h4 className="text-sm font-semibold mb-1 text-green-900 dark:text-green-100">
                          Success Criteria
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {suggestion.success_criteria}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUseSuggestion(suggestion)
                        }}
                        className="flex-1"
                        variant="outline"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Edit & Create
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleSuggestion(index)
                        }}
                        className="flex-1"
                        variant={isSelected ? "default" : "outline"}
                      >
                        {isSelected ? (
                          <>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Select
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {suggestions.length > 0 && (
              <Button onClick={generateSuggestions} variant="secondary">
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate Suggestions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Plan Dialog with Pre-filled Data */}
      {selectedSuggestion && (
        <MitigationPlanDialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) {
              setSelectedSuggestion(null)
            }
          }}
          riskId={riskId}
          plan={undefined} // Pass undefined to create new plan, not update
          onSuccess={handlePlanCreated}
        />
      )}
    </>
  )
}

