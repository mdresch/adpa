import { ipRegistrationPipeline } from '../../../modules/ip-governance/IPRegistrationPipeline'
import { pool } from '../../../database/connection'

jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}))


describe('IPRegistrationPipeline (Contract Guards)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('REQ-IP-005: should initiate draft filing via document generation for approved claims', async () => {
    // Mock claim retrieval
    ;(pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'claim-123',
          project_id: 'proj-1',
          legal_review_status: 'approved',
          ip_classification: 'patent',
        },
      ],
    })

    // Mock document creation for the draft filing
    ;(pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 'doc-filing-123' }],
    })

    const result = await ipRegistrationPipeline.initiateRegistration('claim-123', 'APPROVE_FOR_FILING', 'sys-user')

    expect(result.filingDocumentId).toEqual(expect.any(String))
    expect(result.filingStatus).toBe('draft')
  })

  it('REQ-IP-005: should block registration if claim is not legally approved', async () => {
    // Mock claim retrieval showing pending status
    ;(pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 'claim-124',
          project_id: 'proj-1',
          legal_review_status: 'pending',
          ip_classification: 'patent',
        },
      ],
    })

    await expect(
      ipRegistrationPipeline.initiateRegistration('claim-124', 'APPROVE_FOR_FILING', 'sys-user')
    ).rejects.toThrow(/REQ-IP-005/)

  })

  it('REQ-IP-006: should track filing status updates', async () => {
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })

    await ipRegistrationPipeline.updateFilingStatus('claim-123', 'filed', 'US-12345', 'sys-user')

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE ip_claims'),
      expect.arrayContaining(['filed', 'US-12345', 'claim-123'])
    )
  })
})
