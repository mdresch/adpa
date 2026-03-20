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

    private get client() {
        if (!MorphicRepository._client) {
            const connectionString = process.env.MORPHIC_DATABASE_URL;
            if (!connectionString) {
                throw new Error('MORPHIC_DATABASE_URL is not set');
            }

            const sslConfig =
                process.env.DATABASE_SSL_DISABLED === 'true' || 
                process.env.DB_SSL === 'false' || 
                process.env.MORPHIC_DB_SSL === 'false'
                    ? false
                    : { rejectUnauthorized: false };

            this.log.info('Initializing Morphic Database connection (Railway)');
            
            MorphicRepository._client = postgres(connectionString, {
                ssl: sslConfig,
                prepare: false,
                max: 10,
                connect_timeout: 30,
                idle_timeout: 10
            });
        }
        return MorphicRepository._client;
    }

    /**
     * Load a chat with its messages.
     */
    async loadChat(chatId: string, userId: string) {
        try {
            const chatResult = await this.client`
                SELECT * FROM chats 
                WHERE id = ${chatId} AND (user_id = ${userId} OR visibility = 'public')
            `;
            
            if (chatResult.length === 0) return null;

            const messagesResult = await this.client`
                SELECT * FROM messages 
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
            return await this.client`
                INSERT INTO chats (id, title, user_id, visibility, created_at)
                VALUES (${id}, ${chatTitle}, ${userId}, 'private', NOW())
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    updated_at = NOW()
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
            return await this.client`
                INSERT INTO messages (id, chat_id, role, metadata, created_at)
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
            return await this.client`
                UPDATE chats 
                SET title = ${title}, updated_at = NOW()
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
            return await this.client`
                SELECT id, title, created_at, updated_at, visibility
                FROM chats 
                WHERE user_id = ${userId}
                ORDER BY updated_at DESC
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
            // Delete messages first
            await this.client`
                DELETE FROM messages WHERE chat_id = ${chatId} AND user_id = ${userId}
            `;
            // Delete chat
            const result = await this.client`
                DELETE FROM chats WHERE id = ${chatId} AND user_id = ${userId}
                RETURNING id
            `;
            return { success: result.length > 0 };
        } catch (error) {
            this.log.error(`Error deleting chat ${chatId}:`, error);
            throw error;
        }
    }
}
