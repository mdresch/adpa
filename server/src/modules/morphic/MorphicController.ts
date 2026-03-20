import { Request, Response } from 'express';
import { MorphicRepository } from './MorphicRepository';
import { createChatStreamResponse } from '../../../../lib/morphic/streaming/create-chat-stream-response';
import { pipeWebResponseToExpress } from '../../utils/stream';
import { selectModel } from '../../../../lib/morphic/utils/model-selection';
import { childLogger } from "../../utils/logger";
import { buildUIMessageFromDB } from '../../../../lib/morphic/utils/message-mapping';
import { CacheService } from '../../../../lib/kv';
import aiSearchRAGService from '../../services/aiSearchRAGService';
import { getTextFromParts } from '../../../../lib/morphic/utils/message-utils';
import { checkAndEnforceOverallChatLimit, checkAndEnforceGuestLimit } from '../../../../lib/morphic/rate-limit/chat-limits';

/**
 * MorphicController
 * Handles AI-Search (Morphic) requests.
 */
export class MorphicController {
    private static repository = new MorphicRepository();
    private static log = childLogger({ module: 'MorphicController' });

    /**
     * POST /api/morphic/chat
     * Entry point for AI search and chat.
     */
    static async chat(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { 
            message, 
            messages, 
            chatId, 
            trigger, 
            messageId, 
            ragScope,
            isNewChat,
            searchMode: requestedSearchMode,
            modelType: requestedModelType,
            knowledgeEnabled: requestedKnowledgeEnabled
        } = req.body;

        try {
            this.log.info('Morphic chat request received', { chatId, userId, isNewChat });

            // Enforce rate limits
            if (userId === 'anonymous-user') {
                const ip = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || null;
                await checkAndEnforceGuestLimit(ip);
            } else {
                await checkAndEnforceOverallChatLimit(userId);
            }

            const searchMode = requestedSearchMode || 'adaptive';
            const knowledgeEnabled = !!requestedKnowledgeEnabled;

            // Assemble context if needed
            let assistedContext: string | undefined;
            if (trigger === 'submit-user-message' && message && userId && searchMode === 'adaptive') {
                try {
                    const queryText = getTextFromParts(message.parts)?.trim();
                    if (queryText && queryText.length >= 2) {
                        const context = await aiSearchRAGService.assembleContext({
                            query: queryText,
                            limit: 10,
                            offset: 0,
                            sortBy: 'relevance',
                            includeRelationships: true,
                            relationshipDepth: 2,
                            includeKnowledgeBase: knowledgeEnabled,
                            maxContextItems: 8
                        }, userId);

                        assistedContext = context.contextPrompt;
                    }
                } catch (error) {
                    this.log.warn('Assisted context assembly failed:', error);
                }
            }

            // Mock cookie store for model selection
            const mockCookieStore = {
                get: (name: string) => {
                    if (name === 'modelType') return { value: requestedModelType || 'speed' };
                    if (name === 'searchMode') return { value: searchMode };
                    if (name === 'knowledgeEnabled') return { value: knowledgeEnabled ? 'true' : 'false' };
                    return undefined;
                }
            } as any;
            
            // Select model
            const selectedModel = selectModel({
                cookieStore: mockCookieStore,
                searchMode
            });

            // Model type resolution (forced to speed if not specified or for guest, but here we have userId)
            const modelType = requestedModelType || 'speed';

            // Create stream response using the shared logic
            const streamResponse = await createChatStreamResponse({
                message,
                model: selectedModel,
                chatId,
                userId,
                trigger,
                messageId,
                abortSignal: (req as any).abortSignal || undefined,
                isNewChat: !!isNewChat,
                searchMode,
                modelType: modelType as any,
                knowledgeEnabled,
                ragScope,
                dbActions: {
                    loadChatWithMessages: (id, uid) => this.repository.loadChat(id, uid || userId),
                    upsertMessage: (msg, uid) => this.repository.upsertMessage(msg, uid || userId),
                    createChat: (id, uid, title) => this.repository.createChat(id, uid || userId, title),
                    updateChatTitle: (id, title, uid) => this.repository.updateChatTitle(id, title, uid || userId)
                }
            });

            // Pipe Web Response to Express
            await pipeWebResponseToExpress(streamResponse, res);

        } catch (error: any) {
            this.log.error('Error in Morphic chat:', error);
            res.status(500).json({ 
                error: 'Internal Server Error', 
                details: error.message 
            });
        }
    }

    /**
     * GET /api/morphic/history
     * Retrieve chat history for the current user.
     */
    static async getHistory(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        try {
            // Morphic has its own DB.
            const chats = await this.repository.listChats(userId);
            
            // Handle pagination manually for now if listChats returns all
            const paginatedChats = chats.slice(offset, offset + limit);
            const nextOffset = offset + limit < chats.length ? offset + limit : null;

            res.json({
                chats: paginatedChats,
                nextOffset
            });
        } catch (error: any) {
            this.log.error('Error fetching Morphic history:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * GET /api/morphic/chat/:id
     * Retrieve a specific chat.
     */
    static async getChat(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const chatId = req.params.id;

        if (!userId || !chatId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const chat = await this.repository.loadChat(chatId, userId);
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }

            // Map DB messages to UI messages if needed
            const uiMessages = chat.messages.map((msg: any) => buildUIMessageFromDB(msg, msg.parts || []));

            res.json({
                ...chat,
                messages: uiMessages
            });
        } catch (error: any) {
            this.log.error(`Error fetching chat ${chatId}:`, error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * DELETE /api/morphic/chat/:id
     * Delete a specific chat.
     */
    static async deleteChat(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        const chatId = req.params.id;

        if (!userId || !chatId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const result = await this.repository.deleteChat(chatId, userId);
            res.json(result);
        } catch (error: any) {
            this.log.error(`Error deleting chat ${chatId}:`, error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
