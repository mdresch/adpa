import 'dotenv/config';
import { Pool } from 'pg';

async function fullSchemaDump() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const query = `
      SELECT table_schema, table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('best_practices', 'lessons_learned', 'baselines', 'document_history', 'pipeline_executions', 'stage_executions')
      ORDER BY table_schema, table_name, ordinal_position
    `;
        const result = await pool.query(query);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

fullSchemaDump();
