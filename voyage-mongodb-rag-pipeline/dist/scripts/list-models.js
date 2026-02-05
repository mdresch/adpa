"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGoogleModels = listGoogleModels;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("../config");
async function listGoogleModels() {
    try {
        console.log('🔍 Listing available Google AI models...\n');
        if (!config_1.config.llm.apiKey || config_1.config.llm.provider !== 'google') {
            throw new Error('Google AI not configured');
        }
        const googleAI = new generative_ai_1.GoogleGenerativeAI(config_1.config.llm.apiKey);
        // Try to get model list - this might not be available in the SDK
        // Let's try some common model names instead
        const modelsToTry = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-pro',
            'gemini-pro-vision',
            'text-bison-001',
            'chat-bison-001'
        ];
        console.log('Testing available models:\n');
        for (const modelName of modelsToTry) {
            try {
                console.log(`Testing ${modelName}...`);
                const model = googleAI.getGenerativeModel({ model: modelName });
                // Try a simple generation to see if model exists
                const result = await model.generateContent('Hello');
                console.log(`✅ ${modelName} - Available`);
                console.log(`   Response: ${result.response.text().substring(0, 50)}...\n`);
                break; // Stop at first working model
            }
            catch (error) {
                if (error.message.includes('404') || error.message.includes('not found')) {
                    console.log(`❌ ${modelName} - Not found\n`);
                }
                else if (error.message.includes('403') || error.message.includes('permission')) {
                    console.log(`❌ ${modelName} - No permission\n`);
                }
                else {
                    console.log(`❌ ${modelName} - Error: ${error.message}\n`);
                }
            }
        }
    }
    catch (error) {
        console.error('❌ Failed to list models:', error.message);
    }
}
// Run the test
if (require.main === module) {
    listGoogleModels();
}
//# sourceMappingURL=list-models.js.map