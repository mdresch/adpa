import postgres from 'postgres'
import { childLogger } from "../../utils/logger"

/**
 * MorphicRepository
 * Handles interactions with the Morphic-specific database (Railway).
 * This is separate from the main ADPA database (Supabase).
 */
export class MorphicRepository {
    private static _client: postgres.Sql<{}> | null = null;
    private log = childLogger({ module: 'MorphicRepository' });

    /**
     * Get the active database client, falling back to main DB if Morphic DB is unavailable.
     */
    private async getClient() {
        if (MorphicRepository._client) return MorphicRepository._client;

        let morphicUrl = process.env.MORPHIC_DATABASE_URL || process.env.MORPHIC_DB_URL;
        const mainUrl = process.env.DATABASE_URL;

        if (morphicUrl) {
            // Trim quotes
            morphicUrl = morphicUrl.replace(/^["']|["']$/g, '');
            const sslConfig = process.env.MORPHIC_DB_SSL === 'false' ? false : { rejectUnauthorized: false };
            
            try {
                MorphicRepository._client = postgres(morphicUrl, {
                    ssl: sslConfig,
                    prepare: false,
                    connect_timeout: 5
                });
                return MorphicRepository._client;
            } catch (err) {
                this.log.warn('Failed to initialize Morphic DB client, falling back to main DB');
            }
        }

        if (mainUrl) {
            MorphicRepository._client = postgres(mainUrl, {
                ssl: { rejectUnauthorized: false },
                prepare: false
            });
            this.log.info('Morphic repository using main database as fallback');
            return MorphicRepository._client;
        }

        throw new Error('No database connection available');
    }

    /**
     * Execute a query with automatic fallback if the primary DB fails (e.g. Railway trial expired).
     */
    private async query(strings: TemplateStringsArray, ...values: any[]) {
        try {
            const client = await this.getClient();
            return await client(strings, ...values);
        } catch (error: any) {
            // Check for connection/subscription related errors
            const isConnectionError = error.message.includes('ECONNRESET') || 
                                     error.message.includes('ECONNREFUSED') ||
                                     error.message.includes('trial') ||
                                     error.message.includes('expired');

            if (isConnectionError && process.env.MORPHIC_DATABASE_URL) {
                this.log.warn('Morphic DB connection failed, attempting fallback to main DB...', error.message);
                
                // Reset client and try one more time with main DB fallback
                MorphicRepository._client = null;
                const fallbackClient = await this.getClient();
                return await fallbackClient(strings, ...values);
            }
            throw error;
        }
    }

    /**
     * Load a chat with its messages.
     */
    async loadChat(chatId: string, userId: string) {
        try {
            const chatResult = await this.query`
                SELECT * FROM morphic_chats 
                WHERE id = ${chatId} AND (user_id = ${userId} OR visibility = 'public')
            `;
            
            if (chatResult.length === 0) return null;
 
            const messagesResult = await this.query`
                SELECT * FROM morphic_messages 
                WHERE chat_id = ${chatId}
                ORDER BY created_at ASC
            `;

            return {
                ...chatResult[0],
                messages: messagesResult
            };
        } catch (error) {
            this.log.error(`Error loading chat ${chatId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new chat.
     */
    async createChat(id: string, userId: string, title?: string) {
        try {
            const chatTitle = title || 'Untitled';
            return await this.query`
                INSERT INTO morphic_chats (id, title, user_id, visibility, created_at)
                VALUES (${id}, ${chatTitle}, ${userId}, 'private', NOW())
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title
                RETURNING *
            `;
        } catch (error) {
            this.log.error('Error creating chat:', error);
            throw error;
        }
    }

    /**
     * Save a message.
     */
    async upsertMessage(message: any, userId: string) {
        try {
            const { id, chatId, role, metadata } = message;
            // Note: We don't store parts separately in this simplified repository yet, 
            // but we can add them if needed. For now, we store metadata.
            return await this.query`
                INSERT INTO morphic_messages (id, chat_id, role, metadata, created_at)
                VALUES (${id}, ${chatId}, ${role}, ${metadata || {}}, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    role = EXCLUDED.role,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
                RETURNING *
            `;
        } catch (error) {
            this.log.error('Error upserting message:', error);
            throw error;
        }
    }

    /**
     * Update chat title.
     */
    async updateChatTitle(chatId: string, title: string, userId: string) {
        try {
            return await this.query`
                UPDATE morphic_chats 
                SET title = ${title}
                WHERE id = ${chatId} AND (user_id = ${userId})
                RETURNING *
            `;
        } catch (error) {
            this.log.error(`Error updating title for chat ${chatId}:`, error);
            throw error;
        }
    }

    /**
     * List all chats for a user.
     */
    async listChats(userId: string) {
        try {
            return await this.query`
                SELECT id, title, created_at, visibility
                FROM morphic_chats 
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
            `;
        } catch (error) {
            this.log.error(`Error listing chats for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Delete a chat and its messages.
     */
    async deleteChat(chatId: string, userId: string): Promise<{ success: boolean }> {
        try {
            // Delete messages first (CASCADE should handle this but let's be safe and explicit)
            // Note: morphic_messages uses chat_id, and we filter by user_id from the chats table
            await this.query`
                DELETE FROM morphic_messages 
                WHERE chat_id = ${chatId} 
                AND chat_id IN (SELECT id FROM morphic_chats WHERE user_id = ${userId})
            `;
            // Delete chat
            const result = await this.query`
                DELETE FROM morphic_chats WHERE id = ${chatId} AND user_id = ${userId}
                RETURNING id
            `;
            return { success: result.length > 0 };
        } catch (error) {
            this.log.error(`Error deleting chat ${chatId}:`, error);
            throw error;
        }
    }
}
