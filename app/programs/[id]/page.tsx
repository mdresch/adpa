"use client"

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { PageTransition } from '@/components/page-transition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsDashboard } from '@/components/program/MetricsDashboard';
import { ProgramProjectsTab } from '@/components/program/ProgramProjectsTab';
import { ProgramMetrics } from '@/components/program/types';
import FinancialDashboard from '@/components/program/FinancialDashboard';
import { ProgramRisksTab } from '@/components/program/ProgramRisksTab';
import { ProgramReportsTab } from '@/components/program/ProgramReportsTab';
import { Loader2, Archive, ArchiveRestore, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

interface Program {
  id: string
  name: string
  description: string
  status: string
  budget?: number
  start_date: string
  end_date: string
  owner_name?: string
}

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params?.id as string;
  
  const [program, setProgram] = useState<Program | null>(null);
  const [metrics, setMetrics] = useState<ProgramMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [archiving, setArchiving] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveCheck, setArchiveCheck] = useState<{ canArchive: boolean; reason?: string; unarchivedCount?: number } | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    const fetchProgramData = async () => {
      try {
        setLoading(true);
        
        // Fetch program details using apiClient
        const programData = await apiClient.getProgram(programId);
        setProgram(programData);
        
        // Fetch program metrics (use existing endpoint)
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000/api'
          const metricsResponse = await fetch(`${apiUrl}/programs/${programId}/metrics`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            console.log('[METRICS] Raw API response:', metricsData);
            
            if (metricsData.success && metricsData.data) {
              const backendMetrics = metricsData.data;
              
              // Transform backend response to frontend format
              const transformedMetrics: ProgramMetrics = {
                budget: backendMetrics.budget || {
                  planned: 0,
                  actual: 0,
                  forecast: 0,
                  variance: 0,
                  timeline: []
                },
                status: {
                  total: backendMetrics.status?.total || backendMetrics.projects?.total || 0,
                  breakdown: backendMetrics.status?.breakdown || {
                    green: 0,
                    amber: 0,
                    red: 0
                  }
                },
                risks: backendMetrics.risks || [],
                milestones: backendMetrics.milestones || []
              };
              
              console.log('[METRICS] Transformed metrics:', transformedMetrics);
              setMetrics(transformedMetrics);
            } else {
              console.warn('[METRICS] Invalid response format, using mock data');
              setMetrics(mockProgramMetrics);
            }
          } else {
            const errorText = await metricsResponse.text();
            console.error('[METRICS] API error:', metricsResponse.status, errorText);
            // Fallback to mock data if metrics endpoint not ready
            setMetrics(mockProgramMetrics);
          }
        } catch (error) {
          console.error('[METRICS] Failed to fetch metrics:', error);
          // Use mock data if metrics endpoint fails
          setMetrics(mockProgramMetrics);
        }
        
      } catch (error) {
        console.error('Failed to fetch program data:', error);
        toast.error('Failed to load program');
      } finally {
        setLoading(false);
      }
    };

    if (programId) {
      void fetchProgramData();
    }
  }, [programId]);

  // Separate useEffect to fetch assigned projects independently
  useEffect(() => {
    if (programId) {
      void fetchAssignedProjects();
    }
  }, [programId]);

  const fetchAssignedProjects = async () => {
    try {
      setProjectsLoading(true);
      const response = await apiClient.get<{
        success: boolean
        data: Array<{ id: string; name: string; status: string }>
      }>(`/programs/${programId}/projects`);
      
      if (response && response.success && response.data) {
        const projects = response.data.map((p: any) => ({
          id: p.id,
          name: p.name || 'Unnamed Project',
          status: p.status || 'active'
        }));
        
        console.log('[OVERVIEW] Mapped projects:', projects.length, 'projects');
        setAssignedProjects(projects);
      } else {
        setAssignedProjects([]);
      }
    } catch (error) {
      console.error('[OVERVIEW] Error fetching assigned projects:', error);
      setAssignedProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const checkArchiveStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/can-archive`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setArchiveCheck(data.data);
      }
    } catch (error) {
      console.error('Failed to check archive status:', error);
    }
  };

  const handleArchiveClick = async () => {
    await checkArchiveStatus();
    setShowArchiveDialog(true);
  };

  const handleArchiveConfirm = async () => {
    try {
      setArchiving(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive program');
      }
      
      toast.success('Program archived successfully');
      setShowArchiveDialog(false);
      
      // Refresh program data
      const programResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (programResponse.ok) {
        const programData = await programResponse.json();
        setProgram(programData.data);
      }
      
    } catch (error: any) {
      console.error('Failed to archive program:', error);
      toast.error(error.message || 'Failed to archive program');
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    try {
      setArchiving(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/unarchive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to unarchive program');
      }
      
      toast.success('Program unarchived successfully');
      
      // Refresh program data
      const programResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (programResponse.ok) {
        const programData = await programResponse.json();
        setProgram(programData.data);
      }
      
    } catch (error) {
      console.error('Failed to unarchive program:', error);
      toast.error('Failed to unarchive program');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-900 dark:via-blue-900/20 dark:to-cyan-900/20">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <PageTransition>
              {/* Header */}
              <div className="mb-8">
                {loading && !program ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent">
                      Loading Program...
                    </h1>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 bg-clip-text text-transparent">
                          Program Overview - {program?.name || 'Unknown Program'}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                          {program?.description || 'Monitor program health, budget, risks, and milestones'}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      {program && (
                        <div className="ml-4 flex gap-2">
                          <Button
                            onClick={() => router.push(`/programs/${programId}/settings`)}
                            variant="outline"
                            className="gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                          </Button>
                          {(program as any).archived ? (
                            <Button
                              onClick={handleUnarchive}
                              disabled={archiving}
                              variant="outline"
                              className="gap-2"
                            >
                              {archiving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ArchiveRestore className="h-4 w-4" />
                              )}
                              Unarchive Program
                            </Button>
                          ) : (
                            <Button
                              onClick={handleArchiveClick}
                              disabled={archiving}
                              variant="outline"
                              className="gap-2"
                            >
                              {archiving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                              Archive Program
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {program?.status && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge className={
                          program.status === 'green' ? 'bg-green-100 text-green-800 border-green-300' :
                          program.status === 'amber' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          'bg-red-100 text-red-800 border-red-300'
                        }>
                          {program.status === 'green' && '🟢'}
                          {program.status === 'amber' && '🟡'}
                          {program.status === 'red' && '🔴'}
                          {' '}{program.status.toUpperCase()}
                        </Badge>
                        {program.owner_name && (
                          <>
                            <span className="text-sm text-muted-foreground ml-4">Owner: {program.owner_name}</span>
                          </>
                        )}
                        {(program as any).archived && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-300 ml-4">
                            📦 ARCHIVED
                          </Badge>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Archive Confirmation Dialog */}
              <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {archiveCheck?.canArchive ? 'Archive Program?' : 'Cannot Archive Program'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {archiveCheck?.canArchive ? (
                        <>
                          Are you sure you want to archive this program? This will hide it from the active programs list, but it can be unarchived later.
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                              {archiveCheck?.reason || 'This program has unarchived projects.'}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            To archive this program, you must first archive all {archiveCheck?.unarchivedCount || 'its'} underlying project{archiveCheck?.unarchivedCount !== 1 ? 's' : ''}.
                          </p>
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {archiveCheck?.canArchive && (
                      <AlertDialogAction onClick={handleArchiveConfirm} disabled={archiving}>
                        {archiving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Archiving...
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive Program
                          </>
                        )}
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6 lg:w-[900px]">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="prioritize">Prioritize</TabsTrigger>
                  <TabsTrigger value="finances">Finances</TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* Overview Tab with Metrics Dashboard */}
                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Assigned Projects Summary Card */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl">Assigned Projects</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {projectsLoading ? 'Loading...' : `${assignedProjects.length} project${assignedProjects.length !== 1 ? 's' : ''} assigned to this program`}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveTab('projects')}
                            className="gap-2"
                          >
                            View All Projects
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {projectsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : assignedProjects.length > 0 ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {assignedProjects.slice(0, 6).map((project) => (
                                <div
                                  key={project.id}
                                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                  onClick={() => router.push(`/projects/${project.id}`)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{project.name}</p>
                                    <Badge 
                                      variant="outline" 
                                      className="mt-1 text-xs"
                                    >
                                      {project.status === 'completed' ? '✅ Completed' :
                                       project.status === 'active' ? '🔵 Active' :
                                       project.status === 'at_risk' ? '⚠️ At Risk' :
                                       project.status === 'on_hold' ? '⏸️ On Hold' :
                                       project.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {assignedProjects.length > 6 && (
                              <div className="text-center pt-2">
                                <Button 
                                  variant="ghost" 
                                  onClick={() => setActiveTab('projects')}
                                  className="text-sm"
                                >
                                  View {assignedProjects.length - 6} more project{assignedProjects.length - 6 !== 1 ? 's' : ''} →
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">No projects assigned yet</p>
                            <Button 
                              variant="outline" 
                              onClick={() => setActiveTab('projects')}
                            >
                              Assign Projects
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Metrics Dashboard */}
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
                          <p className="text-muted-foreground">Loading program metrics...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Projects Tab - Full Implementation */}
                <TabsContent value="projects" className="mt-6">
                  {programId ? (
                    <ProgramProjectsTab programId={programId} />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </TabsContent>

                {/* Prioritization Tab */}
                <TabsContent value="prioritize" className="mt-6">
                  {programId ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <h3 className="text-lg font-semibold mb-4">Portfolio Prioritization</h3>
                      <p className="text-muted-foreground mb-6 text-center max-w-md">
                        Score projects and view rankings to prioritize your portfolio based on strategic criteria.
                      </p>
                      <Button onClick={() => router.push(`/programs/${programId}/prioritize`)}>
                        Open Prioritization Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </TabsContent>

                {/* Finances Tab - Financial Management & EVM Dashboard */}
                <TabsContent value="finances" className="mt-6">
                  {programId ? (
                    <FinancialDashboard programId={programId} />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </TabsContent>

                {/* Risks Tab - Full Implementation */}
                <TabsContent value="risks" className="mt-6">
                  {programId ? (
                    <ProgramRisksTab programId={programId} />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </TabsContent>

                {/* Reports Tab - Full Implementation */}
                <TabsContent value="reports" className="mt-6">
                  {programId ? (
                    <ProgramReportsTab programId={programId} />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
