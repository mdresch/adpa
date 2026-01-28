/**
 * GKG sync job payload types.
 * Align with GKG_INGESTION_DESIGN.md job types and payloads.
 */

export interface GkgBootstrapJobData {
  jobId: string
  force?: boolean
}

export interface GkgSyncProjectJobData {
  jobId: string
  projectId: string
}

export interface GkgSyncDocumentJobData {
  jobId: string
  documentId: string
}

export type GkgJobData =
  | GkgBootstrapJobData
  | GkgSyncProjectJobData
  | GkgSyncDocumentJobData
