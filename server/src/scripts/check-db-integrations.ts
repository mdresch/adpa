
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
            let credentials: Record<string, any> | null = null;
            if (typeof row.credentials_encrypted === 'string' && row.credentials_encrypted.trim().length > 0) {
                try {
                    credentials = JSON.parse(Buffer.from(row.credentials_encrypted, 'base64').toString('utf-8'));
                } catch (decodeError: any) {
                    console.log(`Credentials decode failed: ${decodeError.message}`);
                }
            }

            const configuration = typeof row.configuration === 'string'
                ? (() => {
                    try {
                        return JSON.parse(row.configuration);
                    } catch {
                        return {};
                    }
                })()
                : (row.configuration || {});

            const keyFromCredentials = credentials?.apiKey || credentials?.api_key || null;
            const keyFromConfig = configuration?.apiKey || configuration?.api_key || null;
            const envKey = process.env.PINECONE_API_KEY || null;

            console.log(`ID: ${row.id}`);
            console.log(`Name: ${row.name}`);
            console.log(`Has credentials_encrypted: ${typeof row.credentials_encrypted === 'string' && row.credentials_encrypted.trim().length > 0}`);
            console.log(`Has key in credentials: ${!!keyFromCredentials}`);
            console.log(`Has key in configuration: ${!!keyFromConfig}`);
            console.log(`Has key in ENV: ${!!envKey}`);
            console.log(`credentials key prefix: ${typeof keyFromCredentials === 'string' ? keyFromCredentials.slice(0, 8) + '...' : 'N/A'}`);
            console.log(`config key prefix: ${typeof keyFromConfig === 'string' ? keyFromConfig.slice(0, 8) + '...' : 'N/A'}`);
            console.log(`env key prefix: ${typeof envKey === 'string' ? envKey.slice(0, 8) + '...' : 'N/A'}`);
            console.log(`Credentials key matches ENV key: ${keyFromCredentials === envKey}`);
            console.log(`Config key matches ENV key: ${keyFromConfig === envKey}`);
            console.log(`Configured indexName: ${configuration?.indexName || configuration?.index_name || 'N/A'}`);
            console.log(`Configured indexHost: ${configuration?.indexHost || configuration?.index_host || 'N/A'}`);
            console.log('---');
        }
    } catch (error: any) {
        console.error('Error checking integrations:', error.message);
    } finally {
        if (pool) await pool.end();
    }
}

checkIntegrations();
