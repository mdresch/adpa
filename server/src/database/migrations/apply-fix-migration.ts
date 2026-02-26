import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function applyMigration() {
    const client = await pool.connect();
    try {
        const migrations = [
            '407_fix_extraction_schema_mismatches.sql',
            '408_fix_extraction_schema_mismatches_p2.sql'
        ];

        for (const migration of migrations) {
            const migrationPath = path.resolve(__dirname, migration);
            if (!fs.existsSync(migrationPath)) {
                console.error(`Migration file not found: ${migrationPath}`);
                continue;
            }
            const sql = fs.readFileSync(migrationPath, 'utf8');

            console.log(`🚀 Applying migration: ${migration}`);
            await client.query(sql);
            console.log(`✅ Migration ${migration} applied successfully`);
        }

    } catch (err) {
        console.error('❌ Error applying migration:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

applyMigration();
