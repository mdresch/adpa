import { AIGenerationJobService } from '../../services/jobs/AIGenerationJobService';
import { documentGenerationService } from '../../services/documentGenerationService';
import { aiService } from '../../services/aiService';
import { pool } from '../../database/connection';
import { notificationService } from '../../services/notificationService';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-uuid'),
}));

jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn(),
    end: jest.fn(),
  },
  getDatabasePoolSafe: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  })),
}));

jest.mock('../../services/aiService', () => ({
  aiService: {
    generateStructuredObject: jest.fn().mockResolvedValue({
      object: {
        sections: [
          { heading: '## Summary', goal: 'Summarize', informational_needs: 'None' }
        ]
      }
    }),
    generateWithFallback: jest.fn().mockResolvedValue({
      text: '## Summary\nThis is a generated document with some <H8>entities</H8>.\n',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }),
    generate: jest.fn(),
    updateUsageStats: jest.fn(),
  },
  AIService: class AIService {
    constructor() {}
  }
}));

jest.mock('../../services/unifiedAIService', () => ({
  unifiedAIService: {
    generateStructuredObject: jest.fn().mockResolvedValue({
      object: {
        sections: [
          { heading: '## Summary', goal: 'Summarize', informational_needs: 'None' }
        ]
      }
    }),
    generate: jest.fn().mockResolvedValue({
      content: '## Summary\nThis is a generated document with some <H8>entities</H8>.\n',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }),
  },
}));

jest.mock('../../services/notificationService', () => ({
  notificationService: {
    sendNotification: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../services/jobs/enqueueEntityPersistence', () => ({
  enqueueEntityPersistence: jest.fn().mockResolvedValue('entity-job-123'),
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  childLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

describe('Document Generation E2E Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DB queries
    (pool.query as jest.Mock).mockImplementation((queryText: string) => {
      if (!queryText || typeof queryText !== 'string') return Promise.resolve({ rows: [], rowCount: 0 });

      if (queryText.includes('INSERT INTO documents')) {
        return Promise.resolve({ rows: [{ id: 'new-doc-id' }], rowCount: 1 });
      }
      if (queryText.includes('FROM projects') || queryText.includes('projects WHERE id')) {
        return Promise.resolve({ rows: [{ id: 'proj-789', name: 'Test Project', description: 'Test' }], rowCount: 1 });
      }
      if (queryText.includes('FROM templates') || queryText.includes('templates WHERE id')) {
        return Promise.resolve({ rows: [{ id: 'tmpl-xyz', name: 'Test Template' }], rowCount: 1 });
      }
      if (queryText.includes('FROM template_paragraphs') || queryText.includes('template_paragraphs WHERE')) {
        return Promise.resolve({ rows: [{ id: 'para-1', template_id: 'tmpl-xyz', order: 1, section_name: 'Summary', section_type: 'SUMMARY', required: true }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  it('generates a document, saves it, queues entity extraction, and queues approval request', async () => {
    // Force the document to require human approval
    const mockDb = {
      query: (pool.query as jest.Mock)
    };

    const job = {
      id: 'job-123',
      name: 'ai-generate',
      data: {
        jobId: 'job-123',
        documentId: 'doc-abc',
        template_id: 'tmpl-xyz',
        variables: { project_id: 'proj-789' },
        projectId: 'proj-789',
        userId: 'user-001',
        prompt: 'Create a test document',
        provider: 'openai',
        generation_metadata: {
          compliance_status: 'PENDING_HUMAN_APPROVAL' // Force approval queue
        }
      }
    };

    const options = { workerId: 'worker-1', updateJobStatus: jest.fn() };
    const deps = {
      database: mockDb,
      updateStatus: jest.fn(),
      checkCancellation: jest.fn()
    };

    const result = await AIGenerationJobService.processJob(job as any, options as any, deps as any);
    console.log("processJob result:", result);

    // 1. Verify LLM was called
    const { unifiedAIService } = require('../../services/unifiedAIService');
    expect(unifiedAIService.generateStructuredObject).toHaveBeenCalled();
    expect(unifiedAIService.generate).toHaveBeenCalled();

    // 2. Verify Document was inserted
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO documents'),
      expect.arrayContaining(['draft'])
    );

    // 3. Verify Entity Persistence was queued
    const { enqueueEntityPersistence } = require('../../services/jobs/enqueueEntityPersistence');
    expect(enqueueEntityPersistence).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'new-doc-id',
        projectId: 'proj-789'
      })
    );

    // 4. Verify Approval Request was inserted
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO approval_requests'),
      expect.arrayContaining(['document_generation', 'new-doc-id', 'pending'])
    );

    // 5. Verify Notification was sent
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notification_type: 'APPROVAL_REQUEST',
        reference_id: 'new-doc-id',
        project_id: 'proj-789'
      })
    );
  });
});
