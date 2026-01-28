/**
 * GKG (Governance Knowledge Graph) sync service.
 * Syncs ADPA PostgreSQL data into Neo4j. See docs/07-architecture/GKG_INGESTION_DESIGN.md.
 */

export { runBootstrap } from "./syncBootstrap"
export { runSyncProject, type SyncProjectResult } from "./syncProject"
export { runSyncDocument } from "./syncDocument"
export { CYPHER, GOVERNANCE_DOMAINS, MATURITY_LEVELS } from "./cypher"
export { ENTITY_MAPPINGS, getEntityMapping, getSummaryFromRow } from "./mapping"
export type { GkgBootstrapJobData, GkgSyncProjectJobData, GkgSyncDocumentJobData } from "./types"
