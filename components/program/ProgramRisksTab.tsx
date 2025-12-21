"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { AlertTriangle, Plus, Pencil, Trash2, Loader2, TrendingUp, Shield, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { RiskMitigationPlansView } from '@/components/risks/RiskMitigationPlansView';
import { useRouter } from 'next/navigation';

interface Risk {
  id: string;
  title: string;
  description: string;
  probability: number; // 0-100
  impact: number; // 1-5 scale
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'mitigating' | 'mitigated' | 'accepted' | 'closed';
  category: string;
  owner?: string;
  mitigation?: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
  extractedFromDocumentId?: string | null;
}

interface ProgramRisksTabProps {
  programId: string;
}

const severityConfig = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300', icon: '🔴' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🟠' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🟡' },
  low: { label: 'Low', color: 'bg-green-100 text-green-800 border-green-300', icon: '🟢' },
};

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  mitigating: { label: 'Mitigating', color: 'bg-sky-100 text-sky-800' },
  mitigated: { label: 'Mitigated', color: 'bg-green-100 text-green-800' },
  accepted: { label: 'Accepted', color: 'bg-gray-100 text-gray-800' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-800' },
} as const;

// Helper function to get status config with fallback
const getStatusConfig = (status: string) => {
  const normalizedStatus = status?.toLowerCase() as keyof typeof statusConfig;
  return statusConfig[normalizedStatus] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
};

export function ProgramRisksTab({ programId }: ProgramRisksTabProps) {
  const router = useRouter();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    probability: 50,
    impact: 3,
    category: '',
    owner: '',
    mitigation: '',
    status: 'open' as Risk['status'],
  });

  // Calculate severity based on probability and impact
  const calculateSeverity = (probability: number, impact: number): Risk['severity'] => {
    const score = (probability / 100) * impact;
    if (score >= 4) return 'critical';
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  };

  // Fetch risks
  const fetchRisks = async () => {
    try {
      setLoading(true);
      const { getApiUrl } = await import('@/lib/api-url')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/risks`),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[RISKS] API Response:', data);
        const risksData = data.data || data.risks || [];
        console.log('[RISKS] Parsed risks:', risksData);
        setRisks(risksData);
      } else {
        const errorText = await response.text();
        console.error('[RISKS] API Error:', response.status, errorText);
        // Show empty state on error - API endpoint exists but may have no data
        setRisks([]);
      }
    } catch (error) {
      console.error('Failed to fetch risks:', error);
      // Show empty state on network error
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock risks for demonstration
  const generateMockRisks = (): Risk[] => [
    {
      id: '1',
      title: 'Resource Shortage',
      description: 'Critical staff shortage expected in Q2 due to competing priorities and budget constraints',
      probability: 75,
      impact: 5,
      severity: 'critical',
      status: 'open',
      category: 'Resources',
      owner: 'Sarah Johnson',
      mitigation: 'Hire contractors, cross-train existing staff',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'Technology Integration Risk',
      description: 'New framework adoption may cause delays and compatibility issues with legacy systems',
      probability: 60,
      impact: 4,
      severity: 'high',
      status: 'mitigating',
      category: 'Technology',
      owner: 'Mike Chen',
      mitigation: 'POC in progress, fallback plan prepared',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'Vendor Dependency',
      description: 'Third-party vendor financial stability concerns may impact delivery timeline',
      probability: 30,
      impact: 3,
      severity: 'medium',
      status: 'open',
      category: 'Vendor',
      owner: 'Emily Davis',
      mitigation: 'Identify backup vendors, negotiate contract terms',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'Regulatory Compliance Changes',
      description: 'Pending regulatory changes may require scope adjustments',
      probability: 40,
      impact: 4,
      severity: 'medium',
      status: 'accepted',
      category: 'Compliance',
      owner: 'Tom Wilson',
      mitigation: 'Monitor regulatory updates, maintain flexibility in design',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  useEffect(() => {
    void fetchRisks();
  }, [programId]);

  // Convert numeric impact (1-5) to text format for database
  const impactToText = (impact: number): string => {
    if (impact >= 4) return 'high';
    if (impact >= 2) return 'medium';
    return 'low';
  };

  // Convert numeric probability (0-100) to text format for database
  const probabilityToText = (probability: number): string => {
    if (probability >= 66) return 'high';
    if (probability >= 33) return 'medium';
    return 'low';
  };

  // Map frontend status to database status format
  // DB expects: 'identified', 'mitigated', 'accepted', 'transferred'
  // Frontend uses: 'open', 'mitigating', 'mitigated', 'accepted', 'closed'
  const statusToDbFormat = (status: string): string => {
    const statusMap: Record<string, string> = {
      'open': 'identified',
      'mitigating': 'identified',
      'mitigated': 'mitigated',
      'accepted': 'accepted',
      'closed': 'mitigated',
    };
    return statusMap[status] || 'identified';
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const { getApiUrl } = await import('@/lib/api-url');
      const severity = calculateSeverity(formData.probability, formData.impact);
      
      // Convert values to format expected by database constraints
      const riskData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        owner: formData.owner,
        status: statusToDbFormat(formData.status),
        probability: probabilityToText(formData.probability),
        impact: impactToText(formData.impact),
        mitigation_strategy: formData.mitigation,
      };

      let url: string;
      let method: 'PUT' | 'POST';
      
      if (editingRisk) {
        // When editing, use the project endpoint if the risk has a project_id
        // This preserves the project association
        if (editingRisk.projectId) {
          url = getApiUrl(`/projects/${editingRisk.projectId}/risks/${editingRisk.id}`);
        } else {
          // Fallback for risks without a project (shouldn't happen but handle gracefully)
          url = getApiUrl(`/programs/${programId}/risks/${editingRisk.id}`);
        }
        method = 'PUT';
      } else {
        // For new risks created at program level (if supported in future)
        url = getApiUrl(`/programs/${programId}/risks`);
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(riskData),
      });

      if (response.ok) {
        toast.success(editingRisk ? 'Risk updated successfully' : 'Risk created successfully');
        setDialogOpen(false);
        resetForm();
        fetchRisks();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save risk:', response.status, errorData);
        toast.error(errorData.message || `Failed to ${editingRisk ? 'update' : 'create'} risk`);
      }
    } catch (error) {
      console.error('Failed to save risk:', error);
      toast.error('Failed to save risk');
    }
  };

  const handleEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setFormData({
      title: risk.title,
      description: risk.description,
      probability: risk.probability,
      impact: risk.impact,
      category: risk.category,
      owner: risk.owner || '',
      mitigation: risk.mitigation || '',
      status: risk.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (riskId: string) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;

    try {
      const { getApiUrl } = await import('@/lib/api-url');
      
      // Find the risk to get its projectId
      const riskToDelete = risks.find(r => r.id === riskId);
      let url: string;
      
      if (riskToDelete?.projectId) {
        // Use project endpoint to delete the risk
        url = getApiUrl(`/projects/${riskToDelete.projectId}/risks/${riskId}`);
      } else {
        // Fallback for risks without a project
        url = getApiUrl(`/programs/${programId}/risks/${riskId}`);
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        toast.success('Risk deleted successfully');
        fetchRisks();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete risk:', response.status, errorData);
        toast.error(errorData.message || 'Failed to delete risk');
      }
    } catch (error) {
      console.error('Failed to delete risk:', error);
      toast.error('Failed to delete risk');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      probability: 50,
      impact: 3,
      category: '',
      owner: '',
      mitigation: '',
      status: 'open',
    });
    setEditingRisk(null);
  };

  // Filter risks
  const filteredRisks = risks.filter((risk) => {
    if (filterSeverity !== 'all' && risk.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && risk.status !== filterStatus) return false;
    return true;
  });

  // Calculate risk statistics
  const riskStats = {
    total: risks.length,
    open: risks.filter((r) => r.status === 'open').length,
    critical: risks.filter((r) => r.severity === 'critical').length,
    avgProbability: risks.length > 0 
      ? Math.round(risks.reduce((sum, r) => sum + r.probability, 0) / risks.length) 
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading risks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Risks</p>
                <p className="text-2xl font-bold">{riskStats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Risks</p>
                <p className="text-2xl font-bold text-orange-600">{riskStats.open}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Risks</p>
                <p className="text-2xl font-bold text-red-600">{riskStats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Probability</p>
                <p className="text-2xl font-bold">{riskStats.avgProbability}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-sky-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Risk Register</CardTitle>
              <CardDescription>Track and manage program risks</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add New Risk'}</DialogTitle>
                  <DialogDescription>
                    {editingRisk ? 'Update risk details' : 'Add a new risk to the program risk register'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {editingRisk?.projectName && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Project</p>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{editingRisk.projectName}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="title">Risk Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => { setFormData({ ...formData, title: e.target.value }); }}
                      placeholder="Enter risk title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => { setFormData({ ...formData, description: e.target.value }); }}
                      placeholder="Describe the risk in detail"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => { setFormData({ ...formData, category: e.target.value }); }}
                        placeholder="e.g., Technical, Resource"
                      />
                    </div>
                    <div>
                      <Label htmlFor="owner">Risk Owner</Label>
                      <Input
                        id="owner"
                        value={formData.owner}
                        onChange={(e) => { setFormData({ ...formData, owner: e.target.value }); }}
                        placeholder="Enter owner name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="probability">Probability: {formData.probability}%</Label>
                      <Input
                        id="probability"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.probability}
                        onChange={(e) => {
                          setFormData({ ...formData, probability: parseInt(e.target.value) });
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="impact">Impact (1-5): {formData.impact}</Label>
                      <Input
                        id="impact"
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={formData.impact}
                        onChange={(e) => { setFormData({ ...formData, impact: parseInt(e.target.value) }); }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Calculated Severity</Label>
                    <Badge className={severityConfig[calculateSeverity(formData.probability, formData.impact)].color}>
                      {severityConfig[calculateSeverity(formData.probability, formData.impact)].icon}{' '}
                      {severityConfig[calculateSeverity(formData.probability, formData.impact)].label}
                    </Badge>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: Risk['status']) => { setFormData({ ...formData, status: value }); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="mitigating">Mitigating</SelectItem>
                        <SelectItem value="mitigated">Mitigated</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="mitigation">Mitigation Strategy</Label>
                    <Textarea
                      id="mitigation"
                      value={formData.mitigation}
                      onChange={(e) => { setFormData({ ...formData, mitigation: e.target.value }); }}
                      placeholder="Describe mitigation actions"
                      rows={3}
                    />
                  </div>
                  {editingRisk?.extractedFromDocumentId && editingRisk?.projectId && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Source Document</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">This risk was extracted from a document</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialogOpen(false);
                          router.push(`/projects/${editingRisk.projectId}/documents/${editingRisk.extractedFromDocumentId}`);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Document
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDialogOpen(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.title || !formData.description}>
                    {editingRisk ? 'Update Risk' : 'Create Risk'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Select value={filterSeverity} onValueChange={(value) => { setFilterSeverity(value); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="mitigating">Mitigating</SelectItem>
                <SelectItem value="mitigated">Mitigated</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Risks Table */}
          {filteredRisks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRisks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{risk.title}</span>
                        {risk.extractedFromDocumentId && risk.projectId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => router.push(`/projects/${risk.projectId}/documents/${risk.extractedFromDocumentId}`)}
                            title="View source document"
                          >
                            <FileText className="h-3 w-3 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {risk.projectName ? (
                        <span className="text-sm text-blue-600 font-medium">{risk.projectName}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{risk.category}</TableCell>
                    <TableCell>
                      <Badge className={severityConfig[risk.severity].color}>
                        {severityConfig[risk.severity].icon} {severityConfig[risk.severity].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{risk.probability}%</TableCell>
                    <TableCell>{risk.impact}/5</TableCell>
                    <TableCell>
                      <Badge className={getStatusConfig(risk.status).color}>
                        {getStatusConfig(risk.status).label}
                      </Badge>
                    </TableCell>
                    <TableCell>{risk.owner || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <RiskMitigationPlansView
                          riskId={risk.id}
                          riskTitle={risk.title}
                          extractedFromDocumentId={risk.extractedFromDocumentId}
                          projectId={risk.projectId}
                          projectName={risk.projectName}
                          riskDescription={risk.description}
                          riskCategory={risk.category}
                          riskProbability={risk.probability}
                          riskImpact={risk.impact}
                          riskSeverity={risk.severity}
                          trigger={
                            <Button variant="ghost" size="sm" title="View Mitigation Plans">
                              <Shield className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Button variant="ghost" size="sm" onClick={() => { handleEdit(risk); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { handleDelete(risk.id); }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No risks found</h3>
              <p className="text-muted-foreground mb-4">
                {risks.length === 0 ? 'Add your first risk to get started' : 'No risks match your filters'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
