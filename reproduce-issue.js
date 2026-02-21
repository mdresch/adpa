const { generateText, tool } = require('ai');
const { z } = require('zod');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');

async function main() {
    const google = createGoogleGenerativeAI({
        apiKey: 'dummy'
    });

    const model = google('gemini-1.5-flash');

    const searchTool = tool({
        description: 'Search the web',
        inputSchema: z.object({
            query: z.string().describe('The query to search for')
        }),
        execute: async function* ({ query }) {
            yield { type: 'searching', query };
            return { results: [] };
        }
    });

    console.log('--- Calling generateText ---');
    try {
        await generateText({
            model,
            tools: {
                search: searchTool
            },
            prompt: 'test'
        });
    } catch (e) {
        console.log('Error (expected):', e.message);
    }
}

main();
