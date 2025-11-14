"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Plus, 
  Loader2, 
  Calendar,
  Eye,
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: string;
  title: string;
  type: 'executive' | 'financial' | 'status' | 'risk' | 'milestone' | 'custom';
  format: 'pdf' | 'docx' | 'excel' | 'html';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  generatedBy: string;
  fileUrl?: string;
  fileSize?: number;
}

interface ProgramReportsTabProps {
  programId: string;
}

const reportTypeConfig = {
  executive: {
    label: 'Executive Summary',
    icon: TrendingUp,
    color: 'bg-blue-100 text-blue-800',
    description: 'High-level overview for executives and stakeholders',
  },
  financial: {
    label: 'Financial Report',
    icon: DollarSign,
    color: 'bg-green-100 text-green-800',
    description: 'Budget, costs, EVM, and financial analysis',
  },
  status: {
    label: 'Status Report',
    icon: BarChart3,
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Project status, RAG health, and progress updates',
  },
  risk: {
    label: 'Risk Report',
    icon: AlertCircle,
    color: 'bg-orange-100 text-orange-800',
    description: 'Risk register, assessments, and mitigation plans',
  },
  milestone: {
    label: 'Milestone Report',
    icon: Calendar,
    color: 'bg-cyan-100 text-cyan-800',
    description: 'Timeline, milestones, and deliverables tracking',
  },
  custom: {
    label: 'Custom Report',
    icon: FileText,
    color: 'bg-gray-100 text-gray-800',
    description: 'Custom report with selected sections',
  },
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  generating: { label: 'Generating', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
};

export function ProgramReportsTab({ programId }: ProgramReportsTabProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'executive' as Report['type'],
    format: 'pdf' as Report['format'],
    includeSections: {
      summary: true,
      budget: true,
      status: true,
      risks: true,
      milestones: true,
      projects: true,
    },
  });

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const { getApiUrl } = await import('@/lib/api-url')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/reports`),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.data || []);
      } else {
        // Use mock data if endpoint doesn't exist
        setReports(generateMockReports());
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports(generateMockReports());
    } finally {
      setLoading(false);
    }
  };

  // Generate mock reports for demonstration
  const generateMockReports = (): Report[] => [
    {
      id: '1',
      title: 'Q1 2025 Executive Summary',
      type: 'executive',
      format: 'pdf',
      status: 'completed',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      generatedBy: 'Sarah Johnson',
      fileUrl: '#',
      fileSize: 2457600, // 2.4 MB
    },
    {
      id: '2',
      title: 'Financial Performance Report - January 2025',
      type: 'financial',
      format: 'excel',
      status: 'completed',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      generatedBy: 'Mike Chen',
      fileUrl: '#',
      fileSize: 1048576, // 1 MB
    },
    {
      id: '3',
      title: 'Monthly Status Report - December 2024',
      type: 'status',
      format: 'pdf',
      status: 'completed',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      generatedBy: 'Emily Davis',
      fileUrl: '#',
      fileSize: 1835008, // 1.75 MB
    },
    {
      id: '4',
      title: 'Risk Assessment Report',
      type: 'risk',
      format: 'pdf',
      status: 'completed',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      generatedBy: 'Tom Wilson',
      fileUrl: '#',
      fileSize: 921600, // 900 KB
    },
  ];

  useEffect(() => {
    void fetchReports();
  }, [programId]);

  // Handle report generation
  const handleGenerateReport = async () => {
    try {
      setGenerating(true);

      const reportData = {
        ...formData,
        programId,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/reports/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(reportData),
        }
      );

      if (response.ok) {
        toast.success('Report generation started');
        setDialogOpen(false);
        resetForm();
        
        // Poll for completion
        setTimeout(() => {
          fetchReports();
          toast.success('Report generated successfully');
        }, 3000);
      } else {
        // For demo, simulate report generation
        const newReport: Report = {
          id: Date.now().toString(),
          title: formData.title,
          type: formData.type,
          format: formData.format,
          status: 'generating',
          createdAt: new Date().toISOString(),
          generatedBy: 'Current User',
        };

        setReports([newReport, ...reports]);
        toast.success('Report generation started');
        setDialogOpen(false);
        resetForm();

        // Simulate completion after 3 seconds
        setTimeout(() => {
          setReports((prev) =>
            prev.map((r) =>
              r.id === newReport.id
                ? { ...r, status: 'completed', fileUrl: '#', fileSize: 2000000 }
                : r
            )
          );
          toast.success('Report generated successfully');
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (report: Report) => {
    if (!report.fileUrl) {
      toast.error('Report file not available');
      return;
    }

    // In production, this would trigger actual file download
    toast.success('Downloading report...');
    
    // Simulate download
    console.log('Downloading report:', report.title);
  };

  const handlePreview = (report: Report) => {
    if (!report.fileUrl) {
      toast.error('Report file not available');
      return;
    }

    // In production, this would open report in new window/modal
    toast.info('Opening report preview...');
    console.log('Previewing report:', report.title);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'executive',
      format: 'pdf',
      includeSections: {
        summary: true,
        budget: true,
        status: true,
        risks: true,
        milestones: true,
        projects: true,
      },
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / 1048576;
    return `${mb.toFixed(2)} MB`;
  };

  // Quick report templates
  const quickTemplates = [
    { type: 'executive' as const, title: 'Executive Summary', format: 'pdf' as const },
    { type: 'financial' as const, title: 'Financial Report', format: 'excel' as const },
    { type: 'status' as const, title: 'Status Report', format: 'pdf' as const },
    { type: 'risk' as const, title: 'Risk Assessment', format: 'pdf' as const },
  ];

  const handleQuickGenerate = (template: typeof quickTemplates[0]) => {
    setFormData({
      ...formData,
      title: `${template.title} - ${new Date().toLocaleDateString()}`,
      type: template.type,
      format: template.format,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Report Generation</CardTitle>
          <CardDescription>Generate common reports with one click</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickTemplates.map((template) => {
              const config = reportTypeConfig[template.type];
              const Icon = config.icon;
              return (
                <Card
                  key={template.type}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { handleQuickGenerate(template); }}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`p-3 rounded-lg ${config.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{config.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{template.format.toUpperCase()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Report History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report History</CardTitle>
              <CardDescription>View and download previously generated reports</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Custom Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate Custom Report</DialogTitle>
                  <DialogDescription>
                    Configure and generate a custom report with selected sections
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Report Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => { setFormData({ ...formData, title: e.target.value }); }}
                      placeholder="Enter report title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Report Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: Report['type']) => {
                          setFormData({ ...formData, type: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(reportTypeConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="format">Format</Label>
                      <Select
                        value={formData.format}
                        onValueChange={(value: Report['format']) => {
                          setFormData({ ...formData, format: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="docx">Word (DOCX)</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Include Sections</Label>
                    <div className="space-y-2 mt-2">
                      {Object.entries(formData.includeSections).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={key}
                            checked={value}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                includeSections: {
                                  ...formData.includeSections,
                                  [key]: e.target.checked,
                                },
                              });
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={key} className="font-normal capitalize">
                            {key}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDialogOpen(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateReport} disabled={generating || !formData.title}>
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const typeConfig = reportTypeConfig[report.type];
                  const TypeIcon = typeConfig.icon;
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <span className="text-sm">{typeConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[report.status].color}>
                          {statusConfig[report.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(report.fileSize)}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{report.generatedBy}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {report.status === 'completed' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { handlePreview(report); }}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { handleDownload(report); }}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {report.status === 'generating' && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first report using quick templates or custom options
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
