import { ipNoveltyAssessmentService } from '../../../modules/ip-governance/IPNoveltyAssessmentService'
import { pool } from '../../../database/connection'

jest.mock('../../../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}))

describe('IPNoveltyAssessmentService (Contract Guards)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('REQ-IP-001: should return zero novelty and "none" classification for standard boilerplate', async () => {
    // Mock origin verification as true
    ;(pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ metadata: { generation_run_id: 'gen-123' }, created_by: 'system' }],
    })
    
    // Mock prior art found
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          docs: [
            {
              patentNumber: '12345',
              inventionTitle: 'Standard API implementation',
              abstractText: 'A standard API implementation.',
              publicationDate: '2020-01-01'
            }
          ]
        }
      })
    })

    // Mock evidence document creation
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
    // Mock IP claim insertion
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
    // Mock audit log
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })

    // Simulate API key present to trigger fetch
    process.env.PATENT_USPTO_API_KEY = 'test-key'

    const result = await ipNoveltyAssessmentService.assessNovelty({
      projectId: 'proj-1',
      documentId: 'doc-1',
      driftRecordId: 'drift-123',
      driftPoints: [],
      positiveDrift: {
        driftCategory: 'innovation',
        metrics: {},
        description: 'Standard API implementation.', // Exact match to title to force 1.0 similarity
        strategicValue: 'Standard API implementation.',
      },
      triggeredBy: 'user-1',
    })

    // System origin is true -> 0.4.
    // Prior art high similarity > 0.60 -> prior art score 0.
    // No innovation keywords -> keyword score 0.
    // Total score 0.40. Classification 'none'.
    expect(result.noveltyScore).toBeCloseTo(0.40, 2)
    expect(result.ipClassification).toBe('none')
    expect(result.priorArtFound.length).toBeGreaterThan(0)
    expect(result.systemOriginVerified).toBe(true)
  })

  it('REQ-IP-002: should classify high-novelty proprietary algorithms as trade_secret or patent', async () => {
    // Mock origin verification as true
    ;(pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ metadata: { document_type: 'technical_spec' }, created_by: 'system' }],
    })
    
    // Mock no prior art found
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        response: { docs: [] }
      })
    })

    // Mock evidence document creation
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
    // Mock IP claim insertion
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
    // Mock audit log
    ;(pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })

    const result = await ipNoveltyAssessmentService.assessNovelty({
      projectId: 'proj-1',
      documentId: 'doc-1',
      driftRecordId: 'drift-124',
      driftPoints: [],
      positiveDrift: {
        driftCategory: 'innovation',
        metrics: { innovationValue: 250000 },
        description: 'A novel proprietary algorithm method', // Contains 'novel', 'proprietary', 'algorithm', 'method'
        strategicValue: 'Market differentiator',
      },
      triggeredBy: 'user-1',
    })

    // System origin true -> 0.40
    // No prior art -> 0.35
    // 4 keywords out of 7 -> (4/7) * 0.25 ≈ 0.14
    // Total score = 0.40 + 0.35 + 0.14 = 0.89
    expect(result.noveltyScore).toBeGreaterThanOrEqual(0.80)
    expect(result.ipClassification).toBe('patent')
    expect(result.priorArtFound.length).toBe(0)
  })
})
