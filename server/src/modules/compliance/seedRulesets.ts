/**
 * Standards Compliance Rulesets Seed Script
 * SC-122, SC-123, SC-124: Seed the database with PMBOK, BABOK, and DMBOK rulesets
 * 
 * Run this script to populate the compliance framework with standards-aligned rules.
 */

import { pool, connectDatabase, getDatabasePool, getDatabasePoolSafe } from '../../database/connection';
import { logger } from '../../utils/logger';
import {
  getPMBOKPackDefinition,
  getPMBOKCategories,
  getPMBOKRules,
  getPMBOKRuleCategoryMapping as getPMBOKMapping,
} from './rulesets/pmbokRuleset';
import {
  getBABOKPackDefinition,
  getBABOKCategories,
  getBABOKRules,
  getBABOKRuleCategoryMapping as getBABOKMapping,
} from './rulesets/babokRuleset';
import {
  getDMBOKPackDefinition,
  getDMBOKCategories,
  getDMBOKRules,
  getDMBOKRuleCategoryMapping as getDMBOKMapping,
} from './rulesets/dmbokRuleset';

/**
 * Seed a single standards pack with its categories and rules
 */
async function seedStandardsPack(
  packDefinition: ReturnType<typeof getPMBOKPackDefinition>,
  categories: ReturnType<typeof getPMBOKCategories>,
  rules: ReturnType<typeof getPMBOKRules>,
  ruleCategoryMapping: Record<string, string>
): Promise<{ packId: string; categoriesCreated: number; rulesCreated: number }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create or update the standards pack
    const packResult = await client.query(
      `INSERT INTO standards_packs (pack_type, name, description, version, is_active, is_system_pack)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (pack_type, version) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        packDefinition.packType,
        packDefinition.name,
        packDefinition.description,
        packDefinition.version,
        packDefinition.isActive,
      ]
    );
    const packId = packResult.rows[0].id;

    // 2. Create categories and track their IDs
    const categoryIdMap: Record<string, string> = {};
    let categoriesCreated = 0;

    for (const category of categories) {
      const categoryResult = await client.query(
        `INSERT INTO standards_categories (pack_id, code, name, description, weight, sort_order, is_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (pack_id, code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           weight = EXCLUDED.weight,
           sort_order = EXCLUDED.sort_order,
           is_required = EXCLUDED.is_required,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [
          packId,
          category.code,
          category.name,
          category.description,
          category.weight,
          category.sortOrder,
          category.isRequired,
        ]
      );
      categoryIdMap[category.code] = categoryResult.rows[0].id;
      categoriesCreated++;
    }

    // 3. Create rules
    let rulesCreated = 0;

    for (const rule of rules) {
      const categoryCode = ruleCategoryMapping[rule.code];
      const categoryId = categoryIdMap[categoryCode];

      if (!categoryId) {
        logger.warn(`[SEED-RULESETS] No category found for rule ${rule.code}, skipping`);
        continue;
      }

      await client.query(
        `INSERT INTO compliance_rules (
          pack_id, category_id, code, name, description, rationale,
          validation_type, severity, weight, is_active, is_required,
          applicable_doc_types, validation_config, remediation_guidance, standards_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (pack_id, code) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          rationale = EXCLUDED.rationale,
          validation_type = EXCLUDED.validation_type,
          severity = EXCLUDED.severity,
          weight = EXCLUDED.weight,
          is_active = EXCLUDED.is_active,
          is_required = EXCLUDED.is_required,
          applicable_doc_types = EXCLUDED.applicable_doc_types,
          validation_config = EXCLUDED.validation_config,
          remediation_guidance = EXCLUDED.remediation_guidance,
          standards_reference = EXCLUDED.standards_reference,
          updated_at = CURRENT_TIMESTAMP`,
        [
          packId,
          categoryId,
          rule.code,
          rule.name,
          rule.description,
          rule.rationale,
          rule.validationType,
          rule.severity,
          rule.weight,
          rule.isActive,
          rule.isRequired,
          rule.applicableDocTypes,
          JSON.stringify(rule.validationConfig),
          JSON.stringify(rule.remediationGuidance),
          JSON.stringify(rule.standardsReference),
        ]
      );
      rulesCreated++;
    }

    await client.query('COMMIT');

    return { packId, categoriesCreated, rulesCreated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed all standards packs
 */
export async function seedAllRulesets(): Promise<void> {
  await connectDatabase();
  logger.info('[SEED-RULESETS] Starting compliance rulesets seeding...');

  try {
    // Seed PMBOK
    logger.info('[SEED-RULESETS] Seeding PMBOK ruleset...');
    const pmbokResult = await seedStandardsPack(
      getPMBOKPackDefinition(),
      getPMBOKCategories(),
      getPMBOKRules(),
      getPMBOKMapping()
    );
    logger.info('[SEED-RULESETS] PMBOK ruleset seeded', pmbokResult);

    // Seed BABOK
    logger.info('[SEED-RULESETS] Seeding BABOK ruleset...');
    const babokResult = await seedStandardsPack(
      getBABOKPackDefinition(),
      getBABOKCategories(),
      getBABOKRules(),
      getBABOKMapping()
    );
    logger.info('[SEED-RULESETS] BABOK ruleset seeded', babokResult);

    // Seed DMBOK
    logger.info('[SEED-RULESETS] Seeding DMBOK ruleset...');
    const dmbokResult = await seedStandardsPack(
      getDMBOKPackDefinition(),
      getDMBOKCategories(),
      getDMBOKRules(),
      getDMBOKMapping()
    );
    logger.info('[SEED-RULESETS] DMBOK ruleset seeded', dmbokResult);

    logger.info('[SEED-RULESETS] All rulesets seeded successfully', {
      pmbok: pmbokResult,
      babok: babokResult,
      dmbok: dmbokResult,
    });
  } catch (error) {
    logger.error('[SEED-RULESETS] Failed to seed rulesets', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * CLI runner
 */
if (require.main === module) {
  seedAllRulesets()
    .then(async () => {
      console.log('Rulesets seeded successfully!');
      await getDatabasePool()
        .end()
        .catch(() => {});
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Failed to seed rulesets:', error);
      await getDatabasePoolSafe()
        ?.end()
        .catch(() => {});
      process.exit(1);
    });
}
