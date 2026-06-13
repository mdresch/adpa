jest.mock('uuid', () => ({
  v4: jest.fn(() => '11111111-1111-1111-1111-111111111111'),
}));

import { pool } from '../database/connection';
import { documentGenerationService } from '../services/documentGenerationService';
import { unifiedAIService } from '../services/unifiedAIService';
import { documentTemplateService } from '../modules/documentTemplates/service';
import { InlineEntityParserService } from '../services/inlineEntityParserService';
import { CompactorService } from '../services/compactorService';

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../modules/documentTemplates/service', () => ({
  documentTemplateService: {
    getTemplateGkgStrategy: jest.fn(),
  },
}));

jest.mock('../services/gkg', () => ({
  getContextForStrategy: jest.fn(),
}));

jest.mock('../services/unifiedAIService', () => ({
  unifiedAIService: {
    generateStructuredObject: jest.fn(),
    generate: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../services/searchService', () => ({
  contextRetrieval: {
    searchChunks: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../services/inlineEntityParserService', () => ({
  InlineEntityParserService: {
    parseAndProcess: jest.fn().mockImplementation(async (params: { markdown: string }) => ({
      cleanedMarkdown: params.markdown,
      extractedCount: 2,
      entitiesByType: { "Requirement": [{ name: "REQ-101", type: "Requirement" }, { name: "REQ-102", type: "Requirement" }] },
      contextConsistencyStats: {
        occurrenceConsistencyScore: 100,
        consistencyWins: 2,
        totalOccurrences: 2,
      },
      entityExtractionQuality: {
        overallFitScore: 100,
        typeFitScore: 100,
        contextGroundedScore: 100,
      },
    })),
  },
}));

jest.mock('../services/compactorService', () => ({
  CompactorService: {
    generateMultiScaleSummaries: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Document Generation Lifecycle & Compliance Queueing', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
    (documentTemplateService.getTemplateGkgStrategy as jest.Mock).mockResolvedValue(null);
  });

  it('generates a document, extracts entities, summarizes, and queues for human review upon low compliance score', async () => {
    const service = documentGenerationService as any;

    // 1. Mock DB and Context
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'High Risk Project',
      framework: 'ISO 9001',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue(null);
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);
    
    // Mock active policies so it triggers the audit loop
    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT rule_code, title')) {
        return {
          rows: [
            {
              rule_code: 'SEC-01',
              title: 'Strict Data Handling',
              description: 'Must not expose PII',
              execution_schema: {}
            }
          ]
        };
      }
      return { rows: [] };
    });

    // 2. Mock Planning Phase
    (unifiedAIService.generateStructuredObject as jest.Mock).mockImplementation(async (opts) => {
      if (opts.traceName === 'agentic-policy-audit') {
        // Mock the Compliance Audit returning < 90
        return {
          object: {
            score: 75,
            failedRules: [{ ruleCode: 'SEC-01', severity: 'HIGH', rationale: 'Potential PII exposure' }]
          }
        };
      }
      
      // Default: Return document plan
      return {
        object: {
          sections: [
            {
              heading: '## Introduction',
              goal: 'Explain the document.',
              informational_needs: 'Context.',
            },
          ],
        },
      };
    });

    // 3. Mock Drafting Phase
    (unifiedAIService.generate as jest.Mock).mockResolvedValue({
      content: '## Introduction\n\nThis text is deliberately generated to be longer than fifty characters to pass the draft integrity check, but it contains a compliance issue. [H8:REQ-101]',
      usage: { total_tokens: 42 },
    });

    // 4. Run the full lifecycle
    const result = await documentGenerationService.generateDocument({
      jobId: 'compliance-test-job-id',
      projectId: 'project-1',
      userPrompt: 'Draft the intro with some risk.',
      provider: 'google',
      model: 'gemini-2.5-flash',
      userId: 'user-1',
    });

    // ASSERTIONS

    // 1. Check Document Content
    expect(result.content).toContain('## Introduction');

    // 2. Check that the audit loop ran and evaluated the score
    expect(result.compliance_score).toBe(75);
    
    // 3. Ensure the document is correctly queued for approvals due to the < 90 score
    expect(result.compliance_status).toBe('PENDING_HUMAN_APPROVAL');
    expect(result.audit_log).toBeDefined();
    expect(result.audit_log.length).toBeGreaterThan(0);

    // 4. Check that Entity Extraction ran after the audit loop
    expect(InlineEntityParserService.parseAndProcess).toHaveBeenCalled();

    // Wait for setImmediate to execute the async compactor
    await new Promise(resolve => setImmediate(resolve));

    // 5. Check that Summary generation ran
    expect(CompactorService.generateMultiScaleSummaries).toHaveBeenCalled();
  });
});
