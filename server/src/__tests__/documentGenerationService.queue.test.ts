import { AIGenerationJobService } from '../services/jobs/AIGenerationJobService'

// Mock dependencies
const mockGenerateDocument = jest.fn().mockResolvedValue({ success: true, message: 'Document generated' })
const mockContextAwareGenerate = jest.fn().mockResolvedValue({ success: true })

// Mock documentGenerationService lazy load
jest.mock('../services/documentGenerationService', () => ({
  documentGenerationService: {
    generateDocument: mockGenerateDocument
  }
}))

// Mock contextAwareAIService lazy load 
jest.mock('../modules/context/integration', () => ({
  ContextAwareAIService: jest.fn().mockImplementation(() => ({
    generateWithContext: mockContextAwareGenerate
  }))
}))

describe('AIGenerationJobService', () => {
  let service: AIGenerationJobService

  beforeEach(() => {
    service = new AIGenerationJobService()
    jest.clearAllMocks()
  })

  it('should successfully execute generateDocument when template_id is present without lazy loading crashing', async () => {
    const jobData = {
      projectId: 'proj-123',
      prompt: 'Write a plan',
      provider: 'openai',
      template_id: 'template-abc',
      jobId: 'job-123',
      userId: 'user-123'
    }

    const mockUpdateStatus = jest.fn()

    await service.process(jobData, {
      workerId: 'worker-1',
      updateJobStatus: mockUpdateStatus
    })

    // It should lazy load the documentGenerationService and call generateDocument
    expect(mockGenerateDocument).toHaveBeenCalled()
    expect(mockGenerateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-123',
        name: 'AI Generated Document',
        userPrompt: 'Write a plan', // Note: mapped from prompt to userPrompt inside process
        provider: 'openai',
        templateId: 'template-abc'
      }),
      expect.any(Function)
    )

    // Job status should be updated
    expect(mockUpdateStatus).toHaveBeenCalledWith('job-123', 'processing', expect.any(Number), 'worker-1', undefined, undefined)
  })

  it('should fallback to ContextAwareAIService when template_id is missing', async () => {
    const jobData = {
      projectId: 'proj-123',
      prompt: 'Write a plan without template',
      provider: 'openai',
      jobId: 'job-123',
      userId: 'user-123'
    }

    const mockUpdateStatus = jest.fn()

    await service.process(jobData, {
      workerId: 'worker-1',
      updateJobStatus: mockUpdateStatus
    })

    // It should lazy load ContextAwareAIService and call generateWithContext
    expect(mockContextAwareGenerate).toHaveBeenCalled()
    expect(mockGenerateDocument).not.toHaveBeenCalled()
  })
})
