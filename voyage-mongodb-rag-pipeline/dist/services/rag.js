"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragService = exports.RAGService = void 0;
const database_1 = require("./database");
const mongoDBEmbeddings_1 = require("./mongoDBEmbeddings");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const openai_1 = __importDefault(require("openai"));
const sdk_1 = require("@anthropic-ai/sdk");
const mistralai_1 = __importDefault(require("@mistralai/mistralai"));
const generative_ai_1 = require("@google/generative-ai");
class RAGService {
    constructor() {
        // Initialize LLM clients based on configuration
        if (config_1.config.llm.provider === 'openai' && config_1.config.llm.apiKey) {
            this.openai = new openai_1.default({ apiKey: config_1.config.llm.apiKey });
        }
        else if (config_1.config.llm.provider === 'anthropic' && config_1.config.llm.apiKey) {
            this.anthropic = new sdk_1.Anthropic({ apiKey: config_1.config.llm.apiKey });
        }
        else if (config_1.config.llm.provider === 'mistral' && config_1.config.llm.apiKey) {
            this.mistral = new mistralai_1.default(config_1.config.llm.apiKey);
        }
        else if (config_1.config.llm.provider === 'google' && config_1.config.llm.apiKey) {
            this.googleAI = new generative_ai_1.GoogleGenerativeAI(config_1.config.llm.apiKey);
        }
    }
    /**
     * Perform a complete RAG query
     */
    async processRAGQuery(request) {
        const startTime = Date.now();
        const breakdown = {};
        try {
            // Ensure database is connected
            await database_1.databaseService.connect();
            logger_1.logger.info('Processing RAG query', {
                query: request.query.substring(0, 100),
                maxResults: request.maxResults,
                includeReranking: request.includeReranking,
                llmProvider: request.llmProvider || config_1.config.llm.provider
            });
            // Step 1: Generate query embedding using MongoDB Atlas
            const embeddingStart = Date.now();
            const embeddings = await mongoDBEmbeddings_1.mongoDBEmbeddingService.generateEmbeddings([request.query], 'query');
            const queryEmbedding = embeddings[0];
            breakdown.embeddingTime = Date.now() - embeddingStart;
            // Step 2: Vector search
            const searchStart = Date.now();
            const searchResults = await database_1.databaseService.vectorSearch(queryEmbedding, request.maxResults || 10, request.filters);
            breakdown.searchTime = Date.now() - searchStart;
            // Step 3: Reranking (if requested)
            let rerankedResults = searchResults;
            if (request.includeReranking && searchResults.length > 1) {
                const rerankStart = Date.now();
                // Skip reranking for now - MongoDB Atlas doesn't have reranking
                // const documents = searchResults.map(result => result.content);
                // const reranked = await voyageAIService.rerankDocuments(
                //   request.query,
                //   documents,
                //   Math.min(request.maxResults || 10, documents.length)
                // );
                const reranked = searchResults;
                // For now, just use search results as reranked results
                rerankedResults = reranked;
                breakdown.rerankingTime = Date.now() - rerankStart;
            }
            // Step 4: Generate LLM response
            let answer = '';
            if (this.openai || this.anthropic || this.mistral || this.googleAI) {
                const llmStart = Date.now();
                answer = await this.generateLLMResponse(request.query, rerankedResults);
                breakdown.llmTime = Date.now() - llmStart;
            }
            // Step 5: Format response
            const totalTime = Date.now() - startTime;
            const response = {
                query: request.query,
                answer,
                sources: await this.formatSearchResults(rerankedResults),
                metadata: {
                    totalResults: rerankedResults.length,
                    processingTime: totalTime,
                    ...breakdown
                }
            };
            (0, logger_1.logRAGPerformance)(request.query, totalTime, breakdown);
            return response;
        }
        catch (error) {
            logger_1.logger.log('error', 'RAG query processing failed', {
                query: request.query.substring(0, 100),
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Perform simple vector search without LLM response
     */
    async searchDocuments(query, maxResults = 10, filters, includeReranking = false) {
        const startTime = Date.now();
        try {
            // Ensure database is connected
            await database_1.databaseService.connect();
            // Generate query embedding using MongoDB Atlas
            const embeddings = await mongoDBEmbeddings_1.mongoDBEmbeddingService.generateEmbeddings([query], 'query');
            const queryEmbedding = embeddings[0];
            // Perform vector search
            const searchResults = await database_1.databaseService.vectorSearch(queryEmbedding, maxResults, filters);
            // Rerank if requested
            let finalResults = searchResults;
            // Skip reranking for now - MongoDB Atlas doesn't have reranking
            // if (includeReranking && searchResults.length > 1) {
            //   const documents = searchResults.map(result => result.content);
            //   const reranked = await mongoDBEmbeddingService.rerankDocuments(
            //     query,
            //     documents,
            //     Math.min(maxResults, documents.length)
            //   );
            //   finalResults = reranked;
            // }
            const formattedResults = await this.formatSearchResults(finalResults);
            (0, logger_1.logSearchPerformance)(query, formattedResults.length, Date.now() - startTime);
            return formattedResults;
        }
        catch (error) {
            logger_1.logger.log('error', 'Document search failed', {
                query,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Generate LLM response based on query and context
     */
    async generateLLMResponse(query, searchResults) {
        if (!this.openai && !this.anthropic && !this.mistral && !this.googleAI) {
            throw new Error('No LLM client configured');
        }
        // Prepare context from search results
        const context = searchResults
            .slice(0, 5) // Use top 5 results for context
            .map((result, index) => `[Source ${index + 1}]: ${result.content}`)
            .join('\n\n');
        const prompt = `Based on the following context, please answer the question as accurately as possible. 
If the context doesn't contain enough information to answer the question, please say so.

Context:
${context}

Question: ${query}

Please provide a comprehensive answer based on the provided context.`;
        try {
            if (this.openai && config_1.config.llm.provider === 'openai') {
                const response = await this.openai.chat.completions.create({
                    model: config_1.config.llm.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that answers questions based on provided context. Always be accurate and cite your sources when possible.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: config_1.config.llm.maxTokens,
                    temperature: config_1.config.llm.temperature
                });
                return response.choices[0]?.message?.content || 'Unable to generate response.';
            }
            if (this.anthropic && config_1.config.llm.provider === 'anthropic') {
                const response = await this.anthropic.messages.create({
                    model: config_1.config.llm.model,
                    max_tokens: config_1.config.llm.maxTokens,
                    temperature: config_1.config.llm.temperature,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                });
                const textContent = response.content.find(item => item.type === 'text');
                return textContent?.text || 'Unable to generate response.';
            }
            if (this.mistral && config_1.config.llm.provider === 'mistral') {
                const response = await this.mistral.chat({
                    model: config_1.config.llm.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that answers questions based on provided context. Always be accurate and cite your sources when possible.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    maxTokens: config_1.config.llm.maxTokens,
                    temperature: config_1.config.llm.temperature
                });
                return response.choices[0]?.message?.content || 'Unable to generate response.';
            }
            if (this.googleAI && config_1.config.llm.provider === 'google') {
                const model = this.googleAI.getGenerativeModel({
                    model: config_1.config.llm.model,
                    generationConfig: {
                        maxOutputTokens: config_1.config.llm.maxTokens,
                        temperature: config_1.config.llm.temperature
                    }
                });
                const response = await model.generateContent(prompt);
                return response.response.text() || 'Unable to generate response.';
            }
            throw new Error('No LLM provider available');
        }
        catch (error) {
            logger_1.logger.log('error', 'LLM response generation failed', {
                error: error.message
            });
            return 'Unable to generate response due to an error.';
        }
    }
    /**
     * Format search results with document information
     */
    async formatSearchResults(searchResults) {
        const formattedResults = [];
        for (const result of searchResults) {
            // Get full document information
            const document = await database_1.databaseService.getDocument(result.documentId);
            if (document) {
                formattedResults.push({
                    chunk: {
                        id: result._id?.toString() || '',
                        documentId: result.documentId,
                        content: result.content,
                        embedding: [], // Not including embedding in response
                        metadata: result.metadata || {},
                        createdAt: result.createdAt || new Date()
                    },
                    document,
                    score: result.score || 0,
                    relevanceScore: result.relevanceScore
                });
            }
        }
        return formattedResults;
    }
    /**
     * Get similar documents based on a document ID
     */
    async getSimilarDocuments(documentId, limit = 5) {
        try {
            // Get the document and its chunks
            const document = await database_1.databaseService.getDocument(documentId);
            if (!document) {
                throw new Error(`Document not found: ${documentId}`);
            }
            const chunks = await database_1.databaseService.getChunks(documentId);
            if (chunks.length === 0) {
                return [];
            }
            // Use the first chunk's embedding for similarity search
            const queryEmbedding = chunks[0].embedding;
            // Search for similar chunks (excluding chunks from the same document)
            const similarChunks = await database_1.databaseService.vectorSearch(queryEmbedding, limit * 2, // Get more results to filter out same document
            { documentId: { $ne: documentId } });
            // Format and return results
            return await this.formatSearchResults(similarChunks.slice(0, limit));
        }
        catch (error) {
            logger_1.logger.log('error', 'Failed to get similar documents', {
                documentId,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Test the RAG pipeline
     */
    async testRAGPipeline() {
        try {
            // Test MongoDB Atlas embeddings
            const embeddingsConnected = await mongoDBEmbeddings_1.mongoDBEmbeddingService.testConnection();
            if (!embeddingsConnected) {
                logger_1.logger.error('MongoDB Atlas embeddings test failed');
                return false;
            }
            // Test database connection
            await database_1.databaseService.connect();
            const stats = await database_1.databaseService.getStats();
            logger_1.logger.info('Database test successful', stats);
            // Test LLM connection if configured
            if (this.openai || this.anthropic || this.mistral || this.googleAI) {
                const testQuery = "What is the purpose of this system?";
                const testResponse = await this.generateLLMResponse(testQuery, []);
                logger_1.logger.info('LLM test successful', { responseLength: testResponse.length });
            }
            logger_1.logger.info('RAG pipeline test completed successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.log('error', 'RAG pipeline test failed', {
                error: error.message
            });
            return false;
        }
    }
}
exports.RAGService = RAGService;
// Singleton instance
exports.ragService = new RAGService();
//# sourceMappingURL=rag.js.map