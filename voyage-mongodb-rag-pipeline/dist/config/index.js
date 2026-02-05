"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
exports.validateBasicConfig = validateBasicConfig;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
exports.config = {
    voyageAI: {
        apiKey: process.env.VOYAGE_API_KEY || '',
        embeddingModel: process.env.VOYAGE_EMBEDDING_MODEL || 'voyage-4-large',
        rerankModel: process.env.VOYAGE_RERANK_MODEL || 'rerank-2.5',
        maxRetries: parseInt(process.env.VOYAGE_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.VOYAGE_TIMEOUT || '30000')
    },
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rag_pipeline',
        database: process.env.MONGODB_DATABASE || 'rag_pipeline',
        collections: {
            documents: 'documents',
            chunks: 'chunks',
            embeddings: 'embeddings'
        }
    },
    llm: {
        provider: process.env.LLM_PROVIDER || 'openai',
        apiKey: (process.env.LLM_PROVIDER === 'openai' ? process.env.OPENAI_API_KEY :
            process.env.LLM_PROVIDER === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
                process.env.LLM_PROVIDER === 'mistral' ? process.env.MISTRAL_API_KEY :
                    process.env.LLM_PROVIDER === 'google' ? process.env.GOOGLE_AI_API_KEY :
                        process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.MISTRAL_API_KEY || process.env.GOOGLE_AI_API_KEY) || '',
        model: process.env.LLM_MODEL || 'gpt-4o',
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1024'),
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7')
    },
    server: {
        port: parseInt(process.env.PORT || '3001'),
        environment: process.env.NODE_ENV || 'development'
    },
    processing: {
        batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100'),
        chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
        maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5')
    }
};
// Validation
function validateConfig() {
    const requiredEnvVars = [
        'VOYAGE_API_KEY',
        'MONGODB_URI'
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    if (!exports.config.voyageAI.apiKey) {
        throw new Error('VoyageAI API key is required');
    }
    if (!exports.config.database.uri) {
        throw new Error('MongoDB URI is required');
    }
}
// Basic validation for development (skip VoyageAI requirement)
function validateBasicConfig() {
    const requiredEnvVars = [
        'MONGODB_URI'
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    if (!exports.config.database.uri) {
        throw new Error('MongoDB URI is required');
    }
    // Warn about VoyageAI if not configured
    if (!exports.config.voyageAI.apiKey) {
        console.warn('⚠️  VoyageAI API key not configured - embeddings and search will not work');
    }
}
exports.default = exports.config;
//# sourceMappingURL=index.js.map