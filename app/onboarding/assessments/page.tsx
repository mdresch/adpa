'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
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
import { Progress } from '@/components/ui/progress';
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

  // Require authentication - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please register or log in to view assessments');
      router.push('/auth/login?redirect=/onboarding/assessments');
    }
  }, [isAuthenticated, authLoading, router]);

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

  const loadAssessments = async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/assessment/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Authentication required. Please log in.');
          router.push('/auth/login?redirect=/onboarding/assessments');
          return;
        }
        throw new Error(`Failed to load assessments: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setAssessments(data.data || []);
        // Extract unique projects from assessments for filter
        const uniqueProjects = Array.from(
          new Set(data.data?.map((a: Assessment) => a.projectName) || [])
        ).map(name => ({ id: String(name), name: String(name) }));
        setProjects(uniqueProjects);
      }
    } catch (error) {
      console.error('Failed to load assessments:', error);
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await fetch(`/api/assessment/${assessmentId}/export?format=${format}`, {
        credentials: 'include'
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${assessmentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export assessment');
    }
  };

  // Filter assessments
  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = 
      assessment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.organizationName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = filterProject === 'all' || assessment.projectId === filterProject;
    const matchesStatus = filterStatus === 'all' || assessment.status === filterStatus;
    
    return matchesSearch && matchesProject && matchesStatus;
  });

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
        onOpenChange={(open) => {
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
        </CardContent>
      </MaturityCard>

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

      {/* Assessments Table */}
      <MaturityCard variant="elevated">
        <CardHeader>
          <CardTitle style={{ color: maturityTheme.colors.text.primary }}>
            Assessments ({filteredAssessments.length})
          </CardTitle>
          <CardDescription style={{ color: maturityTheme.colors.text.secondary }}>
            Click on an assessment to view details and export reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssessments.length === 0 ? (
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
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Client / Organization</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Project</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Purpose</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Maturity</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Score</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Documents</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Gaps</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Date</TableHead>
                  <TableHead style={{ color: maturityTheme.colors.text.primary }}>Status</TableHead>
                  <TableHead className="text-right" style={{ color: maturityTheme.colors.text.primary }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssessments.map(assessment => (
                  <TableRow 
                    key={assessment.id} 
                    className="cursor-pointer"
                    style={{ 
                      backgroundColor: maturityTheme.colors.background.tertiary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.background.elevated;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = maturityTheme.colors.background.tertiary;
                    }}
                  >
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
                      {new Date(assessment.createdAt).toLocaleDateString()}
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
      </div>
    </div>
    </>
  );
}

