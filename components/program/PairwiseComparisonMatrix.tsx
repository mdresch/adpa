"use client"

/**
 * Pairwise Comparison Matrix Component
 * TASK-329 Enhancement: Compare projects two at a time to determine priority
 * 
 * Uses pairwise comparison methodology:
 * - Shows two projects side by side
 * - User selects which has higher priority
 * - Cycles through all project pairs
 * - Calculates final rankings based on comparisons
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  X,
  RotateCcw,
  Loader2
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

interface Project {
  id: string
  name: string
  description?: string
  status?: string
  framework?: string
  program_id?: string
}

interface Comparison {
  project1_id: string
  project2_id: string
  winner_id: string | null // null = tie
  confidence?: number // 1-5 scale
  notes?: string
}

interface PairwiseComparisonMatrixProps {
  programId: string
  projects: Project[]
  onComplete?: (rankings: Array<{ project_id: string; priority_score: number; rank: number }>) => void
  onClose?: () => void
}

export function PairwiseComparisonMatrix({
  programId,
  projects,
  onComplete,
  onClose
}: PairwiseComparisonMatrixProps) {
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [currentPairIndex, setCurrentPairIndex] = useState(0)
  const [selectedWinner, setSelectedWinner] = useState<string | null | undefined>(undefined)
  const [confidence, setConfidence] = useState<number>(3)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [rankings, setRankings] = useState<Array<{ project_id: string; priority_score: number; rank: number }>>([])

  // Generate all unique pairs of projects
  const generatePairs = useCallback((): Array<[string, string]> => {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        pairs.push([projects[i].id, projects[j].id])
      }
    }
    return pairs
  }, [projects])

  const [pairs] = useState<Array<[string, string]>>(() => generatePairs())

  const currentPair = pairs[currentPairIndex]
  const project1 = projects.find(p => p.id === currentPair?.[0])
  const project2 = projects.find(p => p.id === currentPair?.[1])
  const currentComparison = comparisons.find(
    c =>
      (c.project1_id === currentPair?.[0] && c.project2_id === currentPair?.[1]) ||
      (c.project1_id === currentPair?.[1] && c.project2_id === currentPair?.[0])
  )

  const progress = pairs.length > 0 ? ((comparisons.length / pairs.length) * 100) : 0
  const isComplete = comparisons.length === pairs.length

  useEffect(() => {
    if (currentComparison) {
      setSelectedWinner(currentComparison.winner_id)
      setConfidence(currentComparison.confidence || 3)
      setNotes(currentComparison.notes || '')
    } else {
      setSelectedWinner(undefined) // undefined = no selection made yet
      setConfidence(3)
      setNotes('')
    }
  }, [currentComparison, currentPairIndex])

  // Calculate rankings based on comparisons
  useEffect(() => {
    if (comparisons.length === 0) {
      setRankings([])
      return
    }

    // Count wins and total confidence weights for each project
    const winCounts: Record<string, number> = {}
    const totalConfidenceWeights: Record<string, number> = {}

    projects.forEach(project => {
      winCounts[project.id] = 0
      totalConfidenceWeights[project.id] = 0
    })

    comparisons.forEach(comparison => {
      const confidence = comparison.confidence || 1
      
      // Add confidence weight to both projects (they're both involved in this comparison)
      totalConfidenceWeights[comparison.project1_id] = (totalConfidenceWeights[comparison.project1_id] || 0) + confidence
      totalConfidenceWeights[comparison.project2_id] = (totalConfidenceWeights[comparison.project2_id] || 0) + confidence
      
      if (comparison.winner_id) {
        // Winner gets full confidence weight
        winCounts[comparison.winner_id] = (winCounts[comparison.winner_id] || 0) + confidence
      } else {
        // Tie: both projects get 0.5 * confidence weight
        const tieWeight = 0.5 * confidence
        winCounts[comparison.project1_id] = (winCounts[comparison.project1_id] || 0) + tieWeight
        winCounts[comparison.project2_id] = (winCounts[comparison.project2_id] || 0) + tieWeight
      }
    })

    // Calculate priority scores (win rate weighted by confidence)
    const scores = projects.map(project => {
      const wins = winCounts[project.id] || 0
      const totalWeight = totalConfidenceWeights[project.id] || 1
      // Calculate score: weighted wins / total confidence weight
      // This ensures scores stay in a reasonable range (0-1 for win rate)
      const rawScore = totalWeight > 0 ? wins / totalWeight : 0
      return {
        project_id: project.id,
        priority_score: rawScore,
        win_count: wins,
        comparisons_count: totalConfidenceWeights[project.id] || 0
      }
    })

    // Normalize scores to 0-1 range for API validation
    const scoreValues = scores.map(s => s.priority_score)
    const maxScore = Math.max(...scoreValues, 0)
    const minScore = Math.min(...scoreValues, 0)
    const range = maxScore - minScore
    
    const normalizedScores = scores.map(item => {
      let normalizedScore = 0
      if (range > 0) {
        // Normalize to 0-1 range
        normalizedScore = (item.priority_score - minScore) / range
      } else if (maxScore > 0) {
        // All scores are the same and > 0, set to 1.0
        normalizedScore = 1.0
      }
      // Otherwise normalizedScore stays 0
      
      return {
        ...item,
        priority_score: Math.max(0, Math.min(1, normalizedScore)) // Clamp to 0-1
      }
    })

    // Sort by score descending and assign ranks
    normalizedScores.sort((a, b) => b.priority_score - a.priority_score)
    const ranked = normalizedScores.map((item, index) => ({
      project_id: item.project_id,
      priority_score: item.priority_score, // Already normalized to 0-1 range
      rank: index + 1
    }))

    setRankings(ranked)
  }, [comparisons, projects])

  const handleSelectWinner = (winnerId: string | null) => {
    setSelectedWinner(winnerId)
  }

  const handleSaveComparison = () => {
    if (!currentPair) return

    const comparison: Comparison = {
      project1_id: currentPair[0],
      project2_id: currentPair[1],
      winner_id: selectedWinner,
      confidence: confidence,
      notes: notes.trim() || undefined
    }

    // Remove existing comparison for this pair if any
    const updatedComparisons = comparisons.filter(
      c =>
        !(
          (c.project1_id === currentPair[0] && c.project2_id === currentPair[1]) ||
          (c.project1_id === currentPair[1] && c.project2_id === currentPair[0])
        )
    )

    updatedComparisons.push(comparison)
    setComparisons(updatedComparisons)

    // Move to next pair
    if (currentPairIndex < pairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1)
    } else {
      // All comparisons complete
      toast.success('All comparisons complete!')
    }
  }

  const handleNext = () => {
    if (currentPairIndex < pairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentPairIndex > 0) {
      setCurrentPairIndex(currentPairIndex - 1)
    }
  }

  const handleReset = () => {
    setComparisons([])
    setCurrentPairIndex(0)
    setSelectedWinner(null)
    setConfidence(3)
    setNotes('')
    setRankings([])
    setShowResetDialog(false)
    toast.info('Comparison reset')
  }

  const handleComplete = async () => {
    if (rankings.length === 0) {
      toast.error('No rankings to save')
      return
    }

    try {
      setLoading(true)
      
      // Ensure all values are valid for API validation
      const validatedRankings = rankings.map(r => ({
        project_id: String(r.project_id), // Ensure string UUID
        priority_score: Math.max(0, Math.min(1, Number(r.priority_score) || 0)), // Ensure 0-1 range and is a number
        rank: Number(r.rank) || 1 // Ensure rank is a number
      }))
      
      // Save pairwise comparison results to database
      const payload: any = {
        project_rankings: validatedRankings,
        method: 'pairwise_comparison'
      }
      
      // Only include program_id if it exists (validation requires valid UUID or omit)
      if (programId) {
        payload.program_id = programId
      }
      
      console.log('Sending pairwise comparison payload:', JSON.stringify(payload, null, 2))
      
      const response = await apiClient.post('/prioritization/pairwise-comparison', payload)

      if (response.success) {
        toast.success(`Saved ${response.data.saved} pairwise comparison scores!`)
        
        // Call onComplete callback to refresh rankings
        if (onComplete) {
          onComplete(rankings)
        }
      } else {
        const errorMsg = response.error || 'Failed to save pairwise comparison results'
        const details = (response as any).details ? `: ${JSON.stringify((response as any).details)}` : ''
        throw new Error(errorMsg + details)
      }
    } catch (error: any) {
      console.error('Failed to save pairwise comparison results:', error)
      const errorMessage = error.message || 'Failed to save pairwise comparison results'
      const details = error.response?.data?.details ? ` Details: ${JSON.stringify(error.response.data.details)}` : ''
      toast.error(errorMessage + details)
    } finally {
      setLoading(false)
    }
  }

  const getProjectDisplayInfo = (project: Project | undefined) => {
    if (!project) return null
    return {
      name: project.name,
      description: project.description || 'No description available',
      status: project.status,
      framework: project.framework
    }
  }

  const project1Info = getProjectDisplayInfo(project1)
  const project2Info = getProjectDisplayInfo(project2)

  if (projects.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pairwise Comparison</CardTitle>
          <CardDescription>Compare projects two at a time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>At least 2 projects are required for pairwise comparison</p>
            <p className="text-sm mt-2">Current: {projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Pairwise Comparison Matrix</CardTitle>
              <CardDescription>
                Compare projects two at a time to determine priority rankings
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                disabled={comparisons.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Comparison {currentPairIndex + 1} of {pairs.length}
              </span>
              <span className="font-medium">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Comparison */}
          {project1Info && project2Info && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project 1 */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedWinner === project1?.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : selectedWinner === project2?.id
                    ? 'opacity-50'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleSelectWinner(project1?.id || null)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Project A</CardTitle>
                    {selectedWinner === project1?.id && (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-xl">{project1Info.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {project1Info.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-3">
                      {project1Info.status && (
                        <Badge variant="outline">{project1Info.status}</Badge>
                      )}
                      {project1Info.framework && (
                        <Badge variant="secondary">{project1Info.framework}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* VS Divider */}
              <div className="hidden md:flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">VS</div>
                  <div className="text-xs text-muted-foreground mt-2">Select the higher priority project</div>
                </div>
              </div>

              {/* Project 2 */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedWinner === project2?.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : selectedWinner === project1?.id
                    ? 'opacity-50'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleSelectWinner(project2?.id || null)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Project B</CardTitle>
                    {selectedWinner === project2?.id && (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-xl">{project2Info.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {project2Info.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-3">
                      {project2Info.status && (
                        <Badge variant="outline">{project2Info.status}</Badge>
                      )}
                      {project2Info.framework && (
                        <Badge variant="secondary">{project2Info.framework}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tie Option */}
          <div className="flex justify-center">
            <Button
              variant={selectedWinner === null ? 'default' : 'outline'}
              onClick={() => handleSelectWinner(null)}
              className="w-full md:w-auto"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Equal Priority (Tie)
            </Button>
          </div>

          {/* Confidence and Notes */}
          {selectedWinner !== undefined && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Confidence Level</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-center">{confidence}/5</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this comparison..."
                  className="w-full min-h-[80px] p-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentPairIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              {isComplete ? (
                <Button 
                  onClick={handleComplete} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save & View Rankings
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSaveComparison}
                  disabled={selectedWinner === undefined}
                >
                  Save & Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentPairIndex === pairs.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Rankings Preview */}
          {rankings.length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <BarChart3 className="h-5 w-5" />
                <h3 className="font-semibold">Current Rankings Preview</h3>
              </div>
              <div className="space-y-2">
                {rankings.slice(0, 5).map((ranking, index) => {
                  const project = projects.find(p => p.id === ranking.project_id)
                  return (
                    <div
                      key={ranking.project_id}
                      className="flex items-center justify-between p-2 bg-background rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="w-8 text-center">
                          #{ranking.rank}
                        </Badge>
                        <span className="font-medium">{project?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          Score: {ranking.priority_score.toFixed(2)}
                        </span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })}
                {rankings.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{rankings.length - 5} more projects
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Comparisons?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all {comparisons.length} comparisons you've made. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-red-600 hover:bg-red-700">
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

