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
  overallScore: number | null
  overallGrade: string | null
  qualityLevel: string | null
  dimensionalScores: QualityDimensionalScores
  findings: Record<string, string>
  issues: QualityIssue[]
  recommendations: string[]
  aiProvider?: string
  aiModel?: string
  analysisTokens?: number
  analysisCost?: number
  analysisTime?: number
  auditPerformed?: boolean
}

class QualityAuditService {
  /**
   * Perform comprehensive quality audit on a generated document
   */
  async auditDocument(
    documentId: string,
    documentContent: string,
    documentType: string,
    projectContext: Record<string, unknown>,
    userId: string
  ): Promise<QualityAuditResult> {
    const startTime = Date.now()
    
    // Validate inputs
    if (!documentContent || typeof documentContent !== 'string') {
      logger.error('[QUALITY-AUDIT] Invalid document content', {
        documentId,
        hasContent: !!documentContent,
        contentType: typeof documentContent
      })
      throw new Error('Document content is required for quality audit')
    }
    
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

      // 3. Calculate overall score (weighted average) - only if audit was performed
      const dimensionalScores = this.extractDimensionalScores(analysisResults)
      const auditPerformed = analysisResults.audit_performed !== false
      
      let overallScore: number | null = null
      let overallGrade: string | null = null
      let qualityLevel: string | null = null
      
      if (auditPerformed) {
        overallScore = this.calculateOverallScore(dimensionalScores)
        overallGrade = this.calculateGrade(overallScore)
        qualityLevel = this.getQualityLevel(overallScore)
      } else {
        // No audit performed - keep values as null
        overallScore = null
        overallGrade = null
        qualityLevel = null
      }

      // 4. Extract findings, issues, and recommendations
      const findings = this.extractFindings(analysisResults)
      const issues = this.extractIssues(analysisResults)
      const recommendations = this.extractRecommendations(analysisResults, overallScore)

      // 4.5. Calculate compliance metrics if not available in generation_metadata
      let complianceMetrics = null
      let existingQualityGates = null
      try {
        // Try to get compliance metrics and quality gates from document's generation_metadata first
        const docResult = await pool.query(
          'SELECT generation_metadata, template_id, template_framework FROM documents WHERE id = $1',
          [documentId]
        )
        
        if (docResult.rows.length > 0) {
          const doc = docResult.rows[0]
          const genMetadata = doc.generation_metadata
          
          if (genMetadata) {
            const metadata = typeof genMetadata === 'string' ? JSON.parse(genMetadata) : genMetadata
            if (metadata.complianceMetrics) {
              complianceMetrics = metadata.complianceMetrics
              logger.info('[QUALITY-AUDIT] Using compliance metrics from generation_metadata', {
                documentId,
                hasComplianceMetrics: true
              })
            }
            
            // Extract existing quality gates
            existingQualityGates = metadata.quality_gate_results || metadata.quality_gates || null
            if (existingQualityGates) {
              logger.info('[QUALITY-AUDIT] Found existing quality gates in generation_metadata', {
                documentId,
                gateCount: existingQualityGates.length
              })
            }
          }
        }
        
        // If not found in generation_metadata, calculate them
        if (!complianceMetrics) {
          logger.info('[QUALITY-AUDIT] Calculating compliance metrics', { documentId })
          
          // Import the calculateComplianceMetrics function
          const { calculateComplianceMetrics } = await import('../utils/documentMetadata')
          
          // Create a minimal metadata object for compliance calculation
          const tempMetadata = {
            wordCount: documentContent.split(/\s+/).filter(Boolean).length,
            characterCount: documentContent.length,
            sentenceCount: (documentContent.match(/[.!?]+/g) || []).length,
            paragraphCount: (documentContent.match(/\n\n+/g) || []).length + 1,
            templateId: projectContext.templateId || undefined,
            framework: projectContext.framework || undefined
          } as any
          
          // Calculate compliance metrics directly
          complianceMetrics = calculateComplianceMetrics(
            documentContent,
            tempMetadata,
            projectContext.framework as string
          )
          
          logger.info('[QUALITY-AUDIT] Compliance metrics calculated', {
            documentId,
            overallComplianceRating: complianceMetrics.overallComplianceRating,
            pmbokGuide: complianceMetrics.pmbokGuide,
            gdpr: complianceMetrics.gdpr,
            hipaa: complianceMetrics.hipaa,
            soc2: complianceMetrics.soc2
          })
        }
      } catch (error) {
        logger.warn('[QUALITY-AUDIT] Failed to calculate compliance metrics', {
          documentId,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue without compliance metrics - they're optional
      }

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
        complianceMetrics, // Include compliance metrics
        existingQualityGates, // Include existing quality gates if found
        aiProvider: (analysisResults.provider as string) || 'google',
        aiModel: (analysisResults.model as string) || 'gemini-2.5-flash',
        analysisTokens: (analysisResults.tokens as number) || 0,
        analysisCost: (analysisResults.cost as number) || 0,
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

      // 8. Check for quality regression and trigger AI template optimization
      const docResult = await pool.query(
        'SELECT template_id FROM documents WHERE id = $1',
        [documentId]
      )
      const templateId = docResult.rows[0]?.template_id

      if (templateId) {
        // Get previous audit for same template
        const previousAudit = await pool.query(
          `SELECT qa.*
           FROM quality_audits qa
           JOIN documents d ON qa.document_id = d.id
           WHERE d.template_id = $1
           AND qa.id != $2
           AND qa.audited_at < (SELECT audited_at FROM quality_audits WHERE id = $2)
           ORDER BY qa.audited_at DESC
           LIMIT 1`,
          [templateId, auditId]
        )

        // Detect quality regression (5%+ drop)
        if (previousAudit.rows.length > 0) {
          const prevScore = previousAudit.rows[0].overall_score
          const qualityDrop = prevScore - overallScore

          if (qualityDrop >= 5) {
            logger.info('[QUALITY-AUDIT] 📉 Quality regression detected! Triggering AI optimization', {
              templateId,
              previousScore: prevScore,
              currentScore: overallScore,
              regression: qualityDrop
            })

            // Trigger AI-powered template optimization
            const { templateOptimizationService } = await import('./templateOptimizationService')
            
            templateOptimizationService.analyzeRegressionAndOptimize(
              templateId,
              previousAudit.rows[0],
              {
                overall_score: overallScore,
                overall_grade: overallGrade,
                completeness_score: dimensionalScores.completeness,
                consistency_score: dimensionalScores.consistency,
                professional_quality_score: dimensionalScores.professionalQuality,
                standards_compliance_score: dimensionalScores.standardsCompliance,
                accuracy_score: dimensionalScores.accuracy,
                context_relevance_score: dimensionalScores.contextRelevance,
                issues,
                recommendations
              }
            ).catch((err: Error) => {
              logger.error('[QUALITY-AUDIT] Template optimization failed (non-blocking)', {
                error: err.message
              })
            })
          }
        }

        // 9. Also trigger regular template analysis if quality is below 90%
        if (overallScore < 90) {
          const hasLowScore = Object.values(dimensionalScores).some(score => score < 80)
          
          if (hasLowScore) {
            logger.info('[QUALITY-AUDIT] Triggering automatic template analysis', {
              documentId,
              templateId,
              overallScore,
              reason: 'Quality score below 90% with improvement opportunities'
            })
            
            const { templateImprovementService } = require('./templateImprovementService')
            
            templateImprovementService.analyzeTemplateQuality(templateId).catch((err: Error) => {
              logger.error('[QUALITY-AUDIT] Auto-triggered template analysis failed', {
                templateId,
                error: err.message
              })
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
        aiProvider: (analysisResults.provider as string) || undefined,
        aiModel: (analysisResults.model as string) || undefined,
        analysisTokens: (analysisResults.tokens as number) || undefined,
        analysisCost: (analysisResults.cost as number) || undefined,
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
    projectContext: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
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
      // Use automatic failover system - tries providers in priority order from database
      const result = await aiService.generateWithFallback({
        provider: 'auto', // Let system choose based on database configuration
        prompt: analysisPrompt, // User prompt (required)
        system_prompt: systemPrompt, // System prompt (optional, snake_case)
        temperature: 0.3, // Lower temperature for consistent analysis
        max_tokens: 4000 // Max tokens (snake_case to match interface)
      })

      logger.info('[QUALITY-AUDIT] AI response received', {
        hasContent: !!result?.content,
        contentType: typeof result?.content,
        contentLength: result?.content?.length || 0,
        hasUsage: !!result?.usage,
        usageData: result?.usage
      })

      // Validate result before parsing
      if (!result || !result.content) {
        logger.error('[QUALITY-AUDIT] AI returned empty or invalid result', {
          hasResult: !!result,
          resultKeys: result ? Object.keys(result) : []
        })
        return this.getNoAuditResponse()
      }

      // Extract token usage from AI response
      const usage = result.usage as { totalTokens?: number; total_tokens?: number; promptTokens?: number; prompt_tokens?: number; completionTokens?: number; completion_tokens?: number } | undefined
      const totalTokens = usage?.totalTokens || usage?.total_tokens || 0
      const promptTokens = usage?.promptTokens || usage?.prompt_tokens || 0
      const completionTokens = usage?.completionTokens || usage?.completion_tokens || 0
      const estimatedCost = this.estimateCost(totalTokens, 'google')

      logger.info('[QUALITY-AUDIT] Token usage captured', {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: `$${estimatedCost.toFixed(4)}`
      })

      // Parse JSON response
      const analysisData = this.parseAnalysisResponse(result.content)

      return {
        ...analysisData,
        provider: 'google',
        model: 'gemini-2.5-flash',
        tokens: totalTokens,
        cost: estimatedCost
      }
    } catch (error) {
      logger.error('[QUALITY-AUDIT] AI analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Fallback: Return no audit response if AI fails
      return this.getNoAuditResponse()
    }
  }

  /**
   * Build comprehensive analysis prompt for AI
   */
  private buildAnalysisPrompt(
    documentContent: string,
    documentType: string,
    projectContext: Record<string, unknown>
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
  private parseAnalysisResponse(content: string): Record<string, unknown> {
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
      
      // Return no audit response if parsing fails
      return this.getNoAuditResponse()
    }
  }

  /**
   * Extract dimensional scores from analysis
   */
  private extractDimensionalScores(analysisResults: Record<string, unknown>): QualityDimensionalScores {
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
  private validateScore(score: unknown, fallback: number): number {
    const num = parseInt(String(score), 10)
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
  private extractFindings(analysisResults: Record<string, unknown>): Record<string, string> {
    const findings = (analysisResults.findings as Record<string, string>) || {}
    
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
  private extractIssues(analysisResults: Record<string, unknown>): QualityIssue[] {
    const issues = Array.isArray(analysisResults.issues) ? analysisResults.issues : []
    
    return issues.map((issue: unknown) => {
      const issueObj = issue as Record<string, unknown>
      const severity = issueObj.severity as string || 'minor'
      return {
        severity: (['critical', 'major', 'minor'].includes(severity) ? severity : 'minor') as 'critical' | 'major' | 'minor',
        dimension: (issueObj.dimension as string) || 'general',
        description: (issueObj.description as string) || 'No description provided',
        location: issueObj.location as string | undefined,
        recommendation: issueObj.recommendation as string | undefined
      }
    })
  }

  /**
   * Generate actionable recommendations
   */
  private extractRecommendations(analysisResults: Record<string, unknown>, overallScore: number): string[] {
    const recommendations = Array.isArray(analysisResults.recommendations) ? analysisResults.recommendations as string[] : []

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
   * Get "no audit performed" response when AI analysis fails
   * This ensures transparency and avoids misleading mock scores
   */
  private getNoAuditResponse(): Record<string, unknown> {
    logger.warn('[QUALITY-AUDIT] AI analysis unavailable - no audit performed')
    
    return {
      completeness: null,
      consistency: null,
      professional_quality: null,
      standards_compliance: null,
      accuracy: null,
      context_relevance: null,
      findings: {
        completeness: 'AI analysis unavailable - no audit performed',
        consistency: 'AI analysis unavailable - no audit performed',
        professional_quality: 'AI analysis unavailable - no audit performed',
        standards_compliance: 'AI analysis unavailable - no audit performed',
        accuracy: 'AI analysis unavailable - no audit performed',
        context_relevance: 'AI analysis unavailable - no audit performed'
      },
      issues: [],
      recommendations: ['AI analysis was unavailable. Manual quality review recommended.'],
      provider: 'none',
      model: 'none',
      tokens: 0,
      cost: 0,
      audit_performed: false,
      audit_status: 'not_performed'
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
  private async saveAuditResults(auditData: {
    documentId: string
    auditJobId: string
    overallScore: number | null
    overallGrade: string | null
    qualityLevel: string | null
    dimensionalScores: QualityDimensionalScores
    findings: Record<string, string>
    issues: QualityIssue[]
    recommendations: string[]
    complianceMetrics?: any // Compliance metrics (PMBOK, GDPR, HIPAA, etc.)
    existingQualityGates?: any[] // Existing quality gates from generation_metadata
    aiProvider?: string
    aiModel?: string
    analysisTokens?: number
    analysisCost?: number
    analysisTime: number
    userId?: string
  }): Promise<string> {
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

    const auditId = result.rows[0].id

    // Update document's generation_metadata with compliance metrics if calculated
    if (auditData.complianceMetrics) {
      try {
        const docResult = await pool.query(
          'SELECT generation_metadata FROM documents WHERE id = $1',
          [auditData.documentId]
        )
        
        if (docResult.rows.length > 0) {
          let genMetadata = docResult.rows[0].generation_metadata
          
          // Parse if string, otherwise use as-is
          if (typeof genMetadata === 'string') {
            try {
              genMetadata = JSON.parse(genMetadata)
            } catch {
              genMetadata = {}
            }
          } else if (!genMetadata) {
            genMetadata = {}
          }
          
          // Always update compliance metrics (they may have been recalculated)
          genMetadata.complianceMetrics = auditData.complianceMetrics
          
          // Extract and store EU AI Act quality gate results if available
          // This ensures quality gates are visible in metadata even if they weren't stored during generation
          if (genMetadata.quality_gate_results || genMetadata.quality_gates || auditData.existingQualityGates) {
            // Use existing quality gates or provided ones
            const gatesToUse = genMetadata.quality_gate_results || genMetadata.quality_gates || auditData.existingQualityGates || []
            genMetadata.quality_gate_results = gatesToUse
            genMetadata.quality_gates = gatesToUse
            
            logger.info('[QUALITY-AUDIT] Quality gates already exist in generation_metadata', {
              documentId: auditData.documentId,
              gateCount: gatesToUse.length
            })
          } else {
            // Try to extract EU AI Act gate from compliance metrics and create quality gate structure
            // This ensures EU AI Act gates are visible even if they weren't stored during generation
            const euAIActData = auditData.complianceMetrics?.euAIAct
            if (euAIActData && euAIActData.criteria) {
              const euAIActGate = {
                gate_id: 'EU_AI_ACT_COMPLIANCE_GATE',
                gate_name: 'EU AI Act Compliance Gate',
                passed: euAIActData.passed !== false,
                score: euAIActData.overallScore || 0,
                action_on_failure: 'warn', // EU AI Act gates are warnings, not blockers
                criteria_results: [
                  {
                    criterion_id: 'EU_AI_ACT_TRANSPARENCY',
                    criterion_name: 'Transparency',
                    score: euAIActData.criteria.transparency?.score || 0,
                    threshold: euAIActData.criteria.transparency?.threshold || 80,
                    passed: euAIActData.criteria.transparency?.passed !== false,
                    weight: euAIActData.criteria.transparency?.weight || 0.30
                  },
                  {
                    criterion_id: 'EU_AI_ACT_HUMAN_OVERSIGHT',
                    criterion_name: 'Human Oversight',
                    score: euAIActData.criteria.humanOversight?.score || 0,
                    threshold: euAIActData.criteria.humanOversight?.threshold || 80,
                    passed: euAIActData.criteria.humanOversight?.passed !== false,
                    weight: euAIActData.criteria.humanOversight?.weight || 0.30
                  },
                  {
                    criterion_id: 'EU_AI_ACT_ACCURACY',
                    criterion_name: 'Accuracy',
                    score: euAIActData.criteria.accuracy?.score || 0,
                    threshold: euAIActData.criteria.accuracy?.threshold || 70,
                    passed: euAIActData.criteria.accuracy?.passed !== false,
                    weight: euAIActData.criteria.accuracy?.weight || 0.25
                  },
                  {
                    criterion_id: 'EU_AI_ACT_DATA_GOVERNANCE',
                    criterion_name: 'Data Governance',
                    score: euAIActData.criteria.dataGovernance?.score || 0,
                    threshold: euAIActData.criteria.dataGovernance?.threshold || 60,
                    passed: euAIActData.criteria.dataGovernance?.passed !== false,
                    weight: euAIActData.criteria.dataGovernance?.weight || 0.10
                  },
                  {
                    criterion_id: 'EU_AI_ACT_RECORD_KEEPING',
                    criterion_name: 'Record Keeping',
                    score: euAIActData.criteria.recordKeeping?.score || 0,
                    threshold: euAIActData.criteria.recordKeeping?.threshold || 70,
                    passed: euAIActData.criteria.recordKeeping?.passed !== false,
                    weight: euAIActData.criteria.recordKeeping?.weight || 0.05
                  }
                ],
                message: `EU AI Act compliance: ${euAIActData.overallScore}% overall score`
              }
              
              genMetadata.quality_gate_results = [euAIActGate]
              genMetadata.quality_gates = [euAIActGate]
              
              logger.info('[QUALITY-AUDIT] Created EU AI Act quality gate in generation_metadata', {
                documentId: auditData.documentId,
                overallScore: euAIActData.overallScore,
                passed: euAIActData.passed
              })
            }
          }
          
          // Update document with compliance metrics and quality gates
          await pool.query(
            'UPDATE documents SET generation_metadata = $1 WHERE id = $2',
            [JSON.stringify(genMetadata), auditData.documentId]
          )
          
          logger.info('[QUALITY-AUDIT] Updated document generation_metadata with compliance metrics and quality gates', {
            documentId: auditData.documentId,
            auditId,
            overallComplianceRating: auditData.complianceMetrics.overallComplianceRating,
            pmbokGuide: auditData.complianceMetrics.pmbokGuide,
            gdpr: auditData.complianceMetrics.gdpr,
            hipaa: auditData.complianceMetrics.hipaa,
            soc2: auditData.complianceMetrics.soc2,
            hasQualityGates: !!(genMetadata.quality_gate_results || genMetadata.quality_gates)
          })
        }
      } catch (error) {
        logger.warn('[QUALITY-AUDIT] Failed to update document with compliance metrics', {
          documentId: auditData.documentId,
          error: error instanceof Error ? error.message : String(error)
        })
        // Non-blocking - continue even if update fails
      }
    }

    // Trigger low-quality notification if score below 70%
    if (auditData.overallScore < 70) {
      this.triggerLowQualityNotification(auditData.documentId, auditData.overallScore, auditData.issues).catch(err => {
        logger.error('[QUALITY-AUDIT] Failed to trigger low-quality notification', {
          documentId: auditData.documentId,
          error: err instanceof Error ? err.message : String(err)
        })
        // Don't fail the audit if notification fails
      })
    }

    return auditId
  }

  /**
   * Trigger low-quality notification
   */
  private async triggerLowQualityNotification(documentId: string, qualityScore: number, issues: QualityIssue[]) {
    try {
      // Get document details
      const docResult = await pool.query(`
        SELECT 
          d.id,
          d.title,
          p.name as project_name,
          t.name as template_name
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        LEFT JOIN templates t ON d.template_id = t.id
        WHERE d.id = $1
      `, [documentId])

      if (docResult.rows.length === 0) {
        logger.warn('[QUALITY-AUDIT] Document not found for notification', { documentId })
        return
      }

      const doc = docResult.rows[0]

      // Get project members to notify
      const membersResult = await pool.query(`
        SELECT DISTINCT u.email, u.name
        FROM users u
        WHERE u.id IN (
          SELECT created_by FROM projects WHERE id = (SELECT project_id FROM documents WHERE id = $1)
          UNION
          SELECT owner_id FROM projects WHERE id = (SELECT project_id FROM documents WHERE id = $1)
        )
        AND u.email IS NOT NULL
      `, [documentId])

      if (membersResult.rows.length === 0) {
        logger.info('[QUALITY-AUDIT] No users to notify for document', { documentId })
        return
      }

      const recipients = membersResult.rows.map(row => ({
        email: row.email,
        name: row.name || row.email
      }))

      // Import and use notification service
      const { notificationService } = await import('./notificationService')
      
      await notificationService.sendLowQualityAlert({
        documentId: doc.id,
        documentTitle: doc.title,
        projectName: doc.project_name,
        qualityScore,
        templateName: doc.template_name || 'Unknown',
        auditedAt: new Date(),
        issues
      }, recipients)

      logger.info('[QUALITY-AUDIT] Low-quality notification sent', {
        documentId,
        qualityScore,
        recipientCount: recipients.length
      })

    } catch (error) {
      logger.error('[QUALITY-AUDIT] Failed to send low-quality notification', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
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
   * Also includes compliance metrics from generation_metadata if available
   * Optionally includes document content and framework for detailed breakdown analysis
   */
  async getDocumentAudit(documentId: string, includeContent: boolean = false): Promise<any> {
    const result = await pool.query(
      `SELECT qa.*, 
              COALESCE(d.title, d.name) as document_title,
              t.name as document_type,
              d.framework as framework_used,
              d.generation_metadata${includeContent ? ', d.content as document_content' : ''}
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

    const audit = result.rows[0]
    
    // Extract compliance metrics and EU AI Act compliance from generation_metadata if available
    if (audit.generation_metadata) {
      try {
        const metadata = typeof audit.generation_metadata === 'string' 
          ? JSON.parse(audit.generation_metadata) 
          : audit.generation_metadata
        
        if (metadata.complianceMetrics) {
          audit.compliance_metrics = metadata.complianceMetrics
          logger.info('[QUALITY-AUDIT] Extracted compliance metrics from generation_metadata', {
            documentId,
            hasComplianceMetrics: true,
            overallComplianceRating: metadata.complianceMetrics.overallComplianceRating
          })
        } else {
          logger.warn('[QUALITY-AUDIT] No compliance metrics found in generation_metadata', {
            documentId,
            metadataKeys: Object.keys(metadata || {})
          })
        }

        // Extract EU AI Act compliance from quality gate results
        const qualityGateResults = metadata.quality_gate_results || metadata.quality_gates || []
        const euAIActGate = qualityGateResults.find((gate: any) => 
          gate.gate_id === 'EU_AI_ACT_COMPLIANCE_GATE' || 
          gate.gate_name?.includes('EU AI Act')
        )

        if (euAIActGate && euAIActGate.criteria_results) {
          // Extract individual criterion scores
          const criteria = euAIActGate.criteria_results.reduce((acc: any, criterion: any) => {
            const criterionId = criterion.criterion_id || ''
            if (criterionId.includes('TRANSPARENCY')) {
              acc.transparency = {
                score: criterion.score || 0,
                threshold: criterion.threshold || 80,
                passed: criterion.passed !== false,
                weight: criterion.weight || 0.30
              }
            } else if (criterionId.includes('HUMAN_OVERSIGHT')) {
              acc.humanOversight = {
                score: criterion.score || 0,
                threshold: criterion.threshold || 80,
                passed: criterion.passed !== false,
                weight: criterion.weight || 0.30
              }
            } else if (criterionId.includes('ACCURACY')) {
              acc.accuracy = {
                score: criterion.score || 0,
                threshold: criterion.threshold || 70,
                passed: criterion.passed !== false,
                weight: criterion.weight || 0.25
              }
            } else if (criterionId.includes('DATA_GOVERNANCE')) {
              acc.dataGovernance = {
                score: criterion.score || 0,
                threshold: criterion.threshold || 60,
                passed: criterion.passed !== false,
                weight: criterion.weight || 0.10
              }
            } else if (criterionId.includes('RECORD_KEEPING')) {
              acc.recordKeeping = {
                score: criterion.score || 0,
                threshold: criterion.threshold || 70,
                passed: criterion.passed !== false,
                weight: criterion.weight || 0.05
              }
            }
            return acc
          }, {})

          // Only add EU AI Act data if we found at least one criterion
          if (Object.keys(criteria).length > 0) {
            if (!audit.compliance_metrics) {
              audit.compliance_metrics = {}
            }
            audit.compliance_metrics.euAIAct = {
              overallScore: euAIActGate.score || 0,
              passed: euAIActGate.passed !== false,
              criteria: {
                transparency: criteria.transparency || { score: 0, threshold: 80, passed: false, weight: 0.30 },
                humanOversight: criteria.humanOversight || { score: 0, threshold: 80, passed: false, weight: 0.30 },
                accuracy: criteria.accuracy || { score: 0, threshold: 70, passed: false, weight: 0.25 },
                dataGovernance: criteria.dataGovernance || { score: 0, threshold: 60, passed: false, weight: 0.10 },
                recordKeeping: criteria.recordKeeping || { score: 0, threshold: 70, passed: false, weight: 0.05 }
              }
            }
          }
        }
      } catch (error) {
        logger.warn('[QUALITY-AUDIT] Failed to parse compliance metrics from generation_metadata', {
          documentId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return audit
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

