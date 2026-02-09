
import { VoyageAIClient } from 'voyageai';
import { logger } from '../utils/logger';

// TODO: Add to types
export interface EmbeddingResult {
    embeddings: number[][];
    usage?: {
        total_tokens: number;
        prompt_tokens: number;
        completion_tokens: number;
    };
}

export interface RerankResult {
    document: string;
    relevanceScore: number;
    index: number;
}

const API_KEY = process.env.VOYAGE_API_KEY;
const EMBEDDING_MODEL = process.env.VOYAGE_EMBEDDING_MODEL || 'voyage-4-large';
const RERANK_MODEL = process.env.VOYAGE_RERANK_MODEL || 'rerank-2';

export class VoyageAIService {
    private client: VoyageAIClient | null = null;

    constructor() {
        if (API_KEY) {
            this.client = new VoyageAIClient({
                apiKey: API_KEY
            });
        } else {
            logger.warn('VOYAGE_API_KEY not set. VoyageAIService will fail if used.');
        }
    }

    private ensureClient() {
        if (!this.client) {
            throw new Error('VoyageAI client not initialized. Missing VOYAGE_API_KEY.');
        }
        return this.client;
    }

    async generateEmbeddings(
        texts: string[],
        inputType: 'document' | 'query' = 'document'
    ): Promise<EmbeddingResult> {
        const startTime = Date.now();
        const client = this.ensureClient();

        try {
            logger.info('Generating embeddings', {
                textCount: texts.length,
                model: EMBEDDING_MODEL,
                inputType
            });

            const result = await client.embed({
                input: texts,
                model: EMBEDDING_MODEL,
                inputType
            });

            const duration = Date.now() - startTime;
            logger.info('Embedding generation complete', { duration });

            return {
                embeddings: (result.data?.map(item => item.embedding).filter(Boolean) as number[][]) || [],
                usage: result.usage ? {
                    total_tokens: result.usage.totalTokens || 0,
                    prompt_tokens: 0,
                    completion_tokens: 0
                } : undefined
            };

        } catch (error) {
            logger.error('Failed to generate embeddings', {
                textCount: texts.length,
                model: EMBEDDING_MODEL,
                error: (error as Error).message
            });
            throw error;
        }
    }

    async generateEmbedding(
        text: string,
        inputType: 'document' | 'query' = 'document'
    ): Promise<number[]> {
        const result = await this.generateEmbeddings([text], inputType);
        return result.embeddings[0];
    }

    async rerankDocuments(
        query: string,
        documents: string[],
        topK: number = 10
    ): Promise<RerankResult[]> {
        const startTime = Date.now();
        const client = this.ensureClient();

        try {
            logger.info('Reranking documents', {
                documentCount: documents.length,
                query: query.substring(0, 100),
                model: RERANK_MODEL,
                topK
            });

            const result = await client.rerank({
                query,
                documents,
                model: RERANK_MODEL,
                topK
            });

            const duration = Date.now() - startTime;

            return (result.data || []).map((item: any, index: number) => ({
                document: item.document,
                relevanceScore: item.relevanceScore,
                index
            }));

        } catch (error) {
            logger.error('Failed to rerank documents', {
                documentCount: documents.length,
                query: query.substring(0, 100),
                error: (error as Error).message
            });
            throw error;
        }
    }
}

export const voyageAIService = new VoyageAIService();
