import { SearchMode } from '@/lib/morphic/types/search'
import { ModelType } from '@/lib/morphic/types/model-type'
import { Model } from '@/lib/morphic/types/models'
import { getModelsConfig } from './load-models-config'

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
 * Checks the database first for dynamic overrides, falls back to default.json.
 * For now, simplified to return static config.
 */
export async function getModelsForSlot(
    mode: SearchMode,
    type: ModelType
): Promise<Model[]> {
    // Fallback to static config
    const staticModel = getModelForModeAndType(mode, type)
    return staticModel ? [staticModel] : []
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
