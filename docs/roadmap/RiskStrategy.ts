import { IExtractionStrategy } from '../interfaces/IExtractionStrategy';
import { z } from 'zod';
import { PoolClient } from 'pg';
import { logger } from '@/utils/logger';

// 1. Define Zod Schema (The "Sod JSON format")
// This forces the AI to match this exact structure or fail validation
export const RiskSchema = z.object({
  risks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['technical', 'schedule', 'budget', 'resource', 'external', 'quality']).optional().or(z.string()),
    probability: z.enum(['high', 'medium', 'low', 'very_high', 'very_low', 'critical']).optional().or(z.string()),
    impact: z.enum(['high', 'medium', 'low', 'very_high', 'very_low', 'critical']).optional().or(z.string()),
    mitigation_strategy: z.string().optional(),
    contingency_plan: z.string().optional(),
    owner: z.string().optional(),
    source_document: z.string().optional()
  }))
});

// Extract the TypeScript type from the Schema automatically
export type RiskExtractionResult = z.infer<typeof RiskSchema>;
export type RiskEntity = RiskExtractionResult['risks'][0];

export class RiskStrategy implements IExtractionStrategy<RiskEntity> {
  entityType = 'risks';

  // 2. Expose Schema for the Orchestrator
  getSchema() {
    return RiskSchema;
  }

  // 3. Define the specific Prompt
  getPrompt(context: string): string {
    return `Analyze the following project documents and extract ALL risks mentioned.

${context}

Extract risks in JSON format matching this schema:
{
  "risks": [
    {
      "title": "Risk Title",
      "description": "Detailed description",
      "category": "technical|schedule|budget|resource|external|quality",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation_strategy": "Mitigation steps",
      "contingency_plan": "Contingency steps",
      "source_document": "Exact document title"
    }
  ]
}`;
  }

  // 4. Persistence & Deduplication Logic
  async save(client: PoolClient, projectId: string, data: RiskEntity[], userId: string): Promise<void> {
    if (data.length === 0) return;

    logger.info(`[STRATEGY-RISKS] Processing ${data.length} risks for save`);

    // Deduplication: Check existing risks
    const existingResult = await client.query(
      `SELECT name FROM risks WHERE project_id = $1`,
      [projectId]
    );
    
    const existingNames = new Set(existingResult.rows.map(r => r.name.toLowerCase().trim()));
    const risksToSave = data.filter(r => !existingNames.has(r.title.toLowerCase().trim()));

    if (risksToSave.length === 0) {
      logger.info('[STRATEGY-RISKS] All extracted risks already exist in database');
      return;
    }

    // Batch Insert
    const values: any[] = [];
    const placeholders: string[] = [];

    risksToSave.forEach((r, index) => {
      const offset = index * 14;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
      );

      // Normalization helpers
      const probability = this.normalizeLevel(r.probability);
      const impact = this.normalizeLevel(r.impact);

      values.push(
        projectId,
        r.title,                    // name
        r.description,
        r.category || null,
        probability,
        impact,
        'project',                  // risk_level (default)
        r.mitigation_strategy || null,
        r.contingency_plan || null,
        r.owner || null,
        'identified',               // status
        r.title,                    // title
        userId,
        null                        // source_document_id (resolved by orchestrator usually)
      );
    });

    await client.query(`
      INSERT INTO risks (
        project_id, name, description, category, probability, impact, risk_level,
        mitigation_strategy, contingency_plan, owner, status, title, created_by, source_document_id
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
    `, values);

    logger.info(`[STRATEGY-RISKS] Saved ${risksToSave.length} new risks`);
  }

  private normalizeLevel(val: string | undefined): string {
    if (!val) return 'medium';
    const v = val.toLowerCase().trim();
    if (['very_high', 'high', 'medium', 'low', 'very_low'].includes(v)) return v;
    if (v === 'critical') return 'high';
    return 'medium';
  }
}