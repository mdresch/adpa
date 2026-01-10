'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api-url';
import { useAuth } from '@/contexts/AuthContext';
import { MaturityCard } from '@/components/onboarding/MaturityCard';
import { MaturityScore } from '@/components/onboarding/MaturityScore';
import { maturityTheme, getMaturityColor } from '@/lib/theme/maturity-portal-theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  Building,
  Loader2,
  Plus,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle
} from '@/components/ui/icons-shim';
import { ArrowUpDown, ArrowUp, ArrowDown, X, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Assessment {
  id: string;
  batchId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  organizationName: string;
  assessmentPurpose: string;
  overallMaturityLevel: number;
  overallMaturityLabel: string;
  averageQualityScore: number;
  totalDocuments: number;
  gapsCount: number;
  createdAt: string;
  status: 'processing' | 'complete' | 'failed';
  progress?: number; // Processing progress percentage (0-100)
  processedFiles?: number; // Number of files processed
}

export default function AssessmentsListPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProcessingAssessment, setSelectedProcessingAssessment] = useState<Assessment | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Assessment | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Bulk operations
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  
  // Advanced filtering
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterMaturityMin, setFilterMaturityMin] = useState<number | ''>('');
  const [filterMaturityMax, setFilterMaturityMax] = useState<number | ''>('');
  const [filterDocCountMin, setFilterDocCountMin] = useState<number | ''>('');
  const [filterDocCountMax, setFilterDocCountMax] = useState<number | ''>('');

  // Require authentication - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please register or log in to view assessments');
      router.push('/auth/login?redirect=/onboarding/assessments');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadAssessments = async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = getApiUrl('/assessment/list');
      console.log('[Assessments] Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log('[Assessments] Response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Authentication required. Please log in.');
          router.push('/auth/login?redirect=/onboarding/assessments');
          return;
        }
        const errorText = await response.text();
        console.error('[Assessments] Error response:', errorText);
        throw new Error(`Failed to load assessments: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Assessments] Response data:', data);
      
      if (data.success) {
        const assessmentsList = data.data || [];
        console.log('[Assessments] Loaded', assessmentsList.length, 'assessments');
        setAssessments(assessmentsList);
        // Extract unique projects from assessments for filter
        const uniqueProjects = Array.from(
          new Set(assessmentsList.map((a: Assessment) => a.projectName) || [])
        ).map(name => ({ id: String(name), name: String(name) }));
        setProjects(uniqueProjects);
      } else {
        console.warn('[Assessments] API returned success=false:', data);
      }
    } catch (error) {
      console.error('[Assessments] Failed to load assessments:', error);
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAssessments();
      
      // Set up auto-refresh for processing assessments
      const interval = setInterval(() => {
        loadAssessments();
      }, 5000); // Poll every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]); // Only run when authenticated

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p style={{ color: maturityTheme.colors.text.secondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleView = (assessment: Assessment) => {
    // If processing, show dialog instead of navigating
    if (assessment.status === 'processing') {
      setSelectedProcessingAssessment(assessment);
      return;
    }
    // Use batch ID for the URL since the detail page expects batch ID
    router.push(`/onboarding/assessment/${assessment.batchId}`);
  };

  const handleExport = async (assessmentId: string, format: 'pdf' | 'csv') => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = getApiUrl(`/assessment/${assessmentId}/export?format=${format}`);
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${assessmentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Assessment exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Failed to export assessment', {
        description: error.message || 'Please try again later'
      });
    }
  };

  // Handle column sorting
  const handleSort = (column: keyof Assessment) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (column: keyof Assessment) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1" style={{ color: maturityTheme.colors.text.muted }} />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" style={{ color: maturityTheme.colors.primary[400] }} />
      : <ArrowDown className="h-4 w-4 ml-1" style={{ color: maturityTheme.colors.primary[400] }} />;
  };

  // Format date consistently
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedAssessments.size === filteredAssessments.length) {
      setSelectedAssessments(new Set());
    } else {
      setSelectedAssessments(new Set(filteredAssessments.map(a => a.id)));
    }
  };

  const handleSelectAssessment = (assessmentId: string) => {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(assessmentId)) {
      newSelected.delete(assessmentId);
    } else {
      newSelected.add(assessmentId);
    }
    setSelectedAssessments(newSelected);
  };

  const handleBulkExport = async (format: 'pdf' | 'csv') => {
    if (selectedAssessments.size === 0) {
      toast.error('Please select at least one assessment to export');
      return;
    }

    setIsBulkOperating(true);
    try {
      const token = localStorage.getItem('auth_token');
      let successCount = 0;
      let failCount = 0;

      for (const assessmentId of selectedAssessments) {
        try {
          const response = await fetch(getApiUrl(`/assessment/${assessmentId}/export?format=${format}`), {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          });

          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `assessment-${assessmentId}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Exported ${successCount} assessment${successCount > 1 ? 's' : ''} successfully`);
      }
      if (failCount > 0) {
        toast.error(`Failed to export ${failCount} assessment${failCount > 1 ? 's' : ''}`);
      }

      setSelectedAssessments(new Set());
    } catch (error: any) {
      toast.error('Bulk export failed', { description: error.message });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssessments.size === 0) {
      toast.error('Please select at least one assessment to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedAssessments.size} assessment${selectedAssessments.size > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsBulkOperating(true);
    try {
      const token = localStorage.getItem('auth_token');
      let successCount = 0;
      let failCount = 0;

      for (const assessmentId of selectedAssessments) {
        try {
          const response = await fetch(getApiUrl(`/assessment/${assessmentId}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} assessment${successCount > 1 ? 's' : ''} successfully`);
        // Refresh assessments list
        loadAssessments();
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} assessment${failCount > 1 ? 's' : ''}`);
      }

      setSelectedAssessments(new Set());
    } catch (error: any) {
      toast.error('Bulk delete failed', { description: error.message });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const clearAdvancedFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterMaturityMin('');
    setFilterMaturityMax('');
    setFilterDocCountMin('');
    setFilterDocCountMax('');
  };

  const hasAdvancedFilters = filterDateFrom || filterDateTo || filterMaturityMin !== '' || filterMaturityMax !== '' || filterDocCountMin !== '' || filterDocCountMax !== '';

  // Filter assessments with advanced filters
  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = 
      assessment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.organizationName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = filterProject === 'all' || assessment.projectId === filterProject;
    const matchesStatus = filterStatus === 'all' || assessment.status === filterStatus;
    
    // Advanced filters
    const matchesDateRange = (() => {
      if (!filterDateFrom && !filterDateTo) return true;
      const assessmentDate = new Date(assessment.createdAt);
      if (filterDateFrom && assessmentDate < new Date(filterDateFrom)) return false;
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // Include entire end date
        if (assessmentDate > toDate) return false;
      }
      return true;
    })();
    
    const matchesMaturityRange = (() => {
      if (filterMaturityMin === '' && filterMaturityMax === '') return true;
      const maturity = assessment.overallMaturityLevel || 0;
      if (filterMaturityMin !== '' && maturity < filterMaturityMin) return false;
      if (filterMaturityMax !== '' && maturity > filterMaturityMax) return false;
      return true;
    })();
    
    const matchesDocCountRange = (() => {
      if (filterDocCountMin === '' && filterDocCountMax === '') return true;
      const docCount = assessment.totalDocuments || 0;
      if (filterDocCountMin !== '' && docCount < filterDocCountMin) return false;
      if (filterDocCountMax !== '' && docCount > filterDocCountMax) return false;
      return true;
    })();
    
    return matchesSearch && matchesProject && matchesStatus && matchesDateRange && matchesMaturityRange && matchesDocCountRange;
  });

  // Sort assessments
  const sortedAssessments = [...filteredAssessments].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    // Handle different data types
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === 'asc' 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }
    
    // Handle date strings
    if (sortColumn === 'createdAt') {
      const aDate = new Date(aValue as string).getTime();
      const bDate = new Date(bValue as string).getTime();
      return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
    }
    
    return 0;
  });

  // Get active filters for chips
  const activeFilters = [
    searchTerm && { label: `Search: "${searchTerm}"`, key: 'search', value: searchTerm },
    filterProject !== 'all' && { label: `Project: ${projects.find(p => p.id === filterProject)?.name || filterProject}`, key: 'project', value: filterProject },
    filterStatus !== 'all' && { label: `Status: ${filterStatus}`, key: 'status', value: filterStatus },
  ].filter(Boolean) as Array<{ label: string; key: string; value: string }>;

  // Clear filter
  const clearFilter = (key: string) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'project') setFilterProject('all');
    if (key === 'status') setFilterStatus('all');
  };

  const getMaturityColor = (level: number) => {
    const colors = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-blue-500',
      4: 'bg-green-500',
      5: 'bg-purple-500'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      processing: 'bg-yellow-500',
      complete: 'bg-green-500',
      failed: 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Processing Dialog */}
      <Dialog 
        open={!!selectedProcessingAssessment} 
        onOpenChange={(open: boolean) => {
          if (!open) setSelectedProcessingAssessment(null);
        }}
      >
        <DialogContent 
          className="max-w-2xl"
          style={{
            backgroundColor: maturityTheme.colors.background.elevated,
            borderColor: maturityTheme.colors.border.default,
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: maturityTheme.colors.info.text }} />
              Assessment Processing...
            </DialogTitle>
            <DialogDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Your documents are being analyzed. This typically takes 2-3 minutes per document.
            </DialogDescription>
          </DialogHeader>
          
          {selectedProcessingAssessment && (
            <div className="space-y-6 py-4">
              <div className="text-center py-4">
                <div className="text-6xl mb-4">⏳</div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                  Processing {selectedProcessingAssessment.totalDocuments} Document{selectedProcessingAssessment.totalDocuments > 1 ? 's' : ''}
                </h3>
                <p style={{ color: maturityTheme.colors.text.secondary }} className="mb-6">
                  AI is analyzing document types, quality scores, and maturity levels
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: maturityTheme.colors.text.secondary }}>Overall Progress</span>
                  <span className="font-medium" style={{ color: maturityTheme.colors.info.text }}>
                    {selectedProcessingAssessment.progress || 0}%
                  </span>
                </div>
                <Progress value={selectedProcessingAssessment.progress || 0} className="h-3" />
                <p className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                  {selectedProcessingAssessment.processedFiles || 0} of {selectedProcessingAssessment.totalDocuments || 0} documents processed
                </p>
              </div>

              {/* Processing Steps */}
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: maturityTheme.colors.success.text }} />
                  <span style={{ color: maturityTheme.colors.text.primary }}>Documents uploaded successfully</span>
                </div>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" style={{ color: maturityTheme.colors.info.text }} />
                  <span style={{ color: maturityTheme.colors.text.primary }}>
                    Converting to Markdown and analyzing...
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-5 w-5 border-2 rounded-full flex-shrink-0"
                    style={{ 
                      borderColor: (selectedProcessingAssessment.progress || 0) > 50 
                        ? maturityTheme.colors.success.text 
                        : maturityTheme.colors.text.muted 
                    }}
                  />
                  <span style={{ 
                    color: (selectedProcessingAssessment.progress || 0) > 50 
                      ? maturityTheme.colors.text.primary 
                      : maturityTheme.colors.text.muted 
                  }}>
                    Generating gap analysis
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-5 w-5 border-2 rounded-full flex-shrink-0"
                    style={{ 
                      borderColor: (selectedProcessingAssessment.progress || 0) > 80 
                        ? maturityTheme.colors.success.text 
                        : maturityTheme.colors.text.muted 
                    }}
                  />
                  <span style={{ 
                    color: (selectedProcessingAssessment.progress || 0) > 80 
                      ? maturityTheme.colors.text.primary 
                      : maturityTheme.colors.text.muted 
                  }}>
                    Calculating benchmarks and ROI
                  </span>
                </div>
              </div>

              {/* Assessment Info */}
              <div className="p-4 rounded-lg" style={{ 
                backgroundColor: maturityTheme.colors.info.bg,
                borderColor: maturityTheme.colors.info.border,
                borderWidth: '1px'
              }}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: maturityTheme.colors.text.secondary }}>Client:</span>
                    <span style={{ color: maturityTheme.colors.text.primary }} className="font-medium">
                      {selectedProcessingAssessment.clientName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: maturityTheme.colors.text.secondary }}>Project:</span>
                    <span style={{ color: maturityTheme.colors.text.primary }} className="font-medium">
                      {selectedProcessingAssessment.projectName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: maturityTheme.colors.text.secondary }}>Purpose:</span>
                    <span style={{ color: maturityTheme.colors.text.primary }} className="font-medium">
                      {selectedProcessingAssessment.assessmentPurpose}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProcessingAssessment(null)}
                  style={{
                    borderColor: maturityTheme.colors.border.default,
                    color: maturityTheme.colors.text.primary,
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProcessingAssessment(null);
                    router.push(`/onboarding/assessment/${selectedProcessingAssessment.batchId}`);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                    color: 'white',
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Full Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div 
        className="min-h-screen"
        style={{ 
          background: `linear-gradient(135deg, ${maturityTheme.colors.background.primary} 0%, ${maturityTheme.colors.background.secondary} 50%, ${maturityTheme.colors.background.tertiary} 100%)`,
        }}
      >
        <div className="container mx-auto p-6 max-w-7xl">
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
          <li style={{ color: maturityTheme.colors.text.primary }} className="font-medium">
            Assessments
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
            Client Assessments
          </h1>
          <p style={{ color: maturityTheme.colors.text.secondary }}>
            View and manage all portfolio maturity assessments
          </p>
        </div>
        <Button 
          onClick={() => router.push('/onboarding/upload')}
          style={{
            background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
            color: 'white',
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {/* Filters */}
      <MaturityCard variant="elevated" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label style={{ color: maturityTheme.colors.text.primary }}>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: maturityTheme.colors.text.muted }} />
                <Input
                  placeholder="Search client, project, organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 [&::placeholder]:!text-[#8896b8] [&::placeholder]:opacity-70"
                  style={{
                    color: maturityTheme.colors.text.primary,
                    backgroundColor: maturityTheme.colors.background.tertiary,
                    borderColor: maturityTheme.colors.border.default,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label style={{ color: maturityTheme.colors.text.primary }}>Project</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger
                  style={{
                    color: maturityTheme.colors.text.primary,
                    backgroundColor: maturityTheme.colors.background.tertiary,
                    borderColor: maturityTheme.colors.border.default,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{
                    backgroundColor: maturityTheme.colors.background.elevated,
                    borderColor: maturityTheme.colors.border.default,
                  }}
                >
                  <SelectItem value="all" style={{ color: maturityTheme.colors.text.primary }}>
                    All Projects
                  </SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id} style={{ color: maturityTheme.colors.text.primary }}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{ color: maturityTheme.colors.text.primary }}>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger
                  style={{
                    color: maturityTheme.colors.text.primary,
                    backgroundColor: maturityTheme.colors.background.tertiary,
                    borderColor: maturityTheme.colors.border.default,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{
                    backgroundColor: maturityTheme.colors.background.elevated,
                    borderColor: maturityTheme.colors.border.default,
                  }}
                >
                  <SelectItem value="all" style={{ color: maturityTheme.colors.text.primary }}>
                    All Statuses
                  </SelectItem>
                  <SelectItem value="complete" style={{ color: maturityTheme.colors.text.primary }}>
                    Complete
                  </SelectItem>
                  <SelectItem value="processing" style={{ color: maturityTheme.colors.text.primary }}>
                    Processing
                  </SelectItem>
                  <SelectItem value="failed" style={{ color: maturityTheme.colors.text.primary }}>
                    Failed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Advanced Filters Toggle */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: maturityTheme.colors.border.default }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="w-full justify-between"
              style={{ color: maturityTheme.colors.text.primary }}
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
                {hasAdvancedFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {[
                      filterDateFrom && 'Date',
                      filterDateTo && 'Date',
                      filterMaturityMin !== '' && 'Maturity',
                      filterMaturityMax !== '' && 'Maturity',
                      filterDocCountMin !== '' && 'Docs',
                      filterDocCountMax !== '' && 'Docs',
                    ].filter(Boolean).length} active
                  </Badge>
                )}
              </span>
              <ArrowUpDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            {showAdvancedFilters && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label style={{ color: maturityTheme.colors.text.primary }}>Date From</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    style={{
                      color: maturityTheme.colors.text.primary,
                      backgroundColor: maturityTheme.colors.background.tertiary,
                      borderColor: maturityTheme.colors.border.default,
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: maturityTheme.colors.text.primary }}>Date To</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    style={{
                      color: maturityTheme.colors.text.primary,
                      backgroundColor: maturityTheme.colors.background.tertiary,
                      borderColor: maturityTheme.colors.border.default,
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: maturityTheme.colors.text.primary }}>Maturity Min</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="1"
                    value={filterMaturityMin}
                    onChange={(e) => setFilterMaturityMin(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      color: maturityTheme.colors.text.primary,
                      backgroundColor: maturityTheme.colors.background.tertiary,
                      borderColor: maturityTheme.colors.border.default,
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: maturityTheme.colors.text.primary }}>Maturity Max</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="5"
                    value={filterMaturityMax}
                    onChange={(e) => setFilterMaturityMax(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      color: maturityTheme.colors.text.primary,
                      backgroundColor: maturityTheme.colors.background.tertiary,
                      borderColor: maturityTheme.colors.border.default,
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: maturityTheme.colors.text.primary }}>Min Documents</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filterDocCountMin}
                    onChange={(e) => setFilterDocCountMin(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      color: maturityTheme.colors.text.primary,
                      backgroundColor: maturityTheme.colors.background.tertiary,
                      borderColor: maturityTheme.colors.border.default,
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: maturityTheme.colors.text.primary }}>Max Documents</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="∞"
                    value={filterDocCountMax}
                    onChange={(e) => setFilterDocCountMax(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      color: maturityTheme.colors.text.primary,
                      backgroundColor: maturityTheme.colors.background.tertiary,
                      borderColor: maturityTheme.colors.border.default,
                    }}
                  />
                </div>
                {hasAdvancedFilters && (
                  <div className="col-span-full flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAdvancedFilters}
                      style={{
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Advanced Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </MaturityCard>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <MaturityCard variant="info" className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                Active Filters:
              </span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.key}
                  variant="outline"
                  className="flex items-center gap-1 cursor-pointer hover:bg-opacity-80"
                  style={{
                    borderColor: maturityTheme.colors.info.border,
                    backgroundColor: maturityTheme.colors.info.bg,
                    color: maturityTheme.colors.info.text,
                  }}
                  onClick={() => clearFilter(filter.key)}
                >
                  {filter.label}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterProject('all');
                  setFilterStatus('all');
                }}
                className="ml-auto text-xs"
                style={{ color: maturityTheme.colors.text.secondary }}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </MaturityCard>
      )}

      {/* Statistics - Enhanced with Dark Blue Theme */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <MaturityCard variant="elevated">
            <div className="p-6">
              <div className="text-sm font-medium flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" style={{ color: maturityTheme.colors.primary[400] }} />
                <span style={{ color: maturityTheme.colors.text.secondary }}>Total Assessments</span>
              </div>
              <div className="text-4xl font-bold" style={{ color: maturityTheme.colors.primary[300] }}>
                {assessments.length}
              </div>
            </div>
          </MaturityCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <MaturityCard variant="success">
            <div className="p-6">
              <div className="text-sm font-medium flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4" style={{ color: maturityTheme.colors.success.text }} />
                <span style={{ color: maturityTheme.colors.text.secondary }}>Complete</span>
              </div>
              <div className="text-4xl font-bold" style={{ color: maturityTheme.colors.success.text }}>
                {assessments.filter(a => a.status === 'complete').length}
              </div>
            </div>
          </MaturityCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <MaturityCard variant="warning">
            <div className="p-6">
              <div className="text-sm font-medium flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" style={{ color: maturityTheme.colors.warning.text }} />
                <span style={{ color: maturityTheme.colors.text.secondary }}>Processing</span>
              </div>
              <div className="text-4xl font-bold" style={{ color: maturityTheme.colors.warning.text }}>
                {assessments.filter(a => a.status === 'processing').length}
              </div>
            </div>
          </MaturityCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <MaturityCard variant="info">
            <div className="p-6">
              <div className="text-sm font-medium flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4" style={{ color: maturityTheme.colors.info.text }} />
                <span style={{ color: maturityTheme.colors.text.secondary }}>Avg Maturity</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold" style={{ color: maturityTheme.colors.primary[400] }}>
                  {assessments.length > 0
                    ? (assessments.reduce((sum, a) => sum + a.overallMaturityLevel, 0) / assessments.length).toFixed(1)
                    : '—'}
                </div>
                {assessments.length > 0 && (() => {
                  const avgLevel = Math.max(1, Math.min(5, Math.round(assessments.reduce((sum, a) => sum + a.overallMaturityLevel, 0) / assessments.length))) as 1 | 2 | 3 | 4 | 5;
                  const labels: Record<number, string> = { 1: 'Initial', 2: 'Repeatable', 3: 'Defined', 4: 'Managed', 5: 'Optimizing' };
                  return (
                    <MaturityScore 
                      level={avgLevel}
                      label={labels[avgLevel]}
                      size="sm"
                    />
                  );
                })()}
              </div>
            </div>
          </MaturityCard>
        </motion.div>
      </div>

      {/* Bulk Operations Bar */}
      {selectedAssessments.size > 0 && (
        <MaturityCard variant="info" className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                  {selectedAssessments.size} assessment{selectedAssessments.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAssessments(new Set())}
                  style={{ color: maturityTheme.colors.text.secondary }}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkExport('pdf')}
                  disabled={isBulkOperating}
                  style={{
                    borderColor: maturityTheme.colors.border.default,
                    color: maturityTheme.colors.text.primary,
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkExport('csv')}
                  disabled={isBulkOperating}
                  style={{
                    borderColor: maturityTheme.colors.border.default,
                    color: maturityTheme.colors.text.primary,
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkOperating}
                  style={{
                    borderColor: maturityTheme.colors.error.border,
                    color: maturityTheme.colors.error.text,
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </MaturityCard>
      )}

      {/* Assessments Table */}
      <MaturityCard variant="elevated">
        <CardHeader>
          <CardTitle style={{ color: maturityTheme.colors.text.primary }}>
            Assessments ({sortedAssessments.length})
          </CardTitle>
          <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
            Click on an assessment to view details and export reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedAssessments.length === 0 ? (
            <div className="text-center py-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <FileText className="mx-auto h-16 w-16 mb-4" style={{ color: maturityTheme.colors.text.muted, opacity: 0.5 }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: maturityTheme.colors.text.primary }}>
                  {assessments.length === 0 ? 'No Assessments Yet' : 'No Assessments Match Your Filters'}
                </h3>
                <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: maturityTheme.colors.text.secondary }}>
                  {assessments.length === 0
                    ? 'Upload your project documents to get started with your first maturity assessment. Our AI will analyze your documentation and provide actionable insights.'
                    : 'Try adjusting your search terms or filters to find what you\'re looking for.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => router.push('/onboarding/upload')}
                    style={{
                      background: `linear-gradient(135deg, ${maturityTheme.colors.primary[500]} 0%, ${maturityTheme.colors.primary[700]} 100%)`,
                      color: 'white',
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Assessment
                  </Button>
                  {assessments.length > 0 && (
                    <Button 
                      variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterProject('all')
                  setFilterStatus('all')
                  clearAdvancedFilters()
                }}
                      style={{
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: maturityTheme.colors.background.secondary }}>
                  <TableHead style={{ width: '50px', color: maturityTheme.colors.text.primary }}>
                    <input
                      type="checkbox"
                      checked={selectedAssessments.size === filteredAssessments.length && filteredAssessments.length > 0}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                      style={{ accentColor: maturityTheme.colors.primary[500] }}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-opacity-80 select-none"
                    style={{ color: maturityTheme.colors.text.primary }}
                    onClick={() => handleSort('clientName')}
                  >
                    <div className="flex items-center">
                      Client / Organization
                      {getSortIcon('clientName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-opacity-80 select-none"
                    style={{ color: maturityTheme.colors.text.primary }}
                    onClick={() => handleSort('projectName')}
                  >
                    <div className="flex items-center">
                      Project
                      {getSortIcon('projectName')}
                    </div>
                  </TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Purpose</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-opacity-80 select-none"
                    style={{ color: maturityTheme.colors.text.primary }}
                    onClick={() => handleSort('overallMaturityLevel')}
                  >
                    <div className="flex items-center">
                      Maturity
                      {getSortIcon('overallMaturityLevel')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-opacity-80 select-none"
                    style={{ color: maturityTheme.colors.text.primary }}
                    onClick={() => handleSort('averageQualityScore')}
                  >
                    <div className="flex items-center">
                      Score
                      {getSortIcon('averageQualityScore')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-opacity-80 select-none"
                    style={{ color: maturityTheme.colors.text.primary }}
                    onClick={() => handleSort('totalDocuments')}
                  >
                    <div className="flex items-center">
                      Documents
                      {getSortIcon('totalDocuments')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-opacity-80 select-none"
                    style={{ color: maturityTheme.colors.text.primary }}
                    onClick={() => handleSort('gapsCount')}
                  >
                    <div className="flex items-center">
                      Gaps
                      {getSortIcon('gapsCount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-opacity-80 select-none"
                    style={{ color: maturityTheme.colors.text.primary }}
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Date
                      {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Status</TableHead>
                  <TableHead className="text-right" style={{ color: maturityTheme.colors.text.primary }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssessments.map(assessment => (
                  <TableRow 
                    key={assessment.id} 
                    className="cursor-pointer"
                    style={{ 
                      backgroundColor: selectedAssessments.has(assessment.id) 
                        ? maturityTheme.colors.primary[50] 
                        : maturityTheme.colors.background.tertiary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.background.elevated;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.background.tertiary;
                    }}
                  >
                    <TableCell 
                      onClick={async (e: React.MouseEvent) => e.stopPropagation()}
                      style={{ width: '50px' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssessments.has(assessment.id)}
                        onChange={() => handleSelectAssessment(assessment.id)}
                        className="cursor-pointer"
                        style={{ accentColor: maturityTheme.colors.primary[500] }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                        {assessment.clientName}
                      </div>
                      <div className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                        {assessment.organizationName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
                        <Building className="h-4 w-4" style={{ color: maturityTheme.colors.text.muted }} />
                        {assessment.projectName}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                      {assessment.assessmentPurpose}
                    </TableCell>
                    <TableCell>
                      <Badge className={getMaturityColor(assessment.overallMaturityLevel)}>
                        Level {assessment.overallMaturityLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium" style={{ color: maturityTheme.colors.text.primary }}>
                      {assessment.averageQualityScore.toFixed(1)}
                    </TableCell>
                    <TableCell style={{ color: maturityTheme.colors.text.primary }}>
                      {assessment.totalDocuments}
                    </TableCell>
                    <TableCell>
                      {assessment.gapsCount > 0 && (
                        <span className="font-medium" style={{ color: maturityTheme.colors.warning.text }}>
                          {assessment.gapsCount}
                        </span>
                      )}
                      {assessment.gapsCount === 0 && <span style={{ color: maturityTheme.colors.text.muted }}>—</span>}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: maturityTheme.colors.text.secondary }}>
                      {formatDate(assessment.createdAt)}
                    </TableCell>
                  <TableCell>
                    {assessment.status === 'processing' ? (
                      <div className="space-y-2 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" style={{ color: maturityTheme.colors.info.text }} />
                          <span className="text-sm font-medium" style={{ color: maturityTheme.colors.info.text }}>
                            Processing...
                          </span>
                        </div>
                        <Progress value={assessment.progress || 30} className="h-2" />
                        <p className="text-xs" style={{ color: maturityTheme.colors.text.muted }}>
                          {assessment.processedFiles || 0} of {assessment.totalDocuments || 0} documents processed
                        </p>
                      </div>
                    ) : (
                      <Badge className={getStatusColor(assessment.status)} variant="outline">
                        {assessment.status}
                      </Badge>
                    )}
                  </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(assessment)}
                          style={{ color: maturityTheme.colors.text.primary }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(assessment.id, 'pdf')}
                          disabled={assessment.status !== 'complete'}
                          style={{ color: maturityTheme.colors.text.primary }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </MaturityCard>

      {/* Data Visualizations - Analytics & Trends */}
      {assessments.length > 0 && (
        <MaturityCard variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: maturityTheme.colors.text.primary }}>
              <BarChart3 className="h-5 w-5" />
              Analytics & Trends
            </CardTitle>
            <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
              Visual insights into your assessment portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Maturity Level Distribution */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Maturity Level Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const maturityCounts: Record<number, number> = {};
                        assessments.forEach(a => {
                          const level = a.overallMaturityLevel || 0;
                          maturityCounts[level] = (maturityCounts[level] || 0) + 1;
                        });
                        return Object.entries(maturityCounts).map(([level, count]) => ({
                          name: `Level ${level}`,
                          value: count,
                        }));
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(() => {
                        const maturityColors = [
                          maturityTheme.colors.error.text,      // Level 1
                          maturityTheme.colors.warning.text,    // Level 2
                          maturityTheme.colors.info.text,       // Level 3
                          maturityTheme.colors.primary[400],    // Level 4
                          maturityTheme.colors.success.text,    // Level 5
                        ];
                        return [1, 2, 3, 4, 5].map((level, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={maturityColors[level - 1] || maturityTheme.colors.primary[400]}
                          />
                        ));
                      })()}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Quality Score Trends */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Quality Score Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={(() => {
                      // Sort assessments by date
                      const sortedAssessments = [...assessments]
                        .filter(a => a.averageQualityScore != null && !isNaN(a.averageQualityScore) && a.averageQualityScore > 0)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                      
                      // Calculate cumulative average for each point
                      let runningSum = 0;
                      const trendData = sortedAssessments.map((assessment, index) => {
                        const date = new Date(assessment.createdAt);
                        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        
                        // Add current score to running sum
                        runningSum += assessment.averageQualityScore;
                        
                        // Calculate cumulative average
                        const avgScore = runningSum / (index + 1);
                        
                        return {
                          date: dateLabel,
                          avgScore: Math.round(avgScore * 10) / 10, // Round to 1 decimal place
                          individualScore: Math.round(assessment.averageQualityScore * 10) / 10,
                        };
                      });
                      
                      return trendData;
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={maturityTheme.colors.border.default} />
                    <XAxis
                      dataKey="date"
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: maturityTheme.colors.background.elevated,
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        if (name === 'avgScore') {
                          return [`Average: ${value.toFixed(1)}%`, 'Cumulative Average'];
                        }
                        return [`${value.toFixed(1)}%`, 'Individual Score'];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke={maturityTheme.colors.primary[400]}
                      strokeWidth={2}
                      name="Cumulative Average"
                      dot={{ fill: maturityTheme.colors.primary[400], r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="individualScore"
                      stroke={maturityTheme.colors.success.text}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      name="Individual Score"
                      dot={{ fill: maturityTheme.colors.success.text, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Document Count Distribution */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Document Count Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(() => {
                      const ranges = [
                        { name: '1-5', min: 1, max: 5 },
                        { name: '6-10', min: 6, max: 10 },
                        { name: '11-20', min: 11, max: 20 },
                        { name: '21-50', min: 21, max: 50 },
                        { name: '50+', min: 51, max: Infinity },
                      ];
                      return ranges.map(range => ({
                        name: range.name,
                        count: assessments.filter(a => {
                          const docs = a.totalDocuments || 0;
                          return docs >= range.min && docs <= range.max;
                        }).length,
                      }));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={maturityTheme.colors.border.default} />
                    <XAxis
                      dataKey="name"
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: maturityTheme.colors.background.elevated,
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={maturityTheme.colors.primary[400]}
                      name="Assessments"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Maturity Progression Over Time */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Maturity Progression Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={(() => {
                      // Group by month and calculate average maturity
                      const monthlyData: Record<string, { month: string; avgMaturity: number; count: number }> = {};
                      assessments.forEach(a => {
                        const date = new Date(a.createdAt);
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        if (!monthlyData[monthKey]) {
                          monthlyData[monthKey] = { 
                            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
                            avgMaturity: 0, 
                            count: 0 
                          };
                        }
                        monthlyData[monthKey].avgMaturity += a.overallMaturityLevel || 0;
                        monthlyData[monthKey].count += 1;
                      });
                      return Object.values(monthlyData)
                        .map(d => ({
                          month: d.month,
                          avgMaturity: d.count > 0 ? Math.round((d.avgMaturity / d.count) * 10) / 10 : 0,
                        }))
                        .sort((a, b) => a.month.localeCompare(b.month));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={maturityTheme.colors.border.default} />
                    <XAxis
                      dataKey="month"
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      domain={[0, 5]}
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: maturityTheme.colors.background.elevated,
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}`, 'Average Maturity Level']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgMaturity"
                      stroke={maturityTheme.colors.primary[400]}
                      strokeWidth={2}
                      name="Average Maturity"
                      dot={{ fill: maturityTheme.colors.primary[400], r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gap Analysis Trends */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Gap Analysis Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={(() => {
                      const sortedAssessments = [...assessments]
                        .filter(a => a.gapsCount != null && !isNaN(a.gapsCount))
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                      
                      return sortedAssessments.map((assessment, index) => {
                        const date = new Date(assessment.createdAt);
                        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        
                        // Calculate average gaps up to this point
                        const assessmentsUpToNow = sortedAssessments.slice(0, index + 1);
                        const avgGaps = assessmentsUpToNow.reduce((sum, a) => sum + (a.gapsCount || 0), 0) / assessmentsUpToNow.length;
                        
                        return {
                          date: dateLabel,
                          gaps: assessment.gapsCount || 0,
                          avgGaps: Math.round(avgGaps * 10) / 10,
                        };
                      });
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={maturityTheme.colors.border.default} />
                    <XAxis
                      dataKey="date"
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: maturityTheme.colors.background.elevated,
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="gaps"
                      stroke={maturityTheme.colors.warning.text}
                      fill={maturityTheme.colors.warning.bg}
                      name="Gaps Identified"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgGaps"
                      stroke={maturityTheme.colors.primary[400]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Average Gaps"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Quality vs Maturity Correlation */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Quality Score vs Maturity Level
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(() => {
                      // Group by maturity level and calculate average quality
                      const maturityGroups: Record<number, { level: number; avgQuality: number; count: number }> = {};
                      assessments.forEach(a => {
                        const level = Math.floor(a.overallMaturityLevel || 0);
                        if (!maturityGroups[level]) {
                          maturityGroups[level] = { level, avgQuality: 0, count: 0 };
                        }
                        maturityGroups[level].avgQuality += a.averageQualityScore || 0;
                        maturityGroups[level].count += 1;
                      });
                      return Object.values(maturityGroups)
                        .map(d => ({
                          level: `Level ${d.level}`,
                          avgQuality: d.count > 0 ? Math.round((d.avgQuality / d.count) * 10) / 10 : 0,
                          count: d.count,
                        }))
                        .sort((a, b) => parseInt(a.level.split(' ')[1]) - parseInt(b.level.split(' ')[1]));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={maturityTheme.colors.border.default} />
                    <XAxis
                      dataKey="level"
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: maturityTheme.colors.background.elevated,
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        if (name === 'avgQuality') {
                          return [`${value.toFixed(1)}%`, 'Average Quality Score'];
                        }
                        return [value, 'Assessments'];
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="avgQuality"
                      fill={maturityTheme.colors.success.text}
                      name="Average Quality Score"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Assessment Frequency */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Assessment Frequency
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(() => {
                      // Count assessments by month
                      const monthlyCounts: Record<string, { month: string; count: number }> = {};
                      assessments.forEach(a => {
                        const date = new Date(a.createdAt);
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        if (!monthlyCounts[monthKey]) {
                          monthlyCounts[monthKey] = { 
                            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
                            count: 0 
                          };
                        }
                        monthlyCounts[monthKey].count += 1;
                      });
                      return Object.values(monthlyCounts)
                        .sort((a, b) => a.month.localeCompare(b.month));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={maturityTheme.colors.border.default} />
                    <XAxis
                      dataKey="month"
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke={maturityTheme.colors.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: maturityTheme.colors.background.elevated,
                        borderColor: maturityTheme.colors.border.default,
                        color: maturityTheme.colors.text.primary,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={maturityTheme.colors.info.text}
                      name="Assessments"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: maturityTheme.colors.text.primary }}>
                  Status Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const statusCounts: Record<string, number> = {};
                        assessments.forEach(a => {
                          const status = a.status || 'unknown';
                          statusCounts[status] = (statusCounts[status] || 0) + 1;
                        });
                        return Object.entries(statusCounts).map(([status, count]) => ({
                          name: status.charAt(0).toUpperCase() + status.slice(1),
                          value: count,
                        }));
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {['complete', 'processing', 'failed'].map((status, index) => {
                        let color = maturityTheme.colors.text.muted;
                        if (status === 'complete') color = maturityTheme.colors.success.text;
                        else if (status === 'processing') color = maturityTheme.colors.info.text;
                        else if (status === 'failed') color = maturityTheme.colors.error.text;
                        return (
                          <Cell key={`cell-${index}`} fill={color} />
                        );
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </MaturityCard>
      )}
      </div>
    </div>
    </>
  );
}

