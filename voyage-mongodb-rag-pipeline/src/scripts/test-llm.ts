import { config } from '../config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Mistral from '@mistralai/mistralai';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

async function testLLMOnly(): Promise<void> {
  try {
    console.log('🤖 Testing LLM directly...\n');
    console.log(`Provider: ${config.llm.provider}`);
    console.log(`Model: ${config.llm.model}\n`);

    const testQuery = "What are the key components of project management?";
    console.log(`Question: ${testQuery}\n`);

    let answer = '';

    if (config.llm.provider === 'google' && config.llm.apiKey) {
      const googleAI = new GoogleGenerativeAI(config.llm.apiKey);
      const model = googleAI.getGenerativeModel({ 
        model: config.llm.model,
        generationConfig: {
          maxOutputTokens: config.llm.maxTokens,
          temperature: config.llm.temperature
        }
      });

      const response = await model.generateContent(testQuery);
      answer = response.response.text();

    } else if (config.llm.provider === 'mistral' && config.llm.apiKey) {
      const mistral = new Mistral(config.llm.apiKey);
      const response = await mistral.chat({
        model: config.llm.model,
        messages: [
          {
            role: 'user',
            content: testQuery
          }
        ],
        maxTokens: config.llm.maxTokens,
        temperature: config.llm.temperature
      });

      answer = response.choices[0]?.message?.content || 'No response generated';

    } else if (config.llm.provider === 'openai' && config.llm.apiKey) {
      const openai = new OpenAI({ apiKey: config.llm.apiKey });
      const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'user',
            content: testQuery
          }
        ],
        max_tokens: config.llm.maxTokens,
        temperature: config.llm.temperature
      });

      answer = response.choices[0]?.message?.content || 'No response generated';

    } else if (config.llm.provider === 'anthropic' && config.llm.apiKey) {
      const anthropic = new Anthropic({ apiKey: config.llm.apiKey });
      const response = await anthropic.messages.create({
        model: config.llm.model,
        max_tokens: config.llm.maxTokens,
        temperature: config.llm.temperature,
        messages: [
          {
            role: 'user',
            content: testQuery
          }
        ]
      });

      const textContent = response.content.find(item => item.type === 'text');
      answer = textContent?.text || 'No response generated';

    } else {
      throw new Error(`${config.llm.provider} not configured or API key missing`);
    }

    console.log('✅ LLM Response:');
    console.log('─'.repeat(50));
    console.log(answer);
    console.log('─'.repeat(50));

    logger.info('LLM test successful', { 
      provider: config.llm.provider,
      model: config.llm.model,
      queryLength: testQuery.length,
      responseLength: answer.length 
    });

  } catch (error) {
    console.error('❌ LLM test failed:', (error as Error).message);
    logger.log('error', 'LLM test failed', {
      provider: config.llm.provider,
      error: (error as Error).message
    });
  }
}

// Run the test
if (require.main === module) {
  testLLMOnly();
}

export { testLLMOnly };
