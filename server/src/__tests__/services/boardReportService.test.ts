/**
 * Board Report Service Tests
 * 
 * Tests for the board report generation service including:
 * - CEO Portfolio Report
 * - CFO Financial Report
 * - Audit Committee Report
 * - Program Details Report
 */

const db = require('../../lib/db');
import { BoardReportService, BoardReportRequest } from '../../services/boardReportService';

// Mock the dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import * as aiServiceModule from '../../services/aiService';

jest.mock('../../services/aiService', () => ({
  aiService: {
    generateText: jest.fn()
  }
}));

describe('BoardReportService', () => {
  let service: BoardReportService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // Create mock pool with proper typing
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as jest.Mocked<Pool>;

    service = new BoardReportService(mockPool);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    const mockTemplate = {
      id: 'board-ceo-portfolio-report',
      name: 'CEO Portfolio Report',
      description: 'Test template',
      framework: 'Board Governance',
      category: 'board-reporting',
      content: {
        sections: [
          {
            id: 'test_section',
            title: 'Test Section',
            content: '## Test\n\n{{test_var}}',
            required: true
          }
        ]
      },
      variables: [
        {
          name: 'test_var',
          type: 'text',
          required: true,
          description: 'Test variable'
        }
      ],
      system_prompt: 'Test system prompt'
    };

    it('should generate report from template without AI', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] } as any) // getTemplate
        .mockResolvedValueOnce({ rows: [] } as any); // incrementUsageCount

      const request: BoardReportRequest = {
        templateId: 'board-ceo-portfolio-report',
        data: { test_var: 'Test Value' },
        useAI: false
      };

      const result = await service.generateReport(request);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test Value');
      expect(result.aiGenerated).toBe(false);
      expect(result.format).toBe('markdown');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM document_templates WHERE id = $1 AND deleted_at IS NULL',
        ['board-ceo-portfolio-report']
      );
    });

    it('should generate report with AI when useAI is true', async () => {
      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>;
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      aiService.generateText.mockResolvedValue({
        text: '# AI Generated Report\n\nThis is AI content.'
      });

      const request: BoardReportRequest = {
        templateId: 'board-ceo-portfolio-report',
        data: { test_var: 'Test Value' },
        useAI: true,
        aiProvider: 'openai'
      };

      const result = await service.generateReport(request);

      expect(result.success).toBe(true);
      expect(result.content).toContain('AI Generated Report');
      expect(result.aiGenerated).toBe(true);
      expect(aiService.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4'
        })
      );
    });

    it('should throw error for missing required variables', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockTemplate] } as any);

      const request: BoardReportRequest = {
        templateId: 'board-ceo-portfolio-report',
        data: {}, // Missing test_var
        useAI: false
      };

      const result = await service.generateReport(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required variables');
    });

    it('should handle template not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const request: BoardReportRequest = {
        templateId: 'board-ceo-portfolio-report',
        data: { test_var: 'Test' },
        useAI: false
      };

      const result = await service.generateReport(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should increment usage count after successful generation', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const request: BoardReportRequest = {
        templateId: 'board-ceo-portfolio-report',
        data: { test_var: 'Test' },
        useAI: false
      };

      await service.generateReport(request);

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE document_templates SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1',
        ['board-ceo-portfolio-report']
      );
    });
  });

  describe('generateCEOPortfolioReport', () => {
    it('should generate CEO portfolio report with valid data', async () => {
      const mockTemplate = {
        id: 'board-ceo-portfolio-report',
        name: 'CEO Portfolio Report',
        content: { sections: [{ content: '{{reporting_period}}' }] },
        variables: [{ name: 'reporting_period', required: true }]
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const portfolioData = {
        reporting_period: 'Q4 2024',
        portfolio_health: 'Green',
        total_programs: 5,
        total_budget: 10000000,
        executive_summary_text: 'Portfolio is healthy',
        programs: [
          {
            name: 'Program A',
            status: 'Green',
            budget_percent: 50
          }
        ],
        total_spent: 5000000,
        spent_percent: 50,
        forecast_status: 'On Track',
        contingency_remaining: 500000,
        top_risks: [],
        decisions_required: []
      };

      const result = await service.generateCEOPortfolioReport(portfolioData, false);

      expect(result.success).toBe(true);
      expect(result.templateUsed).toBe('board-ceo-portfolio-report');
    });
  });

  describe('generateCFOFinancialReport', () => {
    it('should generate CFO financial report with valid data', async () => {
      const mockTemplate = {
        id: 'board-cfo-financial-report',
        name: 'CFO Financial Report',
        content: { sections: [{ content: '{{reporting_period}}' }] },
        variables: [{ name: 'reporting_period', required: true }]
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const financialData = {
        reporting_period: 'Q4 2024',
        total_budget: 10000000,
        total_spent: 5000000,
        total_spent_percent: 50,
        total_committed: 1000000,
        total_remaining: 4000000,
        monthly_burn_rate: 500000,
        forecast_status: 'On Budget',
        programs: [],
        total_contingency: 500000,
        variances: [],
        financial_risks: []
      };

      const result = await service.generateCFOFinancialReport(financialData, false);

      expect(result.success).toBe(true);
      expect(result.templateUsed).toBe('board-cfo-financial-report');
    });
  });

  describe('generateAuditCommitteeReport', () => {
    it('should generate audit committee report with valid data', async () => {
      const mockTemplate = {
        id: 'board-audit-committee-report',
        name: 'Audit Committee Report',
        content: { sections: [{ content: '{{reporting_period}}' }] },
        variables: [{ name: 'reporting_period', required: true }]
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const auditData = {
        reporting_period: 'Q4 2024',
        overall_compliance_status: 'Compliant',
        active_findings_count: 3,
        critical_findings_count: 0,
        regulatory_audits_status: 'Current',
        sox_findings: [],
        top_risks: [],
        last_audit_date: '2024-09-30',
        audit_firm: 'Test Auditors LLC',
        audit_opinion: 'Unqualified',
        regulatory_items: [],
        total_security_events: 5,
        critical_security_events: 0
      };

      const result = await service.generateAuditCommitteeReport(auditData, false);

      expect(result.success).toBe(true);
      expect(result.templateUsed).toBe('board-audit-committee-report');
    });
  });

  describe('generateProgramDetailsReport', () => {
    it('should generate program details report with valid data', async () => {
      const mockTemplate = {
        id: 'board-program-details-report',
        name: 'Program Details Report',
        content: { sections: [{ content: '{{program_name}}' }] },
        variables: [{ name: 'program_name', required: true }]
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const programData = {
        program_name: 'Strategic Initiative Alpha',
        program_manager: 'John Doe',
        reporting_period: 'Q4 2024',
        overall_status: 'Green',
        budget_spent: 5000000,
        budget_total: 10000000,
        budget_percent: 50,
        timeline_percent: 60,
        next_review_date: '2025-01-15',
        projects: [],
        milestones: [],
        dependencies: [],
        active_risks: [],
        open_issues: [],
        total_resources: 50,
        allocated_resources: 45,
        utilization_percent: 90,
        next_steps: []
      };

      const result = await service.generateProgramDetailsReport(programData, false);

      expect(result.success).toBe(true);
      expect(result.templateUsed).toBe('board-program-details-report');
    });
  });

  describe('getBoardReportTemplates', () => {
    it('should retrieve all board report templates', async () => {
      const mockTemplates = [
        { id: 'board-ceo-portfolio-report', name: 'CEO Portfolio Report' },
        { id: 'board-cfo-financial-report', name: 'CFO Financial Report' },
        { id: 'board-audit-committee-report', name: 'Audit Committee Report' },
        { id: 'board-program-details-report', name: 'Program Details Report' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockTemplates } as any);

      const result = await service.getBoardReportTemplates();

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('board-ceo-portfolio-report');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE category = 'board-reporting'"),
        undefined
      );
    });
  });
});
