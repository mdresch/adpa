import { pool } from '../database/connection'
import { aiService } from './aiService'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export interface AuditTriggerInput {
  templateId: string
  triggerType: 'lifecycle' | 'manual' | 'document_failure'
  documentFailureContext?: any
}

export class TemplateAuditService {
  async createPendingAudit(templateId: string, triggerType: string, version: number = 1): Promise<string> {
    const id = uuidv4()
    await pool.query(
      `INSERT INTO template_audits (id, template_id, template_version, status, trigger_type)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [id, templateId, version, triggerType]
    )
    return id
  }

  async runAudit(auditId: string, templateData: any, docFailureContext?: any) {
    const startTime = new Date()
    logger.info(`[TEMPLATE-AUDIT] Running audit ${auditId} for template ${templateData.id}`)
    
    try {
      // Update status to processing to reflect activity in UI
      await pool.query("UPDATE template_audits SET status = 'processing' WHERE id = $1", [auditId])
      const framework = templateData.framework || 'Custom'
      const templateName = templateData.name
      const templateDesc = templateData.description || ''
      const systemPrompt = templateData.system_prompt || ''
      const paragraphs = JSON.stringify(templateData.template_paragraphs || [])

      // 1. Governance Evaluator call
      const govPrompt = this.buildGovernancePrompt(framework, templateName, templateDesc, systemPrompt, paragraphs, docFailureContext)
      const govPromise = aiService.generateWithFallback({
        provider: 'google', // Default provider
        prompt: govPrompt,
        temperature: 0.2,
        max_tokens: 3000,
        aiCallType: 'draco_governance_evaluation'
      })

      // 2. Counterfactual Challenger call
      const chalPrompt = this.buildChallengerPrompt(framework, templateName, templateDesc, systemPrompt, paragraphs, docFailureContext)
      const chalPromise = aiService.generateWithFallback({
        provider: 'openai', // Default provider
        prompt: chalPrompt,
        temperature: 0.4,
        max_tokens: 3500,
        aiCallType: 'draco_counterfactual_challenge'
      })

      const [govResult, chalResult] = await Promise.all([govPromise, chalPromise])
      const govData = this.parseAIJson(govResult.content)
      const chalData = this.parseAIJson(chalResult.content)

      const isParsingFailure = govData._parsingError || chalData._parsingError

      let govScore: number | null = this.safeNum(govData.score, 70)
      let chalScore: number | null = this.safeNum(chalData.score, 70)
      let overallScore: number | null = Math.round(((govScore || 0) + (chalScore || 0)) / 2)

      // Calculate verdict
      let verdict: 'pass' | 'flagged' | 'fail' = 'pass'

      if (isParsingFailure) {
        govScore = null
        chalScore = null
        overallScore = null
        verdict = 'fail'
      } else {
        const hasCriticalGap = (govData.compliance_gaps || []).some((gap: any) => gap.severity === 'critical')
        const hasHighVulnerability = (chalData.logical_vulnerabilities || []).some((vuln: any) => vuln.severity === 'high' || vuln.severity === 'critical')
        const hasMajorGap = (govData.compliance_gaps || []).some((gap: any) => gap.severity === 'major')
        const hasMediumVulnerability = (chalData.logical_vulnerabilities || []).some((vuln: any) => vuln.severity === 'medium')

        if ((overallScore || 0) < 60 || hasCriticalGap || hasHighVulnerability) {
          verdict = 'fail'
        } else if ((overallScore || 0) < 75 || hasMajorGap || hasMediumVulnerability) {
          verdict = 'flagged'
        }
      }

      await pool.query(
        `UPDATE template_audits
         SET status = 'completed',
             overall_score = $1,
             governance_score = $2,
             resilience_score = $3,
             verdict = $4,
             governance_findings = $5,
             governance_recommendations = $6,
             compliance_gaps = $7,
             challenger_findings = $8,
             challenger_recommendations = $9,
             challenged_assumptions = $10,
             logical_vulnerabilities = $11,
             completed_at = NOW()
         WHERE id = $12`,
        [
          overallScore,
          govScore,
          chalScore,
          verdict,
          JSON.stringify(govData.findings || []),
          JSON.stringify(govData.recommendations || []),
          JSON.stringify(govData.compliance_gaps || []),
          JSON.stringify(chalData.findings || []),
          JSON.stringify(chalData.recommendations || []),
          JSON.stringify(chalData.challenged_assumptions || []),
          JSON.stringify(chalData.logical_vulnerabilities || []),
          auditId
        ]
      )
      logger.info(`[TEMPLATE-AUDIT] Completed audit ${auditId} with verdict ${verdict} (Score: ${overallScore ?? 'NA'})`)
    } catch (err: any) {
      logger.error(`[TEMPLATE-AUDIT] Audit failed for id ${auditId}`, { error: err.message })
      await pool.query(
        `UPDATE template_audits
         SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2`,
        [err.message || String(err), auditId]
      )
    }
  }

  private buildGovernancePrompt(framework: string, name: string, desc: string, systemPrompt: string, paragraphs: string, docFailureContext?: any): string {
    let failureSection = ''
    if (docFailureContext) {
      failureSection = `\n## Document Generation Failure Context:\nA document generated from this template failed a quality audit with a score of ${docFailureContext.documentScore}/100.\nIssues identified:\n${JSON.stringify(docFailureContext.issues || [])}\nRecommendations:\n${JSON.stringify(docFailureContext.recommendations || [])}\n\nPay close attention to these issues. Verify if they stem from gaps/vagueness in the template structure or prompt instructions.\n`
    }
    return `You are the Governance Evaluator on the DRACO Template Audit Board.
Your role: Rigorously audit this document template's prompt guidance, paragraphs, and structure for compliance with the designated framework: ${framework}.
${failureSection}

## Template to Audit:
- Name: ${name}
- Description: ${desc}
- Framework: ${framework}
- System Prompt / Guidance: ${systemPrompt}
- Paragraphs & Outlines:
${paragraphs}

## Framework-Specific Rules to Enforce:
- If PMBOK: Check if the template mandates clear project roles (Sponsor, Project Manager, etc.), explicitly tailors to Predictive vs Adaptive lifecycles, defines structured risk escalation levels, and requests a communications cadence matrix.
- If TOGAF: Check if the template includes Architecture Viewpoints, Gap Analysis procedures, stakeholder concern mappings, and compliance reviews.
- If SABSA: Check if the template mandates explicit Security Requirement Traceability, Risk & Threat Assessments, operational trust models, and security controls.
- Other: Validate against general project management and systems engineering governance best practices.

Respond ONLY with valid JSON matching this structure:
{
  "score": <0-100>,
  "findings": ["<finding 1>"],
  "recommendations": ["<remediation recommendation 1>"],
  "compliance_gaps": [
    {"framework": "${framework}", "requirement": "<missing element>", "gap_description": "<why it's weak>", "severity": "minor|major|critical"}
  ]
}`
  }

  private buildChallengerPrompt(framework: string, name: string, desc: string, systemPrompt: string, paragraphs: string, docFailureContext?: any): string {
    let failureSection = ''
    if (docFailureContext) {
      failureSection = `\n## Document Generation Failure Context:\nA document generated from this template failed a quality audit with a score of ${docFailureContext.documentScore}/100.\nIssues identified:\n${JSON.stringify(docFailureContext.issues || [])}\nRecommendations:\n${JSON.stringify(docFailureContext.recommendations || [])}\n\nPay close attention to these issues. Verify if they stem from gaps/vagueness in the template structure or prompt instructions.\n`
    }
    return `You are the Counterfactual Challenger on the DRACO Template Audit Board.
Your role: Adversarially stress-test this document template's instructions and prompt guidance. Identify logical loopholes, vague guidelines, and areas where the generating AI could hallucinate, make circular claims, or produce low-quality content.
${failureSection}

## Template to Audit:
- Name: ${name}
- Description: ${desc}
- Framework: ${framework}
- System Prompt / Guidance: ${systemPrompt}
- Paragraphs & Outlines:
${paragraphs}

Respond ONLY with valid JSON matching this structure:
{
  "score": <0-100>,
  "findings": ["<loophole 1>"],
  "recommendations": ["<actionable prompt sharpening 1>"],
  "challenged_assumptions": [
    {"assumption": "<weak template assumption>", "counter_argument": "<how generating AI might fail>", "severity": "low|medium|high"}
  ],
  "logical_vulnerabilities": [
    {"location": "<section>", "description": "<vulnerability>", "severity": "low|medium|high", "suggested_fix": "<how to fix>"}
  ]
}`
  }

  private parseAIJson(raw: string): any {
    let cleaned = raw.trim()
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
    cleaned = cleaned.trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      return { _parsingError: true, findings: ['Failed to parse JSON response from LLM'], recommendations: [] }
    }
  }

  private safeNum(val: any, fallback: number): number {
    const n = Number(val)
    return isNaN(n) ? fallback : n
  }

  async getTemplateAudits(templateId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM template_audits WHERE template_id = $1 ORDER BY created_at DESC`,
      [templateId]
    )
    return result.rows
  }

  async triggerManualAudit(templateId: string): Promise<string> {
    const tempResult = await pool.query(
      `SELECT * FROM templates WHERE id = $1 AND deleted_at IS NULL`,
      [templateId]
    )
    if (tempResult.rows.length === 0) {
      throw new Error('Template not found')
    }
    const templateData = tempResult.rows[0]

    const versionResult = await pool.query(
      "SELECT COUNT(*) FROM template_audits WHERE template_id = $1",
      [templateId]
    )
    const version = Number(versionResult.rows[0].count) + 1

    const auditId = await this.createPendingAudit(templateId, 'manual', version)
    
    // Run audit in background (non-blocking)
    setImmediate(() => {
      this.runAudit(auditId, templateData).catch(err => {
        logger.error(`[TEMPLATE-AUDIT] Manual audit execution failed for template ${templateId}`, err)
      })
    })

    return auditId
  }
}

export const templateAuditService = new TemplateAuditService()
