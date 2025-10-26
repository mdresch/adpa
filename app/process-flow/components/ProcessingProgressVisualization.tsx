"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  XCircle,
  FileText,
  Database,
  Clock
} from "@/components/ui/icons-shim"
import type { ProcessingStep, ProcessingStatus } from "../types"

interface ProcessingProgressVisualizationProps {
  processingStatus: ProcessingStatus
  workflowProgress: number
  processingSteps: ProcessingStep[]
  finalContext: string | null
  onViewDocument: () => void
}

// Format numbers consistently
const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

export function ProcessingProgressVisualization({
  processingStatus,
  workflowProgress,
  processingSteps,
  finalContext,
  onViewDocument
}: ProcessingProgressVisualizationProps) {
  if (processingStatus === 'idle') {
    return null
  }

  const completedSteps = processingSteps.filter(s => s.status === 'completed').length

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {processingStatus === 'processing' && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            )}
            {processingStatus === 'completed' && (
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            )}
            {processingStatus === 'failed' && (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            <div>
              <CardTitle>Document Processing Pipeline</CardTitle>
              <CardDescription>
                {processingStatus === 'processing' && 'Processing your document...'}
                {processingStatus === 'completed' && 'Processing completed successfully!'}
                {processingStatus === 'failed' && 'An error occurred during processing'}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{workflowProgress.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Overall Progress</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Processing Steps</span>
            <span className="font-medium">{completedSteps} / {processingSteps.length} Complete</span>
          </div>
          <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${workflowProgress}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-white drop-shadow-md">
                {workflowProgress.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Processing Steps */}
        {processingSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Processing Steps</h4>
            <div className="space-y-3">
              {processingSteps.map((step, index) => (
                <div key={step.id} className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                  step.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700' :
                  step.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700 shadow-lg' :
                  step.status === 'failed' ? 'bg-destructive/10 border-destructive/20' :
                  'bg-muted/30 border-muted'
                }`}>
                  {/* Step Number & Status Icon */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                      step.status === 'completed' ? 'bg-emerald-500 text-white' :
                      step.status === 'processing' ? 'bg-blue-500 text-white animate-pulse' :
                      step.status === 'failed' ? 'bg-destructive text-destructive-foreground' :
                      'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                      {step.status === 'completed' && <CheckCircle className="h-5 w-5" />}
                      {step.status === 'processing' && <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />}
                      {step.status === 'failed' && <XCircle className="h-5 w-5" />}
                      {step.status === 'pending' && <span className="text-sm">{index + 1}</span>}
                    </div>
                    {index < processingSteps.length - 1 && (
                      <div className={`w-0.5 h-12 ${
                        step.status === 'completed' ? 'bg-emerald-500' :
                        step.status === 'processing' ? 'bg-blue-500' :
                        'bg-gray-300 dark:bg-gray-600'
                      }`} />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-base">{step.name}</h4>
                      <Badge variant={
                        step.status === 'completed' ? 'default' :
                        step.status === 'processing' ? 'secondary' :
                        step.status === 'failed' ? 'destructive' :
                        'outline'
                      }>
                        {step.status === 'completed' && '✓ Complete'}
                        {step.status === 'processing' && '⟳ Processing...'}
                        {step.status === 'failed' && '✗ Error'}
                        {step.status === 'pending' && '○ Pending'}
                      </Badge>
                    </div>
                    
                    {/* Step Details */}
                    {step.result && (
                      <div className="space-y-2 text-sm">
                        {step.result.description && (
                          <p className="text-muted-foreground">{step.result.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs">
                          {step.result.tokens !== undefined && (
                            <div className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              <span className="font-mono">{formatNumber(step.result.tokens)} tokens</span>
                            </div>
                          )}
                          {step.result.startTime && step.result.endTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{((new Date(step.result.endTime).getTime() - new Date(step.result.startTime).getTime()) / 1000).toFixed(2)}s</span>
                            </div>
                          )}
                        </div>

                        {/* Document Compression Details */}
                        {step.metadata && step.metadata.documents && step.metadata.documents.length > 0 && (
                          <details className="mt-3" open={step.status === 'completed'}>
                            <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              View individual document results ({step.metadata.compressedCount} documents)
                            </summary>
                            <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20">
                              {step.metadata.documents.map((doc: any, docIndex: number) => (
                                <div key={docIndex} className="p-2 bg-muted/50 rounded-lg border border-border/50">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                        <span className="text-xs font-semibold truncate">{doc.name}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono">📥 {formatNumber(doc.originalTokens)}</span>
                                          <span className="text-[10px]">→</span>
                                          <span className="font-mono">📤 {formatNumber(doc.compressedTokens)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                            🎯 {doc.compressionPercent}% saved
                                          </span>
                                        </div>
                                      </div>
                                      {doc.note && (
                                        <div className="text-[10px] text-muted-foreground mt-1 italic">
                                          {doc.note}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2 mt-2 border-t border-border/50 text-xs">
                                <div className="flex items-center justify-between text-muted-foreground">
                                  <span>Total Summary</span>
                                  <div className="flex items-center gap-4">
                                    <span className="font-mono">
                                      {formatNumber(step.metadata.originalTokens)} → {formatNumber(step.metadata.compressedTokens)}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {formatNumber(step.metadata.tokensSaved)} tokens saved
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </details>
                        )}
                        
                        {/* Context Preview */}
                        {step.result.contextAdded && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                              View full compression report
                            </summary>
                            <div className="mt-2 p-3 bg-background border rounded-lg max-h-40 overflow-y-auto">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {step.result.contextAdded.slice(0, 500)}
                                {step.result.contextAdded.length > 500 && '...'}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {/* Step Progress Bar (for processing steps) */}
                    {step.status === 'processing' && (
                      <div className="mt-3 space-y-1">
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300 animate-pulse"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Results */}
        {processingStatus === 'completed' && finalContext && (
          <div className="pt-4 border-t">
            <Button 
              onClick={onViewDocument}
              className="w-full flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Generated Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

