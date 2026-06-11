import type { DocumentChunk } from '../types/rag';
import type { RagSourceType } from './mongoRagText';

export type MongoChunkWriteInput = {
  documentId: string;
  content: string;
  embedding: number[];
  projectId?: string | null;
  programId?: string | null;
  portfolioId?: string | null;
  sourceType?: RagSourceType;
  entityId?: string | null;
  templateId?: string | null;
  metadata?: Record<string, unknown>;
  chunkIndex?: number;
};

/**
 * Canonical MongoDB chunk shape used by sync, Atlas triggers, and Pinecone re-export.
 * Includes snake_case aliases for cross-pipeline compatibility.
 */
export function buildMongoChunkDocument(
  input: MongoChunkWriteInput,
  id: string,
  createdAt: Date = new Date()
): DocumentChunk & {
  document_id: string;
  project_id: string | null;
  program_id: string | null;
  portfolio_id: string | null;
  chunk_index: number;
  source_type: RagSourceType;
  entity_id: string | null;
  template_id: string | null;
} {
  const chunkIndex =
    typeof input.chunkIndex === 'number'
      ? input.chunkIndex
      : typeof input.metadata?.chunkIndex === 'number'
        ? (input.metadata.chunkIndex as number)
        : 0;

  const projectId = input.projectId ?? (input.metadata?.projectId as string | undefined) ?? null;
  const programId = input.programId ?? (input.metadata?.programId as string | undefined) ?? null;
  const portfolioId =
    input.portfolioId ?? (input.metadata?.portfolioId as string | undefined) ?? null;
  const sourceType = input.sourceType ?? (input.metadata?.sourceType as RagSourceType | undefined) ?? 'document';
  const entityId = input.entityId ?? (input.metadata?.entityId as string | undefined) ?? null;
  const templateId = input.templateId ?? (input.metadata?.templateId as string | undefined) ?? null;

  const metadata = {
    chunkIndex,
    startPosition: (input.metadata?.startPosition as number) ?? 0,
    endPosition: (input.metadata?.endPosition as number) ?? input.content.length,
    tokenCount: (input.metadata?.tokenCount as number) ?? 0,
    ...(input.metadata ?? {}),
    portfolioId,
    programId,
    projectId,
    sourceType,
    entityId,
    templateId,
  };

  return {
    id,
    documentId: input.documentId,
    document_id: input.documentId,
    content: input.content,
    embedding: input.embedding,
    project_id: projectId,
    program_id: programId,
    portfolio_id: portfolioId,
    chunk_index: chunkIndex,
    source_type: sourceType,
    entity_id: entityId,
    template_id: templateId,
    metadata,
    createdAt,
  };
}

export function mongoProjectFilter(projectId: string): Record<string, unknown> {
  return {
    $or: [
      { project_id: projectId },
      { 'metadata.projectId': projectId },
    ],
  };
}
