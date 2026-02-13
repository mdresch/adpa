import 'dotenv/config';
import { Pool } from 'pg';

async function checkSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- Checking job_id columns ---');
        const jobsSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_processing_jobs' AND column_name = 'job_id'
    `);
        console.log('document_processing_jobs.job_id type:', jobsSchema.rows[0]?.data_type);

        const executionsSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pipeline_executions' AND column_name = 'job_id'
    `);
        console.log('pipeline_executions.job_id type:', executionsSchema.rows[0]?.data_type);

        console.log('\n--- Checking document_history table ---');
        const historyTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'document_history'
      )
    `);
        console.log('document_history exists:', historyTable.rows[0].exists);

        console.log('\n--- Checking document_chunks table ---');
        const chunksSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_chunks'
    `);
        console.log('document_chunks columns:', chunksSchema.rows.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
