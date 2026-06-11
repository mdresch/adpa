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
import { Separator } from '@/components/ui/separator'
import {
  formatQualityScore,
  isQualityAuditPerformed,
  QUALITY_AUDIT_NOT_GRADE,
  QUALITY_AUDIT_NOT_LEVEL,
} from '@/lib/quality-audit'
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
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle
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
  euAIAct?: {
    overallScore: number
    passed: boolean
    criteria: {
      transparency: { score: number; threshold: number; passed: boolean; weight: number }
      humanOversight: { score: number; threshold: number; passed: boolean; weight: number }
      accuracy: { score: number; threshold: number; passed: boolean; weight: number }
      dataGovernance: { score: number; threshold: number; passed: boolean; weight: number }
      recordKeeping: { score: number; threshold: number; passed: boolean; weight: number }
    }
  }
}

interface QualityAudit {
  id: string
  document_id: string
  document_title: string
  document_type: string
  framework_used?: string
  document_content?: string
  audit_performed?: boolean
  overall_score: number | null
  overall_grade: string | null
  quality_level: string | null
  completeness_score: number | null
  consistency_score: number | null
  professional_quality_score: number | null
  standards_compliance_score: number | null
  accuracy_score: number | null
  context_relevance_score: number | null
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
  const [documentContent, setDocumentContent] = useState<string | null>(null)

  useEffect(() => {
    loadAuditData()
  }, [documentId])

  const loadAuditData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { getApiBaseUrl } = await import('@/lib/api-url')
      const API_BASE_URL = getApiBaseUrl()
      const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token')
      
      if (!authToken) {
        throw new Error('No authentication token found. Please log in again.')
      }

      // Fetch quality audit with document content for breakdown analysis
      const auditResponse = await fetch(`${API_BASE_URL}/quality-audits/document/${documentId}?includeContent=true`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      const auditData = await auditResponse.json()

      if (!auditResponse.ok) {
        throw new Error(auditData.error || 'Failed to load quality audit')
      }

      // Extract document content from audit response if available
      if (auditData.audit?.document_content) {
        setDocumentContent(auditData.audit.document_content)
      } else {
        // Fallback: try to fetch document content separately
        try {
          const docResponse = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (docResponse.ok) {
            const docData = await docResponse.json()
            setDocumentContent(docData.document?.content || docData.content || null)
          }
        } catch (docError) {
          // Non-critical - breakdown will work without content, just with less detail
          console.warn('Could not fetch document content for breakdown:', docError)
        }
      }

      setAudit(auditData.audit)
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
            {!isQualityAuditPerformed(audit) && (
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  The AI quality audit did not complete. No scores were recorded — manual review is recommended.
                </AlertDescription>
              </Alert>
            )}

            {/* Overall Score */}
            <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
              <div className={`text-7xl font-bold ${isQualityAuditPerformed(audit) ? getScoreColor(audit.overall_score!) : 'text-gray-500'} mb-2`}>
                {formatQualityScore(audit.overall_score)}
              </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Badge className={`${isQualityAuditPerformed(audit) ? getGradeColor(audit.overall_grade!) : 'bg-gray-500 text-white'} text-2xl px-4 py-2`}>
                  {isQualityAuditPerformed(audit) ? `Grade ${audit.overall_grade}` : `Grade ${QUALITY_AUDIT_NOT_GRADE}`}
                </Badge>
              </div>
              <div className="text-xl font-semibold text-gray-700">
                {isQualityAuditPerformed(audit) ? audit.quality_level : QUALITY_AUDIT_NOT_LEVEL}
              </div>
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
                
                {/* Overall Score Breakdown */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-6">
                  <div className="text-center mb-4">
                    <div className={`text-4xl font-bold ${isQualityAuditPerformed(audit) ? getScoreColor(audit.overall_score!) : 'text-gray-500'} mb-2`}>
                      {formatQualityScore(audit.overall_score)}
                    </div>
                    <div className="text-lg font-semibold text-gray-700">Overall Quality Score</div>
                    <p className="text-sm text-gray-600 mt-2">
                      Weighted average of all quality dimensions
                    </p>
                  </div>
                  
                  {isQualityAuditPerformed(audit) ? (
                    <OverallQualityBreakdown audit={audit} />
                  ) : (
                    <p className="text-sm text-gray-600 text-center">
                      Score breakdown is unavailable because the AI audit did not complete.
                    </p>
                  )}
                </div>
                
                <QualityMetricCard
                  name="Completeness"
                  description="All sections present, no placeholders"
                  score={audit.completeness_score}
                  weight="20%"
                  finding={audit.findings.completeness}
                  documentContent={documentContent || audit.document_content || ''}
                  dimensionType="completeness"
                />
                
                <QualityMetricCard
                  name="Consistency"
                  description="Names, dates, terminology consistent throughout"
                  score={audit.consistency_score}
                  weight="15%"
                  finding={audit.findings.consistency}
                  documentContent={documentContent || audit.document_content || ''}
                  dimensionType="consistency"
                />
                
                <QualityMetricCard
                  name="Professional Quality"
                  description="Writing quality, tone, formatting"
                  score={audit.professional_quality_score}
                  weight="20%"
                  finding={audit.findings.professionalQuality}
                  documentContent={documentContent || audit.document_content || ''}
                  dimensionType="professionalQuality"
                />
                
                <QualityMetricCard
                  name="Standards Compliance"
                  description="PMBOK/BABOK principles properly applied"
                  score={audit.standards_compliance_score}
                  weight="20%"
                  finding={audit.findings.standardsCompliance}
                  documentContent={documentContent || audit.document_content || ''}
                  dimensionType="standardsCompliance"
                />
                
                <QualityMetricCard
                  name="Accuracy"
                  description="Data correctly extracted, no hallucinations"
                  score={audit.accuracy_score}
                  weight="15%"
                  finding={audit.findings.accuracy}
                  documentContent={documentContent || audit.document_content || ''}
                  dimensionType="accuracy"
                />
                
                <QualityMetricCard
                  name="Context Relevance"
                  description="Content aligns with project objectives"
                  score={audit.context_relevance_score}
                  weight="10%"
                  finding={audit.findings.contextRelevance}
                  documentContent={documentContent || audit.document_content || ''}
                  dimensionType="contextRelevance"
                />
              </TabsContent>

              {/* Compliance Metrics Tab */}
              <TabsContent value="compliance" className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">Compliance Metrics</h3>
                
                {audit.compliance_metrics ? (
                  <>
                    {/* Overall Compliance Rating */}
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 mb-6">
                      <div className="text-center mb-4">
                        <div className={`text-5xl font-bold ${getScoreColor(audit.compliance_metrics.overallComplianceRating)} mb-2`}>
                          {audit.compliance_metrics.overallComplianceRating}%
                        </div>
                        <div className="text-xl font-semibold text-gray-700">Overall Compliance Rating</div>
                        <p className="text-sm text-gray-600 mt-2">
                          Weighted average of all compliance standards
                        </p>
                      </div>
                      
                      {/* Overall Compliance Breakdown */}
                      <OverallComplianceBreakdown 
                        complianceMetrics={audit.compliance_metrics}
                        framework={audit.framework_used}
                      />
                    </div>

                    {/* Individual Compliance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ComplianceMetricCard
                        name="PMBOK Guide"
                        description="PMBOK Guide compliance"
                        score={audit.compliance_metrics.pmbokGuide}
                        icon="📘"
                        documentType={audit.document_type}
                        framework={audit.framework_used}
                        documentContent={documentContent || audit.document_content || ''}
                        weight={audit.framework_used?.toLowerCase().includes('pmbok') ? 0.25 : 0.15}
                      />
                      
                      <ComplianceMetricCard
                        name="GDPR"
                        description="General Data Protection Regulation"
                        score={audit.compliance_metrics.gdpr}
                        icon="🔒"
                        documentType={audit.document_type}
                        framework={audit.framework_used}
                        documentContent={documentContent || audit.document_content || ''}
                        weight={0.15}
                      />
                      
                      <ComplianceMetricCard
                        name="HIPAA"
                        description="Health Insurance Portability and Accountability Act"
                        score={audit.compliance_metrics.hipaa}
                        icon="🏥"
                        documentType={audit.document_type}
                        framework={audit.framework_used}
                        documentContent={documentContent || audit.document_content || ''}
                        weight={0.15}
                        applicable={audit.document_type?.toLowerCase().includes('health') || audit.document_type?.toLowerCase().includes('medical') || false}
                      />
                      
                      <ComplianceMetricCard
                        name="SOC 2"
                        description="Service Organization Control 2"
                        score={audit.compliance_metrics.soc2}
                        icon="🛡️"
                        documentType={audit.document_type}
                        framework={audit.framework_used}
                        documentContent={documentContent || audit.document_content || ''}
                        weight={0.15}
                      />
                      
                      <ComplianceMetricCard
                        name="Industry Standards"
                        description="ISO, ANSI, IEEE, NIST, CMMI, ITIL, COBIT"
                        score={audit.compliance_metrics.industryStandards}
                        icon="⭐"
                        documentType={audit.document_type}
                        framework={audit.framework_used}
                        documentContent={documentContent || audit.document_content || ''}
                        weight={0.15}
                      />
                      
                      <ComplianceMetricCard
                        name="Best Practices"
                        description="Industry best practices adherence"
                        score={audit.compliance_metrics.bestPractices}
                        icon="✨"
                        documentType={audit.document_type}
                        framework={audit.framework_used}
                        documentContent={documentContent || audit.document_content || ''}
                        weight={0.15}
                      />
                      
                      <ComplianceMetricCard
                        name="Template Adherence"
                        description="Template structure compliance"
                        score={audit.compliance_metrics.templateAdherence}
                        icon="📋"
                        documentType={audit.document_type}
                        framework={audit.framework_used}
                        documentContent={documentContent || audit.document_content || ''}
                        weight={0.10}
                      />
                    </div>

                    {/* EU AI Act Compliance Section */}
                    {audit.compliance_metrics.euAIAct && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Badge className="bg-blue-600 text-white">EU AI Act</Badge>
                            <h4 className="font-semibold text-lg">EU AI Act Compliance</h4>
                            {audit.compliance_metrics.euAIAct.passed ? (
                              <Badge className="bg-green-500 text-white">✓ Passed</Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">✗ Failed</Badge>
                            )}
                          </div>

                          {/* Overall EU AI Act Score */}
                          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="text-center">
                              <div className={`text-4xl font-bold ${getScoreColor(audit.compliance_metrics.euAIAct.overallScore)} mb-2`}>
                                {audit.compliance_metrics.euAIAct.overallScore}%
                              </div>
                              <div className="text-lg font-semibold text-gray-700">Overall Compliance Score</div>
                              <p className="text-sm text-gray-600 mt-2">
                                Threshold: 75% | Status: {audit.compliance_metrics.euAIAct.passed ? '✅ Compliant' : '❌ Non-Compliant'}
                              </p>
                            </div>
                          </div>

                          {/* EU AI Act Criteria Breakdown */}
                          <div className="space-y-3">
                            <h5 className="font-semibold text-base mb-3">Compliance Criteria</h5>
                            
                            <EUAIActCriterionCard
                              name="AI-Generated Content Transparency"
                              description="AI-generated content must be clearly labeled"
                              score={audit.compliance_metrics.euAIAct.criteria.transparency.score}
                              threshold={audit.compliance_metrics.euAIAct.criteria.transparency.threshold}
                              passed={audit.compliance_metrics.euAIAct.criteria.transparency.passed}
                              weight={audit.compliance_metrics.euAIAct.criteria.transparency.weight}
                              critical={true}
                            />
                            
                            <EUAIActCriterionCard
                              name="Human Oversight"
                              description="AI outputs must be reviewable by humans"
                              score={audit.compliance_metrics.euAIAct.criteria.humanOversight.score}
                              threshold={audit.compliance_metrics.euAIAct.criteria.humanOversight.threshold}
                              passed={audit.compliance_metrics.euAIAct.criteria.humanOversight.passed}
                              weight={audit.compliance_metrics.euAIAct.criteria.humanOversight.weight}
                              critical={true}
                            />
                            
                            <EUAIActCriterionCard
                              name="AI Accuracy and Robustness"
                              description="AI systems must be reliable and accurate"
                              score={audit.compliance_metrics.euAIAct.criteria.accuracy.score}
                              threshold={audit.compliance_metrics.euAIAct.criteria.accuracy.threshold}
                              passed={audit.compliance_metrics.euAIAct.criteria.accuracy.passed}
                              weight={audit.compliance_metrics.euAIAct.criteria.accuracy.weight}
                              critical={true}
                            />
                            
                            <EUAIActCriterionCard
                              name="Data Governance"
                              description="Document data sources and processing"
                              score={audit.compliance_metrics.euAIAct.criteria.dataGovernance.score}
                              threshold={audit.compliance_metrics.euAIAct.criteria.dataGovernance.threshold}
                              passed={audit.compliance_metrics.euAIAct.criteria.dataGovernance.passed}
                              weight={audit.compliance_metrics.euAIAct.criteria.dataGovernance.weight}
                              critical={false}
                            />
                            
                            <EUAIActCriterionCard
                              name="Record Keeping"
                              description="Maintain records of AI system usage"
                              score={audit.compliance_metrics.euAIAct.criteria.recordKeeping.score}
                              threshold={audit.compliance_metrics.euAIAct.criteria.recordKeeping.threshold}
                              passed={audit.compliance_metrics.euAIAct.criteria.recordKeeping.passed}
                              weight={audit.compliance_metrics.euAIAct.criteria.recordKeeping.weight}
                              critical={false}
                            />
                          </div>
                        </div>
                      </>
                    )}
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
 * Quality Metric Card Component with Drill-Down Details
 */
function QualityMetricCard({
  name,
  description,
  score,
  weight,
  finding,
  documentContent,
  dimensionType
}: {
  name: string
  description: string
  score: number | null
  weight: string
  finding?: string
  documentContent?: string
  dimensionType: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [breakdown, setBreakdown] = useState<QualityDimensionBreakdown | null>(null)
  const hasScore = score !== null && score !== undefined

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

  const handleExpand = () => {
    if (!isExpanded && documentContent && hasScore) {
      // Calculate breakdown on demand
      const calculatedBreakdown = calculateQualityDimensionBreakdown(
        dimensionType,
        documentContent,
        score as number,
        weight
      )
      setBreakdown(calculatedBreakdown)
    }
    setIsExpanded(!isExpanded)
  }

  const weightValue = parseFloat(weight.replace('%', '')) / 100

  return (
    <div className="border rounded-lg hover:shadow-md transition-all">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleExpand}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-base">{name}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleExpand()
                }}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className="text-right ml-4">
            <div className={`text-2xl font-bold ${hasScore ? getScoreColor(score as number) : 'text-gray-500'}`}>
              {formatQualityScore(score)}
            </div>
            <div className="text-xs text-gray-500">Weight: {weight}</div>
            {hasScore ? (
              <div className="text-xs text-gray-400">
                Contribution: {((score as number) * weightValue).toFixed(1)}%
              </div>
            ) : null}
          </div>
        </div>
        
        <Progress value={hasScore ? (score as number) : 0} className="h-2" />
        
        {finding && (
          <p className="text-sm text-gray-600 mt-3 italic">{finding}</p>
        )}
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && breakdown && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          {!documentContent && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Document content not available. Breakdown shows scoring factors but detailed analysis is limited.
              </AlertDescription>
            </Alert>
          )}
          <QualityDimensionBreakdownDetails breakdown={breakdown} />
        </div>
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
 * Compliance Metric Card Component with Drill-Down Details
 */
function ComplianceMetricCard({
  name,
  description,
  score,
  icon,
  documentType,
  framework,
  documentContent,
  weight,
  applicable = true
}: {
  name: string
  description: string
  score: number
  icon: string
  documentType?: string
  framework?: string
  documentContent?: string
  weight: number
  applicable?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [breakdown, setBreakdown] = useState<ComplianceBreakdown | null>(null)

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

  const handleExpand = () => {
    if (!isExpanded) {
      // Calculate breakdown on demand (works even without content, just with less detail)
      const calculatedBreakdown = calculateComplianceBreakdown(
        name,
        documentContent || '',
        framework,
        documentType,
        weight,
        applicable
      )
      setBreakdown(calculatedBreakdown)
    }
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="border rounded-lg hover:shadow-md transition-all">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleExpand}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-base">{name}</h4>
              {!applicable && (
                <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                  Not Applicable
                </Badge>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleExpand()
                }}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className={`text-xl font-bold ${getScoreColor(score)}`}>
            {applicable ? `${score}%` : 'N/A'}
          </div>
        </div>
        
        {applicable && <Progress value={score} className="h-2" />}
        {!applicable && (
          <div className="text-xs text-gray-500 italic mt-2">
            This compliance standard is not applicable to this document type.
          </div>
        )}
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && breakdown && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          {!documentContent && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Document content not available. Breakdown shows scoring factors but keyword analysis is limited.
              </AlertDescription>
            </Alert>
          )}
          <ComplianceBreakdownDetails breakdown={breakdown} />
        </div>
      )}
    </div>
  )
}

/**
 * Compliance Breakdown Details Component
 */
interface ComplianceBreakdown {
  name: string
  score: number
  applicable: boolean
  weight: number
  contribution: number
  factors: Array<{
    name: string
    checked: boolean
    points: number
    maxPoints: number
    description: string
    keywords?: string[]
    foundKeywords?: string[]
    missingKeywords?: string[]
  }>
  calculation: string
  recommendations: string[]
}

function ComplianceBreakdownDetails({ breakdown }: { breakdown: ComplianceBreakdown }) {
  const totalPoints = breakdown.factors.reduce((sum, f) => sum + f.points, 0)
  const maxPoints = breakdown.factors.reduce((sum, f) => sum + f.maxPoints, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div>
          <h5 className="font-semibold text-base mb-1">Score Breakdown</h5>
          <p className="text-xs text-gray-600">
            {breakdown.applicable 
              ? `This metric contributes ${(breakdown.weight * 100).toFixed(0)}% to the overall compliance rating.`
              : 'This metric is not applicable and does not contribute to the overall compliance rating.'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{breakdown.score}%</div>
          <div className="text-xs text-gray-500">
            {totalPoints} / {maxPoints} points
          </div>
        </div>
      </div>

      {/* Applicability Status */}
      {!breakdown.applicable && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Not Applicable:</strong> {breakdown.name} is not relevant for this document type ({breakdown.name === 'HIPAA' ? 'healthcare documents only' : 'document type specific'}). 
            This metric is excluded from the overall compliance calculation.
          </AlertDescription>
        </Alert>
      )}

      {/* Scoring Factors */}
      <div className="space-y-3">
        <h6 className="font-semibold text-sm text-gray-700">Scoring Factors</h6>
        {breakdown.factors.map((factor, index) => (
          <div key={index} className="p-3 bg-white rounded border border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {factor.checked ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium text-sm">{factor.name}</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{factor.description}</p>
              </div>
              <div className="text-right ml-4">
                <div className={`text-sm font-bold ${factor.checked ? 'text-green-600' : 'text-red-600'}`}>
                  {factor.points} / {factor.maxPoints} pts
                </div>
              </div>
            </div>

            {/* Keywords Found/Missing */}
            {factor.keywords && factor.keywords.length > 0 && (
              <div className="mt-2 space-y-2">
                {factor.foundKeywords && factor.foundKeywords.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-700 mb-1">✓ Keywords Found:</div>
                    <div className="flex flex-wrap gap-1">
                      {factor.foundKeywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {factor.missingKeywords && factor.missingKeywords.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-red-700 mb-1">✗ Keywords Missing:</div>
                    <div className="flex flex-wrap gap-1">
                      {factor.missingKeywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Calculation Formula */}
      <div className="p-3 bg-blue-50 rounded border border-blue-200">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-blue-900 mb-1">Calculation Formula</div>
            <div className="text-xs text-blue-800 font-mono bg-white p-2 rounded border border-blue-200">
              {breakdown.calculation}
            </div>
          </div>
        </div>
      </div>

      {/* Contribution to Overall */}
      {breakdown.applicable && (
        <div className="p-3 bg-purple-50 rounded border border-purple-200">
          <div className="text-xs font-semibold text-purple-900 mb-1">Contribution to Overall Compliance</div>
          <div className="text-sm text-purple-800">
            <strong>{breakdown.name}:</strong> {breakdown.score}% × {(breakdown.weight * 100).toFixed(0)}% weight = <strong>{breakdown.contribution.toFixed(1)}%</strong>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {breakdown.recommendations.length > 0 && (
        <div className="space-y-2">
          <h6 className="font-semibold text-sm text-gray-700">Improvement Recommendations</h6>
          <ul className="space-y-1">
            {breakdown.recommendations.map((rec, index) => (
              <li key={index} className="flex gap-2 text-xs text-gray-700">
                <TrendingUp className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Overall Compliance Rating Breakdown Component
 */
function OverallComplianceBreakdown({ 
  complianceMetrics, 
  framework 
}: { 
  complianceMetrics: ComplianceMetrics
  framework?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Calculate weights (PMBOK gets higher weight if framework is PMBOK-related)
  const pmbokWeight = framework?.toLowerCase().includes('pmbok') ? 0.25 : 0.15
  const gdprWeight = 0.15
  const hipaaWeight = 0.15
  const soc2Weight = 0.15
  const industryWeight = 0.15
  const bestPracticesWeight = 0.15
  const templateWeight = 0.10

  // Determine if HIPAA is applicable (typically only for healthcare documents)
  const hipaaApplicable = false // Will be determined by document type in actual implementation

  const contributions = [
    {
      name: 'PMBOK Guide',
      score: complianceMetrics.pmbokGuide,
      weight: pmbokWeight,
      contribution: complianceMetrics.pmbokGuide * pmbokWeight,
      applicable: true
    },
    {
      name: 'GDPR',
      score: complianceMetrics.gdpr,
      weight: gdprWeight,
      contribution: complianceMetrics.gdpr * gdprWeight,
      applicable: true
    },
    {
      name: 'HIPAA',
      score: complianceMetrics.hipaa,
      weight: hipaaWeight,
      contribution: hipaaApplicable ? complianceMetrics.hipaa * hipaaWeight : 0,
      applicable: hipaaApplicable
    },
    {
      name: 'SOC 2',
      score: complianceMetrics.soc2,
      weight: soc2Weight,
      contribution: complianceMetrics.soc2 * soc2Weight,
      applicable: true
    },
    {
      name: 'Industry Standards',
      score: complianceMetrics.industryStandards,
      weight: industryWeight,
      contribution: complianceMetrics.industryStandards * industryWeight,
      applicable: true
    },
    {
      name: 'Best Practices',
      score: complianceMetrics.bestPractices,
      weight: bestPracticesWeight,
      contribution: complianceMetrics.bestPractices * bestPracticesWeight,
      applicable: true
    },
    {
      name: 'Template Adherence',
      score: complianceMetrics.templateAdherence,
      weight: templateWeight,
      contribution: complianceMetrics.templateAdherence * templateWeight,
      applicable: true
    }
  ]

  const totalContribution = contributions.reduce((sum, c) => sum + c.contribution, 0)
  const calculation = contributions
    .filter(c => c.applicable)
    .map(c => `${c.name}: ${c.score}% × ${(c.weight * 100).toFixed(0)}% = ${c.contribution.toFixed(1)}%`)
    .join(' + ')

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 text-sm text-purple-700 hover:bg-purple-100 rounded transition-colors"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>How is this calculated?</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 p-4 bg-white rounded border border-purple-200 space-y-3">
          <div className="text-xs font-semibold text-purple-900 mb-2">Calculation Breakdown</div>
          
          <div className="space-y-2">
            {contributions.map((contrib, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{contrib.name}:</span>
                  {!contrib.applicable && (
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                      Not Applicable
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  {contrib.applicable ? (
                    <>
                      <span className="text-gray-600">
                        {contrib.score}% × {(contrib.weight * 100).toFixed(0)}% = 
                      </span>
                      <span className="font-semibold text-purple-700 ml-1">
                        {contrib.contribution.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Excluded</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-purple-900">Total:</span>
            <span className="text-purple-700">{totalContribution.toFixed(1)}%</span>
          </div>

          <div className="p-3 bg-purple-50 rounded border border-purple-200">
            <div className="text-xs font-semibold text-purple-900 mb-1">Formula:</div>
            <div className="text-xs text-purple-800 font-mono">
              {calculation}
            </div>
            <div className="text-xs text-purple-700 mt-2">
              = {totalContribution.toFixed(1)}% (rounded to {Math.round(totalContribution)}%)
            </div>
          </div>

          {framework?.toLowerCase().includes('pmbok') && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                <strong>Note:</strong> PMBOK Guide has a higher weight (25%) because this document uses a PMBOK framework.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Overall Quality Score Breakdown Component
 */
interface QualityDimensionBreakdown {
  name: string
  score: number
  weight: number
  contribution: number
  factors: Array<{
    name: string
    checked: boolean
    points: number
    maxPoints: number
    description: string
    details?: string
  }>
  calculation: string
  recommendations: string[]
}

function OverallQualityBreakdown({ audit }: { audit: QualityAudit }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const weights = {
    completeness: 0.20,
    consistency: 0.15,
    professionalQuality: 0.20,
    standardsCompliance: 0.20,
    accuracy: 0.15,
    contextRelevance: 0.10
  }

  const contributions = [
    {
      name: 'Completeness',
      score: audit.completeness_score,
      weight: weights.completeness,
      contribution: audit.completeness_score * weights.completeness
    },
    {
      name: 'Consistency',
      score: audit.consistency_score,
      weight: weights.consistency,
      contribution: audit.consistency_score * weights.consistency
    },
    {
      name: 'Professional Quality',
      score: audit.professional_quality_score,
      weight: weights.professionalQuality,
      contribution: audit.professional_quality_score * weights.professionalQuality
    },
    {
      name: 'Standards Compliance',
      score: audit.standards_compliance_score,
      weight: weights.standardsCompliance,
      contribution: audit.standards_compliance_score * weights.standardsCompliance
    },
    {
      name: 'Accuracy',
      score: audit.accuracy_score,
      weight: weights.accuracy,
      contribution: audit.accuracy_score * weights.accuracy
    },
    {
      name: 'Context Relevance',
      score: audit.context_relevance_score,
      weight: weights.contextRelevance,
      contribution: audit.context_relevance_score * weights.contextRelevance
    }
  ]

  const totalContribution = contributions.reduce((sum, c) => sum + c.contribution, 0)
  const calculation = contributions
    .map(c => `${c.name}: ${c.score}% × ${(c.weight * 100).toFixed(0)}% = ${c.contribution.toFixed(1)}%`)
    .join(' + ')

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 text-sm text-blue-700 hover:bg-blue-100 rounded transition-colors"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>How is this calculated?</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 p-4 bg-white rounded border border-blue-200 space-y-3">
          <div className="text-xs font-semibold text-blue-900 mb-2">Calculation Breakdown</div>
          
          <div className="space-y-2">
            {contributions.map((contrib, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">{contrib.name}:</span>
                <div className="text-right">
                  <span className="text-gray-600">
                    {contrib.score}% × {(contrib.weight * 100).toFixed(0)}% = 
                  </span>
                  <span className="font-semibold text-blue-700 ml-1">
                    {contrib.contribution.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-blue-900">Total:</span>
            <span className="text-blue-700">{totalContribution.toFixed(1)}% (rounded to {Math.round(totalContribution)}%)</span>
          </div>

          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-xs font-semibold text-blue-900 mb-1">Formula:</div>
            <div className="text-xs text-blue-800 font-mono">
              {calculation}
            </div>
            <div className="text-xs text-blue-700 mt-2">
              = {totalContribution.toFixed(1)}% (rounded to {Math.round(totalContribution)}%)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Quality Dimension Breakdown Details Component
 */
function QualityDimensionBreakdownDetails({ breakdown }: { breakdown: QualityDimensionBreakdown }) {
  const totalPoints = breakdown.factors.reduce((sum, f) => sum + f.points, 0)
  const maxPoints = breakdown.factors.reduce((sum, f) => sum + f.maxPoints, 0)
  const structuralScore = Math.round((totalPoints / maxPoints) * 100)
  const hasScoreDifference = structuralScore !== breakdown.score

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div>
          <h5 className="font-semibold text-base mb-1">Score Breakdown</h5>
          <p className="text-xs text-gray-600">
            This dimension contributes {((breakdown.weight) * 100).toFixed(0)}% to the overall quality score.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{breakdown.score}%</div>
          <div className="text-xs text-gray-500">
            {totalPoints} / {maxPoints} points
            {hasScoreDifference && (
              <div className="text-orange-600 mt-1">
                (Structural: {structuralScore}%)
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Score Difference Notice */}
      {hasScoreDifference && (
        <div className="p-3 bg-amber-50 rounded border border-amber-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-amber-900 mb-1">Score Explanation</div>
              <div className="text-xs text-amber-800">
                The actual score ({breakdown.score}%) includes AI-assessed qualitative factors beyond structural elements, 
                such as passive voice usage, grammatical errors, writing tone, and style consistency. 
                The structural breakdown below shows {structuralScore}% based on document structure alone.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Factors */}
      <div className="space-y-3">
        <h6 className="font-semibold text-sm text-gray-700">Scoring Factors</h6>
        {breakdown.factors.map((factor, index) => (
          <div key={index} className="p-3 bg-white rounded border border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {factor.checked ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium text-sm">{factor.name}</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{factor.description}</p>
                {factor.details && (
                  <p className="text-xs text-gray-500 italic">{factor.details}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <div className={`text-sm font-bold ${factor.checked ? 'text-green-600' : 'text-red-600'}`}>
                  {factor.points} / {factor.maxPoints} pts
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calculation Formula */}
      <div className="p-3 bg-blue-50 rounded border border-blue-200">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-blue-900 mb-1">Calculation Formula</div>
            <div className="text-xs text-blue-800 font-mono bg-white p-2 rounded border border-blue-200 whitespace-pre-line">
              {breakdown.calculation}
            </div>
          </div>
        </div>
      </div>

      {/* Contribution to Overall */}
      <div className="p-3 bg-purple-50 rounded border border-purple-200">
        <div className="text-xs font-semibold text-purple-900 mb-1">Contribution to Overall Quality</div>
        <div className="text-sm text-purple-800">
          <strong>{breakdown.name}:</strong> {breakdown.score}% × {((breakdown.weight) * 100).toFixed(0)}% weight = <strong>{breakdown.contribution.toFixed(1)}%</strong>
        </div>
      </div>

      {/* Recommendations */}
      {breakdown.recommendations.length > 0 && (
        <div className="space-y-2">
          <h6 className="font-semibold text-sm text-gray-700">Improvement Recommendations</h6>
          <ul className="space-y-1">
            {breakdown.recommendations.map((rec, index) => (
              <li key={index} className="flex gap-2 text-xs text-gray-700">
                <TrendingUp className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Calculate detailed quality dimension breakdown
 */
function calculateQualityDimensionBreakdown(
  dimensionType: string,
  content: string,
  currentScore: number,
  weight: string
): QualityDimensionBreakdown {
  const hasContent = content && content.trim().length > 0
  const contentLower = hasContent ? content.toLowerCase() : ''
  const factors: QualityDimensionBreakdown['factors'] = []
  let calculation = ''
  const recommendations: string[] = []
  const weightValue = parseFloat(weight.replace('%', '')) / 100

  if (!hasContent) {
    return {
      name: dimensionType,
      score: currentScore,
      weight: weightValue,
      contribution: currentScore * weightValue,
      factors: [{
        name: 'Content Analysis',
        checked: false,
        points: 0,
        maxPoints: 100,
        description: 'Document content not available for detailed analysis.',
        details: 'Please ensure document content is accessible for accurate quality scoring.'
      }],
      calculation: 'Score calculation requires document content. Content not available.',
      recommendations: ['Ensure document content is accessible for quality analysis']
    }
  }

  // Analyze content structure
  const h1Count = (content.match(/^# /gm) || []).length
  const h2Count = (content.match(/^## /gm) || []).length
  const h3Count = (content.match(/^### /gm) || []).length
  const tableCells = (content.match(/\|/g) || []).length
  const listItems = (content.match(/^[-*]/gm) || []).length
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
  const sentenceCount = (content.match(/[.!?]+/g) || []).length
  const paragraphCount = (content.match(/\n\n/g) || []).length + 1

  switch (dimensionType) {
    case 'completeness': {
      const hasMainTitle = content.startsWith('#')
      const hasHeaders = h2Count >= 3
      const hasTables = tableCells >= 10
      const hasLists = listItems >= 5

      factors.push(
        {
          name: 'Main Title',
          checked: hasMainTitle,
          points: hasMainTitle ? 25 : 0,
          maxPoints: 25,
          description: 'Document starts with a main title (H1 heading)',
          details: hasMainTitle ? '✓ Main title found' : '✗ Document should start with # Main Title'
        },
        {
          name: 'Section Headers',
          checked: hasHeaders,
          points: hasHeaders ? 25 : 0,
          maxPoints: 25,
          description: `Document has ${h2Count} main sections (target: 3+)`,
          details: hasHeaders ? `✓ ${h2Count} sections found` : `✗ Only ${h2Count} sections (target: 3+)`
        },
        {
          name: 'Tables',
          checked: hasTables,
          points: hasTables ? 25 : 0,
          maxPoints: 25,
          description: 'Document includes structured data in tables',
          details: hasTables ? `✓ ${tableCells} table cells found` : `✗ Only ${tableCells} table cells (target: 10+)`
        },
        {
          name: 'Lists',
          checked: hasLists,
          points: hasLists ? 25 : 0,
          maxPoints: 25,
          description: 'Document includes bulleted or numbered lists',
          details: hasLists ? `✓ ${listItems} list items found` : `✗ Only ${listItems} list items (target: 5+)`
        }
      )

      calculation = `Score = ${hasMainTitle ? 25 : 0} (Title) + ${hasHeaders ? 25 : 0} (Headers) + ${hasTables ? 25 : 0} (Tables) + ${hasLists ? 25 : 0} (Lists) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasMainTitle) recommendations.push('Add a main title at the beginning of the document')
      if (!hasHeaders) recommendations.push(`Add more section headers (currently ${h2Count}, target: 3+)`)
      if (!hasTables) recommendations.push('Add tables to organize structured data')
      if (!hasLists) recommendations.push('Add bulleted or numbered lists for better readability')
      break
    }

    case 'consistency': {
      // ToC is auto-generated by the document viewer from H1/H2/H3 headings
      const hasTOCStructure = h1Count > 0 || h2Count > 0 || h3Count > 0
      const hasConsistentHeaders = h2Count > 0 && h2Count <= 15
      const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0
      const hasGoodFlowRange = avgSentenceLength >= 10 && avgSentenceLength <= 25
      const wordsPerSection = h2Count > 0 ? wordCount / h2Count : 0
      const hasUniformSections = Math.abs(wordsPerSection - 200) < 100

      factors.push(
        {
          name: 'Table of Contents',
          checked: hasTOCStructure,
          points: hasTOCStructure ? 20 : 0,
          maxPoints: 20,
          description: 'Document has headings (H1/H2/H3) for auto-generated ToC',
          details: hasTOCStructure ? `✓ ${h1Count + h2Count + h3Count} headings found (ToC auto-generated by viewer)` : '✗ Add headings (H1/H2/H3) to enable auto-generated table of contents'
        },
        {
          name: 'Consistent Header Structure',
          checked: hasConsistentHeaders,
          points: hasConsistentHeaders ? 25 : 10,
          maxPoints: 25,
          description: `Document has ${h2Count} main sections (balanced structure)`,
          details: hasConsistentHeaders ? `✓ ${h2Count} sections (good balance)` : `⚠ ${h2Count} sections (target: 1-15)`
        },
        {
          name: 'Sentence Flow',
          checked: hasGoodFlowRange,
          points: hasGoodFlowRange ? 30 : 15,
          maxPoints: 30,
          description: `Average sentence length: ${avgSentenceLength.toFixed(1)} words (target: 10-25)`,
          details: hasGoodFlowRange ? `✓ Good sentence flow (${avgSentenceLength.toFixed(1)} words)` : `⚠ Sentence length ${avgSentenceLength.toFixed(1)} words (target: 10-25)`
        },
        {
          name: 'Uniform Section Length',
          checked: hasUniformSections,
          points: hasUniformSections ? 25 : 10,
          maxPoints: 25,
          description: `Average ${wordsPerSection.toFixed(0)} words per section (target: ~200)`,
          details: hasUniformSections ? `✓ Sections are balanced (${wordsPerSection.toFixed(0)} words each)` : `⚠ Section length varies (${wordsPerSection.toFixed(0)} words avg, target: ~200)`
        }
      )

      calculation = `Score = ${hasTOCStructure ? 20 : 0} (TOC Structure) + ${hasConsistentHeaders ? 25 : 10} (Headers) + ${hasGoodFlowRange ? 30 : 15} (Flow) + ${hasUniformSections ? 25 : 10} (Uniform) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasTOCStructure) recommendations.push('Add headings (H1/H2/H3) to enable auto-generated table of contents in the document viewer')
      if (!hasConsistentHeaders) recommendations.push(`Balance section count (currently ${h2Count}, target: 1-15)`)
      if (!hasGoodFlowRange) recommendations.push(`Adjust sentence length (currently ${avgSentenceLength.toFixed(1)} words, target: 10-25)`)
      if (!hasUniformSections) recommendations.push(`Balance section lengths (currently ${wordsPerSection.toFixed(0)} words avg, target: ~200)`)
      break
    }

    case 'professionalQuality': {
      const hasExecutiveSummary = contentLower.includes('executive summary') || contentLower.includes('## summary')
      const hasIntroduction = contentLower.includes('introduction') || contentLower.includes('## 1.')
      const hasConclusion = contentLower.includes('conclusion') || contentLower.includes('next steps')
      const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0
      const hasProperGrammar = avgSentenceLength > 8
      const excessiveCaps = (content.match(/[A-Z]{4,}/g) || []).length
      const noExcessiveCaps = excessiveCaps < 5

      factors.push(
        {
          name: 'Executive Summary',
          checked: hasExecutiveSummary,
          points: hasExecutiveSummary ? 25 : 0,
          maxPoints: 25,
          description: 'Document includes an executive summary section',
          details: hasExecutiveSummary ? '✓ Executive summary found' : '✗ Add an executive summary section'
        },
        {
          name: 'Introduction',
          checked: hasIntroduction,
          points: hasIntroduction ? 20 : 10,
          maxPoints: 20,
          description: 'Document includes an introduction section',
          details: hasIntroduction ? '✓ Introduction found' : '⚠ Consider adding an introduction'
        },
        {
          name: 'Conclusion',
          checked: hasConclusion,
          points: hasConclusion ? 20 : 0,
          maxPoints: 20,
          description: 'Document includes a conclusion or next steps section',
          details: hasConclusion ? '✓ Conclusion/next steps found' : '✗ Add a conclusion or next steps section'
        },
        {
          name: 'Proper Grammar',
          checked: hasProperGrammar,
          points: hasProperGrammar ? 20 : 10,
          maxPoints: 20,
          description: `Average sentence complexity: ${avgSentenceLength.toFixed(1)} words (target: >8)`,
          details: hasProperGrammar ? `✓ Good sentence complexity (${avgSentenceLength.toFixed(1)} words)` : `⚠ Sentence complexity ${avgSentenceLength.toFixed(1)} words (target: >8)`
        },
        {
          name: 'No Excessive Caps',
          checked: noExcessiveCaps,
          points: noExcessiveCaps ? 15 : 0,
          maxPoints: 15,
          description: `Excessive capitalization: ${excessiveCaps} instances (target: <5)`,
          details: noExcessiveCaps ? '✓ No excessive capitalization' : `⚠ ${excessiveCaps} instances of excessive caps (target: <5)`
        }
      )

      const structuralScore = factors.reduce((sum, f) => sum + f.points, 0)
      calculation = `Structural Score = ${hasExecutiveSummary ? 25 : 0} (Summary) + ${hasIntroduction ? 20 : 10} (Introduction) + ${hasConclusion ? 20 : 0} (Conclusion) + ${hasProperGrammar ? 20 : 10} (Grammar) + ${noExcessiveCaps ? 15 : 0} (Caps) = ${structuralScore}%`
      
      // Note: The actual score may differ from structural score due to AI-assessed qualitative factors
      // (passive voice, grammatical errors, writing tone, style consistency, etc.)
      if (structuralScore !== currentScore) {
        calculation += `\n\nNote: Actual score (${currentScore}%) includes additional AI-assessed qualitative factors beyond structural elements.`
      }

      if (!hasExecutiveSummary) recommendations.push('Add an executive summary section at the beginning')
      if (!hasIntroduction) recommendations.push('Add an introduction section')
      if (!hasConclusion) recommendations.push('Add a conclusion or next steps section')
      if (!hasProperGrammar) recommendations.push(`Improve sentence complexity (currently ${avgSentenceLength.toFixed(1)} words, target: >8)`)
      if (!noExcessiveCaps) recommendations.push(`Reduce excessive capitalization (currently ${excessiveCaps} instances, target: <5)`)
      
      // Add recommendations for qualitative factors if structural score differs from actual
      if (structuralScore > currentScore) {
        recommendations.push('Review writing for passive voice usage and convert to active voice where appropriate')
        recommendations.push('Check for grammatical errors and improve sentence clarity')
        recommendations.push('Ensure consistent professional tone throughout the document')
      }
      break
    }

    case 'standardsCompliance': {
      const hasRequiredSections = h2Count >= 5
      const hasRolesResponsibilities = contentLower.includes('role') || contentLower.includes('responsible')
      const hasMetrics = contentLower.includes('metric') || contentLower.includes('kpi') || contentLower.includes('measure')
      const hasTimelines = contentLower.includes('timeline') || contentLower.includes('schedule') || contentLower.includes('deadline')
      const hasApprovals = contentLower.includes('approval') || contentLower.includes('authority') || contentLower.includes('sign-off')

      factors.push(
        {
          name: 'Required Sections',
          checked: hasRequiredSections,
          points: hasRequiredSections ? 25 : 10,
          maxPoints: 25,
          description: `Document has ${h2Count} main sections (target: 5+)`,
          details: hasRequiredSections ? `✓ ${h2Count} sections (meets requirement)` : `✗ Only ${h2Count} sections (target: 5+)`
        },
        {
          name: 'Roles & Responsibilities',
          checked: hasRolesResponsibilities,
          points: hasRolesResponsibilities ? 20 : 0,
          maxPoints: 20,
          description: 'Document includes roles and responsibilities',
          details: hasRolesResponsibilities ? '✓ Roles/responsibilities mentioned' : '✗ Add roles and responsibilities section'
        },
        {
          name: 'Metrics & KPIs',
          checked: hasMetrics,
          points: hasMetrics ? 20 : 0,
          maxPoints: 20,
          description: 'Document includes metrics, KPIs, or measures',
          details: hasMetrics ? '✓ Metrics/KPIs mentioned' : '✗ Add metrics, KPIs, or performance measures'
        },
        {
          name: 'Timelines',
          checked: hasTimelines,
          points: hasTimelines ? 20 : 0,
          maxPoints: 20,
          description: 'Document includes timelines, schedules, or deadlines',
          details: hasTimelines ? '✓ Timelines/schedules mentioned' : '✗ Add timelines, schedules, or deadlines'
        },
        {
          name: 'Approvals',
          checked: hasApprovals,
          points: hasApprovals ? 15 : 0,
          maxPoints: 15,
          description: 'Document includes approval processes or sign-off',
          details: hasApprovals ? '✓ Approvals/authority mentioned' : '⚠ Consider adding approval processes'
        }
      )

      calculation = `Score = ${hasRequiredSections ? 25 : 10} (Sections) + ${hasRolesResponsibilities ? 20 : 0} (Roles) + ${hasMetrics ? 20 : 0} (Metrics) + ${hasTimelines ? 20 : 0} (Timelines) + ${hasApprovals ? 15 : 0} (Approvals) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasRequiredSections) recommendations.push(`Add more main sections (currently ${h2Count}, target: 5+)`)
      if (!hasRolesResponsibilities) recommendations.push('Add a roles and responsibilities section')
      if (!hasMetrics) recommendations.push('Add metrics, KPIs, or performance measures')
      if (!hasTimelines) recommendations.push('Add timelines, schedules, or deadlines')
      if (!hasApprovals) recommendations.push('Add approval processes or sign-off procedures')
      break
    }

    case 'accuracy': {
      const hasSpecificData = /\d+%|\$\d+|\d+\s+(hours|days|months|years)/gi.test(content)
      const hasProperCitations = content.includes('*') || content.includes('>')
      const hasDefinitions = contentLower.includes('definition') || contentLower.includes('refers to')
      const hasExamples = contentLower.includes('example') || contentLower.includes('for instance')

      factors.push(
        {
          name: 'Specific Data',
          checked: hasSpecificData,
          points: hasSpecificData ? 30 : 15,
          maxPoints: 30,
          description: 'Document includes specific data (percentages, amounts, dates)',
          details: hasSpecificData ? '✓ Specific data found (percentages, amounts, dates)' : '⚠ Add specific data (percentages, amounts, dates)'
        },
        {
          name: 'Proper Citations',
          checked: hasProperCitations,
          points: hasProperCitations ? 20 : 0,
          maxPoints: 20,
          description: 'Document includes citations or references',
          details: hasProperCitations ? '✓ Citations/references found' : '✗ Add citations or references'
        },
        {
          name: 'Definitions',
          checked: hasDefinitions,
          points: hasDefinitions ? 25 : 10,
          maxPoints: 25,
          description: 'Document includes definitions or explanations',
          details: hasDefinitions ? '✓ Definitions found' : '⚠ Consider adding definitions for key terms'
        },
        {
          name: 'Examples',
          checked: hasExamples,
          points: hasExamples ? 25 : 10,
          maxPoints: 25,
          description: 'Document includes examples or instances',
          details: hasExamples ? '✓ Examples found' : '⚠ Consider adding examples to illustrate concepts'
        }
      )

      calculation = `Score = ${hasSpecificData ? 30 : 15} (Data) + ${hasProperCitations ? 20 : 0} (Citations) + ${hasDefinitions ? 25 : 10} (Definitions) + ${hasExamples ? 25 : 10} (Examples) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasSpecificData) recommendations.push('Add specific data (percentages, dollar amounts, timeframes)')
      if (!hasProperCitations) recommendations.push('Add citations or references to support claims')
      if (!hasDefinitions) recommendations.push('Add definitions for key terms and concepts')
      if (!hasExamples) recommendations.push('Add examples or instances to illustrate concepts')
      break
    }

    case 'contextRelevance': {
      const frameworkKeywords = ['project', 'stakeholder', 'risk', 'scope', 'budget', 'schedule', 'quality', 'resource']
      const frameworkMentions = frameworkKeywords.filter(kw => contentLower.includes(kw)).length
      const hasProjectContext = contentLower.includes('project') && frameworkMentions >= 3
      const hasFrameworkAlignment = content.includes('PMBOK') || content.includes('BABOK') || content.includes('DMBOK')
      const hasActionableContent = /\b(should|must|will|shall)\b/gi.test(content)

      factors.push(
        {
          name: 'Project Context',
          checked: hasProjectContext,
          points: hasProjectContext ? 35 : 15,
          maxPoints: 35,
          description: `Document references project context (${frameworkMentions} keywords found)`,
          details: hasProjectContext ? `✓ Strong project context (${frameworkMentions} keywords)` : `⚠ Limited project context (${frameworkMentions} keywords, target: 3+)`
        },
        {
          name: 'Framework Alignment',
          checked: hasFrameworkAlignment,
          points: hasFrameworkAlignment ? 25 : 0,
          maxPoints: 25,
          description: 'Document aligns with framework (PMBOK, BABOK, DMBOK)',
          details: hasFrameworkAlignment ? '✓ Framework alignment found' : '✗ Reference framework (PMBOK, BABOK, DMBOK)'
        },
        {
          name: 'Actionable Content',
          checked: hasActionableContent,
          points: hasActionableContent ? 25 : 10,
          maxPoints: 25,
          description: 'Document includes actionable statements (should, must, will, shall)',
          details: hasActionableContent ? '✓ Actionable content found' : '⚠ Add actionable statements (should, must, will, shall)'
        },
        {
          name: 'Framework Keywords',
          checked: frameworkMentions >= 5,
          points: frameworkMentions >= 5 ? 15 : 0,
          maxPoints: 15,
          description: `Framework keywords found: ${frameworkMentions} (target: 5+)`,
          details: frameworkMentions >= 5 ? `✓ Excellent keyword coverage (${frameworkMentions} keywords)` : `⚠ Limited keyword coverage (${frameworkMentions} keywords, target: 5+)`
        }
      )

      calculation = `Score = ${hasProjectContext ? 35 : 15} (Context) + ${hasFrameworkAlignment ? 25 : 0} (Framework) + ${hasActionableContent ? 25 : 10} (Actionable) + ${frameworkMentions >= 5 ? 15 : 0} (Keywords) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasProjectContext) recommendations.push(`Add more project context keywords (currently ${frameworkMentions}, target: 3+)`)
      if (!hasFrameworkAlignment) recommendations.push('Reference framework (PMBOK, BABOK, or DMBOK)')
      if (!hasActionableContent) recommendations.push('Add actionable statements (should, must, will, shall)')
      if (frameworkMentions < 5) recommendations.push(`Add more framework keywords (currently ${frameworkMentions}, target: 5+)`)
      break
    }

    default:
      return {
        name: dimensionType,
        score: currentScore,
        weight: weightValue,
        contribution: currentScore * weightValue,
        factors: [],
        calculation: 'Calculation not available',
        recommendations: []
      }
  }

  // Use the actual AI-assessed score, not the recalculated structural score
  // The structural score is shown in the breakdown for reference
  const structuralScore = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0))
  const contribution = currentScore * weightValue

  return {
    name: dimensionType,
    score: currentScore, // Use actual AI-assessed score
    weight: weightValue,
    contribution,
    factors,
    calculation,
    recommendations
  }
}

/**
 * Calculate detailed compliance breakdown for a specific metric
 */
function calculateComplianceBreakdown(
  metricName: string,
  content: string,
  framework?: string,
  documentType?: string,
  weight: number = 0.15,
  applicable: boolean = true
): ComplianceBreakdown {
  const hasContent = content && content.trim().length > 0
  const contentLower = hasContent ? content.toLowerCase() : ''
  const factors: ComplianceBreakdown['factors'] = []
  let calculation = ''
  const recommendations: string[] = []

  // If no content available, provide limited breakdown
  if (!hasContent) {
    return {
      name: metricName,
      score: 0,
      applicable,
      weight,
      contribution: 0,
      factors: [{
        name: 'Content Analysis',
        checked: false,
        points: 0,
        maxPoints: 100,
        description: 'Document content not available for detailed analysis. Please ensure document content is accessible for accurate compliance scoring.',
        keywords: undefined,
        foundKeywords: undefined,
        missingKeywords: undefined
      }],
      calculation: 'Score calculation requires document content. Content not available.',
      recommendations: ['Ensure document content is accessible for compliance analysis']
    }
  }

  switch (metricName) {
    case 'PMBOK Guide': {
      const pmbokKeywords = ['pmbok', 'project management', 'project charter', 'stakeholder', 'scope', 'schedule', 'cost', 'quality', 'risk', 'communication', 'procurement', 'integration']
      const foundKeywords = pmbokKeywords.filter(kw => contentLower.includes(kw))
      const missingKeywords = pmbokKeywords.filter(kw => !contentLower.includes(kw))
      
      const hasPmbokStructure = contentLower.includes('project charter') || contentLower.includes('project management plan')
      const hasPmbokProcesses = contentLower.includes('initiating') || contentLower.includes('planning') || contentLower.includes('executing') || contentLower.includes('monitoring') || contentLower.includes('closing')
      const hasPmbokKnowledgeAreas = foundKeywords.length >= 5
      const keywordBonus = foundKeywords.length >= 8 ? 15 : foundKeywords.length >= 5 ? 10 : 0

      factors.push(
        {
          name: 'PMBOK Structure',
          checked: hasPmbokStructure,
          points: hasPmbokStructure ? 30 : 0,
          maxPoints: 30,
          description: 'Document includes Project Charter or Project Management Plan structure',
          keywords: ['project charter', 'project management plan'],
          foundKeywords: hasPmbokStructure ? ['project charter', 'project management plan'].filter(kw => contentLower.includes(kw)) : [],
          missingKeywords: hasPmbokStructure ? [] : ['project charter', 'project management plan']
        },
        {
          name: 'PMBOK Process Groups',
          checked: hasPmbokProcesses,
          points: hasPmbokProcesses ? 30 : 0,
          maxPoints: 30,
          description: 'Document references PMBOK process groups (Initiating, Planning, Executing, Monitoring, Closing)',
          keywords: ['initiating', 'planning', 'executing', 'monitoring', 'closing'],
          foundKeywords: ['initiating', 'planning', 'executing', 'monitoring', 'closing'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['initiating', 'planning', 'executing', 'monitoring', 'closing'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'PMBOK Knowledge Areas',
          checked: hasPmbokKnowledgeAreas,
          points: hasPmbokKnowledgeAreas ? 25 : 0,
          maxPoints: 25,
          description: 'Document references 5+ PMBOK knowledge areas',
          keywords: pmbokKeywords,
          foundKeywords,
          missingKeywords
        },
        {
          name: 'Keyword Coverage',
          checked: foundKeywords.length >= 8,
          points: keywordBonus,
          maxPoints: 15,
          description: foundKeywords.length >= 8 ? 'Excellent keyword coverage (8+ keywords)' : foundKeywords.length >= 5 ? 'Good keyword coverage (5-7 keywords)' : 'Limited keyword coverage',
          keywords: pmbokKeywords,
          foundKeywords,
          missingKeywords
        }
      )

      calculation = `Score = ${hasPmbokStructure ? 30 : 0} (Structure) + ${hasPmbokProcesses ? 30 : 0} (Processes) + ${hasPmbokKnowledgeAreas ? 25 : 0} (Knowledge Areas) + ${keywordBonus} (Keywords) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasPmbokStructure) recommendations.push('Add Project Charter or Project Management Plan structure')
      if (!hasPmbokProcesses) recommendations.push('Reference PMBOK process groups (Initiating, Planning, Executing, Monitoring, Closing)')
      if (foundKeywords.length < 5) recommendations.push(`Add more PMBOK keywords (currently ${foundKeywords.length}, target: 5+)`)
      break
    }

    case 'GDPR': {
      const gdprKeywords = ['gdpr', 'general data protection regulation', 'personal data', 'data subject', 'consent', 'privacy', 'data protection', 'right to be forgotten', 'data breach', 'data controller', 'data processor']
      const foundKeywords = gdprKeywords.filter(kw => contentLower.includes(kw))
      const missingKeywords = gdprKeywords.filter(kw => !contentLower.includes(kw))
      
      const hasGdprCompliance = contentLower.includes('gdpr') && (contentLower.includes('compliance') || contentLower.includes('compliant'))
      const hasGdprPrinciples = contentLower.includes('lawfulness') || contentLower.includes('fairness') || contentLower.includes('transparency')
      const hasGdprRights = contentLower.includes('right to access') || contentLower.includes('right to erasure') || contentLower.includes('data portability')
      const keywordBonus = foundKeywords.length >= 5 ? 15 : foundKeywords.length >= 3 ? 10 : 0

      factors.push(
        {
          name: 'GDPR Compliance Statement',
          checked: hasGdprCompliance,
          points: hasGdprCompliance ? 40 : 0,
          maxPoints: 40,
          description: 'Document explicitly mentions GDPR compliance',
          keywords: ['gdpr', 'compliance', 'compliant'],
          foundKeywords: hasGdprCompliance ? ['gdpr', 'compliance'].filter(kw => contentLower.includes(kw)) : [],
          missingKeywords: hasGdprCompliance ? [] : ['gdpr', 'compliance']
        },
        {
          name: 'GDPR Principles',
          checked: hasGdprPrinciples,
          points: hasGdprPrinciples ? 25 : 0,
          maxPoints: 25,
          description: 'Document references GDPR principles (lawfulness, fairness, transparency)',
          keywords: ['lawfulness', 'fairness', 'transparency'],
          foundKeywords: ['lawfulness', 'fairness', 'transparency'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['lawfulness', 'fairness', 'transparency'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Data Subject Rights',
          checked: hasGdprRights,
          points: hasGdprRights ? 20 : 0,
          maxPoints: 20,
          description: 'Document mentions data subject rights (access, erasure, portability)',
          keywords: ['right to access', 'right to erasure', 'data portability'],
          foundKeywords: ['right to access', 'right to erasure', 'data portability'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['right to access', 'right to erasure', 'data portability'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'GDPR Keyword Coverage',
          checked: foundKeywords.length >= 5,
          points: keywordBonus,
          maxPoints: 15,
          description: foundKeywords.length >= 5 ? 'Comprehensive GDPR keyword coverage' : foundKeywords.length >= 3 ? 'Good GDPR keyword coverage' : 'Limited GDPR keyword coverage',
          keywords: gdprKeywords,
          foundKeywords,
          missingKeywords
        }
      )

      calculation = `Score = ${hasGdprCompliance ? 40 : 0} (Compliance) + ${hasGdprPrinciples ? 25 : 0} (Principles) + ${hasGdprRights ? 20 : 0} (Rights) + ${keywordBonus} (Keywords) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasGdprCompliance) recommendations.push('Add explicit GDPR compliance statement')
      if (!hasGdprPrinciples) recommendations.push('Reference GDPR principles (lawfulness, fairness, transparency)')
      if (!hasGdprRights) recommendations.push('Mention data subject rights (access, erasure, portability)')
      if (foundKeywords.length < 3) recommendations.push(`Add more GDPR-related keywords (currently ${foundKeywords.length}, target: 3+)`)
      break
    }

    case 'HIPAA': {
      const hipaaKeywords = ['hipaa', 'health insurance portability', 'protected health information', 'phi', 'ephi', 'privacy rule', 'security rule', 'breach notification', 'business associate', 'covered entity']
      const foundKeywords = hipaaKeywords.filter(kw => contentLower.includes(kw))
      const missingKeywords = hipaaKeywords.filter(kw => !contentLower.includes(kw))
      
      const hasHipaaCompliance = contentLower.includes('hipaa') && (contentLower.includes('compliance') || contentLower.includes('compliant'))
      const hasHipaaPrivacy = contentLower.includes('privacy rule') || contentLower.includes('phi')
      const hasHipaaSecurity = contentLower.includes('security rule') || contentLower.includes('ephi')
      const keywordBonus = foundKeywords.length >= 4 ? 10 : foundKeywords.length >= 2 ? 5 : 0

      factors.push(
        {
          name: 'HIPAA Compliance Statement',
          checked: hasHipaaCompliance,
          points: hasHipaaCompliance ? 40 : 0,
          maxPoints: 40,
          description: 'Document explicitly mentions HIPAA compliance',
          keywords: ['hipaa', 'compliance', 'compliant'],
          foundKeywords: hasHipaaCompliance ? ['hipaa'].filter(kw => contentLower.includes(kw)) : [],
          missingKeywords: hasHipaaCompliance ? [] : ['hipaa', 'compliance']
        },
        {
          name: 'HIPAA Privacy Rule',
          checked: hasHipaaPrivacy,
          points: hasHipaaPrivacy ? 25 : 0,
          maxPoints: 25,
          description: 'Document references HIPAA Privacy Rule or PHI',
          keywords: ['privacy rule', 'phi', 'protected health information'],
          foundKeywords: ['privacy rule', 'phi', 'protected health information'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['privacy rule', 'phi', 'protected health information'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'HIPAA Security Rule',
          checked: hasHipaaSecurity,
          points: hasHipaaSecurity ? 25 : 0,
          maxPoints: 25,
          description: 'Document references HIPAA Security Rule or ePHI',
          keywords: ['security rule', 'ephi'],
          foundKeywords: ['security rule', 'ephi'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['security rule', 'ephi'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'HIPAA Keyword Coverage',
          checked: foundKeywords.length >= 4,
          points: keywordBonus,
          maxPoints: 10,
          description: foundKeywords.length >= 4 ? 'Comprehensive HIPAA keyword coverage' : foundKeywords.length >= 2 ? 'Good HIPAA keyword coverage' : 'Limited HIPAA keyword coverage',
          keywords: hipaaKeywords,
          foundKeywords,
          missingKeywords
        }
      )

      calculation = `Score = ${hasHipaaCompliance ? 40 : 0} (Compliance) + ${hasHipaaPrivacy ? 25 : 0} (Privacy) + ${hasHipaaSecurity ? 25 : 0} (Security) + ${keywordBonus} (Keywords) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!applicable) {
        recommendations.push('HIPAA is typically only applicable to healthcare-related documents. If this document handles health information, add HIPAA compliance measures.')
      } else {
        if (!hasHipaaCompliance) recommendations.push('Add explicit HIPAA compliance statement')
        if (!hasHipaaPrivacy) recommendations.push('Reference HIPAA Privacy Rule and PHI protection')
        if (!hasHipaaSecurity) recommendations.push('Reference HIPAA Security Rule and ePHI protection')
        if (foundKeywords.length < 2) recommendations.push(`Add more HIPAA-related keywords (currently ${foundKeywords.length}, target: 2+)`)
      }
      break
    }

    case 'SOC 2': {
      const soc2Keywords = ['soc 2', 'soc2', 'service organization control', 'trust service criteria', 'security', 'availability', 'processing integrity', 'confidentiality', 'privacy', 'audit', 'controls', 'ccs']
      const foundKeywords = soc2Keywords.filter(kw => contentLower.includes(kw))
      const missingKeywords = soc2Keywords.filter(kw => !contentLower.includes(kw))
      
      const hasSoc2Compliance = (contentLower.includes('soc 2') || contentLower.includes('soc2')) && (contentLower.includes('compliance') || contentLower.includes('compliant'))
      const hasSoc2Criteria = contentLower.includes('trust service criteria') || contentLower.includes('ccs') || contentLower.includes('common criteria')
      const hasSoc2Controls = contentLower.includes('control') && (contentLower.includes('security') || contentLower.includes('availability'))
      const keywordBonus = foundKeywords.length >= 4 ? 10 : foundKeywords.length >= 2 ? 5 : 0

      factors.push(
        {
          name: 'SOC 2 Compliance Statement',
          checked: hasSoc2Compliance,
          points: hasSoc2Compliance ? 40 : 0,
          maxPoints: 40,
          description: 'Document explicitly mentions SOC 2 compliance',
          keywords: ['soc 2', 'soc2', 'compliance', 'compliant'],
          foundKeywords: hasSoc2Compliance ? ['soc 2', 'soc2'].filter(kw => contentLower.includes(kw)) : [],
          missingKeywords: hasSoc2Compliance ? [] : ['soc 2', 'soc2', 'compliance']
        },
        {
          name: 'Trust Service Criteria',
          checked: hasSoc2Criteria,
          points: hasSoc2Criteria ? 25 : 0,
          maxPoints: 25,
          description: 'Document references SOC 2 Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)',
          keywords: ['trust service criteria', 'ccs', 'common criteria'],
          foundKeywords: ['trust service criteria', 'ccs', 'common criteria'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['trust service criteria', 'ccs', 'common criteria'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Security Controls',
          checked: hasSoc2Controls,
          points: hasSoc2Controls ? 25 : 0,
          maxPoints: 25,
          description: 'Document mentions security or availability controls',
          keywords: ['control', 'security', 'availability'],
          foundKeywords: ['control', 'security', 'availability'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['control', 'security', 'availability'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'SOC 2 Keyword Coverage',
          checked: foundKeywords.length >= 4,
          points: keywordBonus,
          maxPoints: 10,
          description: foundKeywords.length >= 4 ? 'Comprehensive SOC 2 keyword coverage' : foundKeywords.length >= 2 ? 'Good SOC 2 keyword coverage' : 'Limited SOC 2 keyword coverage',
          keywords: soc2Keywords,
          foundKeywords,
          missingKeywords
        }
      )

      calculation = `Score = ${hasSoc2Compliance ? 40 : 0} (Compliance) + ${hasSoc2Criteria ? 25 : 0} (Criteria) + ${hasSoc2Controls ? 25 : 0} (Controls) + ${keywordBonus} (Keywords) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasSoc2Compliance) recommendations.push('Add explicit SOC 2 compliance statement')
      if (!hasSoc2Criteria) recommendations.push('Reference SOC 2 Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)')
      if (!hasSoc2Controls) recommendations.push('Mention security and availability controls')
      if (foundKeywords.length < 2) recommendations.push(`Add more SOC 2-related keywords (currently ${foundKeywords.length}, target: 2+)`)
      break
    }

    case 'Industry Standards': {
      const industryKeywords = ['iso', 'ansi', 'ieee', 'nist', 'cmmi', 'itil', 'cobit', 'industry standard', 'best practice', 'standard operating procedure', 'sop']
      const foundKeywords = industryKeywords.filter(kw => contentLower.includes(kw))
      const missingKeywords = industryKeywords.filter(kw => !contentLower.includes(kw))
      
      const hasIsoStandards = contentLower.includes('iso 9001') || contentLower.includes('iso 27001') || contentLower.includes('iso 20000')
      const hasOtherStandards = contentLower.includes('ansi') || contentLower.includes('ieee') || contentLower.includes('nist')
      const hasStandardsReferences = foundKeywords.length >= 3
      const keywordBonus = foundKeywords.length >= 5 ? 15 : foundKeywords.length >= 3 ? 10 : 0

      const isoKeywords = ['iso 9001', 'iso 27001', 'iso 20000', 'iso 14001', 'iso 45001']
      const foundIsoKeywords = isoKeywords.filter(kw => contentLower.includes(kw))
      const otherStandardKeywords = ['ansi', 'ieee', 'nist', 'cmmi', 'itil', 'cobit']
      const foundOtherKeywords = otherStandardKeywords.filter(kw => contentLower.includes(kw))

      factors.push(
        {
          name: 'ISO Standards',
          checked: hasIsoStandards,
          points: hasIsoStandards ? 35 : 0,
          maxPoints: 35,
          description: 'Document references ISO standards (ISO 9001, ISO 27001, ISO 20000)',
          keywords: isoKeywords,
          foundKeywords: foundIsoKeywords,
          missingKeywords: isoKeywords.filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Other Industry Standards',
          checked: hasOtherStandards,
          points: hasOtherStandards ? 25 : 0,
          maxPoints: 25,
          description: 'Document references other standards (ANSI, IEEE, NIST, CMMI, ITIL, COBIT)',
          keywords: otherStandardKeywords,
          foundKeywords: foundOtherKeywords,
          missingKeywords: otherStandardKeywords.filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Standards References',
          checked: hasStandardsReferences,
          points: hasStandardsReferences ? 25 : 0,
          maxPoints: 25,
          description: 'Document includes 3+ industry standard references',
          keywords: industryKeywords,
          foundKeywords,
          missingKeywords
        },
        {
          name: 'Keyword Coverage',
          checked: foundKeywords.length >= 5,
          points: keywordBonus,
          maxPoints: 15,
          description: foundKeywords.length >= 5 ? 'Comprehensive standards keyword coverage' : foundKeywords.length >= 3 ? 'Good standards keyword coverage' : 'Limited standards keyword coverage',
          keywords: industryKeywords,
          foundKeywords,
          missingKeywords
        }
      )

      calculation = `Score = ${hasIsoStandards ? 35 : 0} (ISO) + ${hasOtherStandards ? 25 : 0} (Other Standards) + ${hasStandardsReferences ? 25 : 0} (References) + ${keywordBonus} (Keywords) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasIsoStandards) recommendations.push('Add ISO standard references (e.g., ISO 9001, ISO 27001, ISO 14001)')
      if (!hasOtherStandards) recommendations.push('Reference other industry standards (ANSI, IEEE, NIST, ITIL, COBIT)')
      if (foundKeywords.length < 3) recommendations.push(`Add more industry standard keywords (currently ${foundKeywords.length}, target: 3+)`)
      break
    }

    case 'Best Practices': {
      const bestPracticeKeywords = ['best practice', 'industry best practice', 'recommended practice', 'proven approach', 'established methodology', 'lessons learned', 'continuous improvement']
      const foundKeywords = bestPracticeKeywords.filter(kw => contentLower.includes(kw))
      const missingKeywords = bestPracticeKeywords.filter(kw => !contentLower.includes(kw))
      
      const hasBestPractices = contentLower.includes('best practice') || contentLower.includes('recommended practice')
      const hasLessonsLearned = contentLower.includes('lessons learned') || contentLower.includes('continuous improvement')
      const hasProvenMethods = contentLower.includes('proven') || contentLower.includes('established')
      const hasDocumentationStandards = contentLower.includes('documentation') && (contentLower.includes('standard') || contentLower.includes('guideline'))
      const keywordBonus = foundKeywords.length >= 3 ? 10 : foundKeywords.length >= 1 ? 5 : 0

      factors.push(
        {
          name: 'Best Practices Mention',
          checked: hasBestPractices,
          points: hasBestPractices ? 30 : 0,
          maxPoints: 30,
          description: 'Document explicitly mentions best practices or recommended practices',
          keywords: ['best practice', 'recommended practice'],
          foundKeywords: ['best practice', 'recommended practice'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['best practice', 'recommended practice'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Lessons Learned',
          checked: hasLessonsLearned,
          points: hasLessonsLearned ? 25 : 0,
          maxPoints: 25,
          description: 'Document includes lessons learned or continuous improvement references',
          keywords: ['lessons learned', 'continuous improvement'],
          foundKeywords: ['lessons learned', 'continuous improvement'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['lessons learned', 'continuous improvement'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Proven Methods',
          checked: hasProvenMethods,
          points: hasProvenMethods ? 20 : 0,
          maxPoints: 20,
          description: 'Document references proven or established methodologies',
          keywords: ['proven', 'established'],
          foundKeywords: ['proven', 'established'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['proven', 'established'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Documentation Standards',
          checked: hasDocumentationStandards,
          points: hasDocumentationStandards ? 15 : 0,
          maxPoints: 15,
          description: 'Document mentions documentation standards or guidelines',
          keywords: ['documentation', 'standard', 'guideline'],
          foundKeywords: ['documentation', 'standard', 'guideline'].filter(kw => contentLower.includes(kw)),
          missingKeywords: ['documentation', 'standard', 'guideline'].filter(kw => !contentLower.includes(kw))
        },
        {
          name: 'Keyword Coverage',
          checked: foundKeywords.length >= 3,
          points: keywordBonus,
          maxPoints: 10,
          description: foundKeywords.length >= 3 ? 'Comprehensive best practices keyword coverage' : foundKeywords.length >= 1 ? 'Good best practices keyword coverage' : 'Limited best practices keyword coverage',
          keywords: bestPracticeKeywords,
          foundKeywords,
          missingKeywords
        }
      )

      calculation = `Score = ${hasBestPractices ? 30 : 0} (Best Practices) + ${hasLessonsLearned ? 25 : 0} (Lessons Learned) + ${hasProvenMethods ? 20 : 0} (Proven Methods) + ${hasDocumentationStandards ? 15 : 0} (Documentation) + ${keywordBonus} (Keywords) = ${factors.reduce((sum, f) => sum + f.points, 0)}%`

      if (!hasBestPractices) recommendations.push('Add explicit best practices or recommended practices section')
      if (!hasLessonsLearned) recommendations.push('Include lessons learned or continuous improvement references')
      if (!hasProvenMethods) recommendations.push('Reference proven or established methodologies')
      if (foundKeywords.length < 1) recommendations.push(`Add best practices-related keywords (currently ${foundKeywords.length}, target: 1+)`)
      break
    }

    case 'Template Adherence': {
      const hasTemplateStructure = true // Assume template exists if we're checking
      const hasRequiredSections = (content.match(/^##/gm) || []).length >= 3
      const hasProperFormatting = (content.match(/\|/g) || []).length >= 10 || (content.match(/^[-*]/gm) || []).length >= 5
      const hasConsistentStructure = (content.match(/^###/gm) || []).length >= 2

      const sectionCount = (content.match(/^##/gm) || []).length
      const tableCount = (content.match(/\|/g) || []).length
      const listCount = (content.match(/^[-*]/gm) || []).length
      const subsectionCount = (content.match(/^###/gm) || []).length

      factors.push(
        {
          name: 'Required Sections',
          checked: hasRequiredSections,
          points: hasTemplateStructure ? (hasRequiredSections ? 40 : 0) : (hasRequiredSections ? 30 : 0),
          maxPoints: hasTemplateStructure ? 40 : 30,
          description: `Document has ${sectionCount} main sections (target: 3+)`,
          keywords: undefined,
          foundKeywords: undefined,
          missingKeywords: undefined
        },
        {
          name: 'Proper Formatting',
          checked: hasProperFormatting,
          points: hasTemplateStructure ? (hasProperFormatting ? 30 : 0) : (hasProperFormatting ? 25 : 0),
          maxPoints: hasTemplateStructure ? 30 : 25,
          description: `Document includes tables (${tableCount} cells) or lists (${listCount} items)`,
          keywords: undefined,
          foundKeywords: undefined,
          missingKeywords: undefined
        },
        {
          name: 'Consistent Structure',
          checked: hasConsistentStructure,
          points: hasTemplateStructure ? (hasConsistentStructure ? 30 : 0) : (hasConsistentStructure ? 25 : 0),
          maxPoints: hasTemplateStructure ? 30 : 25,
          description: `Document has ${subsectionCount} subsections (target: 2+)`,
          keywords: undefined,
          foundKeywords: undefined,
          missingKeywords: undefined
        }
      )

      const baseScore = hasTemplateStructure ? 0 : 20
      calculation = `Score = ${factors[0].points} (Sections) + ${factors[1].points} (Formatting) + ${factors[2].points} (Structure)${baseScore > 0 ? ` + ${baseScore} (Base)` : ''} = ${factors.reduce((sum, f) => sum + f.points, 0) + baseScore}%`

      if (!hasRequiredSections) recommendations.push(`Add more main sections (currently ${sectionCount}, target: 3+)`)
      if (!hasProperFormatting) recommendations.push(`Add tables or lists (currently ${tableCount} table cells, ${listCount} list items)`)
      if (!hasConsistentStructure) recommendations.push(`Add more subsections (currently ${subsectionCount}, target: 2+)`)
      break
    }

    default:
      return {
        name,
        score,
        applicable,
        weight,
        contribution: applicable ? score * weight : 0,
        factors: [],
        calculation: 'Calculation not available',
        recommendations: []
      }
  }

  const totalScore = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0))
  const contribution = applicable ? totalScore * weight : 0

  return {
    name,
    score: totalScore,
    applicable,
    weight,
    contribution,
    factors,
    calculation,
    recommendations
  }
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

/**
 * EU AI Act Criterion Card Component
 */
function EUAIActCriterionCard({
  name,
  description,
  score,
  threshold,
  passed,
  weight,
  critical
}: {
  name: string
  description: string
  score: number
  threshold: number
  passed: boolean
  weight: number
  critical: boolean
}) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-green-500'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number, threshold: number) => {
    if (score >= threshold) {
      if (score >= 90) return 'bg-green-500'
      if (score >= 80) return 'bg-green-400'
      return 'bg-yellow-500'
    }
    return 'bg-red-500'
  }

  return (
    <div className={`p-4 border rounded-lg ${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-base">{name}</h4>
            {critical && (
              <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Critical</Badge>
            )}
            {passed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </div>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
        <div className="text-right ml-4">
          <div className={`text-xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
          <div className="text-xs text-gray-500">Threshold: {threshold}%</div>
          <div className="text-xs text-gray-500">Weight: {(weight * 100).toFixed(0)}%</div>
        </div>
      </div>
      
      <Progress 
        value={score} 
        className={`h-2 ${getProgressColor(score, threshold)}`}
      />
      
      {!passed && (
        <div className="mt-2 text-xs text-red-700 font-medium">
          ⚠️ This criterion failed and may block document approval for EU users
        </div>
      )}
    </div>
  )
}

