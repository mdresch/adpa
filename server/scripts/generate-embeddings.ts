import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { mongoVectorStore } from '../src/services/mongoVectorStore';
import { voyageAIService } from '../src/services/voyageAIService';
import { logger } from '../src/utils/logger';

interface ChunkDocument {
    _id: any;
    content: string;
    document_id: string;
    chunk_index?: number;
}

interface BackfillStats {
    totalChunks: number;
    chunksProcessed: number;
    chunksSkipped: number;
    chunksFailed: number;
    tokensUsed: number;
}

const BATCH_SIZE = 50; // Process chunks in batches
const MAX_CHUNKS = parseInt(process.env.MAX_CHUNKS || '0'); // 0 = all chunks
const DRY_RUN = process.env.DRY_RUN === 'true';

async function generateEmbeddings() {
    const stats: BackfillStats = {
        totalChunks: 0,
        chunksProcessed: 0,
        chunksSkipped: 0,
        chunksFailed: 0,
        tokensUsed: 0
    };

    try {
        console.log('Starting embedding generation...');
        console.log(`DRY_RUN: ${DRY_RUN}`);
        console.log(`BATCH_SIZE: ${BATCH_SIZE}`);
        console.log(`MAX_CHUNKS: ${MAX_CHUNKS || 'all'}`);

        // Connect to MongoDB
        await mongoVectorStore.connect();
        console.log('✅ Connected to MongoDB');

        const chunksCollection = mongoVectorStore.chunksCollection;

        // Count total chunks without embeddings
        const totalWithoutEmbeddings = await chunksCollection.countDocuments({
            $or: [
                { embedding: { $exists: false } },
                { embedding: { $size: 0 } },
                { embedding: null }
            ]
        });

        stats.totalChunks = totalWithoutEmbeddings;
        console.log(`Found ${totalWithoutEmbeddings} chunks without embeddings`);

        if (totalWithoutEmbeddings === 0) {
            console.log('✅ All chunks already have embeddings!');
            return stats;
        }

        // Process chunks in batches
        let processedCount = 0;
        const limit = MAX_CHUNKS > 0 ? Math.min(MAX_CHUNKS, totalWithoutEmbeddings) : totalWithoutEmbeddings;

        console.log(`Processing ${limit} chunks...`);

        while (processedCount < limit) {
            const batchSize = Math.min(BATCH_SIZE, limit - processedCount);

            // Fetch batch of chunks without embeddings
            const chunks = await chunksCollection
                .find({
                    $or: [
                        { embedding: { $exists: false } },
                        { embedding: { $size: 0 } },
                        { embedding: null }
                    ]
                })
                .limit(batchSize)
                .toArray() as unknown as ChunkDocument[];

            if (chunks.length === 0) {
                console.log('No more chunks to process');
                break;
            }

            console.log(`\nProcessing batch of ${chunks.length} chunks (${processedCount + 1} to ${processedCount + chunks.length})...`);

            // Extract content for embedding
            const contents = chunks.map(c => c.content);
            const chunkIds = chunks.map(c => c._id);

            try {
                // Generate embeddings using VoyageAI service
                const result = await voyageAIService.generateEmbeddings(contents, 'document');

                if (result.embeddings.length !== chunks.length) {
                    throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${result.embeddings.length}`);
                }

                // Track token usage
                if (result.usage) {
                    stats.tokensUsed += result.usage.total_tokens;
                }

                if (!DRY_RUN) {
                    // Update chunks with embeddings in bulk
                    const bulkOps = chunks.map((chunk, index) => ({
                        updateOne: {
                            filter: { _id: chunk._id },
                            update: {
                                $set: {
                                    embedding: result.embeddings[index],
                                    embedding_model: process.env.VOYAGE_EMBEDDING_MODEL || 'voyage-4-large',
                                    embedding_dimensions: result.embeddings[index].length,
                                    embedding_generated_at: new Date()
                                }
                            }
                        }
                    }));

                    const bulkResult = await chunksCollection.bulkWrite(bulkOps);
                    stats.chunksProcessed += bulkResult.modifiedCount;

                    console.log(`✅ Updated ${bulkResult.modifiedCount} chunks with embeddings`);
                    console.log(`   Embedding dimensions: ${result.embeddings[0].length}`);
                    console.log(`   Tokens used (batch): ${result.usage?.total_tokens || 0}`);
                } else {
                    console.log(`✅ [DRY RUN] Would update ${chunks.length} chunks`);
                    console.log(`   Embedding dimensions: ${result.embeddings[0].length}`);
                    console.log(`   Tokens used (batch): ${result.usage?.total_tokens || 0}`);
                    stats.chunksProcessed += chunks.length;
                }

                processedCount += chunks.length;

            } catch (error) {
                console.error(`❌ Failed to process batch:`, (error as Error).message);
                stats.chunksFailed += chunks.length;

                // Continue to next batch instead of failing entirely
                processedCount += chunks.length;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n=== Generation Complete ===');
        console.log(`Total chunks without embeddings: ${stats.totalChunks}`);
        console.log(`Chunks processed: ${stats.chunksProcessed}`);
        console.log(`Chunks failed: ${stats.chunksFailed}`);
        console.log(`Total tokens used: ${stats.tokensUsed}`);

        // Show updated stats
        const finalStats = await mongoVectorStore.getStats();
        console.log('\n=== MongoDB Vector Store Stats ===');
        console.log(`Total documents: ${finalStats.documents}`);
        console.log(`Total chunks: ${finalStats.chunks}`);
        console.log(`Embedded chunks: ${finalStats.embeddedChunks}`);
        console.log(`Embedding coverage: ${finalStats.embeddingPercentage}%`);
        console.log(`Index status: ${finalStats.indexStatus}`);

        return stats;

    } catch (error) {
        logger.error('Failed to generate embeddings', {
            error: (error as Error).message,
            stack: (error as Error).stack
        });
        throw error;
    } finally {
        await mongoVectorStore.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the script
generateEmbeddings()
    .then((stats) => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
