"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logRAGPerformance = exports.logSearchPerformance = exports.logEmbeddingGeneration = exports.logDocumentProcessing = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
// Create logs directory if it doesn't exist
const logDir = path_1.default.dirname(process.env.LOG_FILE || './logs/app.log');
// Define log format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.prettyPrint());
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'voyage-mongodb-rag-pipeline',
        environment: config_1.config.server.environment
    },
    transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error'
        }),
        // Write all logs to `combined.log`
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log')
        })
    ],
});
// If we're not in production, log to the console as well
if (config_1.config.server.environment !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(({ level, message, timestamp, ...meta }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            // Add metadata if present
            if (Object.keys(meta).length > 0) {
                msg += ` ${JSON.stringify(meta)}`;
            }
            return msg;
        }))
    }));
}
// Helper functions for structured logging
const logDocumentProcessing = (documentId, action, metadata) => {
    exports.logger.info('Document processing', {
        documentId,
        action,
        ...metadata
    });
};
exports.logDocumentProcessing = logDocumentProcessing;
const logEmbeddingGeneration = (batchSize, model, duration) => {
    exports.logger.info('Embedding generation completed', {
        batchSize,
        model,
        duration,
        embeddingsPerSecond: Math.round(batchSize / (duration / 1000))
    });
};
exports.logEmbeddingGeneration = logEmbeddingGeneration;
const logSearchPerformance = (query, resultCount, duration) => {
    exports.logger.info('Search completed', {
        query: query.substring(0, 100), // Truncate long queries
        resultCount,
        duration
    });
};
exports.logSearchPerformance = logSearchPerformance;
const logRAGPerformance = (query, totalDuration, breakdown) => {
    exports.logger.info('RAG pipeline completed', {
        query: query.substring(0, 100),
        totalDuration,
        ...breakdown
    });
};
exports.logRAGPerformance = logRAGPerformance;
const logError = (error, context, metadata) => {
    exports.logger.error('Application error', {
        message: error.message,
        stack: error.stack,
        context,
        ...metadata
    });
};
exports.logError = logError;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map