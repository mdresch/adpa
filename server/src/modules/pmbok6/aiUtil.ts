// Utility to call the project's AIService with fallback for PMBOK process agents
import { aiService } from '../../services/aiService'
import type { AIGenerateRequest, AIGenerateResponse } from '../../services/aiService'

export async function runProcessWithAI(
  processCode: string,
  prompt: string,
  userId?: string,
  projectId?: string,
  documentId?: string
): Promise<AIGenerateResponse & { providerUsed: string }> {
  // Compose the request for the AIService
  const request: AIGenerateRequest = {
    prompt,
    provider: 'auto', // Let fallback system pick
    userId,
    projectId,
    documentId
  }
  // Use the fallback-aware AIService
  return aiService.generateWithFallback(request)
}
