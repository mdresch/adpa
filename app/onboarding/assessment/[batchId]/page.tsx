'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
  Plus,
  ChevronRight,
  X
} from '@/components/ui/icons-shim';
import apiClient from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-url';

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
    documentTitle?: string;
    issueCategory?: string;
  }[];
  recommendations?: string[];
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
  assessment_data?: {
    breakdown?: {
      by_performance_domain?: Array<{
        domain?: string;
        name?: string;
        score?: number;
        maturity_level?: number;
      }>;
      by_document_type?: Record<string, any>;
    };
    domain_scores?: Array<{
      domain?: string;
      name?: string;
      score?: number;
      maturity_level?: number;
    }>;
    performance_domains?: Array<{
      domain?: string;
      name?: string;
      score?: number;
      maturity_level?: number;
    }>;
  };
}

type Gap = AssessmentData['gaps'][number];

export default function AssessmentResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // Get batchId from route params
  const batchId = params?.batchId as string || '';
  
  // Require authentication - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please register or log in to view assessment details');
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isAuthenticated, authLoading, router]);
  
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
  
  // Document dialogs state
  const [documentTypeDialogOpen, setDocumentTypeDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | null>(null);
  const [documentsOfType, setDocumentsOfType] = useState<any[]>([]);
  const [documentTypeAverages, setDocumentTypeAverages] = useState<any>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentDetailDialogOpen, setDocumentDetailDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [documentQualityAudit, setDocumentQualityAudit] = useState<any | null>(null);
  const [loadingDocumentDetails, setLoadingDocumentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [pendingGapDocument, setPendingGapDocument] = useState<{
    documentType: string;
    documentTitle?: string;
  } | null>(null);
  const [selectedBenchmarkIndustry, setSelectedBenchmarkIndustry] = useState<string>('industry');

  useEffect(() => {
    if (!isAuthenticated || !batchId) {
      return;
    }
    void loadAssessment();
  }, [batchId, isAuthenticated]);

  // Handler for clicking on a document type
  const handleDocumentTypeClick = async (documentType: string) => {
    setSelectedDocumentType(documentType);
    setDocumentTypeDialogOpen(true);
    setLoadingDocuments(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/assessment/batch/${batchId}/documents?type=${encodeURIComponent(documentType)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const result = await response.json();
      setDocumentsOfType(result.data || []);
      setDocumentTypeAverages(result.averages || null);

      // If this request was triggered from a gap click, attempt to auto-open the matching document
      if (pendingGapDocument && pendingGapDocument.documentType === documentType) {
        const matchingDoc = (result.data || []).find(
          (doc: any) =>
            doc.title === pendingGapDocument.documentTitle ||
            doc.originalFilename === pendingGapDocument.documentTitle
        );

        if (matchingDoc) {
          void handleDocumentClick(matchingDoc);
        }

        setPendingGapDocument(null);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
      setDocumentsOfType([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleGapClick = (gap: Gap) => {
    if (!gap.documentType) {
      return;
    }

    // Switch to Documents tab and open the related document type
    setActiveTab('documents');
    setPendingGapDocument({
      documentType: gap.documentType,
      documentTitle: gap.documentTitle,
    });
    void handleDocumentTypeClick(gap.documentType);
  };

  // Handler for clicking on a specific document
  const handleDocumentClick = async (document: any) => {
    setSelectedDocument(document);
    setDocumentDetailDialogOpen(true);
    setLoadingDocumentDetails(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/documents/${document.id}/quality-audit`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quality audit');
      }

      const result = await response.json();
      setDocumentQualityAudit(result.data || null);
    } catch (error: any) {
      console.error('Error fetching quality audit:', error);
      toast.error('Failed to load quality audit details');
      setDocumentQualityAudit(null);
    } finally {
      setLoadingDocumentDetails(false);
    }
  };

  const loadAssessment = async (retryCount = 0) => {
    if (!isAuthenticated || !batchId) {
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/assessment/batch/${batchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Authentication required. Please log in.');
          router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
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

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/onboarding/batch/${batchId}/add-documents`, {
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
    if (!isAuthenticated) {
      toast.error('Authentication required. Please log in.');
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    if (!confirm('Regenerate assessment with all documents?\n\nThis will recalculate all metrics and may take a few minutes.')) {
      return;
    }

    try {
      setRegenerating(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/assessment/batch/${batchId}/regenerate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    if (!isAuthenticated) {
      toast.error('Authentication required. Please log in.');
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    setExporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required. Please log in.');
        router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/assessment/${batchId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
      <div 
        className="container mx-auto p-6 max-w-4xl min-h-screen"
        style={{ 
          background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
        }}
      >
        <MaturityCard variant="elevated">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Loader2 className="h-20 w-20 animate-spin" style={{ color: maturityTheme.colors.info.text }} />
                <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8" style={{ color: maturityTheme.colors.info.text }} />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
              Processing Additional Documents
            </CardTitle>
            <CardDescription className="text-lg mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
              Adding {uploadedFileCount} document(s) to your assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2" style={{ color: maturityTheme.colors.info.text }}>
                  ⏳
                </div>
                <p className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                  {processingStatus}
                </p>
              </div>
            </div>

            <div 
              className="space-y-3 p-6 rounded-lg"
              style={{ 
                backgroundColor: maturityTheme.colors.background.tertiary,
                borderColor: maturityTheme.colors.border.default,
                borderWidth: '1px',
              }}
            >
              <h3 className="font-semibold text-sm mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                Processing Steps:
              </h3>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                <span className="text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                  Documents uploaded successfully
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="h-5 w-5 border-2 rounded-full flex-shrink-0 animate-spin"
                  style={{ borderColor: maturityTheme.colors.info.text }}
                />
                <span className="text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                  Converting to Markdown and analyzing...
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="h-5 w-5 border-2 rounded-full flex-shrink-0"
                  style={{ borderColor: maturityTheme.colors.text.muted }}
                />
                <span className="text-sm" style={{ color: maturityTheme.colors.text.muted }}>
                  Running quality audits
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="h-5 w-5 border-2 rounded-full flex-shrink-0"
                  style={{ borderColor: maturityTheme.colors.text.muted }}
                />
                <span className="text-sm" style={{ color: maturityTheme.colors.text.muted }}>
                  Ready for assessment regeneration
                </span>
              </div>
            </div>

            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setProcessingNewDocuments(false);
                  loadAssessment();
                }}
                style={{
                  borderColor: maturityTheme.colors.border.default,
                  color: maturityTheme.colors.text.primary,
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                View Current Assessment
              </Button>
            </div>

            <p className="text-xs text-center mt-4" style={{ color: maturityTheme.colors.text.muted }}>
              This typically takes 2-3 minutes. Once complete, click "Regenerate Assessment" to update your results.
            </p>
          </CardContent>
        </MaturityCard>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ 
          background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: maturityTheme.colors.info.text }} />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div 
        className="container mx-auto p-6 min-h-screen"
        style={{ 
          background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
        }}
      >
        <MaturityCard variant="elevated">
          <CardHeader>
            <CardTitle style={{ color: maturityTheme.colors.error.text }}>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: maturityTheme.colors.text.primary }}>{error || 'Assessment not found'}</p>
            <Button 
              onClick={() => router.push('/onboarding/upload')} 
              className="mt-4"
              style={{
                background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                color: 'white',
              }}
            >
              Return to Upload
            </Button>
          </CardContent>
        </MaturityCard>
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
      <div 
        className="container mx-auto p-6 max-w-4xl min-h-screen"
        style={{ 
          background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
        }}
      >
        <MaturityCard variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: maturityTheme.colors.info.text }} />
              Assessment Processing...
            </CardTitle>
            <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Your documents are being analyzed. This typically takes 2-3 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                Processing {assessment.totalDocuments} Documents
              </h3>
              <p className="mb-6" style={{ color: maturityTheme.colors.text.secondary }}>
                AI is analyzing document types, quality scores, and maturity levels
              </p>
              
              <div className="max-w-md mx-auto space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                  <span style={{ color: maturityTheme.colors.text.primary }}>Documents uploaded successfully</span>
                </div>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" style={{ color: maturityTheme.colors.info.text }} />
                  <span style={{ color: maturityTheme.colors.text.primary }}>Converting to Markdown and analyzing...</span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-5 w-5 border-2 rounded-full flex-shrink-0"
                    style={{ borderColor: maturityTheme.colors.text.muted }}
                  />
                  <span style={{ color: maturityTheme.colors.text.muted }}>Generating gap analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-5 w-5 border-2 rounded-full flex-shrink-0"
                    style={{ borderColor: maturityTheme.colors.text.muted }}
                  />
                  <span style={{ color: maturityTheme.colors.text.muted }}>Calculating benchmarks and ROI</span>
                </div>
              </div>

              <div className="mt-8 flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push('/onboarding/assessments')}
                  style={{
                    borderColor: maturityTheme.colors.border.default,
                    color: maturityTheme.colors.text.primary,
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Back to Assessments List
                </Button>
                <Button
                  variant="outline"
                  onClick={() => loadAssessment()}
                  style={{
                    borderColor: maturityTheme.colors.border.default,
                    color: maturityTheme.colors.text.primary,
                  }}
                >
                  Refresh Status
                </Button>
              </div>

              <p className="text-xs mt-6" style={{ color: maturityTheme.colors.text.muted }}>
                The page will check for updates automatically.
                <br />
                Check the Assessments list to see processing progress.
              </p>
            </div>
          </CardContent>
        </MaturityCard>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
      }}
    >
      <div className="container mx-auto p-6 max-w-7xl assessment-dark-theme">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <button
              onClick={() => router.push('/onboarding')}
              className="hover:underline"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Home
            </button>
          </li>
          <li style={{ color: maturityTheme.colors.text.muted }}>/</li>
          <li>
            <button
              onClick={() => router.push('/onboarding/assessments')}
              className="hover:underline"
              style={{ color: maturityTheme.colors.text.secondary }}
            >
              Assessments
            </button>
          </li>
          <li style={{ color: maturityTheme.colors.text.muted }}>/</li>
          <li style={{ color: maturityTheme.colors.text.primary }} className="font-medium">
            Assessment Details
          </li>
        </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
            Portfolio Maturity Assessment
          </h1>
          <p style={{ color: maturityTheme.colors.text.secondary }}>{assessment.projectName}</p>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={handleAddDocuments}
            disabled={addingDocuments}
            style={{
              borderColor: maturityTheme.colors.border.default,
              color: maturityTheme.colors.text.primary,
              backgroundColor: maturityTheme.colors.background.tertiary,
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add More Documents
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerateAssessment}
            disabled={regenerating}
            style={{
              borderColor: maturityTheme.colors.success.border,
              color: maturityTheme.colors.success.text,
              backgroundColor: maturityTheme.colors.success.bg,
            }}
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
            style={{
              borderColor: maturityTheme.colors.border.default,
              color: maturityTheme.colors.text.primary,
              backgroundColor: maturityTheme.colors.background.tertiary,
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('json')}
            disabled={exporting}
            style={{
              borderColor: maturityTheme.colors.border.default,
              color: maturityTheme.colors.text.primary,
              backgroundColor: maturityTheme.colors.background.tertiary,
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          <Button
            onClick={() => exportReport('pdf')}
            disabled={exporting}
            style={{
              background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
              color: 'white',
            }}
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
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          className="space-y-4"
        >
        <TabsList 
          style={{ 
            backgroundColor: maturityTheme.colors.background.tertiary,
            borderColor: maturityTheme.colors.border.default,
          }}
        >
          <TabsTrigger 
            value="overview"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="journey"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Your Journey
          </TabsTrigger>
          <TabsTrigger 
            value="documents"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Documents
          </TabsTrigger>
          <TabsTrigger 
            value="gaps"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Gaps
          </TabsTrigger>
          <TabsTrigger 
            value="recommendations"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Recommendations
          </TabsTrigger>
          <TabsTrigger 
            value="benchmarks"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Benchmarks
          </TabsTrigger>
          <TabsTrigger 
            value="roi"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            ROI
          </TabsTrigger>
          <TabsTrigger 
            value="domains"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Performance Domains
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Maturity Assessment</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                Your organization has achieved Level {assessment.overallMaturityLevel} maturity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(() => {
                  const roundedLevel = Math.round(assessment.overallMaturityLevel || 0);
                  return [1, 2, 3, 4, 5].map(level => (
                    <div key={level} className="flex items-center gap-4">
                      <div className="w-24 font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                        Level {level}
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={assessment.overallMaturityLevel >= level ? 100 : 0}
                          className="h-8"
                        />
                      </div>
                      {roundedLevel === level && (
                        <Badge style={{ 
                          backgroundColor: maturityTheme.colors.info.bg,
                          color: maturityTheme.colors.info.text,
                          borderColor: maturityTheme.colors.info.border
                        }}>
                          Current
                        </Badge>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </MaturityCard>

          {/* Current Level Explanation */}
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>
                What Level {assessment.overallMaturityLevel} Means
              </CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                Understanding your current maturity level: {assessment.overallMaturityLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Ensure we have a valid maturity level (1-5)
                const currentLevel = Math.max(1, Math.min(5, assessment.overallMaturityLevel || 1)) as 1 | 2 | 3 | 4 | 5;
                
                const levelData = {
                  1: {
                    name: 'Initial',
                    description: 'Ad-hoc processes, inconsistent documentation',
                    characteristics: [
                      'Minimal or informal documentation',
                      'No standard templates or processes',
                      'Success depends on individual heroics',
                      'Reactive approach to project management',
                    ],
                    color: maturityTheme.colors.maturity.level1,
                  },
                  2: {
                    name: 'Repeatable',
                    description: 'Basic processes established, some standardization',
                    characteristics: [
                      'Basic project plans and schedules exist',
                      'Some standard templates in use',
                      'Prior success can be repeated',
                      'Beginning to track costs and schedules',
                    ],
                    color: maturityTheme.colors.maturity.level2,
                  },
                  3: {
                    name: 'Defined',
                    description: 'Standardized processes documented and integrated',
                    characteristics: [
                      'Comprehensive PM methodology documented',
                      'Consistent use of standard templates',
                      'Integrated across knowledge areas',
                      'Organizational process assets established',
                    ],
                    color: maturityTheme.colors.maturity.level3,
                  },
                  4: {
                    name: 'Managed',
                    description: 'Quantitatively controlled processes with metrics',
                    characteristics: [
                      'Detailed metrics and measurements',
                      'Statistical process control',
                      'Quality is quantitatively measured',
                      'Performance is predictable',
                    ],
                    color: maturityTheme.colors.maturity.level4,
                  },
                  5: {
                    name: 'Optimizing',
                    description: 'Continuous improvement and innovation',
                    characteristics: [
                      'Focus on continuous improvement',
                      'Innovative practices adopted',
                      'Lessons learned actively applied',
                      'Organizational learning culture',
                    ],
                    color: maturityTheme.colors.maturity.level5,
                  },
                }[currentLevel];

                if (!levelData) {
                  // Fallback if level data is missing
                  return (
                    <div className="p-4 rounded-lg border" style={{
                      backgroundColor: maturityTheme.colors.background.tertiary,
                      borderColor: maturityTheme.colors.border.default,
                    }}>
                      <p style={{ color: maturityTheme.colors.text.secondary }}>
                        Maturity level information is not available for this assessment.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div 
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: levelData.color.bg,
                        borderColor: levelData.color.border,
                      }}
                    >
                      <h3 
                        className="text-xl font-semibold mb-2"
                        style={{ color: levelData.color.text }}
                      >
                        Level {currentLevel}: {levelData.name}
                      </h3>
                      <p 
                        className="text-base mb-4"
                        style={{ color: maturityTheme.colors.text.primary }}
                      >
                        {levelData.description}
                      </p>
                    </div>

                    <div>
                      <h4 
                        className="text-lg font-semibold mb-3"
                        style={{ color: maturityTheme.colors.text.primary }}
                      >
                        Key Characteristics:
                      </h4>
                      <ul className="space-y-2">
                        {levelData.characteristics.map((characteristic, idx) => (
                          <li 
                            key={idx} 
                            className="flex items-start gap-2"
                          >
                            <CheckCircle 
                              className="h-5 w-5 mt-0.5 flex-shrink-0" 
                              style={{ color: levelData.color.text }}
                            />
                            <span style={{ color: maturityTheme.colors.text.secondary }}>
                              {characteristic}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </MaturityCard>
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
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Document Breakdown</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                {assessment.totalDocuments} documents assessed across {assessment.documentsByType?.length || 0} types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assessment.documentsByType?.map((doc, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleDocumentTypeClick(doc.type)}
                    className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all"
                    style={{ 
                      borderColor: maturityTheme.colors.border.default,
                      borderWidth: '1px',
                      backgroundColor: maturityTheme.colors.background.tertiary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.background.elevated;
                      e.currentTarget.style.borderColor = maturityTheme.colors.primary[400];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.background.tertiary;
                      e.currentTarget.style.borderColor = maturityTheme.colors.border.default;
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5" style={{ color: maturityTheme.colors.primary[400] }} />
                      <div>
                        <div className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                          {doc.type}
                        </div>
                        <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          {doc.count} document{doc.count > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-lg" style={{ color: maturityTheme.colors.text.primary }}>
                          {doc.avgScore.toFixed(1)}
                        </div>
                        <div className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                          Avg Score
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5" style={{ color: maturityTheme.colors.text.secondary }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </MaturityCard>
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Gap Analysis</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                {assessment.gaps?.length || 0} gaps identified requiring improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assessment.gaps?.map((gap, idx) => {
                  const priorityTheme = gap.priority === 'critical' ? maturityTheme.colors.error :
                                       gap.priority === 'high' ? maturityTheme.colors.warning :
                                       gap.priority === 'medium' ? maturityTheme.colors.info :
                                       maturityTheme.colors.success;
                  
                  return (
                    <div 
                      key={idx} 
                      className="rounded-lg p-4 cursor-pointer"
                      style={{ 
                        borderColor: maturityTheme.colors.border.default,
                        borderWidth: '1px',
                        backgroundColor: maturityTheme.colors.background.tertiary,
                      }}
                      onClick={() => handleGapClick(gap)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge style={{
                            backgroundColor: priorityTheme.bg,
                            color: priorityTheme.text,
                            borderColor: priorityTheme.border,
                          }}>
                            {gap.priority}
                          </Badge>
                          <span className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                            {gap.documentType}
                          </span>
                          {gap.documentTitle && (
                            <span className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                              ({gap.documentTitle})
                            </span>
                          )}
                          {gap.issueCategory && (
                            <Badge style={{
                              backgroundColor: maturityTheme.colors.background.tertiary,
                              color: maturityTheme.colors.text.secondary,
                            }}>
                              {gap.issueCategory}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          Level {gap.currentLevel} → {gap.targetLevel}
                        </div>
                      </div>
                      <p className="text-sm mb-2" style={{ color: maturityTheme.colors.text.secondary }}>
                        {gap.description}
                      </p>
                      <div className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                        Estimated effort: {gap.estimatedEffort || gap.estimated_improvement_points ? `${gap.estimated_improvement_points?.toFixed(1)} points` : 'Medium'}
                      </div>
                      {gap.recommendations && gap.recommendations.length > 0 && (
                        <ul className="mt-2 text-sm space-y-1">
                          {gap.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: maturityTheme.colors.success.text }} />
                              <span style={{ color: maturityTheme.colors.text.primary }}>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {gap.recommendation && !gap.recommendations && (
                        <div className="mt-2 text-sm flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: maturityTheme.colors.success.text }} />
                          <span style={{ color: maturityTheme.colors.text.primary }}>{gap.recommendation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </MaturityCard>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Recommendations</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                {assessment.recommendations?.length || 0} recommendations from quality audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessment.recommendations && assessment.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {assessment.recommendations.map((rec, idx) => (
                    <div 
                      key={idx} 
                      className="rounded-lg p-4 flex items-start gap-3"
                      style={{ 
                        borderColor: maturityTheme.colors.border.default,
                        borderWidth: '1px',
                        backgroundColor: maturityTheme.colors.background.tertiary,
                      }}
                    >
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                      <div className="flex-1">
                        <p className="text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                          {rec}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.text.muted }} />
                  <p style={{ color: maturityTheme.colors.text.secondary }}>
                    No recommendations available
                  </p>
                </div>
              )}
            </CardContent>
          </MaturityCard>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Benchmarks</CardTitle>
                  <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                    You're in the {assessment.benchmarks?.percentile || 0}th percentile compared to your selected benchmark.
                  </CardDescription>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-xs uppercase tracking-wide" style={{ color: maturityTheme.colors.text.muted }}>
                    Compare against
                  </span>
                  <select
                    value={selectedBenchmarkIndustry}
                    onChange={(e) => setSelectedBenchmarkIndustry(e.target.value)}
                    className="text-sm rounded-md px-3 py-2 border bg-transparent"
                    style={{
                      borderColor: maturityTheme.colors.border.default,
                      color: maturityTheme.colors.text.primary,
                    }}
                  >
                    <option value="industry">Your Industry Average</option>
                    <option value="top">Top Performers</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ backgroundColor: maturityTheme.colors.info.bg }}
                >
                  <div className="text-3xl font-bold" style={{ color: maturityTheme.colors.info.text }}>
                    {assessment.benchmarks?.yourScore?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    Your Score
                  </div>
                </div>
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ backgroundColor: maturityTheme.colors.background.tertiary }}
                >
                  <div className="text-3xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                    {(selectedBenchmarkIndustry === 'industry'
                      ? assessment.benchmarks?.industryAverage
                      : assessment.benchmarks?.topPerformers
                    )?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    {selectedBenchmarkIndustry === 'industry' ? 'Industry Average' : 'Top Performers'}
                  </div>
                </div>
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ backgroundColor: maturityTheme.colors.success.bg }}
                >
                  <div className="text-3xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                    {assessment.benchmarks?.topPerformers?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    Top Performers
                  </div>
                </div>
              </div>
            </CardContent>
          </MaturityCard>
        </TabsContent>

        {/* ROI Tab */}
        <TabsContent value="roi" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Return on Investment</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                Expected benefits and ROI from improving documentation maturity with ADPA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.success.bg,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                    ${assessment.roiMetrics?.savings?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    Annual Savings
                  </div>
                </div>
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.info.bg,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.info.text }}>
                    {assessment.roiMetrics?.roi?.toFixed(0) || '0'}%
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    ROI
                  </div>
                </div>
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.background.tertiary,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.primary[400] }}>
                    {assessment.roiMetrics?.paybackPeriod || 'Calculating...'}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    Payback Period
                  </div>
                </div>
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.warning.bg,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.warning.text }}>
                    ${assessment.roiMetrics?.improvedCost?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    Target Annual Cost
                  </div>
                </div>
              </div>

              {assessment.assessment_data && (assessment as any).assessment_data?.roi_calculation && (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {(() => {
                    const roi = (assessment as any).assessment_data.roi_calculation as {
                      estimated_hours_saved?: number;
                      estimated_cost_savings?: number;
                      potential_improvement_value?: number;
                      payback_period_months?: number;
                    };
                    return (
                      <>
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            borderColor: maturityTheme.colors.border.default,
                            borderWidth: '1px',
                            backgroundColor: maturityTheme.colors.background.tertiary,
                          }}
                        >
                          <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                            Estimated Hours Saved
                          </div>
                          <div className="text-xl font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                            {roi.estimated_hours_saved?.toLocaleString() || '0'} hrs
                          </div>
                          <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                            Per year across all assessed documents
                          </div>
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            borderColor: maturityTheme.colors.border.default,
                            borderWidth: '1px',
                            backgroundColor: maturityTheme.colors.background.tertiary,
                          }}
                        >
                          <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                            Estimated Cost Savings
                          </div>
                          <div className="text-xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                            ${roi.estimated_cost_savings?.toLocaleString() || '0'}
                          </div>
                          <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                            Based on time saved at typical consulting rates
                          </div>
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            borderColor: maturityTheme.colors.border.default,
                            borderWidth: '1px',
                            backgroundColor: maturityTheme.colors.background.tertiary,
                          }}
                        >
                          <div className="text-sm font-medium mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                            Additional Improvement Value
                          </div>
                          <div className="text-xl font-bold" style={{ color: maturityTheme.colors.info.text }}>
                            ${roi.potential_improvement_value?.toLocaleString() || '0'}
                          </div>
                          <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                            Upside from closing remaining quality gaps
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </MaturityCard>
        </TabsContent>

        {/* Performance Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Performance Domain Scores</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                Maturity Scores Across Performance Domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Extract domain scores from assessment_data if available
                const assessmentData = (assessment as any).assessment_data;
                const domainScores = assessmentData?.breakdown?.by_performance_domain || 
                                    assessmentData?.domain_scores || 
                                    assessmentData?.performance_domains || [];

                // Default PMBOK 8 Performance Domains
                const performanceDomains = [
                  { key: 'stakeholders', name: 'Stakeholders Performance Domain', icon: Target },
                  { key: 'team', name: 'Team Performance Domain', icon: BarChart3 },
                  { key: 'development_approach', name: 'Development Approach and Life Cycle', icon: TrendingUp },
                  { key: 'planning', name: 'Planning Performance Domain', icon: FileText },
                  { key: 'project_work', name: 'Project Work Performance Domain', icon: CheckCircle },
                  { key: 'delivery', name: 'Delivery Performance Domain', icon: AlertCircle },
                  { key: 'measurement', name: 'Measurement Performance Domain', icon: BarChart3 },
                  { key: 'uncertainty', name: 'Uncertainty Performance Domain', icon: AlertCircle },
                ];

                const getMaturityLabel = (score: number) => {
                  if (score < 2) return 'Initial';
                  if (score < 3) return 'Developing';
                  if (score < 4) return 'Defined';
                  if (score < 4.5) return 'Managed';
                  return 'Optimizing';
                };

                const scoreToLevel = (score: number): 1 | 2 | 3 | 4 | 5 => {
                  return Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5;
                };

                const getDomainColor = (level: number) => {
                  return maturityTheme.colors.maturity[`level${level}` as keyof typeof maturityTheme.colors.maturity];
                };

                // If we have domain scores from assessment data, use them
                if (Array.isArray(domainScores) && domainScores.length > 0) {
                  return (
                    <div className="space-y-4">
                      {domainScores.map((domainScore: any, idx: number) => {
                        const domainName = domainScore.domain || domainScore.name || performanceDomains[idx]?.name || `Domain ${idx + 1}`;
                        const score = domainScore.score || domainScore.maturity_level || 0;
                        const level = scoreToLevel(score);
                        const maturityLabel = getMaturityLabel(score);
                        const domainColor = getDomainColor(level);
                        const Icon = performanceDomains[idx]?.icon || FileText;

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border"
                            style={{
                              borderColor: maturityTheme.colors.border.default,
                              backgroundColor: maturityTheme.colors.background.tertiary,
                            }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="p-2 rounded-lg"
                                  style={{ backgroundColor: domainColor.bg }}
                                >
                                  <Icon className="h-5 w-5" style={{ color: domainColor.text }} />
                                </div>
                                <div>
                                  <h4 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                                    {domainName}
                                  </h4>
                                  <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                                    {maturityLabel} (Level {level})
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <MaturityScore
                                  level={level}
                                  label={maturityLabel}
                                  size="sm"
                                  animated={false}
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <Progress 
                                value={(score / 5) * 100} 
                                className="h-2"
                              />
                              <div className="flex justify-between mt-1 text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                                <span>Score: {score.toFixed(1)}/5.0</span>
                                <span>{((score / 5) * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Fallback: Show placeholder if no domain data available
                return (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.text.muted }} />
                    <p className="text-lg font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                      Performance Domain Data Not Available
                    </p>
                    <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                      Domain scores will appear here once the assessment includes performance domain analysis.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </MaturityCard>
        </TabsContent>
        </Tabs>
      </div>

      {/* Document Type Dialog - Shows documents of selected type */}
      <Dialog open={documentTypeDialogOpen} onOpenChange={setDocumentTypeDialogOpen}>
        <DialogContent 
          className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto"
          style={{
            backgroundColor: maturityTheme.colors.background.elevated,
            borderColor: maturityTheme.colors.border.default,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: maturityTheme.colors.text.primary }}>
              {selectedDocumentType} Documents
            </DialogTitle>
            <DialogDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Click on a document to view detailed quality audit scores
            </DialogDescription>
          </DialogHeader>

          {/* Average Audit Results */}
          {documentTypeAverages && (
            <MaturityCard variant="elevated" className="mb-4">
              <CardHeader>
                <CardTitle style={{ color: maturityTheme.colors.text.primary }}>
                  Average Audit Results
                </CardTitle>
                <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                  Average scores across all {selectedDocumentType} documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: 'Completeness', score: documentTypeAverages.completeness, key: 'completeness' },
                    { label: 'Consistency', score: documentTypeAverages.consistency, key: 'consistency' },
                    { label: 'Professional Quality', score: documentTypeAverages.professionalQuality, key: 'professional' },
                    { label: 'Standards Compliance', score: documentTypeAverages.standardsCompliance, key: 'compliance' },
                    { label: 'Accuracy', score: documentTypeAverages.accuracy, key: 'accuracy' },
                    { label: 'Context Relevance', score: documentTypeAverages.contextRelevance, key: 'relevance' },
                  ].map((dimension) => (
                    <div
                      key={dimension.key}
                      className="p-4 rounded-lg"
                      style={{
                        backgroundColor: maturityTheme.colors.background.tertiary,
                        borderColor: maturityTheme.colors.border.default,
                        borderWidth: '1px',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                          {dimension.label}
                        </span>
                        <span className="font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                          {dimension.score?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                      <Progress 
                        value={dimension.score || 0} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </MaturityCard>
          )}

          {loadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: maturityTheme.colors.info.text }} />
            </div>
          ) : documentsOfType.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.text.muted }} />
              <p style={{ color: maturityTheme.colors.text.secondary }}>
                No documents found for this type
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documentsOfType.map((doc: any) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all"
                  style={{
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.background.tertiary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = maturityTheme.colors.background.elevated;
                    e.currentTarget.style.borderColor = maturityTheme.colors.primary[400];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = maturityTheme.colors.background.tertiary;
                    e.currentTarget.style.borderColor = maturityTheme.colors.border.default;
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0" style={{ color: maturityTheme.colors.primary[400] }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: maturityTheme.colors.text.primary }}>
                        {doc.title || doc.originalFilename || 'Untitled Document'}
                      </div>
                      <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                        {doc.qualityAudit ? (
                          <>
                            Score: {doc.qualityAudit.overallScore?.toFixed(1) || 'N/A'} | 
                            Grade: {doc.qualityAudit.overallGrade || 'N/A'} | 
                            {doc.qualityAudit.qualityLevel || 'Not assessed'}
                          </>
                        ) : (
                          'No quality audit available'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {doc.qualityAudit && (
                      <div className="text-right">
                        <div className="font-bold text-lg" style={{ color: maturityTheme.colors.text.primary }}>
                          {doc.qualityAudit.overallScore?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                          Quality Score
                        </div>
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5" style={{ color: maturityTheme.colors.text.secondary }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDocumentTypeDialogOpen(false)}
              style={{
                borderColor: maturityTheme.colors.border.default,
                color: maturityTheme.colors.text.primary,
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Detail Dialog - Shows quality audit scores */}
      <Dialog open={documentDetailDialogOpen} onOpenChange={setDocumentDetailDialogOpen}>
        <DialogContent 
          className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: maturityTheme.colors.background.elevated,
            borderColor: maturityTheme.colors.border.default,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: maturityTheme.colors.text.primary }}>
              Quality Audit: {selectedDocument?.title || selectedDocument?.originalFilename || 'Document'}
            </DialogTitle>
            <DialogDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Detailed quality scores and entity-level assessments
            </DialogDescription>
          </DialogHeader>

          {loadingDocumentDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: maturityTheme.colors.info.text }} />
            </div>
          ) : !documentQualityAudit ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.text.muted }} />
              <p style={{ color: maturityTheme.colors.text.secondary }}>
                Quality audit data not available for this document
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Score */}
              <MaturityCard variant="elevated">
                <CardHeader>
                  <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Overall Quality Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                        {documentQualityAudit.overallScore?.toFixed(1) || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge style={{
                          backgroundColor: documentQualityAudit.overallGrade === 'A' ? maturityTheme.colors.success.bg :
                                          documentQualityAudit.overallGrade === 'B' ? maturityTheme.colors.info.bg :
                                          documentQualityAudit.overallGrade === 'C' ? maturityTheme.colors.warning.bg :
                                          maturityTheme.colors.error.bg,
                          color: documentQualityAudit.overallGrade === 'A' ? maturityTheme.colors.success.text :
                                 documentQualityAudit.overallGrade === 'B' ? maturityTheme.colors.info.text :
                                 documentQualityAudit.overallGrade === 'C' ? maturityTheme.colors.warning.text :
                                 maturityTheme.colors.error.text,
                        }}>
                          Grade: {documentQualityAudit.overallGrade || 'N/A'}
                        </Badge>
                        <Badge style={{
                          backgroundColor: maturityTheme.colors.background.tertiary,
                          color: maturityTheme.colors.text.secondary,
                        }}>
                          {documentQualityAudit.qualityLevel || 'Not assessed'}
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={documentQualityAudit.overallScore || 0} 
                      className="w-32 h-32"
                    />
                  </div>
                </CardContent>
              </MaturityCard>

              {/* Quality Dimension Scores */}
              <MaturityCard variant="elevated">
                <CardHeader>
                  <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Quality Dimension Scores</CardTitle>
                  <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                    Individual scores for each quality dimension
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: 'Completeness', score: documentQualityAudit.completenessScore, key: 'completeness' },
                      { label: 'Consistency', score: documentQualityAudit.consistencyScore, key: 'consistency' },
                      { label: 'Professional Quality', score: documentQualityAudit.professionalQualityScore, key: 'professional' },
                      { label: 'Standards Compliance', score: documentQualityAudit.standardsComplianceScore, key: 'compliance' },
                      { label: 'Accuracy', score: documentQualityAudit.accuracyScore, key: 'accuracy' },
                      { label: 'Context Relevance', score: documentQualityAudit.contextRelevanceScore, key: 'relevance' },
                    ].map((dimension) => (
                      <div
                        key={dimension.key}
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: maturityTheme.colors.background.tertiary,
                          borderColor: maturityTheme.colors.border.default,
                          borderWidth: '1px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                            {dimension.label}
                          </span>
                          <span className="font-bold" style={{ color: maturityTheme.colors.text.primary }}>
                            {dimension.score?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <Progress 
                          value={dimension.score || 0} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </MaturityCard>

              {/* Findings */}
              {documentQualityAudit.findings && Object.keys(documentQualityAudit.findings).length > 0 && (
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Quality Findings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(documentQualityAudit.findings).map(([key, value]: [string, any]) => (
                        <div key={key} className="p-3 rounded-lg" style={{ backgroundColor: maturityTheme.colors.background.tertiary }}>
                          <div className="font-medium mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                            {key}
                          </div>
                          <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </MaturityCard>
              )}

              {/* Issues */}
              {documentQualityAudit.issues && documentQualityAudit.issues.length > 0 && (
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Identified Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {documentQualityAudit.issues.map((issue: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-3 rounded-lg"
                          style={{ backgroundColor: maturityTheme.colors.error.bg }}
                        >
                          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.error.text }} />
                          <div className="flex-1">
                            <div className="font-medium" style={{ color: maturityTheme.colors.error.text }}>
                              {issue.category || issue.type || 'Issue'}
                            </div>
                            <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                              {issue.description || issue.message || JSON.stringify(issue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </MaturityCard>
              )}

              {/* Recommendations */}
              {documentQualityAudit.recommendations && documentQualityAudit.recommendations.length > 0 && (
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {documentQualityAudit.recommendations.map((rec: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-3 rounded-lg"
                          style={{ backgroundColor: maturityTheme.colors.success.bg }}
                        >
                          <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                          <div className="text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                            {rec}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </MaturityCard>
              )}

              {/* Audit Metadata */}
              <MaturityCard variant="elevated">
                <CardHeader>
                  <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Audit Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <span style={{ color: maturityTheme.colors.text.secondary }}>AI Provider: </span>
                      <span style={{ color: maturityTheme.colors.text.primary }}>
                        {documentQualityAudit.aiProvider || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: maturityTheme.colors.text.secondary }}>AI Model: </span>
                      <span style={{ color: maturityTheme.colors.text.primary }}>
                        {documentQualityAudit.aiModel || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: maturityTheme.colors.text.secondary }}>Analysis Tokens: </span>
                      <span style={{ color: maturityTheme.colors.text.primary }}>
                        {documentQualityAudit.analysisTokens != null 
                          ? typeof documentQualityAudit.analysisTokens === 'number' 
                            ? documentQualityAudit.analysisTokens.toLocaleString() 
                            : parseInt(String(documentQualityAudit.analysisTokens), 10).toLocaleString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: maturityTheme.colors.text.secondary }}>Analysis Cost: </span>
                      <span style={{ color: maturityTheme.colors.text.primary }}>
                        ${documentQualityAudit.analysisCost != null
                          ? (typeof documentQualityAudit.analysisCost === 'number' 
                            ? documentQualityAudit.analysisCost.toFixed(4) 
                            : parseFloat(String(documentQualityAudit.analysisCost)).toFixed(4))
                          : '0.0000'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: maturityTheme.colors.text.secondary }}>Analysis Time: </span>
                      <span style={{ color: maturityTheme.colors.text.primary }}>
                        {documentQualityAudit.analysisTime != null 
                          ? `${typeof documentQualityAudit.analysisTime === 'number' 
                            ? documentQualityAudit.analysisTime 
                            : parseInt(String(documentQualityAudit.analysisTime), 10)}ms` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: maturityTheme.colors.text.secondary }}>Audited At: </span>
                      <span style={{ color: maturityTheme.colors.text.primary }}>
                        {documentQualityAudit.auditedAt ? new Date(documentQualityAudit.auditedAt).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </MaturityCard>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDocumentDetailDialogOpen(false);
                setSelectedDocument(null);
                setDocumentQualityAudit(null);
              }}
              style={{
                borderColor: maturityTheme.colors.border.default,
                color: maturityTheme.colors.text.primary,
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Documents Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent 
          className="sm:max-w-[600px]"
          style={{
            backgroundColor: maturityTheme.colors.background.elevated,
            borderColor: maturityTheme.colors.border.default,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: maturityTheme.colors.text.primary }}>
              Add More Documents to Assessment
            </DialogTitle>
            <DialogDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Upload additional documents to enhance your assessment. The system will process them and you can regenerate the assessment with all documents included.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="additional-files" style={{ color: maturityTheme.colors.text.primary }}>
                Select Documents
              </Label>
              <Input
                id="additional-files"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.markdown"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedFiles(e.target.files)}
                className="cursor-pointer"
                style={{
                  color: maturityTheme.colors.text.primary,
                  backgroundColor: maturityTheme.colors.background.tertiary,
                  borderColor: maturityTheme.colors.border.default,
                }}
              />
              <p className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                Supported formats: PDF, DOC, DOCX, TXT, MD (up to 100 files, 10MB each)
              </p>
              {selectedFiles && selectedFiles.length > 0 && (
                <div 
                  className="mt-3 p-3 rounded-md"
                  style={{ 
                    backgroundColor: maturityTheme.colors.info.bg,
                    borderColor: maturityTheme.colors.info.border,
                    borderWidth: '1px',
                  }}
                >
                  <p className="text-sm font-medium mb-2" style={{ color: maturityTheme.colors.info.text }}>
                    {selectedFiles.length} file(s) selected:
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: maturityTheme.colors.text.secondary }}>
                    {Array.from(selectedFiles).map((file, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <FileText className="h-3 w-3" style={{ color: maturityTheme.colors.primary[400] }} />
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
              style={{
                borderColor: maturityTheme.colors.border.default,
                color: maturityTheme.colors.text.primary,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadAdditionalDocuments}
              disabled={uploading || !selectedFiles || selectedFiles.length === 0}
              style={{
                background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                color: 'white',
              }}
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

