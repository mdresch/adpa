import { enqueueEntityPersistence } from '../../../services/jobs/enqueueEntityPersistence'
import { addJob } from '../../../services/queueService'

jest.mock('../../../services/queueService', () => ({
  addJob: jest.fn(),
}))

const mockAddJob = addJob as jest.MockedFunction<typeof addJob>

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const DOCUMENT_ID = '22222222-2222-4222-8222-222222222222'
const USER_ID = '33333333-3333-4333-8333-333333333333'

describe('enqueueEntityPersistence routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAddJob.mockResolvedValue('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  })

  it('enqueues save-inline-entities when H8 tags are present', async () => {
    const content = [
      '# Plan',
      'Body text',
      '######## stakeholders: {"name":"Sponsor","role":"Executive"}',
    ].join('\n')

    const jobId = await enqueueEntityPersistence({
      projectId: PROJECT_ID,
      userId: USER_ID,
      documentId: DOCUMENT_ID,
      content,
      triggeredBy: 'test',
    })

    expect(jobId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    expect(mockAddJob).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledWith(
      'save-inline-entities',
      expect.objectContaining({
        projectId: PROJECT_ID,
        userId: USER_ID,
        documentId: DOCUMENT_ID,
        markdown: content,
        triggeredBy: 'test',
      }),
      expect.objectContaining({ attempts: 3 })
    )
  })

  it('enqueues extract-project-data when no H8 tags are present', async () => {
    const content = '# Plan\nNo entity tags here.'

    await enqueueEntityPersistence({
      projectId: PROJECT_ID,
      userId: null,
      documentId: DOCUMENT_ID,
      content,
      triggeredBy: 'test',
    })

    expect(mockAddJob).toHaveBeenCalledTimes(1)
    expect(mockAddJob).toHaveBeenCalledWith(
      'extract-project-data',
      expect.objectContaining({
        projectId: PROJECT_ID,
        userId: null,
        documentIds: [DOCUMENT_ID],
        sourceDocumentId: DOCUMENT_ID,
        triggeredBy: 'test',
      }),
      expect.objectContaining({ attempts: 3 })
    )
  })

  it('returns null when document content is empty', async () => {
    const jobId = await enqueueEntityPersistence({
      projectId: PROJECT_ID,
      userId: null,
      documentId: DOCUMENT_ID,
      content: '   ',
    })

    expect(jobId).toBeNull()
    expect(mockAddJob).not.toHaveBeenCalled()
  })
})
