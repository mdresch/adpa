"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, FileText, Database, BarChart3, Target } from '@/components/ui/icons-shim'

interface Foundation {
  id: string
  name: string
  description: string
  score: number
  status: 'excellent' | 'good' | 'needs-improvement'
  evidence: string[]
  gaps: string[]
  icon: React.ReactNode
}

const foundations: Foundation[] = [
  {
    id: 'governance',
    name: 'Data Governance Framework',
    description: 'Strong data governance with clear ownership, policies, and compliance',
    score: 5,
    status: 'excellent',
    evidence: [
      'Three-tiered governance structure (DGC, Stewards, Custodians)',
      'DMBOK 2.0 aligned data architecture',
      'RBAC access control with RLS',
      'Source document traceability',
      'Comprehensive audit trails'
    ],
    gaps: [],
    icon: <FileText className="h-5 w-5" />
  },
  {
    id: 'pipeline',
    name: 'Data Pipeline',
    description: 'Working, repeatable data pipeline for AI use',
    score: 4,
    status: 'good',
    evidence: [
      'Multi-stage document processor',
      'RAG-powered semantic search',
      'Automated entity extraction',
      'Bull queue-based batch processing',
      'External integrations (Confluence, SharePoint)'
    ],
    gaps: [
      'Enhanced pipeline monitoring and alerting',
      'More automated quality checks at pipeline stages'
    ],
    icon: <Database className="h-5 w-5" />
  },
  {
    id: 'management',
    name: 'AI Data Management',
    description: 'Proactive data management with version control and monitoring',
    score: 4.5,
    status: 'excellent',
    evidence: [
      'Document and template version control',
      'Semantic versioning (major.minor.patch)',
      'Complete lineage tracking (source_document_id)',
      'AI usage analytics dashboard',
      'Template quality metrics and maintenance tracking'
    ],
    gaps: [
      'Real-time alerting for data quality issues',
      'More sophisticated automated data refresh scheduling'
    ],
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    id: 'quality',
    name: 'Data Quality Standards',
    description: 'Measurable quality standards with automated tracking',
    score: 4,
    status: 'good',
    evidence: [
      'Template quality scores (0-100)',
      'Success rate and error tracking',
      'Document compliance scoring',
      'AI performance metrics',
      'User feedback integration'
    ],
    gaps: [
      'Explicit bias detection algorithms',
      'More configurable data freshness thresholds'
    ],
    icon: <CheckCircle className="h-5 w-5" />
  },
  {
    id: 'maturity',
    name: 'AI Maturity Model',
    description: 'Clear-eyed assessment of AI maturity and roadmap',
    score: 3,
    status: 'needs-improvement',
    evidence: [
      'Multi-provider AI orchestration',
      'Provider failover and health monitoring',
      'Usage tracking and cost analytics',
      'RAG integration for semantic search'
    ],
    gaps: [
      'No explicit maturity model document',
      'No self-assessment tool',
      'No maturity roadmap defined',
      'No structured gap identification process'
    ],
    icon: <Target className="h-5 w-5" />
  }
]

export function AIReadinessAssessment() {
  const [expandedFoundation, setExpandedFoundation] = useState<string | null>(null)

  const overallScore = foundations.reduce((sum, f) => sum + f.score, 0) / foundations.length
  const overallStatus = overallScore >= 4.5 ? 'excellent' : overallScore >= 3.5 ? 'good' : 'needs-improvement'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Excellent</Badge>
      case 'good':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Good</Badge>
      case 'needs-improvement':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Needs Improvement</Badge>
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'good':
        return <TrendingUp className="h-5 w-5 text-blue-600" />
      case 'needs-improvement':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">AI Readiness Assessment</CardTitle>
              <CardDescription className="mt-2">
                Assessment based on 5 critical foundations for AI project success
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{overallScore.toFixed(1)}/5.0</div>
              <div className="mt-2">{getStatusBadge(overallStatus)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Readiness</span>
              <span className="font-medium">{Math.round((overallScore / 5) * 100)}%</span>
            </div>
            <Progress value={(overallScore / 5) * 100} className="h-3" />
            <p className="text-sm text-muted-foreground mt-4">
              {overallScore >= 4.5 
                ? '✅ Your organization is READY for AI projects with a strong foundation.'
                : overallScore >= 3.5
                ? '✅ Your organization is MOSTLY READY. Address identified gaps before scaling.'
                : '⚠️ Your organization needs to strengthen foundations before launching AI projects.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Foundation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {foundations.map((foundation) => (
          <Card 
            key={foundation.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              expandedFoundation === foundation.id ? 'border-2 border-primary' : ''
            }`}
            onClick={() => setExpandedFoundation(
              expandedFoundation === foundation.id ? null : foundation.id
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {foundation.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{foundation.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {foundation.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{foundation.score}/5</div>
                  <div className="mt-1">{getStatusBadge(foundation.status)}</div>
                </div>
              </div>
            </CardHeader>
            {expandedFoundation === foundation.id && (
              <CardContent className="pt-0">
                <div className="space-y-4 mt-4 border-t pt-4">
                  {/* Evidence */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Evidence
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {foundation.evidence.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gaps */}
                  {foundation.gaps.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Gaps & Recommendations
                      </h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {foundation.gaps.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-yellow-600 mt-1">•</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Score Breakdown */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Score</span>
                      <span className="font-medium">{foundation.score}/5</span>
                    </div>
                    <Progress value={(foundation.score / 5) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Priority actions to improve AI readiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">High Priority: Create AI Maturity Model</h4>
                <p className="text-sm text-muted-foreground">
                  Define 5 maturity levels, create self-assessment tool, and map current capabilities to maturity levels.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Medium Priority: Enhance Quality Monitoring</h4>
                <p className="text-sm text-muted-foreground">
                  Implement real-time quality alerts, add bias detection algorithms, and improve quality dashboards.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Readiness Checklist</CardTitle>
          <CardDescription>
            Signs you're ready for AI projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { text: 'Data lives in connected systems (not silos)', status: true },
              { text: 'Data lifecycle ownership is clear', status: true },
              { text: 'Solving real business problems (not just following trends)', status: true },
              { text: 'AI outputs are monitored and governed', status: true }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.status ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

