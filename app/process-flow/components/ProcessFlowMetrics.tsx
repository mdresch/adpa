"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MemoryStickIcon, Cpu, Clock, FileText } from "@/components/ui/icons-shim"
import type { ProcessingStatus } from "../types"

interface ProcessFlowMetricsProps {
  contextWindow: number
  totalUsageTokens: number
  processingStatus: ProcessingStatus
  workflowProgress: number
  documentCount: number
}

// Format numbers consistently to avoid hydration errors
const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

export function ProcessFlowMetrics({
  contextWindow,
  totalUsageTokens,
  processingStatus,
  workflowProgress,
  documentCount
}: ProcessFlowMetricsProps) {
  const utilizationPercent = ((totalUsageTokens / contextWindow) * 100).toFixed(1)
  const progressPercent = workflowProgress.toFixed(0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Context Window</CardTitle>
          <MemoryStickIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(contextWindow)}</div>
          <p className="text-xs text-muted-foreground">Max tokens available</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Usage</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(totalUsageTokens)}</div>
          <p className="text-xs text-muted-foreground">
            {utilization Percent}% utilized
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processing Status</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{processingStatus}</div>
          <p className="text-xs text-muted-foreground">
            {processingStatus === 'processing' ? `${progressPercent}% complete` : 'Ready to process'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{documentCount}</div>
          <p className="text-xs text-muted-foreground">Available for processing</p>
        </CardContent>
      </Card>
    </div>
  )
}

