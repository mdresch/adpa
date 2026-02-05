import { createApp } from './app';
import { databaseService } from './services/database';
import { ragService } from './services/rag';
import { validateConfig, validateBasicConfig, config } from './config';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    // Validate basic configuration (skip VoyageAI for now)
    validateBasicConfig();
    logger.info('Basic configuration validated successfully');

    // Initialize database connection
    await databaseService.connect();
    
    // TODO: Create vector search index after fixing the index definition
    logger.info('Skipping vector search index creation for now...');
    // await databaseService.createVectorSearchIndex();
    
    // TODO: Test RAG pipeline after VoyageAI is configured
    logger.info('Skipping RAG pipeline test for now...');
    /*
    const ragTest = await ragService.testRAGPipeline();
    if (!ragTest) {
      logger.warn('RAG pipeline test failed, but starting server anyway');
    }
    */

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.server.port, () => {
      logger.info('Server started successfully', {
        port: config.server.port,
        environment: config.server.environment,
        nodeVersion: process.version
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await databaseService.disconnect();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.log('error', 'Error during shutdown', {
            error: (error as Error).message
          });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.log('error', 'Uncaught exception', {
      error: error.message,
      stack: error.stack
    });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.log('error', 'Unhandled rejection', {
      reason: String(reason),
      promise: promise.toString()
    });
      process.exit(1);
    });

  } catch (error) {
    logger.log('error', 'Failed to start server', {
      error: (error as Error).message
    });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { startServer };
