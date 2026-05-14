/**
 * Standards Compliance & Governance Framework Types
 * SC-28: Foundation types for standards-inspired validation across multiple standards packs
 * 
 * This module provides the shared type definitions for:
 * - SC-117: Shared Compliance Rule Model and Standards Mapping Foundation
 * - SC-118: Document Compliance Validation Engine
 * - SC-119: Compliance Audit Trail and Verification History
 * - SC-120: Compliance Dashboard and Trend Visibility
 * - SC-121: Compliance Recommendations and Gap Remediation Guidance
 */

// ============================================================================
// STANDARDS PACK DEFINITIONS
// ============================================================================

/**
 * Supported standards packs for compliance validation
 */
export type StandardsPackType = 'PMBOK' | 'BABOK' | 'DMBOK' | 'CUSTOM';

/**
 * Standards pack version information
 */
export interface StandardsPackVersion {
  packType: StandardsPackType;
  version: string;
  effectiveDate: string;
  description: string;
  isActive: boolean;
}

/**
 * Standards pack configuration
 */
export interface StandardsPack {
  id: string;
  packType: StandardsPackType;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  rules: ComplianceRule[];
  categories: StandardsCategory[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STANDARDS CATEGORIES AND DOMAINS
// ============================================================================

/**
 * Standards category within a pack (e.g., PMBOK Knowledge Areas, BABOK Knowledge Areas)
 */
export interface StandardsCategory {
  id: string;
  packId: string;
  name: string;
  code: string;
  description: string;
  weight: number;
  parentCategoryId?: string;
  sortOrder: number;
  isRequired: boolean;
}

/**
 * PMBOK-specific domain types (Performance Domains in PMBOK 7)
 */
export type PMBOKDomain =
  | 'STAKEHOLDERS'
  | 'TEAM'
  | 'DEVELOPMENT_APPROACH'
  | 'PLANNING'
  | 'PROJECT_WORK'
  | 'DELIVERY'
  | 'MEASUREMENT'
  | 'UNCERTAINTY';

/**
 * PMBOK-specific principle types (12 Principles in PMBOK 7)
 */
export type PMBOKPrinciple =
  | 'STEWARDSHIP'
  | 'TEAM'
  | 'STAKEHOLDERS'
  | 'VALUE'
  | 'SYSTEMS_THINKING'
  | 'LEADERSHIP'
  | 'TAILORING'
  | 'QUALITY'
  | 'COMPLEXITY'
  | 'RISK'
  | 'ADAPTABILITY'
  | 'CHANGE';

/**
 * BABOK-specific knowledge area types
 */
export type BABOKKnowledgeArea =
  | 'BUSINESS_ANALYSIS_PLANNING'
  | 'ELICITATION_COLLABORATION'
  | 'REQUIREMENTS_LIFECYCLE'
  | 'STRATEGY_ANALYSIS'
  | 'REQUIREMENTS_ANALYSIS'
  | 'SOLUTION_EVALUATION';

/**
 * DMBOK-specific knowledge area types
 */
export type DMBOKKnowledgeArea =
  | 'DATA_GOVERNANCE'
  | 'DATA_ARCHITECTURE'
  | 'DATA_MODELING'
  | 'DATA_STORAGE'
  | 'DATA_SECURITY'
  | 'DATA_INTEGRATION'
  | 'DATA_QUALITY'
  | 'METADATA'
  | 'DATA_WAREHOUSING'
  | 'REFERENCE_DATA'
  | 'MASTER_DATA';

// ============================================================================
// COMPLIANCE RULE DEFINITIONS
// ============================================================================

/**
 * Rule severity levels for compliance findings
 */
export type RuleSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFORMATIONAL';

/**
 * Rule validation types
 */
export type RuleValidationType =
  | 'KEYWORD_PRESENCE'
  | 'SECTION_PRESENCE'
  | 'STRUCTURE_CHECK'
  | 'CONTENT_QUALITY'
  | 'TERMINOLOGY_CHECK'
  | 'REFERENCE_CHECK'
  | 'METRIC_PRESENCE'
  | 'STAKEHOLDER_COVERAGE'
  | 'RISK_ASSESSMENT'
  | 'CUSTOM_LOGIC';

/**
 * Compliance rule definition
 */
export interface ComplianceRule {
  id: string;
  packId: string;
  categoryId: string;
  code: string;
  name: string;
  description: string;
  rationale: string;
  validationType: RuleValidationType;
  severity: RuleSeverity;
  weight: number;
  isActive: boolean;
  isRequired: boolean;
  applicableDocTypes: string[];
  validationConfig: RuleValidationConfig;
  remediationGuidance: RemediationGuidance;
  standardsReference: StandardsReference;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rule validation configuration
 */
export interface RuleValidationConfig {
  keywords?: string[];
  requiredSections?: string[];
  minScore?: number;
  maxScore?: number;
  regex?: string;
  customLogic?: string;
  thresholds?: {
    pass: number;
    warning: number;
    fail: number;
  };
  parameters?: Record<string, unknown>;
}

/**
 * Standards reference for traceability
 */
export interface StandardsReference {
  standardName: string;
  section: string;
  subsection?: string;
  pageReference?: string;
  edition?: string;
  notes?: string;
}

/**
 * Remediation guidance for non-compliance
 */
export interface RemediationGuidance {
  summary: string;
  steps: RemediationStep[];
  examples?: string[];
  resources?: RemediationResource[];
  estimatedEffort?: 'LOW' | 'MEDIUM' | 'HIGH';
  priority?: number;
}

export interface RemediationStep {
  order: number;
  action: string;
  details?: string;
  responsible?: string;
}

export interface RemediationResource {
  type: 'DOCUMENTATION' | 'TEMPLATE' | 'EXAMPLE' | 'TRAINING' | 'EXTERNAL';
  title: string;
  url?: string;
  description?: string;
}

// ============================================================================
// COMPLIANCE VALIDATION RESULTS
// ============================================================================

/**
 * Compliance validation status
 */
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE' | 'PENDING';

/**
 * Document compliance validation result
 */
export interface ComplianceValidationResult {
  id: string;
  documentId: string;
  projectId: string;
  packId: string;
  packType: StandardsPackType;
  validatedAt: Date;
  validatedBy: string;
  overallScore: number;
  overallStatus: ComplianceStatus;
  categoryScores: CategoryComplianceScore[];
  ruleResults: RuleValidationResult[];
  recommendations: ComplianceRecommendation[];
  summary: ComplianceSummary;
  metadata: ComplianceMetadata;
}

/**
 * Category-level compliance score
 */
export interface CategoryComplianceScore {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: ComplianceStatus;
  ruleCount: number;
  passedRules: number;
  failedRules: number;
  weight: number;
}

/**
 * Individual rule validation result
 */
export interface RuleValidationResult {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  categoryId: string;
  status: ComplianceStatus;
  score: number;
  maxScore: number;
  severity: RuleSeverity;
  findings: ComplianceFinding[];
  evidence: ComplianceEvidence[];
  validatedAt: Date;
}

/**
 * Compliance finding from rule validation
 */
export interface ComplianceFinding {
  id: string;
  type: 'MISSING' | 'INCOMPLETE' | 'INCORRECT' | 'WEAK' | 'IMPROVEMENT';
  description: string;
  location?: DocumentLocation;
  severity: RuleSeverity;
  details?: string;
}

/**
 * Document location reference
 */
export interface DocumentLocation {
  section?: string;
  lineStart?: number;
  lineEnd?: number;
  charStart?: number;
  charEnd?: number;
  snippet?: string;
}

/**
 * Evidence supporting compliance determination
 */
export interface ComplianceEvidence {
  type: 'KEYWORD_MATCH' | 'SECTION_FOUND' | 'STRUCTURE_VALID' | 'METRIC_PRESENT' | 'REFERENCE_VALID';
  description: string;
  location?: DocumentLocation;
  confidence: number;
}

/**
 * Compliance summary for dashboard display
 */
export interface ComplianceSummary {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  partialRules: number;
  notApplicableRules: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  informationalFindings: number;
  compliancePercentage: number;
  grade: string;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'NEW';
}

/**
 * Compliance validation metadata
 */
export interface ComplianceMetadata {
  validationDurationMs: number;
  aiProvider?: string;
  aiModel?: string;
  documentWordCount: number;
  documentSectionCount: number;
  previousValidationId?: string;
  comparisonDelta?: number;
}

// ============================================================================
// COMPLIANCE RECOMMENDATIONS
// ============================================================================

/**
 * Compliance recommendation with prioritization
 */
export interface ComplianceRecommendation {
  id: string;
  ruleId: string;
  ruleCode: string;
  categoryId: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'ADD_CONTENT' | 'MODIFY_CONTENT' | 'RESTRUCTURE' | 'ADD_REFERENCE' | 'CLARIFY' | 'EXPAND';
  title: string;
  description: string;
  impact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  guidance: RemediationGuidance;
  relatedFindings: string[];
  potentialScoreImprovement: number;
}

// ============================================================================
// COMPLIANCE AUDIT TRAIL
// ============================================================================

/**
 * Compliance audit event types
 */
export type ComplianceAuditEventType =
  | 'VALIDATION_STARTED'
  | 'VALIDATION_COMPLETED'
  | 'VALIDATION_FAILED'
  | 'FINDING_CREATED'
  | 'FINDING_RESOLVED'
  | 'RECOMMENDATION_CREATED'
  | 'RECOMMENDATION_APPLIED'
  | 'STATUS_CHANGED'
  | 'SCORE_CHANGED'
  | 'RULE_ADDED'
  | 'RULE_MODIFIED'
  | 'PACK_ACTIVATED'
  | 'PACK_DEACTIVATED';

/**
 * Compliance audit trail entry
 */
export interface ComplianceAuditEntry {
  id: string;
  eventType: ComplianceAuditEventType;
  documentId?: string;
  projectId?: string;
  validationResultId?: string;
  ruleId?: string;
  packId?: string;
  userId: string;
  userName?: string;
  timestamp: Date;
  previousValue?: unknown;
  newValue?: unknown;
  details: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// COMPLIANCE TRENDS AND ANALYTICS
// ============================================================================

/**
 * Compliance trend data point
 */
export interface ComplianceTrendPoint {
  date: Date;
  overallScore: number;
  compliancePercentage: number;
  documentCount: number;
  criticalFindings: number;
  resolvedFindings: number;
}

/**
 * Compliance analytics summary
 */
export interface ComplianceAnalytics {
  periodStart: Date;
  periodEnd: Date;
  totalValidations: number;
  averageScore: number;
  scoreChange: number;
  topIssueCategories: CategoryIssueCount[];
  trendData: ComplianceTrendPoint[];
  packBreakdown: PackComplianceBreakdown[];
}

export interface CategoryIssueCount {
  categoryId: string;
  categoryName: string;
  issueCount: number;
  percentage: number;
}

export interface PackComplianceBreakdown {
  packId: string;
  packType: StandardsPackType;
  packName: string;
  validationCount: number;
  averageScore: number;
  complianceRate: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Validate document compliance request
 */
export interface ValidateComplianceRequest {
  documentId: string;
  packIds?: string[];
  packTypes?: StandardsPackType[];
  ruleIds?: string[];
  includeRecommendations?: boolean;
  compareWithPrevious?: boolean;
}

/**
 * Validate document compliance response
 */
export interface ValidateComplianceResponse {
  success: boolean;
  validationId: string;
  results: ComplianceValidationResult[];
  aggregatedScore: number;
  aggregatedStatus: ComplianceStatus;
  recommendations: ComplianceRecommendation[];
  auditTrailId: string;
}

/**
 * Get compliance dashboard request
 */
export interface ComplianceDashboardRequest {
  projectId?: string;
  packTypes?: StandardsPackType[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

/**
 * Compliance dashboard response
 */
export interface ComplianceDashboardResponse {
  summary: ComplianceSummary;
  recentValidations: ComplianceValidationResult[];
  trends: ComplianceTrendPoint[];
  topRecommendations: ComplianceRecommendation[];
  categoryBreakdown: CategoryComplianceScore[];
  packBreakdown: PackComplianceBreakdown[];
}

/**
 * Create or update rule request
 */
export interface UpsertRuleRequest {
  packId: string;
  categoryId: string;
  code: string;
  name: string;
  description: string;
  rationale: string;
  validationType: RuleValidationType;
  severity: RuleSeverity;
  weight: number;
  isActive: boolean;
  isRequired: boolean;
  applicableDocTypes: string[];
  validationConfig: RuleValidationConfig;
  remediationGuidance: RemediationGuidance;
  standardsReference: StandardsReference;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Compliance validation engine interface
 */
export interface IComplianceValidationEngine {
  validateDocument(request: ValidateComplianceRequest): Promise<ValidateComplianceResponse>;
  validateRule(documentContent: string, rule: ComplianceRule): Promise<RuleValidationResult>;
  calculateCategoryScore(results: RuleValidationResult[], category: StandardsCategory): CategoryComplianceScore;
  calculateOverallScore(categoryScores: CategoryComplianceScore[]): number;
}

/**
 * Compliance recommendations engine interface
 */
export interface IComplianceRecommendationsEngine {
  generateRecommendations(validationResult: ComplianceValidationResult): Promise<ComplianceRecommendation[]>;
  prioritizeRecommendations(recommendations: ComplianceRecommendation[]): ComplianceRecommendation[];
  estimateImpact(recommendation: ComplianceRecommendation): number;
}

/**
 * Compliance audit service interface
 */
export interface IComplianceAuditService {
  logEvent(entry: Omit<ComplianceAuditEntry, 'id' | 'timestamp'>): Promise<ComplianceAuditEntry>;
  getAuditTrail(documentId: string, limit?: number): Promise<ComplianceAuditEntry[]>;
  getValidationHistory(documentId: string): Promise<ComplianceValidationResult[]>;
}

/**
 * Standards pack repository interface
 */
export interface IStandardsPackRepository {
  getPack(packId: string): Promise<StandardsPack | null>;
  getPackByType(packType: StandardsPackType): Promise<StandardsPack | null>;
  getActivePacks(): Promise<StandardsPack[]>;
  getRulesByPack(packId: string): Promise<ComplianceRule[]>;
  getRulesByCategory(categoryId: string): Promise<ComplianceRule[]>;
  upsertRule(request: UpsertRuleRequest): Promise<ComplianceRule>;
}
