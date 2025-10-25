"use client"

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { PageTransition } from '@/components/page-transition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsDashboard } from '@/components/program/MetricsDashboard';
import { ProgramMetrics } from '@/components/program/types';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

// Mock data for demonstration purposes
// In production, this would come from the API
const mockProgramMetrics: ProgramMetrics = {
  budget: {
    planned: 10000000,
    actual: 8500000,
    forecast: 9500000,
    variance: -1500000,
    timeline: [
      { month: 'Sep', planned: 2000000, actual: 2100000 },
      { month: 'Oct', planned: 4000000, actual: 3800000 },
      { month: 'Nov', planned: 6000000, actual: 6000000, forecast: 6500000 },
      { month: 'Dec', planned: 8000000, actual: 7500000, forecast: 8500000 },
      { month: 'Jan', planned: 10000000, actual: 8500000, forecast: 9500000 }
    ]
  },
  status: {
    total: 5,
    breakdown: {
      green: 3,
      amber: 1,
      red: 1
    }
  },
  risks: [
    {
      id: '1',
      title: 'Resource Shortage',
      description: 'Critical staff shortage expected in Q2 due to competing priorities',
      probability: 75,
      impact: 500000,
      severity: 'high'
    },
    {
      id: '2',
      title: 'Technology Risk',
      description: 'New framework adoption may cause delays',
      probability: 50,
      impact: 250000,
      severity: 'medium'
    },
    {
      id: '3',
      title: 'Vendor Dependency',
      description: 'Third-party vendor stability concerns',
      probability: 30,
      impact: 150000,
      severity: 'low'
    },
    {
      id: '4',
      title: 'Integration Complexity',
      description: 'Legacy system integration more complex than anticipated',
      probability: 60,
      impact: 400000,
      severity: 'high'
    }
  ],
  milestones: [
    {
      id: '1',
      name: 'Project Kickoff',
      plannedDate: '2024-09-01',
      actualDate: '2024-09-01',
      status: 'completed'
    },
    {
      id: '2',
      name: 'Requirements Complete',
      plannedDate: '2024-10-15',
      actualDate: '2024-10-20',
      status: 'completed'
    },
    {
      id: '3',
      name: 'Design Review',
      plannedDate: '2024-11-30',
      actualDate: '2024-11-28',
      status: 'completed'
    },
    {
      id: '4',
      name: 'Development Phase 1',
      plannedDate: '2024-12-31',
      status: 'on-track'
    },
    {
      id: '5',
      name: 'UAT Complete',
      plannedDate: '2025-01-31',
      status: 'on-track'
    },
    {
      id: '6',
      name: 'Go-Live',
      plannedDate: '2025-02-28',
      status: 'on-track'
    }
  ]
};

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = params?.id as string;
  
  const [metrics, setMetrics] = useState<ProgramMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchProgramMetrics = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call when backend is ready
        // const data = await apiClient.getProgramMetrics(programId);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use mock data for now
        setMetrics(mockProgramMetrics);
      } catch (error) {
        console.error('Failed to fetch program metrics:', error);
        toast.error('Failed to load program metrics');
      } finally {
        setLoading(false);
      }
    };

    if (programId) {
      fetchProgramMetrics();
    }
  }, [programId]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <PageTransition>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Program Overview
                </h1>
                <p className="text-muted-foreground mt-2">
                  Monitor program health, budget, risks, and milestones
                </p>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* Overview Tab with Metrics Dashboard */}
                <TabsContent value="overview" className="mt-6">
                  {metrics ? (
                    <MetricsDashboard 
                      metrics={metrics} 
                      programId={programId}
                      loading={loading}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading program data...</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Projects Tab - Placeholder */}
                <TabsContent value="projects" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Program Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Project list will be displayed here
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Risks Tab - Placeholder */}
                <TabsContent value="risks" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Register</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Detailed risk register will be displayed here
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Reports Tab - Placeholder */}
                <TabsContent value="reports" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Program Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Report generation and history will be displayed here
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
