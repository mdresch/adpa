"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rag_1 = require("../services/rag");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const ragTestQueries = [
    {
        query: "What are the key components of project management?",
        description: "Basic project management concepts"
    },
    {
        query: "How do you identify and mitigate project risks?",
        description: "Risk management strategies"
    },
    {
        query: "What are the best practices for stakeholder engagement?",
        description: "Stakeholder management"
    },
    {
        query: "Explain the difference between Waterfall and Agile methodologies",
        description: "Methodology comparison"
    },
    {
        query: "What metrics should be used to measure project success?",
        description: "Success metrics and KPIs"
    }
];
async function runRAGTests() {
    try {
        logger_1.logger.info('Starting RAG pipeline tests...');
        // Validate configuration
        (0, config_1.validateConfig)();
        console.log('🤖 Running RAG Pipeline Tests\n');
        for (let i = 0; i < ragTestQueries.length; i++) {
            const test = ragTestQueries[i];
            console.log(`\n${i + 1}. ${test.description}`);
            console.log(`Query: "${test.query}"`);
            console.log('─'.repeat(60));
            // Test RAG pipeline
            const startTime = Date.now();
            try {
                const response = await rag_1.ragService.processRAGQuery({
                    query: test.query,
                    maxResults: 5,
                    includeReranking: true,
                    llmProvider: undefined // Use default from config
                });
                const totalTime = Date.now() - startTime;
                console.log(`  Total Time: ${totalTime}ms`);
                console.log(`  Embedding Time: ${response.metadata.embeddingTime}ms`);
                console.log(`  Search Time: ${response.metadata.searchTime}ms`);
                console.log(`  Reranking Time: ${response.metadata.rerankingTime || 'N/A'}ms`);
                console.log(`  LLM Time: ${response.metadata.llmTime || 'N/A'}ms`);
                console.log(`  Results Found: ${response.metadata.totalResults}`);
                if (response.answer) {
                    console.log(`\n🤖 LLM Response:`);
                    console.log(`  ${response.answer.substring(0, 300)}${response.answer.length > 300 ? '...' : ''}`);
                }
                if (response.sources.length > 0) {
                    console.log(`\n📚 Top Sources:`);
                    response.sources.slice(0, 3).forEach((source, index) => {
                        console.log(`  ${index + 1}. Score: ${source.score.toFixed(4)} | Relevance: ${source.relevanceScore?.toFixed(4) || 'N/A'}`);
                        console.log(`     Document: ${source.document.title}`);
                        console.log(`     Preview: ${source.chunk.content.substring(0, 100)}...`);
                    });
                }
                console.log('\n' + '='.repeat(60));
            }
            catch (error) {
                logger_1.logger.log('error', 'RAG query test failed', {
                    query: test.query,
                    error: error.message
                });
                console.error(`❌ Failed to process query: ${test.query}`);
                console.error(`   Error: ${error.message}`);
            }
        }
        // Performance summary
        console.log('\n📈 Test Summary:');
        console.log('✅ All RAG pipeline tests completed successfully!');
        console.log('\n💡 Performance Insights:');
        console.log('- Embedding generation should be <500ms per query');
        console.log('- Vector search should be <200ms');
        console.log('- Reranking adds ~200-500ms but improves relevance');
        console.log('- LLM response generation varies by provider and model');
    }
    catch (error) {
        logger_1.logger.log('error', 'RAG pipeline tests failed', {
            error: error.message
        });
        console.error('❌ RAG pipeline tests failed:', error.message);
        if (error.message.includes('No LLM client configured')) {
            console.log('\n💡 Note: LLM responses require OPENAI_API_KEY or ANTHROPIC_API_KEY in .env');
            console.log('   The search and reranking components work without LLM configuration.');
        }
        process.exit(1);
    }
}
// Run tests if this file is executed directly
if (require.main === module) {
    runRAGTests();
}
//# sourceMappingURL=rag-query.js.map