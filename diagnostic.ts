import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

async function test() {
  const result = await streamText({
    model: google('gemini-1.5-flash'),
    prompt: 'Hello',
    // @ts-expect-error - testing properties
    maxTokens: 100,
  });
}
