import { VoyageAIClient } from 'voyageai';
import { config } from '../config';
import { logger, logEmbeddingGeneration } from '../utils/logger';
import { EmbeddingResult, RerankResult } from '../types';

export class VoyageAIService {
  private client: VoyageAIClient;

  constructor() {
    this.client = new VoyageAIClient({ 
      apiKey: config.voyageAI.apiKey 
    });
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async generateEmbeddings(
    texts: string[], 
    inputType: 'document' | 'query' = 'document'
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating embeddings', {
        textCount: texts.length,
        model: config.voyageAI.embeddingModel,
        inputType
      });

      const result = await this.client.embed({
        input: texts,
        model: config.voyageAI.embeddingModel,
        inputType
      });

      const duration = Date.now() - startTime;
      logEmbeddingGeneration(texts.length, config.voyageAI.embeddingModel, duration);

      return {
        embeddings: (result.data?.map(item => item.embedding).filter(Boolean) as number[][]) || [],
        usage: result.usage ? {
          total_tokens: result.usage.totalTokens || 0,
          prompt_tokens: 0,
          completion_tokens: 0
        } : undefined
      };

    } catch (error) {
      logger.log('error', 'Failed to generate embeddings', {
        textCount: texts.length,
        model: config.voyageAI.embeddingModel,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(
    text: string, 
    inputType: 'document' | 'query' = 'document'
  ): Promise<number[]> {
    const result = await this.generateEmbeddings([text], inputType);
    return result.embeddings[0];
  }

  /**
   * Rerank documents based on query relevance
   */
  async rerankDocuments(
    query: string, 
    documents: string[], 
    topK: number = 10
  ): Promise<RerankResult[]> {
    const startTime = Date.now();
    
    try {
      logger.info('Reranking documents', {
        documentCount: documents.length,
        query: query.substring(0, 100),
        model: config.voyageAI.rerankModel,
        topK
      });

      const result = await this.client.rerank({
        query,
        documents,
        model: config.voyageAI.rerankModel,
        topK
      });

      const duration = Date.now() - startTime;
      
      logger.info('Reranking completed', {
        documentCount: documents.length,
        topK: result.data?.length || 0,
        duration,
        topScore: result.data?.[0]?.relevanceScore || 0
      });

      return (result.data || []).map((item: any, index: number) => ({
        document: item.document,
        relevanceScore: item.relevanceScore,
        index
      }));

    } catch (error) {
      logger.log('error', 'Failed to rerank documents', {
        documentCount: documents.length,
        query: query.substring(0, 100),
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Batch process embeddings with retry logic
   */
  async batchGenerateEmbeddings(
    texts: string[], 
    batchSize: number = config.processing.batchSize,
    inputType: 'document' | 'query' = 'document'
  ): Promise<number[]> {
    const embeddings: number[] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      let retries = 0;
      const maxRetries = config.voyageAI.maxRetries;
      
      while (retries < maxRetries) {
        try {
          const result = await this.generateEmbeddings(batch, inputType);
          embeddings.push(...result.embeddings.flat());
          break;
        } catch (error) {
          retries++;
          
          if (retries >= maxRetries) {
            logger.log('error', 'Failed to generate embeddings after max retries', {
              batchIndex: Math.floor(i / batchSize),
              batchSize: batch.length,
              retries,
              error: (error as Error).message
            });
            throw error;
          }
          
          // Exponential backoff
          const delay = Math.pow(2, retries) * 1000;
          logger.warn(`Retrying embedding generation (attempt ${retries}/${maxRetries})`, {
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
  async testConnection(): Promise<boolean> {
    try {
      const testText = "This is a test text for connection validation.";
      await this.generateEmbedding(testText);
      
      logger.info('VoyageAI connection test successful');
      return true;
    } catch (error) {
      logger.log('error', 'VoyageAI connection test failed', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      embeddingModel: config.voyageAI.embeddingModel,
      rerankModel: config.voyageAI.rerankModel,
      embeddingDimensions: 1024, // voyage-4-large dimensions
      maxRetries: config.voyageAI.maxRetries,
      timeout: config.voyageAI.timeout
    };
  }
}

// Singleton instance
export const voyageAIService = new VoyageAIService();
