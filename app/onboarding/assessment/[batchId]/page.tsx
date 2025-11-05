'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle,
  CheckCircle2,
  FileText,
  BarChart3,
  Target,
  Loader2,
  Upload,
  RefreshCw,
  Plus
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
  const [addingDocuments, setAddingDocuments] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
        throw new Error('Failed to upload documents');
      }

      const result = await response.json();
      
      // Close dialog and show processing message
      setUploadDialogOpen(false);
      setSelectedFiles(null);
      
      alert(`${selectedFiles.length} document(s) uploaded successfully!\n\nProcessing will take 2-3 minutes.\n\nClick "Regenerate Assessment" when processing is complete.`);

    } catch (err: any) {
      console.error('Upload error:', err);
      alert(`Failed to upload documents: ${err.message}`);
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
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
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
                      Estimated effort: {gap.estimatedEffort || gap.estimated_improvement_points ? `${gap.estimated_improvement_points?.toFixed(1)} points` : 'Medium'}
                    </div>
                    {gap.recommendations && gap.recommendations.length > 0 && (
                      <ul className="mt-2 text-sm space-y-1">
                        {gap.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {gap.recommendation && !gap.recommendations && (
                      <div className="mt-2 text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
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
          <DialogHeader>
            <DialogTitle>Add More Documents to Assessment</DialogTitle>
            <DialogDescription>
              Upload additional documents to enhance your assessment. The system will process them and you can regenerate the assessment with all documents included.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="additional-files">Select Documents</Label>
              <Input
                id="additional-files"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.markdown"
                onChange={(e) => setSelectedFiles(e.target.files)}
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

          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

