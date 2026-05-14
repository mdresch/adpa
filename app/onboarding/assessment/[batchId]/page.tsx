'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/notify';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaturityCard } from '@/components/onboarding/MaturityCard';
import { MaturityScore } from '@/components/onboarding/MaturityScore';
import { MaturityJourneyPlanner } from '@/components/onboarding/MaturityJourneyPlanner';
import { SemanticProcessingStatus } from '@/components/onboarding/SemanticProcessingStatus';
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
  ChevronDown,
  ChevronUp,
  X
} from '@/components/ui/icons-shim';
import apiClient from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-url';

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'structure' | 'completeness' | 'compliance' | 'quality' | 'consistency';
  impact_score: number;
  effort_level: 'low' | 'medium' | 'high';
  estimated_time_hours: number;
  steps: {
    step_number: number;
    action: string;
    details: string;
    estimated_time_minutes: number;
    tools_needed?: string[];
  }[];
  affected_documents: string[];
  expected_improvement: string;
  success_criteria: string[];
  resources_needed: string[];
  template_suggestions?: string[];
  best_practices: string[];
}

interface GeneratedRecommendations {
  critical_actions: AIRecommendation[];
  high_priority_actions: AIRecommendation[];
  medium_priority_actions: AIRecommendation[];
  low_priority_actions: AIRecommendation[];
  quick_wins: AIRecommendation[];
  long_term_initiatives: AIRecommendation[];
  implementation_roadmap: {
    phase_number: number;
    phase_name: string;
    duration_weeks: number;
    recommendations: string[];
    expected_maturity_improvement: number;
    success_metrics: string[];
  }[];
}

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
  ai_recommendations?: GeneratedRecommendations;
  benchmarks: {
    industryAverage: number;
    topPerformers: number;
    yourScore: number;
    percentile: number;
  };
  roiMetrics: {
    currentCost: number | string;
    improvedCost: number | string;
    savings: number | string;
    roi: number | string;
    paybackPeriod: string | number;
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

const INDUSTRY_BENCHMARKS = {
  technology: {
    label: 'Technology & Software',
    industryAverage: 78.5,
    topPerformers: 91.2,
    maturityLevel: 'Defined to Managed',
    pmoPresence: 68,
    toolAdoption: 85,
    description: 'Digital-native organizations with strong agile and product delivery practices. High adoption of modern PM tools and methodologies.',
    challenges: ['Rapid technology changes', 'Distributed teams', 'Balancing speed with quality'],
    enablers: ['Agile/DevOps practices', 'Cloud-based tools', 'Strong product culture'],
  },
  finance: {
    label: 'Financial Services',
    industryAverage: 75.0,
    topPerformers: 89.5,
    maturityLevel: 'Defined',
    pmoPresence: 82,
    toolAdoption: 78,
    description: 'Highly regulated portfolio governance with strong risk and compliance disciplines. Formal PMO structures are common.',
    challenges: ['Regulatory compliance', 'Risk management complexity', 'Legacy system integration'],
    enablers: ['Strong governance frameworks', 'Dedicated PMO', 'Compliance-focused tools'],
  },
  healthcare: {
    label: 'Healthcare & Life Sciences',
    industryAverage: 72.0,
    topPerformers: 87.0,
    maturityLevel: 'Defined',
    pmoPresence: 71,
    toolAdoption: 72,
    description: 'Complex, multi-stakeholder programs with strong clinical and regulatory oversight. Focus on patient safety and evidence-based practices.',
    challenges: ['Regulatory requirements (FDA, etc.)', 'Clinical trial complexity', 'Multi-stakeholder coordination'],
    enablers: ['Regulatory expertise', 'Clinical project management', 'Quality management systems'],
  },
  manufacturing: {
    label: 'Manufacturing & Engineering',
    industryAverage: 70.5,
    topPerformers: 86.3,
    maturityLevel: 'Defined',
    pmoPresence: 65,
    toolAdoption: 70,
    description: 'Stage-gate and hybrid delivery models with strong quality and cost controls. Lean and Six Sigma methodologies prevalent.',
    challenges: ['Supply chain complexity', 'Quality control', 'Cost optimization'],
    enablers: ['Stage-gate processes', 'Lean methodologies', 'ERP integration'],
  },
  government: {
    label: 'Government & Public Sector',
    industryAverage: 68.0,
    topPerformers: 84.1,
    maturityLevel: 'Repeatable to Defined',
    pmoPresence: 58,
    toolAdoption: 62,
    description: 'Policy-driven initiatives with formal governance and extensive stakeholder networks. Often constrained by procurement processes.',
    challenges: ['Bureaucratic processes', 'Budget constraints', 'Public accountability'],
    enablers: ['Formal governance', 'Stakeholder management', 'Transparency requirements'],
  },
  energy: {
    label: 'Energy & Utilities',
    industryAverage: 71.0,
    topPerformers: 88.0,
    maturityLevel: 'Defined',
    pmoPresence: 73,
    toolAdoption: 74,
    description: 'Capital-intensive programs with strong safety, risk, and asset management practices. Long project lifecycles.',
    challenges: ['Safety requirements', 'Environmental regulations', 'Long project timelines'],
    enablers: ['Safety management systems', 'Asset management', 'Risk frameworks'],
  },
  construction: {
    label: 'Construction & Infrastructure',
    industryAverage: 69.5,
    topPerformers: 85.4,
    maturityLevel: 'Repeatable to Defined',
    pmoPresence: 61,
    toolAdoption: 68,
    description: 'Large-scale projects with rigorous scope, schedule, and cost control disciplines. BIM and modern construction management tools.',
    challenges: ['Weather dependencies', 'Supply chain disruptions', 'Safety compliance'],
    enablers: ['BIM technology', 'Project controls', 'Safety management'],
  },
  retail: {
    label: 'Retail & Consumer',
    industryAverage: 73.0,
    topPerformers: 88.7,
    maturityLevel: 'Defined',
    pmoPresence: 55,
    toolAdoption: 80,
    description: 'Customer-centric portfolios with rapid experimentation and launch cycles. High focus on digital transformation.',
    challenges: ['Market volatility', 'Customer expectations', 'Omnichannel complexity'],
    enablers: ['Agile methodologies', 'Digital tools', 'Customer analytics'],
  },
  consulting: {
    label: 'Professional Services & Consulting',
    industryAverage: 77.0,
    topPerformers: 92.0,
    maturityLevel: 'Managed',
    pmoPresence: 88,
    toolAdoption: 90,
    description: 'Maturity driven by repeatable methods, strong PMO, and knowledge management. High emphasis on client delivery excellence.',
    challenges: ['Resource allocation', 'Knowledge transfer', 'Client expectations'],
    enablers: ['Proven methodologies', 'Strong PMO', 'Knowledge management systems'],
  },
  nonprofit: {
    label: 'Non-profit & NGOs',
    industryAverage: 65.0,
    topPerformers: 82.5,
    maturityLevel: 'Repeatable',
    pmoPresence: 42,
    toolAdoption: 58,
    description: 'Mission-driven initiatives with constrained resources and high stakeholder complexity. Often volunteer-based teams.',
    challenges: ['Limited resources', 'Volunteer management', 'Donor reporting'],
    enablers: ['Mission alignment', 'Grant management', 'Community engagement'],
  },
  aerospace: {
    label: 'Aerospace & Defense',
    industryAverage: 79.0,
    topPerformers: 93.5,
    maturityLevel: 'Managed',
    pmoPresence: 89,
    toolAdoption: 86,
    description: 'Highly regulated with rigorous quality standards. Strong emphasis on systems engineering and risk management.',
    challenges: ['Regulatory compliance', 'Complex systems integration', 'Long development cycles'],
    enablers: ['Systems engineering', 'Quality standards (AS9100)', 'Advanced PM tools'],
  },
  telecommunications: {
    label: 'Telecommunications',
    industryAverage: 74.5,
    topPerformers: 90.2,
    maturityLevel: 'Defined to Managed',
    pmoPresence: 72,
    toolAdoption: 83,
    description: 'Network infrastructure projects with strong technical project management. High adoption of agile and DevOps.',
    challenges: ['Network complexity', 'Technology evolution', 'Service continuity'],
    enablers: ['Agile/DevOps', 'Network management tools', 'Strong technical PM'],
  },
  pharmaceuticals: {
    label: 'Pharmaceuticals',
    industryAverage: 76.5,
    topPerformers: 91.8,
    maturityLevel: 'Defined to Managed',
    pmoPresence: 78,
    toolAdoption: 79,
    description: 'R&D-intensive with strong regulatory focus. Clinical trial management and drug development lifecycle expertise.',
    challenges: ['Regulatory approval', 'Clinical trial management', 'Time-to-market pressure'],
    enablers: ['Clinical PM expertise', 'Regulatory knowledge', 'Specialized tools'],
  },
  education: {
    label: 'Education & Training',
    industryAverage: 66.5,
    topPerformers: 83.0,
    maturityLevel: 'Repeatable to Defined',
    pmoPresence: 48,
    toolAdoption: 64,
    description: 'Academic and training programs with diverse stakeholder needs. Increasing focus on digital transformation.',
    challenges: ['Budget constraints', 'Academic calendars', 'Technology adoption'],
    enablers: ['Learning management systems', 'Academic planning', 'Stakeholder engagement'],
  },
  automotive: {
    label: 'Automotive',
    industryAverage: 73.5,
    topPerformers: 89.0,
    maturityLevel: 'Defined',
    pmoPresence: 69,
    toolAdoption: 76,
    description: 'Product development with strong engineering project management. Increasing focus on electric and autonomous vehicles.',
    challenges: ['Supply chain complexity', 'Technology disruption', 'Quality standards'],
    enablers: ['Engineering PM', 'Quality systems', 'Supply chain management'],
  },
} as const;

type IndustryKey = keyof typeof INDUSTRY_BENCHMARKS;

type Gap = AssessmentData['gaps'][number];

export default function AssessmentResultsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const params = useParams() as { batchId?: string };

  // Get batchId from route params
  const batchId = typeof params?.batchId === 'string' ? params.batchId : '';
  
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
  const [selectedBenchmarkIndustry, setSelectedBenchmarkIndustry] = useState<IndustryKey>('technology');
  const [expandedMissingDocs, setExpandedMissingDocs] = useState<Record<string, boolean>>({});
  
  // Filtering and sorting state
  const [documentFilter, setDocumentFilter] = useState<{ type?: string; minScore?: number; maxScore?: number }>({});
  const [documentSort, setDocumentSort] = useState<'type' | 'score' | 'count'>('score');
  const [documentSortOrder, setDocumentSortOrder] = useState<'asc' | 'desc'>('desc');
  const [gapFilter, setGapFilter] = useState<{ priority?: string; category?: string }>({});
  const [gapSort, setGapSort] = useState<'priority' | 'impact' | 'effort'>('priority');
  const [recommendationFilter, setRecommendationFilter] = useState<string>('all');

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

  const exportReport = async (format: 'pdf' | 'csv' | 'json' | 'docx') => {
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
            variant="outline"
            onClick={() => exportReport('docx')}
            disabled={exporting}
            style={{
              borderColor: maturityTheme.colors.border.default,
              color: maturityTheme.colors.text.primary,
              backgroundColor: maturityTheme.colors.background.tertiary,
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Word
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
          onValueChange={(value: string) => setActiveTab(value)}
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
            value="processing"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Processing
          </TabsTrigger>
          <TabsTrigger 
            value="journey"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Maturity Journey
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
          <TabsTrigger 
            value="quality"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Quality Analysis
          </TabsTrigger>
          <TabsTrigger 
            value="action-plan"
            style={{ 
              color: maturityTheme.colors.text.primary,
            }}
          >
            Action Plan
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

          {/* Key Insights Section */}
          {(() => {
            // Calculate top strengths (highest scoring document types)
            const topStrengths = [...(assessment.documentsByType || [])]
              .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
              .slice(0, 3)
              .map(doc => ({
                label: doc.type,
                score: doc.avgScore,
                count: doc.count
              }));

            // Calculate top weaknesses (lowest scoring document types with gaps)
            const topWeaknesses = [...(assessment.gaps || [])]
              .filter(gap => {
                const current = Math.min(5, gap.currentLevel);
                const target = Math.min(5, gap.targetLevel);
                return current < target && target <= 5;
              })
              .sort((a, b) => {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
              })
              .slice(0, 3)
              .map(gap => {
                const current = Math.min(5, gap.currentLevel);
                const target = Math.min(5, gap.targetLevel);
                return {
                  label: gap.documentType || gap.documentTitle || 'Unknown',
                  priority: gap.priority,
                  gap: target - current,
                  description: gap.description
                };
              });

            // Calculate quick wins (low effort, high impact gaps)
            const quickWins = [...(assessment.gaps || [])]
              .filter(gap => {
                const current = Math.min(5, gap.currentLevel);
                const target = Math.min(5, gap.targetLevel);
                const effort = gap.estimated_improvement_points || 0;
                const impact = target - current;
                return effort <= 2 && impact >= 1 && target <= 5;
              })
              .sort((a, b) => {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
              })
              .slice(0, 3)
              .map(gap => {
                const current = Math.min(5, gap.currentLevel);
                const target = Math.min(5, gap.targetLevel);
                return {
                  label: gap.documentType || gap.documentTitle || 'Unknown',
                  priority: gap.priority,
                  effort: gap.estimated_improvement_points || 'Low',
                  impact: target - current,
                  recommendation: gap.recommendation || gap.recommendations?.[0] || 'Improve documentation quality'
                };
              });

            // Critical gaps requiring immediate attention
            const criticalGaps = (assessment.gaps || [])
              .filter(gap => {
                const current = Math.min(5, gap.currentLevel);
                const target = Math.min(5, gap.targetLevel);
                return gap.priority === 'critical' && current < target && target <= 5;
              })
              .slice(0, 3)
              .map(gap => {
                const current = Math.min(5, gap.currentLevel);
                const target = Math.min(5, gap.targetLevel);
                return {
                  label: gap.documentType || gap.documentTitle || 'Unknown',
                  description: gap.description,
                  currentLevel: current,
                  targetLevel: target,
                  recommendation: gap.recommendation || gap.recommendations?.[0] || 'Address immediately'
                };
              });

            return (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Top Strengths */}
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                      <CheckCircle className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                      Top Strengths
                    </CardTitle>
                    <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                      Your highest-performing document types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topStrengths.length > 0 ? (
                      <div className="space-y-3">
                        {topStrengths.map((strength, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg flex items-center justify-between"
                            style={{
                              backgroundColor: maturityTheme.colors.success.bg,
                              borderColor: maturityTheme.colors.success.border,
                              borderWidth: '1px',
                            }}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm" style={{ color: maturityTheme.colors.success.text }}>
                                {strength.label}
                              </div>
                              <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                                {strength.count} document{strength.count !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <Badge
                              style={{
                                backgroundColor: maturityTheme.colors.success.text,
                                color: 'white',
                              }}
                            >
                              {strength.score.toFixed(1)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-center py-4" style={{ color: maturityTheme.colors.text.muted }}>
                        No strength data available
                      </p>
                    )}
                  </CardContent>
                </MaturityCard>

                {/* Top Weaknesses */}
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                      <AlertCircle className="h-5 w-5" style={{ color: maturityTheme.colors.warning.text }} />
                      Areas for Improvement
                    </CardTitle>
                    <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                      Priority gaps requiring attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topWeaknesses.length > 0 ? (
                      <div className="space-y-3">
                        {topWeaknesses.map((weakness, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg"
                            style={{
                              backgroundColor: maturityTheme.colors.warning.bg,
                              borderColor: maturityTheme.colors.warning.border,
                              borderWidth: '1px',
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm" style={{ color: maturityTheme.colors.warning.text }}>
                                {weakness.label}
                              </div>
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: maturityTheme.colors.warning.text,
                                  color: 'white',
                                }}
                              >
                                {weakness.priority}
                              </Badge>
                            </div>
                            <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                              Gap: {weakness.gap} level{weakness.gap !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-center py-4" style={{ color: maturityTheme.colors.text.muted }}>
                        No weaknesses identified
                      </p>
                    )}
                  </CardContent>
                </MaturityCard>

                {/* Quick Wins */}
                {quickWins.length > 0 && (
                  <MaturityCard variant="elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <TrendingUp className="h-5 w-5" style={{ color: maturityTheme.colors.info.text }} />
                        Quick Wins
                      </CardTitle>
                      <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                        Low effort, high impact improvements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {quickWins.map((win, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg"
                            style={{
                              backgroundColor: maturityTheme.colors.info.bg,
                              borderColor: maturityTheme.colors.info.border,
                              borderWidth: '1px',
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-sm" style={{ color: maturityTheme.colors.info.text }}>
                                {win.label}
                              </div>
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: maturityTheme.colors.info.text,
                                  color: 'white',
                                }}
                              >
                                Impact: +{win.impact}
                              </Badge>
                            </div>
                            <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                              {win.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </MaturityCard>
                )}

                {/* Critical Gaps */}
                {criticalGaps.length > 0 && (
                  <MaturityCard variant="elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <AlertCircle className="h-5 w-5" style={{ color: maturityTheme.colors.error?.text || maturityTheme.colors.warning.text }} />
                        Critical Gaps
                      </CardTitle>
                      <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                        Requiring immediate attention
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {criticalGaps.map((gap, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg"
                            style={{
                              backgroundColor: maturityTheme.colors.warning.bg,
                              borderColor: maturityTheme.colors.warning.border,
                              borderWidth: '2px',
                            }}
                          >
                            <div className="font-medium text-sm mb-1" style={{ color: maturityTheme.colors.warning.text }}>
                              {gap.label}
                            </div>
                            <div className="text-xs mb-2" style={{ color: maturityTheme.colors.text.secondary }}>
                              Level {Math.min(5, gap.currentLevel)} → {Math.min(5, gap.targetLevel)}
                            </div>
                            <p className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                              {gap.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </MaturityCard>
                )}
              </div>
            );
          })()}
        </TabsContent>

        {/* Semantic Processing Tab */}
        <TabsContent value="processing" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Semantic Processing Pipeline
              </CardTitle>
              <CardDescription>
                Monitor the automatic extraction of entities and synchronization to the Governance Knowledge Graph
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SemanticProcessingStatus 
                batchId={batchId}
                showDetails={true}
              />
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Document Breakdown</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                {assessment.totalDocuments} documents assessed across {assessment.documentsByType?.length || 0} types
              </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={documentSort}
                    onChange={(e) => setDocumentSort(e.target.value as 'type' | 'score' | 'count')}
                    className="text-sm rounded-md px-3 py-2 border bg-transparent"
                    style={{
                      borderColor: maturityTheme.colors.border.default,
                      color: maturityTheme.colors.text.primary,
                    }}
                  >
                    <option value="score">Sort by Score</option>
                    <option value="count">Sort by Count</option>
                    <option value="type">Sort by Type</option>
                  </select>
                  <select
                    value={documentSortOrder}
                    onChange={(e) => setDocumentSortOrder(e.target.value as 'asc' | 'desc')}
                    className="text-sm rounded-md px-3 py-2 border bg-transparent"
                    style={{
                      borderColor: maturityTheme.colors.border.default,
                      color: maturityTheme.colors.text.primary,
                    }}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Apply filtering and sorting
                let filteredDocs = [...(assessment.documentsByType || [])];
                
                // Apply filters
                if (documentFilter.minScore !== undefined) {
                  filteredDocs = filteredDocs.filter(doc => (doc.avgScore || 0) >= documentFilter.minScore!);
                }
                if (documentFilter.maxScore !== undefined) {
                  filteredDocs = filteredDocs.filter(doc => (doc.avgScore || 0) <= documentFilter.maxScore!);
                }
                if (documentFilter.type) {
                  filteredDocs = filteredDocs.filter(doc => doc.type.toLowerCase().includes(documentFilter.type!.toLowerCase()));
                }
                
                // Apply sorting
                filteredDocs.sort((a, b) => {
                  let comparison = 0;
                  if (documentSort === 'score') {
                    comparison = (a.avgScore || 0) - (b.avgScore || 0);
                  } else if (documentSort === 'count') {
                    comparison = (a.count || 0) - (b.count || 0);
                  } else {
                    comparison = a.type.localeCompare(b.type);
                  }
                  return documentSortOrder === 'asc' ? comparison : -comparison;
                });
                
                return (
                  <>
                    {filteredDocs.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.text.muted }} />
                        <p style={{ color: maturityTheme.colors.text.secondary }}>
                          No documents match the current filters.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setDocumentFilter({})}
                          className="mt-4"
                          style={{
                            borderColor: maturityTheme.colors.border.default,
                            color: maturityTheme.colors.text.primary,
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    ) : (
              <div className="space-y-2">
                        {filteredDocs.map((doc, idx) => (
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
                    )}
                  </>
                );
              })()}
            </CardContent>
          </MaturityCard>
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          <MaturityCard variant="elevated">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
              <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Gap Analysis</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                {assessment.gaps?.length || 0} gaps identified requiring improvement
              </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={gapFilter.priority || 'all'}
                    onChange={(e) => setGapFilter({ ...gapFilter, priority: e.target.value === 'all' ? undefined : e.target.value })}
                    className="text-sm rounded-md px-3 py-2 border bg-transparent"
                    style={{
                      borderColor: maturityTheme.colors.border.default,
                      color: maturityTheme.colors.text.primary,
                    }}
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={gapSort}
                    onChange={(e) => setGapSort(e.target.value as 'priority' | 'impact' | 'effort')}
                    className="text-sm rounded-md px-3 py-2 border bg-transparent"
                    style={{
                      borderColor: maturityTheme.colors.border.default,
                      color: maturityTheme.colors.text.primary,
                    }}
                  >
                    <option value="priority">Sort by Priority</option>
                    <option value="impact">Sort by Impact</option>
                    <option value="effort">Sort by Effort</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Apply filtering and sorting
                let filteredGaps = [...(assessment.gaps || [])];
                
                // Apply filters
                if (gapFilter.priority) {
                  filteredGaps = filteredGaps.filter(gap => gap.priority === gapFilter.priority);
                }
                if (gapFilter.category) {
                  filteredGaps = filteredGaps.filter(gap => gap.issueCategory === gapFilter.category);
                }
                
                // Apply sorting
                filteredGaps.sort((a, b) => {
                  if (gapSort === 'priority') {
                    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                  } else if (gapSort === 'impact') {
                    const currentA = Math.min(5, a.currentLevel);
                    const targetA = Math.min(5, a.targetLevel);
                    const currentB = Math.min(5, b.currentLevel);
                    const targetB = Math.min(5, b.targetLevel);
                    const impactA = targetA - currentA;
                    const impactB = targetB - currentB;
                    return impactB - impactA;
                  } else {
                    const effortA = a.estimated_improvement_points || 0;
                    const effortB = b.estimated_improvement_points || 0;
                    return effortA - effortB;
                  }
                });
                
                return filteredGaps.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.success.text }} />
                    <p style={{ color: maturityTheme.colors.text.secondary }}>
                      No gaps match the current filters.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setGapFilter({})}
                      className="mt-4"
                      style={{
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
              <div className="space-y-3">
                    {filteredGaps.map((gap, idx) => {
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
                          Level {Math.min(5, gap.currentLevel)} → {Math.min(5, gap.targetLevel)}
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
                );
              })()}
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
                  {assessment.recommendations
                    .filter(rec => {
                      if (recommendationFilter === 'all') return true;
                      const recLower = rec.toLowerCase();
                      return recLower.includes(recommendationFilter.toLowerCase());
                    })
                    .map((rec, idx) => (
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
          {(() => {
            const selectedIndustry = INDUSTRY_BENCHMARKS[selectedBenchmarkIndustry];
            const yourScore = assessment.benchmarks?.yourScore ?? assessment.averageQualityScore ?? 0;
            const industryAverage =
              selectedIndustry?.industryAverage ?? assessment.benchmarks?.industryAverage ?? 0;
            const topPerformers =
              selectedIndustry?.topPerformers ?? assessment.benchmarks?.topPerformers ?? 0;

            return (
          <MaturityCard variant="elevated">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Benchmarks</CardTitle>
              <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                    You're in the {assessment.benchmarks?.percentile || 0}th percentile compared to the selected industry benchmark.
              </CardDescription>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-xs uppercase tracking-wide" style={{ color: maturityTheme.colors.text.muted }}>
                    Compare against
                  </span>
                  <select
                    value={selectedBenchmarkIndustry}
                    onChange={(e) => setSelectedBenchmarkIndustry(e.target.value as IndustryKey)}
                    className="text-sm rounded-md px-3 py-2 border bg-transparent"
                    style={{
                      borderColor: maturityTheme.colors.border.default,
                      color: maturityTheme.colors.text.primary,
                    }}
                  >
                    {Object.entries(INDUSTRY_BENCHMARKS).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
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
                    {yourScore.toFixed(1)}
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
                    {industryAverage.toFixed(1)}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    {selectedIndustry?.label || 'Industry Average'}
                  </div>
                </div>
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ backgroundColor: maturityTheme.colors.success.bg }}
                >
                  <div className="text-3xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                    {topPerformers.toFixed(1)}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    Top Performers
                  </div>
                </div>
              </div>

              {selectedIndustry && (
                <div className="mt-6 space-y-4">
                  {/* Industry Overview */}
                  <div
                    className="p-4 rounded-lg text-sm"
                    style={{
                      borderColor: maturityTheme.colors.border.default,
                      borderWidth: '1px',
                      backgroundColor: maturityTheme.colors.background.tertiary,
                    }}
                  >
                    <div className="font-medium mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                      {selectedIndustry.label} Overview
                    </div>
                    <p className="text-sm mb-3" style={{ color: maturityTheme.colors.text.secondary }}>
                      {selectedIndustry.description}
                    </p>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: maturityTheme.colors.text.muted }}>
                          Maturity Level
                        </div>
                        <div className="font-semibold text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                          {selectedIndustry.maturityLevel || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: maturityTheme.colors.text.muted }}>
                          PMO Presence
                        </div>
                        <div className="font-semibold text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                          {selectedIndustry.pmoPresence || 0}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: maturityTheme.colors.text.muted }}>
                          Tool Adoption
                        </div>
                        <div className="font-semibold text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                          {selectedIndustry.toolAdoption || 0}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Challenges & Enablers */}
                  {(selectedIndustry.challenges || selectedIndustry.enablers) && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedIndustry.challenges && selectedIndustry.challenges.length > 0 && (
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            borderColor: maturityTheme.colors.warning.border,
                            borderWidth: '1px',
                            backgroundColor: maturityTheme.colors.warning.bg,
                          }}
                        >
                          <div className="font-medium mb-2 flex items-center gap-2" style={{ color: maturityTheme.colors.warning.text }}>
                            <AlertCircle className="h-4 w-4" />
                            Key Challenges
                          </div>
                          <ul className="space-y-1">
                            {selectedIndustry.challenges.map((challenge, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                                <span className="text-xs mt-1">•</span>
                                <span>{challenge}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {selectedIndustry.enablers && selectedIndustry.enablers.length > 0 && (
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            borderColor: maturityTheme.colors.success.border,
                            borderWidth: '1px',
                            backgroundColor: maturityTheme.colors.success.bg,
                          }}
                        >
                          <div className="font-medium mb-2 flex items-center gap-2" style={{ color: maturityTheme.colors.success.text }}>
                            <CheckCircle className="h-4 w-4" />
                            Key Enablers
                          </div>
                          <ul className="space-y-1">
                            {selectedIndustry.enablers.map((enabler, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                                <span className="text-xs mt-1">•</span>
                                <span>{enabler}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </MaturityCard>
            );
          })()}
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
              {/* Financial Metrics - Only show if data is available */}
              {(() => {
                const savings = assessment.roiMetrics?.savings;
                const roi = assessment.roiMetrics?.roi;
                const paybackPeriod = assessment.roiMetrics?.paybackPeriod;
                const targetCost = assessment.roiMetrics?.improvedCost;
                
                // Check if values are meaningful (not null, undefined, 0, "0", "Calculating...", or empty string)
                const hasSavings = savings != null && Number(savings) !== 0 && savings !== '';
                const hasROI = roi != null && Number(roi) !== 0 && roi !== '';
                const hasPaybackPeriod = paybackPeriod != null && 
                  paybackPeriod !== 'Calculating...' && 
                  paybackPeriod !== '' && 
                  String(paybackPeriod) !== '0' &&
                  Number(paybackPeriod) !== 0;
                const hasTargetCost = targetCost != null && Number(targetCost) !== 0 && targetCost !== '';
                
                // If no meaningful values, hide the entire section
                if (!hasSavings && !hasROI && !hasPaybackPeriod && !hasTargetCost) {
                  return null;
                }

                return (
              <div className="grid gap-4 md:grid-cols-4">
                    {hasSavings && (
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.success.bg,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                          ${typeof savings === 'number' ? savings.toLocaleString() : savings}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                          Annual Savings
                  </div>
                </div>
                    )}
                    {hasROI && (
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.info.bg,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.info.text }}>
                          {typeof roi === 'number' ? roi.toFixed(0) : roi}%
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    ROI
                  </div>
                </div>
                    )}
                    {hasPaybackPeriod && (
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.background.tertiary,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.primary[400] }}>
                          {paybackPeriod}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                    Payback Period
                  </div>
                </div>
                    )}
                    {hasTargetCost && (
                <div 
                  className="text-center p-6 rounded-lg"
                  style={{ 
                    borderColor: maturityTheme.colors.border.default,
                    borderWidth: '1px',
                    backgroundColor: maturityTheme.colors.warning.bg,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: maturityTheme.colors.warning.text }}>
                          ${typeof targetCost === 'number' ? targetCost.toLocaleString() : targetCost}
                  </div>
                  <div className="text-sm mt-2" style={{ color: maturityTheme.colors.text.secondary }}>
                          Target Annual Cost
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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

              {/* Expected Benefits Section */}
              <MaturityCard variant="elevated" className="mt-6">
                <CardHeader>
                  <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Expected Benefits & ROI</CardTitle>
                  <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                    Projected improvements from implementing ADPA recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Financial Metrics - Only show if available from audit */}
                  {(() => {
                    const savings = assessment.roiMetrics?.savings;
                    const roi = assessment.roiMetrics?.roi;
                    const paybackPeriod = assessment.roiMetrics?.paybackPeriod;
                    const targetCost = assessment.roiMetrics?.improvedCost;
                    
                    // Check if values are meaningful (not null, undefined, 0, "0", "Calculating...", or empty string)
                    const hasSavings = savings != null && Number(savings) !== 0 && savings !== '';
                    const hasROI = roi != null && Number(roi) !== 0 && roi !== '';
                    const hasPaybackPeriod = paybackPeriod != null && 
                      paybackPeriod !== 'Calculating...' && 
                      paybackPeriod !== '' && 
                      String(paybackPeriod) !== '0' &&
                      Number(paybackPeriod) !== 0;
                    const hasTargetCost = targetCost != null && Number(targetCost) !== 0 && targetCost !== '';
                    
                    if (hasSavings || hasROI || hasPaybackPeriod || hasTargetCost) {
                      return (
                        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {hasSavings && (
                            <div
                              className="p-4 rounded-lg text-center"
                              style={{
                                borderColor: maturityTheme.colors.success.border,
                                borderWidth: '1px',
                                backgroundColor: maturityTheme.colors.success.bg,
                              }}
                            >
                              <div className="text-xl font-bold mb-1" style={{ color: maturityTheme.colors.success.text }}>
                                ${typeof savings === 'number' ? savings.toLocaleString() : savings}
                              </div>
                              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                                Annual Savings
                              </div>
                            </div>
                          )}
                          {hasROI && (
                            <div
                              className="p-4 rounded-lg text-center"
                              style={{
                                borderColor: maturityTheme.colors.info.border,
                                borderWidth: '1px',
                                backgroundColor: maturityTheme.colors.info.bg,
                              }}
                            >
                              <div className="text-xl font-bold mb-1" style={{ color: maturityTheme.colors.info.text }}>
                                {typeof roi === 'number' ? roi.toFixed(0) : roi}%
                              </div>
                              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                                ROI
                              </div>
                            </div>
                          )}
                          {hasPaybackPeriod && (
                            <div
                              className="p-4 rounded-lg text-center"
                              style={{
                                borderColor: maturityTheme.colors.border.default,
                                borderWidth: '1px',
                                backgroundColor: maturityTheme.colors.background.tertiary,
                              }}
                            >
                              <div className="text-xl font-bold mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                                {paybackPeriod}
                              </div>
                              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                                Payback Period
                              </div>
                            </div>
                          )}
                          {hasTargetCost && (
                            <div
                              className="p-4 rounded-lg text-center"
                              style={{
                                borderColor: maturityTheme.colors.warning.border,
                                borderWidth: '1px',
                                backgroundColor: maturityTheme.colors.warning.bg,
                              }}
                            >
                              <div className="text-xl font-bold mb-1" style={{ color: maturityTheme.colors.warning.text }}>
                                ${typeof targetCost === 'number' ? targetCost.toLocaleString() : targetCost}
                              </div>
                              <div className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                                Target Annual Cost
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Qualitative Benefits */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div
                      className="p-4 rounded-lg flex items-start gap-3"
                      style={{
                        borderColor: maturityTheme.colors.success.border,
                        borderWidth: '1px',
                        backgroundColor: maturityTheme.colors.success.bg,
                      }}
                    >
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                      <div>
                        <div className="font-semibold text-sm mb-1" style={{ color: maturityTheme.colors.success.text }}>
                          25-30% Improvement
                        </div>
                        <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          In on-time delivery
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-lg flex items-start gap-3"
                      style={{
                        borderColor: maturityTheme.colors.success.border,
                        borderWidth: '1px',
                        backgroundColor: maturityTheme.colors.success.bg,
                      }}
                    >
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                      <div>
                        <div className="font-semibold text-sm mb-1" style={{ color: maturityTheme.colors.success.text }}>
                          20-25% Reduction
                        </div>
                        <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          In budget overruns
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-lg flex items-start gap-3"
                      style={{
                        borderColor: maturityTheme.colors.info.border,
                        borderWidth: '1px',
                        backgroundColor: maturityTheme.colors.info.bg,
                      }}
                    >
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.info.text }} />
                      <div>
                        <div className="font-semibold text-sm mb-1" style={{ color: maturityTheme.colors.info.text }}>
                          Standardized Quality
                        </div>
                        <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          Across all projects
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-lg flex items-start gap-3"
                      style={{
                        borderColor: maturityTheme.colors.info.border,
                        borderWidth: '1px',
                        backgroundColor: maturityTheme.colors.info.bg,
                      }}
                    >
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.info.text }} />
                      <div>
                        <div className="font-semibold text-sm mb-1" style={{ color: maturityTheme.colors.info.text }}>
                          Improved Satisfaction
                        </div>
                        <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          Stakeholder satisfaction
                        </div>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-lg flex items-start gap-3"
                      style={{
                        borderColor: maturityTheme.colors.info.border,
                        borderWidth: '1px',
                        backgroundColor: maturityTheme.colors.info.bg,
                      }}
                    >
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.info.text }} />
                      <div>
                        <div className="font-semibold text-sm mb-1" style={{ color: maturityTheme.colors.info.text }}>
                          Better Allocation
                        </div>
                        <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                          Resource allocation
                        </div>
                  </div>
                </div>
              </div>
                </CardContent>
              </MaturityCard>
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
                // Map document types to PMBOK 8th Edition Performance Domains
                // Based on entity extraction examples from PMBOK8_EXTRACTION_COVERAGE_ANALYSIS.md
                // Mapping rationale: Each document type is mapped based on which entities are typically extracted from it
                // 
                // Entity Extraction Reference:
                // - Stakeholders domain: extracts stakeholders entities
                // - Team domain: extracts resources entities (human resources)
                // - Planning domain: extracts requirements, scope_items, milestones, phases, activities, deliverables, constraints, success_criteria
                // - Project Work domain: extracts activities, deliverables, work performance data
                // - Delivery domain: extracts deliverables, success_criteria, best_practices
                // - Measurement domain: extracts quality_standards, success_criteria, performance measurements
                // - Uncertainty domain: extracts risks, constraints, opportunities
                // - Development Approach domain: extracts phases, activities, development approach metadata
                const mapDocumentTypeToDomain = (documentType: string): string => {
                  const type = documentType.toLowerCase();
                  
                  // 1. STAKEHOLDERS Performance Domain
                  // Extracts: stakeholders entities
                  if (type.includes('stakeholder register') || type.includes('stakeholder engagement plan') || 
                      type.includes('communications management plan') || type.includes('communication plan')) {
                    return 'stakeholders';
                  }
                  
                  // 2. TEAM Performance Domain
                  // Extracts: resources entities (human resources)
                  if (type.includes('resource management plan') || type.includes('human resource') || 
                      type.includes('team') && (type.includes('plan') || type.includes('agreement'))) {
                    return 'team';
                  }
                  
                  // 3. UNCERTAINTY Performance Domain (check before planning to avoid conflicts)
                  // Extracts: risks, constraints entities
                  if (type.includes('risk register') || type.includes('risk management plan') || 
                      type.includes('contingency') || type.includes('mitigation plan')) {
                    return 'uncertainty';
                  }
                  
                  // 4. MEASUREMENT Performance Domain (check before planning)
                  // Extracts: quality_standards, success_criteria entities
                  if (type.includes('quality management plan') || type.includes('quality plan') || 
                      type.includes('test plan') || type.includes('quality assurance')) {
                    return 'measurement';
                  }
                  
                  // 5. DELIVERY Performance Domain (check before project work)
                  // Extracts: deliverables, success_criteria, best_practices entities
                  if (type.includes('closure report') || type.includes('lessons learned') || 
                      type.includes('handover') || type.includes('transition plan')) {
                    return 'delivery';
                  }
                  
                  // 6. DEVELOPMENT APPROACH and Life Cycle Domain
                  // Extracts: phases, activities, development approach entities
                  // Focus: HOW to build (methodology, technical approach, architecture, implementation)
                  if (type.includes('development approach') || type.includes('lifecycle') || type.includes('life cycle') || 
                      type.includes('methodology') || type.includes('agile') || type.includes('waterfall') || 
                      type.includes('scrum') || type.includes('kanban') || 
                      type.includes('process flow diagram') || type.includes('business process model') ||
                      type.includes('data model') && !type.includes('requirements') ||
                      type.includes('technical specification') || type.includes('technical spec') ||
                      type.includes('architecture') || type.includes('system design') ||
                      type.includes('gap analysis') || // How to bridge gaps (implementation approach)
                      type.includes('use case') || type.includes('user story')) { // Implementation details
                    return 'development_approach';
                  }
                  
                  // 7. PROJECT WORK Performance Domain
                  // Extracts: activities, deliverables, work performance data
                  // Focus: Ongoing execution, coordination, operational management
                  if (type.includes('status report') || type.includes('progress report') || 
                      type.includes('meeting minutes') || type.includes('action items') || 
                      type.includes('decision log') || type.includes('issue log') ||
                      type.includes('change management plan') || type.includes('configuration management plan') ||
                      type.includes('procurement management plan') || type.includes('procurement plan')) {
                    return 'project_work';
                  }
                  
                  // 8. PLANNING Performance Domain
                  // Extracts: requirements, scope_items, milestones, phases, activities, deliverables, constraints, success_criteria
                  // Focus: WHAT to build, initial planning, scope definition, baselines
                  if (type.includes('project charter') || type.includes('business case') ||
                      type.includes('scope statement') || type.includes('wbs') || type.includes('work breakdown structure') ||
                      type.includes('schedule baseline') || type.includes('cost baseline') ||
                      type.includes('requirements document') || type.includes('requirements traceability matrix') ||
                      type.includes('business requirements document') || type.includes('brd') ||
                      type.includes('project management plan') || type.includes('pmp') ||
                      type.includes('feasibility study') || // Initial planning decision
                      type.includes('requirement') && !type.includes('technical') ||
                      type.includes('specification') && !type.includes('technical') && !type.includes('functional')) {
                    return 'planning';
                  }
                  
                  // Functional specifications can be Planning (what functions) or Development Approach (how to implement)
                  // Defaulting to Planning as they often define WHAT functions are needed
                  if (type.includes('functional specification') || type.includes('functional spec')) {
                    return 'planning';
                  }
                  
                  // Default fallback to Planning (most documents are planning-related)
                  return 'planning';
                };

                // Count documents by performance domain and calculate average scores
                const domainCounts: Record<string, { count: number; documentTypes: string[]; avgScore: number; totalScore: number; scoreCount: number }> = {};
                
                if (assessment.documentsByType && Array.isArray(assessment.documentsByType)) {
                  assessment.documentsByType.forEach((doc: { type: string; count: number; avgScore?: number }) => {
                    const domain = mapDocumentTypeToDomain(doc.type);
                    if (!domainCounts[domain]) {
                      domainCounts[domain] = { count: 0, documentTypes: [], avgScore: 0, totalScore: 0, scoreCount: 0 };
                    }
                    domainCounts[domain].count += doc.count;
                    if (!domainCounts[domain].documentTypes.includes(doc.type)) {
                      domainCounts[domain].documentTypes.push(doc.type);
                    }
                    // Calculate weighted average score
                    if (doc.avgScore != null && doc.avgScore > 0) {
                      domainCounts[domain].totalScore += doc.avgScore * doc.count;
                      domainCounts[domain].scoreCount += doc.count;
                    }
                  });
                  
                  // Calculate final average scores per domain
                  Object.keys(domainCounts).forEach(domain => {
                    if (domainCounts[domain].scoreCount > 0) {
                      domainCounts[domain].avgScore = domainCounts[domain].totalScore / domainCounts[domain].scoreCount;
                    } else {
                      domainCounts[domain].avgScore = 0;
                    }
                  });
                }

                // Extract domain scores from assessment_data if available
                const assessmentData = (assessment as any).assessment_data;
                const domainScores = assessmentData?.breakdown?.by_performance_domain || 
                                    assessmentData?.domain_scores || 
                                    assessmentData?.performance_domains || [];

                // Expected documents for each PMBOK 8 Performance Domain
                // Based on PMBOK 8th Edition best practices and entity extraction requirements
                const expectedDocumentsByDomain: Record<string, string[]> = {
                  stakeholders: [
                    'Stakeholder Register',
                    'Stakeholder Engagement Plan',
                    'Communications Management Plan'
                  ],
                  team: [
                    'Resource Management Plan',
                    'Team Charter',
                    'Team Agreements'
                  ],
                  development_approach: [
                    'Development Approach Document',
                    'Methodology Selection',
                    'Life Cycle Definition',
                    'Integration Management Plan',
                    'Technical Specification',
                    'Gap Analysis',
                    'Use Case Document',
                    'User Story'
                  ],
                  planning: [
                    'Project Charter',
                    'Business Case',
                    'Scope Statement',
                    'Work Breakdown Structure (WBS)',
                    'Schedule Baseline',
                    'Cost Baseline',
                    'Requirements Document',
                    'Project Management Plan',
                    'Functional Specification'
                  ],
                  project_work: [
                    'Status Report',
                    'Progress Report',
                    'Meeting Minutes',
                    'Decision Log',
                    'Issue Log',
                    'Action Items',
                    'Change Management Plan',
                    'Procurement Management Plan'
                  ],
                  delivery: [
                    'Closure Report',
                    'Lessons Learned',
                    'Handover Document',
                    'Acceptance Forms'
                  ],
                  measurement: [
                    'Quality Management Plan',
                    'Test Plan',
                    'Performance Metrics',
                    'KPI Dashboard'
                  ],
                  uncertainty: [
                    'Risk Register',
                    'Risk Management Plan',
                    'Contingency Plan'
                  ]
                };

                // Helper function to find missing expected documents
                const findMissingDocuments = (domainKey: string, presentTypes: string[]): string[] => {
                  const expected = expectedDocumentsByDomain[domainKey] || [];
                  const presentLower = presentTypes.map(t => t.toLowerCase());
                  return expected.filter(expectedDoc => {
                    const expectedLower = expectedDoc.toLowerCase();
                    // Check if any present document type matches the expected document
                    return !presentLower.some(present => 
                      present.includes(expectedLower) || expectedLower.includes(present)
                    );
                  });
                };

                // Default PMBOK 8 Performance Domains
                const performanceDomains = [
                  { key: 'stakeholders', name: 'Stakeholders Performance Domain', icon: Target },
                  { key: 'team', name: 'Team Performance Domain', icon: BarChart3 },
                  { key: 'development_approach', name: 'Development Approach and Life Cycle', icon: TrendingUp },
                  { key: 'planning', name: 'Planning Performance Domain', icon: FileText },
                  { key: 'project_work', name: 'Project Work Performance Domain', icon: CheckCircle },
                  { key: 'delivery', name: 'Delivery Performance Domain', icon: CheckCircle },
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
                        const domainKey = domainScore.key || performanceDomains[idx]?.key || 'planning';
                        const score = domainScore.score || domainScore.maturity_level || 0;
                        const level = scoreToLevel(score);
                        const maturityLabel = getMaturityLabel(score);
                        const domainColor = getDomainColor(level);
                        const Icon = performanceDomains[idx]?.icon || FileText;
                        const documentCount = domainCounts[domainKey]?.count || 0;
                        const documentTypes = domainCounts[domainKey]?.documentTypes || [];
                        const avgScore = domainCounts[domainKey]?.avgScore || 0;
                        const missingDocuments = findMissingDocuments(domainKey, documentTypes);
                        const hasMissing = missingDocuments.length > 0;
                        const isExpanded = expandedMissingDocs[domainKey] || false;

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border"
                            style={{
                              borderColor: hasMissing ? maturityTheme.colors.warning.border : maturityTheme.colors.border.default,
                              backgroundColor: maturityTheme.colors.background.tertiary,
                            }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className="p-2 rounded-lg"
                                  style={{ backgroundColor: domainColor.bg }}
                                >
                                  <Icon className="h-5 w-5" style={{ color: domainColor.text }} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                                    {domainName}
                                  </h4>
                                    {documentCount > 0 && (
                                      <Badge 
                                        variant="secondary"
                                        style={{ 
                                          backgroundColor: maturityTheme.colors.info.bg,
                                          color: maturityTheme.colors.info.text 
                                        }}
                                      >
                                        {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                                      </Badge>
                                    )}
                                    {hasMissing && (
                                      <Badge 
                                        variant="secondary"
                                        style={{ 
                                          backgroundColor: maturityTheme.colors.warning.bg,
                                          color: maturityTheme.colors.warning.text 
                                        }}
                                      >
                                        {missingDocuments.length} missing
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                                    {maturityLabel} (Level {level})
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                                      Document Average:
                                    </p>
                                    <Badge 
                                      variant="secondary"
                                      style={{ 
                                        backgroundColor: documentCount > 0 ? maturityTheme.colors.success.bg : maturityTheme.colors.background.tertiary,
                                        color: documentCount > 0 ? maturityTheme.colors.success.text : maturityTheme.colors.text.muted 
                                      }}
                                    >
                                      {avgScore.toFixed(1)}%
                                    </Badge>
                                  </div>
                                  {documentTypes.length > 0 && (
                                    <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
                                      Types: {documentTypes.slice(0, 3).join(', ')}{documentTypes.length > 3 ? ` +${documentTypes.length - 3} more` : ''}
                                    </p>
                                  )}
                                  
                                  {/* Missing Documents Highlight - Collapsible */}
                                  {hasMissing && (
                                    <div className="mt-3">
                                      <button
                                        onClick={() => setExpandedMissingDocs(prev => ({ ...prev, [domainKey]: !prev[domainKey] }))}
                                        className="w-full flex items-center justify-between p-2 rounded-lg hover:opacity-80 transition-opacity"
                                        style={{
                                          backgroundColor: maturityTheme.colors.warning.bg,
                                          borderColor: maturityTheme.colors.warning.border,
                                          borderWidth: '1px',
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="h-4 w-4" style={{ color: maturityTheme.colors.warning.text }} />
                                          <p className="text-xs font-semibold" style={{ color: maturityTheme.colors.warning.text }}>
                                            {missingDocuments.length} Expected Document{missingDocuments.length !== 1 ? 's' : ''} Missing
                                          </p>
                                        </div>
                                        {isExpanded ? (
                                          <ChevronUp className="h-4 w-4" style={{ color: maturityTheme.colors.warning.text }} />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" style={{ color: maturityTheme.colors.warning.text }} />
                                        )}
                                      </button>
                                      {isExpanded && (
                                        <div 
                                          className="mt-2 p-3 rounded-lg"
                                          style={{
                                            backgroundColor: maturityTheme.colors.warning.bg,
                                            borderColor: maturityTheme.colors.warning.border,
                                            borderWidth: '1px',
                                          }}
                                        >
                                          <ul className="text-xs space-y-1" style={{ color: maturityTheme.colors.text.secondary }}>
                                            {missingDocuments.map((doc, docIdx) => (
                                              <li key={docIdx} className="flex items-start gap-1">
                                                <span className="mt-0.5">•</span>
                                                <span>{doc}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
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

                // Fallback: Show all performance domains with document counts
                return (
                  <div className="space-y-4">
                    {performanceDomains.map((domain, idx) => {
                      const documentCount = domainCounts[domain.key]?.count || 0;
                      const documentTypes = domainCounts[domain.key]?.documentTypes || [];
                      const avgScore = domainCounts[domain.key]?.avgScore || 0;
                      const Icon = domain.icon;
                      const missingDocuments = findMissingDocuments(domain.key, documentTypes);
                      const expectedDocuments = expectedDocumentsByDomain[domain.key] || [];
                      const hasMissing = missingDocuments.length > 0;
                      const isExpanded = expandedMissingDocs[domain.key] || false;

                      return (
                        <div
                          key={domain.key}
                          className="p-4 rounded-lg border"
                          style={{
                            borderColor: hasMissing ? maturityTheme.colors.warning.border : maturityTheme.colors.border.default,
                            backgroundColor: maturityTheme.colors.background.tertiary,
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                className="p-2 rounded-lg"
                                style={{ 
                                  backgroundColor: maturityTheme.colors.background.elevated,
                                }}
                              >
                                <Icon className="h-5 w-5" style={{ color: maturityTheme.colors.primary[400] }} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                                    {domain.name}
                                  </h4>
                                  {documentCount > 0 && (
                                    <Badge 
                                      variant="secondary"
                                      style={{ 
                                        backgroundColor: maturityTheme.colors.info.bg,
                                        color: maturityTheme.colors.info.text 
                                      }}
                                    >
                                      {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                                    </Badge>
                                  )}
                                  {hasMissing && (
                                    <Badge 
                                      variant="secondary"
                                      style={{ 
                                        backgroundColor: maturityTheme.colors.warning.bg,
                                        color: maturityTheme.colors.warning.text 
                                      }}
                                    >
                                      {missingDocuments.length} missing
                                    </Badge>
                                  )}
                                </div>
                                {/* Calculate maturity level from average score */}
                                {(() => {
                                  const scoreLevel = Math.min(5, Math.max(1, Math.round(avgScore / 20))); // Convert 0-100% to 1-5 level
                                  const maturityLabel = scoreLevel < 2 ? 'Initial' : scoreLevel < 3 ? 'Developing' : scoreLevel < 4 ? 'Defined' : scoreLevel < 5 ? 'Managed' : 'Optimizing';
                                  return (
                                    <>
                    <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                                        {maturityLabel} (Level {scoreLevel})
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                                          Document Average:
                                        </p>
                                        <Badge 
                                          variant="secondary"
                                          style={{ 
                                            backgroundColor: documentCount > 0 ? maturityTheme.colors.success.bg : maturityTheme.colors.background.tertiary,
                                            color: documentCount > 0 ? maturityTheme.colors.success.text : maturityTheme.colors.text.muted 
                                          }}
                                        >
                                          {avgScore.toFixed(1)}%
                                        </Badge>
                  </div>
                                    </>
                );
                                })()}
                                {documentTypes.length > 0 ? (
                                  <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
                                    Document types: {documentTypes.slice(0, 5).join(', ')}{documentTypes.length > 5 ? ` +${documentTypes.length - 5} more` : ''}
                                  </p>
                                ) : (
                                  <p className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
                                    No documents assigned to this domain
                                  </p>
                                )}
                                
                                {/* Missing Documents Highlight - Collapsible */}
                                {hasMissing && (
                                  <div className="mt-3">
                                    <button
                                      onClick={() => setExpandedMissingDocs(prev => ({ ...prev, [domain.key]: !prev[domain.key] }))}
                                      className="w-full flex items-center justify-between p-2 rounded-lg hover:opacity-80 transition-opacity"
                                      style={{
                                        backgroundColor: maturityTheme.colors.warning.bg,
                                        borderColor: maturityTheme.colors.warning.border,
                                        borderWidth: '1px',
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" style={{ color: maturityTheme.colors.warning.text }} />
                                        <p className="text-xs font-semibold" style={{ color: maturityTheme.colors.warning.text }}>
                                          {missingDocuments.length} Expected Document{missingDocuments.length !== 1 ? 's' : ''} Missing
                                        </p>
                                      </div>
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" style={{ color: maturityTheme.colors.warning.text }} />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" style={{ color: maturityTheme.colors.warning.text }} />
                                      )}
                                    </button>
                                    {isExpanded && (
                                      <div 
                                        className="mt-2 p-3 rounded-lg"
                                        style={{
                                          backgroundColor: maturityTheme.colors.warning.bg,
                                          borderColor: maturityTheme.colors.warning.border,
                                          borderWidth: '1px',
                                        }}
                                      >
                                        <ul className="text-xs space-y-1" style={{ color: maturityTheme.colors.text.secondary }}>
                                          {missingDocuments.map((doc, docIdx) => (
                                            <li key={docIdx} className="flex items-start gap-1">
                                              <span className="mt-0.5">•</span>
                                              <span>{doc}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const scoreLevel = Math.min(5, Math.max(1, Math.round(avgScore / 20))); // Convert 0-100% to 1-5 level
                                return (
                                  <MaturityScore
                                    level={scoreLevel as 1 | 2 | 3 | 4 | 5}
                                    label={scoreLevel < 2 ? 'Initial' : scoreLevel < 3 ? 'Developing' : scoreLevel < 4 ? 'Defined' : scoreLevel < 5 ? 'Managed' : 'Optimizing'}
                                    size="sm"
                                    animated={false}
                                  />
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );

              })()}
            </CardContent>
          </MaturityCard>
        </TabsContent>

        {/* Quality Analysis Tab */}
        <TabsContent value="quality" className="space-y-4">
          {(() => {
            // Calculate portfolio-level quality dimensions
            // For now, we'll aggregate from document types, but ideally this would come from assessment_data
            const qualityDimensions = [
              { 
                id: 'completeness', 
                label: 'Completeness', 
                description: 'Presence of all required sections',
                score: assessment.documentsByType?.reduce((sum, doc) => sum + (doc.avgScore || 0), 0) / (assessment.documentsByType?.length || 1) || 0,
                target: 75
              },
              { 
                id: 'structure', 
                label: 'Structure Score', 
                description: 'Logical organization and hierarchy',
                score: assessment.documentsByType?.reduce((sum, doc) => sum + (doc.avgScore || 0), 0) / (assessment.documentsByType?.length || 1) || 0,
                target: 75
              },
              { 
                id: 'formatting', 
                label: 'Formatting Score', 
                description: 'Markdown syntax quality',
                score: assessment.documentsByType?.reduce((sum, doc) => sum + (doc.avgScore || 0), 0) / (assessment.documentsByType?.length || 1) || 0,
                target: 70
              },
              { 
                id: 'contentDepth', 
                label: 'Content Depth', 
                description: 'Level of detail and comprehensiveness',
                score: assessment.documentsByType?.reduce((sum, doc) => sum + (doc.avgScore || 0), 0) / (assessment.documentsByType?.length || 1) || 0,
                target: 80
              },
              { 
                id: 'accuracy', 
                label: 'Accuracy', 
                description: 'Information precision and factual correctness',
                score: assessment.averageQualityScore || 0,
                target: 85
              },
              { 
                id: 'consistency', 
                label: 'Consistency', 
                description: 'Internal coherence and uniform terminology',
                score: assessment.averageQualityScore || 0,
                target: 80
              },
              { 
                id: 'contextRelevance', 
                label: 'Context Relevance', 
                description: 'Relevance to project context',
                score: assessment.averageQualityScore || 0,
                target: 85
              },
              { 
                id: 'professionalQuality', 
                label: 'Professional Quality', 
                description: 'Professional writing standards',
                score: assessment.averageQualityScore || 0,
                target: 85
              },
              { 
                id: 'standardsCompliance', 
                label: 'Standards Compliance', 
                description: 'Framework compliance (PMBOK/BABOK/DMBOK)',
                score: assessment.averageQualityScore || 0,
                target: 85
              },
              { 
                id: 'complexity', 
                label: 'Complexity Score', 
                description: 'Document complexity (higher = more complex)',
                score: assessment.averageQualityScore || 0,
                target: 70
              },
            ];

            const sortedDimensions = [...qualityDimensions].sort((a, b) => a.score - b.score);
            const weakestDimensions = sortedDimensions.slice(0, 3);
            const strongestDimensions = [...qualityDimensions].sort((a, b) => b.score - a.score).slice(0, 3);

            return (
              <>
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle style={{ color: maturityTheme.colors.text.primary }}>10-Dimension Quality Analysis</CardTitle>
                    <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                      Comprehensive quality assessment across all dimensions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {qualityDimensions.map((dimension) => {
                        const isBelowTarget = dimension.score < dimension.target;
                        return (
                          <div
                            key={dimension.id}
                            className="p-4 rounded-lg"
                            style={{
                              backgroundColor: maturityTheme.colors.background.tertiary,
                              borderColor: isBelowTarget ? maturityTheme.colors.warning.border : maturityTheme.colors.border.default,
                              borderWidth: '1px',
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                                  {dimension.label}
                                </div>
                                <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
                                  {dimension.description}
                                </div>
                              </div>
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: isBelowTarget ? maturityTheme.colors.warning.bg : maturityTheme.colors.success.bg,
                                  color: isBelowTarget ? maturityTheme.colors.warning.text : maturityTheme.colors.success.text,
                                }}
                              >
                                {dimension.score.toFixed(1)}%
                              </Badge>
                            </div>
                            <Progress value={dimension.score} className="h-2 mb-1" />
                            <div className="flex justify-between text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                              <span>Target: {dimension.target}%</span>
                              <span>{dimension.score >= dimension.target ? '✓ Met' : '⚠ Below'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </MaturityCard>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Weakest Dimensions */}
                  <MaturityCard variant="elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <AlertCircle className="h-5 w-5" style={{ color: maturityTheme.colors.warning.text }} />
                        Areas Needing Improvement
                      </CardTitle>
                      <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                        Dimensions below target requiring attention
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {weakestDimensions.map((dimension, idx) => {
                          const gap = dimension.target - dimension.score;
                          return (
                            <div
                              key={dimension.id}
                              className="p-3 rounded-lg"
                              style={{
                                backgroundColor: maturityTheme.colors.warning.bg,
                                borderColor: maturityTheme.colors.warning.border,
                                borderWidth: '1px',
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-sm" style={{ color: maturityTheme.colors.warning.text }}>
                                  {dimension.label}
                                </div>
                                <Badge
                                  variant="secondary"
                                  style={{
                                    backgroundColor: maturityTheme.colors.warning.text,
                                    color: 'white',
                                  }}
                                >
                                  {dimension.score.toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                                {gap > 0 ? `${gap.toFixed(1)}% below target` : 'At target'}
                              </div>
                              <Progress value={dimension.score} className="h-1.5 mt-2" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </MaturityCard>

                  {/* Strongest Dimensions */}
                  <MaturityCard variant="elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <CheckCircle className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                        Strongest Dimensions
                      </CardTitle>
                      <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                        Your highest-performing quality areas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {strongestDimensions.map((dimension, idx) => (
                          <div
                            key={dimension.id}
                            className="p-3 rounded-lg"
                            style={{
                              backgroundColor: maturityTheme.colors.success.bg,
                              borderColor: maturityTheme.colors.success.border,
                              borderWidth: '1px',
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm" style={{ color: maturityTheme.colors.success.text }}>
                                {dimension.label}
                              </div>
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: maturityTheme.colors.success.text,
                                  color: 'white',
                                }}
                              >
                                {dimension.score.toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                              {dimension.score >= dimension.target ? '✓ Exceeds target' : 'At target'}
                            </div>
                            <Progress value={dimension.score} className="h-1.5 mt-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </MaturityCard>
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* Action Plan Tab */}
        <TabsContent value="action-plan" className="space-y-4">
          {/* AI-Powered Recommendations Section */}
          {assessment.ai_recommendations && (
            <div className="space-y-4">
              {/* Quick Wins */}
              {assessment.ai_recommendations.quick_wins && assessment.ai_recommendations.quick_wins.length > 0 && (
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                      <TrendingUp className="h-5 w-5" style={{ color: maturityTheme.colors.success.text }} />
                      AI-Powered Quick Wins ({assessment.ai_recommendations.quick_wins.length})
                    </CardTitle>
                    <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                      High-impact actions with low effort - start here for immediate improvements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assessment.ai_recommendations.quick_wins.map((rec) => {
                        const categoryColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
                          structure: maturityTheme.colors.info,
                          completeness: maturityTheme.colors.warning,
                          compliance: maturityTheme.colors.info,
                          quality: maturityTheme.colors.success,
                          consistency: maturityTheme.colors.error,
                        };
                        const categoryColor = categoryColors[rec.category] || maturityTheme.colors.info;
                        
                        return (
                          <div
                            key={rec.id}
                            className="p-4 rounded-lg border"
                            style={{
                              backgroundColor: maturityTheme.colors.background.tertiary,
                              borderColor: categoryColor.border || maturityTheme.colors.border.default,
                              borderWidth: '2px',
                            }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                                    {rec.title}
                                  </h4>
                                  <Badge style={{
                                    backgroundColor: categoryColor.bg,
                                    color: categoryColor.text,
                                  }}>
                                    {rec.category}
                                  </Badge>
                                  <Badge style={{
                                    backgroundColor: maturityTheme.colors.success.bg,
                                    color: maturityTheme.colors.success.text,
                                  }}>
                                    {rec.effort_level} effort
                                  </Badge>
                                </div>
                                <p className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                                  {rec.description}
                                </p>
                              </div>
                              <div className="ml-4 text-right">
                                <div className="text-2xl font-bold" style={{ color: categoryColor.text }}>
                                  {rec.impact_score}
                                </div>
                                <div className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                                  Impact Score
                                </div>
                              </div>
                            </div>
                            
                            {/* Expected Improvement */}
                            <div className="mb-3 p-3 rounded-lg" style={{
                              backgroundColor: maturityTheme.colors.success.bg,
                              borderColor: maturityTheme.colors.success.border,
                              borderWidth: '1px',
                            }}>
                              <div className="text-xs font-semibold mb-1" style={{ color: maturityTheme.colors.success.text }}>
                                Expected Improvement
                              </div>
                              <div className="text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                                {rec.expected_improvement}
                              </div>
                            </div>

                            {/* Action Steps */}
                            <div className="mb-3">
                              <div className="text-xs font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                                Action Steps ({rec.estimated_time_hours}h total)
                              </div>
                              <div className="space-y-2">
                                {rec.steps.map((step) => (
                                  <div
                                    key={step.step_number}
                                    className="flex items-start gap-3 p-2 rounded"
                                    style={{ backgroundColor: maturityTheme.colors.background.elevated }}
                                  >
                                    <div
                                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                      style={{
                                        backgroundColor: categoryColor.bg,
                                        color: categoryColor.text,
                                      }}
                                    >
                                      {step.step_number}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                                        {step.action}
                                      </div>
                                      <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                                        {step.details}
                                      </div>
                                      <div className="text-xs mt-1" style={{ color: maturityTheme.colors.text.muted }}>
                                        ⏱ {step.estimated_time_minutes} min
                                        {step.tools_needed && step.tools_needed.length > 0 && (
                                          <span> | 🔧 {step.tools_needed.join(', ')}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Template Suggestions */}
                            {rec.template_suggestions && rec.template_suggestions.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs font-semibold mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                                  📄 Suggested Templates
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {rec.template_suggestions.map((template, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      style={{
                                        backgroundColor: maturityTheme.colors.background.elevated,
                                        color: maturityTheme.colors.text.secondary,
                                      }}
                                    >
                                      {template}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Affected Documents */}
                            {rec.affected_documents && rec.affected_documents.length > 0 && (
                              <div className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                                Affects: {rec.affected_documents.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </MaturityCard>
              )}

              {/* Implementation Roadmap */}
              {assessment.ai_recommendations.implementation_roadmap && assessment.ai_recommendations.implementation_roadmap.length > 0 && (
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                      <Target className="h-5 w-5" style={{ color: maturityTheme.colors.primary[400] }} />
                      AI-Generated Implementation Roadmap
                    </CardTitle>
                    <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                      Phased approach to achieve your target maturity level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assessment.ai_recommendations.implementation_roadmap.map((phase) => (
                        <div
                          key={phase.phase_number}
                          className="p-4 rounded-lg border"
                          style={{
                            backgroundColor: maturityTheme.colors.background.tertiary,
                            borderColor: maturityTheme.colors.border.default,
                            borderWidth: '1px',
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge style={{
                                  backgroundColor: maturityTheme.colors.primary[500],
                                  color: 'white',
                                }}>
                                  Phase {phase.phase_number}
                                </Badge>
                                <h4 className="font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                                  {phase.phase_name}
                                </h4>
                              </div>
                              <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                                Duration: {phase.duration_weeks} weeks
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold" style={{ color: maturityTheme.colors.success.text }}>
                                +{phase.expected_maturity_improvement.toFixed(1)}
                              </div>
                              <div className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                                Maturity Gain
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <div className="text-xs font-semibold mb-1" style={{ color: maturityTheme.colors.text.primary }}>
                              Success Metrics
                            </div>
                            <div className="space-y-1">
                              {phase.success_metrics.map((metric, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <CheckCircle className="h-3 w-3 mt-0.5" style={{ color: maturityTheme.colors.success.text }} />
                                  <span className="text-xs" style={{ color: maturityTheme.colors.text.secondary }}>
                                    {metric}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </MaturityCard>
              )}
            </div>
          )}

          {(() => {
            // Generate prioritized action plan from gaps
            const actionItems = (assessment.gaps || [])
              .map((gap, idx) => {
                const current = Math.min(5, gap.currentLevel);
                const target = Math.min(5, gap.targetLevel);
                const effort = gap.estimated_improvement_points || 0;
                const impact = target - current;
                const priorityScore = 
                  (gap.priority === 'critical' ? 4 : gap.priority === 'high' ? 3 : gap.priority === 'medium' ? 2 : 1) * 10 +
                  impact * 5 -
                  effort * 2;

                return {
                  id: `gap-${idx}`,
                  title: gap.documentType || gap.documentTitle || 'Improve Documentation',
                  description: gap.description,
                  priority: gap.priority,
                  currentLevel: current,
                  targetLevel: target,
                  effort: effort || 'Medium',
                  impact: impact,
                  priorityScore,
                  recommendations: gap.recommendations || (gap.recommendation ? [gap.recommendation] : []),
                  estimatedEffort: gap.estimatedEffort || '2-4 weeks',
                  category: gap.issueCategory || 'General',
                };
              })
              .filter(action => action.currentLevel < action.targetLevel && action.targetLevel <= 5)
              .sort((a, b) => b.priorityScore - a.priorityScore);

            const criticalActions = actionItems.filter(a => a.priority === 'critical');
            const highPriorityActions = actionItems.filter(a => a.priority === 'high');
            const mediumPriorityActions = actionItems.filter(a => a.priority === 'medium');
            const lowPriorityActions = actionItems.filter(a => a.priority === 'low');

            return (
              <>
                <MaturityCard variant="elevated">
                  <CardHeader>
                    <CardTitle style={{ color: maturityTheme.colors.text.primary }}>Prioritized Action Plan</CardTitle>
                    <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
                      {actionItems.length} improvement actions organized by priority
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Critical Actions */}
                      {criticalActions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="h-5 w-5" style={{ color: maturityTheme.colors.warning.text }} />
                            <h3 className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                              Critical Priority ({criticalActions.length})
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {criticalActions.map((action) => (
                              <div
                                key={action.id}
                                className="p-4 rounded-lg"
                                style={{
                                  backgroundColor: maturityTheme.colors.warning.bg,
                                  borderColor: maturityTheme.colors.warning.border,
                                  borderWidth: '2px',
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold" style={{ color: maturityTheme.colors.warning.text }}>
                                        {action.title}
                                      </h4>
                                      <Badge
                                        style={{
                                          backgroundColor: maturityTheme.colors.warning.text,
                                          color: 'white',
                                        }}
                                      >
                                        Critical
                                      </Badge>
                                    </div>
                                    <p className="text-sm mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                                      {action.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                                  <div>
                                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: maturityTheme.colors.text.muted }}>
                                      Current → Target
                                    </div>
                                    <div style={{ color: maturityTheme.colors.text.primary }}>
                                      Level {Math.min(5, action.currentLevel)} → {Math.min(5, action.targetLevel)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: maturityTheme.colors.text.muted }}>
                                      Impact
                                    </div>
                                    <div style={{ color: maturityTheme.colors.text.primary }}>
                                      +{action.impact} level{action.impact !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: maturityTheme.colors.text.muted }}>
                                      Estimated Effort
                                    </div>
                                    <div style={{ color: maturityTheme.colors.text.primary }}>
                                      {action.estimatedEffort}
                                    </div>
                                  </div>
                                </div>
                                {action.recommendations.length > 0 && (
                                  <div className="mt-3 pt-3 border-t" style={{ borderColor: maturityTheme.colors.border.default }}>
                                    <div className="text-xs uppercase tracking-wide mb-2" style={{ color: maturityTheme.colors.text.muted }}>
                                      Recommended Actions:
                                    </div>
                                    <ul className="space-y-1">
                                      {action.recommendations.map((rec, idx) => (
                                        <li key={idx} className="text-sm flex items-start gap-2" style={{ color: maturityTheme.colors.text.secondary }}>
                                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* High Priority Actions */}
                      {highPriorityActions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="h-5 w-5" style={{ color: maturityTheme.colors.info.text }} />
                            <h3 className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                              High Priority ({highPriorityActions.length})
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {highPriorityActions.map((action) => (
                              <div
                                key={action.id}
                                className="p-4 rounded-lg"
                                style={{
                                  backgroundColor: maturityTheme.colors.background.tertiary,
                                  borderColor: maturityTheme.colors.border.default,
                                  borderWidth: '1px',
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                                        {action.title}
                                      </h4>
                                      <Badge variant="secondary">High</Badge>
                                    </div>
                                    <p className="text-sm mt-1" style={{ color: maturityTheme.colors.text.secondary }}>
                                      {action.description}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-4 mt-3 text-xs">
                                  <span style={{ color: maturityTheme.colors.text.muted }}>
                                    Level {Math.min(5, action.currentLevel)} → {Math.min(5, action.targetLevel)}
                                  </span>
                                  <span style={{ color: maturityTheme.colors.text.muted }}>
                                    Effort: {action.estimatedEffort}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Medium & Low Priority - Collapsed by default */}
                      {(mediumPriorityActions.length > 0 || lowPriorityActions.length > 0) && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Target className="h-5 w-5" style={{ color: maturityTheme.colors.text.muted }} />
                            <h3 className="text-lg font-semibold" style={{ color: maturityTheme.colors.text.primary }}>
                              Medium & Low Priority ({mediumPriorityActions.length + lowPriorityActions.length})
                            </h3>
                          </div>
                          <p className="text-sm mb-3" style={{ color: maturityTheme.colors.text.secondary }}>
                            These actions can be addressed after critical and high-priority items are completed.
                          </p>
                          <div className="space-y-2">
                            {[...mediumPriorityActions, ...lowPriorityActions].slice(0, 5).map((action) => (
                              <div
                                key={action.id}
                                className="p-3 rounded-lg text-sm"
                                style={{
                                  backgroundColor: maturityTheme.colors.background.tertiary,
                                  borderColor: maturityTheme.colors.border.default,
                                  borderWidth: '1px',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span style={{ color: maturityTheme.colors.text.primary }}>{action.title}</span>
                                  <Badge variant="outline" className="text-xs">{action.priority}</Badge>
                                </div>
                              </div>
                            ))}
                            {(mediumPriorityActions.length + lowPriorityActions.length) > 5 && (
                              <p className="text-xs text-center pt-2" style={{ color: maturityTheme.colors.text.muted }}>
                                +{(mediumPriorityActions.length + lowPriorityActions.length) - 5} more actions
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {actionItems.length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: maturityTheme.colors.success.text }} />
                          <p style={{ color: maturityTheme.colors.text.secondary }}>
                            No action items identified. Your documentation is in excellent shape!
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </MaturityCard>
              </>
            );
          })()}
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
                      { label: 'Completeness', score: documentQualityAudit.completenessScore, key: 'completeness', target: 75, description: 'Presence of all required sections' },
                      { label: 'Structure Score', score: documentQualityAudit.structureScore, key: 'structure', target: 75, description: 'Logical organization and hierarchy' },
                      { label: 'Formatting Score', score: documentQualityAudit.formattingScore, key: 'formatting', target: 70, description: 'Markdown syntax quality' },
                      { label: 'Content Depth', score: documentQualityAudit.contentDepth, key: 'contentDepth', target: 80, description: 'Level of detail and comprehensiveness' },
                      { label: 'Accuracy', score: documentQualityAudit.accuracyScore, key: 'accuracy', target: 85, description: 'Information precision and factual correctness' },
                      { label: 'Consistency', score: documentQualityAudit.consistencyScore, key: 'consistency', target: 80, description: 'Internal coherence and uniform terminology' },
                      { label: 'Context Relevance', score: documentQualityAudit.contextRelevanceScore, key: 'relevance', target: 85, description: 'Relevance to project context' },
                      { label: 'Professional Quality', score: documentQualityAudit.professionalQualityScore, key: 'professional', target: 85, description: 'Professional writing standards' },
                      { label: 'Standards Compliance', score: documentQualityAudit.standardsComplianceScore, key: 'compliance', target: 85, description: 'Framework compliance (PMBOK/BABOK/DMBOK)' },
                      { label: 'Complexity Score', score: documentQualityAudit.complexityScore, key: 'complexity', target: 70, description: 'Document complexity (higher = more complex)' },
                    ].filter(dim => dim.score != null).map((dimension) => (
                      <div
                        key={dimension.key}
                        className="p-4 rounded-lg"
                        style={{
                          backgroundColor: maturityTheme.colors.background.tertiary,
                          borderColor: (dimension.score || 0) < (dimension.target || 0) ? maturityTheme.colors.warning.border : maturityTheme.colors.border.default,
                          borderWidth: '1px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm" style={{ color: maturityTheme.colors.text.primary }}>
                            {dimension.label}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: maturityTheme.colors.text.muted }}>
                              {dimension.description}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: (dimension.score || 0) >= (dimension.target || 0) ? maturityTheme.colors.success.bg : maturityTheme.colors.warning.bg,
                              color: (dimension.score || 0) >= (dimension.target || 0) ? maturityTheme.colors.success.text : maturityTheme.colors.warning.text,
                            }}
                          >
                            {dimension.score?.toFixed(1) || 'N/A'}%
                          </Badge>
                        </div>
                        <Progress 
                          value={dimension.score || 0} 
                          className="h-2 mb-1"
                        />
                        <div className="flex justify-between text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                          <span>Target: {dimension.target}%</span>
                          <span>{(dimension.score || 0) >= (dimension.target || 0) ? '✓ Met' : '⚠ Below'}</span>
                        </div>
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
                onChange={(e) => setSelectedFiles(e.target.files)}
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

