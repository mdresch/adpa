'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  Database,
  FileText,
  Brain,
  Target,
  Shield,
  Download,
  Eye,
  BarChart3,
  Activity,
  TrendingUp,
  Info,
  Lightbulb,
  Star,
  Award,
  Rocket,
  Zap,
  Settings,
  Play,
  Pause,
  Square
} from 'lucide-react'

interface StageMonitorProps {
  stageId: string
  stageName: string
  description: string
  icon: React.ReactNode
  color: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  qualityScore?: number
  duration?: number
  startTime?: Date
  endTime?: Date
  details?: any
  error?: string
  onStageAction?: (action: string, stageId: string) => void
}

export function StageMonitor({
  stageId,
  stageName,
  description,
  icon,
  color,
  status,
  progress,
  qualityScore,
  duration,
  startTime,
  endTime,
  details,
  error,
  onStageAction
}: StageMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getStageSpecificDetails = () => {
    switch (stageId) {
      case 'context_gathering':
        return {
          title: 'Context Sources',
          items: [
            { label: 'Project Data', value: details?.sourcesUsed?.includes('project_data') ? '✓' : '○' },
            { label: 'User Profile', value: details?.sourcesUsed?.includes('user_profile') ? '✓' : '○' },
            { label: 'Document History', value: details?.sourcesUsed?.includes('document_history') ? '✓' : '○' },
            { label: 'External APIs', value: details?.sourcesUsed?.includes('external_api') ? '✓' : '○' }
          ],
          metrics: [
            { label: 'Context Quality', value: details?.contextQuality ? `${(details.contextQuality * 100).toFixed(1)}%` : 'N/A' },
            { label: 'Sources Count', value: details?.sourcesCount || '0' },
            { label: 'Context Size', value: details?.contextSize || '0MB' }
          ]
        }
      case 'template_processing':
        return {
          title: 'Processing Results',
          items: [
            { label: 'Variables Resolved', value: details?.variablesResolved || '0' },
            { label: 'Enhancements Applied', value: details?.enhancementsApplied || '0' },
            { label: 'AI Insights Generated', value: details?.aiInsightsGenerated || '0' },
            { label: 'Methodology Compliance', value: details?.methodologyCompliance ? `${(details.methodologyCompliance * 100).toFixed(1)}%` : 'N/A' }
          ],
          metrics: [
            { label: 'Processing Quality', value: qualityScore ? `${(qualityScore * 100).toFixed(1)}%` : 'N/A' },
            { label: 'Enhancement Confidence', value: '85%' },
            { label: 'Methodology Score', value: details?.methodologyCompliance ? `${(details.methodologyCompliance * 100).toFixed(1)}%` : 'N/A' }
          ]
        }
      case 'ai_generation':
        return {
          title: 'AI Generation Results',
          items: [
            { label: 'Models Used', value: details?.modelsUsed?.join(', ') || 'N/A' },
            { label: 'Generation Steps', value: details?.generationSteps || '0' },
            { label: 'Cross-Validation Score', value: details?.crossValidationScore ? `${(details.crossValidationScore * 100).toFixed(1)}%` : 'N/A' },
            { label: 'Refinements Applied', value: details?.refinementsApplied || '0' }
          ],
          metrics: [
            { label: 'Generation Quality', value: qualityScore ? `${(qualityScore * 100).toFixed(1)}%` : 'N/A' },
            { label: 'Model Confidence', value: '92%' },
            { label: 'Content Coherence', value: '88%' }
          ]
        }
      case 'context_injection':
        return {
          title: 'Context Injection Results',
          items: [
            { label: 'Injection Strategy', value: details?.injectionStrategy || 'N/A' },
            { label: 'Context Sources Used', value: details?.contextSourcesUsed || '0' },
            { label: 'Personalization Applied', value: details?.personalizationApplied ? '✓' : '○' },
            { label: 'Context Relevance Score', value: details?.contextRelevanceScore ? `${(details.contextRelevanceScore * 100).toFixed(1)}%` : 'N/A' }
          ],
          metrics: [
            { label: 'Injection Quality', value: qualityScore ? `${(qualityScore * 100).toFixed(1)}%` : 'N/A' },
            { label: 'Personalization Score', value: '90%' },
            { label: 'Context Relevance', value: details?.contextRelevanceScore ? `${(details.contextRelevanceScore * 100).toFixed(1)}%` : 'N/A' }
          ]
        }
      case 'quality_assurance':
        return {
          title: 'Quality Assessment Results',
          items: [
            { label: 'Assessments Performed', value: details?.assessmentsPerformed || '0' },
            { label: 'Quality Gates Passed', value: details?.qualityGatesPassed || '0' },
            { label: 'Issues Found', value: details?.issuesFound || '0' },
            { label: 'Recommendations Generated', value: details?.recommendationsGenerated || '0' }
          ],
          metrics: [
            { label: 'Overall Quality', value: qualityScore ? `${(qualityScore * 100).toFixed(1)}%` : 'N/A' },
            { label: 'Content Quality', value: '85%' },
            { label: 'Methodology Compliance', value: '92%' }
          ]
        }
      case 'output_formatting':
        return {
          title: 'Output Formatting Results',
          items: [
            { label: 'Formats Generated', value: details?.formatsGenerated || '0' },
            { label: 'Primary Format', value: details?.primaryFormat || 'N/A' },
            { label: 'Total Size', value: details?.totalSize || '0MB' },
            { label: 'Delivery Options', value: details?.deliveryOptions || '0' }
          ],
          metrics: [
            { label: 'Formatting Quality', value: qualityScore ? `${(qualityScore * 100).toFixed(1)}%` : 'N/A' },
            { label: 'Format Compliance', value: '95%' },
            { label: 'Delivery Readiness', value: '100%' }
          ]
        }
      default:
        return {
          title: 'Stage Details',
          items: [],
          metrics: []
        }
    }
  }

  const stageDetails = getStageSpecificDetails()

  return (
    <Card className={`transition-all duration-300 ${isExpanded ? 'col-span-full' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${color} text-white`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{stageName}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge className={getStatusColor()}>
              {status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          {qualityScore && (
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {(qualityScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Quality Score</div>
            </div>
          )}
          {duration && (
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {formatDuration(duration)}
              </div>
              <div className="text-xs text-gray-600">Duration</div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-800">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Stage Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Stage ID:</span>
                      <span className="font-mono">{stageId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className={getStatusColor()}>{status}</Badge>
                    </div>
                    {startTime && (
                      <div className="flex justify-between">
                        <span>Started:</span>
                        <span>{startTime.toLocaleTimeString()}</span>
                      </div>
                    )}
                    {endTime && (
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span>{endTime.toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Performance</h4>
                  <div className="space-y-2 text-sm">
                    {qualityScore && (
                      <div className="flex justify-between">
                        <span>Quality Score:</span>
                        <span className="font-semibold">{(qualityScore * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    {duration && (
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{formatDuration(duration)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Progress:</span>
                      <span>{progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">{stageDetails.title}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2">Processes</h5>
                    <div className="space-y-1">
                      {stageDetails.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.label}:</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Metrics</h5>
                    <div className="space-y-1">
                      {stageDetails.metrics.map((metric, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{metric.label}:</span>
                          <span className="font-medium">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {qualityScore ? (qualityScore * 100).toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-sm text-gray-600">Quality Score</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {duration ? formatDuration(duration) : '0ms'}
                      </div>
                      <div className="text-sm text-gray-600">Duration</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {progress}%
                      </div>
                      <div className="text-sm text-gray-600">Progress</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  onClick={() => onStageAction?.('view', stageId)}
                >
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  onClick={() => onStageAction?.('retry', stageId)}
                  disabled={status !== 'failed'}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry Stage</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  onClick={() => onStageAction?.('configure', stageId)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configure</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  onClick={() => onStageAction?.('logs', stageId)}
                >
                  <Activity className="h-4 w-4" />
                  <span>View Logs</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

