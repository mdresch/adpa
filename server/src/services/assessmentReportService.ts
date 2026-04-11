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

