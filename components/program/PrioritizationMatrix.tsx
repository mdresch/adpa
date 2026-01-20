"use client"

/**
 * Prioritization Matrix Component
 * Scoring interface for projects based on prioritization criteria
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/notify'
import { apiClient } from '@/lib/api'
import { X, Save, ArrowLeft, Info } from 'lucide-react'

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

interface PrioritizationMatrixProps {
  programId: string
  projectId: string
  onScoreSaved: () => void
  onCancel: () => void
}

export function PrioritizationMatrix({
  programId,
  projectId,
  onScoreSaved,
  onCancel
}: PrioritizationMatrixProps) {
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [project, setProject] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchData()
  }, [projectId])

  const fetchData = async () => {
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

      // Fetch project
      try {
        const projectResponse = await apiClient.get<{
          project: { id: string; name: string }
        }>(`/projects/${projectId}`)

        if (projectResponse?.project) {
          setProject({
            id: projectResponse.project.id,
            name: projectResponse.project.name
          })
        } else {
          console.warn('Project response missing project data:', projectResponse)
          // Fallback: set project with just the ID if name is missing
          setProject({
            id: projectId,
            name: 'Unknown Project'
          })
        }
      } catch (error) {
        console.error('Failed to fetch project:', error)
        // Set fallback project data
        setProject({
          id: projectId,
          name: 'Unknown Project'
        })
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
      }>(`/prioritization/projects/${projectId}/scores`)

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
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load scoring data')
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = useCallback((criteriaId: string, value: number) => {
    console.log('handleScoreChange called:', { criteriaId, value })
    setScores(prev => {
      const existingScore = prev[criteriaId]
      const newScore: Score = {
        ...existingScore,
        criteria_id: criteriaId,
        raw_score: value,
        justification: existingScore?.justification || ''
      }
      // Preserve id if it exists
      if (existingScore?.id) {
        newScore.id = existingScore.id
      }
      const updated = {
        ...prev,
        [criteriaId]: newScore
      }
      console.log('Updated scores:', updated)
      return updated
    })
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

  const getPriorityTier = (totalScore: number): string => {
    if (totalScore >= 4.0) return 'Critical'
    if (totalScore >= 3.0) return 'High'
    if (totalScore >= 2.0) return 'Medium'
    return 'Low'
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Save all scores
      const savePromises = Object.values(scores).map(score =>
        apiClient.post('/prioritization/scores', {
          project_id: projectId,
          criteria_id: score.criteria_id,
          raw_score: score.raw_score,
          justification: score.justification || undefined
        })
      )

      await Promise.all(savePromises)

      toast.success('Scores saved successfully')
      onScoreSaved()
    } catch (error: any) {
      console.error('Failed to save scores:', error)
      toast.error(error.message || 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  const getScoreLabel = (score: number, criterion: Criterion): string => {
    if (criterion.is_inverted) {
      // For inverted criteria (like Risk Level), lower is better
      const labels = ['Very High Risk', 'High Risk', 'Medium Risk', 'Low Risk', 'Very Low Risk']
      return labels[score - 1] || 'Unknown'
    } else {
      const labels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High']
      return labels[score - 1] || 'Unknown'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const totalScore = calculateTotalScore()
  const priorityTier = getPriorityTier(totalScore)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Score Project: {project?.name || 'Loading...'}</CardTitle>
            <CardDescription>
              Rate this project on each criterion. Scores are automatically weighted.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {criteria.map(criterion => {
          const currentScore = scores[criterion.id]?.raw_score
          const score = typeof currentScore === 'number' ? currentScore : 3
          const weightedScore = calculateWeightedScore(score, criterion.weight)
          const maxWeightedScore = calculateWeightedScore(criterion.scale_max, criterion.weight)

          return (
            <div key={criterion.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Label className="text-base font-semibold">
                      {criterion.name}
                    </Label>
                    <Badge variant="outline">
                      {criterion.weight}% weight
                    </Badge>
                    {criterion.is_inverted && (
                      <Badge variant="secondary" className="text-xs">
                        Inverted
                      </Badge>
                    )}
                  </div>
                  {criterion.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {criterion.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Score: {score} / {criterion.scale_max}
                  </span>
                  <span className="text-sm font-medium">
                    {getScoreLabel(score, criterion)}
                  </span>
                </div>

                <Slider
                  value={[score]}
                  onValueChange={(values: number[]) => {
                    const newValue = Math.round(values[0])
                    if (typeof newValue === 'number' && !isNaN(newValue) && newValue >= criterion.scale_min && newValue <= criterion.scale_max) {
                      console.log('Slider value changed:', { criterionId: criterion.id, oldValue: score, newValue })
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
                  <div className="flex items-center space-x-4">
                    <span>
                      Weighted: {weightedScore.toFixed(2)} / {maxWeightedScore.toFixed(2)}
                    </span>
                  </div>
                  <span>{criterion.scale_max}</span>
                </div>

                <div className="mt-3">
                  <Label htmlFor={`justification-${criterion.id}`} className="text-sm">
                    Justification (Optional)
                  </Label>
                  <Textarea
                    id={`justification-${criterion.id}`}
                    value={scores[criterion.id]?.justification || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleJustificationChange(criterion.id, e.target.value)}
                    placeholder="Explain why you assigned this score..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Total Score Summary */}
        <div className="mt-6 p-4 bg-muted rounded-lg border-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Priority Score</div>
              <div className="text-3xl font-bold mt-1">{totalScore.toFixed(2)} / 5.00</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Priority Tier</div>
              <Badge
                className={`mt-1 text-lg px-4 py-2 ${
                  priorityTier === 'Critical'
                    ? 'bg-red-500/10 text-red-700 border-red-500/20'
                    : priorityTier === 'High'
                    ? 'bg-orange-500/10 text-orange-700 border-orange-500/20'
                    : priorityTier === 'Medium'
                    ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
                    : 'bg-gray-500/10 text-gray-700 border-gray-500/20'
                }`}
              >
                {priorityTier}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Scores'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

