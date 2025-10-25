/**
 * Board Report Service
 * 
 * Service for generating AI-powered board reports using the 4 board templates:
 * 1. CEO Portfolio Report (2 pages)
 * 2. CFO Financial Report (3 pages)
 * 3. Audit Committee Report (2 pages)
 * 4. Program Details Report (5 pages)
 * 
 * Integrates with document generator and AI services for intelligent report creation.
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { aiService } from './aiService';
import Handlebars from 'handlebars';

export interface BoardReportRequest {
  templateId: 'board-ceo-portfolio-report' | 'board-cfo-financial-report' | 'board-audit-committee-report' | 'board-program-details-report';
  data: Record<string, any>;
  aiProvider?: string;
  useAI?: boolean; // If true, AI generates content; if false, uses template only
}

export interface BoardReportResponse {
  success: boolean;
  reportId?: string;
  content?: string;
  format: 'markdown';
  generatedAt: Date;
  templateUsed: string;
  aiGenerated: boolean;
  error?: string;
}

export class BoardReportService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate a board report from template and data
   */
  async generateReport(request: BoardReportRequest): Promise<BoardReportResponse> {
    try {
      logger.info('Generating board report', { 
        templateId: request.templateId,
        useAI: request.useAI 
      });

      // 1. Fetch the template from database
      const template = await this.getTemplate(request.templateId);
      if (!template) {
        throw new Error(`Template not found: ${request.templateId}`);
      }

      // 2. Validate required variables
      this.validateVariables(template, request.data);

      let reportContent: string;

      if (request.useAI) {
        // 3a. AI-powered generation
        reportContent = await this.generateWithAI(template, request.data, request.aiProvider);
      } else {
        // 3b. Template-based generation
        reportContent = await this.generateFromTemplate(template, request.data);
      }

      // 4. Update template usage count
      await this.incrementUsageCount(request.templateId);

      logger.info('Board report generated successfully', {
        templateId: request.templateId,
        contentLength: reportContent.length,
        aiGenerated: request.useAI || false
      });

      return {
        success: true,
        content: reportContent,
        format: 'markdown',
        generatedAt: new Date(),
        templateUsed: request.templateId,
        aiGenerated: request.useAI || false
      };

    } catch (error) {
      logger.error('Failed to generate board report', { error, request });
      return {
        success: false,
        format: 'markdown',
        generatedAt: new Date(),
        templateUsed: request.templateId,
        aiGenerated: request.useAI || false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get template from database
   */
  private async getTemplate(templateId: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM document_templates WHERE id = $1 AND deleted_at IS NULL',
      [templateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Validate that required variables are provided
   */
  private validateVariables(template: any, data: Record<string, any>): void {
    const variables = template.variables as any[];
    
    if (!variables || variables.length === 0) {
      return; // No validation needed if no variables defined
    }

    const missingRequired: string[] = [];

    for (const variable of variables) {
      if (variable.required && !(variable.name in data)) {
        missingRequired.push(variable.name);
      }
    }

    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required variables: ${missingRequired.join(', ')}`
      );
    }
  }

  /**
   * Generate report using AI with template as guidance
   */
  private async generateWithAI(
    template: any,
    data: Record<string, any>,
    aiProvider?: string
  ): Promise<string> {
    const systemPrompt = template.system_prompt || this.buildDefaultSystemPrompt(template);
    const userPrompt = this.buildUserPrompt(template, data);

    logger.debug('Generating board report with AI', {
      templateId: template.id,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      provider: aiProvider
    });

    // Use AI service to generate content
    const aiResponse = await aiService.generateText({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      provider: aiProvider || 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000
    });

    if (!aiResponse || !aiResponse.text) {
      throw new Error('AI service returned no content');
    }

    return aiResponse.text;
  }

  /**
   * Generate report from template using Handlebars
   */
  private async generateFromTemplate(
    template: any,
    data: Record<string, any>
  ): Promise<string> {
    const content = template.content;
    
    if (!content || !content.sections) {
      throw new Error('Template has no sections defined');
    }

    // Compile each section and concatenate
    const compiledSections: string[] = [];

    for (const section of content.sections) {
      try {
        const compiled = Handlebars.compile(section.content);
        const rendered = compiled(data);
        compiledSections.push(rendered);
      } catch (error) {
        logger.error('Error compiling template section', {
          sectionId: section.id,
          error
        });
        throw new Error(`Template compilation failed for section: ${section.id}`);
      }
    }

    return compiledSections.join('\n\n');
  }

  /**
   * Build default system prompt if template doesn't have one
   */
  private buildDefaultSystemPrompt(template: any): string {
    return `You are a professional report writer generating a ${template.name}.

Framework: ${template.framework}
Category: ${template.category}

Generate a comprehensive, professional report following the template structure.
Output must be in Markdown format.
Be concise, data-driven, and executive-level.`;
  }

  /**
   * Build user prompt from template and data
   */
  private buildUserPrompt(template: any, data: Record<string, any>): string {
    const sections = template.content?.sections || [];
    const sectionTitles = sections.map((s: any) => s.title).join(', ');

    let prompt = `Generate a ${template.name} with the following sections: ${sectionTitles}\n\n`;
    prompt += 'Use the following data:\n\n';
    prompt += JSON.stringify(data, null, 2);
    prompt += '\n\nGenerate the complete report in Markdown format.';

    return prompt;
  }

  /**
   * Increment template usage count
   */
  private async incrementUsageCount(templateId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE document_templates SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1',
        [templateId]
      );
    } catch (error) {
      // Non-critical error, just log it
      logger.warn('Failed to increment usage count', { templateId, error });
    }
  }

  /**
   * Get all board report templates
   */
  async getBoardReportTemplates(): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT id, name, description, framework, category, variables, created_at, updated_at, usage_count
       FROM document_templates 
       WHERE category = 'board-reporting' 
         AND deleted_at IS NULL
       ORDER BY name`
    );

    return result.rows;
  }

  /**
   * Generate CEO Portfolio Report
   */
  async generateCEOPortfolioReport(
    portfolioData: {
      reporting_period: string;
      portfolio_health: string;
      total_programs: number;
      total_budget: number;
      executive_summary_text: string;
      programs: any[];
      total_spent: number;
      spent_percent: number;
      forecast_status: string;
      variance_amount?: number;
      variance_percent?: number;
      contingency_remaining: number;
      top_risks: any[];
      decisions_required: any[];
    },
    useAI: boolean = true,
    aiProvider?: string
  ): Promise<BoardReportResponse> {
    return this.generateReport({
      templateId: 'board-ceo-portfolio-report',
      data: portfolioData,
      useAI,
      aiProvider
    });
  }

  /**
   * Generate CFO Financial Report
   */
  async generateCFOFinancialReport(
    financialData: {
      reporting_period: string;
      total_budget: number;
      total_spent: number;
      total_spent_percent: number;
      total_committed: number;
      total_remaining: number;
      monthly_burn_rate: number;
      forecast_status: string;
      programs: any[];
      total_contingency: number;
      variances: any[];
      funding_requests?: any[];
      financial_risks: any[];
    },
    useAI: boolean = true,
    aiProvider?: string
  ): Promise<BoardReportResponse> {
    return this.generateReport({
      templateId: 'board-cfo-financial-report',
      data: financialData,
      useAI,
      aiProvider
    });
  }

  /**
   * Generate Audit Committee Report
   */
  async generateAuditCommitteeReport(
    auditData: {
      reporting_period: string;
      overall_compliance_status: string;
      active_findings_count: number;
      critical_findings_count: number;
      regulatory_audits_status: string;
      sox_findings: any[];
      top_risks: any[];
      last_audit_date: string;
      audit_firm: string;
      audit_opinion: string;
      audit_recommendations?: string[];
      management_response?: string;
      regulatory_items: any[];
      total_security_events: number;
      critical_security_events: number;
      security_events?: any[];
      controls_enhancement?: string;
    },
    useAI: boolean = true,
    aiProvider?: string
  ): Promise<BoardReportResponse> {
    return this.generateReport({
      templateId: 'board-audit-committee-report',
      data: auditData,
      useAI,
      aiProvider
    });
  }

  /**
   * Generate Program Details Report
   */
  async generateProgramDetailsReport(
    programData: {
      program_name: string;
      program_manager: string;
      reporting_period: string;
      overall_status: string;
      budget_spent: number;
      budget_total: number;
      budget_percent: number;
      timeline_percent: number;
      next_review_date: string;
      projects: any[];
      milestones: any[];
      dependencies: any[];
      change_requests?: any[];
      active_risks: any[];
      open_issues: any[];
      total_resources: number;
      allocated_resources: number;
      utilization_percent: number;
      resource_categories?: any[];
      next_steps: any[];
      board_actions?: string;
    },
    useAI: boolean = true,
    aiProvider?: string
  ): Promise<BoardReportResponse> {
    return this.generateReport({
      templateId: 'board-program-details-report',
      data: programData,
      useAI,
      aiProvider
    });
  }
}

// Export singleton instance
let boardReportServiceInstance: BoardReportService | null = null;

export function getBoardReportService(pool: Pool): BoardReportService {
  if (!boardReportServiceInstance) {
    boardReportServiceInstance = new BoardReportService(pool);
  }
  return boardReportServiceInstance;
}

export default {
  BoardReportService,
  getBoardReportService
};
