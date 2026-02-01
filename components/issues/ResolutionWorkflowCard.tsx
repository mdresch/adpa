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
    XCircle
} from "@/components/ui/icons-shim"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format, differenceInHours } from "date-fns"
import { apiClient, Issue, Playbook, PlaybookExecution, PlaybookStep } from "@/lib/api"
import { toast } from "@/lib/notify"

interface ResolutionWorkflowCardProps {
    issue: Issue
    onUpdate?: () => void
}

export function ResolutionWorkflowCard({ issue, onUpdate }: ResolutionWorkflowCardProps) {
    const [loading, setLoading] = useState(false)
    const [recommendations, setRecommendations] = useState<Playbook[]>([])
    const [execution, setExecution] = useState<PlaybookExecution | null>(null)
    const [steps, setSteps] = useState<PlaybookStep[]>([])
    const [stepExecutions, setStepExecutions] = useState<any[]>([])
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    // Completion Dialog State
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
    const [completionNotes, setCompletionNotes] = useState("")

    // Cancellation State
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

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
            setRecommendations(resp.recommendations || [])
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
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            Recommended Playbooks
                        </p>
                        {recommendations.map((playbook) => (
                            <div
                                key={playbook.id}
                                className="group flex items-start justify-between p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer"
                                onClick={() => handleStartPlaybook(playbook.id)}
                            >
                                <div>
                                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                        {playbook.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                        {playbook.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-[10px] font-normal py-0">
                                            {playbook.category}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Sparkles className="h-3 w-3 text-orange-400" />
                                            Standardized procedure
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 rounded-full group-hover:bg-primary group-hover:text-primary-foreground"
                                    disabled={loadingAction === playbook.id}
                                >
                                    {loadingAction === playbook.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4 ml-0.5" />
                                    )}
                                </Button>
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
