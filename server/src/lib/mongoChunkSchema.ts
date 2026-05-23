import type { DocumentChunk } from '../types/rag';

export type MongoChunkWriteInput = {
  documentId: string;
  content: string;
  embedding: number[];
  projectId?: string | null;
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
  chunk_index: number;
} {
  const chunkIndex =
    typeof input.chunkIndex === 'number'
      ? input.chunkIndex
      : typeof input.metadata?.chunkIndex === 'number'
        ? (input.metadata.chunkIndex as number)
        : 0;

  const projectId = input.projectId ?? (input.metadata?.projectId as string | undefined) ?? null;

  const metadata = {
    chunkIndex,
    startPosition: (input.metadata?.startPosition as number) ?? 0,
    endPosition: (input.metadata?.endPosition as number) ?? input.content.length,
    tokenCount: (input.metadata?.tokenCount as number) ?? 0,
    ...(input.metadata ?? {}),
    projectId,
  };

  return {
    id,
    documentId: input.documentId,
    document_id: input.documentId,
    content: input.content,
    embedding: input.embedding,
    project_id: projectId,
    chunk_index: chunkIndex,
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
