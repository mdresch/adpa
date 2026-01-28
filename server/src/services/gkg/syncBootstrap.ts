/**
 * GKG Phase 0: bootstrap reference nodes (GovernanceDomain, MaturityLevel).
 * Idempotent; safe to run on every deploy or on-demand.
 */

import type { Driver } from "neo4j-driver"
import { logger } from "../../utils/logger"
import { CYPHER, GOVERNANCE_DOMAINS, MATURITY_LEVELS } from "./cypher"

const LOG_TAG = "[GKG-BOOTSTRAP]"

export async function runBootstrap(driver: Driver, database: string): Promise<{ domains: number; levels: number }> {
  const session = driver.session({ database })
  let domains = 0
  let levels = 0
  try {
    for (const code of GOVERNANCE_DOMAINS) {
      await session.run(CYPHER.mergeGovernanceDomain, { code, name: code })
      domains++
    }
    for (const m of MATURITY_LEVELS) {
      await session.run(CYPHER.mergeMaturityLevel, {
        level: m.level,
        name: m.name,
        criteria: m.criteria,
      })
      levels++
    }
    logger.info(`${LOG_TAG} Phase 0 complete`, { domains, levels })
    return { domains, levels }
  } finally {
    await session.close()
  }
}
