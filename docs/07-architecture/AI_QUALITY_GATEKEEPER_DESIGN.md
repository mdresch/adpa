# AI Quality Gatekeeper System - Design Document

**Date**: November 2, 2025  
**Purpose**: Automated Quality Control & Compliance Validation  
**Impact**: Unlock safe batch mode with 70 parallel agents  
**Status**: Design Complete, Ready for Implementation

---

## 🎯 The Vision

**Create an "AI Quality Auditor"** that:
1. **Automatically reads** each generated document
2. **Determines** which compliance standards apply (PMBOK, BABOK, DMBOK, ISO, etc.)
3. **Executes** comprehensive quality & compliance audits
4. **Reports** results as structured metadata
5. **Attaches** audit results to document record
6. **Gates** batch processing based on quality thresholds

**Result**: Safe, automated quality control that enables 70-agent orchestration! 🚀

---

## ✅ Existing Infrastructure (Already Built!)

### 1. Baseline Quality Audit System
**File**: `server/src/services/baselineQualityAudit.ts`

**Features**:
- ✅ 6 automated quality checks
- ✅ Red flag detection (critical/high severity)
- ✅ Warning system
- ✅ Recommendation engine
- ✅ PMBOK compliance validation
- ✅ Feasibility scoring
- ✅ Overall quality scoring

**Example Checks**:
```typescript
- Consistency Score Threshold
- Scope/Value Alignment
- Success Criteria Feasibility
- Cost/Schedule Integration
- Document Type Appropriateness
- PMBOK 7 Compliance
```

**Output**:
```typescript
interface QualityAuditResult {
  overall_quality_score: number  // 0-100
  compliance_level: 'excellent' | 'good' | 'adequate' | 'poor' | 'critical'
  red_flags: RedFlag[]  // Blocking issues
  warnings: Warning[]  // Non-blocking concerns
  recommendations: Recommendation[]
  feasibility_score: number
  pmbok_compliance_score: number
  automated_checks: AutomatedCheck[]
}
```

### 2. Quality Assessment Engine
**File**: `server/src/services/qualityAssessmentEngine.ts`

**Features**:
- ✅ 8 quality dimensions assessed
- ✅ AI-powered quality assessment
- ✅ Methodology compliance checking
- ✅ Stakeholder validation
- ✅ Technical accuracy validation
- ✅ Readability assessment
- ✅ Improvement recommendations
- ✅ Compliance framework support

**Quality Dimensions**:
```typescript
- Content Quality (clarity, relevance)
- Methodology Compliance (PMBOK, BABOK)
- Stakeholder Satisfaction
- Technical Accuracy
- Readability
- Completeness
- Consistency  
- Engagement
```

### 3. Automatic Validation (Already Enabled!)
**File**: `server/src/services/queueService.ts:405-443`

**Already Running**:
```typescript
// After each document generation, automatically validate against baseline
if (createdDocumentId && projectId) {
  const drifts = await baselineService.validateDocumentAgainstBaseline(
    projectId,
    createdDocumentId,
    documentContent,
    docName
  )
  
  if (drifts.length > 0) {
    // Emit drift alert!
    io.emit("baseline:drift", { documentId, driftCount, drifts })
  }
}
```

**This is ALREADY working!** ✅

---

## 🚀 Proposed Enhancement: "AI Quality Gatekeeper"

### New Service: `aiQualityGatekeeperService.ts`

```typescript
/**
 * AI Quality Gatekeeper Service
 * Automated quality control and compliance validation for AI-generated documents
 * Determines applicable standards, executes audits, gates batch processing
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { QualityAssessmentEngine } from './qualityAssessmentEngine'
import { performBaselineQualityAudit } from './baselineQualityAudit'

export interface QualityGatekeeperConfig {
  enable_auto_audit: boolean                    // Run audit after each generation
  enable_compliance_detection: boolean          // Auto-detect applicable standards
  enable_multi_framework_validation: boolean    // Validate against multiple standards
  enable_quality_gating: boolean               // Block low-quality docs from batch
  minimum_quality_score: number                // Threshold for approval (0-100)
  minimum_compliance_score: number             // Threshold for compliance (0-100)
  block_on_red_flags: boolean                  // Block if critical issues found
  require_manual_review_below: number          // Score requiring human review
  auto_remediation_enabled: boolean            // Auto-fix minor issues
}

export interface DocumentAuditRequest {
  document_id: string
  document_content: string
  document_type: string
  template_id?: string
  project_id?: string
  framework?: 'pmbok' | 'babok' | 'dmbok' | 'iso' | 'auto-detect'
  user_id: string
}

export interface DocumentAuditResult {
  audit_id: string
  document_id: string
  timestamp: Date
  
  // Compliance Results
  applicable_frameworks: ApplicableFramework[]
  compliance_results: ComplianceValidationResult[]
  overall_compliance_score: number
  compliance_status: 'compliant' | 'partially_compliant' | 'non_compliant'
  
  // Quality Results
  quality_score: number
  quality_dimensions: QualityDimensionScore[]
  quality_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  
  // Issues & Recommendations
  critical_issues: QualityIssue[]
  warnings: QualityWarning[]
  recommendations: QualityRecommendation[]
  
  // Gate Decision
  passes_quality_gate: boolean
  approved_for_batch: boolean
  requires_manual_review: boolean
  blocking_issues: string[]
  
  // Audit Metadata
  audit_metadata: AuditMetadata
}

export interface ApplicableFramework {
  framework_id: string
  framework_name: string
  framework_version: string
  confidence: number                // How confident we are it applies (0-1)
  detection_reason: string          // Why we think it applies
  mandatory: boolean                // Is validation required?
  validation_priority: number       // Order of validation
}

export interface ComplianceValidationResult {
  framework_id: string
  framework_name: string
  requirements_checked: number
  requirements_met: number
  compliance_percentage: number
  critical_gaps: ComplianceGap[]
  minor_gaps: ComplianceGap[]
  passed: boolean
  details: ValidationDetail[]
}

export interface QualityDimensionScore {
  dimension: string
  score: number                     // 0-100
  weight: number                    // 0-1
  weighted_score: number
  passed_threshold: boolean
  issues: string[]
  strengths: string[]
}

export interface AuditMetadata {
  ai_provider_used: string
  ai_model_used: string
  audit_duration_ms: number
  frameworks_validated: number
  checks_executed: number
  ai_tokens_used: number
  ai_cost: number
  cache_hit: boolean                // Was audit cached?
}

export class AIQualityGatekeeperService {
  private qualityEngine: QualityAssessmentEngine
  private config: QualityGatekeeperConfig
  private auditCache: Map<string, DocumentAuditResult> = new Map()
  
  constructor(config?: Partial<QualityGatekeeperConfig>) {
    this.qualityEngine = new QualityAssessmentEngine()
    
    // Default configuration
    this.config = {
      enable_auto_audit: true,
      enable_compliance_detection: true,
      enable_multi_framework_validation: true,
      enable_quality_gating: true,
      minimum_quality_score: 85,              // 85/100 minimum
      minimum_compliance_score: 90,            // 90% compliance required
      block_on_red_flags: true,               // Block if critical issues
      require_manual_review_below: 70,        // Human review if < 70
      auto_remediation_enabled: false,        // Not yet implemented
      ...config
    }
  }
  
  /**
   * Main Entry Point: Audit a generated document
   */
  async auditDocument(request: DocumentAuditRequest): Promise<DocumentAuditResult> {
    const startTime = Date.now()
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    logger.info(`🔍 [QUALITY-GATE] Starting automated audit: ${auditId}`, {
      document_id: request.document_id,
      document_type: request.document_type,
      framework: request.framework
    })
    
    try {
      // Step 1: Detect applicable compliance frameworks
      const applicableFrameworks = await this.detectApplicableFrameworks(
        request.document_content,
        request.document_type,
        request.template_id,
        request.framework
      )
      
      logger.info(`📋 [QUALITY-GATE] Detected ${applicableFrameworks.length} applicable frameworks`, {
        frameworks: applicableFrameworks.map(f => f.framework_name)
      })
      
      // Step 2: Execute compliance validations
      const complianceResults = await this.validateCompliance(
        request.document_content,
        applicableFrameworks,
        request.project_id
      )
      
      // Step 3: Execute quality assessments
      const qualityResults = await this.assessQuality(
        request.document_content,
        request.document_type,
        request.project_id
      )
      
      // Step 4: Identify issues and recommendations
      const issues = await this.identifyIssues(complianceResults, qualityResults)
      const recommendations = await this.generateRecommendations(issues, qualityResults)
      
      // Step 5: Make gate decision
      const gateDecision = this.makeGateDecision(
        qualityResults.overall_score,
        complianceResults,
        issues.critical_issues
      )
      
      const processingTime = Date.now() - startTime
      
      // Step 6: Build and store audit result
      const auditResult: DocumentAuditResult = {
        audit_id: auditId,
        document_id: request.document_id,
        timestamp: new Date(),
        
        applicable_frameworks: applicableFrameworks,
        compliance_results: complianceResults,
        overall_compliance_score: this.calculateOverallCompliance(complianceResults),
        compliance_status: this.determineComplianceStatus(complianceResults),
        
        quality_score: qualityResults.overall_score,
        quality_dimensions: qualityResults.dimensions,
        quality_grade: this.scoreToGrade(qualityResults.overall_score),
        
        critical_issues: issues.critical_issues,
        warnings: issues.warnings,
        recommendations: recommendations,
        
        passes_quality_gate: gateDecision.passes,
        approved_for_batch: gateDecision.approved_for_batch,
        requires_manual_review: gateDecision.requires_manual_review,
        blocking_issues: gateDecision.blocking_issues,
        
        audit_metadata: {
          ai_provider_used: 'openai',  // or auto-select
          ai_model_used: 'gpt-4o',
          audit_duration_ms: processingTime,
          frameworks_validated: applicableFrameworks.length,
          checks_executed: qualityResults.checks_executed,
          ai_tokens_used: qualityResults.tokens_used,
          ai_cost: qualityResults.estimated_cost,
          cache_hit: false
        }
      }
      
      // Step 7: Store audit result in database
      await this.storeAuditResult(auditResult)
      
      // Step 8: Update document metadata
      await this.attachAuditToDocument(request.document_id, auditResult)
      
      // Step 9: Emit real-time notification
      if (!gateDecision.passes) {
        io.emit("quality:gate-failed", {
          documentId: request.document_id,
          score: qualityResults.overall_score,
          issues: issues.critical_issues.length
        })
      }
      
      logger.info(`✅ [QUALITY-GATE] Audit complete: ${auditId}`, {
        quality_score: qualityResults.overall_score,
        compliance_score: this.calculateOverallCompliance(complianceResults),
        passes_gate: gateDecision.passes,
        frameworks_validated: applicableFrameworks.length,
        processing_time_ms: processingTime
      })
      
      return auditResult
      
    } catch (error) {
      logger.error(`❌ [QUALITY-GATE] Audit failed: ${auditId}`, error)
      throw error
    }
  }
  
  /**
   * Step 1: Detect Applicable Compliance Frameworks
   * Uses AI to read document and determine which standards apply
   */
  private async detectApplicableFrameworks(
    documentContent: string,
    documentType: string,
    templateId?: string,
    explicitFramework?: string
  ): Promise<ApplicableFramework[]> {
    
    // If framework explicitly specified, use it
    if (explicitFramework && explicitFramework !== 'auto-detect') {
      return [{
        framework_id: explicitFramework,
        framework_name: this.getFrameworkName(explicitFramework),
        framework_version: this.getFrameworkVersion(explicitFramework),
        confidence: 1.0,
        detection_reason: 'Explicitly specified by user',
        mandatory: true,
        validation_priority: 1
      }]
    }
    
    // Auto-detect applicable frameworks using AI
    const detectionPrompt = `
You are a **Compliance Standards Expert** analyzing a project management document.

**Document Type**: ${documentType}
**Document Content** (first 2000 chars):
${documentContent.substring(0, 2000)}

**Your Task**: Determine which compliance frameworks and quality standards apply to this document.

**Available Frameworks**:
1. **PMBOK (Project Management Body of Knowledge)** - PMI standard for project management
2. **BABOK (Business Analysis Body of Knowledge)** - IIBA standard for business analysis
3. **DMBOK (Data Management Body of Knowledge)** - DAMA standard for data management
4. **ISO 9001** - Quality management systems
5. **ISO 27001** - Information security management
6. **ISO 21500** - Project management guidance
7. **PRINCE2** - Structured project management method
8. **Agile/Scrum** - Agile methodology standards
9. **ITIL** - IT service management
10. **TOGAF** - Enterprise architecture framework

**Analysis Instructions**:
- Identify ALL applicable frameworks based on document content and type
- For each framework, assess confidence level (0.0-1.0)
- Explain WHY you think each framework applies
- Mark as mandatory if explicitly referenced in document
- Prioritize frameworks by relevance

**Output Format** (JSON only):
{
  "frameworks": [
    {
      "framework_id": "pmbok",
      "framework_name": "PMBOK 7",
      "framework_version": "7th Edition",
      "confidence": 0.95,
      "detection_reason": "Document is a Project Charter with PMBOK structure",
      "mandatory": true,
      "validation_priority": 1
    }
  ]
}

Return ONLY valid JSON, no markdown, no explanation.
`

    const response = await aiService.generateWithFallback({
      prompt: detectionPrompt,
      provider: 'openai',  // Use GPT-4 for accurate framework detection
      model: 'gpt-4o',
      temperature: 0.2,     // Low temperature for consistency
      max_tokens: 1500
    })
    
    try {
      const parsed = JSON.parse(response.content.replace(/```json|```/g, '').trim())
      const frameworks = parsed.frameworks || []
      
      logger.info(`🎯 [FRAMEWORK-DETECTION] Detected ${frameworks.length} frameworks`, {
        frameworks: frameworks.map((f: ApplicableFramework) => f.framework_name),
        confidences: frameworks.map((f: ApplicableFramework) => f.confidence)
      })
      
      return frameworks
    } catch (error) {
      logger.error('Failed to parse framework detection response', error)
      // Fallback: Use template-based detection
      return this.detectFrameworksFromTemplate(documentType, templateId)
    }
  }
  
  /**
   * Step 2: Validate Compliance Against Frameworks
   */
  private async validateCompliance(
    documentContent: string,
    frameworks: ApplicableFramework[],
    projectId?: string
  ): Promise<ComplianceValidationResult[]> {
    
    const results: ComplianceValidationResult[] = []
    
    // Validate against each applicable framework
    for (const framework of frameworks) {
      logger.info(`📋 [COMPLIANCE] Validating against ${framework.framework_name}`)
      
      const validationResult = await this.validateAgainstFramework(
        documentContent,
        framework,
        projectId
      )
      
      results.push(validationResult)
    }
    
    return results
  }
  
  /**
   * Validate document against specific framework (PMBOK, BABOK, etc.)
   */
  private async validateAgainstFramework(
    documentContent: string,
    framework: ApplicableFramework,
    projectId?: string
  ): Promise<ComplianceValidationResult> {
    
    const frameworkPrompts = {
      pmbok: this.buildPMBOKValidationPrompt(documentContent),
      babok: this.buildBABOKValidationPrompt(documentContent),
      dmbok: this.buildDMBOKValidationPrompt(documentContent),
      'iso-9001': this.buildISO9001ValidationPrompt(documentContent),
      'iso-27001': this.buildISO27001ValidationPrompt(documentContent)
    }
    
    const prompt = frameworkPrompts[framework.framework_id] || 
                   this.buildGenericCompliancePrompt(documentContent, framework)
    
    const response = await aiService.generateWithFallback({
      prompt,
      provider: 'openai',  // Use GPT-4 for compliance checking
      model: 'gpt-4o',
      temperature: 0.1,    // Very low temp for strict compliance
      max_tokens: 2000
    })
    
    // Parse AI response
    const parsed = this.parseComplianceResponse(response.content)
    
    return {
      framework_id: framework.framework_id,
      framework_name: framework.framework_name,
      requirements_checked: parsed.requirements_checked,
      requirements_met: parsed.requirements_met,
      compliance_percentage: (parsed.requirements_met / parsed.requirements_checked) * 100,
      critical_gaps: parsed.critical_gaps || [],
      minor_gaps: parsed.minor_gaps || [],
      passed: parsed.requirements_met / parsed.requirements_checked >= 0.9,  // 90% threshold
      details: parsed.details || []
    }
  }
  
  /**
   * Build PMBOK-specific validation prompt
   */
  private buildPMBOKValidationPrompt(documentContent: string): string {
    return `
You are a **PMI-certified Project Management Professional (PMP)** auditing a project document for PMBOK 7 compliance.

**Document to Audit**:
${documentContent.substring(0, 3000)}

**PMBOK 7 Requirements**:

**12 Project Management Principles**:
1. Stewardship (responsible, respectful, trustworthy)
2. Team (collaborative team environment)
3. Stakeholders (effective stakeholder engagement)
4. Value (focus on delivering value)
5. Systems Thinking (holistic approach)
6. Leadership (demonstrate leadership behaviors)
7. Tailoring (tailor based on context)
8. Quality (build quality into processes and deliverables)
9. Complexity (navigate complexity)
10. Risk (optimize risk responses)
11. Adaptability (adaptive and resilient)
12. Change (enable change to achieve future state)

**8 Performance Domains**:
1. Stakeholders - Engage effectively
2. Team - Build collaborative environment
3. Development Approach - Determine approach and life cycle
4. Planning - Organize and coordinate
5. Project Work - Execute work
6. Delivery - Meet requirements and satisfy stakeholders
7. Measurement - Assess performance and progress
8. Uncertainty - Manage risk and uncertainty

**Your Audit Task**:
1. Check if document addresses relevant PMBOK principles
2. Check if document covers applicable performance domains
3. Identify which principles/domains are MISSING
4. Flag any contradictions to PMBOK best practices
5. Rate overall PMBOK compliance (0-100%)

**Output Format** (JSON only):
{
  "requirements_checked": 20,
  "requirements_met": 18,
  "compliance_percentage": 90,
  "principles_addressed": ["Stewardship", "Team", "Stakeholders", ...],
  "principles_missing": ["Adaptability"],
  "domains_addressed": ["Stakeholders", "Planning", "Delivery"],
  "domains_missing": ["Measurement", "Uncertainty"],
  "critical_gaps": [
    {
      "gap_type": "missing_domain",
      "description": "No risk/uncertainty management section",
      "severity": "high",
      "recommendation": "Add Risk Register section with identified risks"
    }
  ],
  "minor_gaps": [...],
  "overall_assessment": "Document demonstrates strong PMBOK alignment with 90% compliance. Missing formal uncertainty/risk management section.",
  "passed": true
}

Return ONLY valid JSON.
`
  }
  
  /**
   * Build BABOK-specific validation prompt
   */
  private buildBABOKValidationPrompt(documentContent: string): string {
    return `
You are a **CBAP-certified Business Analysis Professional** auditing a document for BABOK compliance.

**Document to Audit**:
${documentContent.substring(0, 3000)}

**BABOK Knowledge Areas**:
1. Business Analysis Planning & Monitoring
2. Elicitation & Collaboration
3. Requirements Life Cycle Management
4. Strategy Analysis
5. Requirements Analysis & Design Definition
6. Solution Evaluation

**BABOK Core Concepts**:
- Change (the act of transformation)
- Need (a problem or opportunity)
- Solution (a means of satisfying needs)
- Stakeholder (a person or group affected by change)
- Value (the worth or importance)
- Context (the circumstances influencing/influenced by change)

**Your Audit Task**:
1. Check if document covers relevant BABOK knowledge areas
2. Verify core concepts are properly addressed
3. Identify gaps in business analysis coverage
4. Rate BABOK compliance (0-100%)

**Output Format** (JSON only):
{
  "requirements_checked": 15,
  "requirements_met": 13,
  "compliance_percentage": 87,
  "knowledge_areas_addressed": ["Requirements Analysis", "Solution Evaluation"],
  "knowledge_areas_missing": ["Strategy Analysis"],
  "core_concepts_present": ["Need", "Solution", "Stakeholder", "Value"],
  "core_concepts_missing": ["Context"],
  "critical_gaps": [...],
  "minor_gaps": [...],
  "overall_assessment": "Good BABOK alignment, missing strategic context",
  "passed": true
}

Return ONLY valid JSON.
`
  }
  
  /**
   * Step 3: Assess Overall Quality
   */
  private async assessQuality(
    documentContent: string,
    documentType: string,
    projectId?: string
  ): Promise<{
    overall_score: number
    dimensions: QualityDimensionScore[]
    checks_executed: number
    tokens_used: number
    estimated_cost: number
  }> {
    
    const qualityPrompt = `
You are a **Senior Document Quality Analyst** performing a comprehensive quality audit.

**Document to Assess**:
${documentContent.substring(0, 3000)}

**Quality Dimensions to Assess**:

1. **Completeness** (0-100): Are all required sections present?
2. **Clarity** (0-100): Is the content clear and easy to understand?
3. **Consistency** (0-100): Is terminology and style consistent throughout?
4. **Accuracy** (0-100): Is information factually correct and precise?
5. **Professionalism** (0-100): Does it meet professional standards?
6. **Structure** (0-100): Is it well-organized with logical flow?
7. **Actionability** (0-100): Can readers take action based on content?
8. **Compliance** (0-100): Does it follow document type conventions?

**Critical Quality Checks**:
- No hallucinations (made-up facts, fake data)
- No contradictions (conflicting statements)
- No vague language (specific and precise)
- No grammatical errors
- No missing critical sections

**Output Format** (JSON only):
{
  "overall_score": 88,
  "dimensions": [
    {
      "dimension": "Completeness",
      "score": 90,
      "weight": 0.15,
      "weighted_score": 13.5,
      "passed_threshold": true,
      "issues": [],
      "strengths": ["All sections present", "Comprehensive coverage"]
    }
  ],
  "critical_issues": [
    {
      "issue_type": "hallucination",
      "severity": "critical",
      "description": "Contains unverifiable data point: '95% adoption rate'",
      "location": "Section 3, paragraph 2",
      "remediation": "Remove or cite source for adoption rate claim"
    }
  ],
  "warnings": [...],
  "checks_executed": 15,
  "overall_assessment": "High-quality document with minor issues"
}

Return ONLY valid JSON.
`

    const response = await aiService.generateWithFallback({
      prompt: qualityPrompt,
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 2500
    })
    
    const parsed = JSON.parse(response.content.replace(/```json|```/g, '').trim())
    
    return {
      overall_score: parsed.overall_score,
      dimensions: parsed.dimensions || [],
      checks_executed: parsed.checks_executed || 8,
      tokens_used: response.usage?.total_tokens || 0,
      estimated_cost: (response.usage?.total_tokens || 0) / 1000000 * 30  // GPT-4 pricing
    }
  }
  
  /**
   * Step 4: Make Gate Decision
   */
  private makeGateDecision(
    qualityScore: number,
    complianceResults: ComplianceValidationResult[],
    criticalIssues: QualityIssue[]
  ): {
    passes: boolean
    approved_for_batch: boolean
    requires_manual_review: boolean
    blocking_issues: string[]
  } {
    
    const blockingIssues: string[] = []
    
    // Check 1: Quality score threshold
    if (qualityScore < this.config.minimum_quality_score) {
      blockingIssues.push(`Quality score ${qualityScore} below threshold ${this.config.minimum_quality_score}`)
    }
    
    // Check 2: Critical issues present
    if (this.config.block_on_red_flags && criticalIssues.length > 0) {
      blockingIssues.push(`${criticalIssues.length} critical issue(s) detected`)
    }
    
    // Check 3: Compliance failures
    const failedCompliance = complianceResults.filter(r => !r.passed)
    if (failedCompliance.length > 0) {
      blockingIssues.push(`${failedCompliance.length} compliance validation(s) failed`)
    }
    
    // Check 4: Average compliance score
    const avgCompliance = complianceResults.reduce((sum, r) => sum + r.compliance_percentage, 0) / 
                          complianceResults.length
    if (avgCompliance < this.config.minimum_compliance_score) {
      blockingIssues.push(`Average compliance ${avgCompliance.toFixed(1)}% below threshold ${this.config.minimum_compliance_score}%`)
    }
    
    const passes = blockingIssues.length === 0
    const requiresManualReview = qualityScore < this.config.require_manual_review_below
    const approvedForBatch = passes && !requiresManualReview
    
    return {
      passes,
      approved_for_batch: approvedForBatch,
      requires_manual_review: requiresManualReview,
      blocking_issues: blockingIssues
    }
  }
  
  /**
   * Store audit result in database
   */
  private async storeAuditResult(audit: DocumentAuditResult): Promise<void> {
    await pool.query(`
      INSERT INTO document_quality_audits (
        id, document_id, audit_timestamp,
        applicable_frameworks, compliance_results, overall_compliance_score, compliance_status,
        quality_score, quality_dimensions, quality_grade,
        critical_issues, warnings, recommendations,
        passes_quality_gate, approved_for_batch, requires_manual_review, blocking_issues,
        audit_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      audit.audit_id,
      audit.document_id,
      audit.timestamp,
      JSON.stringify(audit.applicable_frameworks),
      JSON.stringify(audit.compliance_results),
      audit.overall_compliance_score,
      audit.compliance_status,
      audit.quality_score,
      JSON.stringify(audit.quality_dimensions),
      audit.quality_grade,
      JSON.stringify(audit.critical_issues),
      JSON.stringify(audit.warnings),
      JSON.stringify(audit.recommendations),
      audit.passes_quality_gate,
      audit.approved_for_batch,
      audit.requires_manual_review,
      JSON.stringify(audit.blocking_issues),
      JSON.stringify(audit.audit_metadata)
    ])
    
    logger.info(`💾 [QUALITY-GATE] Audit stored: ${audit.audit_id}`)
  }
  
  /**
   * Attach audit metadata to document
   */
  private async attachAuditToDocument(documentId: string, audit: DocumentAuditResult): Promise<void> {
    // Update document with quality metadata
    await pool.query(`
      UPDATE documents
      SET quality_metadata = $1,
          quality_score = $2,
          compliance_status = $3,
          approved_for_batch = $4,
          last_audit_id = $5,
          last_audit_timestamp = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      JSON.stringify({
        latest_audit_id: audit.audit_id,
        quality_score: audit.quality_score,
        quality_grade: audit.quality_grade,
        compliance_score: audit.overall_compliance_score,
        compliance_status: audit.compliance_status,
        passes_gate: audit.passes_quality_gate,
        critical_issues: audit.critical_issues.length,
        warnings: audit.warnings.length,
        frameworks_validated: audit.applicable_frameworks.map(f => f.framework_name),
        last_audited: audit.timestamp
      }),
      audit.quality_score,
      audit.compliance_status,
      audit.approved_for_batch,
      audit.audit_id,
      audit.timestamp,
      documentId
    ])
    
    logger.info(`📎 [QUALITY-GATE] Audit attached to document: ${documentId}`)
  }
  
  // Helper methods
  private getFrameworkName(frameworkId: string): string {
    const names: Record<string, string> = {
      'pmbok': 'PMBOK 7',
      'babok': 'BABOK v3',
      'dmbok': 'DMBOK 2',
      'iso-9001': 'ISO 9001:2015',
      'iso-27001': 'ISO 27001:2022',
      'iso-21500': 'ISO 21500:2021',
      'prince2': 'PRINCE2 7th Edition',
      'agile': 'Agile/Scrum Guide',
      'itil': 'ITIL 4',
      'togaf': 'TOGAF 10'
    }
    return names[frameworkId] || frameworkId.toUpperCase()
  }
  
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }
}

export const qualityGatekeeperService = new AIQualityGatekeeperService()
```

---

## 🗄️ Database Schema Enhancement

### New Table: `document_quality_audits`

```sql
CREATE TABLE document_quality_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  audit_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Compliance Results
  applicable_frameworks JSONB NOT NULL,
  compliance_results JSONB NOT NULL,
  overall_compliance_score DECIMAL(5,2) NOT NULL,
  compliance_status VARCHAR(50) NOT NULL,
  
  -- Quality Results
  quality_score DECIMAL(5,2) NOT NULL,
  quality_dimensions JSONB NOT NULL,
  quality_grade VARCHAR(1) NOT NULL,
  
  -- Issues & Recommendations
  critical_issues JSONB NOT NULL DEFAULT '[]',
  warnings JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  
  -- Gate Decisions
  passes_quality_gate BOOLEAN NOT NULL,
  approved_for_batch BOOLEAN NOT NULL,
  requires_manual_review BOOLEAN NOT NULL,
  blocking_issues JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata
  audit_metadata JSONB NOT NULL,
  
  -- Indexes
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_audits_document ON document_quality_audits(document_id);
CREATE INDEX idx_quality_audits_timestamp ON document_quality_audits(audit_timestamp DESC);
CREATE INDEX idx_quality_audits_score ON document_quality_audits(quality_score DESC);
CREATE INDEX idx_quality_audits_gate ON document_quality_audits(passes_quality_gate);
CREATE INDEX idx_quality_audits_batch_approved ON document_quality_audits(approved_for_batch);
```

### Update `documents` Table

```sql
ALTER TABLE documents
ADD COLUMN quality_metadata JSONB,
ADD COLUMN quality_score DECIMAL(5,2),
ADD COLUMN compliance_status VARCHAR(50),
ADD COLUMN approved_for_batch BOOLEAN DEFAULT false,
ADD COLUMN last_audit_id UUID REFERENCES document_quality_audits(id),
ADD COLUMN last_audit_timestamp TIMESTAMP;

CREATE INDEX idx_documents_quality_score ON documents(quality_score DESC);
CREATE INDEX idx_documents_approved_batch ON documents(approved_for_batch);
```

---

## 🔗 Integration Points

### 1. Automatic Audit After Generation

**Modify**: `server/src/services/queueService.ts:405-443`

```typescript
// After document creation
if (createdDocumentId && projectId) {
  try {
    // EXISTING: Baseline drift detection
    const drifts = await baselineService.validateDocumentAgainstBaseline(...)
    
    // NEW: Comprehensive quality audit
    const auditResult = await qualityGatekeeperService.auditDocument({
      document_id: createdDocumentId,
      document_content: documentContent,
      document_type: documentType,
      template_id: template_id,
      project_id: projectId,
      framework: 'auto-detect',  // AI detects applicable frameworks
      user_id: userId
    })
    
    // Log audit results
    logger.info(`🎯 [QUALITY-AUDIT] Score: ${auditResult.quality_score}/100, Compliance: ${auditResult.overall_compliance_score}%, Gate: ${auditResult.passes_quality_gate ? 'PASS' : 'FAIL'}`)
    
    // Emit quality audit results
    io.emit("quality:audit-complete", {
      documentId: createdDocumentId,
      qualityScore: auditResult.quality_score,
      qualityGrade: auditResult.quality_grade,
      complianceScore: auditResult.overall_compliance_score,
      passesGate: auditResult.passes_quality_gate,
      approvedForBatch: auditResult.approved_for_batch,
      requiresReview: auditResult.requires_manual_review,
      criticalIssues: auditResult.critical_issues.length,
      frameworks: auditResult.applicable_frameworks.map(f => f.framework_name)
    })
    
  } catch (auditError) {
    logger.error(`❌ [QUALITY-AUDIT] Failed to audit document:`, auditError)
    // Don't fail job if audit fails
  }
}
```

### 2. Quality Gate for Batch Mode

**New API**: `POST /api/batch/generate-validated-library`

```typescript
router.post('/batch/generate-validated-library',
  authenticateToken,
  requirePermission('documents.create'),
  async (req, res) => {
    const { projectId, templateIds, maxConcurrency } = req.body
    
    // Step 1: Verify all templates are approved for batch
    const templates = await pool.query(`
      SELECT t.id, t.name, t.framework,
             COUNT(CASE WHEN d.approved_for_batch = true THEN 1 END) as approved_count,
             COUNT(d.id) as total_generated
      FROM templates t
      LEFT JOIN documents d ON d.template_id = t.id
      WHERE t.id = ANY($1)
      GROUP BY t.id, t.name, t.framework
    `, [templateIds])
    
    // Check if templates have enough validated instances
    const unvalidatedTemplates = templates.rows.filter(t => 
      t.approved_count < 3  // Require 3+ approved docs per template
    )
    
    if (unvalidatedTemplates.length > 0) {
      return res.status(400).json({
        error: 'Templates not validated for batch mode',
        message: `${unvalidatedTemplates.length} template(s) need more validated instances`,
        unvalidated: unvalidatedTemplates.map(t => ({
          template: t.name,
          approved: t.approved_count,
          required: 3
        }))
      })
    }
    
    // Step 2: Queue batch generation with quality gates enabled
    const batchJobId = uuidv4()
    
    await addJob('batch-generate-library', {
      jobId: batchJobId,
      projectId,
      templateIds,
      maxConcurrency,
      qualityGateEnabled: true,
      minQualityScore: 85,
      minComplianceScore: 90
    })
    
    res.json({
      success: true,
      jobId: batchJobId,
      message: 'Batch generation started with quality gates enabled',
      templates: templateIds.length,
      maxConcurrency
    })
  }
)
```

---

## 📊 Real-World Usage

### Scenario 1: Single Document Validation (Current)

```
User generates "Project Charter"
        ↓
AI generates document (DeepSeek, 3 sec, $0.02)
        ↓
AUTOMATIC QUALITY AUDIT:
  ↓
1. Framework Detection (AI detects PMBOK applies)
2. PMBOK Compliance Check (18/20 requirements met = 90%)
3. Quality Assessment (8 dimensions evaluated)
4. Overall Score: 88/100, Grade B
5. Critical Issues: 0
6. Warnings: 2 minor gaps
7. Gate Decision: ✅ PASSES (approved for batch!)
        ↓
Metadata attached to document:
{
  "quality_score": 88,
  "quality_grade": "B",
  "compliance_score": 90,
  "compliance_status": "compliant",
  "passes_gate": true,
  "approved_for_batch": true,
  "frameworks": ["PMBOK 7"],
  "critical_issues": 0,
  "warnings": 2
}
        ↓
User sees: ✅ Quality: B (88/100) | Compliance: 90% | Batch Ready!
```

### Scenario 2: Failed Quality Gate

```
User generates "Risk Register"
        ↓
AI generates document (Groq, 1 sec, FREE)
        ↓
AUTOMATIC QUALITY AUDIT:
  ↓
1. Framework Detection (PMBOK + ISO 31000)
2. PMBOK Compliance: 12/20 met = 60% ❌
3. Quality Score: 65/100 ❌
4. Critical Issues: 2 (Missing risk mitigation strategies)
5. Gate Decision: ❌ FAILS
        ↓
Metadata attached:
{
  "quality_score": 65,
  "quality_grade": "D",
  "passes_gate": false,
  "approved_for_batch": false,
  "requires_manual_review": true,
  "blocking_issues": [
    "Quality score 65 below threshold 85",
    "2 critical issues detected"
  ]
}
        ↓
User sees: ❌ Quality: D (65/100) | Not Approved | Review Required
        ↓
User refines template and regenerates
        ↓
New audit: ✅ 92/100, Grade A, Batch Approved!
```

---

## 🎯 Unlocking Batch Mode

### Validation Dashboard

```
Template Validation Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Template Name              | Validated | Avg Quality | Batch Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project Charter            | 5/5 ✅    | 92/100      | ✅ Yes
Scope Statement            | 4/5 ✅    | 88/100      | ✅ Yes
Risk Register              | 2/5 ⏳    | 72/100      | ❌ No (need 3 more)
Stakeholder Matrix         | 5/5 ✅    | 95/100      | ✅ Yes
Communication Plan         | 1/5 ⏳    | 68/100      | ❌ No (need 4 more)
...

Total Templates: 70
Batch-Ready: 42 (60%)
Need Validation: 28 (40%)

🎯 Target: 90% templates validated (63/70)
Current Progress: [████████████░░░░░░░░] 60%

Once 90% validated → UNLOCK BATCH MODE! 🚀
```

### Batch Mode Unlock Criteria

```typescript
const batchModeStatus = {
  templates_total: 70,
  templates_validated: 42,
  validation_percentage: 60,
  avg_quality_score: 87,
  avg_compliance_score: 91,
  critical_failures_last_100: 0,
  
  criteria: {
    validation_rate: 60 >= 90,      // ❌ Need 90%
    quality_avg: 87 >= 85,          // ✅ Pass
    compliance_avg: 91 >= 90,       // ✅ Pass
    zero_criticals: 0 === 0,        // ✅ Pass
  },
  
  unlocked: false,  // 1/4 criteria not met
  remaining: "Validate 28 more templates to reach 90% threshold"
}
```

---

## 🚀 Implementation Plan

### Phase 1: Core Quality Gatekeeper (Week 1)
- [ ] Create `aiQualityGatekeeperService.ts`
- [ ] Implement framework detection with AI
- [ ] Build PMBOK validation prompt
- [ ] Build BABOK validation prompt
- [ ] Build quality assessment prompt
- [ ] Implement gate decision logic
- [ ] Create database migration for quality_audits table
- [ ] Integrate with existing generation flow

### Phase 2: Multi-Framework Support (Week 2)
- [ ] Add ISO 9001 validation
- [ ] Add ISO 27001 validation
- [ ] Add PRINCE2 validation
- [ ] Add Agile/Scrum validation
- [ ] Build framework selection UI

### Phase 3: Dashboard & Analytics (Week 3)
- [ ] Template validation dashboard
- [ ] Quality trends over time
- [ ] Compliance tracking
- [ ] Batch mode unlock monitor
- [ ] Quality comparison reports

### Phase 4: Batch Mode Integration (Week 4)
- [ ] Batch generation API with gates
- [ ] Quality-based provider selection
- [ ] Auto-remediation for minor issues
- [ ] Comprehensive audit logging

---

## 💎 The Genius of This Approach

### The Quality Flywheel

```
Generate Document
        ↓
Automatic Quality Audit ←─────┐
        ↓                      │
Store Audit Metadata           │
        ↓                      │
Quality Score: 88/100         │
        ↓                      │
Approved for Batch? YES!      │
        ↓                      │
Template Marked Validated     │
        ↓                      │
More Templates Validated      │
        ↓                      │
Reach 90% Threshold           │
        ↓                      │
UNLOCK BATCH MODE!            │
        ↓                      │
70 Docs Generated (21 sec)    │
        ↓                      │
Each Gets Quality Audit ──────┘
        ↓
All Pass Gates = SUCCESS! ✅
```

**Self-reinforcing quality improvement!** 🔄

---

## 🎊 Benefits

### For Quality Control
- ✅ **100% audit coverage** - Every document audited
- ✅ **Consistent standards** - AI applies same criteria
- ✅ **Zero manual effort** - Fully automated
- ✅ **Instant feedback** - Results in seconds
- ✅ **Comprehensive** - Multiple frameworks checked

### For Batch Mode Unlock
- ✅ **Safe scaling** - Only validated templates in batch
- ✅ **Confidence** - Every template proven compliant
- ✅ **Quality maintained** - Gates prevent bad outputs
- ✅ **Audit trail** - Complete quality history
- ✅ **Risk mitigation** - Catch issues early

### For Cost Optimization
- ✅ **Prevent waste** - Don't batch bad templates
- ✅ **Smart selection** - Use cheap AI for auditing (DeepSeek)
- ✅ **Cache audits** - Reuse for similar documents
- ✅ **ROI tracking** - Quality cost vs manual review cost

---

## 📈 Expected Performance

### Audit Performance
```
AI Quality Audit per Document:
- Framework Detection: 1 sec (AI call)
- PMBOK Validation: 2 sec (AI call)
- Quality Assessment: 2 sec (AI call)
- Total: ~5 seconds per document

Cost:
- Use DeepSeek for audits: $0.60/1M tokens
- ~3K tokens per audit
- Cost: $0.002 per audit
- 70 documents: $0.14 total audit cost

vs Manual Review:
- 10 minutes per document
- 70 documents = 11.7 hours
- At $100/hour = $1,170
- Savings: 99.99%! 💰
```

---

## 🎯 Success Metrics

### Template Validation Phase (Current)
```
- Generate with multiple providers (DeepSeek, Groq, Gemini)
- Each gets automatic quality audit
- Track quality scores per template
- Refine templates based on audit feedback
- Mark as "validated" when 3+ instances score >85

Timeline: 2-4 weeks for 70 templates
Cost: ~$50 in AI costs (mostly DeepSeek + Groq FREE)
Result: All templates proven compliant and high-quality
```

### Batch Mode Phase (Future)
```
- All templates validated and approved
- Quality gates active during batch
- 70 documents generated in parallel
- Each audited automatically
- Only passing docs stored
- Failed docs auto-regenerated

Timeline: 21 seconds for 70 docs
Cost: ~$3 generation + $0.14 audit = $3.14 total
Result: Complete, compliant, high-quality project library
```

---

## 🏆 Conclusion

**This AI Quality Gatekeeper system**:
- ✅ Automates quality control completely
- ✅ Validates compliance automatically
- ✅ Enables safe batch mode scaling
- ✅ Maintains quality at scale
- ✅ Provides complete audit trails
- ✅ Costs pennies vs manual review

**With your existing infrastructure**:
- ✅ Quality assessment engine (built!)
- ✅ Baseline audit system (built!)
- ✅ Multi-provider orchestration (built!)
- 🆕 AI Gatekeeper (new design above)

**Result**: **World's first AI-validated, compliance-guaranteed, parallel document generation system!** 🌟

---

## 🎉 Next Steps

Would you like me to:
1. **Implement the AI Quality Gatekeeper service?**
2. **Create the database migration?**
3. **Integrate with existing generation flow?**
4. **Build the validation dashboard?**

**This would be the final piece to safely unlock your 70-agent orchestration!** 🚀


