import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

async function listIndexes() {
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
    });

    try {
        const indexes = await pc.listIndexes();
        console.log('Available Indexes:', JSON.stringify(indexes, null, 2));

        const targetIndexName = process.env.PINECONE_INDEX_NAME;
        console.log(`Configured Index Name: ${targetIndexName}`);

        // Check if target index exists in the list
        const exists = indexes.indexes?.some(idx => idx.name === targetIndexName);
        if (exists) {
            console.log(`✅ Index '${targetIndexName}' found.`);
            // Describe index to check host/region
            const description = await pc.describeIndex(targetIndexName!);
            console.log('Index Description:', JSON.stringify(description, null, 2));
        } else {
            console.log(`❌ Index '${targetIndexName}' NOT found.`);
        }

    } catch (error) {
        console.error('Error listing indexes:', error);
    }
}

listIndexes();
