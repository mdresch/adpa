"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle } from "@/components/ui/icons-shim"
import type { WorkflowConfig, Stakeholder } from "../types"

interface OptimizationTabProps {
  templateBaseTokens: number
  projectMetadataTokens: number
  stakeholderTokens: number
  documentContentTokens: number
  totalUsageTokens: number
  availableTokens: number
  contextWindow: number[]
  workflowConfig: WorkflowConfig
  selectedProject: string
  projectStakeholders: Stakeholder[]
}

// Format numbers consistently
const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

export function OptimizationTab({
  templateBaseTokens,
  projectMetadataTokens,
  stakeholderTokens,
  documentContentTokens,
  totalUsageTokens,
  availableTokens,
  contextWindow,
  workflowConfig,
  selectedProject,
  projectStakeholders
}: OptimizationTabProps) {
  const utilizationPercent = (totalUsageTokens / contextWindow[0]) * 100

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Context Window Analysis</CardTitle>
            <CardDescription>
              Real-time analysis of context window utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Template Base</span>
                <span className="text-sm font-medium">{formatNumber(templateBaseTokens)} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Project Metadata</span>
                <span className="text-sm font-medium">{formatNumber(projectMetadataTokens)} tokens</span>
              </div>
              {workflowConfig.includeStakeholders && selectedProject && projectStakeholders.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Stakeholders ({projectStakeholders.length})</span>
                  <span className="text-sm font-medium">{formatNumber(stakeholderTokens)} tokens</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm">Document Content</span>
                <span className="text-sm font-medium">{formatNumber(documentContentTokens)} tokens</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Compression: {(workflowConfig.compressionLevel * 100).toFixed(0)}%</span>
                <span>Raw: {formatNumber(Math.ceil(documentContentTokens / workflowConfig.compressionLevel))} tokens</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Total Usage</span>
                  <span>{formatNumber(totalUsageTokens)} tokens</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Available</span>
                  <span>{formatNumber(availableTokens)} tokens</span>
                </div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
            <CardDescription>
              AI-powered suggestions for optimal context utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">High Priority Documents</h4>
                  <p className="text-sm text-blue-700">
                    Consider including more high-priority documents to maximize context value
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Optimal Compression</h4>
                  <p className="text-sm text-green-700">
                    Current compression level is optimal for maintaining quality while maximizing content
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Token Efficiency</h4>
                  <p className="text-sm text-yellow-700">
                    Consider removing low-priority documents to improve processing speed
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

