import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

async function testGoogleEmbeddings(): Promise<void> {
  try {
    console.log('🔍 Testing Google AI Embeddings...\n');

    if (!config.llm.apiKey || config.llm.provider !== 'google') {
      throw new Error('Google AI not configured');
    }

    const googleAI = new GoogleGenerativeAI(config.llm.apiKey);
    
    // Try embedding model (Google AI supports embeddings)
    const model = googleAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const testText = "Hello world, this is a test";
    console.log(`Testing with: "${testText}"`);

    const result = await model.embedContent(testText);
    const embedding = result.embedding;
    
    console.log('✅ Google AI Embeddings Success!');
    console.log(`Embedding dimensions: ${embedding.values.length}`);
    console.log(`First 5 values: [${embedding.values.slice(0, 5).join(', ')}]`);

  } catch (error: any) {
    console.error('❌ Google AI Embeddings Error:', error.message);
    
    if (error.message.includes('404')) {
      console.log('\n💡 This model might not be available');
      console.log('   Google AI might use different embedding model names');
    } else if (error.message.includes('403')) {
      console.log('\n💡 Permission issue with embeddings API');
    }
  }
}

// Run the test
if (require.main === module) {
  testGoogleEmbeddings();
}

export { testGoogleEmbeddings };
