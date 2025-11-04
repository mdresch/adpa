'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  BarChart3,
  Target,
  Loader2
} from 'lucide-react';

interface AssessmentData {
  batchId: string;
  projectId: string;
  projectName: string;
  overallMaturityLevel: number;
  overallMaturityLabel: string;
  averageQualityScore: number;
  totalDocuments: number;
  documentsByType: {
    type: string;
    count: number;
    avgScore: number;
    status: string;
  }[];
  gaps: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    documentType: string;
    currentLevel: number;
    targetLevel: number;
    description: string;
    recommendations: string[];
    estimatedEffort: string;
  }[];
  benchmarks: {
    industryAverage: number;
    topPerformers: number;
    yourScore: number;
    percentile: number;
  };
  roiMetrics: {
    currentCost: number;
    improvedCost: number;
    savings: number;
    roi: number;
    paybackPeriod: string;
  };
}

export default function AssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAssessment();
  }, [batchId]);

  const loadAssessment = async () => {
    try {
      const response = await fetch(`/api/assessment/${batchId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load assessment');
      }

      const data = await response.json();
      setAssessment(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'csv' | 'json') => {
    setExporting(true);
    try {
      const response = await fetch(`/api/assessment/${batchId}/export?format=${format}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${batchId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Assessment not found'}</p>
            <Button onClick={() => router.push('/onboarding/upload')} className="mt-4">
              Return to Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maturityColor = {
    1: 'text-red-600',
    2: 'text-orange-600',
    3: 'text-blue-600',
    4: 'text-green-600',
    5: 'text-purple-600'
  }[assessment.overallMaturityLevel] || 'text-gray-600';

  const priorityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Portfolio Maturity Assessment</h1>
          <p className="text-muted-foreground">{assessment.projectName}</p>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => exportReport('csv')}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('json')}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          <Button
            onClick={() => exportReport('pdf')}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maturity Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${maturityColor}`}>
              {assessment.overallMaturityLevel}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {assessment.overallMaturityLabel}
            </p>
            <Progress 
              value={(assessment.overallMaturityLevel / 5) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
              {assessment.averageQualityScore?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across all documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {assessment.totalDocuments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assessed and classified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gaps Identified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">
              {assessment.gaps.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="roi">ROI</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maturity Assessment</CardTitle>
              <CardDescription>
                Your organization has achieved Level {assessment.overallMaturityLevel} maturity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map(level => (
                  <div key={level} className="flex items-center gap-4">
                    <div className="w-24 font-medium">Level {level}</div>
                    <div className="flex-1">
                      <Progress 
                        value={assessment.overallMaturityLevel >= level ? 100 : 0}
                        className="h-8"
                      />
                    </div>
                    {assessment.overallMaturityLevel === level && (
                      <Badge>Current</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Breakdown</CardTitle>
              <CardDescription>
                {assessment.totalDocuments} documents assessed across {assessment.documentsByType?.length || 0} types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assessment.documentsByType?.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">{doc.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {doc.count} document{doc.count > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{doc.avgScore.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gap Analysis</CardTitle>
              <CardDescription>
                {assessment.gaps?.length || 0} gaps identified requiring improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assessment.gaps?.map((gap, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[gap.priority]}>
                          {gap.priority}
                        </Badge>
                        <span className="font-medium">{gap.documentType}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Level {gap.currentLevel} → {gap.targetLevel}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {gap.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Estimated effort: {gap.estimatedEffort}
                    </div>
                    {gap.recommendations.length > 0 && (
                      <ul className="mt-2 text-sm space-y-1">
                        {gap.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmarks</CardTitle>
              <CardDescription>
                You're in the {assessment.benchmarks?.percentile || 0}th percentile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {assessment.benchmarks?.yourScore?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Your Score</div>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-600">
                    {assessment.benchmarks?.industryAverage?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Industry Average</div>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {assessment.benchmarks?.topPerformers?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Top Performers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROI Tab */}
        <TabsContent value="roi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Return on Investment</CardTitle>
              <CardDescription>
                Potential value from improving documentation maturity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${assessment.roiMetrics?.savings?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Potential Savings</div>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {assessment.roiMetrics?.roi?.toFixed(0) || '0'}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">ROI</div>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {assessment.roiMetrics?.paybackPeriod || 'Calculating...'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Payback Period</div>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    ${assessment.roiMetrics?.improvedCost?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Target Cost</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

