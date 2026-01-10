"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import type { WorkflowConfig } from "../types"

interface ConfigurationTabProps {
  workflowConfig: WorkflowConfig
  setWorkflowConfig: React.Dispatch<React.SetStateAction<WorkflowConfig>>
  contextWindow: number[]
  setContextWindow: (value: number[]) => void
  selectedModel: string
  modelParameters: any
}

// Format numbers consistently
const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

export function ConfigurationTab({
  workflowConfig,
  setWorkflowConfig,
  contextWindow,
  setContextWindow,
  selectedModel,
  modelParameters
}: ConfigurationTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workflow Configuration</CardTitle>
          <CardDescription>
            Configure the processing parameters for optimal context window utilization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model-Specific Parameters */}
          {selectedModel && modelParameters && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Model-Specific Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">Model:</span>
                  <div className="text-blue-700 dark:text-blue-300">{modelParameters.name}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">Context Window:</span>
                  <div className="text-blue-700 dark:text-blue-300">{modelParameters.contextWindow ? formatNumber(modelParameters.contextWindow) : 'Unknown'} tokens</div>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">Max Output Tokens:</span>
                  <div className="text-blue-700 dark:text-blue-300">{modelParameters.maxTokens ? formatNumber(modelParameters.maxTokens) : 'Unknown'}</div>
                </div>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                These parameters are automatically set based on the selected model and cannot be modified.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Context Window (Model-Defined)</Label>
              <div className="space-y-2">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{formatNumber(contextWindow[0])}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedModel ? 'Set by selected model' : 'Default value'}
                  </div>
                </div>
                {!selectedModel && (
                  <Slider
                    value={contextWindow}
                    onValueChange={setContextWindow}
                    max={5000000}
                    min={1000}
                    step={1000}
                    className="w-full"
                  />
                )}
                {!selectedModel && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1K</span>
                    <span className="font-medium">{formatNumber(contextWindow[0])}</span>
                    <span>5M</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority-strategy">Priority Strategy</Label>
              <Select 
                value={workflowConfig.priorityStrategy} 
                onValueChange={(value: string) => setWorkflowConfig(prev => ({ ...prev, priorityStrategy: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance-based</SelectItem>
                  <SelectItem value="recency">Recency-based</SelectItem>
                  <SelectItem value="importance">Importance-based</SelectItem>
                  <SelectItem value="hybrid">Hybrid Approach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="compression-level">Compression Level</Label>
              <div className="space-y-2">
                <Slider
                  value={[workflowConfig.compressionLevel]}
                  onValueChange={(value: number[]) => setWorkflowConfig(prev => ({ ...prev, compressionLevel: value[0] }))}
                  max={1}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Minimal</span>
                  <span className="font-medium">{(workflowConfig.compressionLevel * 100).toFixed(0)}%</span>
                  <span>Maximum</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compression-method">🔧 Compression Method</Label>
              <Select
                value={workflowConfig.compressionMethod}
                onValueChange={(value: 'truncate' | 'summarize' | 'smart' | 'keyword') => 
                  setWorkflowConfig(prev => ({ ...prev, compressionMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select compression method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truncate">
                    <div className="flex flex-col">
                      <span className="font-medium">1. Content Truncation (Simple)</span>
                      <span className="text-xs text-muted-foreground">Take first X% of document content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="summarize">
                    <div className="flex flex-col">
                      <span className="font-medium">2. AI Summarization (Advanced)</span>
                      <span className="text-xs text-muted-foreground">AI-powered intelligent summarization</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="smart">
                    <div className="flex flex-col">
                      <span className="font-medium">3. Section-Based Compression (Intelligent)</span>
                      <span className="text-xs text-muted-foreground">Preserve structure and important content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="keyword">
                    <div className="flex flex-col">
                      <span className="font-medium">4. Keyword-Based Compression (Smart)</span>
                      <span className="text-xs text-muted-foreground">Extract key information and compress non-essential</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {workflowConfig.compressionMethod === 'truncate' && "Fastest method - takes first portion of document"}
                {workflowConfig.compressionMethod === 'summarize' && "Most intelligent - AI creates coherent summary"}
                {workflowConfig.compressionMethod === 'smart' && "Balanced approach - preserves structure and key content"}
                {workflowConfig.compressionMethod === 'keyword' && "Smart extraction - keeps important terms and concepts"}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="include-metadata">Include Metadata</Label>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={workflowConfig.includeMetadata}
                  onChange={(e) => setWorkflowConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="rounded" 
                />
                <span className="text-sm">Include document metadata</span>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={workflowConfig.includeRelationships}
                  onChange={(e) => setWorkflowConfig(prev => ({ ...prev, includeRelationships: e.target.checked }))}
                  className="rounded" 
                />
                <span className="text-sm">Include relationships</span>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={workflowConfig.includeStakeholders}
                  onChange={(e) => setWorkflowConfig(prev => ({ ...prev, includeStakeholders: e.target.checked }))}
                  className="rounded" 
                />
                <span className="text-sm">Include project stakeholders</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

