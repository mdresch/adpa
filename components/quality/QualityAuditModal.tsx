/**
 * Quality Audit Modal Component
 * Displays detailed quality audit results in a modal dialog
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react'

interface QualityAuditModalProps {
  documentId: string
  onClose: () => void
}

interface QualityIssue {
  severity: 'critical' | 'major' | 'minor'
  dimension: string
  description: string
  location?: string
  recommendation?: string
}

interface ComplianceMetrics {
  pmbokGuide: number
  gdpr: number
  hipaa: number
  soc2: number
  industryStandards: number
  bestPractices: number
  templateAdherence: number
  overallComplianceRating: number
}

interface QualityAudit {
  id: string
  document_id: string
  document_title: string
  document_type: string
  overall_score: number
  overall_grade: string
  quality_level: string
  completeness_score: number
  consistency_score: number
  professional_quality_score: number
  standards_compliance_score: number
  accuracy_score: number
  context_relevance_score: number
  findings: Record<string, string>
  issues: QualityIssue[]
  recommendations: string[]
  ai_provider: string
  ai_model: string
  analysis_tokens: number
  analysis_cost: number
  analysis_time: number
  audited_at: string
  compliance_metrics?: ComplianceMetrics
}

export function QualityAuditModal({ documentId, onClose }: QualityAuditModalProps) {
  const [audit, setAudit] = useState<QualityAudit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAuditData()
  }, [documentId])

  const loadAuditData = async () => {
    try {
      setLoading(true)
      setError(null)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token')
      
      if (!authToken) {
        throw new Error('No authentication token found. Please log in again.')
      }

      const response = await fetch(`${API_BASE_URL}/quality-audits/document/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load quality audit')
      }

      setAudit(data.audit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data')
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500 text-white'
      case 'B': return 'bg-green-400 text-white'
      case 'C': return 'bg-yellow-500 text-white'
      case 'D': return 'bg-orange-500 text-white'
      case 'F': return 'bg-red-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-green-500'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      case 'major': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'minor': return <Minus className="h-4 w-4 text-yellow-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      major: 'bg-orange-100 text-orange-800 border-orange-300',
      minor: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    return variants[severity] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Quality Audit Report
          </DialogTitle>
          <DialogDescription>
            Automated AI-powered quality assessment
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-600">Loading audit results...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {audit && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
              <div className={`text-7xl font-bold ${getScoreColor(audit.overall_score)} mb-2`}>
                {audit.overall_score}%
              </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Badge className={`${getGradeColor(audit.overall_grade)} text-2xl px-4 py-2`}>
                  Grade {audit.overall_grade}
                </Badge>
              </div>
              <div className="text-xl font-semibold text-gray-700">{audit.quality_level}</div>
              <div className="text-sm text-gray-500 mt-2">{audit.document_title}</div>
            </div>

            <Tabs defaultValue="scores" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="scores">Scores</TabsTrigger>
                <TabsTrigger value="compliance">
                  Compliance {audit.compliance_metrics && '✓'}
                </TabsTrigger>
                <TabsTrigger value="issues">
                  Issues {audit.issues.length > 0 && `(${audit.issues.length})`}
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  Tips {audit.recommendations.length > 0 && `(${audit.recommendations.length})`}
                </TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              {/* Dimensional Scores Tab */}
              <TabsContent value="scores" className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">Quality Dimensions</h3>
                
                <QualityMetricCard
                  name="Completeness"
                  description="All sections present, no placeholders"
                  score={audit.completeness_score}
                  weight="20%"
                  finding={audit.findings.completeness}
                />
                
                <QualityMetricCard
                  name="Consistency"
                  description="Names, dates, terminology consistent throughout"
                  score={audit.consistency_score}
                  weight="15%"
                  finding={audit.findings.consistency}
                />
                
                <QualityMetricCard
                  name="Professional Quality"
                  description="Writing quality, tone, formatting"
                  score={audit.professional_quality_score}
                  weight="20%"
                  finding={audit.findings.professionalQuality}
                />
                
                <QualityMetricCard
                  name="Standards Compliance"
                  description="PMBOK/BABOK principles properly applied"
                  score={audit.standards_compliance_score}
                  weight="20%"
                  finding={audit.findings.standardsCompliance}
                />
                
                <QualityMetricCard
                  name="Accuracy"
                  description="Data correctly extracted, no hallucinations"
                  score={audit.accuracy_score}
                  weight="15%"
                  finding={audit.findings.accuracy}
                />
                
                <QualityMetricCard
                  name="Context Relevance"
                  description="Content aligns with project objectives"
                  score={audit.context_relevance_score}
                  weight="10%"
                  finding={audit.findings.contextRelevance}
                />
              </TabsContent>

              {/* Compliance Metrics Tab */}
              <TabsContent value="compliance" className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">Compliance Metrics</h3>
                
                {audit.compliance_metrics ? (
                  <>
                    {/* Overall Compliance Rating */}
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 mb-6">
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${getScoreColor(audit.compliance_metrics.overallComplianceRating)} mb-2`}>
                          {audit.compliance_metrics.overallComplianceRating}%
                        </div>
                        <div className="text-xl font-semibold text-gray-700">Overall Compliance Rating</div>
                        <p className="text-sm text-gray-600 mt-2">
                          Weighted average of all compliance standards
                        </p>
                      </div>
                    </div>

                    {/* Individual Compliance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ComplianceMetricCard
                        name="PMBOK Guide"
                        description="PMBOK Guide compliance"
                        score={audit.compliance_metrics.pmbokGuide}
                        icon="📘"
                      />
                      
                      <ComplianceMetricCard
                        name="GDPR"
                        description="General Data Protection Regulation"
                        score={audit.compliance_metrics.gdpr}
                        icon="🔒"
                      />
                      
                      <ComplianceMetricCard
                        name="HIPAA"
                        description="Health Insurance Portability and Accountability Act"
                        score={audit.compliance_metrics.hipaa}
                        icon="🏥"
                      />
                      
                      <ComplianceMetricCard
                        name="SOC 2"
                        description="Service Organization Control 2"
                        score={audit.compliance_metrics.soc2}
                        icon="🛡️"
                      />
                      
                      <ComplianceMetricCard
                        name="Industry Standards"
                        description="ISO, ANSI, IEEE, NIST, CMMI, ITIL, COBIT"
                        score={audit.compliance_metrics.industryStandards}
                        icon="⭐"
                      />
                      
                      <ComplianceMetricCard
                        name="Best Practices"
                        description="Industry best practices adherence"
                        score={audit.compliance_metrics.bestPractices}
                        icon="✨"
                      />
                      
                      <ComplianceMetricCard
                        name="Template Adherence"
                        description="Template structure compliance"
                        score={audit.compliance_metrics.templateAdherence}
                        icon="📋"
                      />
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Compliance metrics are not available for this document. 
                      They are automatically calculated for newly generated documents.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Issues Tab */}
              <TabsContent value="issues" className="space-y-3">
                {audit.issues.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No issues identified. Document meets all quality standards!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <h3 className="font-semibold text-lg mb-4">
                      Issues Identified ({audit.issues.length})
                    </h3>
                    {audit.issues.map((issue, index) => (
                      <IssueCard key={index} issue={issue} />
                    ))}
                  </>
                )}
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-3">
                <h3 className="font-semibold text-lg mb-4">
                  Improvement Recommendations
                </h3>
                {audit.recommendations.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No recommendations. Document is production-ready!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ul className="space-y-2">
                    {audit.recommendations.map((rec, index) => (
                      <li key={index} className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              {/* Metadata Tab */}
              <TabsContent value="metadata" className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">Analysis Metadata</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <MetadataCard
                    icon={<Sparkles className="h-5 w-5 text-purple-600" />}
                    label="AI Provider"
                    value={`${audit.ai_provider} (${audit.ai_model})`}
                  />
                  
                  <MetadataCard
                    icon={<Zap className="h-5 w-5 text-yellow-600" />}
                    label="Tokens Used"
                    value={audit.analysis_tokens?.toLocaleString() || 'N/A'}
                  />
                  
                  <MetadataCard
                    icon={<DollarSign className="h-5 w-5 text-green-600" />}
                    label="Analysis Cost"
                    value={audit.analysis_cost ? `$${parseFloat(audit.analysis_cost).toFixed(4)}` : 'N/A'}
                  />
                  
                  <MetadataCard
                    icon={<Clock className="h-5 w-5 text-blue-600" />}
                    label="Analysis Time"
                    value={audit.analysis_time ? `${(audit.analysis_time / 1000).toFixed(1)}s` : 'N/A'}
                  />
                </div>

                <div className="text-xs text-gray-500 border-t pt-4">
                  <div className="flex justify-between">
                    <span>Audited at:</span>
                    <span className="font-medium">{new Date(audit.audited_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Audit ID:</span>
                    <span className="font-mono text-xs">{audit.id.substring(0, 8)}...</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quality Metric Card Component
 */
function QualityMetricCard({
  name,
  description,
  score,
  weight,
  finding
}: {
  name: string
  description: string
  score: number
  weight: string
  finding?: string
}) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-green-500'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 80) return 'bg-green-400'
    if (score >= 70) return 'bg-yellow-500'
    if (score >= 60) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-base">{name}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
          <div className="text-xs text-gray-500">Weight: {weight}</div>
        </div>
      </div>
      
      <Progress value={score} className="h-2" />
      
      {finding && (
        <p className="text-sm text-gray-600 mt-3 italic">{finding}</p>
      )}
    </div>
  )
}

/**
 * Issue Card Component
 */
function IssueCard({ issue }: { issue: QualityIssue }) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />
      case 'major': return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case 'minor': return <Minus className="h-5 w-5 text-yellow-600" />
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      major: 'bg-orange-100 text-orange-800 border-orange-300',
      minor: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    return variants[severity] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <div className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {getSeverityIcon(issue.severity)}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${getSeverityBadge(issue.severity)} text-xs border`}>
              {issue.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {issue.dimension}
            </Badge>
          </div>
          
          <p className="text-sm font-medium text-gray-900 mb-1">
            {issue.description}
          </p>
          
          {issue.location && (
            <p className="text-xs text-gray-500 mb-2">
              📍 Location: {issue.location}
            </p>
          )}
          
          {issue.recommendation && (
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">💡 Recommendation:</p>
              <p className="text-xs text-blue-800">{issue.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Compliance Metric Card Component
 */
function ComplianceMetricCard({
  name,
  description,
  score,
  icon
}: {
  name: string
  description: string
  score: number
  icon: string
}) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-green-500'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 80) return 'bg-green-400'
    if (score >= 70) return 'bg-yellow-500'
    if (score >= 60) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-base">{name}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className={`text-xl font-bold ${getScoreColor(score)}`}>
          {score}%
        </div>
      </div>
      
      <Progress value={score} className="h-2" />
    </div>
  )
}

/**
 * Metadata Card Component
 */
function MetadataCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      {icon}
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  )
}

