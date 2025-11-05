'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Building2,
  Loader2,
  Plus,
  Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadAssessments();
    
    // Set up auto-refresh for processing assessments
    const interval = setInterval(() => {
      loadAssessments();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []); // Only run once on mount

  const loadAssessments = async () => {
    try {
      const response = await fetch('/api/assessment/list', {
        credentials: 'include'
      });

      if (!response.ok && response.status === 401) {
        // Try without auth for guest access
        const retryResponse = await fetch('/api/assessment/list');
        const retryData = await retryResponse.json();
        if (retryData.success) {
          setAssessments(retryData.data || []);
        }
      } else {
        const data = await response.json();
        if (data.success) {
          setAssessments(data.data || []);
          // Extract unique projects from assessments for filter
          const uniqueProjects = Array.from(
            new Set(data.data?.map((a: Assessment) => a.projectName) || [])
          ).map(name => ({ id: name, name }));
          setProjects(uniqueProjects);
        }
      }
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (assessment: Assessment) => {
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Client Assessments</h1>
          <p className="text-muted-foreground">
            View and manage all portfolio maturity assessments
          </p>
        </div>
        <Button onClick={() => router.push('/onboarding/upload')}>
          <Plus className="mr-2 h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search client, project, organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assessments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {assessments.filter(a => a.status === 'complete').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {assessments.filter(a => a.status === 'processing').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Maturity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {assessments.length > 0
                ? (assessments.reduce((sum, a) => sum + a.overallMaturityLevel, 0) / assessments.length).toFixed(1)
                : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assessments ({filteredAssessments.length})</CardTitle>
          <CardDescription>
            Click on an assessment to view details and export reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No assessments found</p>
              <p className="text-sm mb-4">
                {assessments.length === 0
                  ? 'Create your first assessment to get started'
                  : 'Try adjusting your filters'}
              </p>
              <Button onClick={() => router.push('/onboarding/upload')}>
                <Plus className="mr-2 h-4 w-4" />
                New Assessment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client / Organization</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Gaps</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssessments.map(assessment => (
                  <TableRow key={assessment.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{assessment.clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {assessment.organizationName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {assessment.projectName}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{assessment.assessmentPurpose}</TableCell>
                    <TableCell>
                      <Badge className={getMaturityColor(assessment.overallMaturityLevel)}>
                        Level {assessment.overallMaturityLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {assessment.averageQualityScore.toFixed(1)}
                    </TableCell>
                    <TableCell>{assessment.totalDocuments}</TableCell>
                    <TableCell>
                      {assessment.gapsCount > 0 && (
                        <span className="text-orange-600 font-medium">
                          {assessment.gapsCount}
                        </span>
                      )}
                      {assessment.gapsCount === 0 && '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </TableCell>
                  <TableCell>
                    {assessment.status === 'processing' ? (
                      <div className="space-y-2 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span className="text-sm font-medium text-blue-600">Processing...</span>
                        </div>
                        <Progress value={assessment.progress || 30} className="h-2" />
                        <p className="text-xs text-muted-foreground">
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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(assessment.id, 'pdf')}
                          disabled={assessment.status !== 'complete'}
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
      </Card>
    </div>
  );
}

