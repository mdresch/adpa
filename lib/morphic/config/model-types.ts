import { SearchMode } from '@/lib/morphic/types/search'
import { ModelType } from '@/lib/morphic/types/model-type'
import { Model } from '@/lib/morphic/types/models'
import { getModelsConfig } from './load-models-config'
import { db } from '@/lib/morphic/db'
import { aiProviders } from '@/lib/morphic/db/schema'
import { eq } from 'drizzle-orm'

// Retrieve the model assigned to a specific search mode and model type combination.
export function getModelForModeAndType(
    mode: SearchMode,
    type: ModelType
): Model | undefined {
    const cfg = getModelsConfig()
    return cfg.models.byMode?.[mode]?.[type]
}

/**
 * Retrieves a list of models prioritized for a specific slot (mode + type).
 * Foundationally aligned with ADPA AIService:
 * 1. Checks active providers from DB first (prioritized)
 * 2. Uses provider's default_model or configured models if available
 * 3. Falls back to static config (default.json) if needed
 * 4. ALWAYS adds Ollama as the final mandatory fallback
 */
export async function getModelsForSlot(
    mode: SearchMode,
    type: ModelType
): Promise<Model[]> {
    const candidates: Model[] = []
    const addedModelIds = new Set<string>()

    try {
        // 1. Fetch active providers from DB
        const activeProviders = await db.query.aiProviders.findMany({
            where: eq(aiProviders.isEnabled, 1)
        })

        // Sort by priority (lower values = higher precedence)
        const sortedProviders = activeProviders.sort((a, b) => {
            const prioA = (a as any).priority ?? 100
            const prioB = (b as any).priority ?? 100
            return prioA - prioB
        })

        const staticModel = getModelForModeAndType(mode, type)

        // 2. For each active provider, find suitable models
        for (const provider of sortedProviders) {
            // A. If the provider has a default_model, prioritize it
            if (provider.defaultModel) {
                const modelId = `${provider.id}:${provider.defaultModel}`
                if (!addedModelIds.has(modelId)) {
                    candidates.push({
                        id: provider.defaultModel,
                        name: `${provider.name} (Default: ${provider.defaultModel})`,
                        provider: provider.name,
                        providerId: provider.id,
                        modelId: provider.defaultModel
                    })
                    addedModelIds.add(modelId)
                }
            }

            // B. If the provider matches the type of our static model, 
            // ensure the static model's ID is also an option for this provider
            if (staticModel && (provider.type === staticModel.providerId || provider.id === staticModel.providerId)) {
                const modelId = `${provider.id}:${staticModel.id}`
                if (!addedModelIds.has(modelId)) {
                    candidates.push({
                        ...staticModel,
                        providerId: provider.id,
                        provider: provider.name,
                        modelId: staticModel.id // mapping id to modelId for consistency
                    })
                    addedModelIds.add(modelId)
                }
            }

            // C. Include other available models from discovery if present
            if (provider.availableModels && Array.isArray(provider.availableModels)) {
                provider.availableModels.slice(0, 3).forEach((m: any) => {
                    const mId = typeof m === 'string' ? m : (m.id || m.name)
                    const mName = typeof m === 'string' ? m : (m.name || m.id)
                    const fullId = `${provider.id}:${mId}`
                    
                    if (!addedModelIds.has(fullId)) {
                        candidates.push({
                            id: mId,
                            name: `${provider.name}: ${mName}`,
                            provider: provider.name,
                            providerId: provider.id,
                            modelId: mId
                        })
                        addedModelIds.add(fullId)
                    }
                })
            }
        }
    } catch (error) {
        console.error('[ModelConfig] Failed to load dynamic providers:', error)
    }

    // 3. Add static model from config if not already added
    const staticModel = getModelForModeAndType(mode, type)
    if (staticModel) {
        const staticFullId = `${staticModel.providerId}:${staticModel.id}`
        if (!addedModelIds.has(staticFullId)) {
            candidates.push(staticModel as Model)
            addedModelIds.add(staticFullId)
        }
    }

    // 4. Mandatory Ollama fallback (ADPA senior mandate)
    const ollamaModelId = process.env.OLLAMA_MODEL || 'llama3.1'
    const ollamaFullId = `ollama:${ollamaModelId}`
    
    if (!addedModelIds.has(ollamaFullId)) {
        candidates.push({
            id: ollamaModelId,
            name: 'Ollama (Local Fallback)',
            provider: 'Ollama',
            providerId: 'ollama',
            modelId: ollamaModelId
        } as Model)
        addedModelIds.add(ollamaFullId)
    }

    return candidates
}

// Accessor for the related questions model configuration.
export function getRelatedQuestionsModel(): Model {
    const cfg = getModelsConfig()
    return cfg.models.relatedQuestions
}

/**
 * Retrieves the prioritized model for related questions.
 */
export async function getDynamicRelatedQuestionsModel(): Promise<Model> {
    const models = await getModelsForSlot('utility' as any, 'related_questions' as any)
    if (models.length > 0) {
        return models[0]
    }
    return getRelatedQuestionsModel()
}
