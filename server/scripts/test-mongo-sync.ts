
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { pool, connectDatabase } from '../src/database/connection';
import { mongoVectorStore } from '../src/services/mongoVectorStore';
import { mongoDBSyncService } from '../src/services/mongoDBSyncService';
import { logger } from '../src/utils/logger';

async function runTest() {
    try {
        console.log('Starting MongoDB Sync Test...');

        // 1. Initialize Postgres connection
        await connectDatabase();
        if (!pool) throw new Error('Failed to initialize Postgres pool');

        // Test 1: Simple Query
        console.log('Test 1: Simple Query');
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Postgres connected:', res.rows[0].now);

        // Test 2: Parameterized Query (Is connection wrapper broken?)
        console.log('Test 2: Parameterized Query');
        try {
            const echoRes = await pool.query('SELECT $1::text as echo', ['hello']);
            if (echoRes && echoRes.rows[0].echo === 'hello') {
                console.log('✅ Parameterized query worked');
            } else {
                console.error('❌ Parameterized query FAILED (result null or mismatch)', echoRes);
            }
        } catch (e) {
            console.error('❌ Parameterized query THREW:', e);
        }

        // 3. Find a project with documents
        console.log('Finding a project with documents...');
        const projectResult = await pool.query(`
            SELECT p.id, p.name, COUNT(d.id) as doc_count 
            FROM projects p
            JOIN documents d ON p.id = d.project_id
            WHERE d.content IS NOT NULL AND length(d.content) > 50
            GROUP BY p.id, p.name
            HAVING COUNT(d.id) > 0
            ORDER BY doc_count DESC
            LIMIT 1
        `);

        if (projectResult.rows.length === 0) {
            console.log('No suitable project found with documents.');
            return;
        }

        const project = projectResult.rows[0];
        console.log(`Found project: "${project.name}" (ID: ${project.id}) with ${project.doc_count} documents.`);

        // 4. Run Sync (Limit to 1 document to save time/tokens)
        // Initialize MongoDB connection first
        await mongoVectorStore.connect();

        console.log('Triggering sync (limit 1)...');
        const syncResult = await mongoDBSyncService.syncProjectDocuments(project.id, 1);

        console.log('Sync Result:', JSON.stringify(syncResult, null, 2));

        if (syncResult.success && syncResult.details.syncedDocuments > 0) {
            console.log('✅ Sync successful!');
        } else {
            console.error('❌ Sync failed or no documents synced.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await pool?.end();
        await mongoVectorStore.disconnect();
        process.exit(0);
    }
}

runTest();
