
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Unset PINECONE_INDEX_HOST to test auto-discovery
const originalHost = process.env.PINECONE_INDEX_HOST;
delete process.env.PINECONE_INDEX_HOST;

import { PineconeService } from '../services/pineconeService';
import { logger } from '../utils/logger';

async function verifyPinecone() {
    console.log('Verifying Pinecone Configuration (Without explicitly set Host)...');
    console.log('PINECONE_API_KEY Configured:', !!process.env.PINECONE_API_KEY);
    console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME);
    // console.log('PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT); // Deprecated/Not used by new SDK usually

    if (!process.env.PINECONE_API_KEY) {
        console.error('ERROR: PINECONE_API_KEY is missing!');
        process.exit(1);
    }

    try {
        console.log('Initializing PineconeService...');
        const service = new PineconeService();

        console.log('Testing connection...');
        const result = await service.testConnection();
        if (result) {
            console.log('SUCCESS: Pinecone connection verified (Auto-discovery).');
            // Also try to get stats explicitly
            try {
                const stats = await service.getIndexStats();
                console.log('Index Stats:', JSON.stringify(stats, null, 2));
            } catch (err: any) {
                console.error('Failed to get index stats:', err.message);
            }
        } else {
            console.error('FAILURE: Pinecone connection failed via service (Auto-discovery).');
            console.log('This likely means the API Key is invalid.');
        }
    } catch (error: any) {
        console.error('EXCEPTION:', error.message);
    }
}

verifyPinecone().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
