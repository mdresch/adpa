import { relations } from 'drizzle-orm'
import { chats, messages, parts, aiProviders, aiModels, aiModelConfig } from './schema'

export const chatsRelations = relations(chats, ({ many }) => ({
    messages: many(messages)
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
    chat: one(chats, {
        fields: [messages.chatId],
        references: [chats.id]
    }),
    parts: many(parts)
}))

export const partsRelations = relations(parts, ({ one }) => ({
    message: one(messages, {
        fields: [parts.messageId],
        references: [messages.id]
    })
}))

export const aiProvidersRelations = relations(aiProviders, ({ many }) => ({
    models: many(aiModels)
}))

export const aiModelsRelations = relations(aiModels, ({ one, many }) => ({
    aiProvider: one(aiProviders, {
        fields: [aiModels.providerId],
        references: [aiProviders.id]
    }),
    configs: many(aiModelConfig)
}))

export const aiModelConfigRelations = relations(aiModelConfig, ({ one }) => ({
    aiModel: one(aiModels, {
        fields: [aiModelConfig.modelId],
        references: [aiModels.id]
    })
}))
