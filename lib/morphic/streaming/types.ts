import { UIMessage } from 'ai'

import { ModelType } from '../types/model-type'
import { Model } from '../types/models'
import { SearchMode } from '../types/search'

export interface BaseStreamConfig {
    message: UIMessage | null
    model: Model
    chatId: string
    userId: string
    trigger?: 'submit-user-message' | 'regenerate-assistant-message' // Optimized names
    messageId?: string
    abortSignal?: AbortSignal
    isNewChat?: boolean
    searchMode?: SearchMode
    modelType?: ModelType
    knowledgeEnabled?: boolean
}
