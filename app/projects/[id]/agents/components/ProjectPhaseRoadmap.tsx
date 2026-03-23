"use client";
import React from 'react';

const PHASES = [
    { number: 1, name: "Project Discovery" },
    { number: 2, name: "Stakeholder Analysis" },
    { number: 3, name: "Scope & Requirements" },
    { number: 4, name: "Risk Assessment" },
    { number: 5, name: "Work Breakdown Structure" },
    { number: 6, name: "Resource & Timeline Planning" },
    { number: 7, name: "Integration & Sync" },
    { number: 8, name: "Quality & Governance" },
    { number: 9, name: "Execution Monitoring Setup" },
    { number: 10, name: "Synthesis & Reporting" },
];

export function ProjectPhaseRoadmap({ projectId, activeRunId }: { projectId: string; activeRunId: string | null }) {
    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Phase Roadmap</h3>
            <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-8">
                    {PHASES.map((phase, index) => (
                        <div key={phase.number} className="relative flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center z-10">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{phase.number}</span>
                            </div>
                            <div className="ml-4">
                                <h4 className="font-semibold">{phase.name}</h4>
                                <p className="text-sm text-muted-foreground">Status: Pending</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
