import { AIProvider, AIProviderType, AIRequest, AIResponse } from '../../src/services/aiProviderService'

export class MockAIProvider implements AIProvider {
  public name: string
  public type: AIProviderType
  public callCount = 0
  public lastRequest: AIRequest | null = null
  public shouldFail = false
  public simulatedLatency = 0

  constructor(name: string = 'mock-provider', type: AIProviderType = 'openai') {
    this.name = name
    this.type = type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    this.callCount++
    this.lastRequest = request

    if (this.shouldFail) {
      throw new Error('Simulated AI Provider Timeout/Error')
    }

    if (this.simulatedLatency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.simulatedLatency))
    }

    return {
      content: `[MOCK AI RESPONSE] Processed prompt: ${request.prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: request.model || 'mock-model',
      provider: this.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return !this.shouldFail
  }

  async getModels(): Promise<string[]> {
    return ['mock-model-1', 'mock-model-2']
  }

  reset() {
    this.callCount = 0
    this.lastRequest = null
    this.shouldFail = false
    this.simulatedLatency = 0
  }
}
