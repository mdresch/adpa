import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const sqlFile = path.join(__dirname, '..', 'migrations', '313_escalation_matrix_system.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    const client = await pool.connect();
    try {
        console.log('Running migration 313...');
        await client.query(sql);
        console.log('Migration 313 completed successfully.');
    } catch (err) {
        console.error('Migration 313 failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
