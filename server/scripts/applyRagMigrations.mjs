import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyRagMigrations() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const migrationPath = path.join(__dirname, 'migrations', 'apply_rag_migrations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying RAG migrations...');

    try {
        await pool.query(sql);
        console.log('✅ RAG migrations applied successfully');

        // Verify the setup
        const result = await pool.query(`
            SELECT 
                EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_pgvector,
                EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'document_chunks' AND column_name = 'embedding'
                ) as has_embedding_column,
                EXISTS (
                    SELECT 1 
                    FROM information_schema.routines 
                    WHERE routine_name = 'match_document_chunks'
                ) as has_match_function
        `);

        console.log('Verification:', result.rows[0]);

        if (result.rows[0].has_pgvector && result.rows[0].has_embedding_column && result.rows[0].has_match_function) {
            console.log('✅ All RAG components are set up correctly');
        } else {
            console.error('❌ Some components are missing:', result.rows[0]);
        }
    } catch (error) {
        console.error('❌ Failed to apply migrations:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyRagMigrations();
