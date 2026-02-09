
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
const envPath = path.join(__dirname, '../.env');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

console.log('MONGODB_URI defined:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI value starts with:', process.env.MONGODB_URI?.substring(0, 10));

import { mongoVectorStore } from '../src/services/mongoVectorStore';
import { logger } from '../src/utils/logger';

async function inspectEmbeddings() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoVectorStore.connect();

        console.log('Fetching a sample chunk...');
        const chunk = await mongoVectorStore.chunksCollection.findOne({});

        if (!chunk) {
            console.log('No chunks found in the collection.');
        } else {
            console.log('Found chunk:', chunk.id);
            console.log('Content preview:', chunk.content.substring(0, 50) + '...');

            if (chunk.embedding && chunk.embedding.length > 0) {
                console.log(`✅ Embedding found! Length: ${chunk.embedding.length}`);
                console.log('Sample (first 5 values):', chunk.embedding.slice(0, 5));

                // Infer model from dimensions
                if (chunk.embedding.length === 1536) {
                    console.log('ℹ️ Dimension 1536 suggests OpenAI text-embedding-3-small or ada-002');
                } else if (chunk.embedding.length === 1024) {
                    console.log('ℹ️ Dimension 1024 suggests VoyageAI voyage-large-2 or similar');
                } else if (chunk.embedding.length === 768) {
                    console.log('ℹ️ Dimension 768 suggests Nomic/HuggingFace/Google Vertex (Gecko)');
                } else {
                    console.log(`ℹ️ Unknown dimension: ${chunk.embedding.length}`);
                }
            } else {
                console.log('❌ Embedding array is empty or missing.');
                console.log('This indicates that Atlas Triggers have NOT populated the embeddings yet.');
            }
        }

    } catch (error) {
        console.error('Inspection failed:', error);
    } finally {
        await mongoVectorStore.disconnect();
        process.exit(0);
    }
}

inspectEmbeddings();
