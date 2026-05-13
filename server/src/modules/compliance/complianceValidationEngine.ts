/**
 * Compliance Validation Engine
 * SC-118: Document Compliance Validation Engine and Result Persistence
 * 
 * This service validates documents against standards-based compliance rules
 * and persists the results for audit and dashboard purposes.
 */

import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { aiService } from '../../services/aiService';
import {
  ComplianceRule,
  ComplianceValidationResult,
  RuleValidationResult,
  CategoryComplianceScore,
  ComplianceFinding,
  ComplianceEvidence,
  ComplianceRecommendation,
  ComplianceSummary,
  ComplianceMetadata,
  StandardsPack,
  StandardsCategory,
  ValidateComplianceRequest,
  ValidateComplianceResponse,
  ComplianceStatus,
  RuleSeverity,
  StandardsPackType,
  IComplianceValidationEngine,
} from './types';

class ComplianceValidationEngine implements IComplianceValidationEngine {
  /**
   * Validates a document against one or more standards packs
   */
  async validateDocument(request: ValidateComplianceRequest): Promise<ValidateComplianceResponse> {
    const startTime = Date.now();
    
    logger.info('[COMPLIANCE-ENGINE] Starting document compliance validation', {
      documentId: request.documentId,
      packTypes: request.packTypes,
      packIds: request.packIds,
    });

    try {
      // 1. Get document content
      const document = await this.getDocument(request.documentId);
      if (!document) {
        throw new Error(`Document not found: ${request.documentId}`);
      }

      // 2. Get applicable standards packs
      const packs = await this.getApplicablePacks(request);
      if (packs.length === 0) {
        throw new Error('No active standards packs found for validation');
      }

      // 3. Validate against each pack
      const results: ComplianceValidationResult[] = [];
      const allRecommendations: ComplianceRecommendation[] = [];

      for (const pack of packs) {
        const result = await this.validateAgainstPack(
          document,
          pack,
          request.ruleIds,
          request.compareWithPrevious
        );
        results.push(result);

        if (request.includeRecommendations) {
          const recommendations = await this.generateRecommendations(result);
          allRecommendations.push(...recommendations);
        }
      }

      // 4. Calculate aggregated score across all packs
      const aggregatedScore = this.calculateAggregatedScore(results);
      const aggregatedStatus = this.determineOverallStatus(aggregatedScore);

      // 5. Create audit trail entry
      const auditTrailId = await this.createAuditEntry(
        'VALIDATION_COMPLETED',
        request.documentId,
        document.project_id,
        results[0]?.id,
        null,
        `Validated document against ${packs.length} standards pack(s). Overall score: ${aggregatedScore.toFixed(1)}%`
      );

      const validationDuration = Date.now() - startTime;
      
      logger.info('[COMPLIANCE-ENGINE] Document compliance validation completed', {
        documentId: request.documentId,
        packsValidated: packs.length,
        aggregatedScore,
        aggregatedStatus,
        durationMs: validationDuration,
      });

      return {
        success: true,
        validationId: results[0]?.id || '',
        results,
        aggregatedScore,
        aggregatedStatus,
        recommendations: this.prioritizeRecommendations(allRecommendations),
        auditTrailId,
      };
    } catch (error) {
      logger.error('[COMPLIANCE-ENGINE] Document compliance validation failed', {
        documentId: request.documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validates a document against a single standards pack
   */
  private async validateAgainstPack(
    document: any,
    pack: StandardsPack,
    ruleIds?: string[],
    compareWithPrevious?: boolean
  ): Promise<ComplianceValidationResult> {
    const startTime = Date.now();
    
    // Get categories for this pack
    const categories = await this.getCategories(pack.id);
    
    // Get rules for this pack
    let rules = await this.getRules(pack.id);
    
    // Filter rules if specific ruleIds provided
    if (ruleIds && ruleIds.length > 0) {
      rules = rules.filter(r => ruleIds.includes(r.id));
    }

    // Filter by document type if applicable
    const documentType = document.type || document.template_framework || 'general';
    rules = rules.filter(r => 
      r.applicableDocTypes.length === 0 || 
      r.applicableDocTypes.includes(documentType) ||
      r.applicableDocTypes.includes('*')
    );

    // Validate each rule
    const ruleResults: RuleValidationResult[] = [];
    for (const rule of rules) {
      const result = await this.validateRule(document.content, rule);
      ruleResults.push(result);
    }

    // Calculate category scores
    const categoryScores: CategoryComplianceScore[] = [];
    for (const category of categories) {
      const categoryRuleResults = ruleResults.filter(r => r.categoryId === category.id);
      const categoryScore = this.calculateCategoryScore(categoryRuleResults, category);
      categoryScores.push(categoryScore);
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(categoryScores);
    const overallStatus = this.determineOverallStatus(overallScore);

    // Calculate summary
    const summary = this.calculateSummary(ruleResults, overallScore);

    // Get previous validation for comparison
    let previousValidationId: string | undefined;
    let comparisonDelta: number | undefined;

    if (compareWithPrevious) {
      const previous = await this.getPreviousValidation(document.id, pack.id);
      if (previous) {
        previousValidationId = previous.id;
        comparisonDelta = overallScore - previous.overall_score;
      }
    }

    const validationDuration = Date.now() - startTime;

    // Persist the validation result
    const validationResult = await this.persistValidationResult({
      documentId: document.id,
      projectId: document.project_id,
      packId: pack.id,
      packType: pack.packType,
      overallScore,
      overallStatus,
      categoryScores,
      ruleResults,
      summary,
      metadata: {
        validationDurationMs: validationDuration,
        documentWordCount: this.countWords(document.content),
        documentSectionCount: this.countSections(document.content),
        previousValidationId,
        comparisonDelta,
      },
      recommendations: [],
      validatedBy: 'system',
    });

    // Persist individual rule results
    await this.persistRuleResults(validationResult.id, ruleResults);

    logger.info('[COMPLIANCE-ENGINE] Pack validation completed', {
      documentId: document.id,
      packId: pack.id,
      packType: pack.packType,
      overallScore,
      rulesValidated: rules.length,
      durationMs: validationDuration,
    });

    return validationResult;
  }

  /**
   * Validates a single rule against document content
   */
  async validateRule(documentContent: string, rule: ComplianceRule): Promise<RuleValidationResult> {
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];
    
    const contentLower = documentContent.toLowerCase();
    let score = 0;
    const maxScore = 100;

    try {
      switch (rule.validationType) {
        case 'KEYWORD_PRESENCE':
          const keywordResult = this.validateKeywordPresence(contentLower, rule);
          score = keywordResult.score;
          findings.push(...keywordResult.findings);
          evidence.push(...keywordResult.evidence);
          break;

        case 'SECTION_PRESENCE':
          const sectionResult = this.validateSectionPresence(documentContent, rule);
          score = sectionResult.score;
          findings.push(...sectionResult.findings);
          evidence.push(...sectionResult.evidence);
          break;

        case 'STRUCTURE_CHECK':
          const structureResult = this.validateStructure(documentContent, rule);
          score = structureResult.score;
          findings.push(...structureResult.findings);
          evidence.push(...structureResult.evidence);
          break;

        case 'CONTENT_QUALITY':
          const qualityResult = await this.validateContentQuality(documentContent, rule);
          score = qualityResult.score;
          findings.push(...qualityResult.findings);
          evidence.push(...qualityResult.evidence);
          break;

        case 'TERMINOLOGY_CHECK':
          const terminologyResult = this.validateTerminology(contentLower, rule);
          score = terminologyResult.score;
          findings.push(...terminologyResult.findings);
          evidence.push(...terminologyResult.evidence);
          break;

        case 'METRIC_PRESENCE':
          const metricResult = this.validateMetricPresence(documentContent, rule);
          score = metricResult.score;
          findings.push(...metricResult.findings);
          evidence.push(...metricResult.evidence);
          break;

        case 'STAKEHOLDER_COVERAGE':
          const stakeholderResult = this.validateStakeholderCoverage(contentLower, rule);
          score = stakeholderResult.score;
          findings.push(...stakeholderResult.findings);
          evidence.push(...stakeholderResult.evidence);
          break;

        case 'RISK_ASSESSMENT':
          const riskResult = this.validateRiskAssessment(contentLower, rule);
          score = riskResult.score;
          findings.push(...riskResult.findings);
          evidence.push(...riskResult.evidence);
          break;

        default:
          score = 50; // Default partial score for unsupported validation types
          findings.push({
            id: crypto.randomUUID(),
            type: 'INCOMPLETE',
            description: `Validation type ${rule.validationType} not fully implemented`,
            severity: 'INFORMATIONAL',
          });
      }

      const status = this.determineRuleStatus(score, rule);

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        ruleName: rule.name,
        categoryId: rule.categoryId,
        status,
        score,
        maxScore,
        severity: rule.severity,
        findings,
        evidence,
        validatedAt: new Date(),
      };
    } catch (error) {
      logger.error('[COMPLIANCE-ENGINE] Rule validation failed', {
        ruleId: rule.id,
        ruleCode: rule.code,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        ruleName: rule.name,
        categoryId: rule.categoryId,
        status: 'PENDING',
        score: 0,
        maxScore,
        severity: rule.severity,
        findings: [{
          id: crypto.randomUUID(),
          type: 'INCOMPLETE',
          description: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'MAJOR',
        }],
        evidence: [],
        validatedAt: new Date(),
      };
    }
  }

  // ============================================================================
  // VALIDATION TYPE IMPLEMENTATIONS
  // ============================================================================

  private validateKeywordPresence(content: string, rule: ComplianceRule): {
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  } {
    const keywords = rule.validationConfig.keywords || [];
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];
    
    if (keywords.length === 0) {
      return { score: 100, findings, evidence };
    }

    let matchedCount = 0;
    const missingKeywords: string[] = [];

    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        matchedCount++;
        evidence.push({
          type: 'KEYWORD_MATCH',
          description: `Found keyword: "${keyword}"`,
          confidence: 1.0,
        });
      } else {
        missingKeywords.push(keyword);
      }
    }

    if (missingKeywords.length > 0) {
      findings.push({
        id: crypto.randomUUID(),
        type: 'MISSING',
        description: `Missing required keywords: ${missingKeywords.join(', ')}`,
        severity: missingKeywords.length > keywords.length / 2 ? 'MAJOR' : 'MINOR',
        details: `${matchedCount} of ${keywords.length} keywords found`,
      });
    }

    const score = Math.round((matchedCount / keywords.length) * 100);
    return { score, findings, evidence };
  }

  private validateSectionPresence(content: string, rule: ComplianceRule): {
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  } {
    const requiredSections = rule.validationConfig.requiredSections || [];
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];

    if (requiredSections.length === 0) {
      return { score: 100, findings, evidence };
    }

    let foundCount = 0;
    const missingSections: string[] = [];

    // Extract section headers from document
    const headers = content.match(/^#{1,6}\s+.+$/gm) || [];
    const headerTexts = headers.map(h => h.replace(/^#+\s+/, '').toLowerCase());

    for (const section of requiredSections) {
      const sectionLower = section.toLowerCase();
      const found = headerTexts.some(h => 
        h.includes(sectionLower) || sectionLower.includes(h)
      );

      if (found) {
        foundCount++;
        evidence.push({
          type: 'SECTION_FOUND',
          description: `Found required section: "${section}"`,
          confidence: 0.9,
        });
      } else {
        missingSections.push(section);
      }
    }

    if (missingSections.length > 0) {
      findings.push({
        id: crypto.randomUUID(),
        type: 'MISSING',
        description: `Missing required sections: ${missingSections.join(', ')}`,
        severity: missingSections.length > requiredSections.length / 2 ? 'MAJOR' : 'MINOR',
        details: `${foundCount} of ${requiredSections.length} sections found`,
      });
    }

    const score = Math.round((foundCount / requiredSections.length) * 100);
    return { score, findings, evidence };
  }

  private validateStructure(content: string, rule: ComplianceRule): {
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  } {
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];
    let score = 100;

    // Check for proper heading hierarchy
    const h1Count = (content.match(/^# /gm) || []).length;
    const h2Count = (content.match(/^## /gm) || []).length;
    const h3Count = (content.match(/^### /gm) || []).length;

    // Should have exactly one H1
    if (h1Count !== 1) {
      score -= 20;
      findings.push({
        id: crypto.randomUUID(),
        type: h1Count === 0 ? 'MISSING' : 'INCORRECT',
        description: h1Count === 0 
          ? 'Document is missing a main title (H1)' 
          : `Document has ${h1Count} main titles (should have exactly 1)`,
        severity: 'MAJOR',
      });
    } else {
      evidence.push({
        type: 'STRUCTURE_VALID',
        description: 'Document has exactly one main title (H1)',
        confidence: 1.0,
      });
    }

    // Should have at least 3 H2 sections
    const minH2 = Number(rule.validationConfig.parameters?.minH2Sections) || 3;
    if (h2Count < minH2) {
      score -= 15;
      findings.push({
        id: crypto.randomUUID(),
        type: 'WEAK',
        description: `Document has ${h2Count} sections (recommended: ${minH2}+)`,
        severity: 'MINOR',
      });
    } else {
      evidence.push({
        type: 'STRUCTURE_VALID',
        description: `Document has ${h2Count} major sections`,
        confidence: 1.0,
      });
    }

    // Check for tables (structured data)
    const tableCount = (content.match(/\|.*\|/g) || []).length;
    if (tableCount === 0 && rule.validationConfig.parameters?.requireTables) {
      score -= 10;
      findings.push({
        id: crypto.randomUUID(),
        type: 'MISSING',
        description: 'Document does not contain any tables for structured data',
        severity: 'MINOR',
      });
    }

    // Check for lists
    const listCount = (content.match(/^[-*]\s/gm) || []).length + 
                      (content.match(/^\d+\.\s/gm) || []).length;
    if (listCount === 0 && rule.validationConfig.parameters?.requireLists) {
      score -= 10;
      findings.push({
        id: crypto.randomUUID(),
        type: 'MISSING',
        description: 'Document does not contain any lists',
        severity: 'INFORMATIONAL',
      });
    }

    return { score: Math.max(0, score), findings, evidence };
  }

  private async validateContentQuality(content: string, rule: ComplianceRule): Promise<{
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  }> {
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];
    let score = 70; // Default baseline score

    // Word count check
    const wordCount = this.countWords(content);
    const minWords = Number(rule.validationConfig.parameters?.minWordCount) || 500;
    
    if (wordCount < minWords) {
      const shortfall = minWords - wordCount;
      score -= Math.min(30, Math.round(shortfall / minWords * 30));
      findings.push({
        id: crypto.randomUUID(),
        type: 'WEAK',
        description: `Document has ${wordCount} words (minimum recommended: ${minWords})`,
        severity: 'MINOR',
      });
    } else {
      evidence.push({
        type: 'METRIC_PRESENT',
        description: `Document has adequate length (${wordCount} words)`,
        confidence: 1.0,
      });
      score += 10;
    }

    // Check for placeholders
    const placeholders = content.match(/\[.*?\]|TBD|TODO|PLACEHOLDER|INSERT/gi) || [];
    if (placeholders.length > 0) {
      score -= Math.min(20, placeholders.length * 5);
      findings.push({
        id: crypto.randomUUID(),
        type: 'INCOMPLETE',
        description: `Document contains ${placeholders.length} placeholder(s)`,
        severity: placeholders.length > 3 ? 'MAJOR' : 'MINOR',
        details: `Examples: ${placeholders.slice(0, 3).join(', ')}`,
      });
    }

    // Check for specific data (numbers, percentages, dates)
    const hasSpecificData = /\d+%|\$[\d,]+|\d{4}[-/]\d{2}[-/]\d{2}|\d+\s+(days|weeks|months|hours)/i.test(content);
    if (hasSpecificData) {
      score += 10;
      evidence.push({
        type: 'METRIC_PRESENT',
        description: 'Document contains specific quantitative data',
        confidence: 0.9,
      });
    } else if (rule.validationConfig.parameters?.requireMetrics) {
      findings.push({
        id: crypto.randomUUID(),
        type: 'MISSING',
        description: 'Document lacks specific quantitative data (percentages, dates, durations)',
        severity: 'MINOR',
      });
    }

    return { score: Math.min(100, Math.max(0, score)), findings, evidence };
  }

  private validateTerminology(content: string, rule: ComplianceRule): {
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  } {
    const keywords = rule.validationConfig.keywords || [];
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];

    if (keywords.length === 0) {
      return { score: 100, findings, evidence };
    }

    let matchCount = 0;
    const foundTerms: string[] = [];
    const missingTerms: string[] = [];

    for (const term of keywords) {
      const termLower = term.toLowerCase();
      const regex = new RegExp(`\\b${termLower}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0) {
        matchCount++;
        foundTerms.push(term);
        evidence.push({
          type: 'KEYWORD_MATCH',
          description: `Found standard terminology: "${term}" (${matches.length} occurrences)`,
          confidence: 1.0,
        });
      } else {
        missingTerms.push(term);
      }
    }

    if (missingTerms.length > 0) {
      const coverage = matchCount / keywords.length;
      findings.push({
        id: crypto.randomUUID(),
        type: coverage < 0.5 ? 'WEAK' : 'IMPROVEMENT',
        description: `Missing standard terminology: ${missingTerms.slice(0, 5).join(', ')}${missingTerms.length > 5 ? '...' : ''}`,
        severity: coverage < 0.3 ? 'MAJOR' : 'MINOR',
        details: `${matchCount} of ${keywords.length} standard terms used`,
      });
    }

    const score = Math.round((matchCount / keywords.length) * 100);
    return { score, findings, evidence };
  }

  private validateMetricPresence(content: string, rule: ComplianceRule): {
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  } {
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];
    let score = 0;

    // Check for percentages
    const percentages = content.match(/\d+(\.\d+)?%/g) || [];
    if (percentages.length > 0) {
      score += 25;
      evidence.push({
        type: 'METRIC_PRESENT',
        description: `Found ${percentages.length} percentage values`,
        confidence: 1.0,
      });
    }

    // Check for monetary values
    const monetary = content.match(/\$[\d,]+(\.\d+)?|USD\s*[\d,]+/gi) || [];
    if (monetary.length > 0) {
      score += 25;
      evidence.push({
        type: 'METRIC_PRESENT',
        description: `Found ${monetary.length} monetary values`,
        confidence: 1.0,
      });
    }

    // Check for dates
    const dates = content.match(/\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g) || [];
    if (dates.length > 0) {
      score += 25;
      evidence.push({
        type: 'METRIC_PRESENT',
        description: `Found ${dates.length} date references`,
        confidence: 0.9,
      });
    }

    // Check for durations
    const durations = content.match(/\d+\s+(days?|weeks?|months?|hours?|years?)/gi) || [];
    if (durations.length > 0) {
      score += 25;
      evidence.push({
        type: 'METRIC_PRESENT',
        description: `Found ${durations.length} duration references`,
        confidence: 0.9,
      });
    }

    if (score < 50) {
      findings.push({
        id: crypto.randomUUID(),
        type: 'WEAK',
        description: 'Document lacks quantitative metrics (percentages, costs, dates, durations)',
        severity: 'MINOR',
      });
    }

    return { score: Math.min(100, score), findings, evidence };
  }

  private validateStakeholderCoverage(content: string, rule: ComplianceRule): {
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  } {
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];
    let score = 0;

    // Check for stakeholder-related terms
    const stakeholderTerms = [
      'stakeholder', 'sponsor', 'customer', 'client', 'user', 'team', 
      'project manager', 'executive', 'management', 'owner', 'beneficiary'
    ];

    let foundTerms = 0;
    for (const term of stakeholderTerms) {
      if (content.includes(term)) {
        foundTerms++;
      }
    }

    if (foundTerms >= 5) {
      score = 100;
      evidence.push({
        type: 'KEYWORD_MATCH',
        description: `Comprehensive stakeholder coverage (${foundTerms} stakeholder types mentioned)`,
        confidence: 0.9,
      });
    } else if (foundTerms >= 3) {
      score = 70;
      evidence.push({
        type: 'KEYWORD_MATCH',
        description: `Moderate stakeholder coverage (${foundTerms} stakeholder types mentioned)`,
        confidence: 0.8,
      });
      findings.push({
        id: crypto.randomUUID(),
        type: 'IMPROVEMENT',
        description: 'Consider expanding stakeholder identification',
        severity: 'INFORMATIONAL',
      });
    } else {
      score = 30;
      findings.push({
        id: crypto.randomUUID(),
        type: 'WEAK',
        description: `Limited stakeholder coverage (only ${foundTerms} stakeholder types mentioned)`,
        severity: 'MAJOR',
      });
    }

    // Check for stakeholder matrix/register
    if (content.toLowerCase().includes('stakeholder register') || 
        content.toLowerCase().includes('stakeholder matrix') ||
        content.toLowerCase().includes('raci')) {
      score = Math.min(100, score + 20);
      evidence.push({
        type: 'SECTION_FOUND',
        description: 'Found stakeholder documentation structure',
        confidence: 0.9,
      });
    }

    return { score, findings, evidence };
  }

  private validateRiskAssessment(content: string, rule: ComplianceRule): {
    score: number;
    findings: ComplianceFinding[];
    evidence: ComplianceEvidence[];
  } {
    const findings: ComplianceFinding[] = [];
    const evidence: ComplianceEvidence[] = [];
    let score = 0;

    // Check for risk-related terms
    const riskTerms = [
      'risk', 'threat', 'vulnerability', 'mitigation', 'contingency',
      'probability', 'impact', 'risk register', 'risk response'
    ];

    let foundTerms = 0;
    for (const term of riskTerms) {
      if (content.includes(term)) {
        foundTerms++;
      }
    }

    if (foundTerms >= 6) {
      score = 100;
      evidence.push({
        type: 'KEYWORD_MATCH',
        description: `Comprehensive risk coverage (${foundTerms} risk terms found)`,
        confidence: 0.9,
      });
    } else if (foundTerms >= 3) {
      score = 60;
      findings.push({
        id: crypto.randomUUID(),
        type: 'IMPROVEMENT',
        description: 'Risk assessment could be more comprehensive',
        severity: 'MINOR',
      });
    } else {
      score = 20;
      findings.push({
        id: crypto.randomUUID(),
        type: 'WEAK',
        description: 'Document lacks adequate risk assessment coverage',
        severity: 'MAJOR',
      });
    }

    // Check for risk matrix or quantitative risk data
    if (content.includes('high') && content.includes('medium') && content.includes('low')) {
      score = Math.min(100, score + 15);
      evidence.push({
        type: 'STRUCTURE_VALID',
        description: 'Found risk categorization (high/medium/low)',
        confidence: 0.8,
      });
    }

    return { score, findings, evidence };
  }

  // ============================================================================
  // SCORING CALCULATIONS
  // ============================================================================

  calculateCategoryScore(results: RuleValidationResult[], category: StandardsCategory): CategoryComplianceScore {
    if (results.length === 0) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryCode: category.code,
        score: 0,
        maxScore: 100,
        percentage: 0,
        status: 'NOT_APPLICABLE',
        ruleCount: 0,
        passedRules: 0,
        failedRules: 0,
        weight: category.weight,
      };
    }

    // Calculate weighted score based on rule severity
    let totalWeight = 0;
    let weightedScore = 0;
    let passedRules = 0;
    let failedRules = 0;

    for (const result of results) {
      const severityWeight = this.getSeverityWeight(result.severity);
      totalWeight += severityWeight;
      weightedScore += result.score * severityWeight;

      if (result.status === 'COMPLIANT') {
        passedRules++;
      } else if (result.status === 'NON_COMPLIANT') {
        failedRules++;
      }
    }

    const score = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const percentage = Math.round(score);
    const status = this.determineOverallStatus(score);

    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryCode: category.code,
      score: Math.round(score * 100) / 100,
      maxScore: 100,
      percentage,
      status,
      ruleCount: results.length,
      passedRules,
      failedRules,
      weight: category.weight,
    };
  }

  calculateOverallScore(categoryScores: CategoryComplianceScore[]): number {
    if (categoryScores.length === 0) return 0;

    let totalWeight = 0;
    let weightedScore = 0;

    for (const category of categoryScores) {
      totalWeight += category.weight;
      weightedScore += category.score * category.weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight * 100) / 100 : 0;
  }

  private calculateAggregatedScore(results: ComplianceValidationResult[]): number {
    if (results.length === 0) return 0;
    
    const totalScore = results.reduce((sum, r) => sum + r.overallScore, 0);
    return Math.round(totalScore / results.length * 100) / 100;
  }

  private calculateSummary(ruleResults: RuleValidationResult[], overallScore: number): ComplianceSummary {
    let passedRules = 0;
    let failedRules = 0;
    let partialRules = 0;
    let notApplicableRules = 0;
    let criticalFindings = 0;
    let majorFindings = 0;
    let minorFindings = 0;
    let informationalFindings = 0;

    for (const result of ruleResults) {
      switch (result.status) {
        case 'COMPLIANT': passedRules++; break;
        case 'NON_COMPLIANT': failedRules++; break;
        case 'PARTIAL': partialRules++; break;
        case 'NOT_APPLICABLE': notApplicableRules++; break;
      }

      for (const finding of result.findings) {
        switch (finding.severity) {
          case 'CRITICAL': criticalFindings++; break;
          case 'MAJOR': majorFindings++; break;
          case 'MINOR': minorFindings++; break;
          case 'INFORMATIONAL': informationalFindings++; break;
        }
      }
    }

    return {
      totalRules: ruleResults.length,
      passedRules,
      failedRules,
      partialRules,
      notApplicableRules,
      criticalFindings,
      majorFindings,
      minorFindings,
      informationalFindings,
      compliancePercentage: Math.round(overallScore),
      grade: this.calculateGrade(overallScore),
      trend: 'NEW',
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private determineOverallStatus(score: number): ComplianceStatus {
    if (score >= 90) return 'COMPLIANT';
    if (score >= 70) return 'PARTIAL';
    return 'NON_COMPLIANT';
  }

  private determineRuleStatus(score: number, rule: ComplianceRule): ComplianceStatus {
    const thresholds = rule.validationConfig.thresholds || { pass: 80, warning: 60, fail: 40 };
    
    if (score >= thresholds.pass) return 'COMPLIANT';
    if (score >= thresholds.warning) return 'PARTIAL';
    return 'NON_COMPLIANT';
  }

  private getSeverityWeight(severity: RuleSeverity): number {
    switch (severity) {
      case 'CRITICAL': return 4;
      case 'MAJOR': return 3;
      case 'MINOR': return 2;
      case 'INFORMATIONAL': return 1;
      default: return 1;
    }
  }

  private calculateGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }

  private countWords(content: string): number {
    return content.split(/\s+/).filter(w => w.length > 0).length;
  }

  private countSections(content: string): number {
    return (content.match(/^#{1,6}\s/gm) || []).length;
  }

  private prioritizeRecommendations(recommendations: ComplianceRecommendation[]): ComplianceRecommendation[] {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return recommendations.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      b.potentialScoreImprovement - a.potentialScoreImprovement
    );
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  private async getDocument(documentId: string): Promise<any> {
    const result = await pool.query(
      `SELECT d.*, t.framework as template_framework
       FROM documents d
       LEFT JOIN templates t ON d.template_id = t.id
       WHERE d.id = $1`,
      [documentId]
    );
    return result.rows[0];
  }

  private async getApplicablePacks(request: ValidateComplianceRequest): Promise<StandardsPack[]> {
    let query = 'SELECT * FROM standards_packs WHERE is_active = true';
    const params: any[] = [];

    if (request.packIds && request.packIds.length > 0) {
      query += ` AND id = ANY($${params.length + 1})`;
      params.push(request.packIds);
    } else if (request.packTypes && request.packTypes.length > 0) {
      query += ` AND pack_type = ANY($${params.length + 1})`;
      params.push(request.packTypes);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      packType: row.pack_type as StandardsPackType,
      name: row.name,
      description: row.description,
      version: row.version,
      isActive: row.is_active,
      rules: [],
      categories: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private async getCategories(packId: string): Promise<StandardsCategory[]> {
    const result = await pool.query(
      `SELECT * FROM standards_categories WHERE pack_id = $1 ORDER BY sort_order`,
      [packId]
    );
    return result.rows.map(row => ({
      id: row.id,
      packId: row.pack_id,
      name: row.name,
      code: row.code,
      description: row.description,
      weight: parseFloat(row.weight) || 1,
      parentCategoryId: row.parent_category_id,
      sortOrder: row.sort_order,
      isRequired: row.is_required,
    }));
  }

  private async getRules(packId: string): Promise<ComplianceRule[]> {
    const result = await pool.query(
      `SELECT * FROM compliance_rules WHERE pack_id = $1 AND is_active = true ORDER BY category_id, code`,
      [packId]
    );
    return result.rows.map(row => ({
      id: row.id,
      packId: row.pack_id,
      categoryId: row.category_id,
      code: row.code,
      name: row.name,
      description: row.description,
      rationale: row.rationale,
      validationType: row.validation_type,
      severity: row.severity,
      weight: parseFloat(row.weight) || 1,
      isActive: row.is_active,
      isRequired: row.is_required,
      applicableDocTypes: row.applicable_doc_types || [],
      validationConfig: row.validation_config || {},
      remediationGuidance: row.remediation_guidance || {},
      standardsReference: row.standards_reference || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private async getPreviousValidation(documentId: string, packId: string): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM compliance_validation_results 
       WHERE document_id = $1 AND pack_id = $2 
       ORDER BY validated_at DESC LIMIT 1 OFFSET 1`,
      [documentId, packId]
    );
    return result.rows[0];
  }

  private async persistValidationResult(data: {
    documentId: string;
    projectId: string;
    packId: string;
    packType: StandardsPackType;
    overallScore: number;
    overallStatus: ComplianceStatus;
    categoryScores: CategoryComplianceScore[];
    ruleResults: RuleValidationResult[];
    summary: ComplianceSummary;
    metadata: ComplianceMetadata;
    recommendations: ComplianceRecommendation[];
    validatedBy: string;
  }): Promise<ComplianceValidationResult> {
    const result = await pool.query(
      `INSERT INTO compliance_validation_results (
        document_id, project_id, pack_id, pack_type,
        overall_score, overall_status, total_rules, passed_rules, failed_rules,
        partial_rules, not_applicable_rules, critical_findings, major_findings,
        minor_findings, informational_findings, compliance_percentage, grade, trend,
        category_scores, summary, metadata, validation_duration_ms,
        previous_validation_id, comparison_delta, validated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        data.documentId,
        data.projectId,
        data.packId,
        data.packType,
        data.overallScore,
        data.overallStatus,
        data.summary.totalRules,
        data.summary.passedRules,
        data.summary.failedRules,
        data.summary.partialRules,
        data.summary.notApplicableRules,
        data.summary.criticalFindings,
        data.summary.majorFindings,
        data.summary.minorFindings,
        data.summary.informationalFindings,
        data.summary.compliancePercentage,
        data.summary.grade,
        data.summary.trend,
        JSON.stringify(data.categoryScores),
        JSON.stringify(data.summary),
        JSON.stringify(data.metadata),
        data.metadata.validationDurationMs,
        data.metadata.previousValidationId,
        data.metadata.comparisonDelta,
        data.validatedBy,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      documentId: row.document_id,
      projectId: row.project_id,
      packId: row.pack_id,
      packType: row.pack_type,
      validatedAt: row.validated_at,
      validatedBy: row.validated_by,
      overallScore: parseFloat(row.overall_score),
      overallStatus: row.overall_status,
      categoryScores: data.categoryScores,
      ruleResults: data.ruleResults,
      recommendations: data.recommendations,
      summary: data.summary,
      metadata: data.metadata,
    };
  }

  private async persistRuleResults(validationResultId: string, ruleResults: RuleValidationResult[]): Promise<void> {
    for (const result of ruleResults) {
      await pool.query(
        `INSERT INTO compliance_rule_results (
          validation_result_id, rule_id, category_id, status, score, max_score,
          severity, findings, evidence, validated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          validationResultId,
          result.ruleId,
          result.categoryId,
          result.status,
          result.score,
          result.maxScore,
          result.severity,
          JSON.stringify(result.findings),
          JSON.stringify(result.evidence),
          result.validatedAt,
        ]
      );
    }
  }

  private async generateRecommendations(result: ComplianceValidationResult): Promise<ComplianceRecommendation[]> {
    const recommendations: ComplianceRecommendation[] = [];

    for (const ruleResult of result.ruleResults) {
      if (ruleResult.status !== 'COMPLIANT' && ruleResult.findings.length > 0) {
        const rule = await this.getRule(ruleResult.ruleId);
        if (!rule) continue;

        const priority = this.determinePriority(ruleResult);
        const potentialImprovement = 100 - ruleResult.score;

        recommendations.push({
          id: crypto.randomUUID(),
          ruleId: ruleResult.ruleId,
          ruleCode: ruleResult.ruleCode,
          categoryId: ruleResult.categoryId,
          priority,
          type: this.determineRecommendationType(ruleResult),
          title: `Improve ${ruleResult.ruleName}`,
          description: ruleResult.findings[0]?.description || 'Address compliance gap',
          impact: `Could improve score by up to ${potentialImprovement.toFixed(0)} points`,
          effort: this.estimateEffort(ruleResult),
          guidance: rule.remediationGuidance,
          relatedFindings: ruleResult.findings.map(f => f.id),
          potentialScoreImprovement: potentialImprovement,
        });
      }
    }

    return recommendations;
  }

  private async getRule(ruleId: string): Promise<ComplianceRule | null> {
    const result = await pool.query('SELECT * FROM compliance_rules WHERE id = $1', [ruleId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      packId: row.pack_id,
      categoryId: row.category_id,
      code: row.code,
      name: row.name,
      description: row.description,
      rationale: row.rationale,
      validationType: row.validation_type,
      severity: row.severity,
      weight: parseFloat(row.weight) || 1,
      isActive: row.is_active,
      isRequired: row.is_required,
      applicableDocTypes: row.applicable_doc_types || [],
      validationConfig: row.validation_config || {},
      remediationGuidance: row.remediation_guidance || {},
      standardsReference: row.standards_reference || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private determinePriority(result: RuleValidationResult): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (result.severity === 'CRITICAL') return 'CRITICAL';
    if (result.severity === 'MAJOR' && result.score < 50) return 'HIGH';
    if (result.score < 30) return 'HIGH';
    if (result.score < 60) return 'MEDIUM';
    return 'LOW';
  }

  private determineRecommendationType(result: RuleValidationResult): 'ADD_CONTENT' | 'MODIFY_CONTENT' | 'RESTRUCTURE' | 'ADD_REFERENCE' | 'CLARIFY' | 'EXPAND' {
    const finding = result.findings[0];
    if (!finding) return 'ADD_CONTENT';
    
    switch (finding.type) {
      case 'MISSING': return 'ADD_CONTENT';
      case 'INCOMPLETE': return 'EXPAND';
      case 'INCORRECT': return 'MODIFY_CONTENT';
      case 'WEAK': return 'EXPAND';
      default: return 'CLARIFY';
    }
  }

  private estimateEffort(result: RuleValidationResult): 'LOW' | 'MEDIUM' | 'HIGH' {
    const findingCount = result.findings.length;
    const severity = result.severity;
    
    if (severity === 'CRITICAL' || findingCount > 3) return 'HIGH';
    if (severity === 'MAJOR' || findingCount > 1) return 'MEDIUM';
    return 'LOW';
  }

  private async createAuditEntry(
    eventType: string,
    documentId: string | null,
    projectId: string | null,
    validationResultId: string | null,
    ruleId: string | null,
    details: string
  ): Promise<string> {
    const result = await pool.query(
      `INSERT INTO compliance_audit_trail (
        event_type, document_id, project_id, validation_result_id, rule_id,
        user_id, details, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING id`,
      [eventType, documentId, projectId, validationResultId, ruleId, 'system', details]
    );
    return result.rows[0].id;
  }
}

export const complianceValidationEngine = new ComplianceValidationEngine();
export default complianceValidationEngine;
