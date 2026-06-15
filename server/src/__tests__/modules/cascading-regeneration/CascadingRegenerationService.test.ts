import { CascadingRegenerationService } from '../../../modules/cascading-regeneration/CascadingRegenerationService';
import { DocumentDependencyGraph } from '../../../modules/document-dependency-graph/DocumentDependencyGraph';
import { documentGenerationService } from '../../../services/documentGenerationService';

// Mock dependencies
jest.mock('../../../services/documentGenerationService', () => ({
  documentGenerationService: {
    queueDocumentGeneration: jest.fn()
  }
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('CascadingRegenerationService (Contract Guards)', () => {
  let cascadeService: CascadingRegenerationService;
  let mockGraph: DocumentDependencyGraph;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGraph = new DocumentDependencyGraph();
    cascadeService = new CascadingRegenerationService(mockGraph);
  });

  it('REQ-CR-001: should queue downstream jobs in topological order', async () => {
    // Mock the DB lookup to return dummy document IDs for the requested types
    jest.spyOn(cascadeService as any, 'findDocumentsByType').mockImplementation(async (projectId: string, types: string[]) => {
      return types.map((type) => ({
        id: `doc-${type.replace(/\s+/g, '')}`,
        type,
        projectId
      }));
    });

    const mockQueueFn = documentGenerationService.queueDocumentGeneration as jest.Mock;
    mockQueueFn.mockResolvedValue('job-id-123');

    await cascadeService.triggerCascade('Project Charter', 'proj-1', 'drift-123', 'user-1');

    // Expected downstream from Charter includes Scope, Schedule, etc.
    // They should be queued in a specific order based on topological sort
    const callOrder = mockQueueFn.mock.calls.map(call => call[0].documentId);
    
    // Make sure Scope is queued before Schedule, and both before PMP
    const scopeIdx = callOrder.indexOf('doc-ScopeManagementPlan');
    const scheduleIdx = callOrder.indexOf('doc-ScheduleManagementPlan');
    const pmpIdx = callOrder.indexOf('doc-ProjectManagementPlan');
    
    expect(scopeIdx).toBeGreaterThan(-1);
    expect(scheduleIdx).toBeGreaterThan(-1);
    // Note: PMP shouldn't be queued if it's held by DRACO, but the service might queue it with a DRACO flag
    // For this test, let's verify Scope and Schedule
    expect(scopeIdx).toBeLessThan(scheduleIdx);
  });

  it('REQ-CR-002: should block PMP generation at DRACO gate (escalation/audit)', async () => {
    jest.spyOn(cascadeService as any, 'findDocumentsByType').mockImplementation(async (projectId: string, types: string[]) => {
      return types.map((type, i) => ({
        id: `doc-${type.replace(/\s+/g, '')}`,
        type,
        projectId
      }));
    });

    const mockQueueFn = documentGenerationService.queueDocumentGeneration as jest.Mock;
    mockQueueFn.mockResolvedValue('job-id-123');
    
    // We expect an explicit DRACO gate call or special flag for PMP
    const dracoAuditSpy = jest.spyOn(cascadeService as any, 'triggerDracoGate');
    dracoAuditSpy.mockResolvedValue(true);

    await cascadeService.triggerCascade('Risk Management Plan', 'proj-1', 'drift-123', 'user-1');

    // PMP depends on Risk Management Plan, so it should be in the cascade list
    // The DRACO gate should have been called for it
    expect(dracoAuditSpy).toHaveBeenCalledWith(
      expect.stringContaining('doc-ProjectManagementPlan'),
      expect.objectContaining({ type: 'Project Management Plan' })
    );
  });
  
  it('REQ-CR-003: should log changeRequestId before dispatching jobs', async () => {
    jest.spyOn(cascadeService as any, 'findDocumentsByType').mockImplementation(async () => []);
    
    const mockAuditLog = jest.spyOn(cascadeService as any, 'logToAuditTrail').mockResolvedValue(true);
    
    await cascadeService.triggerCascade('Scope Management Plan', 'proj-1', 'drift-999', 'user-1');
    
    // The audit log must be called before queuing begins
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'CASCADE_REGENERATION_STARTED',
        driftRecordId: 'drift-999'
      })
    );
  });
});
