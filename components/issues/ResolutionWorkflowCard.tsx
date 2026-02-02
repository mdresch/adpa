"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    Play,
    ChevronRight,
    Sparkles,
    CheckCircle,
    Loader2,
    MoreVertical,
    XCircle,
    Zap,
    Target,
    TrendingUp,
    Users,
    Settings
} from "@/components/ui/icons-shim"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { format, differenceInHours } from "date-fns"
import { apiClient, Issue, Playbook, PlaybookExecution, PlaybookStep } from "@/lib/api"
import { toast } from "@/lib/notify"

// Enhanced interfaces for confidence scoring
interface PlaybookWithConfidence extends Playbook {
    confidence_score: number
    match_reasons: string[]
    estimated_duration: number
    success_rate: number
}

interface AutoAssignmentSettings {
    enabled: boolean
    confidence_threshold: number
    require_approval: boolean
    auto_execute: boolean
}

interface ResolutionWorkflowCardProps {
    issue: Issue
    onUpdate?: () => void
    bulkMode?: boolean
    selectedIssues?: Issue[]
}

export function ResolutionWorkflowCard({ issue, onUpdate, bulkMode = false, selectedIssues = [] }: ResolutionWorkflowCardProps) {
    const [loading, setLoading] = useState(false)
    const [recommendations, setRecommendations] = useState<PlaybookWithConfidence[]>([])
    const [execution, setExecution] = useState<PlaybookExecution | null>(null)
    const [steps, setSteps] = useState<PlaybookStep[]>([])
    const [stepExecutions, setStepExecutions] = useState<any[]>([])
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    // Auto-assignment state
    const [autoAssignSettings, setAutoAssignSettings] = useState<AutoAssignmentSettings>({
        enabled: true,
        confidence_threshold: 75,
        require_approval: false,
        auto_execute: false
    })
    const [autoAssignedPlaybook, setAutoAssignedPlaybook] = useState<PlaybookWithConfidence | null>(null)
    const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false)
    const [bulkAssignMode, setBulkAssignMode] = useState(false)

    // Completion Dialog State
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
    const [completionNotes, setCompletionNotes] = useState("")

    // Cancellation State
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

    // Confidence scoring and matching algorithms
    const calculateConfidenceScore = (playbook: Playbook, issue: Issue): number => {
        let score = 0
        
        // Category match (40% weight)
        if (playbook.applicable_risk_categories?.includes(issue.category)) {
            score += 40
        }
        
        // Priority match (25% weight)
        if (playbook.applicable_priority_levels?.includes(issue.priority)) {
            score += 25
        }
        
        // Historical success rate (20% weight)
        const successRate = getHistoricalSuccessRate(playbook)
        score += successRate * 0.2
        
        // Recency and relevance (15% weight)
        const recencyScore = getRecencyScore(playbook)
        score += recencyScore * 0.15
        
        return Math.min(100, Math.round(score))
    }
    
    const getMatchReasons = (playbook: Playbook, issue: Issue): string[] => {
        const reasons: string[] = []
        
        if (playbook.applicable_risk_categories?.includes(issue.category)) {
            reasons.push(`Matches issue category: ${issue.category}`)
        }
        
        if (playbook.applicable_priority_levels?.includes(issue.priority)) {
            reasons.push(`Suitable for ${issue.priority} priority issues`)
        }
        
        if (playbook.trigger_type === 'auto') {
            reasons.push('Auto-triggered playbook')
        }
        
        if (playbook.is_active) {
            reasons.push('Active and maintained')
        }
        
        return reasons
    }
    
    const getHistoricalSuccessRate = (playbook: Playbook): number => {
        // Mock implementation - would fetch from analytics API
        return Math.random() * 30 + 70 // 70-100% success rate
    }
    
    const getRecencyScore = (playbook: Playbook): number => {
        const daysSinceUpdate = differenceInHours(new Date(), new Date(playbook.updated_at)) / 24
        return Math.max(0, 100 - daysSinceUpdate * 2) // Decay over time
    }
    
    const estimatePlaybookDuration = async (playbook: Playbook): Promise<number> => {
        // Mock implementation - would calculate from playbook steps
        return Math.random() * 48 + 24 // 24-72 hours
    }
    
    const getPlaybookSuccessRate = async (playbook: Playbook): Promise<number> => {
        // Mock implementation - would fetch from analytics API
        return Math.random() * 25 + 75 // 75-100% success rate
    }
    
    // Auto-assignment handlers
    const handleAutoAssign = async (playbook: PlaybookWithConfidence) => {
        try {
            setLoadingAction('auto-assign')
            const resp = await apiClient.executePlaybook(playbook.id, {
                triggered_by_type: 'issue',
                triggered_by_id: issue.id,
                trigger_type: 'auto',
                trigger_reason: `Auto-assigned with ${playbook.confidence_score}% confidence`
            })
            
            // Update issue with execution ID
            await apiClient.updateIssue(issue.id, {
                playbook_execution_id: resp.execution.id,
                resolution_workflow: {
                    current_phase: 'auto_assigned',
                    playbook_started_at: new Date().toISOString(),
                    completed_steps: [],
                    notes: `Auto-assigned playbook: ${playbook.title}`
                }
            })
            
            toast.success(`Auto-assigned playbook: ${playbook.title}`)
            setAutoAssignedPlaybook(null)
            if (onUpdate) onUpdate()
        } catch (error: any) {
            toast.error(error.message || "Failed to auto-assign playbook")
        } finally {
            setLoadingAction(null)
        }
    }
    
    const handleAcceptAutoAssign = () => {
        if (autoAssignedPlaybook) {
            handleAutoAssign(autoAssignedPlaybook)
            setShowAutoAssignDialog(false)
        }
    }
    
    const handleRejectAutoAssign = () => {
        setAutoAssignedPlaybook(null)
        setShowAutoAssignDialog(false)
        toast.info("Auto-assignment declined. Manual selection available.")
    }
    
    // Bulk assignment handlers
    const handleBulkAssign = async () => {
        if (!selectedIssues.length) {
            toast.error("No issues selected for bulk assignment")
            return
        }
        
        try {
            setLoadingAction('bulk-assign')
            const results = await Promise.allSettled(
                selectedIssues.map(async (selectedIssue) => {
                    const resp = await apiClient.getIssueResolutionRecommendations(selectedIssue.id)
                    const bestMatch = resp.recommendations?.[0]
                    if (bestMatch) {
                        return await apiClient.executePlaybook(bestMatch.id, {
                            triggered_by_type: 'issue',
                            triggered_by_id: selectedIssue.id,
                            trigger_type: 'auto',
                            trigger_reason: 'Bulk auto-assignment'
                        })
                    }
                    return null
                })
            )
            
            const successful = results.filter(r => r.status === 'fulfilled').length
            toast.success(`Bulk assigned playbooks to ${successful}/${selectedIssues.length} issues`)
            if (onUpdate) onUpdate()
        } catch (error: any) {
            toast.error(error.message || "Failed to bulk assign playbooks")
        } finally {
            setLoadingAction(null)
        }
    }

    useEffect(() => {
        if (issue.playbook_execution_id) {
            fetchExecutionDetails(issue.playbook_execution_id)
        } else {
            fetchRecommendations()
        }
    }, [issue.id, issue.playbook_execution_id])

    const fetchRecommendations = async () => {
        try {
            setLoading(true)
            const resp = await apiClient.getIssueResolutionRecommendations(issue.id)
            
            // Calculate confidence scores for each recommendation
            const enhancedRecommendations = await Promise.all(
                (resp.recommendations || []).map(async (playbook: Playbook) => {
                    const confidence = calculateConfidenceScore(playbook, issue)
                    const reasons = getMatchReasons(playbook, issue)
                    
                    return {
                        ...playbook,
                        confidence_score: confidence,
                        match_reasons: reasons,
                        estimated_duration: await estimatePlaybookDuration(playbook),
                        success_rate: await getPlaybookSuccessRate(playbook)
                    }
                })
            )
            
            // Sort by confidence score
            enhancedRecommendations.sort((a, b) => b.confidence_score - a.confidence_score)
            setRecommendations(enhancedRecommendations)
            
            // Auto-assign if enabled and confidence is high enough
            if (autoAssignSettings.enabled && !bulkMode) {
                const bestMatch = enhancedRecommendations[0]
                if (bestMatch && bestMatch.confidence_score >= autoAssignSettings.confidence_threshold) {
                    setAutoAssignedPlaybook(bestMatch)
                    if (!autoAssignSettings.require_approval) {
                        await handleAutoAssign(bestMatch)
                    } else {
                        setShowAutoAssignDialog(true)
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch recommendations:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchExecutionDetails = async (executionId: string) => {
        try {
            setLoading(true)
            const { execution: currentExec } = await apiClient.getExecutionById(executionId)

            if (currentExec) {
                setExecution(currentExec)
                const playbookResp = await apiClient.getPlaybook(currentExec.playbook_id)
                setSteps(playbookResp.steps || [])
            }
        } catch (error) {
            console.error("Failed to fetch execution details:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleStartPlaybook = async (playbookId: string) => {
        try {
            setLoadingAction(playbookId)
            const resp = await apiClient.executePlaybook(playbookId, {
                triggered_by_type: 'issue',
                triggered_by_id: issue.id,
                trigger_type: 'manual'
            })
            toast.success("Playbook started successfully")
            if (onUpdate) onUpdate()
        } catch (error: any) {
            toast.error(error.message || "Failed to start playbook")
        } finally {
            setLoadingAction(null)
        }
    }

    const initiateCompleteStep = (stepId: string) => {
        setSelectedStepId(stepId)
        setCompletionNotes("")
        setCompletionDialogOpen(true)
    }

    const submitCompleteStep = async () => {
        if (!execution || !selectedStepId) return

        try {
            setLoadingAction(selectedStepId)
            setCompletionDialogOpen(false) // Close immediately to show loading on button

            await apiClient.completePlaybookStep(execution.id, selectedStepId, completionNotes)

            toast.success("Step completed")
            fetchExecutionDetails(execution.id)
            if (onUpdate) onUpdate()
        } catch (error: any) {
            toast.error(error.message || "Failed to complete step")
            setCompletionDialogOpen(true) // Re-open on error
        } finally {
            setLoadingAction(null)
            if (!completionDialogOpen) setSelectedStepId(null)
        }
    }

    const handleCancelPlaybook = async () => {
        if (!execution) return

        try {
            setLoading(true)
            setCancelDialogOpen(false)

            // Assuming there's a cancel method in API, if not we'll need to add it or use raw fetch
            // But based on previous context, apiClient.cancelPlaybookExecution might not be exposed yet
            // verifying api.ts previously showed `cancelExecution` in backend service but we need to check client
            // If missing in client types, we might need to use generic post for now or add it to client.
            // Using generic post as safe fallback based on route verification: POST /api/playbooks/executions/:id/cancel

            await apiClient.post(`/playbooks/executions/${execution.id}/cancel`, { reason: cancelReason })

            toast.success("Playbook execution cancelled")
            fetchExecutionDetails(execution.id)
            if (onUpdate) onUpdate()
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel playbook")
        } finally {
            setLoading(false)
        }
    }

    const calculateProgress = () => {
        if (!steps.length || !execution || !execution.current_step_order) return 0
        return Math.round(((execution.current_step_order - 1) / steps.length) * 100)
    }

    if (loading && !execution && recommendations.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-muted-foreground">Loading resolution workflow...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Resolution Workflow</CardTitle>
                    </div>
                    {execution && (
                        <Badge variant={execution.status === 'in_progress' ? 'default' : execution.status === 'completed' ? 'secondary' : 'destructive'}>
                            {execution.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                    )}
                    {execution && execution.status === 'in_progress' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setCancelDialogOpen(true)} className="text-red-600 focus:text-red-600">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Playbook
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <CardDescription>
                    {execution
                        ? `Active Playbook: ${steps.length > 0 ? 'Solving issue with structured steps' : 'Initializing...'}`
                        : 'Structured path to resolve this issue effectively'}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {execution ? (
                    <>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{calculateProgress()}%</span>
                            </div>
                            <Progress value={calculateProgress()} className="h-2" />
                        </div>

                        <div className="space-y-3 mt-4">
                            {steps.map((step, index) => {
                                const isCompleted = step.step_order < (execution.current_step_order || 1)
                                const isCurrent = step.step_order === (execution.current_step_order || 1)

                                return (
                                    <div
                                        key={step.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isCurrent ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 'bg-card'
                                            }`}
                                    >
                                        <div className="mt-0.5">
                                            {isCompleted ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            ) : isCurrent ? (
                                                <Circle className="h-5 w-5 text-primary animate-pulse" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground/30" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`font-medium text-sm ${isCurrent ? 'text-primary' : ''}`}>
                                                    {step.step_title}
                                                </p>
                                                {step.sla_hours && isCurrent && (
                                                    <div className="flex items-center text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {step.sla_hours}h SLA
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                {step.step_description}
                                            </p>

                                            {isCurrent && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mt-2 h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                                    onClick={() => initiateCompleteStep(step.id)}
                                                    disabled={loadingAction === step.id}
                                                >
                                                    {loadingAction === step.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                    ) : (
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                    )}
                                                    Mark as Completed
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : recommendations.length > 0 ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Target className="h-4 w-4 text-orange-500" />
                                Recommended Playbooks
                            </p>
                            {bulkMode && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBulkAssign}
                                    disabled={loadingAction === 'bulk-assign' || selectedIssues.length === 0}
                                    className="text-xs"
                                >
                                    {loadingAction === 'bulk-assign' ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                        <Zap className="h-3 w-3 mr-1" />
                                    )}
                                    Bulk Assign ({selectedIssues.length})
                                </Button>
                            )}
                        </div>
                        {recommendations.map((playbook) => (
                            <div
                                key={playbook.id}
                                className={`group flex items-start justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                                    playbook.confidence_score >= 80 ? 'border-green-200 bg-green-50/30' :
                                    playbook.confidence_score >= 60 ? 'border-yellow-200 bg-yellow-50/30' :
                                    'border-gray-200 hover:border-primary/50 hover:bg-primary/[0.02]'
                                }`}
                                onClick={() => handleStartPlaybook(playbook.id)}
                            >
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                {playbook.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {playbook.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-[10px] font-normal py-0">
                                                    {playbook.category}
                                                </Badge>
                                                <div className="flex items-center gap-1">
                                                    <div className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                        playbook.confidence_score >= 80 ? 'bg-green-100 text-green-700' :
                                                        playbook.confidence_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {playbook.confidence_score}% Match
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <TrendingUp className="h-3 w-3" />
                                                        {Math.round(playbook.success_rate)}% Success
                                                    </span>
                                                </div>
                                            </div>
                                            {playbook.match_reasons.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-[10px] text-muted-foreground mb-1">Why this matches:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {playbook.match_reasons.slice(0, 2).map((reason, index) => (
                                                            <Badge key={index} variant="secondary" className="text-[8px]">
                                                                {reason}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2 ml-4">
                                            <div className="text-[10px] text-muted-foreground text-right">
                                                Est. {Math.round(playbook.estimated_duration)}h
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={playbook.confidence_score >= 80 ? 'default' : 'ghost'}
                                                className="h-8 px-3 rounded-full group-hover:bg-primary group-hover:text-primary-foreground"
                                                disabled={loadingAction === playbook.id}
                                            >
                                                {loadingAction === playbook.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Play className="h-4 w-4" />
                                                )}
                                                {playbook.confidence_score >= 80 ? 'Auto' : 'Start'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center border rounded-lg border-dashed">
                        <p className="text-sm text-muted-foreground">
                            No matching playbooks found for this issue category.
                        </p>
                        <Button variant="link" className="text-xs text-primary mt-1">
                            Browse all playbooks
                        </Button>
                    </div>
                )}
            </CardContent>

            {execution && (
                <CardFooter className="bg-muted/30 pt-4 flex justify-between items-center border-t text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Started: {format(new Date(execution.started_at), 'MMM d, HH:mm')}
                    </div>
                    <div className="flex items-center gap-1">
                        Phase: {issue.resolution_workflow?.current_phase || 'Active Resolution'}
                    </div>
                </CardFooter>
            )}
            {/* Completion Dialog */}
            <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Step</DialogTitle>
                        <DialogDescription>
                            Provide any notes or observations before marking this step as complete.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Enter details about what was done..."
                                value={completionNotes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCompletionNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCompletionDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitCompleteStep}>Complete Step</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Auto-Assignment Dialog */}
            <Dialog open={showAutoAssignDialog} onOpenChange={setShowAutoAssignDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-blue-500" />
                            Auto-Assignment Recommended
                        </DialogTitle>
                        <DialogDescription>
                            A high-confidence playbook has been identified for this issue.
                        </DialogDescription>
                    </DialogHeader>
                    {autoAssignedPlaybook && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <h4 className="font-semibold text-sm text-blue-900">{autoAssignedPlaybook.title}</h4>
                                <p className="text-xs text-blue-700 mt-1">{autoAssignedPlaybook.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="text-[10px] font-medium text-blue-700">
                                        {autoAssignedPlaybook.confidence_score}% Confidence
                                    </div>
                                    <div className="text-[10px] text-blue-700">
                                        {Math.round(autoAssignedPlaybook.success_rate)}% Success Rate
                                    </div>
                                    <div className="text-[10px] text-blue-700">
                                        Est. {Math.round(autoAssignedPlaybook.estimated_duration)}h Duration
                                    </div>
                                </div>
                                {autoAssignedPlaybook.match_reasons.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-[10px] text-blue-600 font-medium mb-1">Match reasons:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {autoAssignedPlaybook.match_reasons.map((reason, index) => (
                                                <Badge key={index} variant="secondary" className="text-[8px] bg-blue-100 text-blue-700">
                                                    {reason}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                <Switch
                                    id="auto-approve"
                                    checked={!autoAssignSettings.require_approval}
                                    onCheckedChange={(checked) => 
                                        setAutoAssignSettings(prev => ({ ...prev, require_approval: !checked }))
                                    }
                                />
                                <Label htmlFor="auto-approve" className="text-sm font-medium">
                                    Auto-approve future assignments
                                </Label>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={handleRejectAutoAssign}>
                            Review Manually
                        </Button>
                        <Button onClick={handleAcceptAutoAssign} className="bg-blue-600 hover:bg-blue-700">
                            Accept & Start
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancellation Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Playbook</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to stop this playbook? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Cancellation</Label>
                            <Textarea
                                id="reason"
                                placeholder="Why is this playbook being cancelled?"
                                value={cancelReason}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Go Back</Button>
                        <Button variant="destructive" onClick={handleCancelPlaybook} disabled={!cancelReason.trim()}>
                            Cancel Playbook
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
