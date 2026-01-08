;(async function(){ try{ await (require('../lib/db')).initDb() } catch(e){} })();
/**
 * Portfolio Assessment Service
 * 
 * Aggregates quality audit data across project documents to generate
 * comprehensive portfolio maturity assessments and gap analysis.
 * 
 * Part of Client Onboarding Assessment system
 * 
 * @module portfolioAssessmentService
 */

const db = require('../lib/db');
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { aiRecommendationsService } from './aiRecommendationsService';
import type { AIRecommendation, GeneratedRecommendations } from './aiRecommendationsService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PortfolioMetrics {
  total_documents: number;
  avg_quality_score: number;
  avg_grade: string;
  maturity_level: number;
  maturity_label: string;
  industry_benchmark?: number;
  gap_percentage?: number;
}

export interface AssessmentBreakdown {
  by_framework: Record<string, FrameworkMetrics>;
  by_document_type: Record<string, DocumentTypeMetrics>;
  by_quality_grade: Record<string, number>;
  quality_distribution: Record<string, number>;
}

export interface FrameworkMetrics {
  avg_score: number;
  count: number;
  grade: string;
  compliance_percentage: number;
}

export interface DocumentTypeMetrics {
  avg_score: number;
  count: number;
  grade: string;
  highest_score: number;
  lowest_score: number;
}

export interface GapAnalysis {
  critical_gaps: Gap[];
  high_priority_gaps: Gap[];
  medium_priority_gaps: Gap[];
  improvement_opportunities: ImprovementOpportunity[];
  all_gaps?: Gap[];
  all_recommendations?: string[];
}

export interface Gap {
  document_type: string;
  avg_score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  count: number;
  recommendation: string;
  estimated_improvement_points: number;
  document_title?: string;
  issue_category?: string;
}

export interface ImprovementOpportunity {
  category: string;
  description: string;
  affected_documents: number;
  potential_score_increase: number;
  effort_level: 'low' | 'medium' | 'high';
  priority: number;
}

export interface PortfolioAssessmentResult {
  portfolio_summary: PortfolioMetrics;
  breakdown: AssessmentBreakdown;
  gap_analysis: GapAnalysis;
  top_documents: TopDocument[];
  roi_calculation?: ROICalculation;
  ai_recommendations?: GeneratedRecommendations;
}

export interface TopDocument {
  document_id: string;
  title: string;
  score: number;
  grade: string;
  type: string;
}

export interface ROICalculation {
  estimated_hours_saved: number;
  estimated_cost_savings: number;
  potential_improvement_value: number;
  payback_period_months: number;
}

// ============================================================================
// SETUP
// ============================================================================

// Use shared pool from connection (has correct SSL configuration)
import { pool } from '../database/connection';

// ============================================================================
// MAIN ASSESSMENT FUNCTION
// ============================================================================

/**
 * Generate comprehensive portfolio assessment for a project
 */
export async function assessProjectPortfolio(
  projectId: string,
  industryVertical?: string,
  assessedBy?: string
): Promise<PortfolioAssessmentResult> {
  logger.info('Generating portfolio assessment', {
    projectId,
    industryVertical
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Gather quality audit data
    const auditData = await gatherAuditData(client, projectId);

    if (auditData.length === 0) {
      throw new Error('No quality audit data found for project. Please ensure documents have been audited.');
    }

    // Step 2: Calculate portfolio metrics
    const portfolioMetrics = calculatePortfolioMetrics(auditData);

    // Step 3: Generate breakdown by framework and document type
    const breakdown = generateBreakdown(auditData);

    // Step 4: Get industry benchmark (optional - skip if table doesn't exist)
    if (industryVertical) {
      try {
        const benchmark = await getIndustryBenchmark(client, industryVertical);
        if (benchmark) {
          portfolioMetrics.industry_benchmark = benchmark.avg_quality_score;
          portfolioMetrics.gap_percentage = portfolioMetrics.avg_quality_score - benchmark.avg_quality_score;
        }
      } catch (benchmarkError: any) {
        // Industry benchmarks table may not exist yet - skip gracefully
        logger.warn('Industry benchmark lookup failed (table may not exist), skipping', {
          error: benchmarkError.message
        });
      }
    }

    // Step 5: Perform gap analysis
    const gapAnalysis = performGapAnalysis(auditData, breakdown, portfolioMetrics);

    // Step 6: Identify top performing documents
    const topDocuments = identifyTopDocuments(auditData, 5);

    // Step 7: Calculate ROI
    const roiCalculation = calculateROI(portfolioMetrics, auditData.length);

    // Step 7.5: Generate AI-powered recommendations
    let aiRecommendations: GeneratedRecommendations | undefined;
    try {
      logger.info('Generating AI recommendations for portfolio');
      const allGaps = [
        ...gapAnalysis.critical_gaps,
        ...gapAnalysis.high_priority_gaps,
        ...gapAnalysis.medium_priority_gaps
      ];
      aiRecommendations = await aiRecommendationsService.generateRecommendations(
        allGaps,
        portfolioMetrics,
        auditData
      );
      logger.info('AI recommendations generated successfully', {
        criticalCount: aiRecommendations.critical_actions.length,
        highCount: aiRecommendations.high_priority_actions.length,
        quickWinsCount: aiRecommendations.quick_wins.length
      });
    } catch (recError: any) {
      logger.warn('Failed to generate AI recommendations, continuing without them', {
        error: recError.message
      });
      // Continue without recommendations rather than failing entire assessment
    }

    // Step 8: Save assessment to database (ONLY if portfolio_assessments table exists)
    // For onboarding flow, we skip this and just return calculated metrics
    let assessmentId: string | null = null;
    
    try {
      // Check if portfolio_assessments table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'portfolio_assessments'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        assessmentId = await saveAssessment(client, {
          projectId,
          portfolioMetrics,
          breakdown,
          gapAnalysis,
          topDocuments,
          roiCalculation,
          industryVertical,
          assessedBy
        });
      } else {
        logger.info('portfolio_assessments table does not exist, skipping save (using assessments table instead)');
      }
    } catch (saveError: any) {
      logger.warn('Failed to save to portfolio_assessments table, continuing with calculated metrics', {
        error: saveError.message
      });
    }

    await client.query('COMMIT');

    logger.info('Portfolio assessment completed', {
      assessmentId: assessmentId || 'not-saved',
      projectId,
      totalDocuments: auditData.length,
      avgScore: portfolioMetrics.avg_quality_score,
      maturityLevel: portfolioMetrics.maturity_level
    });

    return {
      portfolio_summary: portfolioMetrics,
      breakdown,
      gap_analysis: gapAnalysis,
      top_documents: topDocuments,
      roi_calculation: roiCalculation,
      ai_recommendations: aiRecommendations
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Portfolio assessment failed', {
      projectId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// DATA GATHERING
// ============================================================================

/**
 * Gather quality audit data for all project documents
 */
async function gatherAuditData(client: any, projectId: string): Promise<any[]> {
  const query = `
    SELECT 
      qa.id as audit_id,
      qa.document_id,
      qa.overall_score,
      qa.overall_grade as grade,
      qa.quality_level,
      qa.standards_compliance_score as compliance_score,
      qa.completeness_score,
      qa.consistency_score,
      qa.professional_quality_score,
      qa.accuracy_score,
      qa.context_relevance_score,
      qa.findings,
      qa.issues,
      qa.issues as gaps_identified,
      qa.recommendations,
      COALESCE(qa.ai_provider, d.framework) as framework_used,
      COALESCE(d.title, d.name) as document_title,
      COALESCE(d.framework, d.template_category, 'General') as document_type,
      COALESCE(d.source, 'Manual Upload') as document_source,
      d.created_at as document_created_at
    FROM quality_audits qa
    JOIN documents d ON d.id = qa.document_id
    WHERE d.project_id = $1
    ORDER BY qa.overall_score DESC
  `;

  const result = await client.query(query, [projectId]);
  return result.rows;
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Calculate overall portfolio metrics
 */
function calculatePortfolioMetrics(auditData: any[]): PortfolioMetrics {
  const totalDocs = auditData.length;
  const avgScore = auditData.reduce((sum, audit) => sum + audit.overall_score, 0) / totalDocs;

  // Calculate grade distribution
  const grades = auditData.map(a => a.grade);
  const avgGrade = calculateAverageGrade(grades);

  // Calculate maturity level
  const maturityLevel = calculateMaturityLevel(avgScore, auditData);
  const maturityLabel = getMaturityLabel(maturityLevel);

  return {
    total_documents: totalDocs,
    avg_quality_score: Math.round(avgScore * 100) / 100,
    avg_grade: avgGrade,
    maturity_level: maturityLevel,
    maturity_label: maturityLabel
  };
}

/**
 * Calculate maturity level (1-5 scale)
 */
function calculateMaturityLevel(avgScore: number, auditData: any[]): number {
  // Extract framework compliance data
  const frameworkScores = auditData
    .map(audit => audit.compliance_score)
    .filter(score => score !== null);

  const avgCompliance = frameworkScores.length > 0
    ? frameworkScores.reduce((sum, score) => sum + score, 0) / frameworkScores.length
    : 0;

  // Maturity Level 5: Optimized (95%+ quality, 90%+ compliance)
  if (avgScore >= 95 && avgCompliance >= 90) {
    return 5;
  }

  // Maturity Level 4: Managed (85%+ quality, 80%+ compliance)
  if (avgScore >= 85 && avgCompliance >= 80) {
    return 4;
  }

  // Maturity Level 3: Defined (75%+ quality, 70%+ compliance)
  if (avgScore >= 75 && avgCompliance >= 70) {
    return 3;
  }

  // Maturity Level 2: Developing (60%+ quality, some standards followed)
  if (avgScore >= 60 && avgCompliance >= 50) {
    return 2;
  }

  // Maturity Level 1: Ad-hoc (<60% quality)
  return 1;
}

/**
 * Get maturity level label
 */
function getMaturityLabel(level: number): string {
  const labels: Record<number, string> = {
    1: 'Ad-hoc',
    2: 'Developing',
    3: 'Defined',
    4: 'Managed',
    5: 'Optimized'
  };

  return labels[level] || 'Unknown';
}

/**
 * Calculate average grade from grade distribution
 */
function calculateAverageGrade(grades: string[]): string {
  const gradePoints: Record<string, number> = {
    'A+': 4.3, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D': 1.0, 'F': 0.0
  };

  const avgPoints = grades.reduce((sum, grade) => sum + (gradePoints[grade] || 0), 0) / grades.length;

  // Convert back to grade
  if (avgPoints >= 4.15) return 'A+';
  if (avgPoints >= 3.85) return 'A';
  if (avgPoints >= 3.50) return 'A-';
  if (avgPoints >= 3.15) return 'B+';
  if (avgPoints >= 2.85) return 'B';
  if (avgPoints >= 2.50) return 'B-';
  if (avgPoints >= 2.15) return 'C+';
  if (avgPoints >= 1.85) return 'C';
  if (avgPoints >= 1.50) return 'C-';
  if (avgPoints >= 0.50) return 'D';
  return 'F';
}

// ============================================================================
// BREAKDOWN GENERATION
// ============================================================================

/**
 * Generate assessment breakdown by framework and document type
 */
function generateBreakdown(auditData: any[]): AssessmentBreakdown {
  const byFramework: Record<string, FrameworkMetrics> = {};
  const byDocumentType: Record<string, DocumentTypeMetrics> = {};
  const byGrade: Record<string, number> = {};
  const qualityDistribution: Record<string, number> = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '0-59': 0
  };

  for (const audit of auditData) {
    // By framework
    const framework = audit.framework_used || 'Unknown';
    if (!byFramework[framework]) {
      byFramework[framework] = {
        avg_score: 0,
        count: 0,
        grade: '',
        compliance_percentage: 0
      };
    }
    byFramework[framework].avg_score += audit.overall_score;
    byFramework[framework].count += 1;
    byFramework[framework].compliance_percentage += audit.compliance_score || 0;

    // By document type
    const docType = audit.document_type || 'Unknown';
    if (!byDocumentType[docType]) {
      byDocumentType[docType] = {
        avg_score: 0,
        count: 0,
        grade: '',
        highest_score: 0,
        lowest_score: 100
      };
    }
    byDocumentType[docType].avg_score += audit.overall_score;
    byDocumentType[docType].count += 1;
    byDocumentType[docType].highest_score = Math.max(byDocumentType[docType].highest_score, audit.overall_score);
    byDocumentType[docType].lowest_score = Math.min(byDocumentType[docType].lowest_score, audit.overall_score);

    // By grade
    byGrade[audit.grade] = (byGrade[audit.grade] || 0) + 1;

    // Quality distribution
    if (audit.overall_score >= 90) qualityDistribution['90-100']++;
    else if (audit.overall_score >= 80) qualityDistribution['80-89']++;
    else if (audit.overall_score >= 70) qualityDistribution['70-79']++;
    else if (audit.overall_score >= 60) qualityDistribution['60-69']++;
    else qualityDistribution['0-59']++;
  }

  // Calculate averages
  for (const framework in byFramework) {
    const metrics = byFramework[framework];
    metrics.avg_score = Math.round((metrics.avg_score / metrics.count) * 100) / 100;
    metrics.compliance_percentage = Math.round((metrics.compliance_percentage / metrics.count) * 100) / 100;
    metrics.grade = scoreToGrade(metrics.avg_score);
  }

  for (const docType in byDocumentType) {
    const metrics = byDocumentType[docType];
    metrics.avg_score = Math.round((metrics.avg_score / metrics.count) * 100) / 100;
    metrics.grade = scoreToGrade(metrics.avg_score);
  }

  return {
    by_framework: byFramework,
    by_document_type: byDocumentType,
    by_quality_grade: byGrade,
    quality_distribution: qualityDistribution
  };
}

/**
 * Convert numeric score to letter grade
 */
function scoreToGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

// ============================================================================
// GAP ANALYSIS
// ============================================================================

/**
 * Perform gap analysis to identify improvement areas
 */
function performGapAnalysis(
  auditData: any[],
  breakdown: AssessmentBreakdown,
  metrics: PortfolioMetrics
): GapAnalysis {
  const critical_gaps: Gap[] = [];
  const high_priority_gaps: Gap[] = [];
  const medium_priority_gaps: Gap[] = [];
  const improvement_opportunities: ImprovementOpportunity[] = [];

  // Analyze gaps by document type
  for (const [docType, typeMetrics] of Object.entries(breakdown.by_document_type)) {
    // Find common quality issues for this document type
    const docTypeAudits = auditData.filter(audit => 
      (audit.document_type || audit.framework_used || 'General') === docType
    );
    
    // Calculate average scores for quality dimensions
    const avgCompleteness = docTypeAudits.length > 0 
      ? docTypeAudits.reduce((sum, a) => sum + (a.completeness_score || 0), 0) / docTypeAudits.length 
      : 0;
    const avgCompliance = docTypeAudits.length > 0
      ? docTypeAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / docTypeAudits.length
      : 0;
    const avgConsistency = docTypeAudits.length > 0
      ? docTypeAudits.reduce((sum, a) => sum + (a.consistency_score || 0), 0) / docTypeAudits.length
      : 0;
    
    // Identify specific improvement areas
    const improvementAreas: string[] = [];
    if (avgCompleteness < 70) improvementAreas.push('completeness');
    if (avgCompliance < 70) improvementAreas.push('framework compliance');
    if (avgConsistency < 70) improvementAreas.push('consistency');
    if (typeMetrics.avg_score < 60) improvementAreas.push('overall structure and content quality');
    
    const areasText = improvementAreas.length > 0 
      ? improvementAreas.join(', ')
      : 'quality standards';
    
    if (typeMetrics.avg_score < 60) {
      // Critical gap
      critical_gaps.push({
        document_type: docType,
        avg_score: typeMetrics.avg_score,
        severity: 'critical',
        count: typeMetrics.count,
        recommendation: `Your current "${docType}" documents (${typeMetrics.count} document${typeMetrics.count > 1 ? 's' : ''}) scored ${typeMetrics.avg_score.toFixed(1)}% on average, indicating critical quality gaps in ${areasText}. This is an excellent opportunity to use ADPA's AI-powered document generation system with industry-standard templates. We recommend using ADPA templates to enhance these documents, followed by AI evaluation to identify and address specific improvement areas. This will help bring your documentation up to professional standards and improve your overall portfolio maturity.`,
        estimated_improvement_points: 80 - typeMetrics.avg_score
      });
    } else if (typeMetrics.avg_score < 75) {
      // High priority gap
      high_priority_gaps.push({
        document_type: docType,
        avg_score: typeMetrics.avg_score,
        severity: 'high',
        count: typeMetrics.count,
        recommendation: `Your "${docType}" documents (${typeMetrics.count} document${typeMetrics.count > 1 ? 's' : ''}) currently average ${typeMetrics.avg_score.toFixed(1)}% quality, with notable gaps in ${areasText}. We recommend using ADPA's template library and AI evaluation tools to systematically improve these documents. The system can help identify missing sections, enhance framework compliance, and ensure consistency across your documentation.`,
        estimated_improvement_points: 85 - typeMetrics.avg_score
      });
    } else if (typeMetrics.avg_score < 85) {
      // Medium priority gap
      medium_priority_gaps.push({
        document_type: docType,
        avg_score: typeMetrics.avg_score,
        severity: 'medium',
        count: typeMetrics.count,
        recommendation: `Your "${docType}" documents (${typeMetrics.count} document${typeMetrics.count > 1 ? 's' : ''}) are performing well at ${typeMetrics.avg_score.toFixed(1)}% but can be enhanced further. Consider using ADPA's advanced templates and AI evaluation to enrich content with more detail, examples, and best practices. This will help elevate your documentation to excellence and maximize your portfolio maturity score.`,
        estimated_improvement_points: 90 - typeMetrics.avg_score
      });
    }
  }

  // Generate improvement opportunities
  improvement_opportunities.push(...generateImprovementOpportunities(auditData, metrics));

  // Sort by priority
  critical_gaps.sort((a, b) => b.estimated_improvement_points - a.estimated_improvement_points);
  high_priority_gaps.sort((a, b) => b.estimated_improvement_points - a.estimated_improvement_points);

  // Extract all issues from quality audits as gaps
  const documentIssues: Gap[] = [];
  const allRecommendations: string[] = [];
  const seenIssues = new Set<string>();
  const seenRecommendations = new Set<string>();

  for (const audit of auditData) {
    // Parse issues if it's a string (JSONB)
    let issues = audit.gaps_identified || audit.issues;
    if (typeof issues === 'string') {
      try {
        issues = JSON.parse(issues);
      } catch (e) {
        issues = [];
      }
    }
    
    // Extract issues
    if (issues && Array.isArray(issues)) {
      for (const issue of issues) {
        const issueDesc = issue.description || issue.message || (typeof issue === 'string' ? issue : JSON.stringify(issue));
        const issueKey = `${issue.category || issue.type || 'Unknown'}:${issueDesc}`;
        if (!seenIssues.has(issueKey)) {
          seenIssues.add(issueKey);
          documentIssues.push({
            document_type: audit.document_type || 'Unknown',
            avg_score: audit.overall_score || 0,
            severity: issue.severity || issue.priority || (audit.overall_score < 60 ? 'critical' : audit.overall_score < 75 ? 'high' : 'medium'),
            count: 1,
            recommendation: issueDesc,
            estimated_improvement_points: issue.impact || 5,
            document_title: audit.document_title,
            issue_category: issue.category || issue.type || 'General'
          });
        }
      }
    }

    // Parse recommendations if it's a string (JSONB)
    let recommendations = audit.recommendations;
    if (typeof recommendations === 'string') {
      try {
        recommendations = JSON.parse(recommendations);
      } catch (e) {
        recommendations = [];
      }
    }

    // Extract recommendations
    if (recommendations && Array.isArray(recommendations)) {
      for (const rec of recommendations) {
        const recKey = typeof rec === 'string' ? rec : JSON.stringify(rec);
        if (!seenRecommendations.has(recKey)) {
          seenRecommendations.add(recKey);
          allRecommendations.push(recKey);
        }
      }
    }
  }

  // Combine document type gaps with individual document issues
  const allGaps = [
    ...critical_gaps,
    ...high_priority_gaps,
    ...medium_priority_gaps,
    ...documentIssues
  ];

  // Sort all gaps by severity and score
  allGaps.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aOrder = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
    const bOrder = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.avg_score - a.avg_score;
  });

  return {
    critical_gaps: critical_gaps.slice(0, 10),
    high_priority_gaps: high_priority_gaps.slice(0, 10),
    medium_priority_gaps: medium_priority_gaps.slice(0, 10),
    improvement_opportunities: improvement_opportunities.slice(0, 15),
    all_gaps: allGaps,
    all_recommendations: allRecommendations
  };
}

/**
 * Generate specific improvement opportunities
 */
function generateImprovementOpportunities(
  auditData: any[],
  metrics: PortfolioMetrics
): ImprovementOpportunity[] {
  const opportunities: ImprovementOpportunity[] = [];

  // Analyze common gaps across all documents
  const allGaps: Record<string, number> = {};
  
  for (const audit of auditData) {
    if (audit.gaps_identified && Array.isArray(audit.gaps_identified)) {
      for (const gap of audit.gaps_identified) {
        const gapKey = gap.category || gap.description || 'Unknown';
        allGaps[gapKey] = (allGaps[gapKey] || 0) + 1;
      }
    }
  }

  // Convert to opportunities
  for (const [category, count] of Object.entries(allGaps)) {
    if (count >= 3) { // Appears in 3+ documents
      opportunities.push({
        category,
        description: `Address "${category}" gap affecting multiple documents`,
        affected_documents: count,
        potential_score_increase: Math.min(count * 2, 15),
        effort_level: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
        priority: count
      });
    }
  }

  return opportunities.sort((a, b) => b.priority - a.priority);
}

// ============================================================================
// TOP DOCUMENTS
// ============================================================================

/**
 * Identify top performing documents
 */
function identifyTopDocuments(auditData: any[], limit: number): TopDocument[] {
  return auditData
    .slice(0, limit) // Already sorted by score DESC in query
    .map(audit => ({
      document_id: audit.document_id,
      title: audit.document_title,
      score: audit.overall_score,
      grade: audit.grade,
      type: audit.document_type || 'Unknown'
    }));
}

// ============================================================================
// ROI CALCULATION
// ============================================================================

/**
 * Calculate ROI for ADPA implementation
 */
function calculateROI(metrics: PortfolioMetrics, documentCount: number): ROICalculation {
  // Assumptions
  const manualDocCreationHours = 8; // Hours to create document manually
  const manualReviewHours = 2; // Hours to review/improve document
  const hourlyRate = 75; // Average consultant hourly rate

  // Calculate hours saved
  const hoursPerDoc = manualDocCreationHours + manualReviewHours;
  const estimatedHoursSaved = documentCount * hoursPerDoc * 0.7; // 70% time savings

  // Calculate cost savings
  const estimatedCostSavings = estimatedHoursSaved * hourlyRate;

  // Calculate improvement value (based on quality improvement potential)
  const qualityGap = 90 - metrics.avg_quality_score; // Gap to excellence
  const improvementValue = (qualityGap / 100) * estimatedCostSavings * 0.5;

  // Payback period (assuming $10k ADPA license)
  const licenseCost = 10000;
  const paybackMonths = Math.ceil((licenseCost / estimatedCostSavings) * 12);

  return {
    estimated_hours_saved: Math.round(estimatedHoursSaved),
    estimated_cost_savings: Math.round(estimatedCostSavings),
    potential_improvement_value: Math.round(improvementValue),
    payback_period_months: Math.max(1, paybackMonths)
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get industry benchmark
 */
async function getIndustryBenchmark(client: any, industryVertical: string): Promise<any | null> {
  const query = `
    SELECT * FROM industry_benchmarks
    WHERE industry_vertical = $1 AND document_type IS NULL AND framework IS NULL
    ORDER BY last_updated DESC
    LIMIT 1
  `;

  const result = await client.query(query, [industryVertical]);
  return result.rows[0] || null;
}

/**
 * Save assessment to database
 */
async function saveAssessment(client: any, data: any): Promise<string> {
  const assessmentId = uuidv4();

  const query = `
    INSERT INTO portfolio_assessments (
      id, project_id, assessment_date,
      total_documents, avg_quality_score, avg_grade,
      maturity_level, maturity_label,
      industry_benchmark, industry_vertical, gap_percentage,
      by_framework, by_document_type, by_quality_grade, quality_distribution,
      critical_gaps, high_priority_gaps, medium_priority_gaps, improvement_opportunities,
      top_documents,
      estimated_hours_saved, estimated_cost_savings, potential_improvement_value,
      assessed_by
    ) VALUES (
      $1, $2, NOW(),
      $3, $4, $5,
      $6, $7,
      $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, $17, $18,
      $19,
      $20, $21, $22,
      $23
    )
    RETURNING id
  `;

  const values = [
    assessmentId,
    data.projectId,
    data.portfolioMetrics.total_documents,
    data.portfolioMetrics.avg_quality_score,
    data.portfolioMetrics.avg_grade,
    data.portfolioMetrics.maturity_level,
    data.portfolioMetrics.maturity_label,
    data.portfolioMetrics.industry_benchmark || null,
    data.industryVertical || null,
    data.portfolioMetrics.gap_percentage || null,
    JSON.stringify(data.breakdown.by_framework),
    JSON.stringify(data.breakdown.by_document_type),
    JSON.stringify(data.breakdown.by_quality_grade),
    JSON.stringify(data.breakdown.quality_distribution),
    JSON.stringify(data.gapAnalysis.critical_gaps),
    JSON.stringify(data.gapAnalysis.high_priority_gaps),
    JSON.stringify(data.gapAnalysis.medium_priority_gaps),
    JSON.stringify(data.gapAnalysis.improvement_opportunities),
    JSON.stringify(data.topDocuments),
    data.roiCalculation?.estimated_hours_saved || null,
    data.roiCalculation?.estimated_cost_savings || null,
    data.roiCalculation?.potential_improvement_value || null,
    data.assessedBy || null
  ];

  await client.query(query, values);
  return assessmentId;
}

// ============================================================================
// ASSESSMENT RETRIEVAL
// ============================================================================

/**
 * Get assessment by ID
 */
async function getAssessment(assessmentId: string, userId: string): Promise<any> {
  const query = `
    SELECT * FROM assessments
    WHERE id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  const result = await db.query(query, [assessmentId]);
  return result.rows[0] || null;
}

/**
 * Get assessment by batch ID
 */
async function getAssessmentByBatchId(batchId: string, userId: string): Promise<any> {
  // Fetch assessment where the assessments.batch_id matches the provided upload batch id.
  // Previous implementation joined on project_id which could return no rows when an assessment
  // is stored against a specific batch_id. Use a direct lookup by batch_id for correctness.
  const query = `
    SELECT a.* FROM assessments a
    WHERE a.batch_id = $1
    ORDER BY a.created_at DESC
    LIMIT 1
  `;
  
  const result = await db.query(query, [batchId]);
  return result.rows[0] || null;
}

/**
 * Generate new assessment
 */
async function generateAssessment(projectId: string, userId: string): Promise<any> {
  // Call assessProjectPortfolio with the industryVertical string parameter.
  return await assessProjectPortfolio(projectId, 'technology', userId);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const portfolioAssessmentService = {
  assessProjectPortfolio,
  calculateMaturityLevel,
  getMaturityLabel,
  getAssessment,
  getAssessmentByBatchId,
  generateAssessment
};

