import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { unifiedAIService } from './aiService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Document Summarization Service
 * 
 * Generates multi-level summaries (20%, 40%, 60%, 80%) for documents.
 * Optimized for RAG: Strips H8 tags and entity metadata to provide clean narrative context.
 */
export class DocumentSummarizationService {
  
  /**
   * Generates all requested summary levels for a document.
   * Executed as a background process.
   */
  static async generateMultiLevelSummaries(documentId: string, content: string, userId: string): Promise<void> {
    logger.info(`[SUMMARIZER] Starting multi-level summarization for document ${documentId}`);

    // 1. Scrub H8 tags and entity JSON for RAG optimization
    const cleanContent = this.scrubH8Markers(content);
    
    if (!cleanContent || cleanContent.trim().length < 100) {
      logger.warn(`[SUMMARIZER] Content too short for meaningful summarization (${documentId})`);
      return;
    }

    const levels = [20, 40, 60, 80];
    
    // Execute all levels in parallel
    await Promise.all(levels.map(level => 
      this.generateAndStoreSummary(documentId, cleanContent, level, userId)
    ));

    logger.info(`[SUMMARIZER] Completed multi-level summarization for document ${documentId}`);
  }

  /**
   * Saves pre-generated summaries to the database.
   * Used for in-band summarization where the LLM returns summaries in the main call.
   */
  static async saveSummaries(
    documentId: string, 
    originalContent: string,
    summaries: Array<{ level: number, content: string }>,
    provider: string,
    model: string
  ): Promise<void> {
    const originalTokens = Math.ceil(originalContent.length / 4);
    // Use a fixed hash for manual/in-band summaries to satisfy unique index
    const contextHash = crypto.createHash('md5').update(originalContent.substring(0, 1000)).digest('hex');
    
    await Promise.all(summaries.map(async (s) => {
      const compressedTokens = Math.ceil(s.content.length / 4);
      const compressionRatio = compressedTokens / originalTokens;

      await pool.query(
        `INSERT INTO document_summaries (
          id, document_id, compression_method, compression_level, 
          target_tokens, original_content, original_tokens, 
          compressed_content, compressed_tokens, compression_ratio,
          ai_provider, ai_model, is_valid, template_context_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, NOW(), NOW())
        ON CONFLICT (document_id, compression_level, compression_method, template_context_hash) 
        DO UPDATE SET
          compressed_content = EXCLUDED.compressed_content,
          compressed_tokens = EXCLUDED.compressed_tokens,
          compression_ratio = EXCLUDED.compression_ratio,
          ai_provider = EXCLUDED.ai_provider,
          ai_model = EXCLUDED.ai_model,
          updated_at = NOW()`,
        [
          uuidv4(),
          documentId,
          'mission-draco-rag',
          s.level,
          Math.ceil(originalTokens * (s.level / 100)),
          originalContent,
          originalTokens,
          s.content,
          compressedTokens,
          compressionRatio,
          provider,
          model,
          contextHash
        ]
      ).catch(err => logger.error(`[SUMMARIZER] Failed to save ${s.level}% summary for ${documentId}:`, err.message));
    }));
  }

  /**
   * Strips all H8 Entity tags and JSON blobs from the markdown.
   */
  private static scrubH8Markers(content: string): string {
    if (!content) return "";
    // Match lines starting with ######## up to the end of the line
    const h8Regex = /^########\s+([a-zA-Z0-9_-]+):\s*(.*)$/gm;
    return content.replace(h8Regex, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  /**
   * Generates a single summary level and persists it to document_summaries.
   */
  private static async generateAndStoreSummary(
    documentId: string, 
    content: string, 
    level: number, 
    userId: string
  ): Promise<void> {
    try {
      const prompt = `You are a Senior Technical Summarizer for Mission Draco.
Your task is to summarize the following project document to exactly ${level}% of its original length.

### MANDATORY CONSTRAINTS:
1. DO NOT include any system markers, H8 tags, or JSON metadata.
2. DO NOT include list-style entity dumps (Stakeholders, Risks, etc.) as these live in other tables.
3. FOCUS on the narrative reasoning, strategic intent, and technical logic of the document.
4. MAINTAIN the original engineering depth and professional tone.
5. PROVIDE a clean, high-density narrative optimized for RAG and vector search.

Original Document Content:
---
${content}
---

Return ONLY the summarized Markdown text.`;

      const startTime = Date.now();
      const aiResponse = await unifiedAIService.generate({
        prompt,
        provider: 'google', // Default to Google for high context window
        model: 'gemini-2.0-flash',
        temperature: 0.3,
        traceName: `document-summary-level-${level}`
      });

      const summarizedContent = aiResponse.content.trim();
      const processingTimeMs = Date.now() - startTime;
      
      const originalTokens = Math.ceil(content.length / 4);
      const compressedTokens = Math.ceil(summarizedContent.length / 4);
      const compressionRatio = compressedTokens / originalTokens;

      await pool.query(
        `INSERT INTO document_summaries (
          id, document_id, compression_method, compression_level, 
          target_tokens, original_content, original_tokens, 
          compressed_content, compressed_tokens, compression_ratio,
          ai_provider, ai_model, is_valid, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
        ON CONFLICT (document_id, compression_level, compression_method, template_context_hash) 
        DO UPDATE SET
          compressed_content = EXCLUDED.compressed_content,
          compressed_tokens = EXCLUDED.compressed_tokens,
          compression_ratio = EXCLUDED.compression_ratio,
          ai_provider = EXCLUDED.ai_provider,
          ai_model = EXCLUDED.ai_model,
          updated_at = NOW()`,
        [
          uuidv4(),
          documentId,
          'mission-draco-rag',
          level,
          Math.ceil(originalTokens * (level / 100)),
          content,
          originalTokens,
          summarizedContent,
          compressedTokens,
          compressionRatio,
          'google',
          'gemini-2.0-flash'
        ]
      );

      logger.debug(`[SUMMARIZER] Saved ${level}% summary for document ${documentId}`);
    } catch (error: any) {
      logger.error(`[SUMMARIZER] Failed to generate ${level}% summary for ${documentId}:`, error.message);
    }
  }
}
