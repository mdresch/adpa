/**
 * Contract Guard: only one live invocation of AIGenerationJobService.processJob()
 * may ever do real work for a given job id at a time — regardless of *why* a
 * duplicate invocation exists (dropped RabbitMQ channel triggering
 * amqp-connection-manager's reconnect-and-redeliver, a broker consumer_timeout,
 * a manual retry racing an in-flight attempt, or a future multi-node deployment).
 *
 * Regression context: a single job (`41167200...`, "Ideation Document") was
 * observed live running concurrently on the SAME unchanged worker process for
 * ~2 hours — its own llm_insights log showed "Plan Document Structure" and
 * "Draft Section 1" each captured twice, entries as little as 822ms apart, and
 * its `llmProgressSteps` array reset mid-flight (sections already drafted
 * flipped back to "pending"), which is exactly the "sections build up then
 * fall back and disappear" symptom reported in the Job Monitor UI. No server
 * restart occurred, ruling out nodemon/redelivery-on-restart as the cause.
 *
 * The fix makes Postgres's row-level UPDATE atomicity the sole arbiter of
 * "who gets to process this job right now" via an atomic claim on the jobs
 * row, reusing `processing_started_at` as both liveness heartbeat and
 * staleness threshold — no new columns, no dependency on broker semantics.
 */

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

// documentSummarizationService transitively pulls in unifiedAIService -> langfuse,
// which hits a known ESM dynamic-import interop issue under ts-jest unrelated to
// anything under test here (same class of problem the repo already works around
// for @faker-js/faker in setup.ts).
jest.mock('../../../services/documentSummarizationService', () => ({
  DocumentSummarizationService: {
    saveSummaries: jest.fn().mockResolvedValue(undefined),
    generateMultiLevelSummaries: jest.fn().mockResolvedValue(undefined),
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

function baseJob() {
  return {
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
  } as any;
}

function baseDeps(database: { query: jest.Mock }) {
  return {
    database,
    websocket: { emit: jest.fn(), to: jest.fn(() => ({ emit: jest.fn() })) },
    aiService: { updateUsageStats: jest.fn().mockResolvedValue(undefined) },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  } as any;
}

describe('AIGenerationJobService concurrency claim (contract)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claims the job and proceeds with real generation when no other invocation holds a live lease', async () => {
    (documentGenerationService.generateDocument as jest.Mock).mockResolvedValue({
      content: '## Solution Evaluation Plan\n\nEvaluate the solution.',
      metadata: { provider: 'mistral', model: 'mistral-large-2411', tokens_used: 123 },
    });

    const database = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes(`generation_metadata->>'job_id'`)) {
          return { rows: [], rowCount: 0 }; // no prior completed document
        }
        if (sql.includes('UPDATE jobs') && sql.includes('processing_started_at = CURRENT_TIMESTAMP') && sql.includes('RETURNING id')) {
          // The atomic claim: succeeds because nothing else holds a live lease.
          return { rows: [{ id: 'job-1' }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO documents')) {
          return { rows: [{ id: 'document-1' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }),
    };

    const result = await AIGenerationJobService.processJob(
      baseJob(),
      { workerId: 'worker-1', updateJobStatus: jest.fn().mockResolvedValue(undefined) } as any,
      baseDeps(database)
    );

    expect(documentGenerationService.generateDocument).toHaveBeenCalled();
    expect(result.skipped).toBeFalsy();

    const claimCall = database.query.mock.calls.find(
      ([sql]: [string]) => sql.includes('UPDATE jobs') && sql.includes('RETURNING id') && sql.includes('processing_started_at')
    );
    expect(claimCall).toBeDefined();
    expect(claimCall![0]).toEqual(expect.stringContaining(`status NOT IN ('cancelled', 'completed', 'failed')`));
  });

  it('skips immediately without generating content when another invocation currently holds a live lease', async () => {
    const database = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes(`generation_metadata->>'job_id'`)) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('UPDATE jobs') && sql.includes('processing_started_at = CURRENT_TIMESTAMP') && sql.includes('RETURNING id')) {
          // The atomic claim fails: another live invocation's heartbeat kept
          // processing_started_at fresh, so this UPDATE matches zero rows.
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 1 };
      }),
    };

    const updateJobStatus = jest.fn().mockResolvedValue(undefined);

    const result = await AIGenerationJobService.processJob(
      baseJob(),
      { workerId: 'worker-2', updateJobStatus } as any,
      baseDeps(database)
    );

    // Must never touch generation at all — this is the whole point of the guard.
    expect(documentGenerationService.generateDocument).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.reason).toEqual(expect.stringContaining('already claimed'));

    // Must not have proceeded into the normal "processing" heartbeat sequence —
    // it exited before ever calling updateJobStatus.
    expect(updateJobStatus).not.toHaveBeenCalled();
  });

  it('claim query allows reclaiming once the previous holder\'s heartbeat has gone stale', async () => {
    (documentGenerationService.generateDocument as jest.Mock).mockResolvedValue({
      content: '## Doc\n\nContent.',
      metadata: { provider: 'mistral', model: 'mistral-large-2411', tokens_used: 10 },
    });

    const database = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes(`generation_metadata->>'job_id'`)) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('UPDATE jobs') && sql.includes('processing_started_at = CURRENT_TIMESTAMP') && sql.includes('RETURNING id')) {
          return { rows: [{ id: 'job-1' }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO documents')) {
          return { rows: [{ id: 'document-1' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      }),
    };

    await AIGenerationJobService.processJob(
      baseJob(),
      { workerId: 'worker-3', updateJobStatus: jest.fn().mockResolvedValue(undefined) } as any,
      baseDeps(database)
    );

    const claimCall = database.query.mock.calls.find(
      ([sql]: [string]) => sql.includes('UPDATE jobs') && sql.includes('RETURNING id') && sql.includes('processing_started_at')
    );
    expect(claimCall).toBeDefined();
    // The staleness fallback must be present so a genuinely dead holder's lease
    // can eventually be reclaimed rather than blocking the job forever.
    expect(claimCall![0]).toEqual(expect.stringContaining('processing_started_at IS NULL'));
    expect(claimCall![0]).toEqual(expect.stringContaining("INTERVAL '1 second'"));
  });
});
