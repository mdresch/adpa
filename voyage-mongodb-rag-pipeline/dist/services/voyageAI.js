"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voyageAIService = exports.VoyageAIService = void 0;
const voyageai_1 = require("voyageai");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class VoyageAIService {
    constructor() {
        this.client = new voyageai_1.VoyageAIClient({
            apiKey: config_1.config.voyageAI.apiKey
        });
    }
    /**
     * Generate embeddings for a batch of texts
     */
    async generateEmbeddings(texts, inputType = 'document') {
        const startTime = Date.now();
        try {
            logger_1.logger.info('Generating embeddings', {
                textCount: texts.length,
                model: config_1.config.voyageAI.embeddingModel,
                inputType
            });
            const result = await this.client.embed({
                input: texts,
                model: config_1.config.voyageAI.embeddingModel,
                inputType
            });
            const duration = Date.now() - startTime;
            (0, logger_1.logEmbeddingGeneration)(texts.length, config_1.config.voyageAI.embeddingModel, duration);
            return {
                embeddings: result.data?.map(item => item.embedding).filter(Boolean) || [],
                usage: result.usage ? {
                    total_tokens: result.usage.totalTokens || 0,
                    prompt_tokens: 0,
                    completion_tokens: 0
                } : undefined
            };
        }
        catch (error) {
            logger_1.logger.log('error', 'Failed to generate embeddings', {
                textCount: texts.length,
                model: config_1.config.voyageAI.embeddingModel,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generate embeddings for a single text
     */
    async generateEmbedding(text, inputType = 'document') {
        const result = await this.generateEmbeddings([text], inputType);
        return result.embeddings[0];
    }
    /**
     * Rerank documents based on query relevance
     */
    async rerankDocuments(query, documents, topK = 10) {
        const startTime = Date.now();
        try {
            logger_1.logger.info('Reranking documents', {
                documentCount: documents.length,
                query: query.substring(0, 100),
                model: config_1.config.voyageAI.rerankModel,
                topK
            });
            const result = await this.client.rerank({
                query,
                documents,
                model: config_1.config.voyageAI.rerankModel,
                topK
            });
            const duration = Date.now() - startTime;
            logger_1.logger.info('Reranking completed', {
                documentCount: documents.length,
                topK: result.data?.length || 0,
                duration,
                topScore: result.data?.[0]?.relevanceScore || 0
            });
            return (result.data || []).map((item, index) => ({
                document: item.document,
                relevanceScore: item.relevanceScore,
                index
            }));
        }
        catch (error) {
            logger_1.logger.log('error', 'Failed to rerank documents', {
                documentCount: documents.length,
                query: query.substring(0, 100),
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Batch process embeddings with retry logic
     */
    async batchGenerateEmbeddings(texts, batchSize = config_1.config.processing.batchSize, inputType = 'document') {
        const embeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            let retries = 0;
            const maxRetries = config_1.config.voyageAI.maxRetries;
            while (retries < maxRetries) {
                try {
                    const result = await this.generateEmbeddings(batch, inputType);
                    embeddings.push(...result.embeddings.flat());
                    break;
                }
                catch (error) {
                    retries++;
                    if (retries >= maxRetries) {
                        logger_1.logger.log('error', 'Failed to generate embeddings after max retries', {
                            batchIndex: Math.floor(i / batchSize),
                            batchSize: batch.length,
                            retries,
                            error: error.message
                        });
                        throw error;
                    }
                    // Exponential backoff
                    const delay = Math.pow(2, retries) * 1000;
                    logger_1.logger.warn(`Retrying embedding generation (attempt ${retries}/${maxRetries})`, {
                        delay,
                        batchIndex: Math.floor(i / batchSize)
                    });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        return embeddings;
    }
    /**
     * Test connection to VoyageAI API
     */
    async testConnection() {
        try {
            const testText = "This is a test text for connection validation.";
            await this.generateEmbedding(testText);
            logger_1.logger.info('VoyageAI connection test successful');
            return true;
        }
        catch (error) {
            logger_1.logger.log('error', 'VoyageAI connection test failed', {
                error: error.message
            });
            return false;
        }
    }
    /**
     * Get model information
     */
    getModelInfo() {
        return {
            embeddingModel: config_1.config.voyageAI.embeddingModel,
            rerankModel: config_1.config.voyageAI.rerankModel,
            embeddingDimensions: 1024, // voyage-4-large dimensions
            maxRetries: config_1.config.voyageAI.maxRetries,
            timeout: config_1.config.voyageAI.timeout
        };
    }
}
exports.VoyageAIService = VoyageAIService;
// Singleton instance
exports.voyageAIService = new VoyageAIService();
//# sourceMappingURL=voyageAI.js.map