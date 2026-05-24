import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';

const INTEGRATED_SEARCH_NAMESPACES = ['projects', 'documents', 'entities'] as const;

export function normalizePineconeHost(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function mapSearchHit(hit: {
  _id?: string;
  _score?: number;
  fields?: Record<string, unknown>;
}) {
  const metadata = (hit.fields ?? {}) as Record<string, unknown>;
  return {
    id: hit._id,
    score: hit._score ?? 0,
    metadata,
  };
}

interface PineconeConfig {
  apiKey: string;
}

interface UpsertResult {
  upsertedCount: number;
  errors?: string[];
}

interface ProjectVector {
  id: string;
  values: number[];
  metadata: {
    type: 'project';
    name: string;
    description?: string;
    framework?: string;
    status?: string;
    priority?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
    owner_id?: string;
    team_members?: string[];
    created_at: string;
    updated_at: string;
  };
}

interface DocumentVector {
  id: string;
  values: number[];
  metadata: {
    type: 'document';
    project_id: string;
    title: string;
    content?: string;
    mime_type?: string;
    file_size?: number;
    created_at: string;
    updated_at: string;
  };
}

interface EntityVector {
  id: string;
  values: number[];
  metadata: {
    type: 'entity';
    name: string;
    entity_type: string;
    confidence?: number;
    document_id?: string;
    project_id?: string;
    created_at: string;
  };
}

export class PineconeService {
  private pc: Pinecone;
  private index: any;
  private indexName: string;

  constructor(config?: { apiKey?: string; indexName?: string; indexHost?: string }) {
    const apiKey = config?.apiKey || process.env.PINECONE_API_KEY;

    // Basic verification of API key existence
    if (!apiKey) {
      logger.warn('Pinecone API key not configured');
      // If we're initializing the singleton and there's no key, we might wrap this in a try-catch 
      // or just allow it to fail when methods are called. 
      // For now, keep the error but make it more descriptive.
      if (!config) {
        logger.info('Pinecone service initialized without API key (waiting for dynamic config or ENV)');
      } else {
        throw new Error('Pinecone API key is required');
      }
    }

    // Initialize with providing key (can be undefined if we want to defer initialization)
    this.pc = new Pinecone({
      apiKey: apiKey || 'placeholder' // SDK requires a string
    });

    this.indexName = config?.indexName || process.env.PINECONE_INDEX_NAME || 'adpa-rag-index';

    const normalizedConfigHost = normalizePineconeHost(
      typeof config?.indexHost === 'string' ? config.indexHost : undefined
    );
    const normalizedEnvHost = normalizePineconeHost(process.env.PINECONE_INDEX_HOST);

    // If config is provided and omits host, prefer auto-discovery instead of falling back to env host.
    const host = config
      ? (normalizedConfigHost || undefined)
      : (normalizedEnvHost || undefined);

    if (host) {
      this.index = this.pc.index(this.indexName, host);
    } else {
      this.index = this.pc.index(this.indexName);
    }

    if (apiKey) {
      logger.info('Pinecone service initialized', {
        indexName: this.indexName,
        host: host || 'auto',
        model: 'llama-text-embed-v2'
      });
    }
  }

  /**
   * Test Pinecone connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const stats = await this.index.describeIndexStats();
      logger.info('Pinecone connection successful', { stats });
      return true;
    } catch (error) {
      logger.error('Pinecone connection failed', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Upsert projects to Pinecone
   */
  async upsertProjects(projects: any[]): Promise<UpsertResult> {
    try {
      logger.info('Starting project upsert with integrated embedding', { projectsCount: projects.length });

      // Use integrated embedding with correct record format from documentation
      const records = projects.map(project => ({
        _id: `project_${project.id}`, // Use _id as required by upsert_records
        text: `${project.name || ''} ${project.description || ''} ${project.framework || ''}`.trim(), // Combined text for embedding
        type: 'project',
        name: project.name || '',
        description: project.description || '',
        framework: project.framework || '',
        status: project.status || '',
        priority: project.priority || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget || 0,
        owner_id: project.owner_id || '',
        team_members: project.team_members || [],
        created_at: project.created_at || new Date().toISOString(),
        updated_at: project.updated_at || new Date().toISOString()
      })).filter(r => r.text.length > 0);

      if (records.length === 0) {
        logger.warn('Skipping projects upsert: No records with valid text content');
        return { upsertedCount: 0 };
      }

      logger.info('Generated records for integrated embedding', {
        recordsCount: records.length,
        sampleRecord: records[0] ? {
          _id: records[0]._id,
          textLength: records[0].text?.length,
          hasType: !!records[0].type
        } : null
      });

      // Use upsert_records method with integrated embedding in the 'projects' namespace
      const result = await this.index.namespace('projects').upsertRecords({
        records: records
      });

      logger.info('Projects upserted to Pinecone namespace "projects"', {
        count: projects.length,
        result: result || 'No result returned'
      });

      return {
        upsertedCount: result?.upsertedCount || projects.length
      };
    } catch (error) {
      logger.error('Failed to upsert projects to Pinecone', {
        error: (error as Error).message,
        projectsCount: projects.length
      });

      return {
        upsertedCount: 0,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Upsert documents to Pinecone using integrated embedding
   */
  async upsertDocuments(documents: any[]): Promise<UpsertResult> {
    try {
      logger.info('Starting document upsert with integrated embedding', { documentsCount: documents.length });

      // Use integrated embedding with correct record format from documentation
      // Remove large content field to stay under 40KB metadata limit
      const records = documents.map(doc => ({
        _id: `document_${doc.id}`, // Use _id as required by upsert_records
        text: `${doc.title || doc.name || ''} ${doc.content ? doc.content.substring(0, 1000) : ''}`.trim(), // Truncate content to 1000 chars
        type: 'document',
        project_id: doc.project_id || '',
        title: doc.title || doc.name || '',
        content_length: doc.content ? doc.content.length : 0, // Store length instead of full content
        mime_type: doc.mime_type || doc.type || '',
        file_size: doc.file_size || 0,
        created_at: doc.created_at || new Date().toISOString(),
        updated_at: doc.updated_at || new Date().toISOString()
      })).filter(r => r.text.length > 0);

      if (records.length === 0) {
        logger.warn('Skipping documents upsert: No records with valid text content');
        return { upsertedCount: 0 };
      }

      logger.info('Generated records for integrated embedding', {
        recordsCount: records.length,
        sampleRecord: records[0] ? {
          _id: records[0]._id,
          textLength: records[0].text?.length,
          hasType: !!records[0].type
        } : null
      });

      // Use upsert_records method with integrated embedding in the 'documents' namespace
      const result = await this.index.namespace('documents').upsertRecords({
        records: records
      });

      logger.info('Documents upserted to Pinecone namespace "documents"', {
        count: documents.length,
        result: result || 'No result returned'
      });

      return {
        upsertedCount: result?.upsertedCount || documents.length
      };
    } catch (error) {
      logger.error('Failed to upsert documents to Pinecone with integrated embedding', {
        error: (error as Error).message,
        documentsCount: documents.length
      });

      return {
        upsertedCount: 0,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Upsert entities to Pinecone using integrated embedding
   */
  async upsertEntities(entities: any[]): Promise<UpsertResult> {
    try {
      logger.info('Starting entity upsert with integrated embedding', { entitiesCount: entities.length });

      // Use integrated embedding with correct record format from documentation
      const { entityRowToPineconeRecord } = await import('./pineconeEntitySync');
      const records = entities
        .map((entity) => {
          if (entity.entity_type && entity.project_id) {
            return entityRowToPineconeRecord(entity);
          }
          return {
            _id: `entity_${entity.entity_type || 'unknown'}_${entity.id || entity.name}`,
            text: `${entity.name} ${entity.type || entity.entity_type || ''} ${entity.description || ''} ${entity.source_document_title || ''}`.trim(),
            type: 'entity',
            name: entity.name,
            entity_type: entity.type || entity.entity_type || 'unknown',
            confidence: entity.confidence || 0.85,
            document_id: entity.document_id || entity.source_document_id || '',
            source_document_id: entity.source_document_id || entity.document_id || '',
            source_document_title: entity.source_document_title || '',
            project_id: entity.project_id || '',
            created_at: entity.created_at || new Date().toISOString(),
          };
        })
        .filter(r => r.text.length > 0);

      if (records.length === 0) {
        logger.warn('Skipping entities upsert: No records with valid text content');
        return { upsertedCount: 0 };
      }

      // Use upsert_records method with integrated embedding in the 'entities' namespace
      const result = await this.index.namespace('entities').upsertRecords({
        records: records
      });

      logger.info('Entities upserted to Pinecone namespace "entities"', {
        count: entities.length,
        result: result || 'No result returned'
      });

      return {
        upsertedCount: result?.upsertedCount || entities.length
      };
    } catch (error) {
      logger.error('Failed to upsert entities to Pinecone with integrated embedding', {
        error: (error as Error).message,
        entitiesCount: entities.length
      });

      return {
        upsertedCount: 0,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Generate embedding for project
   */
  private generateProjectEmbedding(project: any): number[] {
    // Create a text representation of the project for embedding
    const text = [
      project.name || '',
      project.description || '',
      project.framework || '',
      project.status || '',
      project.priority || '',
      project.team_members?.join(' ') || ''
    ].join(' ').toLowerCase();

    // For now, generate a simple hash-based embedding
    // In production, you'd use VoyageAI or another embedding service
    return this.textToEmbedding(text);
  }

  /**
   * Generate embedding for document
   */
  private generateDocumentEmbedding(doc: any): number[] {
    const text = [
      doc.title || doc.name || '',
      doc.content || '',
      doc.mime_type || doc.type || ''
    ].join(' ').toLowerCase();

    const embedding = this.textToEmbedding(text);

    logger.info('Generated document embedding', {
      docId: doc.id,
      textLength: text.length,
      embeddingLength: embedding.length,
      embeddingSample: embedding.slice(0, 5)
    });

    return embedding;
  }

  /**
   * Generate embedding for entity
   */
  private generateEntityEmbedding(entity: any): number[] {
    const text = [
      entity.name || '',
      entity.type || entity.entity_type || '',
      entity.description || ''
    ].join(' ').toLowerCase();

    return this.textToEmbedding(text);
  }

  /**
   * Simple text to embedding conversion (legacy placeholder)
   * Now replaced by integrated embeddings or Pinecone Inference
   */
  private textToEmbedding(text: string): number[] {
    // This is no longer used for search, replaced by fetchQueryEmbedding
    return new Array(1024).fill(0);
  }

  /**
   * Generate embedding for search queries using Pinecone Inference
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Input text must be non-empty for embedding generation');
    }
    try {
      const result = await this.pc.inference.embed({
        model: 'llama-text-embed-v2',
        inputs: [query],
        parameters: { inputType: 'query' }
      });
      
      if (result && result[0] && result[0].values) {
        return result[0].values as number[];
      }
      
      throw new Error('No embedding returned from Pinecone Inference');
    } catch (error) {
      logger.error('Failed to generate query embedding via Pinecone Inference', {
        error: (error as Error).message,
        query: query.substring(0, 50)
      });
      // Fallback to VoyageAI if configured, otherwise throw
      try {
        const { voyageAIService } = await import('./voyageAIService');
        return await voyageAIService.generateEmbedding(query, 'query', 'voyage-2');
      } catch (err) {
        throw error; // Re-throw original Pinecone error if VoyageAI fails too
      }
    }
  }

  private async searchIntegratedNamespace(
    namespace: string,
    query: string,
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<any[]> {
    const indexTarget = this.index.namespace(namespace);
    const response = await indexTarget.searchRecords({
      query: {
        topK,
        inputs: { text: query },
        ...(filter ? { filter } : {}),
      },
      fields: [
        'type',
        'name',
        'title',
        'text',
        'project_id',
        'description',
        'entity_type',
        'source_document_id',
        'source_document_title',
        'document_id',
        'framework',
        'status',
      ],
    });

    return (response.result?.hits ?? []).map(mapSearchHit);
  }

  private async searchVectorNamespace(
    namespace: string,
    query: string,
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<any[]> {
    const queryVector = await this.generateQueryEmbedding(query.toLowerCase());
    const searchRequest: Record<string, unknown> = {
      vector: queryVector,
      topK,
      includeMetadata: true,
    };

    if (filter) {
      searchRequest.filter = filter;
    }

    const results = await this.index.namespace(namespace).query(searchRequest);
    return results.matches || [];
  }

  /**
   * Search for similar items in Pinecone (integrated embedding index + legacy vector namespaces)
   */
  async search(query: string, topK: number = 10, filter?: any, namespace?: string): Promise<any[]> {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      logger.warn('Search query is empty, skipping');
      return [];
    }

    try {
      if (namespace) {
        if (namespace === 'chunks') {
          const matches = await this.searchVectorNamespace(namespace, trimmedQuery, topK, filter);
          logger.info('Pinecone vector search completed', {
            query: trimmedQuery,
            topK,
            namespace,
            resultsCount: matches.length,
          });
          return matches;
        }

        const matches = await this.searchIntegratedNamespace(namespace, trimmedQuery, topK, filter);
        logger.info('Pinecone integrated search completed', {
          query: trimmedQuery,
          topK,
          namespace,
          resultsCount: matches.length,
        });
        return matches;
      }

      const perNamespaceLimit = Math.max(topK, 5);
      const namespaceResults = await Promise.all(
        INTEGRATED_SEARCH_NAMESPACES.map(async (ns) => {
          try {
            return await this.searchIntegratedNamespace(ns, trimmedQuery, perNamespaceLimit, filter);
          } catch (error) {
            logger.warn('Pinecone namespace search skipped', {
              namespace: ns,
              error: (error as Error).message,
            });
            return [];
          }
        })
      );

      const merged = namespaceResults
        .flat()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, topK);

      logger.info('Pinecone multi-namespace search completed', {
        query: trimmedQuery,
        topK,
        resultsCount: merged.length,
      });

      return merged;
    } catch (error) {
      logger.error('Pinecone search failed', {
        error: (error as Error).message,
        query: trimmedQuery,
        namespace,
      });
      return [];
    }
  }

  /**
   * Delete vectors by IDs
   */
  async delete(ids: string[]): Promise<boolean> {
    try {
      await this.index.deleteMany({ ids });
      logger.info('Vectors deleted from Pinecone', { count: ids.length });
      return true;
    } catch (error) {
      logger.error('Failed to delete vectors from Pinecone', {
        error: (error as Error).message,
        idsCount: ids.length
      });
      return false;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const stats = await this.index.describeIndexStats();

      // Return stats with normalized property names
      return {
        totalVectorCount: stats.totalRecordCount || 0,
        dimensionCount: stats.dimension || 1024,
        indexFullness: stats.indexFullness || 0,
        namespaces: stats.namespaces || {}
      };
    } catch (error) {
      logger.error('Failed to get Pinecone index stats', {
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Sync all data to Pinecone (projects, documents, chunks)
   */
  async syncAll(projectId?: string, onProgress?: (progress: any) => Promise<void>): Promise<any> {
    const { Pool } = await import('pg');
    const { MongoClient } = await import('mongodb');

    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    let mongoClient: any = null;
    const stats = {
      projects: { total: 0, synced: 0, failed: 0 },
      documents: { total: 0, synced: 0, failed: 0 },
      entities: { total: 0, synced: 0, failed: 0 },
      chunks: { total: 0, synced: 0, failed: 0 }
    };

    try {
      // 1. Sync projects from PostgreSQL
      logger.info('Starting Pinecone sync - Projects', { projectId });

      let projectQuery = `
        SELECT id, name, description, status, priority, 
               framework, start_date, end_date, budget,
               created_at, updated_at
        FROM projects
      `;
      const projectParams: any[] = [];

      if (projectId) {
        projectQuery += ' WHERE id = $1';
        projectParams.push(projectId);
      }

      const projectsResult = await pgPool.query(projectQuery, projectParams);
      stats.projects.total = projectsResult.rows.length;

      if (onProgress) {
        await onProgress({
          stage: 'projects',
          current: 0,
          total: stats.projects.total,
          message: `Syncing ${stats.projects.total} projects...`
        });
      }

      if (projectsResult.rows.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < projectsResult.rows.length; i += batchSize) {
          const batch = projectsResult.rows.slice(i, i + batchSize);
          const records = batch.map(project => ({
            _id: `project_${project.id}`,
            text: `${project.name || ''} ${project.description || ''} ${project.framework || ''}`.trim(),
            type: 'project',
            name: project.name || '',
            description: project.description || '',
            framework: project.framework || '',
            status: project.status || '',
            priority: project.priority || '',
            start_date: project.start_date || '',
            end_date: project.end_date || '',
            budget: project.budget || 0,
            created_at: project.created_at || new Date().toISOString(),
            updated_at: project.updated_at || new Date().toISOString()
          })).filter(r => r.text.length > 0);

          if (records.length === 0) continue;

          try {
            const result = await this.index.namespace('projects').upsertRecords({ records });
            const synced = result?.upsertedCount || records.length;
            stats.projects.synced += synced;

            if (onProgress) {
              await onProgress({
                stage: 'projects',
                current: stats.projects.synced,
                total: stats.projects.total,
                message: `Synced ${stats.projects.synced}/${stats.projects.total} projects to namespace "projects"`
              });
            }
          } catch (error) {
            stats.projects.failed += records.length;
            logger.error('Failed to sync project batch', { error: (error as Error).message });
          }
        }
      }

      // 2. Sync documents from PostgreSQL
      logger.info('Starting Pinecone sync - Documents', { projectId });

      let docQuery = `
        SELECT id, project_id, title, content, mime_type, 
               file_size, created_at, updated_at
        FROM documents
        WHERE content IS NOT NULL
      `;
      const docParams: any[] = [];

      if (projectId) {
        docQuery += ' AND project_id = $1';
        docParams.push(projectId);
      }

      docQuery += ' LIMIT 1000';

      const documentsResult = await pgPool.query(docQuery, docParams);
      stats.documents.total = documentsResult.rows.length;

      if (onProgress) {
        await onProgress({
          stage: 'documents',
          current: 0,
          total: stats.documents.total,
          message: `Syncing ${stats.documents.total} documents...`
        });
      }

      if (documentsResult.rows.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < documentsResult.rows.length; i += batchSize) {
          const batch = documentsResult.rows.slice(i, i + batchSize);
          const records = batch.map(doc => ({
            _id: `document_${doc.id}`,
            text: `${doc.title || ''} ${doc.content ? doc.content.substring(0, 1000) : ''}`.trim(),
            type: 'document',
            project_id: doc.project_id || '',
            title: doc.title || '',
            content_length: doc.content ? doc.content.length : 0,
            mime_type: doc.mime_type || '',
            file_size: doc.file_size || 0,
            created_at: doc.created_at || new Date().toISOString(),
            updated_at: doc.updated_at || new Date().toISOString()
          })).filter(r => r.text.length > 0);

          if (records.length === 0) continue;

          try {
            const result = await this.index.namespace('documents').upsertRecords({ records });
            const synced = result?.upsertedCount || records.length;
            stats.documents.synced += synced;

            if (onProgress) {
              await onProgress({
                stage: 'documents',
                current: stats.documents.synced,
                total: stats.documents.total,
                message: `Synced ${stats.documents.synced}/${stats.documents.total} documents to namespace "documents"`
              });
            }
          } catch (error) {
            stats.documents.failed += records.length;
            logger.error('Failed to sync document batch', { error: (error as Error).message });
          }
        }
      }

      // 3. Sync extracted entities from PostgreSQL domain tables
      logger.info('Starting Pinecone sync - Entities', { projectId });

      const { fetchEntitiesForPinecone, entityRowToPineconeRecord } = await import('./pineconeEntitySync');
      const entityRows = await fetchEntitiesForPinecone(pgPool, projectId);
      stats.entities.total = entityRows.length;

      if (onProgress) {
        await onProgress({
          stage: 'entities',
          current: 0,
          total: stats.entities.total,
          message: `Syncing ${stats.entities.total} entities...`,
        });
      }

      if (entityRows.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < entityRows.length; i += batchSize) {
          const batch = entityRows.slice(i, i + batchSize);
          const records = batch.map(entityRowToPineconeRecord).filter((r) => r.text.length > 0);
          if (records.length === 0) continue;

          try {
            const result = await this.index.namespace('entities').upsertRecords({ records });
            const synced = result?.upsertedCount || records.length;
            stats.entities.synced += synced;

            if (onProgress) {
              await onProgress({
                stage: 'entities',
                current: stats.entities.synced,
                total: stats.entities.total,
                message: `Synced ${stats.entities.synced}/${stats.entities.total} entities to namespace "entities"`,
              });
            }
          } catch (error) {
            stats.entities.failed += records.length;
            logger.error('Failed to sync entity batch', { error: (error as Error).message });
          }
        }
      }

      // 4. Sync chunks from MongoDB (if available)
      if (process.env.MONGODB_URI) {
        try {
          logger.info('Starting Pinecone sync - Chunks', { projectId });

          mongoClient = new MongoClient(process.env.MONGODB_URI);
          await mongoClient.connect();
          const db = mongoClient.db('adpa_rag');
          const chunksCollection = db.collection('chunks');

          const chunkFilter: Record<string, unknown> = {
            embedding: { $exists: true, $not: { $size: 0 } },
          };

          if (projectId) {
            chunkFilter.$or = [
              { project_id: projectId },
              { 'metadata.projectId': projectId },
            ];
          }

          const chunks = await chunksCollection.find(chunkFilter).limit(1000).toArray();
          stats.chunks.total = chunks.length;

          if (onProgress) {
            await onProgress({
              stage: 'chunks',
              current: 0,
              total: stats.chunks.total,
              message: `Syncing ${stats.chunks.total} chunks...`
            });
          }

          if (chunks.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < chunks.length; i += batchSize) {
              const batch = chunks.slice(i, i + batchSize);
              const vectors = batch.map(chunk => ({
                id: `chunk_${chunk._id}`,
                values: chunk.embedding,
                metadata: {
                  type: 'chunk',
                  document_id: chunk.document_id || chunk.documentId || '',
                  project_id:
                    chunk.project_id ||
                    chunk.metadata?.projectId ||
                    '',
                  content: chunk.content ? chunk.content.substring(0, 500) : '',
                  chunk_index: chunk.chunk_index ?? chunk.metadata?.chunkIndex ?? 0,
                  created_at: chunk.created_at || chunk.createdAt || new Date().toISOString()
                }
              })).filter(v => v.values && v.values.length > 0);

              if (vectors.length === 0) continue;

              try {
                await this.index.namespace('chunks').upsert(vectors);
                stats.chunks.synced += vectors.length;

                if (onProgress) {
                  await onProgress({
                    stage: 'chunks',
                    current: stats.chunks.synced,
                    total: stats.chunks.total,
                    message: `Synced ${stats.chunks.synced}/${stats.chunks.total} chunks to namespace "chunks"`
                  });
                }
              } catch (error) {
                stats.chunks.failed += vectors.length;
                logger.error('Failed to sync chunk batch', { error: (error as Error).message });
              }
            }
          }
        } catch (error) {
          logger.warn('MongoDB sync skipped', { error: (error as Error).message });
        }
      }

      const totalSynced =
        stats.projects.synced + stats.documents.synced + stats.entities.synced + stats.chunks.synced;

      logger.info('Pinecone sync completed', { stats, totalSynced });

      return {
        success: true,
        details: {
          synced_items: totalSynced,
          projects: stats.projects,
          documents: stats.documents,
          entities: stats.entities,
          chunks: stats.chunks,
          last_sync: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Pinecone sync failed', { error: (error as Error).message });
      return {
        success: false,
        details: {
          synced_items: 0,
          error: (error as Error).message,
          last_sync: new Date().toISOString()
        }
      };
    } finally {
      if (mongoClient) {
        await mongoClient.close();
      }
      await pgPool.end();
    }
  }
}

// Export singleton instance
export const pineconeService = new PineconeService();
