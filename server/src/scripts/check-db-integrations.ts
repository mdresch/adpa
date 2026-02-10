
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { pool, connectDatabase } from '../database/connection';

async function checkIntegrations() {
    try {
        await connectDatabase();

        const result = await pool!.query("SELECT id, name, type, credentials_encrypted, configuration FROM integrations WHERE type = 'pinecone'");

        console.log('Pinecone Integrations in DB:');
        for (const row of result.rows) {
            const credentials = JSON.parse(Buffer.from(row.credentials_encrypted, 'base64').toString('utf-8'));
            console.log(`ID: ${row.id}`);
            console.log(`Name: ${row.name}`);
            console.log(`API Key (first 5 chars): ${credentials.apiKey ? credentials.apiKey.substring(0, 5) + '...' : 'N/A'}`);
            console.log(`Configuration: ${row.configuration}`);

            // Compare with process.env.PINECONE_API_KEY
            const envKey = process.env.PINECONE_API_KEY;
            console.log(`Matches ENV API Key: ${credentials.apiKey === envKey}`);
        }
    } catch (error: any) {
        console.error('Error checking integrations:', error.message);
    } finally {
        if (pool) await pool.end();
    }
}

checkIntegrations();
