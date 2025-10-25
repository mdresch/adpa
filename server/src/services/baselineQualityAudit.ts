/**
 * Baseline Quality Audit & Compliance System
 * Automatically detects logical flaws, contradictions, and PMBOK compliance issues
 */

import { logger } from '../utils/logger'

export interface QualityAuditResult {
  overall_quality_score: number
  compliance_level: 'excellent' | 'good' | 'adequate' | 'poor' | 'critical'
  red_flags: RedFlag[]
  warnings: Warning[]
  recommendations: Recommendation[]
  feasibility_score: number
  pmbok_compliance_score: number
  automated_checks: AutomatedCheck[]
}

export interface RedFlag {
  id: string
  severity: 'critical' | 'high'
  category: string
  title: string
  description: string
  evidence: string[]
  impact: string
  required_action: string
  blocking: boolean // Blocks approval if true
}

export interface Warning {
  id: string
  category: string
  title: string
  description: string
  recommendation: string
}

export interface Recommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  action: string
  rationale: string
  impact: string
  effort_estimate: string
}

export interface AutomatedCheck {
  check_name: string
  check_type: string
  passed: boolean
  score: number
  details: string
  recommendations?: string[]
}

/**
 * Perform comprehensive quality audit on extracted baseline
 */
export async function performBaselineQualityAudit(
  baselineData: any,
  documentCorpus: any[]
): Promise<QualityAuditResult> {
  logger.info('🔍 Starting comprehensive baseline quality audit')
  
  const redFlags: RedFlag[] = []
  const warnings: Warning[] = []
  const recommendations: Recommendation[] = []
  const automatedChecks: AutomatedCheck[] = []

  // Check 1: Consistency Score Threshold
  const consistencyCheck = checkConsistencyThreshold(baselineData)
  automatedChecks.push(consistencyCheck)
  if (!consistencyCheck.passed) {
    redFlags.push(...generateConsistencyRedFlags(baselineData, consistencyCheck))
  }

  // Check 2: Scope/Value Alignment
  const scopeValueCheck = checkScopeValueAlignment(baselineData)
  automatedChecks.push(scopeValueCheck)
  if (!scopeValueCheck.passed) {
    redFlags.push(...generateScopeValueRedFlags(baselineData, scopeValueCheck))
  }

  // Check 3: Success Criteria Feasibility
  const successCriteriaCheck = checkSuccessCriteriaFeasibility(baselineData)
  automatedChecks.push(successCriteriaCheck)
  if (!successCriteriaCheck.passed) {
    warnings.push(...generateSuccessCriteriaWarnings(baselineData, successCriteriaCheck))
  }

  // Check 4: Cost/Schedule Integration
  const costScheduleCheck = checkCostScheduleIntegration(baselineData)
  automatedChecks.push(costScheduleCheck)
  if (!costScheduleCheck.passed) {
    redFlags.push(...generateCostScheduleRedFlags(baselineData, costScheduleCheck))
  }

  // Check 5: Document Type Appropriateness
  const documentTypeCheck = checkDocumentTypeAppropriateness(baselineData, documentCorpus)
  automatedChecks.push(documentTypeCheck)
  if (documentTypeCheck.score < 50) {
    warnings.push(...generateDocumentTypeWarnings(documentTypeCheck))
  }

  // Check 6: PMBOK Compliance
  const pmbokCheck = checkPMBOKCompliance(baselineData)
  automatedChecks.push(pmbokCheck)

  // Calculate overall scores
  const feasibilityScore = calculateFeasibilityScore(automatedChecks)
  const pmbokComplianceScore = pmbokCheck.score
  const overallQualityScore = calculateOverallQualityScore(automatedChecks, redFlags.length, warnings.length)
  const complianceLevel = getComplianceLevel(overallQualityScore, redFlags.length)

  // Generate recommendations
  recommendations.push(...generateRecommendations(automatedChecks, redFlags, warnings))

  logger.info('✅ Quality audit complete', {
    overallQualityScore,
    redFlagsCount: redFlags.length,
    warningsCount: warnings.length,
    feasibilityScore,
    pmbokComplianceScore
  })

  return {
    overall_quality_score: overallQualityScore,
    compliance_level: complianceLevel,
    red_flags: redFlags,
    warnings: warnings,
    recommendations: recommendations,
    feasibility_score: feasibilityScore,
    pmbok_compliance_score: pmbokComplianceScore,
    automated_checks: automatedChecks
  }
}

/**
 * Check 1: Consistency Score Threshold
 */
function checkConsistencyThreshold(baselineData: any): AutomatedCheck {
  const consistencyScore = baselineData.consistency_score || 0
  const threshold = 0.6 // 60% stored as 0-1 scale
  
  return {
    check_name: 'Consistency Score Threshold',
    check_type: 'consistency',
    passed: consistencyScore >= threshold,
    score: consistencyScore,
    details: consistencyScore >= threshold
      ? `Consistency score ${Math.round(consistencyScore * 100)}% meets threshold (>=${Math.round(threshold * 100)}%)`
      : `Consistency score ${Math.round(consistencyScore * 100)}% below threshold (>=${Math.round(threshold * 100)}%). Indicates contradictions or gaps in baseline data.`,
    recommendations: consistencyScore < threshold 
      ? ['Review baseline for contradictions', 'Validate scope aligns with value proposition', 'Ensure success criteria are achievable with defined scope']
      : []
  }
}

function generateConsistencyRedFlags(baselineData: any, check: AutomatedCheck): RedFlag[] {
  const flags: RedFlag[] = []
  
  // consistency_score is stored as 0-1 (e.g., 1.0 = 100%)
  if (baselineData.consistency_score < 0.5) {
    flags.push({
      id: 'RF-CONSISTENCY-CRITICAL',
      severity: 'critical',
      category: 'Data Quality',
      title: 'Critical Consistency Issues Detected',
      description: `Baseline consistency score is ${Math.round(baselineData.consistency_score * 100)}%, indicating severe contradictions or logical flaws in the baseline data.`,
      evidence: [
        `Consistency score: ${Math.round(baselineData.consistency_score * 100)}% (threshold: 60%)`,
        'Multiple contradictions detected between baseline components',
        'Scope, value proposition, or success criteria may be misaligned'
      ],
      impact: 'Baseline approval is NOT RECOMMENDED. High risk of project failure due to internal contradictions.',
      required_action: 'Conduct detailed review to identify and resolve contradictions. Common issues: scope/value misalignment, unachievable success criteria, cost/schedule conflicts.',
      blocking: true
    })
  } else if (baselineData.consistency_score < 0.6) {
    flags.push({
      id: 'RF-CONSISTENCY-HIGH',
      severity: 'high',
      category: 'Data Quality',
      title: 'Consistency Issues Require Review',
      description: `Baseline consistency score is ${Math.round(baselineData.consistency_score * 100)}%, below acceptable threshold. Some contradictions detected.`,
      evidence: [
        `Consistency score: ${Math.round(baselineData.consistency_score * 100)}% (threshold: 60%)`,
        'Minor contradictions present in baseline data'
      ],
      impact: 'Conditional approval possible, but contradictions should be resolved.',
      required_action: 'Review baseline components for alignment. Focus on scope/value proposition, success criteria feasibility, and cost/schedule integration.',
      blocking: false
    })
  }
  
  return flags
}

/**
 * Check 2: Scope/Value Alignment
 */
function checkScopeValueAlignment(baselineData: any): AutomatedCheck {
  const scope = baselineData.scope_baseline || {}
  const successCriteria = baselineData.success_criteria || {}
  
  // Extract key terms from value proposition
  const valuePropLower = JSON.stringify(successCriteria).toLowerCase()
  const scopeLower = JSON.stringify(scope).toLowerCase()
  
  // Check for common misalignments
  const misalignments = []
  
  // Check 1: Automation promised but manual work in scope
  if (valuePropLower.includes('automat') || valuePropLower.includes('time sav')) {
    if (scopeLower.includes('manual') && !scopeLower.includes('manual re-entry of data (explicitly stated as a high-priority risk to avoid)')) {
      misalignments.push('Automation promised in value, but manual work mentioned in scope')
    }
  }
  
  // Check 2: Real-time promised but no integration
  if (valuePropLower.includes('real-time') || valuePropLower.includes('real time')) {
    if (!scopeLower.includes('integration') && !scopeLower.includes('api')) {
      misalignments.push('Real-time capability promised, but no integration layer in scope')
    }
  }
  
  // Check 3: Data-driven insights without data source
  if (valuePropLower.includes('data-driven') || valuePropLower.includes('insights')) {
    if (scopeLower.includes('out of scope') && scopeLower.includes('detailed')) {
      misalignments.push('Data-driven insights promised, but detailed data access out of scope')
    }
  }
  
  const alignmentScore = misalignments.length === 0 ? 100 : Math.max(0, 100 - (misalignments.length * 30))
  
  return {
    check_name: 'Scope/Value Alignment',
    check_type: 'feasibility',
    passed: misalignments.length === 0,
    score: alignmentScore,
    details: misalignments.length === 0
      ? 'Scope aligns with value proposition and success criteria'
      : `${misalignments.length} misalignment(s) detected: ${misalignments.join('; ')}`,
    recommendations: misalignments.length > 0
      ? ['Revise scope to support value proposition', 'Add integration requirements if automation is promised', 'Ensure success criteria are achievable with defined scope']
      : []
  }
}

function generateScopeValueRedFlags(baselineData: any, check: AutomatedCheck): RedFlag[] {
  const flags: RedFlag[] = []
  
  if (check.score < 70) {
    flags.push({
      id: 'RF-SCOPE-VALUE-MISALIGNMENT',
      severity: 'critical',
      category: 'Feasibility',
      title: 'Scope Does Not Support Value Proposition',
      description: 'The defined project scope cannot deliver the stated benefits and value proposition. Critical misalignment detected.',
      evidence: [
        check.details,
        'Scope boundaries exclude capabilities needed for success criteria',
        'Value proposition requires features not included in deliverables'
      ],
      impact: 'Project will fail to deliver promised value. Stakeholder dissatisfaction, wasted investment, reputational risk.',
      required_action: 'EITHER: Expand scope to include required capabilities (e.g., deep integration, automation) OR: Reduce value proposition claims to match actual scope.',
      blocking: true
    })
  }
  
  return flags
}

/**
 * Check 3: Success Criteria Feasibility
 */
function checkSuccessCriteriaFeasibility(baselineData: any): AutomatedCheck {
  const scope = baselineData.scope_baseline || {}
  const technical = baselineData.technical_baseline || {}
  const successCriteria = baselineData.success_criteria || {}
  
  const issues = []
  
  const criteriaStr = JSON.stringify(successCriteria).toLowerCase()
  const scopeStr = JSON.stringify(scope).toLowerCase()
  const techStr = JSON.stringify(technical).toLowerCase()
  
  // Check for quantitative KPIs without measurement capability
  if (criteriaStr.includes('%') || criteriaStr.includes('percent')) {
    if (!scopeStr.includes('metric') && !scopeStr.includes('measurement') && !techStr.includes('analytics')) {
      issues.push('Quantitative KPIs defined, but no measurement system in scope')
    }
  }
  
  // Check for time-based KPIs without timeline
  if (criteriaStr.includes('time') || criteriaStr.includes('hours') || criteriaStr.includes('days')) {
    if (!baselineData.timeline_baseline || Object.keys(baselineData.timeline_baseline).length === 0) {
      issues.push('Time-based success criteria without formal timeline baseline')
    }
  }
  
  // Check for cost-based KPIs without cost baseline
  if (criteriaStr.includes('roi') || criteriaStr.includes('savings') || criteriaStr.includes('$')) {
    if (!baselineData.cost_baseline || !baselineData.cost_baseline.total_budget) {
      issues.push('Financial success criteria without formal cost baseline')
    }
  }
  
  const feasibilityScore = issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 25))
  
  return {
    check_name: 'Success Criteria Feasibility',
    check_type: 'feasibility',
    passed: issues.length === 0,
    score: feasibilityScore,
    details: issues.length === 0
      ? 'All success criteria are feasible with defined scope and baselines'
      : `${issues.length} feasibility issue(s): ${issues.join('; ')}`,
    recommendations: issues.length > 0
      ? ['Add measurement systems to scope', 'Create formal cost/schedule baselines', 'Align KPIs with available data']
      : []
  }
}

function generateSuccessCriteriaWarnings(baselineData: any, check: AutomatedCheck): Warning[] {
  const warnings: Warning[] = []
  
  if (check.score < 75) {
    warnings.push({
      id: 'WARN-SUCCESS-CRITERIA',
      category: 'Success Criteria',
      title: 'Success Criteria May Not Be Achievable',
      description: check.details,
      recommendation: 'Ensure success criteria can be measured and achieved with the defined scope. Add measurement systems or revise criteria.'
    })
  }
  
  return warnings
}

/**
 * Check 4: Cost/Schedule Integration
 */
function checkCostScheduleIntegration(baselineData: any): AutomatedCheck {
  const hasCost = baselineData.cost_baseline && baselineData.cost_baseline.total_budget
  const hasSchedule = baselineData.timeline_baseline && baselineData.timeline_baseline.duration_months
  const hasIntegration = hasCost && hasSchedule
  
  let score = 0
  let details = ''
  
  if (hasIntegration) {
    score = 100
    details = 'Cost and schedule baselines are integrated (CPI/SPI measurable)'
  } else if (hasCost && !hasSchedule) {
    score = 50
    details = 'Cost baseline exists but no formal schedule (CPI measurable, SPI not measurable)'
  } else if (!hasCost && hasSchedule) {
    score = 50
    details = 'Schedule baseline exists but no formal cost (SPI measurable, CPI not measurable)'
  } else {
    score = 0
    details = 'Neither cost nor schedule baselines are formalized (CPI/SPI unmeasurable - PMBOK violation)'
  }
  
  return {
    check_name: 'Cost/Schedule Integration',
    check_type: 'pmbok_compliance',
    passed: hasIntegration,
    score: score,
    details: details,
    recommendations: !hasIntegration
      ? ['Create formal Cost Management Plan with approved budget', 'Create formal Schedule Management Plan with work breakdown', 'Establish Performance Measurement Baseline (PMB)']
      : []
  }
}

function generateCostScheduleRedFlags(baselineData: any, check: AutomatedCheck): RedFlag[] {
  const flags: RedFlag[] = []
  
  if (check.score === 0) {
    flags.push({
      id: 'RF-NO-COST-SCHEDULE-BASELINE',
      severity: 'critical',
      category: 'PMBOK Compliance',
      title: 'Cost and Schedule Baselines Missing',
      description: 'Neither cost nor schedule baselines are formally defined. Performance Measurement Baseline (PMB) cannot be established.',
      evidence: [
        'No approved budget in cost baseline',
        'No formal schedule with work breakdown',
        'CPI and SPI metrics unmeasurable',
        'Violates PMBOK 7 Stewardship principle'
      ],
      impact: 'Cannot monitor project performance. High risk of budget overruns and schedule delays. Violates PMBOK 7 requirements for project baselines.',
      required_action: 'CRITICAL: Create formal Project Charter or Business Case with approved budget and schedule. Cannot proceed to execution without PMB.',
      blocking: true
    })
  } else if (check.score < 100) {
    flags.push({
      id: 'RF-INCOMPLETE-PMB',
      severity: 'high',
      category: 'PMBOK Compliance',
      title: 'Incomplete Performance Measurement Baseline',
      description: check.details,
      evidence: [
        check.score === 50 && !baselineData.cost_baseline?.total_budget ? 'Cost baseline missing' : 'Schedule baseline incomplete',
        'Cannot calculate full Earned Value Management metrics'
      ],
      impact: 'Limited ability to monitor project performance. Risk of undetected variances.',
      required_action: 'Complete the missing baseline component (cost or schedule) before approval.',
      blocking: false
    })
  }
  
  return flags
}

/**
 * Check 5: Document Type Appropriateness
 */
function checkDocumentTypeAppropriateness(baselineData: any, documentCorpus: any[]): AutomatedCheck {
  // Detect if baseline is extracted from ideation/conceptual docs only
  const documentTitles = documentCorpus.map((d: any) => d.title?.toLowerCase() || '')
  
  const hasCharter = documentTitles.some(t => t.includes('charter'))
  const hasCostPlan = documentTitles.some(t => t.includes('cost') && t.includes('plan'))
  const hasSchedulePlan = documentTitles.some(t => t.includes('schedule') && t.includes('plan'))
  const hasIdeation = documentTitles.some(t => t.includes('ideation') || t.includes('idea') || t.includes('concept'))
  const hasBusinessCase = documentTitles.some(t => t.includes('business case'))
  
  const formalDocCount = [hasCharter, hasCostPlan, hasSchedulePlan].filter(Boolean).length
  const conceptualDocCount = [hasIdeation, hasBusinessCase].filter(Boolean).length
  
  let score = 0
  let details = ''
  
  if (formalDocCount >= 3) {
    score = 100
    details = 'Baseline extracted from formal planning documents (Charter, Cost Plan, Schedule Plan)'
  } else if (formalDocCount >= 2) {
    score = 75
    details = `Baseline extracted from ${formalDocCount} formal planning documents. Missing 1 core document.`
  } else if (formalDocCount === 1) {
    score = 50
    details = `Baseline extracted from ${formalDocCount} formal planning document and ${conceptualDocCount} conceptual document(s). Lacks comprehensive planning docs.`
  } else if (conceptualDocCount > 0) {
    score = 30
    details = `Baseline extracted from conceptual documents only (ideation/business case). No formal planning documents present.`
  } else {
    score = 20
    details = 'Baseline extracted from unknown or insufficient document types'
  }
  
  return {
    check_name: 'Document Type Appropriateness',
    check_type: 'data_quality',
    passed: score >= 75,
    score: score,
    details: details,
    recommendations: score < 75
      ? ['Create formal Project Charter', 'Create Cost Management Plan', 'Create Schedule Management Plan', 'Upgrade from ideation to formal planning']
      : []
  }
}

function generateDocumentTypeWarnings(check: AutomatedCheck): Warning[] {
  const warnings: Warning[] = []
  
  if (check.score < 50) {
    warnings.push({
      id: 'WARN-CONCEPTUAL-ONLY',
      category: 'Document Quality',
      title: 'Baseline Based on Conceptual Documents Only',
      description: 'The baseline was extracted from ideation or business case documents, not formal planning documents. Completeness scores may be inflated.',
      recommendation: 'Treat completeness scores as indicative only. Create formal planning documents (Project Charter, Cost/Schedule Plans) before approval. Rough estimates in ideation documents should not be considered formal baselines.'
    })
  }
  
  return warnings
}

/**
 * Check 6: PMBOK Compliance
 */
function checkPMBOKCompliance(baselineData: any): AutomatedCheck {
  const checks = []
  
  // PMBOK requires: Scope, Schedule, Cost baselines (the "triple constraint")
  const hasScope = baselineData.scope_baseline && Object.keys(baselineData.scope_baseline).length > 0
  const hasSchedule = baselineData.timeline_baseline && baselineData.timeline_baseline.duration_months
  const hasCost = baselineData.cost_baseline && baselineData.cost_baseline.total_budget
  
  checks.push(hasScope ? 1 : 0)
  checks.push(hasSchedule ? 1 : 0)
  checks.push(hasCost ? 1 : 0)
  
  // Additional PMBOK elements
  const hasRisks = baselineData.scope_baseline?.risks && baselineData.scope_baseline.risks.length > 0
  const hasSuccessCriteria = baselineData.success_criteria && Object.keys(baselineData.success_criteria).length > 0
  
  checks.push(hasRisks ? 0.5 : 0)
  checks.push(hasSuccessCriteria ? 0.5 : 0)
  
  const score = (checks.reduce((a, b) => a + b, 0) / 4) * 100
  
  const missingElements = []
  if (!hasScope) missingElements.push('Scope Baseline')
  if (!hasSchedule) missingElements.push('Schedule Baseline')
  if (!hasCost) missingElements.push('Cost Baseline')
  if (!hasRisks) missingElements.push('Risk Register')
  if (!hasSuccessCriteria) missingElements.push('Success Criteria')
  
  return {
    check_name: 'PMBOK 7 Compliance',
    check_type: 'pmbok_compliance',
    passed: score >= 75,
    score: Math.round(score),
    details: score >= 75
      ? 'Baseline meets PMBOK 7 requirements for project baselines'
      : `PMBOK compliance at ${Math.round(score)}%. Missing: ${missingElements.join(', ')}`,
    recommendations: missingElements.length > 0
      ? missingElements.map(e => `Create formal ${e}`)
      : []
  }
}

/**
 * Calculate overall feasibility score
 */
function calculateFeasibilityScore(checks: AutomatedCheck[]): number {
  const feasibilityChecks = checks.filter(c => 
    c.check_type === 'feasibility' || c.check_name.includes('Feasibility')
  )
  
  if (feasibilityChecks.length === 0) return 70 // Default moderate
  
  const avgScore = feasibilityChecks.reduce((sum, c) => sum + c.score, 0) / feasibilityChecks.length
  
  // Factor in critical failures
  const hasCriticalFailure = feasibilityChecks.some(c => !c.passed && c.score < 50)
  
  return hasCriticalFailure ? Math.min(avgScore, 40) : avgScore
}

/**
 * Calculate overall quality score
 */
function calculateOverallQualityScore(
  checks: AutomatedCheck[],
  redFlagCount: number,
  warningCount: number
): number {
  // Average of all check scores
  const avgCheckScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length
  
  // Penalties for red flags and warnings
  const redFlagPenalty = redFlagCount * 10
  const warningPenalty = warningCount * 5
  
  const score = Math.max(0, avgCheckScore - redFlagPenalty - warningPenalty)
  
  return Math.round(score)
}

/**
 * Get compliance level from score and red flags
 */
function getComplianceLevel(
  score: number,
  redFlagCount: number
): 'excellent' | 'good' | 'adequate' | 'poor' | 'critical' {
  if (redFlagCount > 0 && score < 50) return 'critical'
  if (redFlagCount > 0 && score < 70) return 'poor'
  if (score < 60) return 'poor'
  if (score < 70) return 'adequate'
  if (score < 85) return 'good'
  return 'excellent'
}

/**
 * Generate recommendations based on audit findings
 */
function generateRecommendations(
  checks: AutomatedCheck[],
  redFlags: RedFlag[],
  warnings: Warning[]
): Recommendation[] {
  const recommendations: Recommendation[] = []
  
  // Critical recommendations from red flags
  redFlags.forEach((flag, index) => {
    recommendations.push({
      id: `REC-RF-${index + 1}`,
      priority: 'critical',
      category: flag.category,
      action: flag.required_action,
      rationale: flag.description,
      impact: flag.impact,
      effort_estimate: 'High priority - must address before approval'
    })
  })
  
  // High/Medium recommendations from warnings
  warnings.forEach((warning, index) => {
    recommendations.push({
      id: `REC-WARN-${index + 1}`,
      priority: 'high',
      category: warning.category,
      action: warning.recommendation,
      rationale: warning.description,
      impact: 'Improves baseline quality and reduces risk',
      effort_estimate: '2-4 hours per recommendation'
    })
  })
  
  // Low priority recommendations from check suggestions
  checks.forEach(check => {
    if (check.recommendations && check.recommendations.length > 0) {
      check.recommendations.forEach((rec, index) => {
        if (!recommendations.some(r => r.action.toLowerCase().includes(rec.toLowerCase()))) {
          recommendations.push({
            id: `REC-CHECK-${check.check_name.replace(/\s/g, '-')}-${index + 1}`,
            priority: check.score < 60 ? 'high' : 'medium',
            category: check.check_type,
            action: rec,
            rationale: `${check.check_name} score is ${check.score}%`,
            impact: 'Improves baseline completeness and quality',
            effort_estimate: '1-3 hours'
          })
        }
      })
    }
  })
  
  return recommendations
}

/**
 * Recalculate baseline completeness with document type awareness
 */
export function recalibrateCompletenessScore(
  baselineData: any,
  documentCorpus: any[]
): number {
  const originalCompleteness = baselineData.completeness_score || 0
  
  // Check document types
  const documentTitles = documentCorpus.map((d: any) => d.title?.toLowerCase() || '')
  const hasIdeation = documentTitles.some(t => t.includes('ideation') || t.includes('idea'))
  const hasBusinessCase = documentTitles.some(t => t.includes('business case'))
  const hasCharter = documentTitles.some(t => t.includes('charter'))
  const hasCostPlan = documentTitles.some(t => t.includes('cost') && t.includes('plan'))
  const hasSchedulePlan = documentTitles.some(t => t.includes('schedule') && t.includes('plan'))
  
  const formalDocCount = [hasCharter, hasCostPlan, hasSchedulePlan].filter(Boolean).length
  
  // Apply discount based on document quality
  let calibrationFactor = 1.0
  
  if (formalDocCount === 0 && (hasIdeation || hasBusinessCase)) {
    // Only conceptual docs: discount heavily (rough estimates ≠ baselines)
    calibrationFactor = 0.4 // 60% discount
  } else if (formalDocCount === 1) {
    // Some formal docs: moderate discount
    calibrationFactor = 0.6 // 40% discount
  } else if (formalDocCount === 2) {
    // Most formal docs: small discount
    calibrationFactor = 0.8 // 20% discount
  }
  // formalDocCount === 3: no discount (full formal planning)
  
  const calibratedScore = Math.round(originalCompleteness * calibrationFactor)
  
  logger.info('📊 Completeness score recalibrated', {
    original: originalCompleteness,
    calibrationFactor,
    calibrated: calibratedScore,
    formalDocs: formalDocCount,
    hasIdeation
  })
  
  return calibratedScore
}

export default {
  performBaselineQualityAudit,
  recalibrateCompletenessScore
}
