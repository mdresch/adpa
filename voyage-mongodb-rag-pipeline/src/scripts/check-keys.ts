import { config } from '../config';

console.log('🔍 API Key Configuration Check\n');

// Check VoyageAI
console.log('VoyageAI:');
console.log(`  Key: ${config.voyageAI.apiKey ? config.voyageAI.apiKey.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`  Model: ${config.voyageAI.embeddingModel}`);
console.log(`  Key Length: ${config.voyageAI.apiKey?.length || 0}`);

// Check LLM Provider
console.log('\nLLM Provider:');
console.log(`  Provider: ${config.llm.provider}`);
console.log(`  Model: ${config.llm.model}`);
console.log(`  Key: ${config.llm.apiKey ? config.llm.apiKey.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`  Key Length: ${config.llm.apiKey?.length || 0}`);

// Check individual provider keys
console.log('\nIndividual API Keys:');
console.log(`  Mistral: ${process.env.MISTRAL_API_KEY ? process.env.MISTRAL_API_KEY.substring(0, 10) + '...' : 'MISSING'} (${process.env.MISTRAL_API_KEY?.length || 0} chars)`);
console.log(`  Google AI: ${process.env.GOOGLE_AI_API_KEY ? process.env.GOOGLE_AI_API_KEY.substring(0, 10) + '...' : 'MISSING'} (${process.env.GOOGLE_AI_API_KEY?.length || 0} chars)`);
console.log(`  OpenAI: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'MISSING'} (${process.env.OPENAI_API_KEY?.length || 0} chars)`);
console.log(`  Anthropic: ${process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'MISSING'} (${process.env.ANTHROPIC_API_KEY?.length || 0} chars)`);

console.log('\n💡 Expected Key Formats:');
console.log('  VoyageAI: Should start with "al-" or "pa-" and be ~50+ characters');
console.log('  Mistral AI: Should be ~32 characters alphanumeric');
console.log('  Google AI: Should start with "AIza" and be ~39 characters');
console.log('  OpenAI: Should start with "sk-" and be ~51 characters');
console.log('  Anthropic: Should start with "sk-ant-" and be ~50+ characters');
