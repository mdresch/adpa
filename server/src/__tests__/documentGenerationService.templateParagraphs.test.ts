jest.mock('uuid', () => ({
  v4: jest.fn(() => '11111111-1111-1111-1111-111111111111'),
}));

import { pool } from '../database/connection';
import { documentGenerationService } from '../services/documentGenerationService';
import { unifiedAIService } from '../services/unifiedAIService';
import { documentTemplateService } from '../modules/documentTemplates/service';
import { templateAuditService } from '../services/templateAuditService';

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

jest.mock('../services/templateAuditService', () => ({
  templateAuditService: {
    createPendingAudit: jest.fn().mockResolvedValue('audit-id'),
  },
}));

describe('documentGenerationService template paragraph handling', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
    (documentTemplateService.getTemplateGkgStrategy as jest.Mock).mockResolvedValue(null);
    process.env.LLM_INSIGHTS_STORE_BLOBS = 'true';
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

  it('drafts every planned section without truncating when the plan is within the safety ceiling', async () => {
    const service = documentGenerationService as any;
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'Large Scope Project',
      framework: 'PMBOK 7',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-1',
      name: 'Unstructured Template',
      framework: 'PMBOK 7',
      template_paragraphs: [],
    });
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

    const sectionCount = 9;
    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
      object: {
        sections: Array.from({ length: sectionCount }, (_, index) => ({
          heading: `## Section ${index + 1}`,
          goal: `Write section ${index + 1}.`,
          informational_needs: 'Project context.',
        })),
      },
    });
    (unifiedAIService.generate as jest.Mock).mockImplementation(async ({ prompt }: { prompt: string }) => {
      const sectionHeader = prompt.match(/## Section \d+/)?.[0] ?? '## Section';
      return {
        content: `${sectionHeader}\n\nThis is mock section content that is longer than fifty characters to pass the draft integrity check.`,
        usage: { total_tokens: 1 },
      };
    });

    const result = await documentGenerationService.generateDocument({
      projectId: 'project-1',
      templateId: 'template-1',
      userPrompt: 'Generate a document with many distinct sections.',
      provider: 'google',
      model: 'gemini-2.5-flash',
      userId: 'user-1',
    });

    // Regression guard: this plan (9 sections) is under the 20-section safety ceiling
    // and must NOT be silently truncated to the old default of 6 — every planned
    // section must be drafted and present in the assembled document.
    expect(result.metadata.context.agenticSectionsPlanned).toBe(sectionCount);
    for (let i = 1; i <= sectionCount; i++) {
      expect(result.content).toContain(`## Section ${i}`);
    }
    expect(templateAuditService.createPendingAudit).not.toHaveBeenCalled();
  });

  it('aborts and flags a template review when the plan exceeds the absolute safety ceiling, without truncating or drafting', async () => {
    const service = documentGenerationService as any;
    jest.spyOn(service, 'getProjectContext').mockResolvedValue({
      id: 'project-1',
      name: 'Runaway Scope Project',
      framework: 'PMBOK 7',
      status: 'active',
      stakeholders: [],
      documents: [],
    });
    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-2',
      name: 'Runaway Template',
      framework: 'PMBOK 7',
      template_paragraphs: [],
    });
    jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

    (pool.query as jest.Mock).mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('SELECT COUNT(*) FROM template_audits')) {
        return { rows: [{ count: '2' }] };
      }
      return { rows: [] };
    });

    const oversizedSectionCount = 25;
    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
      object: {
        sections: Array.from({ length: oversizedSectionCount }, (_, index) => ({
          heading: `## Section ${index + 1}`,
          goal: `Write section ${index + 1}.`,
          informational_needs: 'Project context.',
        })),
      },
    });

    await expect(
      documentGenerationService.generateDocument({
        projectId: 'project-1',
        templateId: 'template-2',
        userPrompt: 'Generate a document covering everything imaginable.',
        provider: 'google',
        model: 'gemini-2.5-flash',
        userId: 'user-1',
      })
    ).rejects.toThrow(/TEMPLATE_OVERSIZED_PLAN/);

    // No section should be drafted — the safety ceiling aborts before drafting,
    // it does not silently truncate the plan and draft a subset.
    expect(unifiedAIService.generate).not.toHaveBeenCalled();

    // A template review must be flagged (version = existing audit count + 1).
    expect(templateAuditService.createPendingAudit).toHaveBeenCalledWith('template-2', 'oversized_plan', 3);
  });

  describe('placeholder draft document deduplication (idx_documents_one_empty_draft_per_template)', () => {
    // Regression context: concurrent/redelivered attempts of the same ai-generate
    // job each ran a SELECT-then-INSERT for an empty draft placeholder, each saw
    // "no existing draft yet" (the other's INSERT hadn't committed), and each
    // minted its own duplicate placeholder document — observed live, up to 9
    // duplicate rows for a single logical generation. The fix makes the insert
    // atomic against a partial unique index on (project_id, template_id) for
    // empty drafts (migration 431), so a conflict is detected by Postgres itself
    // instead of a racy application-level check.

    it('mints a fresh placeholder document when no conflicting empty draft exists', async () => {
      const service = documentGenerationService as any;
      jest.spyOn(service, 'getProjectContext').mockResolvedValue({
        id: 'project-1',
        name: 'Fresh Draft Project',
        framework: 'PMBOK 7',
        status: 'active',
        stakeholders: [],
        documents: [],
      });
      jest.spyOn(service, 'getTemplate').mockResolvedValue({
        id: 'template-1',
        name: 'Some Template',
        framework: 'PMBOK 7',
        template_paragraphs: [],
      });
      jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

      (pool.query as jest.Mock).mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO documents')) {
          // No conflict: the partial unique index lets this insert through and
          // returns the freshly minted id.
          return { rows: [{ id: '11111111-1111-1111-1111-111111111111' }] };
        }
        return { rows: [] };
      });

      (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
        object: {
          sections: [
            { heading: '## Section 1', goal: 'Write section 1.', informational_needs: 'Project context.' },
          ],
        },
      });
      (unifiedAIService.generate as jest.Mock).mockResolvedValue({
        content: '## Section 1\n\nThis is mock section content that is longer than fifty characters to pass the check.',
        usage: { total_tokens: 1 },
      });

      const result = await documentGenerationService.generateDocument({
        projectId: 'project-1',
        templateId: 'template-1',
        userPrompt: 'Generate a fresh document.',
        provider: 'google',
        model: 'gemini-2.5-flash',
        userId: 'user-1',
      });

      expect(result.documentId).toBe('11111111-1111-1111-1111-111111111111');

      const insertCall = (pool.query as jest.Mock).mock.calls.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.includes('INSERT INTO documents')
      );
      expect(insertCall![0]).toEqual(
        expect.stringContaining("ON CONFLICT (project_id, template_id) WHERE status = 'draft'")
      );
    });

    it('reuses the existing empty draft document instead of creating a duplicate when the atomic insert conflicts', async () => {
      const service = documentGenerationService as any;
      jest.spyOn(service, 'getProjectContext').mockResolvedValue({
        id: 'project-1',
        name: 'Racing Attempts Project',
        framework: 'PMBOK 7',
        status: 'active',
        stakeholders: [],
        documents: [],
      });
      jest.spyOn(service, 'getTemplate').mockResolvedValue({
        id: 'template-1',
        name: 'Some Template',
        framework: 'PMBOK 7',
        template_paragraphs: [],
      });
      jest.spyOn(service, 'fetchContextItems').mockResolvedValue([]);

      const existingDraftId = 'existing-draft-id-0000-0000-0000-000000000000';

      (pool.query as jest.Mock).mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO documents')) {
          // Conflict: another attempt already holds the empty draft for this
          // project+template combination — ON CONFLICT DO NOTHING returns no row.
          return { rows: [] };
        }
        if (
          typeof sql === 'string' &&
          sql.includes('FROM documents') &&
          sql.includes("status = 'draft'") &&
          sql.includes('ORDER BY created_at DESC')
        ) {
          return { rows: [{ id: existingDraftId }] };
        }
        return { rows: [] };
      });

      (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({
        object: {
          sections: [
            { heading: '## Section 1', goal: 'Write section 1.', informational_needs: 'Project context.' },
          ],
        },
      });
      (unifiedAIService.generate as jest.Mock).mockResolvedValue({
        content: '## Section 1\n\nThis is mock section content that is longer than fifty characters to pass the check.',
        usage: { total_tokens: 1 },
      });

      const result = await documentGenerationService.generateDocument({
        projectId: 'project-1',
        templateId: 'template-1',
        userPrompt: 'Generate a document while another attempt is in flight.',
        provider: 'google',
        model: 'gemini-2.5-flash',
        userId: 'user-1',
      });

      // Must reuse the pre-existing draft's id, never the freshly minted uuid —
      // this is what prevents the duplicate document row.
      expect(result.documentId).toBe(existingDraftId);
      expect(result.documentId).not.toBe('11111111-1111-1111-1111-111111111111');
    });
  });
});

