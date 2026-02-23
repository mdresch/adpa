import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

async function main() {
    const google = createGoogleGenerativeAI({
        apiKey: 'dummy'
    });

    const model = google('gemini-1.5-flash');

    console.log('--- Calling generateText (ESM) ---');
    try {
        await generateText({
            model,
            tools: {
                search: tool({
                    description: 'Search the web',
                    parameters: z.object({
                        query: z.string().describe('The query to search for')
                    }),
                    execute: async () => ({ results: [] })
                })
            },
            prompt: 'test'
        });
    } catch (e) {
        console.log('Error (expected):', e.message);
    }
}

main();
