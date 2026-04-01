/**
 * Playbook QA Service - PRODUCTION FIXES APPLIED
 * Fixes for division by zero and code injection vulnerabilities
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import type { PlaybookTemplate, QAResult, AuthenticatedUser } from '../playbookManagement/types'

export class PlaybookQAService {
  /**
   * Run comprehensive QA checks on a playbook
   */
  async runQAChecks(playbookId: string, versionId: string, user: AuthenticatedUser): Promise<QAResult> {
    logger.info(`🔍 Running QA checks for playbook ${playbookId} version ${versionId}`)

    // Get playbook and version
    const playbookResult = await pool.query(
      "SELECT * FROM playbook_templates WHERE id = $1",
      [playbookId]
    )

    if (playbookResult.rows.length === 0) {
      throw new Error('Playbook not found')
    }

    const playbook = playbookResult.rows[0]

    const versionResult = await pool.query(
      "SELECT * FROM playbook_versions WHERE id = $1 AND playbook_id = $2",
      [versionId, playbookId]
    )

    if (versionResult.rows.length === 0) {
      throw new Error('Version not found')
    }

    const version = versionResult.rows[0]

    // Run individual QA checks
    const severityCoverageScore = await this.checkSeverityCoverage(playbook)
    const escalationTimingScore = await this.checkEscalationTiming(playbook)
    const decisionTreeScore = await this.checkDecisionTree(playbook)
    const governanceLinksScore = await this.checkGovernanceLinks(playbook)
    const entityConsistencyScore = await this.checkEntityConsistency(playbook)
    const pmbokAlignmentScore = await this.checkPMBOKAlignment(playbook)

    // Calculate overall score
    const scores = [
      severityCoverageScore,
      escalationTimingScore,
      decisionTreeScore,
      governanceLinksScore,
      entityConsistencyScore,
      pmbokAlignmentScore
    ]
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length

    // Determine status
    const status = overallScore >= 80 ? 'passed' : 'failed'

    // Collect failed checks
    const failedChecks: Record<string, any> = {}
    if (severityCoverageScore < 80) failedChecks.severity_coverage = severityCoverageScore
    if (escalationTimingScore < 80) failedChecks.escalation_timing = escalationTimingScore
    if (decisionTreeScore < 80) failedChecks.decision_tree = decisionTreeScore
    if (governanceLinksScore < 80) failedChecks.governance_links = governanceLinksScore
    if (entityConsistencyScore < 80) failedChecks.entity_consistency = entityConsistencyScore
    if (pmbokAlignmentScore < 80) failedChecks.pmbok_alignment = pmbokAlignmentScore

    // Generate recommendations
    const recommendations = this.generateRecommendations(failedChecks)

    // Store QA result
    const qaResultId = uuidv4()
    const result = await pool.query(
      `
      INSERT INTO playbook_qa_results (
        id, playbook_id, version_id, severity_coverage_score, escalation_timing_score,
        decision_tree_score, governance_links_score, entity_consistency_score,
        pmbok_alignment_score, overall_score, status, failed_checks, recommendations, run_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `,
      [
        qaResultId,
        playbookId,
        versionId,
        severityCoverageScore,
        escalationTimingScore,
        decisionTreeScore,
        governanceLinksScore,
        entityConsistencyScore,
        pmbokAlignmentScore,
        overallScore,
        status,
        JSON.stringify(failedChecks),
        JSON.stringify(recommendations),
        user.id
      ]
    )

    // Update playbook QA status
    await pool.query(
      `
      UPDATE playbook_templates
      SET qa_score = $1, qa_status = $2, qa_last_run_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
      [overallScore, status, playbookId]
    )

    logger.info(`✅ QA checks completed for playbook ${playbookId}: score=${overallScore}, status=${status}`)

    return result.rows[0]
  }

  /**
   * Check severity coverage
   */
  private async checkSeverityCoverage(playbook: PlaybookTemplate): Promise<number> {
    const severityModel = playbook.severity_model
    const requiredLevels = ['critical', 'high', 'medium', 'low']
    const providedLevels = severityModel.levels.map(l => l.level)

    const coverage = requiredLevels.filter(level => (providedLevels as any[]).includes(level)).length
    return (coverage / requiredLevels.length) * 100
  }

  /**
   * Check escalation timing
   * FIX #4: Added empty array validation to prevent division by zero
   */
  private async checkEscalationTiming(playbook: PlaybookTemplate): Promise<number> {
    const escalationRules = playbook.escalation_rules
    
    // SECURITY FIX #4: Validate array is not empty
    if (!escalationRules || escalationRules.length === 0) {
      return 0 // No rules = no timing coverage
    }
    
    const rulesWithTiming = escalationRules.filter(r => r.timing).length
    return (rulesWithTiming / escalationRules.length) * 100
  }

  /**
   * Check decision tree completeness
   * FIX #4: Added empty array validation to prevent division by zero
   */
  private async checkDecisionTree(playbook: PlaybookTemplate): Promise<number> {
    // Check if escalation rules form a complete decision tree
    const rules = playbook.escalation_rules
    
    // SECURITY FIX #4: Validate array is not empty
    if (!rules || rules.length === 0) {
      return 0 // No rules = incomplete decision tree
    }
    
    const hasConditions = rules.filter(r => r.trigger_condition).length
    const hasActions = rules.filter(r => r.escalation_path && r.escalation_path.length > 0).length

    return ((hasConditions + hasActions) / (rules.length * 2)) * 100
  }

  /**
   * Check governance links
   */
  private async checkGovernanceLinks(playbook: PlaybookTemplate): Promise<number> {
    const complianceRefs = playbook.compliance_references || []
    return complianceRefs.length > 0 ? 100 : 50
  }

  /**
   * Check entity consistency
   */
  private async checkEntityConsistency(playbook: PlaybookTemplate): Promise<number> {
    const actions = playbook.actions
    const rolesInActions = new Set(actions.map(a => a.responsible_role))
    const escalationRoles = new Set()

    playbook.escalation_rules.forEach(rule => {
      rule.escalation_path.forEach(role => escalationRoles.add(role))
    })

    const consistentRoles = Array.from(rolesInActions).filter(role => escalationRoles.has(role as string)).length
    return (consistentRoles / Math.max(rolesInActions.size, 1)) * 100
  }

  /**
   * Check PMBOK alignment
   */
  private async checkPMBOKAlignment(playbook: PlaybookTemplate): Promise<number> {
    // Check if playbook aligns with PMBOK knowledge areas
    const pmbokAreas = ['integration', 'scope', 'schedule', 'cost', 'quality', 'resource', 'communication', 'risk', 'procurement', 'stakeholder']
    const purpose = playbook.purpose.toLowerCase()

    const alignedAreas = pmbokAreas.filter(area => purpose.includes(area)).length
    return (alignedAreas / pmbokAreas.length) * 100
  }

  /**
   * Generate recommendations based on failed checks
   */
  private generateRecommendations(failedChecks: Record<string, any>): Record<string, string> {
    const recommendations: Record<string, string> = {}

    if (failedChecks.severity_coverage) {
      recommendations.severity_coverage = 'Add missing severity levels to ensure comprehensive coverage'
    }
    if (failedChecks.escalation_timing) {
      recommendations.escalation_timing = 'Define SLA timing for all escalation rules'
    }
    if (failedChecks.decision_tree) {
      recommendations.decision_tree = 'Ensure all escalation rules have clear conditions and actions'
    }
    if (failedChecks.governance_links) {
      recommendations.governance_links = 'Add compliance framework references'
    }
    if (failedChecks.entity_consistency) {
      recommendations.entity_consistency = 'Ensure roles are consistent across actions and escalation paths'
    }
    if (failedChecks.pmbok_alignment) {
      recommendations.pmbok_alignment = 'Align playbook with relevant PMBOK knowledge areas'
    }

    return recommendations
  }

  /**
   * Enforce quality gates
   */
  async enforceQualityGates(playbookId: string): Promise<boolean> {
    const result = await pool.query(
      "SELECT qa_score, qa_status FROM playbook_templates WHERE id = $1",
      [playbookId]
    )

    if (result.rows.length === 0) {
      throw new Error('Playbook not found')
    }

    const { qa_score, qa_status } = result.rows[0]

    // Quality gate: score must be >= 80 and status must be 'passed'
    const gatesPassed = qa_score >= 80 && qa_status === 'passed'

    // Update quality gate status
    await pool.query(
      `
      UPDATE playbook_templates
      SET quality_gate_status = $1
      WHERE id = $2
    `,
      [gatesPassed ? 'passed' : 'failed', playbookId]
    )

    return gatesPassed
  }
}

export const playbookQAService = new PlaybookQAService()
