import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function applyAnalyticsMigration() {
    console.log('📊 Applying analytics tables migration...');

    try {
        const sqlPath = path.join(__dirname, 'migrations', 'create_analytics_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Analytics tables created successfully!');
        console.log('');
        console.log('Created tables:');
        console.log('  - rag_analytics');
        console.log('  - integration_usage_metrics');
        console.log('');
        console.log('Created views:');
        console.log('  - recent_rag_errors');
        console.log('');
        console.log('Created functions:');
        console.log('  - get_rag_analytics_summary(time_range_hours)');
        console.log('  - get_hourly_rag_ingestion(days_back)');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

applyAnalyticsMigration()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
