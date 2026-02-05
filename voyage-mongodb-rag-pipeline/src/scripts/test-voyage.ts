import { config } from '../config';
import { voyageAIService } from '../services/voyageAI';
import { logger } from '../utils/logger';

async function testVoyageAI(): Promise<void> {
  try {
    console.log('🔍 Testing VoyageAI API Key...\n');
    console.log(`API Key: ${config.voyageAI.apiKey ? config.voyageAI.apiKey.substring(0, 10) + '...' : 'MISSING'}`);
    console.log(`Key Length: ${config.voyageAI.apiKey?.length || 0}`);
    console.log(`Model: ${config.voyageAI.embeddingModel}\n`);

    // Test with a simple text
    const testText = "Hello world";
    console.log(`Testing with: "${testText}"`);

    const embeddings = await voyageAIService.generateEmbeddings([testText], 'query');
    
    console.log('✅ VoyageAI Success!');
    console.log(`Generated embeddings: ${JSON.stringify(embeddings).substring(0, 100)}...`);
    console.log(`Embedding type: ${typeof embeddings}`);

  } catch (error: any) {
    console.error('❌ VoyageAI Error:', error.message);
    
    if (error.message.includes('403')) {
      console.log('\n💡 403 Forbidden usually means:');
      console.log('   - API key is invalid or expired');
      console.log('   - No permissions for this model');
      console.log('   - Account needs verification');
    } else if (error.message.includes('401')) {
      console.log('\n💡 401 Unauthorized usually means:');
      console.log('   - API key format is wrong');
      console.log('   - Key is deactivated');
    } else if (error.message.includes('429')) {
      console.log('\n💡 429 Rate Limit usually means:');
      console.log('   - Too many requests');
      console.log('   - Key is working but rate limited');
    }
  }
}

// Run the test
if (require.main === module) {
  testVoyageAI();
}

export { testVoyageAI };
