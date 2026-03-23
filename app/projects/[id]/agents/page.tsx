"use client";
import React, { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectPhaseRoadmap } from './components/ProjectPhaseRoadmap';
import { AgentRunMonitor } from '@/app/agent-workspace/components/AgentRunMonitor'; //todo Reusing from global workspace
import { apiClient } from '@/lib/api';
import { toast } from '@/lib/notify';
import { Loader2 } from '@/components/ui/icons-shim';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RunHistoryItem {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
}

export default function ProjectAgentsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params);
    const [isStarting, setIsStarting] = useState(false);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const fetchRunHistory = async () => {
        try {
            setIsLoadingHistory(true);
            // todo: Ensure backend GET /api/agents/project/:id/runs is implemented
            const response = await apiClient.get<{ runs: RunHistoryItem[] }>(`/agents/project/${projectId}/runs`);
            setRunHistory(response.runs || []);
        } catch (error) {
            console.error("Failed to fetch run history:", error);
            toast.error("Failed to load run history.");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchRunHistory();
        }
    }, [projectId]);

    const handleStartRun = async () => {
        try {
            setIsStarting(true);

            // Call the API to start the agent orchestration
            const response = await apiClient.post<{ runId: string }>(`/agents/project/${projectId}/run`, {});

            toast.success("Agent orchestration run started successfully!");
            if (response.runId) {
                setActiveRunId(response.runId);
                // Refresh history to show the new run in the table
                fetchRunHistory();
            }
        } catch (error: unknown) {
            console.error("Failed to start run:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to start orchestration run. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsStarting(false);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'completed':
                return 'default';
            case 'failed':
            case 'stopped':
                return 'destructive';
            case 'running':
            case 'pending':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Agent Orchestration</h1>
                <Button onClick={handleStartRun} disabled={isStarting}>
                    {isStarting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isStarting ? "Starting..." : "Start New Run"}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>10-Phase Project Lifecycle</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProjectPhaseRoadmap projectId={projectId} activeRunId={activeRunId} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Active Run Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                    <AgentRunMonitor runId={activeRunId} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Run History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingHistory ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : runHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No past runs found for this project.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Run ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {runHistory.map((run) => (
                                    <TableRow key={run.id}>
                                        <TableCell className="font-mono text-xs">{run.id.substring(0, 8)}...</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(run.status)} className="capitalize">
                                                {run.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(run.startedAt).toLocaleString()}</TableCell>
                                        <TableCell>{run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
