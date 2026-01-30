/**
 * Initialize GKG schema in Neo4j: constraints, indexes, and reference nodes
 * (GovernanceDomain, MaturityLevel). Idempotent; safe to run repeatedly.
 *
 * Prerequisite: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD in server/.env
 * Run from server/: pnpm exec ts-node -r tsconfig-paths/register scripts/init-gkg-schema.ts
 * Or: npm run init-gkg-schema (if added to package.json)
 */

import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(__dirname, "../.env.local") })
dotenv.config({ path: path.join(__dirname, "../.env") })

async function main() {
  const { connectNeo4j, getNeo4jDriver, getNeo4jDatabase, disconnectNeo4j, isNeo4jConfigured } =
    await import("../src/utils/neo4j")

  if (!isNeo4jConfigured()) {
    console.log("Neo4j not configured (NEO4J_URI unset). Skipping GKG schema init.")
    process.exit(0)
  }

  console.log("Connecting to Neo4j...")
  await connectNeo4j()
  const driver = getNeo4jDriver()
  const database = getNeo4jDatabase()
  if (!driver) {
    console.error("Neo4j driver unavailable after connect.")
    process.exit(1)
  }

  const session = driver.session({ database })

  const constraints: string[] = [
    "CREATE CONSTRAINT gkg_project_adpa_id IF NOT EXISTS FOR (n:Project) REQUIRE n.adpa_id IS UNIQUE",
    "CREATE CONSTRAINT gkg_document_adpa_id IF NOT EXISTS FOR (n:Document) REQUIRE n.adpa_id IS UNIQUE",
    "CREATE CONSTRAINT gkg_template_adpa_id IF NOT EXISTS FOR (n:Template) REQUIRE n.adpa_id IS UNIQUE",
    "CREATE CONSTRAINT gkg_semantic_unit_entity_id IF NOT EXISTS FOR (n:SemanticUnit) REQUIRE (n.adpa_entity_type, n.adpa_id) IS UNIQUE",
    "CREATE CONSTRAINT gkg_governance_domain_code IF NOT EXISTS FOR (n:GovernanceDomain) REQUIRE n.code IS UNIQUE",
    "CREATE CONSTRAINT gkg_authority_id IF NOT EXISTS FOR (n:Authority) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT gkg_evidence_id IF NOT EXISTS FOR (n:Evidence) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT gkg_temporal_range_id IF NOT EXISTS FOR (n:TemporalRange) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT gkg_governance_rule_id IF NOT EXISTS FOR (n:GovernanceRule) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT gkg_maturity_level_level IF NOT EXISTS FOR (n:MaturityLevel) REQUIRE n.level IS UNIQUE",
    "CREATE CONSTRAINT gkg_risk_pattern_id IF NOT EXISTS FOR (n:RiskPattern) REQUIRE n.id IS UNIQUE",
  ]

  const indexes: string[] = [
    "CREATE INDEX gkg_semantic_unit_project_id IF NOT EXISTS FOR (n:SemanticUnit) ON (n.project_id)",
    "CREATE INDEX gkg_semantic_unit_document_id IF NOT EXISTS FOR (n:SemanticUnit) ON (n.document_id)",
    "CREATE INDEX gkg_semantic_unit_entity_type IF NOT EXISTS FOR (n:SemanticUnit) ON (n.adpa_entity_type)",
    "CREATE INDEX gkg_document_project_id IF NOT EXISTS FOR (n:Document) ON (n.project_id)",
    "CREATE INDEX gkg_semantic_unit_project_type IF NOT EXISTS FOR (n:SemanticUnit) ON (n.project_id, n.adpa_entity_type)",
  ]

  const governanceDomains: { code: string; name: string }[] = [
    { code: "Integration", name: "Integration" },
    { code: "Scope", name: "Scope" },
    { code: "Schedule", name: "Schedule" },
    { code: "Cost", name: "Cost" },
    { code: "Quality", name: "Quality" },
    { code: "Resource", name: "Resource" },
    { code: "Communications", name: "Communications" },
    { code: "Risk", name: "Risk" },
    { code: "Procurement", name: "Procurement" },
    { code: "Stakeholder", name: "Stakeholder" },
  ]

  const maturityLevels: { level: number; name: string; criteria: string }[] = [
    { level: 1, name: "Initial", criteria: "Ad hoc" },
    { level: 2, name: "Developing", criteria: "Defined processes" },
    { level: 3, name: "Defined", criteria: "Standardized" },
    { level: 4, name: "Managed", criteria: "Measured and controlled" },
    { level: 5, name: "Optimizing", criteria: "Continuously improved" },
  ]

  try {
    console.log("Creating constraints...")
    for (const c of constraints) {
      await session.run(c)
      console.log("  OK:", c.slice(0, 50) + "...")
    }

    console.log("Creating indexes...")
    for (const idx of indexes) {
      await session.run(idx)
      console.log("  OK:", idx.slice(0, 50) + "...")
    }

    console.log("Seeding GovernanceDomain nodes...")
    for (const d of governanceDomains) {
      await session.run(
        "MERGE (d:GovernanceDomain {code: $code}) ON CREATE SET d.name = $name ON MATCH SET d.name = $name",
        d
      )
    }
    console.log("  OK:", governanceDomains.length, "domains")

    console.log("Seeding MaturityLevel nodes...")
    for (const m of maturityLevels) {
      await session.run(
        "MERGE (m:MaturityLevel {level: $level}) ON CREATE SET m.name = $name, m.criteria_summary = $criteria ON MATCH SET m.name = $name, m.criteria_summary = $criteria",
        { ...m, criteria: m.criteria }
      )
    }
    console.log("  OK:", maturityLevels.length, "levels")

    console.log("GKG schema init complete.")
  } finally {
    await session.close()
    await disconnectNeo4j()
  }
  process.exit(0)
}

main().catch((err) => {
  console.error("init-gkg-schema failed:", err)
  process.exit(1)
})
