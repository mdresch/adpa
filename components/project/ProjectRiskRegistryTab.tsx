"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle, Shield, TrendingUp, CheckCircle2, Clock, RefreshCw,
  Download, BarChart3, PieChart as PieChartIcon, Calendar, DollarSign, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { getApiUrl } from '@/lib/api-url';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  risk_level: string;
  status: string;
  mitigation_strategy?: string;
  contingency_plan?: string;
  owner?: string;
  project_id?: string;
  project_name?: string;
  financial_impact?: number;
  schedule_impact_days?: number;
  mitigation_plan_count?: number;
  completed_mitigation_count?: number;
  avg_mitigation_completion?: number;
  overall_mitigation_completion?: number;
  related_issues_count?: number;
  active_related_issues_count?: number;
  // Document source tracking
  source_document_id?: string;
  source_document_name?: string;
  risk_origin?: string;
  created_at: string;
  updated_at: string;
}

interface MitigationPlan {
  risk_id: string;
  risk_title: string;
  risk_category: string;
  probability: string;
  impact: string;
  risk_status: string;
  mitigation_plan_id: string;
  mitigation_title: string;
  action_type: string;
  mitigation_status: string;
  completion_percentage: number;
  mitigation_priority: string;
  expected_effectiveness?: number;
  owner_name?: string;
  assigned_to_name?: string;
  planned_start_date?: string;
  planned_completion_date?: string;
  actual_start_date?: string;
  actual_completion_date?: string;
  due_date?: string;
  is_overdue: boolean;
  mitigation_created_at: string;
  mitigation_updated_at: string;
}

interface RiskSummary {
  total_risks: number;
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  open_risks: number;
  mitigated_risks: number;
  closed_risks: number;
  total_financial_exposure: number;
  avg_probability_score: number;
  overdue_reviews: number;
  risks_needing_review: number;
  risks_exceeding_threshold: number;
  total_mitigation_plans: number;
  completed_mitigation_plans: number;
  avg_mitigation_completion: number;
}

interface ReviewCompliance {
  review_month: string;
  total_active_risks: number;
  reviewed_this_month: number;
  not_reviewed_this_month: number;
  never_reviewed: number;
  overdue_reviews: number;
  completed_reviews: number;
  pending_reviews: number;
  compliance_percentage: number;
  compliance_status: string;
}

interface ProjectRiskRegistryTabProps {
  projectId: string;
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const STATUS_COLORS = {
  identified: '#6b7280',
  assessed: '#3b82f6',
  mitigated: '#22c55e',
  accepted: '#f59e0b',
  transferred: '#8b5cf6',
  closed: '#9ca3af',
};

export function ProjectRiskRegistryTab({ projectId }: ProjectRiskRegistryTabProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"registry" | "mitigation" | "summary" | "compliance">("registry");
  
  // Registry data
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loadingRisks, setLoadingRisks] = useState(false);
  
  // Mitigation report data
  const [mitigationPlans, setMitigationPlans] = useState<MitigationPlan[]>([]);
  const [loadingMitigation, setLoadingMitigation] = useState(false);
  
  // Summary data
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Compliance data
  const [compliance, setCompliance] = useState<ReviewCompliance[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  
  // Filters
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Fetch risk registry
  const fetchRiskRegistry = async () => {
    try {
      setLoadingRisks(true);
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      if (riskLevelFilter) params.append('risk_level', riskLevelFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`${getApiUrl('/risks/registry')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Risk registry API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || errorData.message || `Failed to fetch risk registry: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      let risksData = data.data || [];
      
      // If no risks found in registry view (which excludes closed/mitigated), 
      // fall back to querying the base risks table directly
      if (risksData.length === 0) {
        try {
          const fallbackResponse = await apiClient.get(`/projects/${projectId}/risks`);
          if (fallbackResponse && Array.isArray(fallbackResponse)) {
            risksData = fallbackResponse;
          } else if (fallbackResponse?.data && Array.isArray(fallbackResponse.data)) {
            risksData = fallbackResponse.data;
          }
        } catch (fallbackError) {
          console.warn("Fallback risk fetch failed:", fallbackError);
          // Continue with empty array
        }
      }
      
      setRisks(risksData);
    } catch (error: any) {
      console.error("Failed to fetch risk registry:", error);
      const errorMessage = error?.message || error?.toString() || "Failed to load risk registry";
      toast.error(errorMessage);
      // Set empty array on error to prevent UI issues
      setRisks([]);
    } finally {
      setLoadingRisks(false);
    }
  };

  // Fetch mitigation report
  const fetchMitigationReport = async () => {
    try {
      setLoadingMitigation(true);
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      if (statusFilter) params.append('status', statusFilter);
      if (overdueOnly) params.append('overdue_only', 'true');
      
      const response = await fetch(`${getApiUrl('/risks/report')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch mitigation report');
      
      const data = await response.json();
      setMitigationPlans(data.data || []);
    } catch (error) {
      console.error("Failed to fetch mitigation report:", error);
      toast.error("Failed to load mitigation report");
    } finally {
      setLoadingMitigation(false);
    }
  };

  // Fetch risk summary
  const fetchRiskSummary = async () => {
    try {
      setLoadingSummary(true);
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      
      const response = await fetch(`${getApiUrl('/risks/summary')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch risk summary');
      
      const data = await response.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        setSummary(data.data[0]);
      } else {
        setSummary(null);
      }
    } catch (error) {
      console.error("Failed to fetch risk summary:", error);
      toast.error("Failed to load risk summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch review compliance
  const fetchReviewCompliance = async () => {
    try {
      setLoadingCompliance(true);
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      
      const response = await fetch(`${getApiUrl('/risks/review-compliance')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch review compliance');
      
      const data = await response.json();
      setCompliance(data.data || []);
    } catch (error) {
      console.error("Failed to fetch review compliance:", error);
      toast.error("Failed to load review compliance");
    } finally {
      setLoadingCompliance(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRiskRegistry();
    } else if (activeTab === "mitigation") {
      fetchMitigationReport();
    } else if (activeTab === "summary") {
      fetchRiskSummary();
    } else if (activeTab === "compliance") {
      fetchReviewCompliance();
    }
  }, [activeTab, projectId, riskLevelFilter, statusFilter, overdueOnly]);

  const severityData = summary ? [
    { name: 'Critical', value: summary.critical_risks, color: SEVERITY_COLORS.critical },
    { name: 'High', value: summary.high_risks, color: SEVERITY_COLORS.high },
    { name: 'Medium', value: summary.medium_risks, color: SEVERITY_COLORS.medium },
    { name: 'Low', value: summary.low_risks, color: SEVERITY_COLORS.low },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Risk Registry & Reporting</h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive risk management with mitigation tracking for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            if (activeTab === "registry") fetchRiskRegistry();
            else if (activeTab === "mitigation") fetchMitigationReport();
            else if (activeTab === "summary") fetchRiskSummary();
            else if (activeTab === "compliance") fetchReviewCompliance();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Risks</p>
                  <p className="text-2xl font-bold">{summary.total_risks}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Risks</p>
                  <p className="text-2xl font-bold text-red-500">{summary.critical_risks}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mitigation Plans</p>
                  <p className="text-2xl font-bold">{summary.total_mitigation_plans}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                  <p className="text-2xl font-bold">
                    {summary.total_mitigation_plans > 0
                      ? Math.round(summary.avg_mitigation_completion)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="registry">Risk Registry</TabsTrigger>
          <TabsTrigger value="mitigation">Mitigation Report</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="compliance">Review Compliance</TabsTrigger>
        </TabsList>

        {/* Risk Registry Tab */}
        <TabsContent value="registry" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Risk Registry</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={riskLevelFilter || "all"} onValueChange={(v: string) => setRiskLevelFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="program">Program</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="systemic">Systemic</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter || "all"} onValueChange={(v: string) => setStatusFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="identified">Identified</SelectItem>
                      <SelectItem value="assessed">Assessed</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRisks ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : risks.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No risks found for this project</p>
                  <p className="text-sm text-muted-foreground">
                    {statusFilter || riskLevelFilter 
                      ? "Try adjusting your filters or create a new risk."
                      : "Risks can be created manually or extracted from project documents."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Source Document</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mitigation Completion</TableHead>
                      <TableHead>Related Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.map((risk) => {
                      const documentId = risk.source_document_id;
                      const documentName = risk.source_document_name;
                      const isExtracted = documentId && risk.risk_origin === 'project-extraction';
                      
                      return (
                        <TableRow key={risk.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <span>{risk.title}</span>
                              {risk.description && (
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {risk.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isExtracted && documentId ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700"
                                  onClick={() => {
                                    router.push(`/projects/${risk.project_id}/documents/${documentId}`);
                                  }}
                                  title={`View source document: ${documentName || 'Document'}`}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  <span className="max-w-[150px] truncate">
                                    {documentName || 'View Document'}
                                  </span>
                                </Button>
                                <Badge variant="secondary" className="text-xs">
                                  Extracted
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Manual entry</span>
                            )}
                          </TableCell>
                          <TableCell>{risk.category || '-'}</TableCell>
                          <TableCell>{risk.probability || '-'}</TableCell>
                          <TableCell>{risk.impact || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{risk.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {risk.overall_mitigation_completion !== undefined ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${risk.overall_mitigation_completion}%` }}
                                  />
                                </div>
                                <span className="text-sm">{Math.round(risk.overall_mitigation_completion)}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {risk.active_related_issues_count ? (
                              <Badge variant="destructive">{risk.active_related_issues_count} active</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mitigation Report Tab */}
        <TabsContent value="mitigation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mitigation Report</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter || "all"} onValueChange={(v: string) => setStatusFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="identified">Identified</SelectItem>
                      <SelectItem value="assessed">Assessed</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="overdue-only"
                      checked={overdueOnly}
                      onChange={(e) => setOverdueOnly(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="overdue-only" className="cursor-pointer">Overdue Only</Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMitigation ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : mitigationPlans.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No mitigation plans found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead>Mitigation Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mitigationPlans.map((plan) => (
                      <TableRow key={plan.mitigation_plan_id}>
                        <TableCell className="font-medium">{plan.risk_title}</TableCell>
                        <TableCell>{plan.mitigation_title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{plan.mitigation_status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${plan.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm">{plan.completion_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{plan.assigned_to_name || '-'}</TableCell>
                        <TableCell>
                          {plan.due_date ? new Date(plan.due_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {plan.is_overdue ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          {loadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risks by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  {severityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">No severity data available</div>
                  )}
                </CardContent>
              </Card>
              {summary.total_financial_exposure > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Exposure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-red-500">
                          ${(summary.total_financial_exposure / 1000).toFixed(1)}K
                        </p>
                        <p className="text-muted-foreground mt-2">Total Financial Exposure</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No summary data available</p>
            </div>
          )}
        </TabsContent>

        {/* Review Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          {loadingCompliance ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : compliance.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Review Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Review Month</TableHead>
                      <TableHead>Total Active Risks</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead>Not Reviewed</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Compliance %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compliance.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.review_month}</TableCell>
                        <TableCell>{item.total_active_risks}</TableCell>
                        <TableCell>{item.reviewed_this_month}</TableCell>
                        <TableCell>{item.not_reviewed_this_month}</TableCell>
                        <TableCell>
                          {item.overdue_reviews > 0 ? (
                            <Badge variant="destructive">{item.overdue_reviews}</Badge>
                          ) : (
                            <span>0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  item.compliance_percentage >= 80 ? 'bg-green-600' :
                                  item.compliance_percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${item.compliance_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm">{item.compliance_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.compliance_status === 'compliant' ? 'default' :
                              item.compliance_status === 'at_risk' ? 'secondary' : 'destructive'
                            }
                          >
                            {item.compliance_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No compliance data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

