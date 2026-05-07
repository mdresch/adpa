import { SearchMode } from '@/lib/morphic/types/search'
import { ModelType } from '@/lib/morphic/types/model-type'
import { Model } from '@/lib/morphic/types/models'
import { getModelsConfig } from './load-models-config'
import { db } from '@/lib/morphic/db'
import { aiProviders } from '@/lib/morphic/db/schema'
import { eq } from 'drizzle-orm'

function normalizeMorphicModelId(modelId?: string): string | undefined {
    if (!modelId) return modelId
    if (modelId === 'gemini-2.5-flash') {
        return 'gemini-3.1-flash-lite'
    }
    return modelId
}

// Retrieve the model assigned to a specific search mode and model type combination.
export function getModelForModeAndType(
    mode: SearchMode,
    type: ModelType
): Model | undefined {
    const cfg = getModelsConfig()
    const model = cfg.models.byMode?.[mode]?.[type]
    if (!model) return undefined

    const normalizedModelId = normalizeMorphicModelId(model.id)
    if (normalizedModelId === model.id) {
        return model
    }

    return {
        ...model,
        id: normalizedModelId!,
        modelId: normalizedModelId!,
        name: normalizedModelId === 'gemini-3.1-flash-lite' ? 'Gemini 3.1 Flash Lite' : model.name
    }
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
        // 0. Fetch explicit slots from aiModelConfig (The Mission Control override)
        // We import schema directly to ensure types
        const { aiModelConfig, aiModels, aiProviders: aiProvidersTable } = await import('@/lib/morphic/db/schema')
        
        const explicitConfigs = await db.query.aiModelConfig.findMany({
            where: (cfg, { and, eq }) => and(
                eq(cfg.searchMode, mode as any),
                eq(cfg.modelType, type as any)
            ),
            with: {
                aiModel: {
                    with: {
                        aiProvider: true
                    }
                }
            },
            orderBy: (cfg, { desc }) => [desc(cfg.priority)]
        })

        if (explicitConfigs && explicitConfigs.length > 0) {
            for (const cfg of explicitConfigs) {
                const model = cfg.aiModel
                const provider = model?.aiProvider
                if (model && provider && provider.isEnabled === 1 && model.isEnabled === 1) {
                    const normalizedModelId = normalizeMorphicModelId(model.modelId) || model.modelId
                    const fullId = `${provider.id}:${normalizedModelId}`
                    if (!addedModelIds.has(fullId)) {
                        candidates.push({
                            id: normalizedModelId!,
                            name: normalizedModelId === 'gemini-3.1-flash-lite'
                                ? `${provider.name}: Gemini 3.1 Flash Lite`
                                : `${provider.name}: ${model.name}`,
                            provider: provider.name,
                            providerId: provider.id,
                            modelId: normalizedModelId
                        })
                        addedModelIds.add(fullId)
                    }
                }
            }
        }

        // 1. Fetch active providers from DB (Discovery fallback)
        const activeProviders = await db.query.aiProviders.findMany({
            where: eq(aiProvidersTable.isEnabled, 1)
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
                const normalizedDefaultModel = normalizeMorphicModelId(provider.defaultModel) || provider.defaultModel
                const modelId = `${provider.id}:${normalizedDefaultModel}`
                if (!addedModelIds.has(modelId)) {
                    candidates.push({
                        id: normalizedDefaultModel!,
                        name: normalizedDefaultModel === 'gemini-3.1-flash-lite'
                            ? `${provider.name} (Default: Gemini 3.1 Flash Lite)`
                            : `${provider.name} (Default: ${normalizedDefaultModel})`,
                        provider: provider.name,
                        providerId: provider.id,
                        modelId: normalizedDefaultModel
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
                    const normalizedModelId = normalizeMorphicModelId(mId) || mId
                    const mName = normalizedModelId === 'gemini-3.1-flash-lite'
                        ? 'Gemini 3.1 Flash Lite'
                        : (typeof m === 'string' ? normalizedModelId : (m.name || m.id))
                    const fullId = `${provider.id}:${normalizedModelId}`
                    
                    if (!addedModelIds.has(fullId)) {
                        candidates.push({
                            id: normalizedModelId!,
                            name: `${provider.name}: ${mName}`,
                            provider: provider.name,
                            providerId: provider.id,
                            modelId: normalizedModelId
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
