'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Network,
  FileText
} from 'lucide-react';
import { SemanticProcessingStatus } from '@/components/onboarding/SemanticProcessingStatus';
import apiClient from '@/lib/api';
import { toast } from '@/lib/notify';

interface BatchSummary {
  batchId: string;
  projectId: string;
  overallState: string;
  totalDocuments: number;
  documentsConverted: number;
  documentsExtracted: number;
  documentsSynced: number;
  documentsFailed: number;
  totalEntitiesExtracted: number;
  totalGkgNodesCreated: number;
  startedAt: string;
  completedAt: string | null;
  progress: number;
}

interface ProjectBatches {
  projectId: string;
  projectName?: string;
  batches: BatchSummary[];
}

export default function SemanticProcessingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const batchIdParam = searchParams?.get('batchId');
  const projectIdParam = searchParams?.get('projectId');

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batchIdParam);
  const [projectBatches, setProjectBatches] = useState<ProjectBatches | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (projectIdParam) {
      fetchProjectBatches(projectIdParam);
    } else if (batchIdParam) {
      setSelectedBatchId(batchIdParam);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [projectIdParam, batchIdParam]);

  const fetchProjectBatches = async (projectId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/semantic-processing/project/${projectId}`);
      
      if (response.data?.success) {
        const documents = response.data.data.documents || [];
        
        // Group by batch
        const batchMap = new Map<string, BatchSummary>();
        for (const doc of documents) {
          if (!doc.batchId) continue;
          
          if (!batchMap.has(doc.batchId)) {
            batchMap.set(doc.batchId, {
              batchId: doc.batchId,
              projectId: doc.projectId,
              overallState: 'processing',
              totalDocuments: 0,
              documentsConverted: 0,
              documentsExtracted: 0,
              documentsSynced: 0,
              documentsFailed: 0,
              totalEntitiesExtracted: 0,
              totalGkgNodesCreated: 0,
              startedAt: doc.uploadedAt,
              completedAt: null,
              progress: 0
            });
          }
          
          const batch = batchMap.get(doc.batchId)!;
          batch.totalDocuments++;
          
          if (doc.convertedAt) batch.documentsConverted++;
          if (doc.extractionCompletedAt) batch.documentsExtracted++;
          if (doc.state === 'synced') batch.documentsSynced++;
          if (doc.state === 'failed') batch.documentsFailed++;
          
          if (doc.extractionSummary) {
            batch.totalEntitiesExtracted += doc.extractionSummary.totalEntities || 0;
          }
          if (doc.gkgSyncSummary) {
            batch.totalGkgNodesCreated += doc.gkgSyncSummary.nodesCreated || 0;
          }
        }

        // Calculate progress and state for each batch
        for (const batch of batchMap.values()) {
          const completed = batch.documentsSynced + batch.documentsFailed;
          batch.progress = batch.totalDocuments > 0 
            ? Math.round((completed / batch.totalDocuments) * 100) 
            : 0;
          
          if (batch.documentsSynced === batch.totalDocuments) {
            batch.overallState = 'complete';
          } else if (batch.documentsFailed === batch.totalDocuments) {
            batch.overallState = 'failed';
          } else if (batch.documentsFailed > 0) {
            batch.overallState = 'partial_failure';
          }
        }

        setProjectBatches({
          projectId,
          batches: Array.from(batchMap.values())
        });
      }
    } catch (err: unknown) {
      console.error('Failed to fetch project batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (projectIdParam) {
      await fetchProjectBatches(projectIdParam);
    }
    setRefreshing(false);
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'partial_failure':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'complete':
        return <Badge className="bg-green-500">Complete</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'partial_failure':
        return <Badge className="bg-orange-500">Partial Failure</Badge>;
      default:
        return <Badge variant="secondary">Processing</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Semantic Processing Status</h1>
              <p className="text-muted-foreground">
                Monitor entity extraction and knowledge graph synchronization
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Main Content */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">Loading processing status...</span>
            </CardContent>
          </Card>
        ) : selectedBatchId ? (
          /* Single Batch View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SemanticProcessingStatus
              batchId={selectedBatchId}
              showDetails={true}
            />
          </motion.div>
        ) : projectBatches ? (
          /* Project Batches List */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {projectBatches.batches.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Batches</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {projectBatches.batches.filter(b => b.overallState === 'complete').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Database className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {projectBatches.batches.reduce((sum, b) => sum + b.totalEntitiesExtracted, 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Entities</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-indigo-500/10">
                      <Network className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {projectBatches.batches.reduce((sum, b) => sum + b.totalGkgNodesCreated, 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">GKG Nodes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Batches List */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Batches</CardTitle>
                <CardDescription>
                  Click on a batch to view detailed status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectBatches.batches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No semantic processing batches found
                  </div>
                ) : (
                  projectBatches.batches.map((batch) => (
                    <div
                      key={batch.batchId}
                      className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedBatchId(batch.batchId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStateIcon(batch.overallState)}
                          <div>
                            <div className="font-medium">
                              Batch {batch.batchId.substring(0, 8)}...
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {batch.totalDocuments} documents • Started {new Date(batch.startedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden md:block">
                            <div className="text-sm">
                              {batch.totalEntitiesExtracted} entities
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {batch.totalGkgNodesCreated} GKG nodes
                            </div>
                          </div>
                          {getStateBadge(batch.overallState)}
                        </div>
                      </div>
                      {batch.progress < 100 && batch.overallState === 'processing' && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${batch.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* No Project/Batch Selected */
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-full bg-muted inline-flex">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Select a Batch or Project</h3>
                  <p className="text-muted-foreground">
                    Use the navigation or provide a batchId or projectId parameter
                  </p>
                </div>
                <div className="max-w-md mx-auto pt-4">
                  <Label htmlFor="batch-search" className="sr-only">Search by Batch ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="batch-search"
                      placeholder="Enter batch ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button
                      onClick={() => setSelectedBatchId(searchQuery)}
                      disabled={!searchQuery}
                    >
                      View Status
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to List Button (when viewing single batch) */}
        {selectedBatchId && projectBatches && (
          <Button
            variant="outline"
            onClick={() => setSelectedBatchId(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Batch List
          </Button>
        )}
      </div>
    </div>
  );
}
