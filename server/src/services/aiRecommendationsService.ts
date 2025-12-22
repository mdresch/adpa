/**
 * AI Recommendations Service
 * 
 * Generates intelligent, actionable recommendations for improving project documentation
 * quality and maturity. Uses AI to analyze gaps and create specific remediation plans.
 * 
 * Part of Client Onboarding Assessment system - Priority 1.1
 * 
 * @module aiRecommendationsService
 */

import { aiService } from './aiService';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'structure' | 'completeness' | 'compliance' | 'quality' | 'consistency';
  impact_score: number; // 1-10
  effort_level: 'low' | 'medium' | 'high';
  estimated_time_hours: number;
  steps: ActionStep[];
  affected_documents: string[];
  expected_improvement: string;
  success_criteria: string[];
  resources_needed: string[];
  template_suggestions?: string[];
  best_practices: string[];
}

export interface ActionStep {
  step_number: number;
  action: string;
  details: string;
  estimated_time_minutes: number;
  tools_needed?: string[];
}

export interface RecommendationContext {
  document_type: string;
  current_score: number;
  target_score: number;
  gaps: string[];
  issues: any[];
  maturity_level: number;
  industry_benchmark?: number;
}

export interface GeneratedRecommendations {
  critical_actions: AIRecommendation[];
  high_priority_actions: AIRecommendation[];
  medium_priority_actions: AIRecommendation[];
  low_priority_actions: AIRecommendation[];
  quick_wins: AIRecommendation[];
  long_term_initiatives: AIRecommendation[];
  implementation_roadmap: ImplementationPhase[];
}

export interface ImplementationPhase {
  phase_number: number;
  phase_name: string;
  duration_weeks: number;
  recommendations: string[]; // IDs of recommendations
  expected_maturity_improvement: number;
  success_metrics: string[];
}

// ============================================================================
// MAIN RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate AI-powered recommendations for portfolio improvement
 */
export async function generateRecommendations(
  gaps: any[],
  portfolioMetrics: any,
  auditData: any[]
): Promise<GeneratedRecommendations> {
  try {
    logger.info('Generating AI recommendations', {
      gapCount: gaps.length,
      maturityLevel: portfolioMetrics.maturity_level
    });

    const recommendations: AIRecommendation[] = [];

    // Generate recommendations for each gap
    for (const gap of gaps) {
      const context: RecommendationContext = {
        document_type: gap.document_type,
        current_score: gap.avg_score,
        target_score: 90,
        gaps: [gap.recommendation],
        issues: extractIssuesForDocType(auditData, gap.document_type),
        maturity_level: portfolioMetrics.maturity_level,
        industry_benchmark: portfolioMetrics.industry_benchmark
      };

      const recommendation = await generateSingleRecommendation(context, gap.severity);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Categorize recommendations
    const critical_actions = recommendations.filter(r => r.priority === 'critical');
    const high_priority_actions = recommendations.filter(r => r.priority === 'high');
    const medium_priority_actions = recommendations.filter(r => r.priority === 'medium');
    const low_priority_actions = recommendations.filter(r => r.priority === 'low');

    // Identify quick wins (high impact, low effort)
    const quick_wins = recommendations.filter(r =>
      r.impact_score >= 7 && r.effort_level === 'low'
    );

    // Identify long-term initiatives (high effort, high impact)
    const long_term_initiatives = recommendations.filter(r =>
      r.impact_score >= 8 && r.effort_level === 'high'
    );

    // Generate implementation roadmap
    const implementation_roadmap = generateImplementationRoadmap(recommendations, portfolioMetrics);

    return {
      critical_actions,
      high_priority_actions,
      medium_priority_actions,
      low_priority_actions,
      quick_wins,
      long_term_initiatives,
      implementation_roadmap
    };

  } catch (error: any) {
    logger.error('Failed to generate AI recommendations', { error: error.message });
    throw error;
  }
}

// ============================================================================
// SINGLE RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate a single detailed recommendation using AI
 */
async function generateSingleRecommendation(
  context: RecommendationContext,
  severity: string
): Promise<AIRecommendation | null> {
  try {
    const prompt = buildRecommendationPrompt(context, severity);

    const response = await aiService.generateWithFallback({
      provider: 'openai',
      model: 'gpt-4o',
      prompt,
      temperature: 0.7,
      max_tokens: 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq']);

    const parsed = parseAIRecommendation(response.content, context, severity);
    return parsed;

  } catch (error: any) {
    logger.warn('Failed to generate single recommendation', {
      document_type: context.document_type,
      error: error.message
    });

    // Return fallback recommendation
    return generateFallbackRecommendation(context, severity);
  }
}

/**
 * Build AI prompt for recommendation generation
 */
function buildRecommendationPrompt(context: RecommendationContext, severity: string): string {
  return `You are a senior project management consultant specializing in PMBOK standards and document quality improvement.

**Current Situation:**
- Document Type: ${context.document_type}
- Current Quality Score: ${context.current_score}%
- Target Score: ${context.target_score}%
- Gap: ${context.target_score - context.current_score} points
- Maturity Level: ${context.maturity_level}/5
${context.industry_benchmark ? `- Industry Benchmark: ${context.industry_benchmark}%\n` : ''}
**Identified Issues:**
${context.gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

**Specific Problems Found:**
${context.issues.slice(0, 5).map((issue, i) => `${i + 1}. ${issue.description || issue.message || issue}`).join('\n')}

**Task:**
Generate a detailed, actionable recommendation to improve this ${context.document_type} documentation. The recommendation should be:
1. Specific and concrete (not generic advice)
2. Include step-by-step actions
3. Estimate time and effort required
4. Suggest ADPA templates or tools to use
5. Define clear success criteria

**Output Format (JSON):**
{
  "title": "Brief title (max 80 chars)",
  "description": "Detailed description of what to do and why (2-3 sentences)",
  "category": "structure|completeness|compliance|quality|consistency",
  "impact_score": 1-10,
  "effort_level": "low|medium|high",
  "estimated_time_hours": number,
  "steps": [
    {
      "step_number": 1,
      "action": "Brief action description",
      "details": "Detailed explanation and guidance",
      "estimated_time_minutes": number,
      "tools_needed": ["tool1", "tool2"]
    }
  ],
  "expected_improvement": "Specific expected outcome (e.g., 'Score will improve from 65% to 85%')",
  "success_criteria": ["criterion1", "criterion2", "criterion3"],
  "resources_needed": ["resource1", "resource2"],
  "template_suggestions": ["ADPA template names"],
  "best_practices": ["practice1", "practice2", "practice3"]
}

Generate the recommendation now:`;
}

/**
 * Parse AI response into structured recommendation
 */
function parseAIRecommendation(
  response: string,
  context: RecommendationContext,
  severity: string
): AIRecommendation | null {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      id: generateRecommendationId(context.document_type),
      title: parsed.title || `Improve ${context.document_type}`,
      description: parsed.description || '',
      priority: mapSeverityToPriority(severity),
      category: parsed.category || 'quality',
      impact_score: parsed.impact_score || calculateImpactScore(context),
      effort_level: parsed.effort_level || 'medium',
      estimated_time_hours: parsed.estimated_time_hours || estimateTimeFromEffort(parsed.effort_level),
      steps: parsed.steps || generateDefaultSteps(context),
      affected_documents: [context.document_type],
      expected_improvement: parsed.expected_improvement || `Improve score from ${context.current_score}% to ${context.target_score}%`,
      success_criteria: parsed.success_criteria || generateDefaultSuccessCriteria(context),
      resources_needed: parsed.resources_needed || ['ADPA Platform', 'Project Team', 'SME Input'],
      template_suggestions: parsed.template_suggestions || suggestTemplates(context.document_type),
      best_practices: parsed.best_practices || ['Follow PMBOK standards', 'Use consistent formatting', 'Include all required sections']
    };

  } catch (error: any) {
    logger.warn('Failed to parse AI recommendation', { error: error.message });
    return null;
  }
}

// ============================================================================
// FALLBACK & HELPER FUNCTIONS
// ============================================================================

/**
 * Generate fallback recommendation when AI fails
 */
function generateFallbackRecommendation(
  context: RecommendationContext,
  severity: string
): AIRecommendation {
  const gapPoints = context.target_score - context.current_score;
  const priority = mapSeverityToPriority(severity);

  return {
    id: generateRecommendationId(context.document_type),
    title: `Enhance ${context.document_type} Documentation Quality`,
    description: `Your ${context.document_type} documentation currently scores ${context.current_score}%, which is ${gapPoints} points below the target of ${context.target_score}%. This recommendation provides a structured approach to systematically improve quality, completeness, and compliance with PMBOK standards.`,
    priority,
    category: determineCategory(context),
    impact_score: calculateImpactScore(context),
    effort_level: determineEffortLevel(gapPoints),
    estimated_time_hours: estimateTimeFromGap(gapPoints),
    steps: generateDefaultSteps(context),
    affected_documents: [context.document_type],
    expected_improvement: `Improve ${context.document_type} quality score from ${context.current_score}% to ${context.target_score}%`,
    success_criteria: generateDefaultSuccessCriteria(context),
    resources_needed: ['ADPA Templates', 'Quality Audit Tool', 'PMBOK Guide', 'Project Team'],
    template_suggestions: suggestTemplates(context.document_type),
    best_practices: generateBestPractices(context.document_type)
  };
}

/**
 * Generate default action steps
 */
function generateDefaultSteps(context: RecommendationContext): ActionStep[] {
  const steps: ActionStep[] = [
    {
      step_number: 1,
      action: 'Review Current Documentation',
      details: `Conduct a thorough review of existing ${context.document_type} documentation to understand current state, identify specific gaps, and document areas needing improvement.`,
      estimated_time_minutes: 30,
      tools_needed: ['ADPA Quality Audit Tool']
    },
    {
      step_number: 2,
      action: 'Select Appropriate ADPA Template',
      details: `Choose the most suitable ADPA template for ${context.document_type} that aligns with PMBOK standards and industry best practices.`,
      estimated_time_minutes: 15,
      tools_needed: ['ADPA Template Library']
    },
    {
      step_number: 3,
      action: 'Fill in Missing Content',
      details: 'Systematically address each identified gap by adding missing sections, expanding insufficient content, and ensuring all required elements are present and complete.',
      estimated_time_minutes: 120,
      tools_needed: ['ADPA Document Generator', 'AI Content Assistant']
    },
    {
      step_number: 4,
      action: 'Enhance Quality and Consistency',
      details: 'Review and refine content for clarity, consistency, professional quality, and alignment with organizational standards and PMBOK guidelines.',
      estimated_time_minutes: 60,
      tools_needed: ['ADPA Quality Checker', 'Style Guide']
    },
    {
      step_number: 5,
      action: 'Validate and Test',
      details: 'Run ADPA quality audit on updated documentation to verify improvements, ensure all gaps are addressed, and confirm the document meets target quality standards.',
      estimated_time_minutes: 15,
      tools_needed: ['ADPA Quality Audit Tool']
    }
  ];

  return steps;
}

/**
 * Generate default success criteria
 */
function generateDefaultSuccessCriteria(context: RecommendationContext): string[] {
  return [
    `${context.document_type} quality score reaches ${context.target_score}% or higher`,
    'All critical gaps identified in audit are resolved',
    'Document includes all required sections per PMBOK standards',
    'Content is complete, consistent, and professionally formatted',
    'Stakeholder review confirms document meets project needs'
  ];
}

/**
 * Suggest appropriate templates for document type
 */
function suggestTemplates(documentType: string): string[] {
  const templateMap: Record<string, string[]> = {
    'Project Charter': ['PMBOK Project Charter Template', 'Agile Charter Template', 'Executive Charter Template'],
    'Scope Statement': ['PMBOK Scope Statement Template', 'Detailed Scope Template', 'Work Breakdown Structure Template'],
    'Risk Register': ['PMBOK Risk Register Template', 'Enterprise Risk Register', 'Agile Risk Board Template'],
    'Schedule': ['PMBOK Schedule Template', 'Gantt Chart Template', 'Agile Sprint Schedule'],
    'Budget': ['PMBOK Cost Management Plan', 'Budget Template', 'Cost Baseline Template'],
    'Requirements': ['Business Requirements Template', 'BABOK Requirements Template', 'User Story Template'],
    'Stakeholder Register': ['PMBOK Stakeholder Register', 'Stakeholder Analysis Template'],
    'Communication Plan': ['PMBOK Communication Plan', 'Stakeholder Communication Matrix'],
    'Quality Plan': ['PMBOK Quality Management Plan', 'Quality Assurance Template'],
    'Resource Plan': ['PMBOK Resource Management Plan', 'Resource Allocation Template']
  };

  return templateMap[documentType] || ['ADPA Standard Template', 'PMBOK Generic Template'];
}

/**
 * Generate best practices for document type
 */
function generateBestPractices(documentType: string): string[] {
  const practicesMap: Record<string, string[]> = {
    'Project Charter': [
      'Clearly define project objectives and success criteria',
      'Identify all key stakeholders and their roles',
      'Document high-level scope boundaries and exclusions',
      'Include measurable project success metrics',
      'Obtain formal stakeholder sign-off'
    ],
    'Risk Register': [
      'Identify risks across all project knowledge areas',
      'Assess both probability and impact for each risk',
      'Define specific mitigation strategies',
      'Assign risk owners with clear accountability',
      'Review and update risks regularly throughout project lifecycle'
    ],
    'Scope Statement': [
      'Define detailed project deliverables with acceptance criteria',
      'Document clear scope boundaries and exclusions',
      'Break down scope into manageable work packages',
      'Link scope to project objectives and success criteria',
      'Establish change control process for scope modifications'
    ]
  };

  return practicesMap[documentType] || [
    'Follow PMBOK standards and organizational templates',
    'Ensure completeness and accuracy of all information',
    'Maintain consistency with related project documents',
    'Use clear, professional language appropriate for stakeholders',
    'Review and update regularly as project evolves'
  ];
}

// ============================================================================
// IMPLEMENTATION ROADMAP GENERATION
// ============================================================================

/**
 * Generate phased implementation roadmap
 */
function generateImplementationRoadmap(
  recommendations: AIRecommendation[],
  portfolioMetrics: any
): ImplementationPhase[] {
  const phases: ImplementationPhase[] = [];

  // Phase 1: Critical Actions (Week 1-2)
  const criticalRecs = recommendations.filter(r => r.priority === 'critical');
  if (criticalRecs.length > 0) {
    phases.push({
      phase_number: 1,
      phase_name: 'Address Critical Gaps',
      duration_weeks: 2,
      recommendations: criticalRecs.map(r => r.id),
      expected_maturity_improvement: 1.0,
      success_metrics: [
        'All critical-priority recommendations completed',
        'Portfolio average score improves by 10-15 points',
        'No documents scoring below 60%'
      ]
    });
  }

  // Phase 2: High Priority + Quick Wins (Week 3-4)
  const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
  const quickWins = recommendations.filter(r => r.impact_score >= 7 && r.effort_level === 'low');
  if (highPriorityRecs.length > 0 || quickWins.length > 0) {
    phases.push({
      phase_number: 2,
      phase_name: 'High-Impact Improvements',
      duration_weeks: 2,
      recommendations: [...new Set([...highPriorityRecs.map(r => r.id), ...quickWins.map(r => r.id)])],
      expected_maturity_improvement: 0.5,
      success_metrics: [
        'All high-priority recommendations completed',
        'All quick-win opportunities captured',
        'Portfolio average score reaches 75%+'
      ]
    });
  }

  // Phase 3: Medium Priority (Week 5-8)
  const mediumRecs = recommendations.filter(r => r.priority === 'medium');
  if (mediumRecs.length > 0) {
    phases.push({
      phase_number: 3,
      phase_name: 'Systematic Enhancement',
      duration_weeks: 4,
      recommendations: mediumRecs.map(r => r.id),
      expected_maturity_improvement: 0.5,
      success_metrics: [
        'All medium-priority recommendations completed',
        'Portfolio average score reaches 85%+',
        `Maturity level improves to ${Math.min(5, portfolioMetrics.maturity_level + 1)}`
      ]
    });
  }

  // Phase 4: Continuous Improvement (Ongoing)
  phases.push({
    phase_number: 4,
    phase_name: 'Continuous Improvement & Monitoring',
    duration_weeks: 0, // Ongoing
    recommendations: recommendations.filter(r => r.priority === 'low').map(r => r.id),
    expected_maturity_improvement: 0.5,
    success_metrics: [
      'Regular quality audits conducted monthly',
      'All documentation maintained at 85%+ quality',
      'Portfolio maturity level sustained or improved',
      'Best practices consistently applied across all documents'
    ]
  });

  return phases;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRecommendationId(documentType: string): string {
  return `REC-${documentType.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`;
}

function mapSeverityToPriority(severity: string): 'critical' | 'high' | 'medium' | 'low' {
  const map: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low'
  };
  return map[severity] || 'medium';
}

function calculateImpactScore(context: RecommendationContext): number {
  const gapPoints = context.target_score - context.current_score;
  if (gapPoints >= 30) return 10;
  if (gapPoints >= 20) return 8;
  if (gapPoints >= 15) return 7;
  if (gapPoints >= 10) return 6;
  return 5;
}

function determineCategory(context: RecommendationContext): 'structure' | 'completeness' | 'compliance' | 'quality' | 'consistency' {
  if (context.current_score < 50) return 'completeness';
  if (context.current_score < 65) return 'structure';
  if (context.current_score < 75) return 'compliance';
  if (context.current_score < 85) return 'quality';
  return 'consistency';
}

function determineEffortLevel(gapPoints: number): 'low' | 'medium' | 'high' {
  if (gapPoints >= 30) return 'high';
  if (gapPoints >= 15) return 'medium';
  return 'low';
}

function estimateTimeFromGap(gapPoints: number): number {
  if (gapPoints >= 30) return 8;
  if (gapPoints >= 20) return 5;
  if (gapPoints >= 10) return 3;
  return 2;
}

function estimateTimeFromEffort(effortLevel: string): number {
  const map: Record<string, number> = {
    'low': 2,
    'medium': 4,
    'high': 8
  };
  return map[effortLevel] || 4;
}

function extractIssuesForDocType(auditData: any[], documentType: string): any[] {
  const relevantAudits = auditData.filter(audit =>
    (audit.document_type || audit.framework_used || 'General') === documentType
  );

  const allIssues: any[] = [];
  for (const audit of relevantAudits) {
    let issues = audit.issues || audit.gaps_identified || [];
    if (typeof issues === 'string') {
      try {
        issues = JSON.parse(issues);
      } catch (e) {
        issues = [];
      }
    }
    if (Array.isArray(issues)) {
      allIssues.push(...issues);
    }
  }

  return allIssues;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const aiRecommendationsService = {
  generateRecommendations
};
