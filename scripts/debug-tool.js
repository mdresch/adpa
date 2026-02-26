const { tool } = require('ai');
const { z } = require('zod');

const searchTool = tool({
    description: 'Search the web',
    parameters: z.object({
        query: z.string().describe('The query to search for')
    }),
    execute: async () => ({ results: [] })
});

console.log('Tool keys:', Object.keys(searchTool));
console.log('inputSchema keys:', searchTool.inputSchema ? Object.keys(searchTool.inputSchema) : 'undefined');
if (searchTool.inputSchema && searchTool.inputSchema.jsonSchema) {
    console.log('Detected jsonSchema wrapper!');
}
