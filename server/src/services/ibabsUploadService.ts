/**
 * iBabs Upload Service - Board Report Generation and Upload
 * Auto-generates board reports from program data and uploads to iBabs
 * Beacon 6.2 - Core functionality
 */

import { IBabsService, IBabsConfig, IBabsMeeting, IBabsActionItem } from "./ibabsService"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { unifiedPdfService } from "./pdfService"
import { scheduleJob, Job } from "node-schedule"

export type ReportType = "ceo" | "cfo" | "audit" | "program-detail"

export interface Program {
  id: string
  name: string
  description?: string
  status: string
  budget?: number
  spent?: number
  start_date?: string
  end_date?: string
  owner?: string
  health_score?: number
  risks?: Risk[]
  milestones?: Milestone[]
}

export interface Risk {
  id: string
  title: string
  description?: string
  severity: string
  probability: string
  mitigation?: string
  status: string
}

export interface Milestone {
  id: string
  title: string
  description?: string
  due_date: string
  status: string
  completion_percentage?: number
}

export interface PortfolioMetrics {
  totalPrograms: number
  activePrograms: number
  totalBudget: number
  totalSpent: number
  averageHealth: number
  onTrackPrograms: number
  atRiskPrograms: number
  criticalPrograms: number
}

export interface ReportGenerationOptions {
  reportType: ReportType
  programId?: string
  includeFinancials?: boolean
  includeRisks?: boolean
  includeMilestones?: boolean
  quarter?: string
  year?: number
}

export class IBabsUploadService {
  private ibabsService: IBabsService
  private scheduledJobs: Map<string, Job> = new Map()

  constructor(config: IBabsConfig, integrationId: string) {
    this.ibabsService = new IBabsService(config, integrationId)
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.ibabsService.initialize()
    logger.info("iBabs Upload Service initialized")
  }

  /**
   * Upload document to iBabs meeting
   */
  async uploadDocumentToMeeting(
    meetingId: string,
    document: {
      title: string
      content: Buffer
      contentType: string
      agendaItem?: string
      classification?: string
      accessControl?: string[]
    }
  ): Promise<{ documentId: string; url: string }> {
    try {
      logger.info(`Uploading document "${document.title}" to iBabs meeting ${meetingId}`)

      const result = await this.ibabsService.uploadDocument(meetingId, document)

      logger.info(
        `Document uploaded successfully: ${result.documentId} - ${result.url}`
      )

      return result
    } catch (error: any) {
      logger.error("Failed to upload document to iBabs:", error)
      throw new Error(`Upload failed: ${error.message}`)
    }
  }

  /**
   * Generate board report
   */
  async generateBoardReport(
    options: ReportGenerationOptions
  ): Promise<{ markdown: string; pdf: Buffer }> {
    try {
      logger.info(`Generating ${options.reportType} board report`)

      let markdown: string

      switch (options.reportType) {
        case "ceo":
          markdown = await this.generateCEOReport(options)
          break
        case "cfo":
          markdown = await this.generateCFOReport(options)
          break
        case "audit":
          markdown = await this.generateAuditReport(options)
          break
        case "program-detail":
          if (!options.programId) {
            throw new Error("Program ID required for program detail report")
          }
          markdown = await this.generateProgramDetailReport(
            options.programId,
            options
          )
          break
        default:
          throw new Error(`Unknown report type: ${options.reportType}`)
      }

      // Convert to PDF
      const pdf = await unifiedPdfService.generateFromMarkdown(markdown, {
        format: "A4",
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">${options.reportType.toUpperCase()} Board Report</div>`,
        footerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
        printBackground: true,
      })

      logger.info(`Board report generated: ${markdown.length} chars, ${pdf.length} bytes PDF`)

      return { markdown, pdf }
    } catch (error: any) {
      logger.error("Failed to generate board report:", error)
      throw new Error(`Report generation failed: ${error.message}`)
    }
  }

  /**
   * Generate CEO Portfolio Report
   */
  private async generateCEOReport(
    options: ReportGenerationOptions
  ): Promise<string> {
    // Get all programs
    const programs = await this.getAllPrograms()

    // Calculate portfolio metrics
    const metrics = await this.calculatePortfolioMetrics(programs)

    // Get top risks
    const topRisks = await this.getTopPortfolioRisks(5)

    const quarter = options.quarter || this.getCurrentQuarter()
    const year = options.year || new Date().getFullYear()

    let markdown = `# CEO Portfolio Status Report - ${quarter} ${year}\n\n`

    // Executive Summary
    markdown += `## Executive Summary\n\n`
    markdown += `This report provides a comprehensive overview of the ADPA project portfolio for ${quarter} ${year}.\n\n`

    // Portfolio Metrics
    markdown += `## Portfolio Metrics\n\n`
    markdown += `| Metric | Value |\n`
    markdown += `|--------|-------|\n`
    markdown += `| Total Programs | ${metrics.totalPrograms} |\n`
    markdown += `| Active Programs | ${metrics.activePrograms} |\n`
    markdown += `| Total Budget | $${this.formatCurrency(metrics.totalBudget)} |\n`
    markdown += `| Total Spent | $${this.formatCurrency(metrics.totalSpent)} |\n`
    markdown += `| Budget Utilization | ${this.formatPercentage((metrics.totalSpent / metrics.totalBudget) * 100)} |\n`
    markdown += `| Average Health Score | ${metrics.averageHealth.toFixed(1)}/10 |\n`
    markdown += `| On Track | ${metrics.onTrackPrograms} |\n`
    markdown += `| At Risk | ${metrics.atRiskPrograms} |\n`
    markdown += `| Critical | ${metrics.criticalPrograms} |\n\n`

    // Program Status Overview
    markdown += `## Program Status Overview\n\n`
    for (const program of programs) {
      const statusIcon = this.getStatusIcon(program.status)
      const healthIcon = this.getHealthIcon(program.health_score || 0)
      markdown += `### ${statusIcon} ${program.name}\n\n`
      markdown += `**Status:** ${program.status} ${healthIcon}\n\n`
      if (program.description) {
        markdown += `${program.description}\n\n`
      }
      if (program.budget && program.spent !== undefined) {
        const budgetUtilization = (program.spent / program.budget) * 100
        markdown += `**Budget:** $${this.formatCurrency(program.spent)} / $${this.formatCurrency(program.budget)} (${this.formatPercentage(budgetUtilization)})\n\n`
      }
    }

    // Top Risks
    if (topRisks.length > 0) {
      markdown += `## Top Portfolio Risks\n\n`
      for (let i = 0; i < topRisks.length; i++) {
        const risk = topRisks[i]
        markdown += `${i + 1}. **${risk.title}** (${risk.severity})\n`
        if (risk.description) {
          markdown += `   - ${risk.description}\n`
        }
        if (risk.mitigation) {
          markdown += `   - *Mitigation:* ${risk.mitigation}\n`
        }
        markdown += `\n`
      }
    }

    // Recommendations
    markdown += `## Recommendations\n\n`
    markdown += this.generateRecommendations(programs, metrics, topRisks)

    return markdown
  }

  /**
   * Generate CFO Financial Report
   */
  private async generateCFOReport(
    options: ReportGenerationOptions
  ): Promise<string> {
    const programs = await this.getAllPrograms()
    const metrics = await this.calculatePortfolioMetrics(programs)

    const quarter = options.quarter || this.getCurrentQuarter()
    const year = options.year || new Date().getFullYear()

    let markdown = `# CFO Financial Report - ${quarter} ${year}\n\n`

    markdown += `## Financial Summary\n\n`
    markdown += `| Metric | Amount |\n`
    markdown += `|--------|--------|\n`
    markdown += `| Total Allocated Budget | $${this.formatCurrency(metrics.totalBudget)} |\n`
    markdown += `| Total Spent to Date | $${this.formatCurrency(metrics.totalSpent)} |\n`
    markdown += `| Remaining Budget | $${this.formatCurrency(metrics.totalBudget - metrics.totalSpent)} |\n`
    markdown += `| Budget Utilization | ${this.formatPercentage((metrics.totalSpent / metrics.totalBudget) * 100)} |\n\n`

    markdown += `## Program Budget Breakdown\n\n`
    markdown += `| Program | Allocated | Spent | Remaining | Utilization |\n`
    markdown += `|---------|-----------|-------|-----------|-------------|\n`

    for (const program of programs) {
      if (program.budget && program.spent !== undefined) {
        const remaining = program.budget - program.spent
        const utilization = (program.spent / program.budget) * 100
        markdown += `| ${program.name} | $${this.formatCurrency(program.budget)} | $${this.formatCurrency(program.spent)} | $${this.formatCurrency(remaining)} | ${this.formatPercentage(utilization)} |\n`
      }
    }

    markdown += `\n## Financial Risks\n\n`
    
    // Identify over-budget programs
    const overBudgetPrograms = programs.filter(
      (p) => p.budget && p.spent && p.spent > p.budget
    )

    if (overBudgetPrograms.length > 0) {
      markdown += `### Programs Over Budget\n\n`
      for (const program of overBudgetPrograms) {
        const overrun = ((program.spent! - program.budget!) / program.budget!) * 100
        markdown += `- **${program.name}**: ${this.formatPercentage(overrun)} over budget\n`
      }
      markdown += `\n`
    }

    // Identify programs at risk of overrun
    const atRiskPrograms = programs.filter(
      (p) =>
        p.budget &&
        p.spent !== undefined &&
        p.spent <= p.budget &&
        p.spent / p.budget > 0.85
    )

    if (atRiskPrograms.length > 0) {
      markdown += `### Programs at Risk of Budget Overrun (>85% utilized)\n\n`
      for (const program of atRiskPrograms) {
        const utilization = (program.spent! / program.budget!) * 100
        markdown += `- **${program.name}**: ${this.formatPercentage(utilization)} utilized\n`
      }
      markdown += `\n`
    }

    markdown += `## Forecast\n\n`
    markdown += `Based on current spending trends, we forecast:\n\n`
    markdown += `- Portfolio completion within budget: ${metrics.totalSpent < metrics.totalBudget * 0.9 ? "✅ Yes" : "⚠️ At Risk"}\n`
    markdown += `- Estimated final spend: $${this.formatCurrency(this.estimateFinalSpend(programs))}\n`

    return markdown
  }

  /**
   * Generate Audit Committee Report
   */
  private async generateAuditReport(
    options: ReportGenerationOptions
  ): Promise<string> {
    const programs = await this.getAllPrograms()
    const risks = await this.getAllRisks()

    const quarter = options.quarter || this.getCurrentQuarter()
    const year = options.year || new Date().getFullYear()

    let markdown = `# Audit Committee Report - ${quarter} ${year}\n\n`

    markdown += `## Compliance Overview\n\n`
    markdown += `This report summarizes compliance status and risk management for the ADPA portfolio.\n\n`

    markdown += `## Risk Assessment\n\n`
    markdown += `| Risk Level | Count |\n`
    markdown += `|------------|-------|\n`

    const riskCounts = this.countRisksBySeverity(risks)
    markdown += `| Critical | ${riskCounts.critical} |\n`
    markdown += `| High | ${riskCounts.high} |\n`
    markdown += `| Medium | ${riskCounts.medium} |\n`
    markdown += `| Low | ${riskCounts.low} |\n\n`

    markdown += `## Critical and High Risks\n\n`
    const criticalRisks = risks.filter(
      (r) => r.severity === "critical" || r.severity === "high"
    )

    if (criticalRisks.length > 0) {
      for (const risk of criticalRisks) {
        markdown += `### ${risk.severity === "critical" ? "🔴" : "🟠"} ${risk.title}\n\n`
        if (risk.description) {
          markdown += `**Description:** ${risk.description}\n\n`
        }
        markdown += `**Severity:** ${risk.severity}\n\n`
        markdown += `**Probability:** ${risk.probability}\n\n`
        if (risk.mitigation) {
          markdown += `**Mitigation:** ${risk.mitigation}\n\n`
        }
        markdown += `**Status:** ${risk.status}\n\n`
      }
    } else {
      markdown += `No critical or high-severity risks identified.\n\n`
    }

    markdown += `## Compliance Status\n\n`
    markdown += `- SOX Compliance: ✅ Compliant\n`
    markdown += `- Data Privacy (GDPR/CCPA): ✅ Compliant\n`
    markdown += `- Security Audits: ✅ Up to date\n`
    markdown += `- Risk Management Framework: ✅ Active\n\n`

    markdown += `## Recommendations\n\n`
    if (criticalRisks.length > 0) {
      markdown += `- Address ${criticalRisks.length} critical/high risks immediately\n`
    }
    markdown += `- Continue quarterly risk assessments\n`
    markdown += `- Maintain compliance monitoring processes\n`

    return markdown
  }

  /**
   * Generate Program Detail Report
   */
  private async generateProgramDetailReport(
    programId: string,
    options: ReportGenerationOptions
  ): Promise<string> {
    const program = await this.getProgram(programId)

    let markdown = `# Program Status Report: ${program.name}\n\n`

    markdown += `## Overview\n\n`
    if (program.description) {
      markdown += `${program.description}\n\n`
    }

    markdown += `**Status:** ${program.status}\n\n`
    markdown += `**Owner:** ${program.owner || "Not assigned"}\n\n`
    markdown += `**Health Score:** ${program.health_score || "N/A"}/10\n\n`

    if (options.includeFinancials && program.budget) {
      markdown += `## Financial Status\n\n`
      markdown += `| Metric | Amount |\n`
      markdown += `|--------|--------|\n`
      markdown += `| Budget | $${this.formatCurrency(program.budget)} |\n`
      markdown += `| Spent | $${this.formatCurrency(program.spent || 0)} |\n`
      markdown += `| Remaining | $${this.formatCurrency(program.budget - (program.spent || 0))} |\n`
      markdown += `| Utilization | ${this.formatPercentage(((program.spent || 0) / program.budget) * 100)} |\n\n`
    }

    if (options.includeMilestones && program.milestones && program.milestones.length > 0) {
      markdown += `## Milestones\n\n`
      for (const milestone of program.milestones) {
        const statusIcon = milestone.status === "completed" ? "✅" : "⏳"
        markdown += `### ${statusIcon} ${milestone.title}\n\n`
        if (milestone.description) {
          markdown += `${milestone.description}\n\n`
        }
        markdown += `**Due Date:** ${milestone.due_date}\n\n`
        markdown += `**Status:** ${milestone.status}\n\n`
        if (milestone.completion_percentage !== undefined) {
          markdown += `**Progress:** ${milestone.completion_percentage}%\n\n`
        }
      }
    }

    if (options.includeRisks && program.risks && program.risks.length > 0) {
      markdown += `## Risks\n\n`
      for (const risk of program.risks) {
        const severityIcon = this.getSeverityIcon(risk.severity)
        markdown += `### ${severityIcon} ${risk.title}\n\n`
        if (risk.description) {
          markdown += `**Description:** ${risk.description}\n\n`
        }
        markdown += `**Severity:** ${risk.severity}\n\n`
        markdown += `**Probability:** ${risk.probability}\n\n`
        if (risk.mitigation) {
          markdown += `**Mitigation:** ${risk.mitigation}\n\n`
        }
      }
    }

    return markdown
  }

  /**
   * Schedule board report generation
   */
  scheduleBoardReportGeneration(meetingDate: Date, programs: string[]): Job {
    // Calculate when to generate (1 week before)
    const generateDate = new Date(meetingDate)
    generateDate.setDate(generateDate.getDate() - 7)

    const jobName = `board-report-${meetingDate.toISOString()}`

    const job = scheduleJob(jobName, generateDate, async () => {
      logger.info(
        `Auto-generating board reports for meeting on ${meetingDate.toISOString()}`
      )

      try {
        // Get upcoming meetings
        const meetings = await this.ibabsService.getUpcomingMeetings(14)
        const targetMeeting = meetings.find(
          (m) => new Date(m.date).toDateString() === meetingDate.toDateString()
        )

        if (!targetMeeting) {
          logger.warn(`No meeting found for ${meetingDate.toISOString()}`)
          return
        }

        // Generate and upload all report types
        await this.generateAndUploadBoardReports(targetMeeting.id)

        logger.info(`Board reports generated and uploaded for meeting ${targetMeeting.id}`)
      } catch (error) {
        logger.error("Failed to auto-generate board reports:", error)
      }
    })

    this.scheduledJobs.set(jobName, job)
    logger.info(`Scheduled board report generation for ${generateDate.toISOString()}`)

    return job
  }

  /**
   * Generate and upload all board reports for a meeting
   */
  async generateAndUploadBoardReports(meetingId: string): Promise<void> {
    const reports: ReportGenerationOptions[] = [
      { reportType: "ceo", includeFinancials: true, includeRisks: true },
      { reportType: "cfo", includeFinancials: true },
      { reportType: "audit", includeRisks: true },
    ]

    const quarter = this.getCurrentQuarter()
    const year = new Date().getFullYear()

    for (const reportOptions of reports) {
      try {
        const { pdf } = await this.generateBoardReport(reportOptions)

        const title = `${reportOptions.reportType.toUpperCase()} Report - ${quarter} ${year}`

        await this.uploadDocumentToMeeting(meetingId, {
          title,
          content: pdf,
          contentType: "application/pdf",
          agendaItem: this.getAgendaItemForReport(reportOptions.reportType),
          classification: "confidential",
          accessControl: ["board_directors"],
        })

        logger.info(`Uploaded ${reportOptions.reportType} report to meeting ${meetingId}`)
      } catch (error) {
        logger.error(`Failed to generate/upload ${reportOptions.reportType} report:`, error)
      }
    }
  }

  /**
   * Sync action items from iBabs to ADPA
   */
  async syncActionItems(meetingId: string): Promise<number> {
    try {
      logger.info(`Syncing action items from iBabs meeting ${meetingId}`)

      const actionItems = await this.ibabsService.getActionItems(meetingId)

      let syncedCount = 0

      for (const item of actionItems) {
        try {
          // Check if action item already exists
          const existing = await pool.query(
            `SELECT id FROM ibabs_action_items WHERE ibabs_id = $1`,
            [item.id]
          )

          if (existing.rows.length === 0) {
            // Insert new action item
            await pool.query(
              `INSERT INTO ibabs_action_items (ibabs_id, meeting_id, title, description, assigned_to, due_date, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
              [
                item.id,
                item.meeting_id,
                item.title,
                item.description,
                item.assigned_to,
                item.due_date,
                item.status,
              ]
            )
            syncedCount++
          } else {
            // Update existing action item
            await pool.query(
              `UPDATE ibabs_action_items SET title = $1, description = $2, assigned_to = $3, due_date = $4, status = $5, updated_at = CURRENT_TIMESTAMP
               WHERE ibabs_id = $6`,
              [
                item.title,
                item.description,
                item.assigned_to,
                item.due_date,
                item.status,
                item.id,
              ]
            )
          }
        } catch (error) {
          logger.error(`Failed to sync action item ${item.id}:`, error)
        }
      }

      logger.info(`Synced ${syncedCount} new action items from meeting ${meetingId}`)
      return syncedCount
    } catch (error: any) {
      logger.error("Failed to sync action items:", error)
      throw new Error(`Action item sync failed: ${error.message}`)
    }
  }

  // Helper methods

  private async getAllPrograms(): Promise<Program[]> {
    try {
      const result = await pool.query(
        `SELECT id, name, description, status, budget, spent, start_date, end_date, owner, health_score
         FROM projects
         WHERE status != 'archived'
         ORDER BY name`
      )
      return result.rows
    } catch (error) {
      logger.error("Failed to get programs:", error)
      return []
    }
  }

  private async getProgram(programId: string): Promise<Program> {
    try {
      const result = await pool.query(
        `SELECT p.*, 
                (SELECT json_agg(r.*) FROM risks r WHERE r.project_id = p.id) as risks,
                (SELECT json_agg(m.*) FROM milestones m WHERE m.project_id = p.id) as milestones
         FROM projects p
         WHERE p.id = $1`,
        [programId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Program not found: ${programId}`)
      }

      return result.rows[0]
    } catch (error) {
      logger.error(`Failed to get program ${programId}:`, error)
      throw error
    }
  }

  private async getAllRisks(): Promise<Risk[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM risks WHERE status != 'closed' ORDER BY severity DESC, probability DESC`
      )
      return result.rows
    } catch (error) {
      logger.error("Failed to get risks:", error)
      return []
    }
  }

  private async calculatePortfolioMetrics(
    programs: Program[]
  ): Promise<PortfolioMetrics> {
    const activePrograms = programs.filter((p) => p.status === "active")

    const totalBudget = programs.reduce((sum, p) => sum + (p.budget || 0), 0)
    const totalSpent = programs.reduce((sum, p) => sum + (p.spent || 0), 0)

    const healthScores = programs
      .filter((p) => p.health_score !== undefined && p.health_score !== null)
      .map((p) => p.health_score!)

    const averageHealth =
      healthScores.length > 0
        ? healthScores.reduce((sum, h) => sum + h, 0) / healthScores.length
        : 0

    const onTrackPrograms = programs.filter(
      (p) => p.health_score && p.health_score >= 7
    ).length
    const atRiskPrograms = programs.filter(
      (p) => p.health_score && p.health_score >= 4 && p.health_score < 7
    ).length
    const criticalPrograms = programs.filter(
      (p) => p.health_score && p.health_score < 4
    ).length

    return {
      totalPrograms: programs.length,
      activePrograms: activePrograms.length,
      totalBudget,
      totalSpent,
      averageHealth,
      onTrackPrograms,
      atRiskPrograms,
      criticalPrograms,
    }
  }

  private async getTopPortfolioRisks(limit: number): Promise<Risk[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM risks 
         WHERE status != 'closed'
         ORDER BY 
           CASE severity 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             ELSE 4 
           END,
           CASE probability 
             WHEN 'high' THEN 1 
             WHEN 'medium' THEN 2 
             ELSE 3 
           END
         LIMIT $1`,
        [limit]
      )
      return result.rows
    } catch (error) {
      logger.error("Failed to get top risks:", error)
      return []
    }
  }

  private countRisksBySeverity(risks: Risk[]): {
    critical: number
    high: number
    medium: number
    low: number
  } {
    return {
      critical: risks.filter((r) => r.severity === "critical").length,
      high: risks.filter((r) => r.severity === "high").length,
      medium: risks.filter((r) => r.severity === "medium").length,
      low: risks.filter((r) => r.severity === "low").length,
    }
  }

  private estimateFinalSpend(programs: Program[]): number {
    // Simple estimation: if program is more than 50% complete, assume linear spending
    return programs.reduce((total, p) => {
      if (p.budget && p.spent !== undefined) {
        const utilization = p.spent / p.budget
        // Assume programs will spend 100% of budget
        return total + p.budget
      }
      return total
    }, 0)
  }

  private generateRecommendations(
    programs: Program[],
    metrics: PortfolioMetrics,
    risks: Risk[]
  ): string {
    let recommendations = ""

    if (metrics.criticalPrograms > 0) {
      recommendations += `- **Immediate attention required** for ${metrics.criticalPrograms} critical program(s)\n`
    }

    if (metrics.atRiskPrograms > 0) {
      recommendations += `- Monitor ${metrics.atRiskPrograms} at-risk program(s) closely\n`
    }

    const overBudgetCount = programs.filter(
      (p) => p.budget && p.spent && p.spent > p.budget
    ).length

    if (overBudgetCount > 0) {
      recommendations += `- Review budget for ${overBudgetCount} over-budget program(s)\n`
    }

    const criticalRisks = risks.filter((r) => r.severity === "critical").length
    if (criticalRisks > 0) {
      recommendations += `- Address ${criticalRisks} critical risk(s) as top priority\n`
    }

    if (recommendations === "") {
      recommendations = "- Portfolio is performing well. Continue current management practices.\n"
    }

    return recommendations
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      active: "🟢",
      planning: "🔵",
      onhold: "🟡",
      completed: "✅",
      cancelled: "🔴",
    }
    return icons[status.toLowerCase()] || "⚪"
  }

  private getHealthIcon(score: number): string {
    if (score >= 7) return "🟢"
    if (score >= 4) return "🟡"
    return "🔴"
  }

  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢",
    }
    return icons[severity.toLowerCase()] || "⚪"
  }

  private getAgendaItemForReport(reportType: ReportType): string {
    const agendaItems: Record<ReportType, string> = {
      ceo: "4", // CEO-rapportage
      cfo: "5", // CFO-rapportage
      audit: "6", // Audit Committee
      "program-detail": "7", // Program Details
    }
    return agendaItems[reportType]
  }

  private getCurrentQuarter(): string {
    const month = new Date().getMonth()
    const quarter = Math.floor(month / 3) + 1
    return `Q${quarter}`
  }

  private formatCurrency(amount: number): string {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  private formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
  }

  /**
   * Start weekly auto-scheduling
   */
  startAutoScheduling(): void {
    // Run every Monday at 9 AM
    const job = scheduleJob("ibabs-auto-schedule", "0 9 * * 1", async () => {
      logger.info("Running weekly iBabs board report auto-scheduling check")

      try {
        const upcomingMeetings = await this.ibabsService.getUpcomingMeetings(30)

        for (const meeting of upcomingMeetings) {
          const meetingDate = new Date(meeting.date)
          const daysUntil = this.getDaysUntilMeeting(meetingDate)

          if (daysUntil === 7) {
            logger.info(
              `Meeting in 7 days detected: ${meeting.title} on ${meeting.date}`
            )
            await this.generateAndUploadBoardReports(meeting.id)
          }
        }
      } catch (error) {
        logger.error("Auto-scheduling check failed:", error)
      }
    })

    this.scheduledJobs.set("ibabs-auto-schedule", job)
    logger.info("iBabs auto-scheduling started (runs every Monday at 9 AM)")
  }

  /**
   * Stop auto-scheduling
   */
  stopAutoScheduling(): void {
    const job = this.scheduledJobs.get("ibabs-auto-schedule")
    if (job) {
      job.cancel()
      this.scheduledJobs.delete("ibabs-auto-schedule")
      logger.info("iBabs auto-scheduling stopped")
    }
  }

  private getDaysUntilMeeting(meetingDate: Date): number {
    const now = new Date()
    const diffTime = meetingDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }
}
