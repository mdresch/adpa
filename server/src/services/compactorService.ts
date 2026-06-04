import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { unifiedAIService } from './unifiedAIService';

/**
 * Multi-Scale Context Compactor Service
 * 
 * Executes post-processing to generate recursive summaries at 80%, 60%, 40%, and 20% density.
 * Designed for adaptive context injection while preserving high-integrity H8 entities.
 */
export class CompactorService {
  
  /**
   * Generates all requested density tiers for a document.
   * Executed as a background process.
   */
  static async generateMultiScaleSummaries(fullText: string, projectId: string, documentId: string): Promise<void> {
    if (!fullText || fullText.trim().length < 200) {
      logger.warn(`[COMPACTOR] Content too short for multi-scale compression (${documentId})`);
      return;
    }

    logger.info(`[COMPACTOR] Starting multi-scale compression for document ${documentId}`);

    try {
      // Density tiers to generate
      const tiers = [80, 60, 40, 20];
      const snapshots: Record<string, { summary: string; timestamp: string }> = {};
      
      // Starting point: The full 100% text
      let currentSource = fullText;

      for (const level of tiers) {
        // Calculate relative compression needed if recursive, 
        // but for reliability we provide the absolute target level in the prompt.
        const summary = await this.compressTier(currentSource, level);
        
        snapshots[`p${level}`] = {
          summary,
          timestamp: new Date().toISOString()
        };

        // Recursive step: Use the previous tier as source for the next one
        // This ensures cumulative density and semantic consistency.
        currentSource = summary;
      }

      // Persistence: Update the documents table with the new JSONB payload
      await pool.query(
        `UPDATE documents 
         SET context_snapshots = COALESCE(context_snapshots, '{}'::jsonb) || $1::jsonb 
         WHERE id = $2`,
        [JSON.stringify(snapshots), documentId]
      );

      logger.info(`[COMPACTOR] Successfully persisted 4 density tiers for document ${documentId}`);
    } catch (error: any) {
      logger.error(`[COMPACTOR] Multi-scale compression failed for ${documentId}:`, error.message);
    }
  }

  /**
   * Internal compression utility calling the LLM with the "Anti-Filler Mandate".
   */
  private static async compressTier(text: string, level: number): Promise<string> {
    const prompt = `You are a High-Density Context Compactor Agent for Mission Draco.
Your task is to compress the provided project documentation into a ${level}% density tier.

### ANTI-FILLER MANDATE:
1. ELIMINATE all narrative fluff, redundant transitions, and low-signal filler words.
2. PRESERVE EVERY H8 Framework Entity (lines starting with ########) verbatim. 
3. DO NOT summarize H8 Entity JSON blobs; they must remain perfectly intact for system traceability.
4. RETAIN the core strategic logic, technical milestones, and engineering definitions.
5. INCREASE information density: every remaining word must carry significant semantic weight.
6. OUTPUT MUST be valid Markdown and strictly adhere to the ${level}% length constraint relative to a standard document.

Source Content:
---
${text}
---

Return ONLY the compressed Markdown narrative.`;

    try {
      const response = await unifiedAIService.generate({
        prompt,
        provider: 'google', // Using Gemini for high-context reliability
        model: 'gemini-2.0-flash',
        temperature: 0.1, // Minimum temperature for maximum structural stability
        traceName: `context-compactor-p${level}`
      });

      const compressed = response.content.trim();
      
      if (!compressed) {
        throw new Error(`AI returned empty content for ${level}% tier`);
      }

      return compressed;
    } catch (error: any) {
      logger.error(`[COMPACTOR] LLM call failed for p${level}:`, error.message);
      throw error;
    }
  }
}
