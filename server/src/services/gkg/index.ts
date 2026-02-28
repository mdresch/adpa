/**
 * GKG (Governance Knowledge Graph) sync service.
 * Syncs ADPA PostgreSQL data into Neo4j. See docs/07-architecture/GKG_INGESTION_DESIGN.md.
 */

export { runBootstrap } from "./syncBootstrap"
export { runSyncProject, type SyncProjectResult } from "./syncProject"
export { runSyncDocument } from "./syncDocument"
export { runGkgReconciliation, type ReconcileReport } from "./reconcile"
export { runGkgFullReconciliation, type FullReconcileReport } from "./reconcileFull"
export { getContextForStrategy, type GkgContextResult } from "./gkgContextService"
export { CYPHER, GOVERNANCE_DOMAINS, MATURITY_LEVELS } from "./cypher"
export { ENTITY_MAPPINGS, getEntityMapping, getSummaryFromRow } from "./mapping"
export type { GkgBootstrapJobData, GkgSyncProjectJobData, GkgSyncDocumentJobData } from "./types"
