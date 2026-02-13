import 'dotenv/config';
import { Pool } from 'pg';

async function inspectSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- Table: document_processing_jobs ---');
        const jobs = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'document_processing_jobs' ORDER BY ordinal_position");
        console.table(jobs.rows);

        console.log('\n--- Table: pipeline_executions ---');
        const pipe = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pipeline_executions' ORDER BY ordinal_position");
        console.table(pipe.rows);

        console.log('\n--- Table: stage_executions ---');
        const stage = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stage_executions' ORDER BY ordinal_position");
        console.table(stage.rows);

        console.log('\n--- Foreign Keys for stage_executions ---');
        const fks = await pool.query(`
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='stage_executions';
    `);
        console.table(fks.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
