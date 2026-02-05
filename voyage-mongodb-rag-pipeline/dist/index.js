"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const app_1 = require("./app");
const database_1 = require("./services/database");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
async function startServer() {
    try {
        // Validate basic configuration (skip VoyageAI for now)
        (0, config_1.validateBasicConfig)();
        logger_1.logger.info('Basic configuration validated successfully');
        // Initialize database connection
        await database_1.databaseService.connect();
        // TODO: Create vector search index after fixing the index definition
        logger_1.logger.info('Skipping vector search index creation for now...');
        // await databaseService.createVectorSearchIndex();
        // TODO: Test RAG pipeline after VoyageAI is configured
        logger_1.logger.info('Skipping RAG pipeline test for now...');
        /*
        const ragTest = await ragService.testRAGPipeline();
        if (!ragTest) {
          logger.warn('RAG pipeline test failed, but starting server anyway');
        }
        */
        // Create Express app
        const app = (0, app_1.createApp)();
        // Start server
        const server = app.listen(config_1.config.server.port, () => {
            logger_1.logger.info('Server started successfully', {
                port: config_1.config.server.port,
                environment: config_1.config.server.environment,
                nodeVersion: process.version
            });
        });
        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}, starting graceful shutdown`);
            server.close(async () => {
                logger_1.logger.info('HTTP server closed');
                try {
                    await database_1.databaseService.disconnect();
                    logger_1.logger.info('Database disconnected');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.log('error', 'Error during shutdown', {
                        error: error.message
                    });
                    process.exit(1);
                }
            });
            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger_1.logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.logger.log('error', 'Uncaught exception', {
                error: error.message,
                stack: error.stack
            });
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.log('error', 'Unhandled rejection', {
                reason: String(reason),
                promise: promise.toString()
            });
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.log('error', 'Failed to start server', {
            error: error.message
        });
        process.exit(1);
    }
}
// Start the server
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map