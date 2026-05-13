'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Database,
  Network,
  Clock,
  RotateCcw
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from '@/lib/notify';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type SemanticProcessingState =
  | 'uploaded'
  | 'converted'
  | 'queued_extraction'
  | 'extracting'
  | 'extracted'
  | 'queued_gkg_sync'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'retrying';

interface SemanticProcessingStatusData {
  id: string;
  documentId: string;
  batchId: string | null;
  projectId: string;
  state: SemanticProcessingState;
  uploadedAt: string;
  convertedAt: string | null;
  extractionStartedAt: string | null;
  extractionCompletedAt: string | null;
  gkgSyncStartedAt: string | null;
  gkgSyncCompletedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  extractionSummary: {
    entityCounts: Record<string, number>;
    domainsProcessed: string[];
    totalEntities: number;
    processingTimeMs: number;
  } | null;
  gkgSyncSummary: {
    nodesCreated: number;
    nodesUpdated: number;
    relationshipsCreated: number;
    processingTimeMs: number;
  } | null;
}

interface BatchProcessingStatusData {
  batchId: string;
  projectId: string;
  totalDocuments: number;
  documentsConverted: number;
  documentsExtracted: number;
  documentsSynced: number;
  documentsFailed: number;
  overallState: string;
  startedAt: string;
  completedAt: string | null;
  totalEntitiesExtracted: number;
  totalGkgNodesCreated: number;
  progress: number;
  documents?: SemanticProcessingStatusData[];
}

interface SemanticProcessingStatusProps {
  batchId: string;
  showDetails?: boolean;
  onComplete?: () => void;
  pollInterval?: number;
}

// ============================================================================
// STATE HELPERS
// ============================================================================

const STATE_CONFIG: Record<SemanticProcessingState, {
  label: string;
  color: string;
  badgeClass: string;
  icon: typeof CheckCircle;
  description: string;
}> = {
  uploaded: {
    label: 'Uploaded',
    color: 'bg-blue-500',
    badgeClass: 'bg-blue-100',
    icon: FileText,
    description: 'Document uploaded successfully'
  },
  converted: {
    label: 'Converted',
    color: 'bg-blue-600',
    badgeClass: 'bg-blue-100',
    icon: FileText,
    description: 'Converted to Markdown'
  },
  queued_extraction: {
    label: 'Queued for Extraction',
    color: 'bg-yellow-500',
    badgeClass: 'bg-yellow-100',
    icon: Clock,
    description: 'Waiting for entity extraction'
  },
  extracting: {
    label: 'Extracting',
    color: 'bg-yellow-600',
    badgeClass: 'bg-yellow-100',
    icon: Loader2,
    description: 'Extracting entities from document'
  },
  extracted: {
    label: 'Extracted',
    color: 'bg-green-500',
    badgeClass: 'bg-green-100',
    icon: Database,
    description: 'Entity extraction complete'
  },
  queued_gkg_sync: {
    label: 'Queued for GKG Sync',
    color: 'bg-purple-500',
    badgeClass: 'bg-purple-100',
    icon: Clock,
    description: 'Waiting for knowledge graph sync'
  },
  syncing: {
    label: 'Syncing to GKG',
    color: 'bg-purple-600',
    badgeClass: 'bg-purple-100',
    icon: Network,
    description: 'Syncing to Governance Knowledge Graph'
  },
  synced: {
    label: 'Complete',
    color: 'bg-green-600',
    badgeClass: 'bg-green-100',
    icon: CheckCircle,
    description: 'Fully processed and synced'
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500',
    badgeClass: 'bg-red-100',
    icon: AlertCircle,
    description: 'Processing failed'
  },
  retrying: {
    label: 'Retrying',
    color: 'bg-orange-500',
    badgeClass: 'bg-orange-100',
    icon: RotateCcw,
    description: 'Retrying after failure'
  }
};

const PROCESSING_STAGES = [
  { state: 'uploaded', label: 'Upload' },
  { state: 'converted', label: 'Convert' },
  { state: 'extracting', label: 'Extract' },
  { state: 'syncing', label: 'GKG Sync' },
  { state: 'synced', label: 'Complete' }
];

function getStageIndex(state: SemanticProcessingState): number {
  const stageMap: Record<SemanticProcessingState, number> = {
    uploaded: 0,
    converted: 1,
    queued_extraction: 1.5,
    extracting: 2,
    extracted: 2.5,
    queued_gkg_sync: 2.5,
    syncing: 3,
    synced: 4,
    failed: -1,
    retrying: -1
  };
  return stageMap[state];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SemanticProcessingStatus({
  batchId,
  showDetails = false,
  onComplete,
  pollInterval = 3000
}: SemanticProcessingStatusProps) {
  const [batchStatus, setBatchStatus] = useState<BatchProcessingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(showDetails);
  const [retrying, setRetrying] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const fetchStatus = useCallback(async (): Promise<BatchProcessingStatusData | null> => {
    try {
      const response = await apiClient.get(`/api/semantic-processing/batch/${batchId}`);

      if (response.data?.success) {
        const data = response.data.data as BatchProcessingStatusData;
        setBatchStatus(data);
        setError(null);
        return data;
      }
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch status';
      setBatchStatus((prev) => {
        if (!prev) {
          setError(message);
        }
        return prev;
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let pollingStopped = false;

    const tick = async () => {
      if (cancelled || pollingStopped) return;

      setLoading(true);
      try {
        const response = await apiClient.get(`/api/semantic-processing/batch/${batchId}`);
        if (cancelled) return;

        if (response.data?.success) {
          const data = response.data.data as BatchProcessingStatusData;
          setBatchStatus(data);
          setError(null);

          if (data.overallState === 'complete') {
            onCompleteRef.current?.();
          }

          const terminal =
            data.overallState === 'complete' ||
            data.overallState === 'failed' ||
            data.overallState === 'partial_failure';

          if (terminal) {
            pollingStopped = true;
            if (intervalId !== undefined) {
              clearInterval(intervalId);
            }
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to fetch status';
        setBatchStatus((prev) => {
          if (!prev) {
            setError(message);
          }
          return prev;
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void tick();
    intervalId = setInterval(() => {
      void tick();
    }, pollInterval);

    return () => {
      cancelled = true;
      pollingStopped = true;
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [batchId, pollInterval]);

  const handleRetryDocument = async (documentId: string) => {
    setRetrying(documentId);
    try {
      const response = await apiClient.post(`/api/semantic-processing/document/${documentId}/retry`);
      
      if (response.data?.success) {
        toast.success('Retry initiated successfully');
        await fetchStatus();
      } else {
        toast.error(response.data?.error || 'Failed to retry');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retry';
      toast.error(message);
    } finally {
      setRetrying(null);
    }
  };

  const handleRetryAllFailed = async () => {
    try {
      const response = await apiClient.post(`/api/semantic-processing/batch/${batchId}/retry-failed`);
      
      if (response.data?.success) {
        toast.success(`Retry initiated for ${response.data.data.successful} documents`);
        await fetchStatus();
      } else {
        toast.error(response.data?.error || 'Failed to retry');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retry';
      toast.error(message);
    }
  };

  if (loading && !batchStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading semantic processing status...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !batchStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <span>No semantic processing data available yet</span>
        </CardContent>
      </Card>
    );
  }

  if (!batchStatus) {
    return null;
  }

  const isComplete = batchStatus.overallState === 'complete';
  const hasFailed = batchStatus.documentsFailed > 0;
  const isProcessing = !isComplete && !hasFailed;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {isComplete && !hasFailed && <CheckCircle className="w-5 h-5 text-green-500" />}
            {hasFailed && <AlertCircle className="w-5 h-5 text-red-500" />}
            <CardTitle className="text-lg">Semantic Processing</CardTitle>
          </div>
          <Badge variant={isComplete ? 'default' : hasFailed ? 'destructive' : 'secondary'}>
            {batchStatus.overallState}
          </Badge>
        </div>
        <CardDescription>
          Automatic entity extraction and knowledge graph synchronization
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{batchStatus.progress}%</span>
          </div>
          <Progress value={batchStatus.progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{batchStatus.totalDocuments}</div>
            <div className="text-xs text-muted-foreground">Total Documents</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{batchStatus.documentsSynced}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{batchStatus.totalEntitiesExtracted}</div>
            <div className="text-xs text-muted-foreground">Entities Extracted</div>
          </div>
          <div className="text-center p-3 bg-purple-500/10 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{batchStatus.totalGkgNodesCreated}</div>
            <div className="text-xs text-muted-foreground">GKG Nodes</div>
          </div>
        </div>

        {/* Failed Documents Alert */}
        {hasFailed && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-600">
                  {batchStatus.documentsFailed} document(s) failed processing
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryAllFailed}
                className="text-red-600 border-red-500/50 hover:bg-red-500/10"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry All Failed
              </Button>
            </div>
          </div>
        )}

        {/* Document Details Collapsible */}
        {batchStatus.documents && batchStatus.documents.length > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Document Details ({batchStatus.documents.length})</span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              <AnimatePresence>
                {batchStatus.documents.map((doc) => (
                  <DocumentStatusRow
                    key={doc.documentId}
                    document={doc}
                    onRetry={() => handleRetryDocument(doc.documentId)}
                    isRetrying={retrying === doc.documentId}
                  />
                ))}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DOCUMENT STATUS ROW
// ============================================================================

interface DocumentStatusRowProps {
  document: SemanticProcessingStatusData;
  onRetry: () => void;
  isRetrying: boolean;
}

function DocumentStatusRow({ document, onRetry, isRetrying }: DocumentStatusRowProps) {
  const config = STATE_CONFIG[document.state];
  const StateIcon = config.icon;
  const stageIndex = getStageIndex(document.state);
  const isFailed = document.state === 'failed';
  const canRetry = isFailed && document.retryCount < document.maxRetries;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'p-3 rounded-lg border bg-card',
        isFailed && 'border-red-500/50 bg-red-500/5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <StateIcon
            className={cn(
              'w-5 h-5 flex-shrink-0',
              document.state === 'extracting' || document.state === 'syncing'
                ? 'animate-spin text-yellow-500'
                : isFailed
                ? 'text-red-500'
                : document.state === 'synced'
                ? 'text-green-500'
                : 'text-blue-500'
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{document.documentId.substring(0, 8)}...</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', config.badgeClass)}
                  >
                    {config.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="hidden md:flex items-center gap-1 mx-4">
          {PROCESSING_STAGES.map((stage, idx) => (
            <div
              key={stage.state}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                idx <= stageIndex ? 'bg-primary' : 'bg-muted',
                isFailed && 'bg-red-500'
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {document.extractionSummary && (
            <Badge variant="secondary" className="text-xs">
              {document.extractionSummary.totalEntities} entities
            </Badge>
          )}
          {canRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {isFailed && document.errorMessage && (
        <div className="mt-2 text-xs text-red-600 bg-red-500/10 p-2 rounded">
          {document.errorMessage}
          {document.retryCount > 0 && (
            <span className="ml-2 text-muted-foreground">
              (Retry {document.retryCount}/{document.maxRetries})
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default SemanticProcessingStatus;
