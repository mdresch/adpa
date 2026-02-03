/**
 * Quality Audit Report Component
 * Displays quality audit results with proper handling for "no audit performed" status
 * Shows clear indicators when AI providers are unavailable and no mock data is displayed
 */

import React from 'react'
import { AlertTriangle, Clock, CheckCircle, XCircle, Info } from 'lucide-react'

interface QualityAuditData {
  overallScore?: number | null
  overallGrade?: string | null
  qualityLevel?: string | null
  dimensionalScores?: {
    completeness?: number | null
    consistency?: number | null
    professionalQuality?: number | null
    standardsCompliance?: number | null
    accuracy?: number | null
    contextRelevance?: number | null
  }
  findings?: Record<string, string>
  issues?: Array<{
    severity: 'critical' | 'major' | 'minor'
    dimension: string
    description: string
    recommendation?: string
  }>
  recommendations?: string[]
  aiProvider?: string
  aiModel?: string
  analysisTokens?: number
  analysisCost?: number
  analysisTime?: number
  auditPerformed?: boolean
  auditStatus?: string
  auditedAt?: string
  auditId?: string
}

interface QualityAuditReportProps {
  auditData: QualityAuditData
  documentTitle: string
  className?: string
}

export const QualityAuditReport: React.FC<QualityAuditReportProps> = ({
  auditData,
  documentTitle,
  className = ''
}) => {
  const isAuditPerformed = auditData.auditPerformed !== false && auditData.overallScore !== null
  
  const getGradeColor = (grade: string | null): string => {
    if (!grade) return 'text-gray-500'
    switch (grade) {
      case 'A': return 'text-green-600'
      case 'B': return 'text-blue-600'
      case 'C': return 'text-yellow-600'
      case 'D': return 'text-orange-600'
      case 'F': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  const getQualityLevelColor = (level: string | null): string => {
    if (!level) return 'text-gray-500'
    switch (level) {
      case 'Excellent': return 'text-green-600'
      case 'Good': return 'text-blue-600'
      case 'Acceptable': return 'text-yellow-600'
      case 'Needs Improvement': return 'text-orange-600'
      case 'Poor': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-gray-500'
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatScore = (score: number | null): string => {
    return score !== null ? `${score}%` : 'N/A'
  }

  const formatCost = (cost: number | undefined): string => {
    return cost !== undefined ? `$${cost.toFixed(4)}` : '$0.0000'
  }

  if (!isAuditPerformed) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quality Audit Report</h3>
          <div className="flex items-center text-gray-500">
            <Clock className="w-4 h-4 mr-2" />
            <span className="text-sm">Not Audited</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Quality Audit Not Performed</h4>
              <p className="text-sm text-yellow-700 mt-1">
                AI analysis was unavailable at the time of generation. No quality assessment has been performed on this document.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Audit Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="text-sm font-medium text-gray-900">Not Performed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">AI Provider:</span>
                <span className="text-sm font-medium text-gray-900">Unavailable</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Analysis Time:</span>
                <span className="text-sm font-medium text-gray-900">N/A</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start">
                <Info className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>Manual quality review recommended</span>
              </li>
              <li className="flex items-start">
                <Info className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>Consider re-running audit when AI services are available</span>
              </li>
              <li className="flex items-start">
                <Info className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>Verify document content manually before distribution</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Document: {documentTitle}</span>
            {auditData.auditedAt && (
              <span>Generated: {new Date(auditData.auditedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quality Audit Report</h3>
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          <span className="text-sm text-green-600">Audited</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {formatScore(auditData.overallScore)}
            </div>
            <div className={`text-lg font-medium ${getGradeColor(auditData.overallGrade)}`}>
              {auditData.overallGrade || 'N/A'}
            </div>
            <div className={`text-sm ${getQualityLevelColor(auditData.qualityLevel)}`}>
              {auditData.qualityLevel || 'N/A'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Document</div>
            <div className="text-sm font-medium text-gray-900">{documentTitle}</div>
          </div>
        </div>
      </div>

      {/* Dimensional Scores */}
      {auditData.dimensionalScores && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Dimensional Scores</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500">Completeness</div>
              <div className={`text-sm font-medium ${getScoreColor(auditData.dimensionalScores.completeness)}`}>
                {formatScore(auditData.dimensionalScores.completeness)}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500">Consistency</div>
              <div className={`text-sm font-medium ${getScoreColor(auditData.dimensionalScores.consistency)}`}>
                {formatScore(auditData.dimensionalScores.consistency)}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500">Professional Quality</div>
              <div className={`text-sm font-medium ${getScoreColor(auditData.dimensionalScores.professionalQuality)}`}>
                {formatScore(auditData.dimensionalScores.professionalQuality)}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500">Standards Compliance</div>
              <div className={`text-sm font-medium ${getScoreColor(auditData.dimensionalScores.standardsCompliance)}`}>
                {formatScore(auditData.dimensionalScores.standardsCompliance)}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500">Accuracy</div>
              <div className={`text-sm font-medium ${getScoreColor(auditData.dimensionalScores.accuracy)}`}>
                {formatScore(auditData.dimensionalScores.accuracy)}
              </div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs text-gray-500">Context Relevance</div>
              <div className={`text-sm font-medium ${getScoreColor(auditData.dimensionalScores.contextRelevance)}`}>
                {formatScore(auditData.dimensionalScores.contextRelevance)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      {auditData.issues && auditData.issues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Issues Found</h4>
          <div className="space-y-2">
            {auditData.issues.map((issue, index) => (
              <div key={index} className="flex items-start p-3 bg-red-50 border border-red-200 rounded">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-800">
                    {issue.dimension} - {issue.severity}
                  </div>
                  <div className="text-sm text-red-700">{issue.description}</div>
                  {issue.recommendation && (
                    <div className="text-sm text-red-600 mt-1">
                      Recommendation: {issue.recommendation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {auditData.recommendations && auditData.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {auditData.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <Info className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">AI Provider:</span>
            <div className="font-medium text-gray-900">
              {auditData.aiProvider || 'N/A'} ({auditData.aiModel || 'N/A'})
            </div>
          </div>
          <div>
            <span className="text-gray-500">Tokens Used:</span>
            <div className="font-medium text-gray-900">
              {auditData.analysisTokens || 0}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Analysis Cost:</span>
            <div className="font-medium text-gray-900">
              {formatCost(auditData.analysisCost)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Analysis Time:</span>
            <div className="font-medium text-gray-900">
              {auditData.analysisTime ? `${(auditData.analysisTime / 1000).toFixed(1)}s` : 'N/A'}
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
          <div>Audited at: {auditData.auditedAt ? new Date(auditData.auditedAt).toLocaleString() : 'N/A'}</div>
          <div>Audit ID: {auditData.auditId || 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}
