# GKG Schema – Neo4j Constraints and Indexes

**Purpose**: Run these Cypher statements against the Neo4j database used for the GKG to create constraints and indexes.  
**Prerequisite**: [GKG_SCHEMA.md](./GKG_SCHEMA.md) for node/relationship semantics.  
**Run order**: Constraints first (they create indexes), then any extra indexes.

---

## 1. Constraints (run first)

Neo4j creates a backing index for each uniqueness constraint. Run in a single transaction or one-by-one.

```cypher
// Project: adpa_id unique
CREATE CONSTRAINT gkg_project_adpa_id IF NOT EXISTS
FOR (n:Project) REQUIRE n.adpa_id IS UNIQUE;

// Document: adpa_id unique
CREATE CONSTRAINT gkg_document_adpa_id IF NOT EXISTS
FOR (n:Document) REQUIRE n.adpa_id IS UNIQUE;

// SemanticUnit: (adpa_entity_type, adpa_id) unique
CREATE CONSTRAINT gkg_semantic_unit_entity_id IF NOT EXISTS
FOR (n:SemanticUnit) REQUIRE (n.adpa_entity_type, n.adpa_id) IS UNIQUE;

// GovernanceDomain: code unique
CREATE CONSTRAINT gkg_governance_domain_code IF NOT EXISTS
FOR (n:GovernanceDomain) REQUIRE n.code IS UNIQUE;

// Authority: id unique (if you use stable string ids)
CREATE CONSTRAINT gkg_authority_id IF NOT EXISTS
FOR (n:Authority) REQUIRE n.id IS UNIQUE;

// Evidence: id unique
CREATE CONSTRAINT gkg_evidence_id IF NOT EXISTS
FOR (n:Evidence) REQUIRE n.id IS UNIQUE;

// TemporalRange: id unique
CREATE CONSTRAINT gkg_temporal_range_id IF NOT EXISTS
FOR (n:TemporalRange) REQUIRE n.id IS UNIQUE;

// GovernanceRule: id unique
CREATE CONSTRAINT gkg_governance_rule_id IF NOT EXISTS
FOR (n:GovernanceRule) REQUIRE n.id IS UNIQUE;

// MaturityLevel: level unique
CREATE CONSTRAINT gkg_maturity_level_level IF NOT EXISTS
FOR (n:MaturityLevel) REQUIRE n.level IS UNIQUE;

// RiskPattern: id unique
CREATE CONSTRAINT gkg_risk_pattern_id IF NOT EXISTS
FOR (n:RiskPattern) REQUIRE n.id IS UNIQUE;
```

**Note**: `IF NOT EXISTS` is supported in Neo4j 5.x. On older versions, use `CREATE CONSTRAINT ... FOR (n:Label) REQUIRE n.prop IS UNIQUE` and omit `IF NOT EXISTS`, or drop and recreate.

---

## 2. Indexes (for lookups and traversals)

Create these when you need faster lookups beyond constraint-backed properties.

```cypher
// SemanticUnit: project_id (for BELONGS_TO / by-project queries)
CREATE INDEX gkg_semantic_unit_project_id IF NOT EXISTS
FOR (n:SemanticUnit) ON (n.project_id);

// SemanticUnit: document_id (for EXTRACTED_FROM)
CREATE INDEX gkg_semantic_unit_document_id IF NOT EXISTS
FOR (n:SemanticUnit) ON (n.document_id);

// SemanticUnit: adpa_entity_type (for filtering by type)
CREATE INDEX gkg_semantic_unit_entity_type IF NOT EXISTS
FOR (n:SemanticUnit) ON (n.adpa_entity_type);

// Document: project_id (for BELONGS_TO)
CREATE INDEX gkg_document_project_id IF NOT EXISTS
FOR (n:Document) ON (n.project_id);

// Composite for “units in project by type”
CREATE INDEX gkg_semantic_unit_project_type IF NOT EXISTS
FOR (n:SemanticUnit) ON (n.project_id, n.adpa_entity_type);
```

---

## 3. Optional: Seed PMBOK GovernanceDomain nodes

```cypher
CREATE (d:GovernanceDomain {code: 'Integration', name: 'Integration'});
CREATE (d:GovernanceDomain {code: 'Scope', name: 'Scope'});
CREATE (d:GovernanceDomain {code: 'Schedule', name: 'Schedule'});
CREATE (d:GovernanceDomain {code: 'Cost', name: 'Cost'});
CREATE (d:GovernanceDomain {code: 'Quality', name: 'Quality'});
CREATE (d:GovernanceDomain {code: 'Resource', name: 'Resource'});
CREATE (d:GovernanceDomain {code: 'Communications', name: 'Communications'});
CREATE (d:GovernanceDomain {code: 'Risk', name: 'Risk'});
CREATE (d:GovernanceDomain {code: 'Procurement', name: 'Procurement'});
CREATE (d:GovernanceDomain {code: 'Stakeholder', name: 'Stakeholder'});
```

Use `MERGE` if you run this repeatedly:

```cypher
MERGE (d:GovernanceDomain {code: 'Integration'}) ON CREATE SET d.name = 'Integration';
MERGE (d:GovernanceDomain {code: 'Scope'}) ON CREATE SET d.name = 'Scope';
// ... etc
```

---

## 4. Optional: Seed MaturityLevel nodes (1–5)

```cypher
MERGE (m:MaturityLevel {level: 1}) ON CREATE SET m.name = 'Initial', m.criteria_summary = 'Ad hoc';
MERGE (m:MaturityLevel {level: 2}) ON CREATE SET m.name = 'Developing', m.criteria_summary = 'Defined processes';
MERGE (m:MaturityLevel {level: 3}) ON CREATE SET m.name = 'Defined', m.criteria_summary = 'Standardized';
MERGE (m:MaturityLevel {level: 4}) ON CREATE SET m.name = 'Managed', m.criteria_summary = 'Measured and controlled';
MERGE (m:MaturityLevel {level: 5}) ON CREATE SET m.name = 'Optimizing', m.criteria_summary = 'Continuously improved';
```

---

## 5. Running from the ADPA server

Use `getNeo4jDriver()` and `getNeo4jDatabase()` from `server/src/utils/neo4j.ts`, then run each statement in a session:

```typescript
import { getNeo4jDriver, getNeo4jDatabase } from '../utils/neo4j'

const driver = getNeo4jDriver()
if (!driver) return
const db = getNeo4jDatabase()
const session = driver.session({ database: db })
try {
  await session.run('CREATE CONSTRAINT gkg_project_adpa_id IF NOT EXISTS FOR (n:Project) REQUIRE n.adpa_id IS UNIQUE')
  // ... rest of constraints/indexes
} finally {
  await session.close()
}
```

A dedicated script or migration runner (e.g. `server/scripts/init-gkg-schema.ts`) can execute the full set idempotently.
