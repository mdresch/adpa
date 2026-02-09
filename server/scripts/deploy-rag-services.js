const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const PROJECT_REF = 'blxzjbxczpmmgiwbtmdo'; // From your previous context

async function deploy() {
    console.log('🚀 Deploying RAG Services to Supabase...');

    try {
        // 1. Deploy ingest-embeddings
        console.log('\n📦 Deploying ingest-embeddings...');
        execSync(`npx supabase functions deploy ingest-embeddings --project-ref ${PROJECT_REF} --no-verify-jwt`, { stdio: 'inherit' });

        // 2. Deploy query-rag-vectors
        console.log('\n📦 Deploying query-rag-vectors...');
        execSync(`npx supabase functions deploy query-rag-vectors --project-ref ${PROJECT_REF} --no-verify-jwt`, { stdio: 'inherit' });

        // 3. Apply SQL Trigger
        console.log('\n📜 Applying SQL Trigger...');
        // We can't easily use supabase db execute from here without linking, 
        // so we'll rely on our existing MCP check-entity-extraction.js pattern 
        // OR just ask the user to run it. 
        // But wait, we have the `supabase-mcp-server`! 
        // Actually, the user environment has `psql` available but often password protected.
        // Let's use the `pg` library like we did for inspection.

        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        const sql = fs.readFileSync(path.resolve(__dirname, '../migrations/setup_rag_trigger.sql'), 'utf8');

        await pool.query(sql);
        console.log('✅ SQL Trigger applied successfully.');
        await pool.end();

        console.log('\n✨ Deployment Complete!');

    } catch (error) {
        console.error('❌ Deployment Failed:', error.message);
        process.exit(1);
    }
}

deploy();
