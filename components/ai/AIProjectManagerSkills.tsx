"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  AlertTriangle, 
  Database,
  Brain,
  Shield,
  Users,
  RefreshCw,
  Code,
  Wrench,
  TrendingUp,
  Info
} from '@/components/ui/icons-shim'

interface Skill {
  id: string
  name: string
  description: string
  score: number
  status: 'excellent' | 'good' | 'needs-improvement'
  capabilities: {
    capability: string
    supported: boolean
    evidence?: string
  }[]
  gaps: string[]
  icon: React.ReactNode
  color: string
}

const skills: Skill[] = [
  {
    id: 'data-literacy',
    name: 'Data Literacy and Awareness',
    description: 'Understanding how data works—sourcing, labeling, cleaning, quality, and bias',
    score: 4.5,
    status: 'excellent',
    color: 'blue',
    icon: <Database className="h-5 w-5" />,
    capabilities: [
      { capability: 'Data sourcing and traceability', supported: true, evidence: 'Source document traceability on all entities' },
      { capability: 'Data quality understanding', supported: true, evidence: 'Quality assessment includes data quality metrics' },
      { capability: 'Bias awareness', supported: true, evidence: 'Multi-document context reduces bias' },
      { capability: 'Collaboration with data teams', supported: true, evidence: 'API-first design, export capabilities' },
      { capability: 'Data labeling workflow', supported: false }
    ],
    gaps: [
      'No explicit data labeling workflow',
      'Could enhance data quality visualization'
    ]
  },
  {
    id: 'critical-thinking',
    name: 'Critical Thinking and Problem Solving',
    description: 'Staying nimble, making quick decisions, analyzing evolving results, pivoting when needed',
    score: 4.5,
    status: 'excellent',
    color: 'purple',
    icon: <Brain className="h-5 w-5" />,
    capabilities: [
      { capability: 'Analyzing evolving results', supported: true, evidence: 'Quality scores track improvement over time' },
      { capability: 'Making judgment calls', supported: true, evidence: 'Quality gates provide decision support' },
      { capability: 'Pivoting quickly', supported: true, evidence: 'Template customization, document regeneration' },
      { capability: 'Problem solving tools', supported: true, evidence: 'Drift detection, quality assessment diagnostics' }
    ],
    gaps: [
      'Could enhance decision support algorithms',
      'No automated problem-solving suggestions'
    ]
  },
  {
    id: 'trustworthy-ai',
    name: 'Trustworthy AI Practices',
    description: 'Ensuring ethical considerations embedded throughout project lifecycle',
    score: 4.5,
    status: 'excellent',
    color: 'green',
    icon: <Shield className="h-5 w-5" />,
    capabilities: [
      { capability: 'Ethical risk detection', supported: true, evidence: 'Quality assessment includes bias detection' },
      { capability: 'Fairness and accountability', supported: true, evidence: 'Complete audit trails, user attribution' },
      { capability: 'Ethical review checkpoints', supported: true, evidence: 'Baseline approval workflow, quality gates' },
      { capability: 'Trustworthy AI Framework', supported: true, evidence: 'Five-layer framework implementation' },
      { capability: 'Explicit ethical AI policy', supported: false }
    ],
    gaps: [
      'No explicit ethical AI policy document',
      'Could enhance bias detection algorithms'
    ]
  },
  {
    id: 'communication',
    name: 'Communication Across Technical and Business Teams',
    description: 'Bridging communication, setting realistic expectations, ensuring alignment',
    score: 4.5,
    status: 'excellent',
    color: 'orange',
    icon: <Users className="h-5 w-5" />,
    capabilities: [
      { capability: 'Bridging communication', supported: true, evidence: 'Visual dashboards translate technical to business' },
      { capability: 'Setting realistic expectations', supported: true, evidence: 'Quality scores, cost tracking, time estimates' },
      { capability: 'Ensuring alignment', supported: true, evidence: 'Stakeholder management, approval workflows' },
      { capability: 'Cross-functional collaboration', supported: true, evidence: 'RBAC, real-time updates, integrations' }
    ],
    gaps: [
      'Could enhance stakeholder communication templates',
      'No automated alignment reporting'
    ]
  },
  {
    id: 'agile',
    name: 'Agile and Iterative Delivery',
    description: 'Managing evolving scope, prioritizing iterations, balancing experimentation',
    score: 4.5,
    status: 'excellent',
    color: 'cyan',
    icon: <RefreshCw className="h-5 w-5" />,
    capabilities: [
      { capability: 'Evolving scope management', supported: true, evidence: 'Template customization, version control' },
      { capability: 'Prioritizing iterations', supported: true, evidence: 'Quality scores guide prioritization' },
      { capability: 'Balancing experimentation', supported: true, evidence: 'Template lifecycle, quality gates' },
      { capability: 'Short cycles and frequent testing', supported: true, evidence: 'Rapid generation, quality gates' },
      { capability: 'Scrum/Kanban integration', supported: false }
    ],
    gaps: [
      'No explicit Scrum/Kanban integration',
      'Could enhance iteration planning tools'
    ]
  },
  {
    id: 'ai-lifecycle',
    name: 'Understanding AI Technologies and Lifecycle',
    description: 'Understanding problem definition, data collection, training, evaluation, operationalization',
    score: 4,
    status: 'good',
    color: 'indigo',
    icon: <Code className="h-5 w-5" />,
    capabilities: [
      { capability: 'Problem definition', supported: true, evidence: 'Template system structures problems' },
      { capability: 'Data collection and preparation', supported: true, evidence: 'Multi-document context gathering' },
      { capability: 'Model training and evaluation', supported: true, evidence: 'Quality assessment, provider comparison' },
      { capability: 'Operationalization and monitoring', supported: true, evidence: 'Production deployment, real-time monitoring' },
      { capability: 'PMI-CPMAI methodology integration', supported: false }
    ],
    gaps: [
      'No direct model training capabilities',
      'Could enhance lifecycle documentation',
      'No explicit PMI-CPMAI methodology integration'
    ]
  },
  {
    id: 'tool-proficiency',
    name: 'Tool Proficiency and Hands-On Project Management',
    description: 'Proficiency with PM tools, version control, pipeline management, rapid documentation',
    score: 4.5,
    status: 'excellent',
    color: 'teal',
    icon: <Wrench className="h-5 w-5" />,
    capabilities: [
      { capability: 'Project management tools', supported: true, evidence: 'Comprehensive PM system, hierarchy support' },
      { capability: 'Data workflow support', supported: true, evidence: 'Document workflows, approval workflows' },
      { capability: 'Version control', supported: true, evidence: 'Document versioning, template versioning' },
      { capability: 'Pipeline management', supported: true, evidence: 'Multi-stage pipeline, job queue system' },
      { capability: 'Rapid documentation', supported: true, evidence: '30-second generation, bulk export' }
    ],
    gaps: [
      'Could enhance Git integration',
      'No direct CI/CD pipeline integration'
    ]
  }
]

export function AIProjectManagerSkills() {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)

  const overallScore = skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length
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

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
      purple: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800',
      green: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
      orange: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
      cyan: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/20 dark:border-cyan-800',
      indigo: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800',
      teal: 'bg-teal-50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800'
    }
    return colors[color] || 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
  }

  const getIconBgColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/30',
      purple: 'bg-purple-100 dark:bg-purple-900/30',
      green: 'bg-green-100 dark:bg-green-900/30',
      orange: 'bg-orange-100 dark:bg-orange-900/30',
      cyan: 'bg-cyan-100 dark:bg-cyan-900/30',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
      teal: 'bg-teal-100 dark:bg-teal-900/30'
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
              <CardTitle className="text-2xl">AI Project Manager Skills Support</CardTitle>
              <CardDescription className="mt-2">
                Seven essential skills for leading AI projects with confidence
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
              <span>Overall Skills Support</span>
              <span className="font-medium">{Math.round((overallScore / 5) * 100)}%</span>
            </div>
            <Progress value={(overallScore / 5) * 100} className="h-3" />
            <p className="text-sm text-muted-foreground mt-4">
              {overallScore >= 4.5 
                ? '✅ ADPA provides EXCELLENT support for AI project managers. The platform is well-equipped to support complex AI initiatives with confidence.'
                : overallScore >= 3.5
                ? '✅ ADPA provides STRONG support for AI project managers. The platform bridges technical and business teams while supporting agile, iterative AI project delivery.'
                : '⚠️ ADPA needs to strengthen skills support before enterprise AI project deployment.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Unique AI Project Characteristics */}
      <Card>
        <CardHeader>
          <CardTitle>Addressing Unique AI Project Challenges</CardTitle>
          <CardDescription>
            How ADPA addresses the unique characteristics of AI projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-green-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Data-Centric Foundations
              </h4>
              <p className="text-sm text-muted-foreground">
                Source document traceability, multi-document context, data governance framework
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-blue-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Iterative Development
              </h4>
              <p className="text-sm text-muted-foreground">
                Template version control, quality gates, continuous refinement, analytics tracking
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-purple-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                Shifting Goals
              </h4>
              <p className="text-sm text-muted-foreground">
                Exploratory generation, template customization, context-aware adaptation
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-orange-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-orange-600" />
                Context-Sensitive Results
              </h4>
              <p className="text-sm text-muted-foreground">
                Multi-document context engine, project-specific variables, stakeholder-aware generation
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-cyan-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-cyan-600" />
                Change Sensitivity
              </h4>
              <p className="text-sm text-muted-foreground">
                Drift detection, baseline comparison, version control, quality monitoring
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-indigo-50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
                Trust Requirement
              </h4>
              <p className="text-sm text-muted-foreground">
                Five-layer Trustworthy AI Framework, audit trails, source traceability, quality gates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => (
          <Card 
            key={skill.id}
            className={`cursor-pointer transition-all hover:shadow-md ${getColorClasses(skill.color)} ${
              expandedSkill === skill.id ? 'border-2 border-primary' : ''
            }`}
            onClick={() => setExpandedSkill(
              expandedSkill === skill.id ? null : skill.id
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getIconBgColor(skill.color)}`}>
                    {skill.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{skill.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {skill.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{skill.score}/5</div>
                  <div className="mt-1">{getStatusBadge(skill.status)}</div>
                </div>
              </div>
            </CardHeader>
            {expandedSkill === skill.id && (
              <CardContent className="pt-0">
                <div className="space-y-4 mt-4 border-t pt-4">
                  {/* Capabilities */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Capabilities ({skill.capabilities.filter(c => c.supported).length}/{skill.capabilities.length} Supported)
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {skill.capabilities.map((capability, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          {capability.supported ? (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className={capability.supported ? '' : 'text-muted-foreground'}>
                              {capability.capability}
                            </span>
                            {capability.evidence && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {capability.evidence}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gaps */}
                  {skill.gaps.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Gaps & Opportunities
                      </h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {skill.gaps.map((gap, idx) => (
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
                      <span className="font-medium">{skill.score}/5</span>
                    </div>
                    <Progress value={(skill.score / 5) * 100} className="h-2" />
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
            Priority actions to enhance AI project manager skills support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Medium Priority: Enhance AI Lifecycle Understanding</h4>
                <p className="text-sm text-muted-foreground">
                  Integrate PMI-CPMAI methodology explicitly, add lifecycle stage tracking, create lifecycle documentation templates, enhance methodology guidance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Low Priority: Data Labeling Workflow</h4>
                <p className="text-sm text-muted-foreground">
                  Integrate with data labeling tools, create data labeling templates, add data quality visualization.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

