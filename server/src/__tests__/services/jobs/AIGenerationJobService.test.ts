import { AIGenerationJobService } from '../../../services/jobs/AIGenerationJobService';
import { documentGenerationService } from '../../../services/documentGenerationService';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-job-id'),
}));

jest.mock('../../../services/documentGenerationService', () => ({
  documentGenerationService: {
    generateDocument: jest.fn(),
  },
}));

jest.mock('../../../services/queueService', () => ({
  extractionQueue: {
    add: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../services/baselineService', () => ({
  baselineService: {
    validateDocumentAgainstBaseline: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/socket', () => ({
  io: {
    emit: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
  },
}));

jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  childLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('AIGenerationJobService template usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments template usage once after a queued generated document is persisted', async () => {
    (documentGenerationService.generateDocument as jest.Mock).mockResolvedValue({
      content: '## Solution Evaluation Plan\n\nEvaluate the solution.',
      metadata: {
        provider: 'mistral',
        model: 'mistral-large-2411',
        tokens_used: 123,
      },
    });

    const database = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('INSERT INTO documents')) {
          return { rows: [{ id: 'document-1' }], rowCount: 1 };
        }
        if (sql.includes('SELECT name, description, framework FROM projects')) {
          return {
            rows: [{ name: 'ADPA Project', description: 'Project context', framework: 'BABOK' }],
            rowCount: 1,
          };
        }
        if (sql.includes('SELECT id FROM ai_providers')) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('SELECT * FROM documents WHERE id = $1')) {
          return { rows: [{ id: 'document-1', name: 'Solution Evaluation Plan' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }),
    };

    await AIGenerationJobService.processJob(
      {
        id: 'job-1',
        data: {
          jobId: 'job-1',
          userId: 'user-1',
          projectId: 'project-1',
          prompt: 'Generate a solution evaluation plan.',
          provider: 'mistral',
          model: 'mistral-large-2411',
          template_id: 'template-1',
          name: 'Solution Evaluation Plan',
        },
      } as any,
      {
        workerId: 'worker-1',
        updateJobStatus: jest.fn().mockResolvedValue(undefined),
      } as any,
      {
        database,
        websocket: { emit: jest.fn(), to: jest.fn(() => ({ emit: jest.fn() })) },
        aiService: { updateUsageStats: jest.fn().mockResolvedValue(undefined) },
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      } as any
    );

    const usageUpdates = database.query.mock.calls.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('UPDATE templates') && sql.includes('usage_count')
    );

    expect(usageUpdates).toHaveLength(1);
    expect(usageUpdates[0][1]).toEqual(['template-1']);
  });

  it('safely lazy-loads documentGenerationService without crashing on id variable constraints', async () => {
    (documentGenerationService.generateDocument as jest.Mock).mockResolvedValue({
      content: '## Solution Evaluation Plan\n\nEvaluate the solution.',
      metadata: { provider: 'mistral', model: 'mistral-large-2411', tokens_used: 123 },
    });

    const database = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 })
    };

    const mockUpdateStatus = jest.fn();
    
    await expect(AIGenerationJobService.processJob(
      {
        id: 'job-2',
        data: {
          jobId: 'job-2',
          userId: 'user-2',
          projectId: 'project-2',
          prompt: 'Generate something.',
          provider: 'openai',
          template_id: 'template-abc',
          name: 'Test Doc',
        },
      } as any,
      { workerId: 'worker-1', updateJobStatus: mockUpdateStatus } as any,
      {
        database,
        websocket: { emit: jest.fn(), to: jest.fn(() => ({ emit: jest.fn() })) },
        aiService: { updateUsageStats: jest.fn().mockResolvedValue(undefined) },
        logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      } as any
    )).resolves.not.toThrow();

    expect(documentGenerationService.generateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'template-abc'
      })
    );
  });
});
