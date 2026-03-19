"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectPhaseRoadmap } from './components/ProjectPhaseRoadmap';
import { AgentRunMonitor } from '@/app/agent-workspace/components/AgentRunMonitor'; // Reusing from global workspace

export default function ProjectAgentsPage({ params }: { params: { id: string } }) {
    const projectId = params.id;

    const handleStartRun = () => {
        // Logic to call POST /api/agents/project/:id/run
        console.log(`Starting new orchestration run for project ${projectId}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Agent Orchestration</h1>
                <Button onClick={handleStartRun}>Start New Run</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>10-Phase Project Lifecycle</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProjectPhaseRoadmap />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Active Run Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                    <AgentRunMonitor />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Run History</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">List of past runs for this project will appear here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
