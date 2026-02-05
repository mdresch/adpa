import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { databaseService } from './services/database';
import { voyageAIService } from './services/voyageAI';
import { ragService } from './services/rag';
import { documentProcessor } from './services/documentProcessor';
import { pineconeService } from './services/pineconeService';
import { RAGRequest } from './types';
import Joi from 'joi';
import dashboardRoutes from './routes/dashboard';

// Validation schemas
const searchSchema = Joi.object({
  query: Joi.string().required().min(1).max(1000),
  maxResults: Joi.number().integer().min(1).max(50).default(10),
  filters: Joi.object({
    documentType: Joi.array().items(Joi.string().valid('pdf', 'docx', 'txt', 'md', 'html')),
    author: Joi.string(),
    project: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    dateRange: Joi.object({
      start: Joi.date(),
      end: Joi.date()
    })
  }).optional(),
  includeReranking: Joi.boolean().default(false)
});

const ragSchema = Joi.object({
  query: Joi.string().required().min(1).max(1000),
  maxResults: Joi.number().integer().min(1).max(50).default(10),
  filters: Joi.object().optional(),
  includeReranking: Joi.boolean().default(true),
  llmProvider: Joi.string().valid('openai', 'anthropic').optional()
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default per file
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExtension}`));
    }
  }
});

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Serve static files
  app.use(express.static('public'));

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
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
        await databaseService.getStats();
        health.services.database = 'healthy';
      } catch (error) {
        health.services.database = 'unhealthy';
        health.status = 'degraded';
      }

      // Check VoyageAI connection
      try {
        const voyageConnected = await voyageAIService.testConnection();
        health.services.voyageai = voyageConnected ? 'healthy' : 'unhealthy';
        if (!voyageConnected) {
          health.status = 'degraded';
        }
      } catch (error) {
        health.services.voyageai = 'unhealthy';
        health.status = 'degraded';
      }

      // Check LLM configuration
      if (config.llm.apiKey) {
        health.services.llm = 'configured';
      } else {
        health.services.llm = 'not_configured';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error) {
      logger.log('error', 'Health check failed', {
        error: (error as Error).message
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

      const results = await ragService.searchDocuments(
        value.query,
        value.maxResults,
        value.filters,
        value.includeReranking
      );

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

    } catch (error) {
      logger.log('error', 'Search request failed', {
        query: req.body.query,
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Search failed',
        message: (error as Error).message
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

      const response = await ragService.processRAGQuery(value as RAGRequest);

      res.json(response);

    } catch (error) {
      logger.log('error', 'RAG processing failed', {
        query: req.query.query as string,
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'RAG processing failed',
        message: (error as Error).message
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

      const files = req.files as Express.Multer.File[];
      const results = [];
      
      for (const file of files) {
        try {
          const { title, author, project, tags } = req.body;
          const fileExtension = path.extname(file.originalname).toLowerCase();
          const documentType = fileExtension.substring(1) as any;

          // Extract text from file
          const content = await documentProcessor.extractText(file.buffer, documentType);

          // Create document record
          const documentId = await databaseService.createDocument({
            title: title || file.originalname,
            content,
            type: documentType,
            source: file.originalname,
            metadata: {
              author: author || undefined,
              project: project || undefined,
              tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : undefined,
              wordCount: content.split(/\s+/).length
            }
          });

          // Process document into chunks
          const chunks = await documentProcessor.processDocument(
            content,
            documentId,
            documentType,
            config.processing.chunkSize,
            config.processing.chunkOverlap
          );

          // Generate embeddings for chunks
          const chunkTexts = chunks.map((chunk: any) => chunk.content);
          const embeddings = await voyageAIService.batchGenerateEmbeddings(
            chunkTexts,
            config.processing.batchSize,
            'document'
          );

          // Add embeddings to chunks and save
          const chunksWithEmbeddings = chunks.map((chunk: any, index: number) => ({
            ...chunk,
            embedding: embeddings[index]
          }));

          await databaseService.createChunks(chunksWithEmbeddings);

          results.push({
            documentId,
            title: title || file.originalname,
            type: documentType,
            chunksCreated: chunks.length,
            embeddingsGenerated: embeddings.length,
            size: file.size,
            originalname: file.originalname
          });

          logger.info('Document uploaded and processed', {
            documentId,
            title: title || file.originalname,
            type: documentType,
            chunksCreated: chunks.length,
            embeddingsGenerated: embeddings.length
          });

        } catch (fileError) {
          logger.error('Failed to process individual file', {
            filename: file.originalname,
            error: (fileError as Error).message
          });
          
          results.push({
            filename: file.originalname,
            error: (fileError as Error).message,
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

    } catch (error) {
      logger.log('error', 'Document upload failed', {
        error: (error as Error).message,
        filesCount: req.files?.length || 0
      });
      
      res.status(500).json({
        error: 'Document upload failed',
        message: (error as Error).message
      });
    }
  });

  // Get documents endpoint
  app.get('/api/documents', async (req, res) => {
    try {
      const { project, author, type, limit = 50, offset = 0 } = req.query;
      
      const filters: any = {};
      if (project) filters['metadata.project'] = project;
      if (author) filters['metadata.author'] = author;
      if (type) filters.type = type;

      const documents = await databaseService.getDocuments(filters);
      
      // Apply pagination
      const startIndex = parseInt(offset as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedDocuments = documents.slice(startIndex, endIndex);

      res.json({
        documents: paginatedDocuments,
        total: documents.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

    } catch (error) {
      logger.log('error', 'Get documents failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Failed to retrieve documents',
        message: (error as Error).message
      });
    }
  });

  // Get document by ID
  app.get('/api/documents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const document = await databaseService.getDocument(id);
      
      if (!document) {
        return res.status(404).json({
          error: 'Document not found'
        });
      }

      res.json(document);

    } catch (error) {
      logger.log('error', 'Get document failed', {
        documentId: req.params.id,
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Failed to retrieve document',
        message: (error as Error).message
      });
    }
  });

  // Delete document
  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await databaseService.deleteDocument(id);
      
      if (!success) {
        return res.status(404).json({
          error: 'Document not found'
        });
      }

      res.json({
        message: 'Document deleted successfully'
      });

    } catch (error) {
      logger.log('error', 'Document ingestion failed', {
        documentId: req.params.id,
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Failed to delete document',
        message: (error as Error).message
      });
    }
  });

  // Get similar documents
  app.get('/api/documents/:id/similar', async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;
      
      const similarDocuments = await ragService.getSimilarDocuments(
        id,
        parseInt(limit as string)
      );

      res.json({
        documentId: id,
        similarDocuments,
        count: similarDocuments.length
      });

    } catch (error) {
      logger.log('error', 'Get similar documents failed', {
        documentId: req.params.id,
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Failed to get similar documents',
        message: (error as Error).message
      });
    }
  });

  // Get system stats
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await databaseService.getStats();
      const modelInfo = voyageAIService.getModelInfo();
      
      res.json({
        database: stats,
        models: modelInfo,
        processing: {
          batchSize: config.processing.batchSize,
          chunkSize: config.processing.chunkSize,
          chunkOverlap: config.processing.chunkOverlap
        }
      });

    } catch (error) {
      logger.log('error', 'Get stats failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Failed to retrieve stats',
        message: (error as Error).message
      });
    }
  });

  // Pinecone search endpoint
  app.post('/api/pinecone/search', async (req, res) => {
    try {
      const { query, topK = 10, filter } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Query is required and must be a string'
        });
      }

      const results = await pineconeService.search(query, topK, filter);
      
      res.json({
        query,
        results,
        count: results.length,
        metadata: {
          topK,
          filter: filter || null
        }
      });

    } catch (error) {
      logger.log('error', 'Pinecone search failed', {
        query: req.body.query,
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Pinecone search failed',
        message: (error as Error).message
      });
    }
  });

  // Pinecone stats endpoint
  app.get('/api/pinecone/stats', async (req, res) => {
    try {
      const stats = await pineconeService.getIndexStats();
      
      res.json({
        pinecone: stats,
        indexName: process.env.PINECONE_INDEX_NAME || 'adpa-rag-index'
      });

    } catch (error) {
      logger.log('error', 'Get Pinecone stats failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Failed to retrieve Pinecone stats',
        message: (error as Error).message
      });
    }
  });

  // Test Pinecone connection
  app.get('/api/pinecone/test', async (req, res) => {
    try {
      const isConnected = await pineconeService.testConnection();
      
      res.json({
        connected: isConnected,
        indexName: process.env.PINECONE_INDEX_NAME || 'adpa-rag-index',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.log('error', 'Pinecone connection test failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        error: 'Pinecone connection test failed',
        message: (error as Error).message
      });
    }
  });

  // Dashboard routes
  app.use('/api/dashboard', dashboardRoutes);

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(error, 'Unhandled error', {
      method: req.method,
      url: req.url
    });

    if (error instanceof multer.MulterError) {
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
      message: config.server.environment === 'development' ? error.message : 'Something went wrong'
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
