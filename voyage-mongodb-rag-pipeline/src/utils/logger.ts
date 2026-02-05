import winston from 'winston';
import path from 'path';
import { config } from '../config';

// Create logs directory if it doesn't exist
const logDir = path.dirname(process.env.LOG_FILE || './logs/app.log');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'voyage-mongodb-rag-pipeline',
    environment: config.server.environment 
  },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    
    // Write all logs to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    })
  ],
});

// If we're not in production, log to the console as well
if (config.server.environment !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        
        return msg;
      })
    )
  }));
}

// Helper functions for structured logging
export const logDocumentProcessing = (documentId: string, action: string, metadata?: any) => {
  logger.info('Document processing', {
    documentId,
    action,
    ...metadata
  });
};

export const logEmbeddingGeneration = (batchSize: number, model: string, duration: number) => {
  logger.info('Embedding generation completed', {
    batchSize,
    model,
    duration,
    embeddingsPerSecond: Math.round(batchSize / (duration / 1000))
  });
};

export const logSearchPerformance = (query: string, resultCount: number, duration: number) => {
  logger.info('Search completed', {
    query: query.substring(0, 100), // Truncate long queries
    resultCount,
    duration
  });
};

export const logRAGPerformance = (query: string, totalDuration: number, breakdown: any) => {
  logger.info('RAG pipeline completed', {
    query: query.substring(0, 100),
    totalDuration,
    ...breakdown
  });
};

export const logError = (error: Error, context?: string, metadata?: any) => {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    context,
    ...metadata
  });
};

export default logger;
