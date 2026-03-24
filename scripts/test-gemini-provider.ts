#!/usr/bin/env tsx

import 'dotenv/config';
import { AIService } from '../server/src/services/aiService';
import { connectDatabase } from '../server/src/database/connection';

async function testGemini() {
  try {
    await connectDatabase();
    const ai = new AIService();
    
    console.log('Testing Google Gemini via AIService...');
    const result = await ai.generateWithFallback({
      provider: 'google',
      model: 'gemini-1.5-flash',
      prompt: 'Hello, are you working?',
      system_prompt: 'Respond with "YES" if you are working.'
    });
    
    console.log('\n--- Result ---');
    console.log(result.content);
    console.log('--------------');
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing Gemini:', error);
    process.exit(1);
  }
}

testGemini();
