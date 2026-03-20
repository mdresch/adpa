import { UIMessage } from 'ai'

import { ModelType } from '../types/model-type'
import { Model } from '../types/models'
import { SearchMode } from '../types/search'

export interface RAGScope {
    program?: string
    project?: string
    template?: string
    entities?: string
}

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
    ragScope?: RAGScope
    assistedContext?: string
    dbActions?: {
        createChat: (id: string, userId: string, title: string) => Promise<any>
        upsertMessage: (message: any, userId: string) => Promise<any>
        loadChatWithMessages: (chatId: string, userId: string) => Promise<any>
        updateChatTitle: (chatId: string, title: string, userId: string) => Promise<any>
    }
}

