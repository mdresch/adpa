/**
 * Assessment Report Service
 * 
 * Generates comprehensive PDF reports for portfolio maturity assessments.
 * Includes maturity scores, gap analysis, recommendations, and industry benchmarks.
 */

import { logger } from '../utils/logger';
import { unifiedPdfService } from './pdfService';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { DocxService } from './docxService';

const readFile = promisify(fs.readFile);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AssessmentReportData {
  // Project Information
  projectId: string;
  projectName: string;
  organizationName: string;
  assessmentDate: Date;
  assessmentId: string;
  
  // Assessment Summary
  overallMaturityLevel: number;
  overallMaturityLabel: string;
  totalDocuments: number;
  averageQualityScore: number;
  
  // Document Breakdown
  documentsByType: {
    type: string;
    count: number;
    avgScore: number;
    status: string;
  }[];
  
  // Maturity Distribution
  maturityDistribution: {
    level: number;
    label: string;
    percentage: number;
    documentCount: number;
  }[];
  
  // Gap Analysis
  gaps: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    documentType: string;
    currentLevel: number;
    targetLevel: number;
    description: string;
    recommendations: string[];
    estimatedEffort: string;
  }[];
  
  // Recommendations
  recommendations: {
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
  }[];
  
  // Industry Benchmarks
  benchmarks: {
    industryAverage: number;
    topPerformers: number;
    yourScore: number;
    percentile: number;
  };
  
  // ROI Metrics
  roiMetrics: {
    currentCost: number;
    improvedCost: number;
    savings: number;
    roi: number;
    paybackPeriod: string;
  };
  
  // Metadata
  generatedBy: string;
  reportVersion: string;
}

export interface ReportGenerationOptions {
  format?: 'pdf' | 'html';
  includeCharts?: boolean;
  includeRecommendations?: boolean;
  includeBenchmarks?: boolean;
  customBranding?: {
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate assessment report (PDF or HTML)
 */
export async function generateAssessmentReport(
  data: AssessmentReportData,
  options: ReportGenerationOptions = {}
): Promise<{ buffer: Buffer; mimeType: string }> {
  
  logger.info('Generating assessment report', {
    assessmentId: data.assessmentId,
    format: options.format || 'pdf'
  });

  try {
    // Generate HTML from template
    const html = await generateReportHTML(data, options);
    
    // Convert to PDF if requested
    if (options.format === 'pdf' || !options.format) {
      const pdfBuffer = await convertHTMLToPDF(html);
      return {
        buffer: pdfBuffer,
        mimeType: 'application/pdf'
      };
    }
    
    // Return HTML
    return {
      buffer: Buffer.from(html, 'utf-8'),
      mimeType: 'text/html'
    };
    
  } catch (error: any) {
    logger.error('Failed to generate assessment report', {
      error: error.message,
      assessmentId: data.assessmentId
    });
    throw error;
  }
}

/**
 * Generate HTML report from template
 */
async function generateReportHTML(
  data: AssessmentReportData,
  options: ReportGenerationOptions
): Promise<string> {
  
  // Load Handlebars template
  const templatePath = path.join(__dirname, '../templates/assessment-report.hbs');
  const templateSource = await readFile(templatePath, 'utf-8');
  
  // Register Handlebars helpers
  registerHandlebarsHelpers();
  
  // Compile template
  const template = Handlebars.compile(templateSource);
  
  // Prepare data with calculated fields
  const enhancedData = enhanceReportData(data, options);
  
  // Generate HTML
  const html = template(enhancedData);
  
  return html;
}

/**
 * Convert HTML to PDF using the centralized UnifiedPdfService
 */
async function convertHTMLToPDF(html: string): Promise<Buffer> {
  return unifiedPdfService.generateFromHtml(html, {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });
}

// ============================================================================
// DATA ENHANCEMENT
// ============================================================================

/**
 * Enhance report data with calculated fields
 */
function enhanceReportData(
  data: AssessmentReportData,
  options: ReportGenerationOptions
): any {
  
  return {
    ...data,
    
    // Format dates
    assessmentDateFormatted: formatDate(data.assessmentDate),
    
    // Maturity level description
    maturityDescription: getMaturityDescription(data.overallMaturityLevel),
    
    // Progress indicators
    progressPercentage: (data.overallMaturityLevel / 5) * 100,
    
    // Gap statistics
    gapStats: calculateGapStats(data.gaps),
    
    // Priority breakdown
    priorityBreakdown: calculatePriorityBreakdown(data.gaps),
    
    // Chart data (if requested)
    charts: options.includeCharts ? generateChartData(data) : null,
    
    // Options
    options,
    
    // Generated timestamp
    generatedAt: new Date().toISOString()
  };
}

/**
 * Calculate gap statistics
 */
function calculateGapStats(gaps: AssessmentReportData['gaps']) {
  return {
    total: gaps.length,
    critical: gaps.filter(g => g.priority === 'critical').length,
    high: gaps.filter(g => g.priority === 'high').length,
    medium: gaps.filter(g => g.priority === 'medium').length,
    low: gaps.filter(g => g.priority === 'low').length
  };
}

/**
 * Calculate priority breakdown
 */
function calculatePriorityBreakdown(gaps: AssessmentReportData['gaps']) {
  const total = gaps.length;
  return {
    critical: { count: gaps.filter(g => g.priority === 'critical').length, percentage: 0 },
    high: { count: gaps.filter(g => g.priority === 'high').length, percentage: 0 },
    medium: { count: gaps.filter(g => g.priority === 'medium').length, percentage: 0 },
    low: { count: gaps.filter(g => g.priority === 'low').length, percentage: 0 }
  };
}

/**
 * Generate chart data for visualizations
 */
function generateChartData(data: AssessmentReportData) {
  return {
    maturityDistribution: {
      labels: data.maturityDistribution.map(m => m.label),
      data: data.maturityDistribution.map(m => m.percentage)
    },
    documentTypes: {
      labels: data.documentsByType.map(d => d.type),
      scores: data.documentsByType.map(d => d.avgScore)
    },
    benchmarkComparison: {
      labels: ['Your Score', 'Industry Avg', 'Top Performers'],
      data: [
        data.benchmarks.yourScore,
        data.benchmarks.industryAverage,
        data.benchmarks.topPerformers
      ]
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Register Handlebars helpers
 */
function registerHandlebarsHelpers() {
  
  // Format number
  Handlebars.registerHelper('formatNumber', (num: number) => {
    return num.toFixed(1);
  });
  
  // Format currency
  Handlebars.registerHelper('formatCurrency', (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  });
  
  // Format percentage
  Handlebars.registerHelper('formatPercent', (num: number) => {
    return `${num.toFixed(1)}%`;
  });
  
  // Priority badge color
  Handlebars.registerHelper('priorityColor', (priority: string) => {
    const colors = {
      critical: '#DC2626',
      high: '#EA580C',
      medium: '#F59E0B',
      low: '#10B981'
    };
    return colors[priority as keyof typeof colors] || '#6B7280';
  });
  
  // Maturity level color
  Handlebars.registerHelper('maturityColor', (level: number) => {
    const colors = ['#DC2626', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];
    return colors[level - 1] || '#6B7280';
  });
  
  // Conditional helper
  Handlebars.registerHelper('ifEquals', function(arg1, arg2, options: any) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  });
}

/**
 * Get maturity level description
 */
function getMaturityDescription(level: number): string {
  const descriptions = {
    1: 'Ad-hoc: Processes are unpredictable, poorly controlled, and reactive.',
    2: 'Developing: Processes are documented but inconsistent in application.',
    3: 'Defined: Processes are well characterized and understood.',
    4: 'Managed: Processes are measured and controlled.',
    5: 'Optimized: Focus on continuous improvement through innovation.'
  };
  return descriptions[level as keyof typeof descriptions] || 'Unknown maturity level';
}

/**
 * Format date
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

// ============================================================================
// EXPORT FORMATS
// ============================================================================

/**
 * Export assessment data as CSV
 */
export function exportAssessmentCSV(data: AssessmentReportData): string {
  const rows = [
    ['Assessment Report - ' + data.projectName],
    [],
    ['Overall Maturity Level', data.overallMaturityLevel.toString()],
    ['Average Quality Score', data.averageQualityScore.toFixed(1)],
    ['Total Documents', data.totalDocuments.toString()],
    [],
    ['Document Type', 'Count', 'Average Score', 'Status'],
    ...data.documentsByType.map(d => [d.type, d.count.toString(), d.avgScore.toFixed(1), d.status]),
    [],
    ['Gap Analysis'],
    ['Priority', 'Document Type', 'Current Level', 'Target Level', 'Description'],
    ...data.gaps.map(g => [g.priority, g.documentType, g.currentLevel.toString(), g.targetLevel.toString(), g.description])
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Export assessment data as JSON
 */
export function exportAssessmentJSON(data: AssessmentReportData): string {
  return JSON.stringify(data, null, 2);
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const MATURITY_LABELS = ['Ad-hoc', 'Developing', 'Defined', 'Managed', 'Optimized'] as const;

function buildDefaultMaturityDistribution(
  overallLevel: number,
  totalDocuments: number
): AssessmentReportData['maturityDistribution'] {
  const level = Math.max(1, Math.min(5, Math.round(overallLevel || 1)));
  return [1, 2, 3, 4, 5].map((lvl) => ({
    level: lvl,
    label: MATURITY_LABELS[lvl - 1],
    percentage: totalDocuments > 0 && lvl === level ? 100 : 0,
    documentCount: totalDocuments > 0 && lvl === level ? totalDocuments : 0
  }));
}

/**
 * Map a DB assessment row (from getAssessmentForExport) into AssessmentReportData for PDF/CSV/JSON/DOCX.
 */
export function mapAssessmentRowToReportData(row: Record<string, any>): AssessmentReportData {
  const assessmentData = parseJsonField<Record<string, any>>(row.assessment_data, {});
  const gapAnalysis = assessmentData?.gap_analysis || {};
  const breakdown = assessmentData?.breakdown || {};

  const documentsByType: AssessmentReportData['documentsByType'] = breakdown.by_document_type
    ? Object.entries(breakdown.by_document_type).map(([type, data]: [string, any]) => ({
        type,
        count: data.count || 0,
        avgScore: typeof data.avg_score === 'number' ? data.avg_score : parseFloat(String(data.avg_score)) || 0,
        status: data.grade || 'Unknown'
      }))
    : [];

  const rawGaps = parseJsonField<any[]>(row.gaps, []);
  const gaps: AssessmentReportData['gaps'] = (Array.isArray(rawGaps) ? rawGaps : []).map((g: any) => {
    const avgScore = g.avg_score != null ? Number(g.avg_score) : 0;
    const calculatedCurrentLevel = Math.max(1, Math.min(5, Math.floor(avgScore / 20) + 1));
    const calculatedTargetLevel = Math.max(1, Math.min(5, calculatedCurrentLevel + 1));
    const priority = String(g.severity || g.priority || 'medium').toLowerCase() as
      | 'critical'
      | 'high'
      | 'medium'
      | 'low';
    return {
      priority: ['critical', 'high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      documentType: g.document_type || g.framework || 'General',
      currentLevel: calculatedCurrentLevel,
      targetLevel: calculatedTargetLevel,
      description: g.recommendation || g.description || 'No description available',
      recommendations: [],
      estimatedEffort: g.estimated_improvement_points ? `${g.estimated_improvement_points} pts` : 'Medium'
    };
  });

  const recommendations: AssessmentReportData['recommendations'] = [];
  const improvement = Array.isArray(gapAnalysis.improvement_opportunities) ? gapAnalysis.improvement_opportunities : [];
  for (const imp of improvement) {
    recommendations.push({
      category: imp.category || 'Improvement',
      priority: String(imp.priority ?? 'medium'),
      title: (imp.description || 'Improvement opportunity').slice(0, 120),
      description: imp.description || '',
      impact: 'Medium',
      effort: imp.effort_level || 'medium'
    });
  }
  const recStrings: string[] = Array.isArray(gapAnalysis.all_recommendations) ? gapAnalysis.all_recommendations : [];
  recStrings.forEach((desc, i) => {
    recommendations.push({
      category: 'Portfolio',
      priority: 'medium',
      title: `Recommendation ${i + 1}`,
      description: String(desc),
      impact: 'Medium',
      effort: 'Medium'
    });
  });

  const b = parseJsonField<Record<string, any>>(row.benchmarks, {});
  const benchmarks: AssessmentReportData['benchmarks'] = {
    industryAverage: Number(b.industryAverage) || 70,
    topPerformers: Number(b.topPerformers) || 90,
    yourScore: Number(b.yourScore) || parseFloat(String(row.avg_quality_score)) || 0,
    percentile: Number(b.percentile) || 50
  };

  const r = parseJsonField<Record<string, any>>(row.roi_metrics, {});
  const savings = Number(r.estimated_cost_savings ?? r.savings ?? r.potential_improvement_value) || 0;
  const roiPct =
    r.roi != null
      ? Number(r.roi)
      : savings > 0 && r.potential_improvement_value
        ? Math.min(999, (Number(r.potential_improvement_value) / savings) * 100)
        : 0;
  const roiMetrics: AssessmentReportData['roiMetrics'] = {
    currentCost: Number(r.currentCost ?? r.estimated_hours_saved) || 0,
    improvedCost: Number(r.improvedCost) || 0,
    savings,
    roi: roiPct,
    paybackPeriod:
      r.payback_period_months != null ? `${Math.round(Number(r.payback_period_months))} months` : 'N/A'
  };

  const assessmentDate = row.completed_at ? new Date(row.completed_at) : new Date(row.created_at);

  return {
    projectId: String(row.project_id),
    projectName: row.project_name || 'Project',
    organizationName: row.organization_display_name || row.project_name || 'Organization',
    assessmentDate,
    assessmentId: String(row.id),
    overallMaturityLevel: Math.max(1, Math.min(5, Number(row.overall_maturity_level) || 1)),
    overallMaturityLabel: row.maturity_label || 'Initial',
    totalDocuments: Number(row.total_documents) || 0,
    averageQualityScore: parseFloat(String(row.avg_quality_score)) || 0,
    documentsByType,
    maturityDistribution: buildDefaultMaturityDistribution(
      Number(row.overall_maturity_level) || 1,
      Number(row.total_documents) || 0
    ),
    gaps,
    recommendations,
    benchmarks,
    roiMetrics,
    generatedBy: 'ADPA',
    reportVersion: '1.0'
  };
}

function assessmentReportDataToMarkdown(data: AssessmentReportData): string {
  const lines: string[] = [];
  lines.push(`## Executive summary`);
  lines.push('');
  lines.push(
    `- **Maturity level:** ${data.overallMaturityLevel} — ${data.overallMaturityLabel}`
  );
  lines.push(`- **Average quality score:** ${data.averageQualityScore.toFixed(1)}`);
  lines.push(`- **Documents assessed:** ${data.totalDocuments}`);
  lines.push(`- **Gaps identified:** ${data.gaps.length}`);
  lines.push('');

  lines.push(`## Document breakdown`);
  lines.push('');
  lines.push('| Document type | Count | Avg score | Status |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const d of data.documentsByType) {
    lines.push(`| ${d.type} | ${d.count} | ${d.avgScore.toFixed(1)} | ${d.status} |`);
  }
  if (data.documentsByType.length === 0) {
    lines.push('_No document-type breakdown available._');
  }
  lines.push('');

  lines.push(`## Gap analysis`);
  lines.push('');
  for (const g of data.gaps) {
    lines.push(`### ${g.documentType} (${g.priority})`);
    lines.push('');
    lines.push(`- Current / target maturity: level ${g.currentLevel} → ${g.targetLevel}`);
    lines.push(`- **Description:** ${g.description}`);
    lines.push(`- **Estimated effort:** ${g.estimatedEffort}`);
    lines.push('');
  }
  if (data.gaps.length === 0) {
    lines.push('_No gaps recorded._');
    lines.push('');
  }

  lines.push(`## Recommendations`);
  lines.push('');
  for (const rec of data.recommendations) {
    lines.push(`### ${rec.title}`);
    lines.push('');
    lines.push(`${rec.description}`);
    lines.push('');
  }
  if (data.recommendations.length === 0) {
    lines.push('_No structured recommendations._');
    lines.push('');
  }

  lines.push(`## Benchmarks`);
  lines.push('');
  lines.push(`- **Your score:** ${data.benchmarks.yourScore.toFixed(1)}`);
  lines.push(`- **Industry average:** ${data.benchmarks.industryAverage.toFixed(1)}`);
  lines.push(`- **Top performers:** ${data.benchmarks.topPerformers.toFixed(1)}`);
  lines.push(`- **Percentile:** ${data.benchmarks.percentile}`);
  lines.push('');

  lines.push(`## ROI (indicative)`);
  lines.push('');
  lines.push(`- **Potential savings:** ${data.roiMetrics.savings}`);
  lines.push(`- **ROI:** ${data.roiMetrics.roi}%`);
  lines.push(`- **Payback:** ${data.roiMetrics.paybackPeriod}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate an editable Word (.docx) report from structured assessment data.
 */
export async function generateAssessmentReportDocx(data: AssessmentReportData): Promise<Buffer> {
  const markdown = assessmentReportDataToMarkdown(data);
  const title = `Portfolio maturity assessment — ${data.projectName}`;
  const metadata: Record<string, string> = {
    Organization: data.organizationName,
    Date: formatDate(data.assessmentDate),
    'Report ID': data.assessmentId
  };
  return DocxService.generateDocx(markdown, title, metadata);
}

