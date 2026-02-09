
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from server root
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (result.error) {
    console.error("❌ Failed to load .env file:", result.error);
}

import { mongoVectorStore } from '../src/services/mongoVectorStore';
import { voyageAIService } from '../src/services/voyageAIService';

function mask(str: string | undefined) {
    if (!str) return "❌ MISSING";
    if (str.length < 10) return "⚠️ TOO SHORT";
    return `✅ PRESENT (${str.substring(0, 4)}...${str.substring(str.length - 4)})`;
}

async function verify() {
    console.log('🔍 Verifying RAG Integration (Debug Mode)...');

    console.log('\n1. Environment Check:');
    console.log(`- MONGODB_URI: ${mask(process.env.MONGODB_URI)}`);
    console.log(`- VOYAGE_API_KEY: ${mask(process.env.VOYAGE_API_KEY)}`);

    if (!process.env.VOYAGE_API_KEY || process.env.VOYAGE_API_KEY.includes('your-voyage-ai-api-key')) {
        console.error("🛑 VOYAGE_API_KEY appears to be the default placeholder. Please update it in .env");
        process.exit(1);
    }

    try {
        // 2. Test VoyageAI
        console.log('\n🧪 Testing VoyageAI Connection...');
        try {
            const embedding = await voyageAIService.generateEmbedding('test connection');
            if (embedding.length > 0) {
                console.log('✅ VoyageAI Connection Successful');
            } else {
                console.error('❌ VoyageAI returned empty embedding');
            }
        } catch (e: any) {
            console.error('❌ VoyageAI Failed:', e.message);
            if (e.response) {
                console.error('   Status:', e.response.status);
                console.error('   Body:', e.response.data);
            }
        }

        // 3. Test MongoDB Connection
        console.log('\n🧪 Testing MongoDB Connection...');
        try {
            await mongoVectorStore.connect();
            console.log('✅ MongoDB Connected');
            await mongoVectorStore.disconnect();
        } catch (e: any) {
            console.error('❌ MongoDB Connection Failed:', e.message);
        }

    } catch (error) {
        console.error('\n❌ Unexpected Error:', (error as Error).message);
    }
}

verify();
