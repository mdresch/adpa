// Bridge re-export so backend services can use the shared
// entity-domain weighting matrix that lives in the root `types` folder.
// This avoids duplicating a large static mapping while keeping imports
// simple via the "@/types/*" alias configured in server/tsconfig.json.

// Direct re-export using relative path
// From: server/src/types/entity-domain-weights.ts
// To:   types/entity-domain-weights.ts (root)
// Path: ../../../types/entity-domain-weights
export * from '../../../types/entity-domain-weights';





