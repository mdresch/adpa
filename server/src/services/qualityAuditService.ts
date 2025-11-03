/**
 * Quality Audit Service
 * Automated quality assessment for AI-generated documents
 * 
 * Features:
 * - Multi-dimensional quality analysis (6 dimensions)
 * - AI-powered assessment using Gemini Flash
 * - Automatic audit after document generation
 * - Quality metadata storage
 * - Grade assignment (A-F)
 */

import { pool } from '../database/connection'
import { aiService } from './aiService'
import { logger } from '../utils/logger'

interface QualityDimensionalScores {
  completeness: number
  consistency: number
  professionalQuality: number
  standardsCompliance: number
  accuracy: number
  contextRelevance: number
}

interface QualityIssue {
  severity: 'critical' | 'major' | 'minor'
  dimension: string
  description: string
  location?: string
  recommendation?: string
}

interface QualityAuditResult {
  overallScore: number
  overallGrade: string
  qualityLevel: string
  dimensionalScores: QualityDimensionalScores
  findings: Record<string, string>
  issues: QualityIssue[]
  recommendations: string[]
  aiProvider?: string
  aiModel?: string
  analysisTokens?: number
  analysisCost?: number
  analysisTime?: number
}

class QualityAuditService {
  /**
   * Perform comprehensive quality audit on a generated document
   */
  async auditDocument(
    documentId: string,
    documentContent: string,
    documentType: string,
    projectContext: any,
    userId: string
  ): Promise<QualityAuditResult> {
    const startTime = Date.now()
    
    logger.info('[QUALITY-AUDIT] Starting audit', { 
      documentId, 
      documentType,
      contentLength: documentContent.length 
    })

    try {
      // 1. Create audit job record
      const auditJobId = await this.createAuditJob(documentId, userId)

      // 2. Perform AI-powered multi-dimensional analysis
      const analysisResults = await this.performAnalysis(
        documentContent,
        documentType,
        projectContext
      )

      // 3. Calculate overall score (weighted average)
      const dimensionalScores = this.extractDimensionalScores(analysisResults)
      const overallScore = this.calculateOverallScore(dimensionalScores)
      const overallGrade = this.calculateGrade(overallScore)
      const qualityLevel = this.getQualityLevel(overallScore)

      // 4. Extract findings, issues, and recommendations
      const findings = this.extractFindings(analysisResults)
      const issues = this.extractIssues(analysisResults)
      const recommendations = this.extractRecommendations(analysisResults, overallScore)

      const analysisTime = Date.now() - startTime

      // 5. Save audit results to database
      const auditId = await this.saveAuditResults({
        documentId,
        auditJobId,
        overallScore,
        overallGrade,
        qualityLevel,
        dimensionalScores,
        findings,
        issues,
        recommendations,
        aiProvider: analysisResults.provider || 'google',
        aiModel: analysisResults.model || 'gemini-2.5-flash',
        analysisTokens: analysisResults.tokens || 0,
        analysisCost: analysisResults.cost || 0,
        analysisTime
      })

      // 6. Update document quality status
      await this.updateDocumentQualityStatus(documentId, auditId, overallScore, overallGrade)

      // 7. Complete audit job
      await this.completeAuditJob(auditJobId, 'completed')

      logger.info('[QUALITY-AUDIT] Audit completed', {
        documentId,
        auditId,
        overallScore,
        overallGrade,
        analysisTime: `${analysisTime}ms`
      })

      // 8. Trigger template analysis if quality indicates improvement opportunities
      // Only trigger if:
      // - Score is below 90% (room for improvement)
      // - Document has a template assigned
      // - At least one dimension scored below 80%
      if (overallScore < 90) {
        const hasLowScore = Object.values(dimensionalScores).some(score => score < 80)
        
        if (hasLowScore) {
          // Get document template ID
          const docResult = await pool.query(
            'SELECT template_id FROM documents WHERE id = $1',
            [documentId]
          )
          
          const templateId = docResult.rows[0]?.template_id
          
          if (templateId) {
            logger.info('[QUALITY-AUDIT] Triggering automatic template analysis', {
              documentId,
              templateId,
              overallScore,
              reason: 'Quality score below 90% with improvement opportunities'
            })
            
            // Import and trigger template analysis asynchronously (don't block)
            const { templateImprovementService } = require('./templateImprovementService')
            
            templateImprovementService.analyzeTemplateQuality(templateId).catch((err: any) => {
              logger.error('[QUALITY-AUDIT] Auto-triggered template analysis failed', {
                templateId,
                error: err instanceof Error ? err.message : String(err)
              })
              // Don't fail audit if template analysis fails
            })
          }
        }
      }

      return {
        overallScore,
        overallGrade,
        qualityLevel,
        dimensionalScores,
        findings,
        issues,
        recommendations,
        aiProvider: analysisResults.provider,
        aiModel: analysisResults.model,
        analysisTokens: analysisResults.tokens,
        analysisCost: analysisResults.cost,
        analysisTime
      }
    } catch (error) {
      logger.error('[QUALITY-AUDIT] Audit failed', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Perform AI-powered analysis across all quality dimensions
   */
  private async performAnalysis(
    documentContent: string,
    documentType: string,
    projectContext: any
  ): Promise<any> {
    const analysisPrompt = this.buildAnalysisPrompt(
      documentContent,
      documentType,
      projectContext
    )

    const systemPrompt = this.getSystemPrompt()

    logger.info('[QUALITY-AUDIT] Calling AI for quality analysis', {
      documentType,
      contentLength: documentContent.length,
      provider: 'google',
      model: 'gemini-2.5-flash'
    })

    try {
      const result = await aiService.generate({
        provider: 'google',
        model: 'gemini-2.5-flash', // Fast and cost-effective for analysis
        prompt: analysisPrompt, // User prompt (required)
        system_prompt: systemPrompt, // System prompt (optional, snake_case)
        temperature: 0.3, // Lower temperature for consistent analysis
        max_tokens: 4000 // Max tokens (snake_case to match interface)
      })

      logger.info('[QUALITY-AUDIT] AI response received', {
        hasContent: !!result?.content,
        contentType: typeof result?.content,
        contentLength: result?.content?.length || 0,
        hasUsage: !!result?.usage
      })

      // Validate result before parsing
      if (!result || !result.content) {
        logger.error('[QUALITY-AUDIT] AI returned empty or invalid result', {
          hasResult: !!result,
          resultKeys: result ? Object.keys(result) : []
        })
        return this.getDefaultScores()
      }

      // Parse JSON response
      const analysisData = this.parseAnalysisResponse(result.content)

      return {
        ...analysisData,
        provider: 'google',
        model: 'gemini-2.5-flash',
        tokens: result.usage?.totalTokens || 0,
        cost: this.estimateCost(result.usage?.totalTokens || 0, 'google')
      }
    } catch (error) {
      logger.error('[QUALITY-AUDIT] AI analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Fallback: Return default scores if AI fails
      return this.getDefaultScores()
    }
  }

  /**
   * Build comprehensive analysis prompt for AI
   */
  private buildAnalysisPrompt(
    documentContent: string,
    documentType: string,
    projectContext: any
  ): string {
    const frameworkGuidance = this.getFrameworkGuidance(documentType)
    
    return `# Quality Audit Task

You are an expert document quality auditor. Analyze the following ${documentType} document and provide a comprehensive quality assessment.

## Document Type: ${documentType}

## Project Context:
- Project Name: ${projectContext.name || 'N/A'}
- Framework: ${projectContext.framework || 'N/A'}
- Objectives: ${projectContext.description || 'N/A'}

${frameworkGuidance}

## Document to Analyze:
\`\`\`
${documentContent.substring(0, 50000)} ${documentContent.length > 50000 ? '... (truncated)' : ''}
\`\`\`

## Your Task:
Analyze the document across 6 quality dimensions and provide scores (0-100) for each:

### 1. Completeness (0-100)
- Are all required sections present and fully populated?
- Are there any placeholders like "[Insert X]" or "TBD"?
- Are tables, charts, and examples complete?
- Are all cross-references populated?

**Scoring**:
- 90-100: Fully complete, no placeholders, all sections robust
- 70-89: Mostly complete, minor gaps (1-3 missing elements)
- 50-69: Significant gaps (4-7 missing elements)
- <50: Major sections incomplete or placeholder-heavy

### 2. Consistency (0-100)
- Are stakeholder names consistent throughout?
- Are dates formatted consistently?
- Is terminology used consistently (acronyms expanded on first use)?
- Are numbers and metrics consistent across sections?
- Do cross-references match?

**Scoring**:
- 90-100: Perfect consistency, no issues found
- 70-89: Minor inconsistencies (1-3 issues)
- 50-69: Moderate inconsistencies (4-7 issues)
- <50: Significant inconsistencies throughout

### 3. Professional Quality (0-100)
- Is the writing clear, concise, and professional?
- Is tone appropriate for executive audience?
- Are there grammar, spelling, or formatting errors?
- Is active voice used (not passive)?
- Is the document well-structured and easy to navigate?

**Scoring**:
- 90-100: Executive-ready, polished, publication-quality
- 70-89: Good quality, minor editing needed (5-10 minor issues)
- 50-69: Acceptable but needs significant polish (10-20 issues)
- <50: Unprofessional, requires major rewrite

### 4. Standards Compliance (0-100)
${this.getComplianceGuidance(documentType)}

**Scoring**:
- 90-100: Fully compliant with all standards
- 70-89: Mostly compliant, minor gaps (1-2 principles missing)
- 50-69: Partial compliance, major gaps (3-5 principles missing)
- <50: Non-compliant or incorrect application

### 5. Accuracy (0-100)
- Is all data correctly extracted from project context?
- Are there any hallucinations or fabricated information?
- Do numbers, dates, and names match the source?
- Are calculations correct?

**Scoring**:
- 90-100: 100% accurate, no errors found
- 70-89: Minor errors (1-2 issues)
- 50-69: Several errors (3-5 issues)
- <50: Significant inaccuracies or hallucinations

### 6. Context Relevance (0-100)
- Does content align with stated project objectives?
- Is there scope creep or irrelevant content?
- Are all sections relevant to the project type?
- Does the document address the specific project needs?

**Scoring**:
- 90-100: Perfect alignment with project context
- 70-89: Good alignment, minor drift (1-2 irrelevant sections)
- 50-69: Partial alignment, some irrelevant content
- <50: Significant drift or mostly irrelevant

## Response Format (MUST BE VALID JSON):
\`\`\`json
{
  "completeness": <score 0-100>,
  "consistency": <score 0-100>,
  "professional_quality": <score 0-100>,
  "standards_compliance": <score 0-100>,
  "accuracy": <score 0-100>,
  "context_relevance": <score 0-100>,
  "findings": {
    "completeness": "<2-3 sentence finding>",
    "consistency": "<2-3 sentence finding with 1-2 specific examples>",
    "professional_quality": "<2-3 sentence finding with examples>",
    "standards_compliance": "<2-3 sentence finding>",
    "accuracy": "<2-3 sentence finding>",
    "context_relevance": "<2-3 sentence finding>"
  },
  "issues": [
    {
      "severity": "critical|major|minor",
      "dimension": "<dimension name>",
      "description": "<specific issue description>",
      "location": "<section or page reference>",
      "recommendation": "<how to fix>"
    }
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ]
}
\`\`\`

**CRITICAL**: Respond ONLY with valid JSON. No explanatory text before or after.

Be thorough, specific, and constructive. Provide concrete examples of issues found.
`
  }

  /**
   * Get framework-specific compliance guidance
   */
  private getComplianceGuidance(documentType: string): string {
    const guidanceMap: Record<string, string> = {
      'project-charter': `
For Project Charter (PMBOK):
- Is project purpose clearly stated?
- Are success criteria measurable?
- Are stakeholders identified?
- Is project manager authority defined?
`,
      'project-management-plan': `
For Project Management Plan (PMBOK 8):
- Are all 12 principles referenced? (Value, Systems Thinking, Stewardship, Team, Stakeholders, Leadership, Tailoring, Quality, Complexity, Risk, Adaptability, Change)
- Are all 8 performance domains addressed? (Stakeholders, Team, Planning, Project Work, Delivery, Measurement, Uncertainty, Development Approach)
- Is the document outcome-focused (not just process-focused)?
`,
      'scope-baseline': `
For Scope Baseline (PMBOK):
- Does it include Scope Statement, WBS, and WBS Dictionary?
- Are all deliverables clearly defined?
- Are acceptance criteria specified?
`,
      'stakeholder-register': `
For Stakeholder Register (PMBOK):
- Are all key stakeholders identified?
- Is engagement strategy defined for each?
- Are power/interest levels assessed?
`,
      'default': `
- Are industry standards and best practices followed?
- Is the document consistent with the stated framework?
- Are all required elements present for this document type?
`
    }

    return guidanceMap[documentType] || guidanceMap['default']
  }

  /**
   * Get framework-specific guidance for analysis
   */
  private getFrameworkGuidance(documentType: string): string {
    const frameworkMap: Record<string, string> = {
      'project-management-plan': '**Framework**: PMBOK 8th Edition - Check for 12 Principles and 8 Performance Domains',
      'project-charter': '**Framework**: PMBOK 6th/7th Edition - Check for authorization, objectives, success criteria',
      'scope-baseline': '**Framework**: PMBOK - Check for Scope Statement + WBS + WBS Dictionary',
      'stakeholder-register': '**Framework**: PMBOK - Check for stakeholder analysis and engagement strategies',
      'business-case': '**Framework**: BABOK v3 - Check for business need, benefits, costs, risks',
      'default': '**Framework**: Industry best practices'
    }

    return frameworkMap[documentType] || frameworkMap['default']
  }

  /**
   * Get system prompt for quality auditor AI
   */
  private getSystemPrompt(): string {
    return `You are an expert document quality auditor with 20+ years of experience in project management, business analysis, and technical writing.

Your role is to perform rigorous, constructive quality audits of project management and business analysis documents. You evaluate documents against industry standards (PMBOK, BABOK, DMBOK) and best practices.

You are thorough but fair, identifying both strengths and weaknesses. Your feedback is specific, actionable, and professional. You provide concrete examples when identifying issues.

CRITICAL INSTRUCTIONS:
1. Respond ONLY with valid JSON (no text before or after)
2. Be specific with examples (e.g., "Section 3.2 uses passive voice: 'will be delivered by' should be 'will deliver'")
3. Provide actionable recommendations (not vague suggestions)
4. Score fairly but rigorously
5. Focus on the most impactful issues first

Remember: Your audit helps improve future document generation, so be detailed and constructive.`
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(content: string): any {
    try {
      // Remove any markdown code blocks if present
      let cleaned = content.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7)
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3)
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3)
      }
      
      const parsed = JSON.parse(cleaned.trim())
      return parsed
    } catch (error) {
      logger.error('[QUALITY-AUDIT] Failed to parse AI response', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 200)
      })
      
      // Return default scores if parsing fails
      return this.getDefaultScores()
    }
  }

  /**
   * Extract dimensional scores from analysis
   */
  private extractDimensionalScores(analysisResults: any): QualityDimensionalScores {
    return {
      completeness: this.validateScore(analysisResults.completeness, 70),
      consistency: this.validateScore(analysisResults.consistency, 70),
      professionalQuality: this.validateScore(analysisResults.professional_quality, 70),
      standardsCompliance: this.validateScore(analysisResults.standards_compliance, 70),
      accuracy: this.validateScore(analysisResults.accuracy, 80),
      contextRelevance: this.validateScore(analysisResults.context_relevance, 80)
    }
  }

  /**
   * Validate score is in valid range, with fallback
   */
  private validateScore(score: any, fallback: number): number {
    const num = parseInt(score, 10)
    if (isNaN(num) || num < 0 || num > 100) {
      logger.warn('[QUALITY-AUDIT] Invalid score, using fallback', { score, fallback })
      return fallback
    }
    return num
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(scores: QualityDimensionalScores): number {
    const weights = {
      completeness: 0.20,
      consistency: 0.15,
      professionalQuality: 0.20,
      standardsCompliance: 0.20,
      accuracy: 0.15,
      contextRelevance: 0.10
    }

    const weightedScore =
      scores.completeness * weights.completeness +
      scores.consistency * weights.consistency +
      scores.professionalQuality * weights.professionalQuality +
      scores.standardsCompliance * weights.standardsCompliance +
      scores.accuracy * weights.accuracy +
      scores.contextRelevance * weights.contextRelevance

    return Math.round(weightedScore)
  }

  /**
   * Calculate letter grade from score
   */
  private calculateGrade(score: number): string {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  /**
   * Get quality level description
   */
  private getQualityLevel(score: number): string {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Acceptable'
    if (score >= 60) return 'Below Standard'
    return 'Unsatisfactory'
  }

  /**
   * Extract findings from analysis results
   */
  private extractFindings(analysisResults: any): Record<string, string> {
    const findings = analysisResults.findings || {}
    
    return {
      completeness: findings.completeness || 'No detailed findings available',
      consistency: findings.consistency || 'No detailed findings available',
      professionalQuality: findings.professional_quality || 'No detailed findings available',
      standardsCompliance: findings.standards_compliance || 'No detailed findings available',
      accuracy: findings.accuracy || 'No detailed findings available',
      contextRelevance: findings.context_relevance || 'No detailed findings available'
    }
  }

  /**
   * Extract issues from analysis
   */
  private extractIssues(analysisResults: any): QualityIssue[] {
    const issues = analysisResults.issues || []
    
    return issues.map((issue: any) => ({
      severity: issue.severity || 'minor',
      dimension: issue.dimension || 'general',
      description: issue.description || 'No description provided',
      location: issue.location,
      recommendation: issue.recommendation
    }))
  }

  /**
   * Generate actionable recommendations
   */
  private extractRecommendations(analysisResults: any, overallScore: number): string[] {
    const recommendations = analysisResults.recommendations || []

    // Add score-specific recommendations
    const scoreRecommendations: string[] = []
    
    if (overallScore < 70) {
      scoreRecommendations.push('CRITICAL: Overall quality is below acceptable standards. Consider re-generation with improved prompts or different AI provider.')
    } else if (overallScore < 85) {
      scoreRecommendations.push('Recommend professional review and polish before submission to stakeholders.')
    } else if (overallScore >= 90) {
      scoreRecommendations.push('Excellent quality! Document is ready for executive presentation with minimal editing.')
    }

    return [...scoreRecommendations, ...recommendations]
  }

  /**
   * Get default scores when AI analysis fails
   */
  private getDefaultScores(): any {
    logger.warn('[QUALITY-AUDIT] Using default scores (AI analysis failed)')
    
    return {
      completeness: 70,
      consistency: 70,
      professional_quality: 70,
      standards_compliance: 70,
      accuracy: 80,
      context_relevance: 80,
      findings: {
        completeness: 'AI analysis unavailable - default score applied',
        consistency: 'AI analysis unavailable - default score applied',
        professional_quality: 'AI analysis unavailable - default score applied',
        standards_compliance: 'AI analysis unavailable - default score applied',
        accuracy: 'AI analysis unavailable - default score applied',
        context_relevance: 'AI analysis unavailable - default score applied'
      },
      issues: [],
      recommendations: ['AI analysis was unavailable. Manual review recommended.']
    }
  }

  /**
   * Estimate cost based on token usage
   */
  private estimateCost(tokens: number, provider: string): number {
    const costPer1K: Record<string, number> = {
      'google': 0.00001, // Gemini Flash
      'openai': 0.00150,  // GPT-4
      'anthropic': 0.00300 // Claude
    }
    
    const rate = costPer1K[provider] || 0.00001
    return (tokens / 1000) * rate
  }

  /**
   * Save audit results to database
   */
  private async saveAuditResults(auditData: any): Promise<string> {
    const result = await pool.query(
      `INSERT INTO quality_audits (
        document_id, audit_job_id, overall_score, overall_grade, quality_level,
        completeness_score, consistency_score, professional_quality_score,
        standards_compliance_score, accuracy_score, context_relevance_score,
        findings, issues, recommendations, 
        ai_provider, ai_model, analysis_tokens, analysis_cost, analysis_time,
        audited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id`,
      [
        auditData.documentId,
        auditData.auditJobId,
        auditData.overallScore,
        auditData.overallGrade,
        auditData.qualityLevel,
        auditData.dimensionalScores.completeness,
        auditData.dimensionalScores.consistency,
        auditData.dimensionalScores.professionalQuality,
        auditData.dimensionalScores.standardsCompliance,
        auditData.dimensionalScores.accuracy,
        auditData.dimensionalScores.contextRelevance,
        JSON.stringify(auditData.findings),
        JSON.stringify(auditData.issues),
        JSON.stringify(auditData.recommendations),
        auditData.aiProvider,
        auditData.aiModel,
        auditData.analysisTokens,
        auditData.analysisCost,
        auditData.analysisTime,
        auditData.userId || null
      ]
    )

    return result.rows[0].id
  }

  /**
   * Update document with quality status and link to audit
   */
  private async updateDocumentQualityStatus(
    documentId: string,
    auditId: string,
    score: number,
    grade: string
  ): Promise<void> {
    let status: string
    if (score >= 85) status = 'passed'
    else if (score >= 70) status = 'warning'
    else status = 'failed'

    await pool.query(
      `UPDATE documents 
       SET quality_audit_id = $1, quality_status = $2, quality_score = $3, updated_at = NOW()
       WHERE id = $4`,
      [auditId, status, score, documentId]
    )

    logger.info('[QUALITY-AUDIT] Document quality status updated', {
      documentId,
      auditId,
      status,
      score,
      grade
    })
  }

  /**
   * Create audit job record
   */
  private async createAuditJob(documentId: string, userId: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO jobs (type, status, data, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        'quality-audit',
        'processing',
        JSON.stringify({ documentId }),
        userId
      ]
    )
    
    return result.rows[0].id
  }

  /**
   * Complete audit job
   */
  private async completeAuditJob(jobId: string, status: string): Promise<void> {
    await pool.query(
      `UPDATE jobs 
       SET status = $1, completed_at = NOW(), progress = 100
       WHERE id = $2`,
      [status, jobId]
    )
  }

  /**
   * Get quality audit for a document
   */
  async getDocumentAudit(documentId: string): Promise<any> {
    const result = await pool.query(
      `SELECT qa.*, 
              COALESCE(d.title, d.name) as document_title,
              t.name as document_type
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       LEFT JOIN templates t ON d.template_id = t.id
       WHERE qa.document_id = $1
       ORDER BY qa.audited_at DESC
       LIMIT 1`,
      [documentId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  }

  /**
   * Get quality statistics (30-day rolling average)
   */
  async getQualityStats(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_audits,
        AVG(overall_score)::integer as average_score,
        COUNT(CASE WHEN overall_grade = 'A' THEN 1 END) as grade_a_count,
        COUNT(CASE WHEN overall_grade = 'B' THEN 1 END) as grade_b_count,
        COUNT(CASE WHEN overall_grade = 'C' THEN 1 END) as grade_c_count,
        COUNT(CASE WHEN overall_grade = 'D' THEN 1 END) as grade_d_count,
        COUNT(CASE WHEN overall_grade = 'F' THEN 1 END) as grade_f_count,
        AVG(completeness_score)::integer as avg_completeness,
        AVG(consistency_score)::integer as avg_consistency,
        AVG(professional_quality_score)::integer as avg_professional_quality,
        AVG(standards_compliance_score)::integer as avg_standards_compliance,
        AVG(accuracy_score)::integer as avg_accuracy,
        AVG(context_relevance_score)::integer as avg_context_relevance
      FROM quality_audits
      WHERE audited_at > NOW() - INTERVAL '30 days'
    `)

    return result.rows[0]
  }

  /**
   * Get quality trends by provider
   */
  async getProviderQualityComparison(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        ai_provider,
        ai_model,
        COUNT(*) as audit_count,
        AVG(overall_score)::integer as avg_quality,
        MIN(overall_score) as min_quality,
        MAX(overall_score) as max_quality,
        AVG(analysis_cost) as avg_cost,
        AVG(analysis_time) as avg_time_ms
      FROM quality_audits
      WHERE audited_at > NOW() - INTERVAL '30 days'
      AND ai_provider IS NOT NULL
      GROUP BY ai_provider, ai_model
      ORDER BY avg_quality DESC
    `)

    return result.rows
  }

  /**
   * Get common issues across all audits
   */
  async getCommonIssues(limit: number = 20): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        issue->>'dimension' as dimension,
        issue->>'description' as description,
        issue->>'severity' as severity,
        COUNT(*) as frequency
      FROM quality_audits, jsonb_array_elements(issues) as issue
      WHERE audited_at > NOW() - INTERVAL '30 days'
      GROUP BY dimension, description, severity
      ORDER BY frequency DESC
      LIMIT $1
    `, [limit])

    return result.rows
  }
}

export const qualityAuditService = new QualityAuditService()

