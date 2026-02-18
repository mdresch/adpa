import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

import { getModelForModeAndType } from '@/lib/morphic/config/model-types'
import { ModelType } from '@/lib/morphic/types/model-type'
import { AIModel as Model } from '@/lib/morphic/types/models'
import { SearchMode } from '@/lib/morphic/types/search'
import { isProviderEnabled } from '@/lib/morphic/utils/registry'

const DEFAULT_MODEL: Model = {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    providerId: 'google',
    modelId: 'gemini-2.5-flash',
    isEnabled: true
}

const VALID_MODEL_TYPES: ModelType[] = ['speed', 'quality']
const MODE_FALLBACK_ORDER: SearchMode[] = ['quick', 'adaptive']

interface ModelSelectionParams {
    cookieStore: ReadonlyRequestCookies
    searchMode?: SearchMode
}

function resolveModelForModeAndType(
    mode: SearchMode,
    type: ModelType
): Model | undefined {
    try {
        const model = getModelForModeAndType(mode, type)
        if (!model) {
            return undefined
        }

        if (!isProviderEnabled(model.providerId)) {
            console.warn(
                `[ModelSelection] Provider "${model.providerId}" is not enabled for mode "${mode}" and model type "${type}"`
            )
            return undefined
        }

        return model
    } catch (error) {
        console.error(
            `[ModelSelection] Failed to load model configuration for mode "${mode}" and type "${type}":`,
            error
        )
        return undefined
    }
}

export function selectModel({
    cookieStore,
    searchMode
}: ModelSelectionParams): Model {
    const modelTypeCookie = cookieStore.get('modelType')?.value as
        | ModelType
        | undefined

    const requestedMode =
        searchMode && MODE_FALLBACK_ORDER.includes(searchMode)
            ? searchMode
            : 'quick'

    const typePreferenceOrder: ModelType[] = []
    if (
        modelTypeCookie &&
        VALID_MODEL_TYPES.includes(modelTypeCookie) &&
        !typePreferenceOrder.includes(modelTypeCookie)
    ) {
        typePreferenceOrder.push(modelTypeCookie)
    }

    for (const knownType of VALID_MODEL_TYPES) {
        if (!typePreferenceOrder.includes(knownType)) {
            typePreferenceOrder.push(knownType)
        }
    }

    const modePreferenceOrder: SearchMode[] = Array.from(
        new Set<SearchMode>([requestedMode, ...MODE_FALLBACK_ORDER])
    )

    for (const candidateMode of modePreferenceOrder) {
        for (const candidateType of typePreferenceOrder) {
            const model = resolveModelForModeAndType(candidateMode, candidateType)
            if (model) {
                return model
            }
        }
    }

    return DEFAULT_MODEL
}

export { DEFAULT_MODEL }
