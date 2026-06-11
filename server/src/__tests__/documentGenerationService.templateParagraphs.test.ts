jest.mock('uuid', () => ({
  v4: jest.fn(() => '11111111-1111-1111-1111-111111111111'),
}));

import { pool } from '../database/connection';
import { documentGenerationService } from '../services/documentGenerationService';
import { unifiedAIService } from '../services/unifiedAIService';
import { documentTemplateService } from '../modules/documentTemplates/service';

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
      extractedCount: 0,
      entitiesByType: {},
      contextConsistencyStats: {
        occurrenceConsistencyScore: 100,
        consistencyWins: 0,
        totalOccurrences: 0,
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

describe('documentGenerationService template paragraph handling', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
    (documentTemplateService.getTemplateGkgStrategy as jest.Mock).mockResolvedValue(null);
  });

  it('generates a document when template_paragraphs is legacy non-array JSON', async () => {
    const service = documentGenerationService as any;
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'Concept Project',
      framework: 'PMBOK 7',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-1',
      name: 'The Concept Validation Template',
      framework: 'PMBOK 7',
      template_paragraphs: {},
    });
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
      object: {
        sections: [
          {
            heading: '## Concept Validation',
            goal: 'Validate the concept.',
            informational_needs: 'Project context.',
          },
        ],
      },
    });
    (unifiedAIService.generate as jest.Mock).mockResolvedValue({
      content: '## Concept Validation\n\nThe concept is ready for validation.',
      usage: { total_tokens: 42 },
    });

    const result = await documentGenerationService.generateDocument({
      projectId: 'project-1',
      templateId: 'template-1',
      userPrompt: 'Generate the concept validation document.',
      provider: 'google',
      model: 'gemini-2.5-flash',
      userId: 'user-1',
    });

    expect(result.content).toContain('## Concept Validation');
    expect(unifiedAIService.generateStructuredObject).toHaveBeenCalled();
  });

  it('does not increment template usage before the generated document is persisted', async () => {
    const service = documentGenerationService as any;
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'Concept Project',
      framework: 'PMBOK 7',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-1',
      name: 'The Concept Validation Template',
      framework: 'PMBOK 7',
      template_paragraphs: [],
    });
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
      object: {
        sections: [
          {
            heading: '## Concept Validation',
            goal: 'Validate the concept.',
            informational_needs: 'Project context.',
          },
        ],
      },
    });
    (unifiedAIService.generate as jest.Mock).mockResolvedValue({
      content: '## Concept Validation\n\nThe concept is ready for validation.',
      usage: { total_tokens: 42 },
    });

    await documentGenerationService.generateDocument({
      projectId: 'project-1',
      templateId: 'template-1',
      userPrompt: 'Generate the concept validation document.',
      provider: 'google',
      model: 'gemini-2.5-flash',
      userId: 'user-1',
    });

    const usageUpdates = (pool.query as jest.Mock).mock.calls.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('usage_count')
    );

    expect(usageUpdates).toHaveLength(0);
  });

  it('bounds section drafting concurrency to avoid provider quota floods', async () => {
    const service = documentGenerationService as any;
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'Quota Sensitive Project',
      framework: 'PMBOK 7',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue(null);
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
      object: {
        sections: Array.from({ length: 5 }, (_, index) => ({
          heading: `## Section ${index + 1}`,
          goal: `Write section ${index + 1}.`,
          informational_needs: 'Project context.',
        })),
      },
    });

    let activeDrafts = 0;
    let maxActiveDrafts = 0;
    (unifiedAIService.generate as jest.Mock).mockImplementation(async ({ prompt }: { prompt: string }) => {
      activeDrafts += 1;
      maxActiveDrafts = Math.max(maxActiveDrafts, activeDrafts);
      await new Promise(resolve => setTimeout(resolve, 5));
      activeDrafts -= 1;
      const sectionHeader = prompt.match(/## Section \d+/)?.[0] ?? '## Section';
      return {
        content: `${sectionHeader}\n\nThis is a mock section content that is longer than fifty characters to pass the draft integrity check.`,
        usage: { total_tokens: 1 },
      };
    });

    const result = await documentGenerationService.generateDocument({
      projectId: 'project-1',
      userPrompt: 'Generate all sections.',
      provider: 'google',
      model: 'gemini-2.5-flash',
      userId: 'user-1',
    });

    expect(result.metadata.context.agenticSectionsPlanned).toBe(5);
    expect(maxActiveDrafts).toBeLessThanOrEqual(2);
  });

  it('persists assembled LLM prompt snapshots for queued jobs before provider calls', async () => {
    const service = documentGenerationService as any;
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'Observable Project',
      framework: 'PMBOK 7',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue(null);
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([
      {
        title: 'Architecture Notes',
        content: 'Use OpenUI for structured rendering after the governance context is prepared.',
      },
    ]);

    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
      object: {
        sections: [
          {
            heading: '## Evaluation Plan',
            goal: 'Explain the solution evaluation plan.',
            informational_needs: 'Project context and reference materials.',
          },
        ],
      },
    });
    (unifiedAIService.generate as jest.Mock).mockResolvedValue({
      content: '## Evaluation Plan\n\nEvaluate the solution and ensure the text is at least fifty characters long.',
      usage: { total_tokens: 12 },
    });

    await documentGenerationService.generateDocument({
      jobId: '6613511a-52e3-4cd0-a70f-fea9cbe4ac02',
      projectId: 'project-1',
      userPrompt: 'Generate the solution evaluation plan.',
      provider: 'mistral',
      model: 'mistral-large-2411',
      userId: 'user-1',
    } as any);

    const insightUpdates = (pool.query as jest.Mock).mock.calls.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('{llm_insights,requests}')
    );

    expect(insightUpdates).toHaveLength(3);
    expect(JSON.parse(insightUpdates[0][1][0])).toMatchObject({
      phase: 'planning',
      provider: 'mistral',
      model: 'mistral-large-2411',
      prompt: expect.stringContaining('### User Request:'),
    });
    expect(JSON.parse(insightUpdates[1][1][0])).toMatchObject({
      phase: 'drafting',
      label: 'Draft Section 1',
      prompt: expect.stringContaining('Architecture Notes'),
    });
    expect(JSON.parse(insightUpdates[2][1][0])).toMatchObject({
      phase: 'compacting',
      label: 'Final Compilation & Multi-Scale Compression',
    });
  });

  it('resumes document generation and skips already completed planning and drafting phases', async () => {
    const service = documentGenerationService as any;
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'Resuming Project',
      framework: 'PMBOK 7',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-1',
      name: 'Resuming Template',
      framework: 'PMBOK 7',
      template_paragraphs: [],
    });
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

    // Mock DB queries for checking job snapshots
    const mockPreviousRequests = [
      {
        phase: 'planning',
        response: JSON.stringify({
          sections: [
            { heading: '## Section 1', goal: 'Goal 1', informational_needs: 'Needs 1' },
            { heading: '## Section 2', goal: 'Goal 2', informational_needs: 'Needs 2' },
          ],
        }),
      },
      {
        phase: 'drafting',
        order: 0,
        response: '## Section 1\n\nThis is the already completed draft content for section 1. It is long enough to pass.',
        tokensUsed: 100,
      },
    ];

    (pool.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT data FROM jobs WHERE id = $1')) {
        if (params?.[0] === 'new-job-id') {
          // New job has no data initially, retryOf links to parent job
          return { rows: [{ data: { retryOf: 'parent-job-id' } }] };
        }
        if (params?.[0] === 'parent-job-id') {
          // Parent job has the snapshots
          return {
            rows: [
              {
                data: {
                  llm_insights: {
                    requests: mockPreviousRequests,
                  },
                },
              },
            ],
          };
        }
      }
      return { rows: [] };
    });

    // We only mock unifiedAIService.generate for section 2 since section 1 is reused from snapshot!
    // And unifiedAIService.generateStructuredObject should NOT be called for planning since plan is reused!
    (unifiedAIService.generate as jest.Mock).mockResolvedValue({
      content: '## Section 2\n\nThis is the newly drafted content for section 2 that was missing. It is long enough to pass.',
      usage: { total_tokens: 50 },
    });

    const result = await documentGenerationService.generateDocument({
      jobId: 'new-job-id',
      projectId: 'project-1',
      templateId: 'template-1',
      userPrompt: 'Generate remaining sections.',
      provider: 'google',
      model: 'gemini-2.5-flash',
      userId: 'user-1',
    });

    // Verify it reused Section 1 content and generated Section 2
    expect(result.content).toContain('## Section 1');
    expect(result.content).toContain('This is the already completed draft content for section 1.');
    expect(result.content).toContain('## Section 2');
    expect(result.content).toContain('This is the newly drafted content for section 2 that was missing.');

    // Verify unifiedAIService.generateStructuredObject was not called for the planning phase
    const planCalls = (unifiedAIService.generateStructuredObject as jest.Mock).mock.calls.filter(
      ([args]) => args.traceName === 'agentic-doc-gen-plan'
    );
    expect(planCalls).toHaveLength(0);

    // Verify unifiedAIService.generate was called exactly once (for Section 2, index 1)
    expect(unifiedAIService.generate).toHaveBeenCalledTimes(1);
  });
});

