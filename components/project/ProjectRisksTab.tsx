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
  AlertTriangle, Plus, Pencil, Trash2, Loader2, Filter, Search, 
  FileText, CheckCircle, XCircle, Eye, EyeOff, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

// Helper function to safely extract error message
const getErrorMessage = (error: any, defaultMessage: string): string => {
  if (!error) return defaultMessage
  
  // Check if error.response.data is an object with message/code/details
  const errorData = error.response?.data
  if (errorData) {
    // If it's a string, return it
    if (typeof errorData === 'string') return errorData
    
    // If it's an object, try to extract message
    if (typeof errorData === 'object') {
      if (errorData.message && typeof errorData.message === 'string') {
        return errorData.message
      }
      if (errorData.error && typeof errorData.error === 'string') {
        return errorData.error
      }
      // If object has message/code/details, stringify the message
      if (errorData.message) {
        return String(errorData.message)
      }
    }
  }
  
  // Fallback to error.message or default
  return error.message || defaultMessage
}

interface ProjectRisk {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  impact: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'identified' | 'assessed' | 'mitigated' | 'closed';
  mitigation_strategy?: string;
  contingency_plan?: string;
  owner?: string;
  extracted_from_document_id?: string;
  source_document_id?: string;
  source_document_title?: string; // Document title for traceability
  risk_origin?: 'project-extraction' | 'program-level' | 'portfolio-level' | 'manual-entry' | 'risk-workshop' | 'strategic-review';
  risk_level?: 'project' | 'program' | 'portfolio' | 'systemic';
  is_curated?: boolean; // Whether risk has been reviewed/curated
  created_at: string;
  updated_at: string;
}

interface ProjectRisksTabProps {
  projectId: string;
}

const severityConfig = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300', icon: '🔴' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🟠' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🟡' },
  low: { label: 'Low', color: 'bg-green-100 text-green-800 border-green-300', icon: '🟢' },
};

const probabilityMap = {
  very_high: 90,
  high: 70,
  medium: 50,
  low: 30,
  very_low: 10,
};

const impactMap = {
  very_high: 5,
  high: 4,
  medium: 3,
  low: 2,
  very_low: 1,
};

export function ProjectRisksTab({ projectId }: ProjectRisksTabProps) {
  const router = useRouter();
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProjectRisk | null>(null);
  const [materializingRiskId, setMaterializingRiskId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterCurated, setFilterCurated] = useState<string>('all'); // all, curated, uncurated
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    probability: 'medium' as ProjectRisk['probability'],
    impact: 'medium' as ProjectRisk['impact'],
    status: 'identified' as ProjectRisk['status'],
    mitigation_strategy: '',
    contingency_plan: '',
    owner: '',
    risk_origin: 'project-extraction' as ProjectRisk['risk_origin'],
    is_curated: false,
  });

  // Fetch risks for this project
  const fetchRisks = async () => {
    try {
      setLoading(true);
      console.log('[RISKS] Fetching risks for project:', projectId);
      const response = await apiClient.get(`/projects/${projectId}/risks`);
      console.log('[RISKS] API Response:', {
        responseType: typeof response,
        isArray: Array.isArray(response),
        responseKeys: typeof response === 'object' && response !== null ? Object.keys(response) : null,
        success: response?.success,
        dataLength: response?.data?.length,
        directArrayLength: Array.isArray(response) ? response.length : undefined,
        data: response?.data?.slice?.(0, 3) || (Array.isArray(response) ? response.slice(0, 3) : undefined),
        fullResponse: response
      });
      
      // Handle both response formats: { success: true, data: [...] } or direct array [...]
      let risksData: ProjectRisk[] = [];
      if (Array.isArray(response)) {
        // Backend returned array directly (unexpected but handle it)
        risksData = response;
        console.log('[RISKS] Received array directly, length:', risksData.length);
      } else if (response && typeof response === 'object') {
        // Backend returned object - check for data property
        if (Array.isArray(response.data)) {
          risksData = response.data;
          console.log('[RISKS] Received object with data array, length:', risksData.length);
        } else if (response.success !== false) {
          // Try to extract data even if structure is unexpected
          risksData = response.data || [];
          console.log('[RISKS] Received object, extracted data, length:', risksData.length);
        } else {
          // Error response
          const errorMsg = response.error || response.message || 'Failed to fetch risks';
          console.error('[RISKS] API returned error:', {
            error: errorMsg,
            response: response
          });
          toast.error(`Failed to load risks: ${errorMsg}`);
          return;
        }
      }
      
      console.log('[RISKS] Setting risks:', risksData.length, 'risks');
      if (risksData.length > 0) {
        console.log('[RISKS] Sample risk:', risksData[0]);
      }
      setRisks(risksData);
      
      if (risksData.length === 0) {
        console.warn('[RISKS] No risks returned from API');
        toast.warning('No risks found for this project');
      } else {
        console.log('[RISKS] Successfully loaded', risksData.length, 'risks');
      }
    } catch (error: any) {
      console.error('[RISKS] Exception fetching risks:', {
        error: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        stack: error?.stack
      });
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to fetch risks';
      toast.error(`Failed to load risks: ${errorMsg}`);
      // Try fallback only for server errors (500, 502, 503, etc.)
      if (error?.response?.status >= 500) {
        try {
          const extractionResponse = await apiClient.get(`/project-data-extraction/project/${projectId}/risks`);
          if (extractionResponse.data && extractionResponse.data.success !== false) {
            setRisks(extractionResponse.data.data || []);
            toast.success('Loaded risks from extraction endpoint');
          }
        } catch (fallbackError) {
          console.error('[RISKS] Fallback fetch also failed:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchRisks();
    }
  }, [projectId]);

  // Calculate severity from probability and impact
  const calculateSeverity = (probability: ProjectRisk['probability'], impact: ProjectRisk['impact']): ProjectRisk['severity'] => {
    const probScore = probabilityMap[probability];
    const impactScore = impactMap[impact];
    const score = (probScore / 100) * impactScore;
    
    if (score >= 4) return 'critical';
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  };

  // Filter risks
  const filteredRisks = risks.filter(risk => {
    const matchesSearch = !searchTerm || 
                         risk.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         risk.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || risk.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || risk.status === filterStatus;
    const matchesOrigin = filterOrigin === 'all' || risk.risk_origin === filterOrigin;
    const matchesCurated = filterCurated === 'all' || 
                          (filterCurated === 'curated' && risk.is_curated) ||
                          (filterCurated === 'uncurated' && !risk.is_curated);
    
    return matchesSearch && matchesSeverity && matchesStatus && matchesOrigin && matchesCurated;
  });

  // Debug: Log filtering results
  useEffect(() => {
    if (risks.length > 0) {
      console.log('[RISKS] Filtering:', {
        totalRisks: risks.length,
        filteredRisks: filteredRisks.length,
        filters: { searchTerm, filterSeverity, filterStatus, filterOrigin, filterCurated },
        sampleRisk: risks[0]
      });
    }
  }, [risks, filteredRisks, searchTerm, filterSeverity, filterStatus, filterOrigin, filterCurated]);

  // Open dialog for new risk
  const handleNewRisk = () => {
    setEditingRisk(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      probability: 'medium',
      impact: 'medium',
      status: 'identified',
      mitigation_strategy: '',
      contingency_plan: '',
      owner: '',
      risk_origin: 'manual-entry',
      is_curated: false,
    });
    setDialogOpen(true);
  };

  // Open dialog for editing risk
  const handleEditRisk = (risk: ProjectRisk) => {
    setEditingRisk(risk);
    setFormData({
      title: risk.title,
      description: risk.description || '',
      category: risk.category || '',
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      mitigation_strategy: risk.mitigation_strategy || '',
      contingency_plan: risk.contingency_plan || '',
      owner: risk.owner || '',
      risk_origin: risk.risk_origin || 'project-extraction',
      is_curated: risk.is_curated || false,
    });
    setDialogOpen(true);
  };

  // Save risk (create or update)
  const handleSaveRisk = async () => {
    try {
      const severity = calculateSeverity(formData.probability, formData.impact);
      const riskData = {
        ...formData,
        severity,
        project_id: projectId,
      };

      if (editingRisk) {
        // Update existing risk
        await apiClient.put(`/projects/${projectId}/risks/${editingRisk.id}`, riskData);
        toast.success('Risk updated successfully');
      } else {
        // Create new risk
        await apiClient.post(`/projects/${projectId}/risks`, riskData);
        toast.success('Risk created successfully');
      }

      setDialogOpen(false);
      fetchRisks();
    } catch (error: any) {
      console.error('Failed to save risk:', error);
      toast.error(getErrorMessage(error, 'Failed to save risk'));
    }
  };

  // Delete risk
  const handleDeleteRisk = async (riskId: string) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;

    try {
      await apiClient.delete(`/projects/${projectId}/risks/${riskId}`);
      toast.success('Risk deleted successfully');
      fetchRisks();
    } catch (error: any) {
      console.error('Failed to delete risk:', error);
      toast.error('Failed to delete risk');
    }
  };

  // Mark risk as curated
  const handleCurateRisk = async (riskId: string, curated: boolean) => {
    try {
      await apiClient.put(`/projects/${projectId}/risks/${riskId}`, { is_curated: curated });
      toast.success(curated ? 'Risk marked as curated' : 'Risk marked as uncurated');
      fetchRisks();
    } catch (error: any) {
      console.error('Failed to update curation status:', error);
      toast.error('Failed to update risk');
    }
  };

  // Materialize risk into issue (when risk matures into actual problem)
  const handleMaterializeRisk = async (risk: ProjectRisk) => {
    if (!confirm(`Convert this risk into an issue?\n\n"${risk.title}"\n\nThis will create an issue and mark the risk as materialized.`)) {
      return;
    }

    setMaterializingRiskId(risk.id);
    try {
      const response = await apiClient.post(`/issues/materialize-risk/${risk.id}`, {
        priority: risk.severity === 'critical' ? 'critical' : risk.severity === 'high' ? 'high' : 'medium',
        impact: `Risk with ${risk.impact} impact has materialized`
      });

      toast.success('Risk successfully converted to issue');
      
      // Refresh risks to show updated status
      fetchRisks();
      
      // Optionally navigate to issues tab
      // You can uncomment this if you want to auto-navigate:
      // router.push(`/projects/${projectId}?tab=issues`);
    } catch (error: any) {
      console.error('Failed to materialize risk:', error);
      toast.error(getErrorMessage(error, 'Failed to convert risk to issue'));
    } finally {
      setMaterializingRiskId(null);
    }
  };

  // Bulk curate selected risks
  const handleBulkCurate = async (curated: boolean) => {
    const selectedRisks = filteredRisks.filter(r => !r.is_curated === !curated);
    if (selectedRisks.length === 0) {
      toast.info('No risks to update');
      return;
    }

    try {
      await Promise.all(
        selectedRisks.map(risk => 
          apiClient.put(`/projects/${projectId}/risks/${risk.id}`, { is_curated: curated })
        )
      );
      toast.success(`Updated ${selectedRisks.length} risk(s)`);
      fetchRisks();
    } catch (error: any) {
      console.error('Failed to bulk curate risks:', error);
      toast.error('Failed to update risks');
    }
  };

  const uncuratedCount = risks.filter(r => !r.is_curated).length;
  const curatedCount = risks.filter(r => r.is_curated).length;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Project Risk Register
              </CardTitle>
              <CardDescription>
                Administer and curate extracted risks. Curated risks feed into program-level risk management.
              </CardDescription>
            </div>
            <Button onClick={handleNewRisk}>
              <Plus className="h-4 w-4 mr-2" />
              Add Risk
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold">{risks.length}</div>
              <div className="text-sm text-muted-foreground">Total Risks</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold">{curatedCount}</div>
              <div className="text-sm text-muted-foreground">Curated</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-2xl font-bold">{uncuratedCount}</div>
              <div className="text-sm text-muted-foreground">Needs Review</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold">
                {risks.filter(r => r.severity === 'critical' || r.severity === 'high').length}
              </div>
              <div className="text-sm text-muted-foreground">High/Critical</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search risks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="assessed">Assessed</SelectItem>
                <SelectItem value="mitigated">Mitigated</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOrigin} onValueChange={setFilterOrigin}>
              <SelectTrigger>
                <SelectValue placeholder="Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Origins</SelectItem>
                <SelectItem value="project-extraction">AI Extraction</SelectItem>
                <SelectItem value="manual-entry">Manual Entry</SelectItem>
                <SelectItem value="risk-workshop">Risk Workshop</SelectItem>
                <SelectItem value="strategic-review">Strategic Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCurated} onValueChange={setFilterCurated}>
              <SelectTrigger>
                <SelectValue placeholder="Curation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="curated">Curated Only</SelectItem>
                <SelectItem value="uncurated">Needs Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {uncuratedCount > 0 && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkCurate(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All as Curated ({uncuratedCount})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risks Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRisks.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No risks found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Source Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Curated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRisks.map((risk) => {
                  const severity = risk.severity || calculateSeverity(risk.probability, risk.impact);
                  return (
                    <TableRow key={risk.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{risk.title}</span>
                          {risk.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {risk.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(risk.extracted_from_document_id || risk.source_document_id) ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700"
                              onClick={() => {
                                const docId = risk.extracted_from_document_id || risk.source_document_id;
                                router.push(`/projects/${projectId}/documents/${docId}`);
                              }}
                              title={`View source document: ${risk.source_document_title || 'Document'}`}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              <span className="max-w-[150px] truncate">
                                {risk.source_document_title || 'View Document'}
                              </span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Manual entry</span>
                        )}
                      </TableCell>
                      <TableCell>{risk.category || '-'}</TableCell>
                      <TableCell>
                        <Badge className={severityConfig[severity].color}>
                          {severityConfig[severity].icon} {severityConfig[severity].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{probabilityMap[risk.probability]}%</TableCell>
                      <TableCell>{impactMap[risk.impact]}/5</TableCell>
                      <TableCell>
                        <Badge variant="outline">{risk.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {risk.risk_origin?.replace('-', ' ') || 'project-extraction'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCurateRisk(risk.id, !risk.is_curated)}
                          title={risk.is_curated ? 'Mark as uncurated' : 'Mark as curated'}
                        >
                          {risk.is_curated ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMaterializeRisk(risk)}
                            disabled={materializingRiskId === risk.id || risk.status === 'closed'}
                            title="Convert to Issue (Risk has materialized)"
                            className="text-orange-600 hover:text-orange-700"
                          >
                            {materializingRiskId === risk.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRisk(risk)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRisk(risk.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRisk ? 'Edit Risk' : 'Create Risk'}</DialogTitle>
            <DialogDescription>
              {editingRisk ? 'Update risk details' : 'Add a new risk to the project'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Document Traceability Info */}
          {editingRisk && (editingRisk.extracted_from_document_id || editingRisk.source_document_id) && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900 dark:text-blue-100">Source Document:</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-blue-600 hover:text-blue-700 underline"
                  onClick={() => {
                    const docId = editingRisk.extracted_from_document_id || editingRisk.source_document_id;
                    router.push(`/projects/${projectId}/documents/${docId}`);
                    setDialogOpen(false);
                  }}
                >
                  {editingRisk.source_document_title || 'View Document'}
                </Button>
                <span className="text-muted-foreground text-xs ml-2">
                  (Extracted from document)
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Risk title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the risk"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., technical, schedule, budget"
                />
              </div>
              
              <div>
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Risk owner"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="probability">Probability</Label>
                <Select
                  value={formData.probability}
                  onValueChange={(value: ProjectRisk['probability']) => 
                    setFormData({ ...formData, probability: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_high">Very High (90%)</SelectItem>
                    <SelectItem value="high">High (70%)</SelectItem>
                    <SelectItem value="medium">Medium (50%)</SelectItem>
                    <SelectItem value="low">Low (30%)</SelectItem>
                    <SelectItem value="very_low">Very Low (10%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="impact">Impact</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value: ProjectRisk['impact']) => 
                    setFormData({ ...formData, impact: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_high">Very High (5)</SelectItem>
                    <SelectItem value="high">High (4)</SelectItem>
                    <SelectItem value="medium">Medium (3)</SelectItem>
                    <SelectItem value="low">Low (2)</SelectItem>
                    <SelectItem value="very_low">Very Low (1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: ProjectRisk['status']) => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="assessed">Assessed</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="risk_origin">Risk Origin</Label>
              <Select
                value={formData.risk_origin}
                onValueChange={(value: ProjectRisk['risk_origin']) => 
                  setFormData({ ...formData, risk_origin: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project-extraction">AI Extraction</SelectItem>
                  <SelectItem value="manual-entry">Manual Entry</SelectItem>
                  <SelectItem value="risk-workshop">Risk Workshop</SelectItem>
                  <SelectItem value="strategic-review">Strategic Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="mitigation_strategy">Mitigation Strategy</Label>
              <Textarea
                id="mitigation_strategy"
                value={formData.mitigation_strategy}
                onChange={(e) => setFormData({ ...formData, mitigation_strategy: e.target.value })}
                placeholder="How to prevent or reduce this risk"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="contingency_plan">Contingency Plan</Label>
              <Textarea
                id="contingency_plan"
                value={formData.contingency_plan}
                onChange={(e) => setFormData({ ...formData, contingency_plan: e.target.value })}
                placeholder="What to do if the risk occurs"
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_curated"
                checked={formData.is_curated}
                onChange={(e) => setFormData({ ...formData, is_curated: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_curated" className="cursor-pointer">
                Mark as curated (ready for program-level aggregation)
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRisk} disabled={!formData.title}>
              {editingRisk ? 'Update' : 'Create'} Risk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

