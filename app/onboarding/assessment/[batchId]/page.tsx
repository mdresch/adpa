'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaturityCard } from '@/components/onboarding/MaturityCard';
import { MaturityScore } from '@/components/onboarding/MaturityScore';
import { MaturityJourneyPlanner } from '@/components/onboarding/MaturityJourneyPlanner';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  BarChart3,
  Target,
  Loader2,
  Upload,
  RefreshCw,
  Plus
} from '@/components/ui/icons-shim';

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
    recommendations?: string[];
    recommendation?: string;
    estimatedEffort?: string;
    estimated_improvement_points?: number;
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
  const router = useRouter();
  
  // Get batchId from URL
  const [batchId, setBatchId] = useState<string>('');
  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    setBatchId(id);
  }, []);
  
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [addingDocuments, setAddingDocuments] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [processingNewDocuments, setProcessingNewDocuments] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [uploadedFileCount, setUploadedFileCount] = useState(0);

  useEffect(() => {
    loadAssessment();
  }, [batchId]);

  const loadAssessment = async (retryCount = 0) => {
    try {
      const response = await fetch(`/api/assessment/batch/${batchId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load assessment');
      }

      const data = await response.json();
      setAssessment(data.data);
    } catch (err: any) {
      // Retry up to 3 times if connection fails (backend might be restarting)
      if (retryCount < 3 && (err.message.includes('fetch') || err.message.includes('network'))) {
        console.log(`Retrying assessment load (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => loadAssessment(retryCount + 1), 2000);
        return;
      }
      setError(err.message);
      setLoading(false);
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  };

  const handleAddDocuments = () => {
    setUploadDialogOpen(true);
  };

  const handleUploadAdditionalDocuments = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    try {
      setUploading(true);
      setUploadedFileCount(selectedFiles.length);

      const formData = new FormData();
      Array.from(selectedFiles).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/onboarding/batch/${batchId}/add-documents`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to upload documents');
      }

      const result = await response.json();
      
      // Close dialog and show processing screen
      setUploadDialogOpen(false);
      setSelectedFiles(null);
      setProcessingNewDocuments(true);
      setProcessingStatus('Uploading and analyzing documents...');
      
      // Simulate progress updates
      setTimeout(() => setProcessingStatus('Converting to Markdown...'), 2000);
      setTimeout(() => setProcessingStatus('Detecting document types...'), 5000);
      setTimeout(() => setProcessingStatus('Running quality audits...'), 10000);
      setTimeout(() => {
        setProcessingStatus('Processing complete! Click "Regenerate Assessment" to update results.');
        setProcessingNewDocuments(false);
      }, 15000);

    } catch (err: any) {
      console.error('Upload error:', err);
      alert(`Failed to upload documents: ${err.message}`);
      setProcessingNewDocuments(false);
    } finally {
      setUploading(false);
    }
  };

  const handleRegenerateAssessment = async () => {
    if (!confirm('Regenerate assessment with all documents?\n\nThis will recalculate all metrics and may take a few minutes.')) {
      return;
    }

    try {
      setRegenerating(true);

      const response = await fetch(`/api/assessment/batch/${batchId}/regenerate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate assessment');
      }

      const result = await response.json();
      
      alert(`Assessment regenerated successfully!\n\nNow includes ${result.data.total_documents} documents.`);
      
      // Reload the assessment
      await loadAssessment();

    } catch (err: any) {
      console.error('Regenerate error:', err);
      alert(`Failed to regenerate assessment: ${err.message}`);
    } finally {
      setRegenerating(false);
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

  // Show processing screen when adding new documents
  if (processingNewDocuments) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Loader2 className="h-20 w-20 animate-spin text-blue-600" />
                <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-blue-900">
              Processing Additional Documents
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Adding {uploadedFileCount} document(s) to your assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  ⏳
                </div>
                <p className="text-lg font-semibold text-blue-900">{processingStatus}</p>
              </div>
            </div>

            <div className="space-y-3 bg-white p-6 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-sm text-blue-900 mb-4">Processing Steps:</h3>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">Documents uploaded successfully</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-blue-500 rounded-full flex-shrink-0 animate-spin" />
                <span className="text-sm">Converting to Markdown and analyzing...</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                <span className="text-sm">Running quality audits</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                <span className="text-sm">Ready for assessment regeneration</span>
              </div>
            </div>

            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setProcessingNewDocuments(false);
                  loadAssessment();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                View Current Assessment
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              This typically takes 2-3 minutes. Once complete, click "Regenerate Assessment" to update your results.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Show processing view if assessment data isn't ready yet
  const isProcessing = !assessment.documentsByType || 
                       assessment.documentsByType?.length === 0 ||
                       !assessment.gaps ||
                       !assessment.benchmarks ||
                       !assessment.roiMetrics;

  if (isProcessing) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              Assessment Processing...
            </CardTitle>
            <CardDescription>
              Your documents are being analyzed. This typically takes 2-3 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold mb-2">Processing {assessment.totalDocuments} Documents</h3>
              <p className="text-muted-foreground mb-6">
                AI is analyzing document types, quality scores, and maturity levels
              </p>
              
              <div className="max-w-md mx-auto space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Documents uploaded successfully</span>
                </div>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500 flex-shrink-0" />
                  <span>Converting to Markdown and analyzing...</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                  <span>Generating gap analysis</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                  <span>Calculating benchmarks and ROI</span>
                </div>
              </div>

              <div className="mt-8 flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push('/onboarding/assessments')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Back to Assessments List
                </Button>
                <Button
                  variant="outline"
                  onClick={() => loadAssessment()}
                >
                  Refresh Status
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                The page will check for updates automatically.
                <br />
                Check the Assessments list to see processing progress.
              </p>
            </div>
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
            onClick={handleAddDocuments}
            disabled={addingDocuments}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add More Documents
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerateAssessment}
            disabled={regenerating}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate Assessment
          </Button>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <MaturityCard variant="info" hover glow className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                Maturity Level
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <MaturityScore
                level={assessment.overallMaturityLevel as 1 | 2 | 3 | 4 | 5}
                label={assessment.overallMaturityLabel}
                size="lg"
                animated
                showProgress
              />
            </CardContent>
          </MaturityCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MaturityCard variant="elevated" hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{ color: maturityTheme.colors.info.text }}>
                {assessment.averageQualityScore?.toFixed(1) || '0.0'}
              </div>
              <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                Average across all documents
              </p>
            </CardContent>
          </MaturityCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MaturityCard variant="default" hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                {assessment.totalDocuments}
              </div>
              <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                Assessed and classified
              </p>
            </CardContent>
          </MaturityCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MaturityCard variant="warning" hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                Gaps Identified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{ color: maturityTheme.colors.warning.text }}>
                {assessment.gaps.length}
              </div>
              <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                Requiring attention
              </p>
            </CardContent>
          </MaturityCard>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="journey">Your Journey</TabsTrigger>
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

        {/* Your Journey Tab */}
        <TabsContent value="journey" className="space-y-4">
          <MaturityJourneyPlanner
            currentLevel={assessment.overallMaturityLevel as 1 | 2 | 3 | 4 | 5}
            currentLevelName={assessment.overallMaturityLabel}
            achievementsAtCurrentLevel={[
              `Processed and analyzed ${assessment.totalDocuments} PM documents`,
              `Achieved ${assessment.averageQualityScore.toFixed(1)}% average quality score`,
              `Identified ${assessment.gaps.length} improvement opportunities`,
              `Established baseline maturity metrics`,
              ...(assessment.overallMaturityLevel >= 2 ? ['Repeatable processes documented'] : []),
              ...(assessment.overallMaturityLevel >= 3 ? ['Standardized PM methodology in place'] : []),
              ...(assessment.overallMaturityLevel >= 4 ? ['Quantitative process management'] : []),
              ...(assessment.overallMaturityLevel >= 5 ? ['Continuous improvement culture'] : [])
            ]}
            onSelectTargetLevel={(level) => {
              console.log(`Target maturity level selected: ${level}`);
              // Could trigger analytics or save preference
            }}
          />
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
                      Estimated effort: {gap.estimatedEffort || gap.estimated_improvement_points ? `${gap.estimated_improvement_points?.toFixed(1)} points` : 'Medium'}
                    </div>
                    {gap.recommendations && gap.recommendations.length > 0 && (
                      <ul className="mt-2 text-sm space-y-1">
                        {gap.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {gap.recommendation && !gap.recommendations && (
                      <div className="mt-2 text-sm flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>{gap.recommendation}</span>
                      </div>
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

      {/* Add Documents Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Add More Documents to Assessment</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload additional documents to enhance your assessment. The system will process them and you can regenerate the assessment with all documents included.
              </p>
            </div>
          
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="additional-files">Select Documents</Label>
                <Input
                  id="additional-files"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.markdown"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedFiles(e.target.files)}
                  className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOC, DOCX, TXT, MD (up to 100 files, 10MB each)
              </p>
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    {selectedFiles.length} file(s) selected:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {Array.from(selectedFiles).map((file, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFiles(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadAdditionalDocuments}
              disabled={uploading || !selectedFiles || selectedFiles.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Documents
                </>
              )}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

