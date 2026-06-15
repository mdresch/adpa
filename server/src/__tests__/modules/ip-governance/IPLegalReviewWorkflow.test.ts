import { ipLegalReviewWorkflow } from '../../../modules/ip-governance/IPLegalReviewWorkflow'
import { pool } from '../../../database/connection'
import { approvalWorkflowService } from '../../../services/approvalWorkflowService'
import { emailNotificationService } from '../../../services/emailNotificationService'
import { NoveltyAssessmentResult } from '../../../modules/ip-governance/IPNoveltyAssessmentService'

jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}))

jest.mock('../../../services/approvalWorkflowService', () => ({
  approvalWorkflowService: {
    findWorkflow: jest.fn(),
    createApprovalRequest: jest.fn(),
  },
}))

jest.mock('../../../services/emailNotificationService', () => ({
  emailNotificationService: {
    sendEmail: jest.fn(),
  },
}))

describe('IPLegalReviewWorkflow (Contract Guards)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('REQ-IP-003: should route >= 0.60 novelty to legal_reviewer via approvalWorkflowService', async () => {
    // Mock the approval request creation
    ;(approvalWorkflowService.createApprovalRequest as jest.Mock).mockResolvedValueOnce({
      id: 'ar-123',
    })

    // Mock the IP claim update
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
    // Mock the audit log insert
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
    // Mock user lookup for email recipients
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ email: 'test@example.com', name: 'Test User' }] })

    const assessment: NoveltyAssessmentResult = {
      id: 'claim-123',
      noveltyScore: 0.85,
      ipClassification: 'trade_secret',
      priorArtFound: false,
      reasoning: 'Novel logic',
      systemOriginVerified: true,
      evidenceDocumentId: 'doc-ev-123',
      driftRecordId: 'drift-123',
      projectId: 'proj-1',
      estimatedIpValue: 600000,
      priorArtFound: [],
      systemOriginVerified: true,
      technicalSummary: 'Test summary',
      createdAt: new Date(),
      recommendedAction: 'mark_trade_secret',
    }

    const result = await ipLegalReviewWorkflow.initiateReview(assessment, 'user-1')

    expect(approvalWorkflowService.createApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request_type: 'ip_novelty_review',
        priority: 'high',
        severity: 'low',
      })
    )
    expect(result.approvalRequestId).toBe('ar-123')
  })

  it('REQ-IP-004: should update IP claim status based on legal decision', async () => {
    // Mock the IP claim status update
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })

    const decision = await ipLegalReviewWorkflow.processLegalDecision(
      'claim-123',
      'ar-123',
      'approved',
      ['FILE_PATENT'],
      'Proceed with patent filing.',
      'legal-user-1'
    )

    expect(decision).toBe('APPROVE_FOR_FILING')
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE ip_claims'),
      expect.arrayContaining(['approved', 'legal-user-1', 'claim-123'])
    )
  })
})
