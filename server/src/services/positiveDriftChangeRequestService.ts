/**
 * Positive Drift Change Request Service
 * CR-2026-001: Auto-generate Change Requests from positive drift detection
 * 
 * Automatically creates opportunity-type change requests when positive drift
 * is detected (cost savings, efficiency improvements, timeline acceleration)
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { PoolClient } from 'pg'
import { DriftPoint } from './driftDetectionService'
import { emailNotificationService, PositiveDriftEmailData } from './emailNotificationService'

export interface PositiveDriftMetrics {
  costSavings?: number // $ saved
  timeAcceleration?: number // days faster
  efficiencyGain?: number // % improvement
  innovationValue?: number // $ potential
}

export interface PositiveDriftClassification {
  isPositive: boolean
  driftCategory: 'efficiency' | 'cost_saving' | 'timeline_acceleration' | 'innovation' | 'none'
  metrics: PositiveDriftMetrics
  description: string
  strategicValue: string
}

export interface OpportunityCRResult {
  changeRequestId: string
  crTitle: string
  estimatedValue: number
  replicationPotential: number
}

export class PositiveDriftChangeRequestService {
  /**
   * Analyze drift points to identify positive drift
   */
  analyzePositiveDrift(driftPoints: DriftPoint[]): PositiveDriftClassification {
    let costSavings = 0
    let timeAcceleration = 0
    let efficiencyGain = 0
    let innovationValue = 0
    let isPositive = false
    let driftCategory: 'efficiency' | 'cost_saving' | 'timeline_acceleration' | 'innovation' | 'none' = 'none'
    let description = ''
    let strategicValue = ''

    for (const drift of driftPoints) {
      // Detect cost savings (budget reductions)
      if (drift.entityType === 'budget' || drift.entityType === 'cost') {
        const baselineCost = this.extractNumericValue(drift.baselineValue)
        const currentCost = this.extractNumericValue(drift.currentValue)
        
        if (baselineCost && currentCost && currentCost < baselineCost) {
          costSavings += (baselineCost - currentCost)
          isPositive = true
          driftCategory = 'cost_saving'
          description = `Budget reduced from $${baselineCost.toLocaleString()} to $${currentCost.toLocaleString()}`
          strategicValue = 'Cost optimization achieved without compromising deliverables'
        }
      }

      // Detect timeline acceleration (earlier completion)
      if (drift.entityType === 'milestone' || drift.entityType === 'phase') {
        const baselineDate = this.extractDate(drift.baselineValue)
        const currentDate = this.extractDate(drift.currentValue)
        
        if (baselineDate && currentDate && currentDate < baselineDate) {
          const daysSaved = Math.floor((baselineDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
          timeAcceleration += daysSaved
          isPositive = true
          driftCategory = 'timeline_acceleration'
          description = `${drift.entityType} completed ${daysSaved} days early`
          strategicValue = 'Accelerated delivery provides competitive advantage and earlier ROI'
        }
      }

      // Detect efficiency improvements (better resource utilization)
      if (drift.entityType === 'resource' || drift.entityType === 'technology') {
        if (drift.driftType === 'modified' && drift.description.toLowerCase().includes('optimiz')) {
          efficiencyGain += 10 // Estimate 10% efficiency gain
          isPositive = true
          driftCategory = 'efficiency'
          description = drift.description
          strategicValue = 'Improved operational efficiency and resource utilization'
        }
      }

      // Detect innovation opportunities
      if (drift.description.toLowerCase().includes('innovat') || 
          drift.description.toLowerCase().includes('patent') ||
          drift.description.toLowerCase().includes('novel')) {
        innovationValue += 50000 // Estimated innovation value
        isPositive = true
        driftCategory = 'innovation'
        description = drift.description
        strategicValue = 'Potential intellectual property or competitive differentiation'
      }
    }

    return {
      isPositive,
      driftCategory,
      metrics: {
        costSavings: costSavings > 0 ? costSavings : undefined,
        timeAcceleration: timeAcceleration > 0 ? timeAcceleration : undefined,
        efficiencyGain: efficiencyGain > 0 ? efficiencyGain : undefined,
        innovationValue: innovationValue > 0 ? innovationValue : undefined
      },
      description,
      strategicValue
    }
  }

  /**
   * Extract numeric value from drift value object
   */
  private extractNumericValue(value: any): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'object' && value !== null) {
      if ('amount' in value) return value.amount
      if ('total' in value) return value.total
      if ('cost' in value) return value.cost
      if ('budget' in value) return value.budget
    }
    if (typeof value === 'string') {
      const match = value.match(/\$?[\d,]+(\.\d{2})?/)
      if (match) {
        return parseFloat(match[0].replace(/[$,]/g, ''))
      }
    }
    return null
  }

  /**
   * Extract date from drift value object
   */
  private extractDate(value: any): Date | null {
    if (value instanceof Date) return value
    if (typeof value === 'object' && value !== null) {
      if ('date' in value) return new Date(value.date)
      if ('due_date' in value) return new Date(value.due_date)
      if ('end_date' in value) return new Date(value.end_date)
    }
    if (typeof value === 'string') {
      const date = new Date(value)
      if (!isNaN(date.getTime())) return date
    }
    return null
  }

  /**
   * Auto-generate opportunity change request from positive drift
   */
  async generateOpportunityCR(
    projectId: string,
    documentId: string,
    driftRecordId: string,
    driftPoints: DriftPoint[],
    positiveDrift: PositiveDriftClassification,
    userId: string
  ): Promise<OpportunityCRResult> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      logger.info('[POSITIVE-DRIFT-CR] Generating opportunity CR', {
        projectId,
        documentId,
        driftCategory: positiveDrift.driftCategory,
        costSavings: positiveDrift.metrics.costSavings
      })

      // Get project and document details
      const projectResult = await client.query(
        `SELECT p.name as project_name, d.name as document_name
         FROM projects p
         LEFT JOIN documents d ON d.id = $1
         WHERE p.id = $2`,
        [documentId, projectId]
      )

      if (projectResult.rows.length === 0) {
        throw new Error(`Project not found: ${projectId}`)
      }

      const { project_name, document_name } = projectResult.rows[0]

      // Build CR content
      const crContent = this.buildOpportunityCRContent(
        project_name,
        document_name,
        driftPoints,
        positiveDrift
      )

      // Generate CR title
      const crTitle = this.generateCRTitle(positiveDrift)

      // Create change request document
      const changeRequestId = uuidv4()
      await client.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata, word_count, character_count, version, semantic_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, 1, '1.0.0')`,
        [
          changeRequestId,
          projectId,
          crTitle,
          crContent,
          'pending_approval',
          'change_request',
          userId,
          JSON.stringify({
            change_request_type: 'positive_drift_opportunity',
            source_document_id: documentId,
            drift_record_id: driftRecordId,
            drift_category: positiveDrift.driftCategory,
            metrics: positiveDrift.metrics,
            created_from: 'automatic_positive_drift_detection',
            requires_approval: true,
            urgency: 'medium',
            estimated_value: this.calculateTotalValue(positiveDrift.metrics)
          }),
          crContent.split(/\s+/).filter(Boolean).length,
          crContent.length
        ]
      )

      // Link CR to drift record
      await client.query(
        `UPDATE baseline_drift_detection
         SET status = 'opportunity_cr_created',
             ai_processing_metadata = jsonb_set(
               COALESCE(ai_processing_metadata, '{}'::jsonb),
               '{change_request_id}',
               $1::text::jsonb
             )
         WHERE id = $2`,
        [JSON.stringify(changeRequestId), driftRecordId]
      )

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, details
        ) VALUES ($1, 'positive_drift_cr_created', 'change_request', $2, $3)`,
        [
          userId,
          changeRequestId,
          JSON.stringify({
            projectId,
            documentId,
            driftRecordId,
            driftCategory: positiveDrift.driftCategory,
            estimatedValue: this.calculateTotalValue(positiveDrift.metrics)
          })
        ]
      )

      await client.query('COMMIT')

      logger.info('[POSITIVE-DRIFT-CR] Opportunity CR created successfully', {
        changeRequestId,
        crTitle,
        driftCategory: positiveDrift.driftCategory
      })

      // Send notification to sponsors about the opportunity
      this.sendOpportunityNotification(
        project_name,
        document_name,
        changeRequestId,
        crTitle,
        positiveDrift
      ).catch(err => {
        logger.error('[POSITIVE-DRIFT-CR] Error sending notification:', err)
        // Don't fail CR creation if notification fails
      })

      return {
        changeRequestId,
        crTitle,
        estimatedValue: this.calculateTotalValue(positiveDrift.metrics),
        replicationPotential: this.estimateReplicationPotential(positiveDrift)
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[POSITIVE-DRIFT-CR] Error creating opportunity CR:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Generate CR title based on drift category
   */
  private generateCRTitle(positiveDrift: PositiveDriftClassification): string {
    const today = new Date()
    const crNumber = `CR-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-OPPORTUN`

    switch (positiveDrift.driftCategory) {
      case 'cost_saving':
        return `${crNumber}: Cost Optimization Opportunity - $${positiveDrift.metrics.costSavings?.toLocaleString()} Savings`
      case 'timeline_acceleration':
        return `${crNumber}: Timeline Acceleration - ${positiveDrift.metrics.timeAcceleration} Days Early`
      case 'efficiency':
        return `${crNumber}: Efficiency Improvement Opportunity`
      case 'innovation':
        return `${crNumber}: Innovation Opportunity Detected`
      default:
        return `${crNumber}: Positive Drift Opportunity`
    }
  }

  /**
   * Build opportunity CR content
   */
  private buildOpportunityCRContent(
    projectName: string,
    documentName: string,
    driftPoints: DriftPoint[],
    positiveDrift: PositiveDriftClassification
  ): string {
    const metrics = positiveDrift.metrics
    const totalValue = this.calculateTotalValue(metrics)

    return `# Change Request: Positive Drift Opportunity

**Auto-Generated**: ✨ Opportunity detected by Baseline & Drift Detection System  
**Project**: ${projectName}  
**Source Document**: ${documentName}  
**Detection Date**: ${new Date().toISOString().split('T')[0]}  
**Type**: ${positiveDrift.driftCategory.replace('_', ' ').toUpperCase()}  
**Status**: Pending Sponsor Approval  

---

## 🎯 Executive Summary

**Good News!** The system has detected positive drift in your project - this is an **opportunity** to formalize and replicate success.

**What Happened**: ${positiveDrift.description}

**Value Identified**:
${metrics.costSavings ? `- **Cost Savings**: $${metrics.costSavings.toLocaleString()}/year\n` : ''}${metrics.timeAcceleration ? `- **Timeline Acceleration**: ${metrics.timeAcceleration} days faster\n` : ''}${metrics.efficiencyGain ? `- **Efficiency Gain**: ${metrics.efficiencyGain}% improvement\n` : ''}${metrics.innovationValue ? `- **Innovation Value**: $${metrics.innovationValue.toLocaleString()} potential\n` : ''}
**Total Estimated Value**: $${totalValue.toLocaleString()}

**Strategic Value**: ${positiveDrift.strategicValue}

---

## 📊 Business Case

### Problem Statement
Current approach was based on baseline assumptions. The team has discovered a more efficient method that delivers equivalent or better results.

### Proposed Solution
1. **Formalize** the improvement in project documentation and baseline
2. **Document** the approach for knowledge base and future projects
3. **Replicate** to similar ongoing projects (estimated 3-5 candidates)
4. **Recognize** team for innovation and continuous improvement

### Strategic Alignment
- Supports organizational goals of efficiency and innovation
- Demonstrates continuous improvement culture
- Provides competitive advantage through optimized processes
- Creates reusable intellectual capital

---

## 🎯 Scope

### In Scope
- Update project baseline to reflect the improvement
- Document the improved approach in knowledge base
- Identify and apply to similar active projects
${positiveDrift.driftCategory === 'innovation' ? '- Review for potential patent opportunity\n' : ''}- Recognize team members for innovation
- Share lessons learned organization-wide

### Out of Scope
- Rewriting already-completed work
- Forcing all projects to adopt (optional for suitable projects)
- Immediate organization-wide mandate without pilot validation

---

## 💰 Financial Analysis

### Investment Required
- Documentation effort: ~8 hours
- Knowledge transfer: ~4 hours
- Replication to 3-5 projects: ~16 hours each
- Total investment: ~$5,000 (assuming $100/hour blended rate)

### Returns
- **Current Project**: $${metrics.costSavings || 0}/year
- **If Replicated** (3-5 projects): $${(metrics.costSavings || 0) * 4}/year
- **Annual Value**: $${this.calculateAnnualValue(metrics)}/year
- **ROI**: ${this.calculateROI(metrics)}x

### Break-even Analysis
Investment pays back in less than 1 month if replicated successfully.

---

## 🎯 Drift Points Detected

${driftPoints.map((drift, i) => `
### ${i + 1}. ${drift.entityType.toUpperCase()} - ${drift.driftType.toUpperCase()}

**Description**: ${drift.description}

**Baseline**: ${JSON.stringify(drift.baselineValue)}  
**Current**: ${JSON.stringify(drift.currentValue)}  
${drift.variance !== undefined ? `**Variance**: ${drift.variance > 0 ? '+' : ''}${drift.variance}%\n` : ''}
**Requires Approval**: ${drift.requiresApproval ? 'Yes' : 'No'}
`).join('\n---\n')}

---

## 🎯 Recommendations

### Recommended Actions
1. ✅ **Approve** - Formalize this improvement and replicate to similar projects
2. 📋 **Update Baseline** - Reflect improvement in project baseline
3. 📚 **Knowledge Base** - Document approach for future reference
4. 🔄 **Replicate** - Apply to 3-5 similar active projects
${positiveDrift.driftCategory === 'innovation' ? '5. 🔬 **Patent Review** - Evaluate for IP protection potential\n' : ''}
${positiveDrift.driftCategory === 'cost_saving' ? '5. 📊 **Budget Reallocation** - Redirect savings to strategic initiatives\n' : ''}

### Alternative Options
1. **Defer** - Review later when more data is available (not recommended - may lose momentum)
2. **Document Only** - Capture the lesson but don't replicate (misses value opportunity)

---

## ⚡ Approval Workflow

**Approvers Required**:
- Project Sponsor (primary decision maker)
- Innovation Lead (for innovation/efficiency opportunities)
- CTO/Technical Lead (for technical improvements)

**SLA**: 72 hours (not urgent, but valuable - act within 3 days)

**Decision Required**:
- [ ] ✅ Approve - Formalize and replicate
- [ ] 📋 Approve with conditions
- [ ] ⏸️ Defer - need more information
- [ ] ❌ Reject - maintain baseline as-is

**Conditions/Notes**: [To be completed by approver]

---

## 📝 Notes

This change request was automatically generated by the ADPA Baseline & Drift Detection System.

**Review in ADPA**: [Link to CR Dashboard]

**Questions?** Contact the project team or innovation lead.

---

**Generated**: ${new Date().toISOString()}  
**System**: ADPA Baseline & Drift Detection (CR-2026-001)  
`
  }

  /**
   * Calculate total value from metrics
   */
  private calculateTotalValue(metrics: PositiveDriftMetrics): number {
    return (metrics.costSavings || 0) + 
           (metrics.innovationValue || 0) +
           ((metrics.timeAcceleration || 0) * 1000) + // $1k per day saved
           ((metrics.efficiencyGain || 0) * 500) // $500 per % efficiency
  }

  /**
   * Calculate annual value
   */
  private calculateAnnualValue(metrics: PositiveDriftMetrics): number {
    const baseValue = this.calculateTotalValue(metrics)
    return baseValue * 4 // Assuming replication to 4 similar projects
  }

  /**
   * Calculate ROI
   */
  private calculateROI(metrics: PositiveDriftMetrics): number {
    const investment = 5000 // Estimated documentation and replication cost
    const annualValue = this.calculateAnnualValue(metrics)
    return Math.round((annualValue / investment) * 10) / 10
  }

  /**
   * Estimate replication potential (number of similar projects)
   */
  private estimateReplicationPotential(positiveDrift: PositiveDriftClassification): number {
    // Placeholder - would query similar projects in production
    return 4 // Conservative estimate
  }

  /**
   * Send opportunity notification to sponsors
   */
  private async sendOpportunityNotification(
    projectName: string,
    documentName: string,
    changeRequestId: string,
    crTitle: string,
    positiveDrift: PositiveDriftClassification
  ): Promise<void> {
    try {
      logger.info('[POSITIVE-DRIFT-CR] Sending opportunity notification', {
        projectName,
        changeRequestId,
        category: positiveDrift.driftCategory
      })

      const emailData: PositiveDriftEmailData = {
        projectName,
        title: crTitle,
        description: positiveDrift.description,
        costSavings: positiveDrift.metrics.costSavings,
        timeAcceleration: positiveDrift.metrics.timeAcceleration,
        changeRequestId,
        metadata: {
          driftCategory: positiveDrift.driftCategory,
          strategicValue: positiveDrift.strategicValue,
          estimatedValue: this.calculateTotalValue(positiveDrift.metrics),
          replicationPotential: this.estimateReplicationPotential(positiveDrift)
        }
      }

      const sent = await emailNotificationService.sendPositiveDriftNotification(emailData)

      if (sent) {
        logger.info('[POSITIVE-DRIFT-CR] Opportunity notification sent successfully', {
          changeRequestId
        })
      } else {
        logger.warn('[POSITIVE-DRIFT-CR] Failed to send opportunity notification', {
          changeRequestId
        })
      }
    } catch (error) {
      logger.error('[POSITIVE-DRIFT-CR] Error sending opportunity notification:', error)
      throw error
    }
  }
}

export const positiveDriftChangeRequestService = new PositiveDriftChangeRequestService()
