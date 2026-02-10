
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { PineconeService } from '../services/pineconeService';

async function finalVerify() {
    console.log('Final Verification of Pinecone Dynamic Initializer...');

    // Test with environment key first (even if it might fail, we check behavior)
    console.log('\n--- Test 1: Default (Singleton/ENV) ---');
    try {
        const service = new PineconeService();
        const result = await service.testConnection();
        console.log('Default Connection Result:', result);
    } catch (err: any) {
        console.error('Default Connection Error:', err.message);
    }

    // Test with explicit (potentially invalid) key to see if it overrides
    console.log('\n--- Test 2: Explicit Key (Invalid) ---');
    try {
        const service = new PineconeService({
            apiKey: 'pcsk_invalid_test_key',
            indexName: 'test-index'
        });
        const result = await service.testConnection();
        console.log('Explicit Connection Result:', result);
    } catch (err: any) {
        console.error('Explicit Connection Expected Error:', err.message);
    }

    console.log('\nVerification script finished.');
}

finalVerify().catch(console.error);
