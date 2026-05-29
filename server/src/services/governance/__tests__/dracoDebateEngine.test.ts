import { executeDracoDebate } from '../dracoDebateEngine';
import { unifiedAIService } from '../../unifiedAIService';
import { pool } from '../../../database/connection';
import { logger } from '../../../utils/logger';

// Mock infrastructure that causes issues in test environment
jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    flushAsync: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../../unifiedAIService');
jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn()
  },
  getDatabasePoolSafe: jest.fn(),
  connectDatabase: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('DracoDebateEngine', () => {
  const ruleCode = 'RULE-001';
  const documentType = 'TECHNICAL_SPEC';
  const templateGates = { minimumRequiredScore: 85, mandatoryKeywords: ['SECURITY', 'ISO27001'] };
  const trendData = { trend: 'downward', overrideRate: 0.15 };
  const failureLogs = [{ error: 'Timeout', timestamp: new Date().toISOString() }];

  beforeEach(() => {
    jest.clearAllMocks();
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ audit_id: 'test-audit-id' }] });
  });

  it('should return DRACO_CANDIDATE when all 3 debating agents approve and data is valid', async () => {
    // Layer 1: Validator
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { isValid: true, findings: 'Data valid', confidenceScore: 95 } });

    // Layer 2: Debaters
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { approved: true, rationale: 'Purist OK', proposedDescriptionUpdate: '...', proposedThresholdAdjustment: '...' } })
      .mockResolvedValueOnce({ object: { approved: true, rationale: 'Realist OK', proposedDescriptionUpdate: '...', proposedThresholdAdjustment: '...' } })
      .mockResolvedValueOnce({ object: { approved: true, rationale: 'Arbitrator OK', proposedDescriptionUpdate: 'New Desc', proposedThresholdAdjustment: 'New Threshold' } });

    const result = await executeDracoDebate(ruleCode, documentType, templateGates, trendData, failureLogs);

    expect(result.consensusAchieved).toBe(true);
    expect(result.finalStatus).toBe('DRACO_CANDIDATE');
    expect(result.patchPayload).toEqual({
      description: 'New Desc',
      thresholds: 'New Threshold'
    });
    
    // Verify that the debate ONLY happened after validation
    expect(unifiedAIService.generateStructuredObject).toHaveBeenCalledTimes(4);
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['DRACO_CANDIDATE'])
    );
  });

  it('should return DATA_INTEGRITY_FAILURE and abort debate when Evidence Validator fails', async () => {
    // Layer 1: Validator FAILS
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { isValid: false, findings: 'CRITICAL: CORRUPTED DATA DETECTED', confidenceScore: 10 } });

    const result = await executeDracoDebate(ruleCode, documentType, templateGates, trendData, failureLogs);

    expect(result.consensusAchieved).toBe(false);
    expect(result.finalStatus).toBe('DATA_INTEGRITY_FAILURE');
    expect(result.patchPayload).toBeNull();
    
    // VERIFY: The 3 debating agents were NEVER called
    expect(unifiedAIService.generateStructuredObject).toHaveBeenCalledTimes(1);
    
    // VERIFY: Database ledger captured the failure in the parameters
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['DATA_INTEGRITY_FAILURE'])
    );
  });

  it('should return COUNCIL_DEADLOCK when one debating agent dissents', async () => {
    // Validator PASSES
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { isValid: true, findings: 'Data valid', confidenceScore: 95 } });

    // Realist dissents
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { approved: true, rationale: 'Purist OK', proposedDescriptionUpdate: '...', proposedThresholdAdjustment: '...' } })
      .mockResolvedValueOnce({ object: { approved: false, rationale: 'Too much friction!', proposedDescriptionUpdate: '...', proposedThresholdAdjustment: '...' } })
      .mockResolvedValueOnce({ object: { approved: true, rationale: 'Arbitrator OK', proposedDescriptionUpdate: '...', proposedThresholdAdjustment: '...' } });

    const result = await executeDracoDebate(ruleCode, documentType, templateGates, trendData, failureLogs);

    expect(result.consensusAchieved).toBe(false);
    expect(result.finalStatus).toBe('COUNCIL_DEADLOCK');
    expect(result.patchPayload).toBeNull();

    // VERIFY: Database ledger captured the deadlock
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['COUNCIL_DEADLOCK'])
    );
  });

  it('should apply strict Purist bias for TECHNICAL_SPEC (Template Veto Test)', async () => {
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { isValid: true, findings: 'Data valid', confidenceScore: 95 } });

    // Mock responses to capture prompts
    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({ object: { approved: true } });

    await executeDracoDebate(ruleCode, 'TECHNICAL_SPEC', templateGates, trendData, failureLogs);

    // Verify Purist prompt contained the veto instruction
    const puristCall = (unifiedAIService.generateStructuredObject as jest.Mock).mock.calls.find(call => 
      call[0].traceName === 'draco-debate-purist'
    );
    expect(puristCall[0].prompt).toContain('Veto power: PURIST');
  });

  it('should apply Realist bias for OPERATIONAL_PLAYBOOK', async () => {
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { isValid: true, findings: 'Data valid', confidenceScore: 95 } });

    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({ object: { approved: true } });

    await executeDracoDebate(ruleCode, 'OPERATIONAL_PLAYBOOK', templateGates, trendData, failureLogs);

    const realistCall = (unifiedAIService.generateStructuredObject as jest.Mock).mock.calls.find(call => 
      call[0].traceName === 'draco-debate-realist'
    );
    expect(realistCall[0].prompt).toContain('Fight for simplicity');
  });

  it('should handle partial trend data correctly (Partial Data Test)', async () => {
    (unifiedAIService.generateStructuredObject as jest.Mock)
      .mockResolvedValueOnce({ object: { isValid: true, findings: 'Data incomplete but valid', confidenceScore: 60 } });

    (unifiedAIService.generateStructuredObject as jest.Mock).mockResolvedValue({ object: { approved: true } });

    const sparseTrend = { trend: 'unknown' };
    const result = await executeDracoDebate(ruleCode, documentType, templateGates, sparseTrend, []);

    expect(result.consensusAchieved).toBe(true);
    expect(unifiedAIService.generateStructuredObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('"trend": "unknown"')
    }));
  });
});
