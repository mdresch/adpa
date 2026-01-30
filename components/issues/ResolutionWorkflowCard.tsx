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
    Loader2
} from "@/components/ui/icons-shim"
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
            // We need an endpoint to get execution details with steps
            // For now, let's assume getPlaybook returns execution info or we have a specific execution endpoint
            // Let's use getPlaybook for the playbook info and assume steps are there
            // Wait, I need to know which playbook is being executed
            const executionsResp = await apiClient.getPlaybookExecutions({ project_id: issue.project_id })
            const currentExec = executionsResp.executions.find(e => e.id === executionId)

            if (currentExec) {
                setExecution(currentExec)
                const playbookResp = await apiClient.getPlaybook(currentExec.playbook_id)
                setSteps(playbookResp.steps || [])

                // In a real app, we'd also fetch step executions to know which are completed
                // For this demo/phase, we'll derive from current_step_order
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
                project_id: issue.project_id,
                issue_id: issue.id
            })
            toast.success("Playbook started successfully")
            if (onUpdate) onUpdate()
        } catch (error: any) {
            toast.error(error.message || "Failed to start playbook")
        } finally {
            setLoadingAction(null)
        }
    }

    const handleCompleteStep = async (stepId: string) => {
        if (!execution) return

        try {
            setLoadingAction(stepId)
            await apiClient.completePlaybookStep(execution.id, stepId)
            toast.success("Step completed")
            fetchExecutionDetails(execution.id)
            if (onUpdate) onUpdate()
        } catch (error: any) {
            toast.error(error.message || "Failed to complete step")
        } finally {
            setLoadingAction(null)
        }
    }

    const calculateProgress = () => {
        if (!steps.length || !execution) return 0
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
                        <Badge variant={execution.status === 'active' ? 'default' : 'secondary'}>
                            {execution.status.toUpperCase()}
                        </Badge>
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
                                                    {step.title}
                                                </p>
                                                {step.sla_hours && isCurrent && (
                                                    <div className="flex items-center text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {step.sla_hours}h SLA
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                {step.description}
                                            </p>

                                            {isCurrent && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mt-2 h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                                    onClick={() => handleCompleteStep(step.id)}
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
                                            {playbook.usage_count || 0} successful runs
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
        </Card>
    )
}
