jest.mock('uuid', () => ({
  v4: jest.fn(() => '11111111-1111-1111-1111-111111111111'),
}));

import { documentGenerationService } from '../services/documentGenerationService';
import { pool } from '../database/connection';
import { contextRetrieval } from '../services/searchService';
import { unifiedAIService } from '../services/unifiedAIService';

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../services/searchService', () => ({
  contextRetrieval: {
    searchChunks: jest.fn(),
  },
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

jest.mock('../services/inlineEntityParserService', () => ({
  InlineEntityParserService: {
    parseAndProcess: jest.fn().mockResolvedValue({
      cleanedMarkdown:
        '## Introduction\n\nDrafted introduction section content with enough length to pass integrity checks.',
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
    }),
  },
}));

jest.mock('../services/compactorService', () => ({
  CompactorService: {
    generateMultiScaleSummaries: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('DocumentGenerationService - Section-Specific RAG and Entities', () => {
  const mockProjectId = 'test-project-id';
  const mockUserId = 'test-user-id';
  const mockTemplateId = 'test-template-id';
  const mockSourceDocId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VOYAGE_API_KEY;
  });

  /**
   * REQ-RAG-001: Context Scoping
   * REQ-ENT-001: Entity JSON Injection
   */
  it('scopes RAG and entities to source document ids when provided', async () => {
    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('FROM projects')) {
        return Promise.resolve({
          rows: [{ id: mockProjectId, name: 'Test Project', framework: 'PMBOK6' }],
        });
      }
      if (query.includes('FROM stakeholders')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('FROM documents') && query.includes('ANY($2::uuid[])')) {
        return Promise.resolve({ rows: [{ id: mockSourceDocId }] });
      }
      if (query.includes('FROM documents')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('FROM entity_extractions') && query.includes('document_id = ANY')) {
        return Promise.resolve({
          rows: [
            {
              name: 'IT Lead',
              type: 'stakeholders',
              data: { role: 'Technical Authority', influence_level: 'medium' },
              document_id: mockSourceDocId,
            },
          ],
        });
      }
      if (query.includes('FROM entity_extractions')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('FROM project_context_items')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('FROM templates')) {
        return Promise.resolve({ rows: [{ id: mockTemplateId, name: 'Test Template' }] });
      }
      if (query.includes('FROM policy_library')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('INSERT INTO documents')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    (unifiedAIService.generateStructuredObject as jest.Mock).mockImplementation(
      ({ prompt }: { prompt: string }) => {
        if (prompt.includes('Recursive Summaries') || prompt.includes('Final Compilation')) {
          return Promise.resolve({
            object: {
              summary80: 'summary 80',
              summary60: 'summary 60',
              summary40: 'summary 40',
              summary20: 'summary 20',
            },
          });
        }
        return Promise.resolve({
          object: {
            sections: [
              {
                heading: '## Introduction',
                goal: 'Introduce the project',
                informational_needs: 'Project overview and IT Lead details',
              },
            ],
          },
        });
      }
    );

    (contextRetrieval.searchChunks as jest.Mock).mockResolvedValue([
      { title: 'Source Doc', content: 'This is a relevant chunk about the IT Lead.' },
    ]);

    (unifiedAIService.generate as jest.Mock).mockResolvedValue({
      content:
        '## Introduction\n\nDrafted introduction section content with enough length to pass integrity checks and include IT Lead context.',
      usage: { total_tokens: 100 },
    });

    await documentGenerationService.generateDocument({
      projectId: mockProjectId,
      userId: mockUserId,
      templateId: mockTemplateId,
      userPrompt: 'Generate an intro',
      provider: 'openai',
      sourceDocumentIds: [mockSourceDocId],
    });

    expect(contextRetrieval.searchChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: mockProjectId,
        documentIds: [mockSourceDocId],
        query: expect.stringContaining('Introduction'),
      })
    );

    const draftCall = (unifiedAIService.generate as jest.Mock).mock.calls[0];
    const prompt = draftCall[0].prompt;

    expect(prompt).toContain('Section-Specific Reference Materials');
    expect(prompt).toContain('This is a relevant chunk about the IT Lead.');
    expect(prompt).toContain('Existing Project Entities');
    expect(prompt).toContain('Specifically Relevant for this Section');
    expect(prompt).toContain('IT Lead');
    expect(prompt).toContain('"role":"Technical Authority"');
  });

  /**
   * REQ-RAG-001: Project-wide RAG fallback when scoped search returns empty
   * REQ-ENT-001: Global Project Registry baseline injection
   * REQ-OPS-001: context_metrics on drafting snapshots
   */
  it('falls back to project-wide RAG and includes baseline entities when specific context is sparse', async () => {
    // 1. Mock Project Context with some entities
    (pool.query as jest.Mock).mockImplementation((query: string) => {
      if (query.includes('FROM projects')) {
        return Promise.resolve({
          rows: [{ id: mockProjectId, name: 'Sparse Project', framework: 'PMBOK6' }],
        });
      }
      if (query.includes('FROM documents') && query.includes('ANY($2::uuid[])')) {
        return Promise.resolve({ rows: [{ id: mockSourceDocId }] });
      }
      if (query.includes('FROM entity_extractions') && query.includes('extraction_confidence DESC')) {
        return Promise.resolve({
          rows: [
            {
              name: 'Project Sponsor',
              type: 'stakeholders',
              data: { role: 'Executive' },
            },
          ],
        });
      }
      if (query.includes('FROM templates')) {
        return Promise.resolve({ rows: [{ id: mockTemplateId, name: 'Sparse Template' }] });
      }
      if (query.includes('FROM documents')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    // 2. Mock Planner Output
    (unifiedAIService.generateStructuredObject as jest.Mock).mockImplementation(({ prompt }: { prompt: string }) => {
      if (prompt.includes('Final Compilation')) {
        return Promise.resolve({ object: { summary80: '80', summary60: '60', summary40: '40', summary20: '20' } });
      }
      return Promise.resolve({
        object: {
          sections: [{ heading: '## Summary', goal: 'Summarize', informational_needs: 'General context' }],
        },
      });
    });

    // 3. Mock RAG Search: First call (scoped) returns 0, second (fallback) returns results
    (contextRetrieval.searchChunks as jest.Mock)
      .mockResolvedValueOnce([]) // Scoped search
      .mockResolvedValueOnce([{ title: 'Fallback Doc', content: 'Fallback context about the project.' }]); // Project-wide fallback

    // 4. Mock Drafter Output
    (unifiedAIService.generate as jest.Mock).mockResolvedValue({
      content: '## Summary\n\nDrafted content that is long enough to pass the integrity check 1234567890.',
      usage: { total_tokens: 50 },
    });

    // 5. Execute with sourceDocumentIds to trigger fallback logic
    await documentGenerationService.generateDocument({
      jobId: 'test-job-id',
      projectId: mockProjectId,
      userId: mockUserId,
      templateId: mockTemplateId,
      userPrompt: 'Generate a summary',
      provider: 'openai',
      sourceDocumentIds: [mockSourceDocId],
    });

    // 6. Verifications
    // Verify RAG search was called twice (once scoped, once project-wide)
    expect(contextRetrieval.searchChunks).toHaveBeenCalledTimes(2);
    expect(contextRetrieval.searchChunks).toHaveBeenNthCalledWith(1, expect.objectContaining({ documentIds: [mockSourceDocId] }));
    expect(contextRetrieval.searchChunks).toHaveBeenNthCalledWith(2, expect.objectContaining({ documentIds: undefined }));

    const draftCall = (unifiedAIService.generate as jest.Mock).mock.calls[0];
    const prompt = draftCall[0].prompt;

    // Verify fallback RAG chunks are in the prompt
    expect(prompt).toContain('Retrieved via RAG');
    expect(prompt).toContain('Fallback context about the project.');

    // Verify baseline entities are in the prompt (even if not highly relevant)
    expect(prompt).toContain('Global Project Registry');
    expect(prompt).toContain('Project Sponsor');

    // Verify snapshot was recorded with metrics
    const updateCall = (pool.query as jest.Mock).mock.calls.find(c => {
      const q = String(c[0]);
      const p = String(c[1]?.[0]);
      return q.includes('UPDATE jobs') && p.includes('context_metrics') && p.includes('project-fallback');
    });
    
    expect(updateCall).toBeDefined();
    const payload = JSON.parse(updateCall![1][0]);
    expect(payload.context_metrics).toBeDefined();
    expect(payload.context_metrics.rag_strategy).toBe('project-fallback');
    expect(payload.context_metrics.rag_chunks_found).toBe(1);
    expect(payload.context_metrics.baseline_entities_injected).toBeGreaterThan(0);
  });
});
