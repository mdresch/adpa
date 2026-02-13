import 'dotenv/config';
import { Pool } from 'pg';

async function applyMissingSchemaV3() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- Applying Missing Schema Fixes (v3.1) ---');

        console.log('Updating best_practices...');
        await pool.query(`
      ALTER TABLE best_practices 
      ADD COLUMN IF NOT EXISTS template_id UUID,
      ADD COLUMN IF NOT EXISTS effectiveness NUMERIC DEFAULT 0.8,
      ADD COLUMN IF NOT EXISTS implementation_guidance JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS success_factors JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS common_pitfalls JSONB DEFAULT '[]';
    `);

        console.log('Updating lessons_learned...');
        await pool.query(`
      ALTER TABLE lessons_learned 
      ADD COLUMN IF NOT EXISTS template_id UUID,
      ADD COLUMN IF NOT EXISTS date_learned TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS applicability TEXT[] DEFAULT '{}';
    `);

        console.log('Updating baselines...');
        await pool.query(`
      ALTER TABLE baselines 
      ADD COLUMN IF NOT EXISTS baseline_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS created_by UUID,
      ADD COLUMN IF NOT EXISTS scope_snapshot JSONB,
      ADD COLUMN IF NOT EXISTS schedule_snapshot JSONB,
      ADD COLUMN IF NOT EXISTS cost_snapshot JSONB;
    `);

        console.log('Updating document_history...');
        await pool.query(`
      ALTER TABLE document_history 
      ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    `);

        console.log('Ensuring AI providers are active...');
        await pool.query(`
      UPDATE ai_providers 
      SET is_active = true 
      WHERE provider_type IN ('openai', 'anthropic', 'groq', 'google', 'deepseek', 'mistral', 'xai');
    `);

        console.log('Schema migration v3.1 completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

applyMissingSchemaV3();
