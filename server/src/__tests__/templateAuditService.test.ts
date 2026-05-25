import { templateAuditService } from '../services/templateAuditService'
import { pool } from '../database/connection'
import { aiService } from '../services/aiService'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}))

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [] })
  }
}))

jest.mock('../services/aiService', () => ({
  aiService: {
    generateWithFallback: jest.fn()
  }
}))

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid-v4')
}))

describe('TemplateAuditService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create a pending audit and return the UUID', async () => {
    const spy = jest.spyOn(pool, 'query')
    const auditId = await templateAuditService.createPendingAudit('some-template-id', 'lifecycle')
    expect(auditId).toBeDefined()
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO template_audits'),
      expect.any(Array)
    )
  })

  it('should run audit, call AI services, and save verdict', async () => {
    const mockGenerate = aiService.generateWithFallback as jest.Mock
    mockGenerate.mockImplementation(async ({ aiCallType }) => {
      if (aiCallType === 'draco_governance_evaluation') {
        return { content: JSON.stringify({ score: 85, findings: ['Good structure'], recommendations: [], compliance_gaps: [] }) }
      } else {
        return { content: JSON.stringify({ score: 80, findings: [], recommendations: [], challenged_assumptions: [], logical_vulnerabilities: [] }) }
      }
    })

    const poolSpy = jest.spyOn(pool, 'query')
    const mockTemplate = { id: 'temp-id', name: 'Plan', framework: 'PMBOK' }

    await templateAuditService.runAudit('audit-id', mockTemplate)

    expect(mockGenerate).toHaveBeenCalledTimes(2)
    expect(poolSpy).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE template_audits'),
      expect.arrayContaining([83, 85, 80, 'pass'])
    )
  })
})
