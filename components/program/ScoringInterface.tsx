"use client"

/**
 * Scoring Interface Component
 * TASK-329: Enhanced scoring interface for portfolio prioritization
 * 
 * Features:
 * - Project selection dropdown
 * - Streamlined scoring interface
 * - Progress tracking
 * - Quick scoring mode
 * - Visual feedback
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Info,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Criterion {
  id: string
  name: string
  weight: number
  description?: string
  scale_min: number
  scale_max: number
  is_inverted: boolean
  sort_order?: number | null
}

interface Score {
  id?: string
  criteria_id: string
  raw_score: number
  weighted_score?: number
  justification?: string
}

interface Project {
  id: string
  name: string
  program_id?: string
}

interface ScoringInterfaceProps {
  programId: string
  projects: Project[]
  onScoreSaved?: () => void
  onClose?: () => void
  initialProjectId?: string | null
}

export function ScoringInterface({
  programId,
  projects,
  onScoreSaved,
  onClose,
  initialProjectId
}: ScoringInterfaceProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId || null
  )
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedProjectId) {
      void fetchScoringData()
    } else {
      setScores({})
      setHasUnsavedChanges(false)
    }
  }, [selectedProjectId])

  const fetchScoringData = async () => {
    if (!selectedProjectId) return

    try {
      setLoading(true)

      // Fetch criteria
      const criteriaResponse = await apiClient.get<{
        success: boolean
        data: Criterion[]
      }>('/prioritization/criteria?is_active=true')

      if (criteriaResponse.success && criteriaResponse.data) {
        const sortedCriteria = [...criteriaResponse.data].sort(
          (a, b) => (a.sort_order || 999) - (b.sort_order || 999)
        )
        setCriteria(sortedCriteria)
      }

      // Fetch existing scores
      const scoresResponse = await apiClient.get<{
        success: boolean
        data: Array<{
          id: string
          criteria_id: string
          raw_score: number
          weighted_score: number
          justification?: string
        }>
      }>(`/prioritization/projects/${selectedProjectId}/scores`)

      if (scoresResponse.success && scoresResponse.data) {
        const scoresMap: Record<string, Score> = {}
        scoresResponse.data.forEach(score => {
          scoresMap[score.criteria_id] = {
            id: score.id,
            criteria_id: score.criteria_id,
            raw_score: score.raw_score,
            weighted_score: score.weighted_score,
            justification: score.justification || ''
          }
        })
        setScores(scoresMap)
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Failed to fetch scoring data:', error)
      toast.error('Failed to load scoring data')
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = useCallback((criteriaId: string, value: number) => {
    setScores(prev => {
      const existingScore = prev[criteriaId]
      const newScore: Score = {
        ...existingScore,
        criteria_id: criteriaId,
        raw_score: value,
        justification: existingScore?.justification || ''
      }
      if (existingScore?.id) {
        newScore.id = existingScore.id
      }
      return {
        ...prev,
        [criteriaId]: newScore
      }
    })
    setHasUnsavedChanges(true)
  }, [])

  const handleJustificationChange = (criteriaId: string, value: string) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        criteria_id: criteriaId,
        raw_score: prev[criteriaId]?.raw_score || 3,
        justification: value
      }
    }))
    setHasUnsavedChanges(true)
  }

  const calculateWeightedScore = (rawScore: number, weight: number): number => {
    return (rawScore * weight) / 100
  }

  const calculateTotalScore = (): number => {
    return criteria.reduce((total, criterion) => {
      const score = scores[criterion.id]?.raw_score || 0
      return total + calculateWeightedScore(score, criterion.weight)
    }, 0)
  }

  const calculateCompletion = (): number => {
    if (criteria.length === 0) return 0
    const scoredCount = criteria.filter(c => scores[c.id]?.raw_score).length
    return (scoredCount / criteria.length) * 100
  }

  const getPriorityTier = (totalScore: number): string => {
    if (totalScore >= 4.0) return 'Critical'
    if (totalScore >= 3.0) return 'High'
    if (totalScore >= 2.0) return 'Medium'
    return 'Low'
  }

  const getPriorityTierColor = (tier: string) => {
    switch (tier) {
      case 'Critical':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'High':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20'
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'Low':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  const handleProjectChange = (projectId: string) => {
    if (hasUnsavedChanges) {
      setPendingProjectId(projectId)
      setShowUnsavedDialog(true)
    } else {
      setSelectedProjectId(projectId)
    }
  }

  const handleConfirmProjectChange = () => {
    setSelectedProjectId(pendingProjectId)
    setHasUnsavedChanges(false)
    setShowUnsavedDialog(false)
    setPendingProjectId(null)
  }

  const handleCancelProjectChange = () => {
    setShowUnsavedDialog(false)
    setPendingProjectId(null)
  }

  const handleSave = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project first')
      return
    }

    try {
      setSaving(true)

      // Save all scores
      const savePromises = Object.values(scores).map(score =>
        apiClient.post('/prioritization/scores', {
          project_id: selectedProjectId,
          criteria_id: score.criteria_id,
          raw_score: score.raw_score,
          justification: score.justification || undefined
        })
      )

      await Promise.all(savePromises)

      toast.success('Scores saved successfully')
      setHasUnsavedChanges(false)
      onScoreSaved?.()
    } catch (error: any) {
      console.error('Failed to save scores:', error)
      toast.error(error.message || 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  const getScoreLabel = (score: number, criterion: Criterion): string => {
    if (criterion.is_inverted) {
      const labels = ['Very High Risk', 'High Risk', 'Medium Risk', 'Low Risk', 'Very Low Risk']
      return labels[score - 1] || 'Unknown'
    } else {
      const labels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High']
      return labels[score - 1] || 'Unknown'
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const totalScore = calculateTotalScore()
  const priorityTier = getPriorityTier(totalScore)
  const completion = calculateCompletion()

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Score Project</CardTitle>
              <CardDescription>
                Evaluate projects against prioritization criteria
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project-select">Select Project</Label>
            <Select
              value={selectedProjectId || ''}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger id="project-select">
                <SelectValue placeholder="Choose a project to score..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}

          {!loading && selectedProjectId && (
            <>
              {/* Progress Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Scoring Progress</span>
                  <span className="font-medium">{Math.round(completion)}%</span>
                </div>
                <Progress value={completion} className="h-2" />
              </div>

              {/* Scoring Criteria */}
              <div className="space-y-4">
                {criteria.map((criterion, index) => {
                  const currentScore = scores[criterion.id]?.raw_score
                  const score = typeof currentScore === 'number' ? currentScore : 0
                  const weightedScore = calculateWeightedScore(score, criterion.weight)
                  const maxWeightedScore = calculateWeightedScore(criterion.scale_max, criterion.weight)
                  const isScored = score > 0

                  return (
                    <div
                      key={criterion.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        isScored ? 'bg-green-50/50 border-green-200' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground">
                              {index + 1}.
                            </span>
                            <Label className="text-base font-semibold">
                              {criterion.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {criterion.weight}%
                            </Badge>
                            {criterion.is_inverted && (
                              <Badge variant="secondary" className="text-xs">
                                Inverted
                              </Badge>
                            )}
                            {isScored && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          {criterion.description && (
                            <p className="text-sm text-muted-foreground ml-6">
                              {criterion.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 ml-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Score: {score || 'Not scored'} / {criterion.scale_max}
                          </span>
                          {score > 0 && (
                            <span className="text-sm font-medium">
                              {getScoreLabel(score, criterion)}
                            </span>
                          )}
                        </div>

                        <Slider
                          value={[score || criterion.scale_min]}
                          onValueChange={(values: number[]) => {
                            const newValue = Math.round(values[0])
                            if (
                              typeof newValue === 'number' &&
                              !isNaN(newValue) &&
                              newValue >= criterion.scale_min &&
                              newValue <= criterion.scale_max
                            ) {
                              handleScoreChange(criterion.id, newValue)
                            }
                          }}
                          min={criterion.scale_min}
                          max={criterion.scale_max}
                          step={1}
                          className="w-full"
                        />

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{criterion.scale_min}</span>
                          {score > 0 && (
                            <span className="font-medium">
                              Weighted: {weightedScore.toFixed(2)} / {maxWeightedScore.toFixed(2)}
                            </span>
                          )}
                          <span>{criterion.scale_max}</span>
                        </div>

                        <div className="mt-3">
                          <Label htmlFor={`justification-${criterion.id}`} className="text-sm">
                            Justification (Optional)
                          </Label>
                          <Textarea
                            id={`justification-${criterion.id}`}
                            value={scores[criterion.id]?.justification || ''}
                            onChange={(e) => handleJustificationChange(criterion.id, e.target.value)}
                            placeholder="Explain your scoring rationale..."
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Score Summary */}
              {Object.keys(scores).length > 0 && (
                <div className="p-4 bg-muted rounded-lg border-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Priority Score</div>
                      <div className="text-3xl font-bold mt-1">
                        {totalScore.toFixed(2)} / 5.00
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Priority Tier</div>
                      <Badge
                        className={`mt-1 text-lg px-4 py-2 ${getPriorityTierColor(priorityTier)}`}
                      >
                        {priorityTier}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {hasUnsavedChanges && (
                    <span className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span>You have unsaved changes</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || Object.keys(scores).length === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Scores'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {!loading && !selectedProjectId && (
            <div className="text-center py-12 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a project from the dropdown above to begin scoring</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved scoring changes. Are you sure you want to switch projects?
              Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelProjectChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmProjectChange}>
              Switch Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

