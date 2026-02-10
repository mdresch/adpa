
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'adpa_rag';

async function checkDimensions() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(MONGODB_DB_NAME);
        const collection = db.collection('chunks');

        // Find one chunk with an embedding
        const chunk = await collection.findOne({ embedding: { $exists: true, $not: { $size: 0 } } });

        if (!chunk) {
            console.log('No chunks found with embeddings.');
        } else {
            console.log(`Found chunk ID: ${chunk._id}`);
            console.log(`Embedding dimensions: ${chunk.embedding.length}`);
            console.log(`Model used (if stored): ${chunk.embedding_model || 'unknown'}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkDimensions();
