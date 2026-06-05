import db from '../src/lib/db';

async function run() {
    await db.initDb();
    
    console.log('--- 🚀 Starting Template Metrics Backfill ---');

    // 1. Find documents that should have a usage record but don't
    const missingUsageDocs = await db.query(`
        SELECT d.id, d.template_id, d.project_id, d.created_by, d.word_count, d.created_at,
               (d.generation_metadata->'qualityMetrics'->>'score')::numeric as quality_score
        FROM documents d
        WHERE d.template_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM template_usage u 
            WHERE u.document_id = d.id
          )
    `);

    console.log(`Found ${missingUsageDocs.rows.length} missing usage records.`);

    // 2. Backfill template_usage
    for (const doc of missingUsageDocs.rows) {
        try {
            // Quality score fallback logic: 0.7 if null
            const score = doc.quality_score === null ? 0.7 : parseFloat(doc.quality_score);
            
            await db.query(`
                INSERT INTO template_usage (
                    template_id, document_id, user_id, project_id,
                    used_at, word_count, quality_score, success
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            `, [
                doc.template_id, 
                doc.id, 
                doc.created_by, 
                doc.project_id, 
                doc.created_at,
                doc.word_count || 0,
                score
            ]);
        } catch (e) {
            console.error(`Failed to backfill usage for doc ${doc.id}:`, e.message);
        }
    }

    // 3. Force recalculation of all template validation metrics
    const templates = await db.query(`SELECT id FROM templates WHERE deleted_at IS NULL`);
    console.log(`Recalculating metrics for ${templates.rows.length} templates...`);

    for (const t of templates.rows) {
        try {
            // Recalculate usage_count, validation_count, success_count
            // validation_count is now tied to template_usage records for consistency
            await db.query(`
                UPDATE templates
                SET 
                    usage_count = (SELECT COUNT(*) FROM template_usage WHERE template_id = $1),
                    validation_count = (SELECT COUNT(*) FROM template_usage WHERE template_id = $1),
                    success_count = (
                        SELECT COUNT(*) FROM template_usage 
                        WHERE template_id = $1 AND quality_score >= quality_threshold
                    ),
                    last_validated_at = (SELECT MAX(used_at) FROM template_usage WHERE template_id = $1)
                WHERE id = $1
            `, [t.id]);
            
            // Also update the detailed quality metrics table
            await db.query(`SELECT calculate_template_quality_metrics($1, 'all_time', NULL, NULL)`, [t.id]);
        } catch (e) {
            console.error(`Failed to update metrics for template ${t.id}:`, e.message);
        }
    }

    console.log('--- ✅ Backfill Complete ---');
    
    await db.end();
}

run();
