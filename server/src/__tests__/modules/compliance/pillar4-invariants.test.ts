import { DRACOEngine } from '../../../modules/compliance/DRACOEngine'
import { AuditLogger } from '../../../modules/compliance/AuditLogger'

describe('Pillar 4: Compliance & DRACO Invariants', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should suspend execution on high-risk actions and enforce pre-response auditing', async () => {
    // REQ-CMP-001: Execute high risk actions
    const highRiskAction = async () => {
      return await DRACOEngine.executeHighRiskDocument({
        documentId: 'DOC-999',
        action: 'APPROVE_CONTRACT_BUDGET'
      })
    }

    // Invariant: Action must throw a suspension block if no override payload is provided
    await expect(highRiskAction()).rejects.toThrow('DRACO Execution Suspended: Human Override Required')

    // Simulate valid override payload injection
    const overridePayload = {
      approverId: 'USR-888',
      signature: '0x8f93a2c4e...',
      timestamp: Date.now()
    }

    const auditSpy = jest.spyOn(AuditLogger, 'persistLog')

    const result = await DRACOEngine.executeWithOverride({
      documentId: 'DOC-999',
      action: 'APPROVE_CONTRACT_BUDGET'
    }, overridePayload)

    // Invariant: Audit log must be persisted BEFORE the execution completes
    expect(auditSpy).toHaveBeenCalled()
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'APPROVE_CONTRACT_BUDGET',
      approverId: 'USR-888'
    }))
    expect(result.status).toBe('APPROVED')
  })
})
