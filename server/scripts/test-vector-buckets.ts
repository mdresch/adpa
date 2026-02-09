
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

console.log('🔧 Testing Supabase Vector Buckets...');
console.log(`URL: ${supabaseUrl}`);

const client = createClient(supabaseUrl, supabaseKey);

async function testVectorBuckets() {
    try {
        // Check if client.storage.vectors exists
        if (!client.storage || !(client.storage as any).vectors) {
            console.error('❌ client.storage.vectors is NOT available in this SDK version.');
            console.log('Available storage methods:', Object.keys(client.storage));
            return;
        }

        console.log('✅ client.storage.vectors is available!');

        // Define bucket and index
        const bucketName = 'embedding'; // Singular as per user request
        const indexName = 'documents-voyage';

        // List buckets first
        console.log('\nListing storage buckets...');
        const { data: buckets, error: bucketError } = await client.storage.listBuckets();
        if (bucketError) {
            console.error('❌ Failed to list buckets:', bucketError.message);
        } else {
            console.log('Available buckets:', buckets?.map(b => b.name));
            const targetBucket = buckets?.find(b => b.name === bucketName);
            if (!targetBucket) {
                console.warn(`⚠️  Bucket '${bucketName}' not found! Attempting to create it...`);
                const { error: createError } = await client.storage.createBucket(bucketName, {
                    public: false,
                    fileSizeLimit: undefined,
                    allowedMimeTypes: undefined
                });
                if (createError) {
                    console.error(`❌ Failed to create bucket '${bucketName}':`, createError.message);
                } else {
                    console.log(`✅ Bucket '${bucketName}' created successfully.`);
                }
            } else {
                console.log(`✅ Bucket '${bucketName}' found.`);
            }
        }

        console.log(`\nAttempting to access index '${indexName}' in bucket '${bucketName}'...`);

        // @ts-ignore - types might not be updated yet
        const index = (client.storage as any).vectors
            .from(bucketName)
            .index(indexName);

        // Create dummy vectors (dimension 1024 for Voyage AI)
        const dummyVector = new Array(1024).fill(0.1);

        const vectors = [
            {
                key: 'test-doc-1',
                data: { float32: dummyVector },
                metadata: { source: 'test-script' },
            }
        ];

        console.log(`Attempting to put ${vectors.length} vectors...`);

        // @ts-ignore
        const result = await index.putVectors({
            vectors: vectors,
        });

        console.log('✅ Vector upsert successful!');
        console.log('Result:', JSON.stringify(result, null, 2));

        // Try to query using discovered method
        console.log('\nAttempting to query vectors using queryVectors()...');
        // @ts-ignore
        const queryResult = await index.queryVectors({
            queryVector: { float32: dummyVector },
            topK: 1,
            returnMetadata: true
        });

        console.log('✅ Query successful!');
        console.log('Query Result:', JSON.stringify(queryResult, null, 2));

    } catch (error: any) {
        console.error('❌ Error testing Vector Buckets:');
        if (error.response) {
            try {
                const text = await error.response.text();
                console.error('Response Body:', text);
            } catch (e) {
                console.error('Could not read response body');
            }
        }
        console.error('Full Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
}

testVectorBuckets();
