"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDatabase = setupDatabase;
const database_1 = require("../services/database");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
async function setupDatabase() {
    try {
        logger_1.logger.info('Starting database setup...');
        // Validate configuration
        (0, config_1.validateConfig)();
        // Connect to database
        await database_1.databaseService.connect();
        // Initialize collections (create them if they don't exist)
        logger_1.logger.info('Initializing collections...');
        await database_1.databaseService.initializeCollections();
        // Create vector search index
        logger_1.logger.info('Creating vector search index...');
        await database_1.databaseService.createVectorSearchIndex();
        // Skip VoyageAI test - using MongoDB Atlas embeddings instead
        logger_1.logger.info('Skipping VoyageAI test - using MongoDB Atlas embeddings');
        /*
        logger.info('Testing VoyageAI connection...');
        const voyageConnected = await voyageAIService.testConnection();
        
        if (!voyageConnected) {
          throw new Error('VoyageAI connection failed');
        }
        */
        // TODO: Test RAG pipeline after VoyageAI is working
        logger_1.logger.info('Skipping RAG pipeline test for now...');
        /*
        logger.info('Testing RAG pipeline...');
        const ragWorking = await ragService.testRAGPipeline();
        
        if (!ragWorking) {
          throw new Error('RAG pipeline test failed');
        }
        */
        // Get database stats
        const stats = await database_1.databaseService.getStats();
        logger_1.logger.info('Database setup completed successfully', {
            database: stats,
            voyageAI: 'skipped - needs valid API key',
            ragPipeline: 'skipped - depends on VoyageAI'
        });
        console.log('✅ Database setup completed successfully!');
        console.log(`📊 Database stats:`, stats);
        console.log('🔗 VoyageAI: Skipped - needs valid API key');
        console.log('🤖 RAG Pipeline: Skipped - depends on VoyageAI');
        console.log('\n💡 Next steps:');
        console.log('1. Get a valid VoyageAI API key from https://voyageai.com/');
        console.log('2. Update VOYAGE_API_KEY in your .env file');
        console.log('3. Run the setup script again to test the full pipeline');
        await database_1.databaseService.disconnect();
    }
    catch (error) {
        logger_1.logger.log('error', 'Database setup failed', {
            error: error.message
        });
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}
// Run setup
if (require.main === module) {
    setupDatabase();
}
//# sourceMappingURL=setup-database.js.map