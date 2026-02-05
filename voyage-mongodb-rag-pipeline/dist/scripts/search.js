"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSearchTests = runSearchTests;
const rag_1 = require("../services/rag");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const testQueries = [
    {
        query: "What are the main project management methodologies?",
        description: "Basic project management query"
    },
    {
        query: "How do you handle risk management in software projects?",
        description: "Risk management specific query"
    },
    {
        query: "What are the best practices for stakeholder communication?",
        description: "Stakeholder management query"
    },
    {
        query: "Explain the project lifecycle phases",
        description: "Project lifecycle query"
    },
    {
        query: "What metrics should be tracked for project success?",
        description: "Project metrics query"
    }
];
async function runSearchTests() {
    try {
        logger_1.logger.info('Starting search performance tests...');
        // Validate configuration
        (0, config_1.validateConfig)();
        console.log('🔍 Running Search Performance Tests\n');
        for (let i = 0; i < testQueries.length; i++) {
            const test = testQueries[i];
            console.log(`\n${i + 1}. ${test.description}`);
            console.log(`Query: "${test.query}"`);
            // Test without reranking
            console.log('\n  📊 Without Reranking:');
            const startNoRerank = Date.now();
            const resultsNoRerank = await rag_1.ragService.searchDocuments(test.query, 5, undefined, false);
            const timeNoRerank = Date.now() - startNoRerank;
            console.log(`    Time: ${timeNoRerank}ms`);
            console.log(`    Results: ${resultsNoRerank.length}`);
            if (resultsNoRerank.length > 0) {
                console.log(`    Top score: ${resultsNoRerank[0].score.toFixed(4)}`);
                console.log(`    Top result: ${resultsNoRerank[0].chunk.content.substring(0, 100)}...`);
            }
            // Test with reranking
            console.log('\n  🔄 With Reranking:');
            const startRerank = Date.now();
            const resultsRerank = await rag_1.ragService.searchDocuments(test.query, 5, undefined, true);
            const timeRerank = Date.now() - startRerank;
            console.log(`    Time: ${timeRerank}ms`);
            console.log(`    Results: ${resultsRerank.length}`);
            if (resultsRerank.length > 0) {
                console.log(`    Top score: ${resultsRerank[0].score.toFixed(4)}`);
                console.log(`    Relevance: ${resultsRerank[0].relevanceScore?.toFixed(4) || 'N/A'}`);
                console.log(`    Top result: ${resultsRerank[0].chunk.content.substring(0, 100)}...`);
            }
            // Performance comparison
            const improvement = ((timeNoRerank - timeRerank) / timeNoRerank * 100).toFixed(1);
            console.log(`    ⚡ Performance: ${timeRerank < timeNoRerank ? '+' : ''}${improvement}% change`);
        }
        console.log('\n✅ Search performance tests completed!');
    }
    catch (error) {
        logger_1.logger.log('error', 'Search performance tests failed', {
            error: error.message
        });
        console.error('❌ Search performance tests failed:', error.message);
        process.exit(1);
    }
}
// Run tests
if (require.main === module) {
    runSearchTests();
}
//# sourceMappingURL=search.js.map