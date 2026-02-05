"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const database_1 = require("./services/database");
const voyageAI_1 = require("./services/voyageAI");
const rag_1 = require("./services/rag");
const documentProcessor_1 = require("./services/documentProcessor");
const joi_1 = __importDefault(require("joi"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
// Validation schemas
const searchSchema = joi_1.default.object({
    query: joi_1.default.string().required().min(1).max(1000),
    maxResults: joi_1.default.number().integer().min(1).max(50).default(10),
    filters: joi_1.default.object({
        documentType: joi_1.default.array().items(joi_1.default.string().valid('pdf', 'docx', 'txt', 'md', 'html')),
        author: joi_1.default.string(),
        project: joi_1.default.string(),
        tags: joi_1.default.array().items(joi_1.default.string()),
        dateRange: joi_1.default.object({
            start: joi_1.default.date(),
            end: joi_1.default.date()
        })
    }).optional(),
    includeReranking: joi_1.default.boolean().default(false)
});
const ragSchema = joi_1.default.object({
    query: joi_1.default.string().required().min(1).max(1000),
    maxResults: joi_1.default.number().integer().min(1).max(50).default(10),
    filters: joi_1.default.object().optional(),
    includeReranking: joi_1.default.boolean().default(true),
    llmProvider: joi_1.default.string().valid('openai', 'anthropic').optional()
});
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default per file
        files: 10 // Maximum 10 files per upload
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
        const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(fileExtension)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type: ${fileExtension}`));
        }
    }
});
function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Serve static files
    app.use(express_1.default.static('public'));
    // Request logging
    app.use((req, res, next) => {
        logger_1.logger.info('Incoming request', {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        next();
    });
    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                services: {
                    database: 'unknown',
                    voyageai: 'unknown',
                    llm: 'unknown'
                }
            };
            // Check database connection
            try {
                await database_1.databaseService.getStats();
                health.services.database = 'healthy';
            }
            catch (error) {
                health.services.database = 'unhealthy';
                health.status = 'degraded';
            }
            // Check VoyageAI connection
            try {
                const voyageConnected = await voyageAI_1.voyageAIService.testConnection();
                health.services.voyageai = voyageConnected ? 'healthy' : 'unhealthy';
                if (!voyageConnected) {
                    health.status = 'degraded';
                }
            }
            catch (error) {
                health.services.voyageai = 'unhealthy';
                health.status = 'degraded';
            }
            // Check LLM configuration
            if (config_1.config.llm.apiKey) {
                health.services.llm = 'configured';
            }
            else {
                health.services.llm = 'not_configured';
            }
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
        }
        catch (error) {
            logger_1.logger.log('error', 'Health check failed', {
                error: error.message
            });
            res.status(500).json({
                status: 'unhealthy',
                error: 'Health check failed'
            });
        }
    });
    // Search endpoint
    app.post('/api/search', async (req, res) => {
        try {
            const { error, value } = searchSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.details
                });
            }
            const results = await rag_1.ragService.searchDocuments(value.query, value.maxResults, value.filters, value.includeReranking);
            res.json({
                query: value.query,
                results,
                count: results.length,
                metadata: {
                    maxResults: value.maxResults,
                    includeReranking: value.includeReranking,
                    filters: value.filters
                }
            });
        }
        catch (error) {
            logger_1.logger.log('error', 'Search request failed', {
                query: req.body.query,
                error: error.message
            });
            res.status(500).json({
                error: 'Search failed',
                message: error.message
            });
        }
    });
    // RAG endpoint
    app.post('/api/rag', async (req, res) => {
        try {
            const { error, value } = ragSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.details
                });
            }
            const response = await rag_1.ragService.processRAGQuery(value);
            res.json(response);
        }
        catch (error) {
            logger_1.logger.log('error', 'RAG processing failed', {
                query: req.query.query,
                error: error.message
            });
            res.status(500).json({
                error: 'RAG processing failed',
                message: error.message
            });
        }
    });
    // Document upload endpoint
    app.post('/api/documents/upload', upload.array('documents'), async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    error: 'No files uploaded'
                });
            }
            const files = req.files;
            const results = [];
            for (const file of files) {
                try {
                    const { title, author, project, tags } = req.body;
                    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
                    const documentType = fileExtension.substring(1);
                    // Extract text from file
                    const content = await documentProcessor_1.documentProcessor.extractText(file.buffer, documentType);
                    // Create document record
                    const documentId = await database_1.databaseService.createDocument({
                        title: title || file.originalname,
                        content,
                        type: documentType,
                        source: file.originalname,
                        metadata: {
                            author: author || undefined,
                            project: project || undefined,
                            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : undefined,
                            wordCount: content.split(/\s+/).length
                        }
                    });
                    // Process document into chunks
                    const chunks = await documentProcessor_1.documentProcessor.processDocument(content, documentId, documentType, config_1.config.processing.chunkSize, config_1.config.processing.chunkOverlap);
                    // Generate embeddings for chunks
                    const chunkTexts = chunks.map((chunk) => chunk.content);
                    const embeddings = await voyageAI_1.voyageAIService.batchGenerateEmbeddings(chunkTexts, config_1.config.processing.batchSize, 'document');
                    // Add embeddings to chunks and save
                    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
                        ...chunk,
                        embedding: embeddings[index]
                    }));
                    await database_1.databaseService.createChunks(chunksWithEmbeddings);
                    results.push({
                        documentId,
                        title: title || file.originalname,
                        type: documentType,
                        chunksCreated: chunks.length,
                        embeddingsGenerated: embeddings.length,
                        size: file.size,
                        originalname: file.originalname
                    });
                    logger_1.logger.info('Document uploaded and processed', {
                        documentId,
                        title: title || file.originalname,
                        type: documentType,
                        chunksCreated: chunks.length,
                        embeddingsGenerated: embeddings.length
                    });
                }
                catch (fileError) {
                    logger_1.logger.error('Failed to process individual file', {
                        filename: file.originalname,
                        error: fileError.message
                    });
                    results.push({
                        filename: file.originalname,
                        error: fileError.message,
                        success: false
                    });
                }
            }
            const successCount = results.filter(r => !r.error).length;
            const failureCount = results.filter(r => r.error).length;
            res.json({
                message: `Processed ${successCount} files successfully${failureCount > 0 ? ` (${failureCount} failed)` : ''}`,
                results,
                summary: {
                    total: files.length,
                    successful: successCount,
                    failed: failureCount
                }
            });
        }
        catch (error) {
            logger_1.logger.log('error', 'Document upload failed', {
                error: error.message,
                filesCount: req.files?.length || 0
            });
            res.status(500).json({
                error: 'Document upload failed',
                message: error.message
            });
        }
    });
    // Get documents endpoint
    app.get('/api/documents', async (req, res) => {
        try {
            const { project, author, type, limit = 50, offset = 0 } = req.query;
            const filters = {};
            if (project)
                filters['metadata.project'] = project;
            if (author)
                filters['metadata.author'] = author;
            if (type)
                filters.type = type;
            const documents = await database_1.databaseService.getDocuments(filters);
            // Apply pagination
            const startIndex = parseInt(offset);
            const endIndex = startIndex + parseInt(limit);
            const paginatedDocuments = documents.slice(startIndex, endIndex);
            res.json({
                documents: paginatedDocuments,
                total: documents.length,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        }
        catch (error) {
            logger_1.logger.log('error', 'Get documents failed', {
                error: error.message
            });
            res.status(500).json({
                error: 'Failed to retrieve documents',
                message: error.message
            });
        }
    });
    // Get document by ID
    app.get('/api/documents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const document = await database_1.databaseService.getDocument(id);
            if (!document) {
                return res.status(404).json({
                    error: 'Document not found'
                });
            }
            res.json(document);
        }
        catch (error) {
            logger_1.logger.log('error', 'Get document failed', {
                documentId: req.params.id,
                error: error.message
            });
            res.status(500).json({
                error: 'Failed to retrieve document',
                message: error.message
            });
        }
    });
    // Delete document
    app.delete('/api/documents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const success = await database_1.databaseService.deleteDocument(id);
            if (!success) {
                return res.status(404).json({
                    error: 'Document not found'
                });
            }
            res.json({
                message: 'Document deleted successfully'
            });
        }
        catch (error) {
            logger_1.logger.log('error', 'Document ingestion failed', {
                documentId: req.params.id,
                error: error.message
            });
            res.status(500).json({
                error: 'Failed to delete document',
                message: error.message
            });
        }
    });
    // Get similar documents
    app.get('/api/documents/:id/similar', async (req, res) => {
        try {
            const { id } = req.params;
            const { limit = 5 } = req.query;
            const similarDocuments = await rag_1.ragService.getSimilarDocuments(id, parseInt(limit));
            res.json({
                documentId: id,
                similarDocuments,
                count: similarDocuments.length
            });
        }
        catch (error) {
            logger_1.logger.log('error', 'Get similar documents failed', {
                documentId: req.params.id,
                error: error.message
            });
            res.status(500).json({
                error: 'Failed to get similar documents',
                message: error.message
            });
        }
    });
    // Get system stats
    app.get('/api/stats', async (req, res) => {
        try {
            const stats = await database_1.databaseService.getStats();
            const modelInfo = voyageAI_1.voyageAIService.getModelInfo();
            res.json({
                database: stats,
                models: modelInfo,
                processing: {
                    batchSize: config_1.config.processing.batchSize,
                    chunkSize: config_1.config.processing.chunkSize,
                    chunkOverlap: config_1.config.processing.chunkOverlap
                }
            });
        }
        catch (error) {
            logger_1.logger.log('error', 'Get stats failed', {
                error: error.message
            });
            res.status(500).json({
                error: 'Failed to retrieve stats',
                message: error.message
            });
        }
    });
    // Dashboard routes
    app.use('/api/dashboard', dashboard_1.default);
    // Error handling middleware
    app.use((error, req, res, next) => {
        logger_1.logger.error(error, 'Unhandled error', {
            method: req.method,
            url: req.url
        });
        if (error instanceof multer_1.default.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'File too large',
                    message: `Maximum file size is ${process.env.MAX_FILE_SIZE || '10MB'} per file`,
                    maxSize: process.env.MAX_FILE_SIZE || '10MB'
                });
            }
            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    error: 'Too many files',
                    message: 'Maximum 10 files allowed per upload'
                });
            }
            if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    error: 'Unexpected file field',
                    message: 'Expected files field name: documents'
                });
            }
        }
        res.status(500).json({
            error: 'Internal server error',
            message: config_1.config.server.environment === 'development' ? error.message : 'Something went wrong'
        });
    });
    // 404 handler
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Not found',
            message: `Route ${req.method} ${req.originalUrl} not found`
        });
    });
    return app;
}
//# sourceMappingURL=app.js.map