"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  AlertTriangle, 
  Shield, 
  Eye, 
  FileText, 
  Target,
  Users,
  Lock,
  Search,
  Info
} from '@/components/ui/icons-shim'

interface Layer {
  id: string
  name: string
  description: string
  score: number
  status: 'excellent' | 'good' | 'needs-improvement'
  principles: {
    principle: string
    implemented: boolean
    evidence?: string
  }[]
  gaps: string[]
  icon: React.ReactNode
  color: string
}

const layers: Layer[] = [
  {
    id: 'ethical',
    name: 'Ethical AI',
    description: 'Aligning AI with human values: fairness, inclusion, and harm reduction',
    score: 4,
    status: 'good',
    color: 'blue',
    icon: <Users className="h-5 w-5" />,
    principles: [
      { principle: 'Promote fairness, equity, and inclusion', implemented: true, evidence: 'Multi-provider AI orchestration, diverse model selection' },
      { principle: 'Reduce harmful bias in data and models', implemented: true, evidence: 'Source traceability, multi-document context' },
      { principle: 'Respect human dignity and rights', implemented: true, evidence: 'RBAC, audit logging, user consent' },
      { principle: 'Support diversity in datasets and teams', implemented: true, evidence: 'Multi-framework support, cross-document validation' },
      { principle: 'Maintain human control and agency', implemented: true, evidence: 'Approval workflows, quality gates' }
    ],
    gaps: [
      'No explicit bias detection algorithms',
      'No formal ethical AI policy document',
      'No diversity metrics for training data'
    ]
  },
  {
    id: 'responsible',
    name: 'Responsible AI',
    description: 'Oversight, accountability, and appropriate use with care',
    score: 4.5,
    status: 'excellent',
    color: 'green',
    icon: <Shield className="h-5 w-5" />,
    principles: [
      { principle: 'Clear accountability and legal compliance', implemented: true, evidence: 'Complete audit trails, user attribution' },
      { principle: 'Human-in-the-loop for oversight', implemented: true, evidence: 'Baseline approval workflow, quality gates' },
      { principle: 'Safety and minimize unintended consequences', implemented: true, evidence: 'Quality gates, red flag detection' },
      { principle: 'Processes to address system failures', implemented: true, evidence: 'Error handling, retry logic, health monitoring' },
      { principle: 'Privacy protections and safeguards', implemented: true, evidence: 'RBAC with RLS, GDPR/SOX compliance checks' },
      { principle: 'Design for misuse prevention', implemented: true, evidence: 'Rate limiting, input validation, security events' }
    ],
    gaps: [
      'No explicit workforce disruption assessment'
    ]
  },
  {
    id: 'transparent',
    name: 'Transparent AI',
    description: 'Visibility into how systems work, what data they use, and how decisions are made',
    score: 4.5,
    status: 'excellent',
    color: 'purple',
    icon: <Eye className="h-5 w-5" />,
    principles: [
      { principle: 'System design choices visible to stakeholders', implemented: true, evidence: 'API documentation, open architecture' },
      { principle: 'Open about data sources and training inputs', implemented: true, evidence: 'Source document traceability, context logs' },
      { principle: 'Clear documentation on system function', implemented: true, evidence: 'Template system docs, process flow visualization' },
      { principle: 'User insight into decision-making', implemented: true, evidence: 'Quality scores, extraction confidence, metadata' },
      { principle: 'Disclose AI use in products/services', implemented: true, evidence: 'Document metadata indicates AI generation' },
      { principle: 'Visibility into potential bias', implemented: true, evidence: 'Consistency scoring, multi-document validation' },
      { principle: 'Meaningful consent mechanisms', implemented: true, evidence: 'User authentication, approval workflows' },
      { principle: 'Communicate limitations and use cases', implemented: true, evidence: 'Quality scores, red flags, warnings' }
    ],
    gaps: [
      'Could enhance bias disclosure in UI',
      'Model limitations could be more prominently displayed'
    ]
  },
  {
    id: 'governed',
    name: 'Governed AI',
    description: 'Policies, processes, and controls for auditable, secure, predictable operation',
    score: 4.5,
    status: 'excellent',
    color: 'orange',
    icon: <FileText className="h-5 w-5" />,
    principles: [
      { principle: 'Internal governance structures', implemented: true, evidence: 'Data Governance Framework, three-tiered structure' },
      { principle: 'Clear roles and responsibilities', implemented: true, evidence: 'DGC, Stewards, Custodians defined' },
      { principle: 'Systems for auditing AI behavior', implemented: true, evidence: 'audit_logs, quality audit results' },
      { principle: 'Security protocols to prevent misuse', implemented: true, evidence: 'JWT auth, RBAC, rate limiting, Helmet' },
      { principle: 'Compliance monitoring', implemented: true, evidence: 'GDPR/SOX/HIPAA checks, quality gates' },
      { principle: 'Traceability of AI decisions', implemented: true, evidence: 'Complete audit trails, source traceability' },
      { principle: 'Lifecycle process documentation', implemented: true, evidence: 'Version control, migration tracking' }
    ],
    gaps: [
      'No third-party certification yet',
      'Could enhance regulatory review processes'
    ]
  },
  {
    id: 'explainable',
    name: 'Explainable AI',
    description: 'Understanding why AI behaves the way it does—interpretable and trustworthy decisions',
    score: 3.5,
    status: 'good',
    color: 'cyan',
    icon: <Search className="h-5 w-5" />,
    principles: [
      { principle: 'Explanations of AI decisions', implemented: true, evidence: 'Quality audit results, baseline explanations' },
      { principle: 'Interpretable models when possible', implemented: true, evidence: 'Template-based generation, rule-based checks' },
      { principle: 'Clear data/factors contributing to decisions', implemented: true, evidence: 'Source traceability, quality breakdowns' },
      { principle: 'Debugging and validation support', implemented: true, evidence: 'Comprehensive logging, error context' },
      { principle: 'Build user confidence through insights', implemented: true, evidence: 'Quality scores, source links, recommendations' },
      { principle: 'Alternative explanation methods', implemented: false, evidence: 'Complex models (GPT-4, Gemini) not fully interpretable' }
    ],
    gaps: [
      'Complex AI models remain partially opaque',
      'No alternative explanation methods for deep learning',
      'Limited explanation of model selection rationale',
      'Could enhance decision explanation UI'
    ]
  }
]

export function TrustworthyAIFramework() {
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)

  const overallScore = layers.reduce((sum, layer) => sum + layer.score, 0) / layers.length
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
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'needs-improvement':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return null
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
      green: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
      purple: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800',
      orange: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
      cyan: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/20 dark:border-cyan-800'
    }
    return colors[color] || 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
  }

  const getIconBgColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/30',
      green: 'bg-green-100 dark:bg-green-900/30',
      purple: 'bg-purple-100 dark:bg-purple-900/30',
      orange: 'bg-orange-100 dark:bg-orange-900/30',
      cyan: 'bg-cyan-100 dark:bg-cyan-900/30'
    }
    return colors[color] || 'bg-gray-100 dark:bg-gray-900/30'
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Trustworthy AI Framework Assessment</CardTitle>
              <CardDescription className="mt-2">
                Five-layer framework for building AI systems that earn trust
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
              <span>Overall Trustworthiness</span>
              <span className="font-medium">{Math.round((overallScore / 5) * 100)}%</span>
            </div>
            <Progress value={(overallScore / 5) * 100} className="h-3" />
            <p className="text-sm text-muted-foreground mt-4">
              {overallScore >= 4.5 
                ? '✅ ADPA demonstrates EXCELLENT trustworthiness. The system earns trust through comprehensive governance, transparency, and accountability.'
                : overallScore >= 3.5
                ? '✅ ADPA demonstrates STRONG trustworthiness. The system is trustworthy and ready for enterprise deployment, with identified areas for continuous improvement.'
                : '⚠️ ADPA needs to strengthen trustworthiness foundations before enterprise deployment.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Layer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {layers.map((layer) => (
          <Card 
            key={layer.id}
            className={`cursor-pointer transition-all hover:shadow-md ${getColorClasses(layer.color)} ${
              expandedLayer === layer.id ? 'border-2 border-primary' : ''
            }`}
            onClick={() => setExpandedLayer(
              expandedLayer === layer.id ? null : layer.id
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getIconBgColor(layer.color)}`}>
                    {layer.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{layer.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {layer.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{layer.score}/5</div>
                  <div className="mt-1">{getStatusBadge(layer.status)}</div>
                </div>
              </div>
            </CardHeader>
            {expandedLayer === layer.id && (
              <CardContent className="pt-0">
                <div className="space-y-4 mt-4 border-t pt-4">
                  {/* Principles */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Principles ({layer.principles.filter(p => p.implemented).length}/{layer.principles.length} Implemented)
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {layer.principles.map((principle, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          {principle.implemented ? (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className={principle.implemented ? '' : 'text-muted-foreground'}>
                              {principle.principle}
                            </span>
                            {principle.evidence && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {principle.evidence}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gaps */}
                  {layer.gaps.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Gaps & Recommendations
                      </h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {layer.gaps.map((gap, idx) => (
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
                      <span className="font-medium">{layer.score}/5</span>
                    </div>
                    <Progress value={(layer.score / 5) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Common Concerns */}
      <Card>
        <CardHeader>
          <CardTitle>Addressing Common AI Concerns</CardTitle>
          <CardDescription>
            How ADPA addresses real-world AI fears and concerns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-green-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                "Will AI take my job?"
              </h4>
              <p className="text-sm text-muted-foreground">
                Human-in-the-loop workflows, approval gates, and quality checks ensure humans remain in control. AI augments, not replaces.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-blue-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                "Is AI biased?"
              </h4>
              <p className="text-sm text-muted-foreground">
                Multi-document context, source traceability, and consistency scoring reduce bias. Explicit bias detection algorithms needed.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-purple-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                "Will AI replace humans?"
              </h4>
              <p className="text-sm text-muted-foreground">
                No. ADPA requires human approval for baselines, document publication, and critical decisions. AI assists but doesn't replace.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-orange-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-orange-600" />
                "Is AI safe?"
              </h4>
              <p className="text-sm text-muted-foreground">
                Quality gates, error handling, provider failover, and comprehensive monitoring ensure safe operation. Audit trails enable accountability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Priority actions to enhance trustworthiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">High Priority: Enhance Explainability</h4>
                <p className="text-sm text-muted-foreground">
                  Add decision explanation UI components, implement alternative explanation methods for complex models, enhance model selection rationale documentation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Medium Priority: Formalize Ethical AI</h4>
                <p className="text-sm text-muted-foreground">
                  Create explicit Ethical AI Policy document, implement bias detection algorithms, add diversity metrics tracking, create bias audit reports.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

