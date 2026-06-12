
import * as dotenv from 'dotenv';
import path from 'path';

// Load env before any service import (static imports are hoisted above this line)
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyMongoSearch() {
    const { mongoVectorStore } = await Promise.resolve().then(() => require());
    console.log('Verifying MongoDB Vector Search Configurability...');

    try {
        await mongoVectorStore.connect();

        // Mock query vector (1024 dims)
        const mockVector = new Array(1024).fill(0).map(() => Math.random());

        console.log('\n--- Test 1: Default Parameters ---');
        // This might fail if no index exists, but we want to check the log output/pipeline construction
        try {
            await mongoVectorStore.vectorSearch(mockVector, 5);
            console.log('Default search call succeeded (check logs for params)');
        } catch (err: any) {
            console.log('Default search call error (expected if no index):', err.message);
        }

        console.log('\n--- Test 2: Custom Parameters ---');
        try {
            await mongoVectorStore.vectorSearch(mockVector, 5, {}, 'custom_index', 100);
            console.log('Custom search call succeeded (check logs for params)');
        } catch (err: any) {
            console.log('Custom search call error (expected if no index):', err.message);
        }

    } catch (error: any) {
        console.error('Connection failed:', error.message);
    } finally {
        await mongoVectorStore.disconnect();
    }
}

verifyMongoSearch().catch(console.error);
