import { databaseService } from './database';
import { mongoDBEmbeddingService } from './mongoDBEmbeddings';
import { documentProcessor } from './documentProcessor';
import { config } from '../config';
import { logger, logSearchPerformance, logRAGPerformance } from '../utils/logger';
import { RAGRequest, RAGResponse, SearchResult, Document, DocumentChunk } from '../types';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import type Mistral from '@mistralai/mistralai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class RAGService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private mistral?: Mistral;
  private googleAI?: GoogleGenerativeAI;

  constructor() {
    // Initialize LLM clients based on configuration
    if (config.llm.provider === 'openai' && config.llm.apiKey) {
      this.openai = new OpenAI({ apiKey: config.llm.apiKey });
    } else if (config.llm.provider === 'anthropic' && config.llm.apiKey) {
      this.anthropic = new Anthropic({ apiKey: config.llm.apiKey });
    } else if (config.llm.provider === 'mistral' && config.llm.apiKey) {
      // Use dynamic import for ESM module
      import('@mistralai/mistralai').then(m => {
        const MistralClient = m.default || m;
        this.mistral = new (MistralClient as any)(config.llm.apiKey);
      }).catch(err => {
        logger.error('Failed to load Mistral SDK', { error: err.message });
      });
    } else if (config.llm.provider === 'google' && config.llm.apiKey) {
      this.googleAI = new GoogleGenerativeAI(config.llm.apiKey);
    }
  }

  /**
   * Perform a complete RAG query
   */
  async processRAGQuery(request: RAGRequest): Promise<RAGResponse> {
    const startTime = Date.now();
    const breakdown: any = {};

    try {
      // Ensure database is connected
      await databaseService.connect();

      logger.info('Processing RAG query', {
        query: request.query.substring(0, 100),
        maxResults: request.maxResults,
        includeReranking: request.includeReranking,
        llmProvider: request.llmProvider || config.llm.provider
      });

      // Step 1: Generate query embedding using MongoDB Atlas
      const embeddingStart = Date.now();
      const embeddings = await mongoDBEmbeddingService.generateEmbeddings(
        [request.query],
        'query'
      );
      const queryEmbedding = embeddings[0];
      breakdown.embeddingTime = Date.now() - embeddingStart;

      // Step 2: Vector search
      const searchStart = Date.now();
      const searchResults = await databaseService.vectorSearch(
        queryEmbedding,
        request.maxResults || 10,
        request.filters
      );
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
      const response: RAGResponse = {
        query: request.query,
        answer,
        sources: await this.formatSearchResults(rerankedResults),
        metadata: {
          totalResults: rerankedResults.length,
          processingTime: totalTime,
          ...breakdown
        }
      };

      logRAGPerformance(request.query, totalTime, breakdown);
      return response;

    } catch (error) {
      logger.log('error', 'RAG query processing failed', {
        query: request.query.substring(0, 100),
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Perform simple vector search without LLM response
   */
  async searchDocuments(
    query: string,
    maxResults: number = 10,
    filters?: any,
    includeReranking: boolean = false
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      // Ensure database is connected
      await databaseService.connect();

      // Generate query embedding using MongoDB Atlas
      const embeddings = await mongoDBEmbeddingService.generateEmbeddings([query], 'query');
      const queryEmbedding = embeddings[0];

      // Perform vector search
      const searchResults = await databaseService.vectorSearch(
        queryEmbedding,
        maxResults,
        filters
      );

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

      logSearchPerformance(query, formattedResults.length, Date.now() - startTime);
      return formattedResults;

    } catch (error) {
      logger.log('error', 'Document search failed', {
        query,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Generate LLM response based on query and context
   */
  private async generateLLMResponse(query: string, searchResults: any[]): Promise<string> {
    if (!this.openai && !this.anthropic && !this.mistral && !this.googleAI) {
      throw new Error('No LLM client configured');
    }

    // Prepare context from search results
    const context = searchResults
      .slice(0, 5) // Use top 5 results for context
      .map((result, index) =>
        `[Source ${index + 1}]: ${result.content}`
      )
      .join('\n\n');

    const prompt = `Based on the following context, please answer the question as accurately as possible. 
If the context doesn't contain enough information to answer the question, please say so.

Context:
${context}

Question: ${query}

Please provide a comprehensive answer based on the provided context.`;

    try {
      if (this.openai && config.llm.provider === 'openai') {
        const response = await this.openai.chat.completions.create({
          model: config.llm.model,
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
          max_tokens: config.llm.maxTokens,
          temperature: config.llm.temperature
        });

        return response.choices[0]?.message?.content || 'Unable to generate response.';
      }

      if (this.anthropic && config.llm.provider === 'anthropic') {
        const response = await this.anthropic.messages.create({
          model: config.llm.model,
          max_tokens: config.llm.maxTokens,
          temperature: config.llm.temperature,
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

      if (this.mistral && config.llm.provider === 'mistral') {
        const response = await this.mistral.chat({
          model: config.llm.model,
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
          maxTokens: config.llm.maxTokens,
          temperature: config.llm.temperature
        });

        return response.choices[0]?.message?.content || 'Unable to generate response.';
      }

      if (this.googleAI && config.llm.provider === 'google') {
        const model = this.googleAI.getGenerativeModel({
          model: config.llm.model,
          generationConfig: {
            maxOutputTokens: config.llm.maxTokens,
            temperature: config.llm.temperature
          }
        });

        const response = await model.generateContent(prompt);
        return response.response.text() || 'Unable to generate response.';
      }

      throw new Error('No LLM provider available');

    } catch (error) {
      logger.log('error', 'LLM response generation failed', {
        error: (error as Error).message
      });
      return 'Unable to generate response due to an error.';
    }
  }

  /**
   * Format search results with document information
   */
  private async formatSearchResults(searchResults: any[]): Promise<SearchResult[]> {
    const formattedResults: SearchResult[] = [];

    for (const result of searchResults) {
      // Get full document information
      const document = await databaseService.getDocument(result.documentId);

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
  async getSimilarDocuments(documentId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // Get the document and its chunks
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const chunks = await databaseService.getChunks(documentId);
      if (chunks.length === 0) {
        return [];
      }

      // Use the first chunk's embedding for similarity search
      const queryEmbedding = chunks[0].embedding;

      // Search for similar chunks (excluding chunks from the same document)
      const similarChunks = await databaseService.vectorSearch(
        queryEmbedding,
        limit * 2, // Get more results to filter out same document
        { documentId: { $ne: documentId } }
      );

      // Format and return results
      return await this.formatSearchResults(similarChunks.slice(0, limit));

    } catch (error) {
      logger.log('error', 'Failed to get similar documents', {
        documentId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Test the RAG pipeline
   */
  async testRAGPipeline(): Promise<boolean> {
    try {
      // Test MongoDB Atlas embeddings
      const embeddingsConnected = await mongoDBEmbeddingService.testConnection();
      if (!embeddingsConnected) {
        logger.error('MongoDB Atlas embeddings test failed');
        return false;
      }

      // Test database connection
      await databaseService.connect();
      const stats = await databaseService.getStats();
      logger.info('Database test successful', stats);

      // Test LLM connection if configured
      if (this.openai || this.anthropic || this.mistral || this.googleAI) {
        const testQuery = "What is the purpose of this system?";
        const testResponse = await this.generateLLMResponse(testQuery, []);
        logger.info('LLM test successful', { responseLength: testResponse.length });
      }

      logger.info('RAG pipeline test completed successfully');
      return true;

    } catch (error) {
      logger.log('error', 'RAG pipeline test failed', {
        error: (error as Error).message
      });
      return false;
    }
  }
}

// Singleton instance
export const ragService = new RAGService();
