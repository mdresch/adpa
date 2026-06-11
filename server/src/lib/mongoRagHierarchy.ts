import type { MongoChunkWriteInput } from './mongoChunkSchema';

/** Postgres hierarchy: Portfolio → Program → Project → Document → Entity */
export type RagLineage = {
  portfolioId?: string | null;
  programId?: string | null;
  projectId?: string | null;
  documentId?: string | null;
};

export function withRagLineage(
  chunk: MongoChunkWriteInput,
  lineage: RagLineage
): MongoChunkWriteInput {
  const portfolioId = lineage.portfolioId ?? chunk.portfolioId ?? null;
  const programId = lineage.programId ?? chunk.programId ?? null;
  const projectId = chunk.projectId ?? lineage.projectId ?? null;

  return {
    ...chunk,
    projectId,
    programId,
    portfolioId,
    metadata: {
      ...(chunk.metadata ?? {}),
      portfolioId,
      programId,
      projectId,
      ...(lineage.documentId ? { documentId: lineage.documentId } : {}),
    },
  };
}

export function mongoPortfolioFilter(portfolioId: string): Record<string, unknown> {
  return {
    $or: [
      { portfolio_id: portfolioId },
      { 'metadata.portfolioId': portfolioId },
    ],
  };
}

export function mongoProgramFilter(programId: string): Record<string, unknown> {
  return {
    $or: [{ program_id: programId }, { 'metadata.programId': programId }],
  };
}
