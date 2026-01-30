# Neo4j GKG – Status and Future Implementation

**Purpose**: Current status of the Governance Knowledge Graph (GKG), how to confirm it works, and what is planned for future implementation.  
**Related**: [GKG_SCHEMA.md](./GKG_SCHEMA.md), [GKG_SCHEMA_CYPHER.md](./GKG_SCHEMA_CYPHER.md), [GKG_INGESTION_DESIGN.md](./GKG_INGESTION_DESIGN.md)

---

## 1. Current Status (Implemented)

| Component | Status | Location |
|-----------|--------|----------|
| **Neo4j connection** | Done. Optional; server starts even when Neo4j is unset or unreachable. | `server/src/utils/neo4j.ts` |
| **Health / circuit** | Done. `dependencies.neo4j` in queue-stats health; `"disabled"` when not configured. | `server/src/routes/queue-stats.ts` |
| **GKG schema (design)** | Done. Nodes, relationships, conventions. | `docs/07-architecture/GKG_SCHEMA.md` |
| **Constraints & indexes (Cypher)** | Documented; **must be applied once** via script or Aura. | `docs/07-architecture/GKG_SCHEMA_CYPHER.md` |
| **Init script** | Done. Runs constraints, indexes, and seed GovernanceDomain/MaturityLevel idempotently. | `server/scripts/init-gkg-schema.ts` |
| **Sync service** | Done. Phases 0–4: bootstrap, project, document, SemanticUnits, project_dependencies. | `server/src/services/gkg/` |
| **Queue & jobs** | Done. `gkgSyncQueue`, job types `gkg-bootstrap`, `gkg-sync-project`, `gkg-sync-document`. | `server/src/services/queueService.ts`, job processors |
| **API** | Done. `POST /api/gkg/sync` with `{ projectId?, documentId?, bootstrap? }`. | `server/src/routes/gkg.ts` |
| **UI integration** | Done. Project Integrations tab has a GKG card with "Bootstrap GKG" and "Sync this project to GKG" buttons. | `app/projects/[id]/components/IntegrationsTab.tsx` |
| **Post-extraction hook** | Done. After extraction completes, enqueues `gkg-sync-project` when Neo4j is configured. | `server/src/services/jobs/ExtractionOrchestrationService.ts` |

---

## 2. One-Time Schema Setup

Before sync jobs can write reliably, Neo4j must have constraints, indexes, and reference nodes.

**Option A – Init script (recommended)**

From the `server/` directory, with `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` set in `server/.env`:

```bash
cd server
npm run init-gkg-schema
```

This creates constraints, indexes, and seeds `GovernanceDomain` and `MaturityLevel`. Safe to run repeatedly (idempotent).

**Option B – Manual Cypher**

Run the statements in [GKG_SCHEMA_CYPHER.md](./GKG_SCHEMA_CYPHER.md) (constraints, then indexes, then MERGE seeds) in Neo4j Browser or Aura.

---

## 3. Confirming It Is Working

### 3.1 Prerequisites

- Neo4j (e.g. Aura) reachable; `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` in `server/.env`.
- Schema init has been run (`npm run init-gkg-schema`).
- Backend and queue workers running; at least one project and some documents/entities in PostgreSQL.

### 3.2 Steps

The GKG sync endpoint requires auth: `Authorization: Bearer <your-jwt>`. User must have `projects.view`. Backend base URL is usually `http://localhost:5000`.

1. **Health check**  
   Call the health/queue-stats endpoint. Confirm `dependencies.neo4j` is not `"disabled"` (e.g. `"closed"` when connected).

2. **Bootstrap**  
   `POST /api/gkg/sync` with body `{ "bootstrap": true }`.  
   Expect `{ jobId, status: "enqueued", type: "gkg-bootstrap" }`.  
   After the job runs, in Neo4j you should see 10 `GovernanceDomain` and 5 `MaturityLevel` nodes.

   **Example (PowerShell):**
   ```powershell
   $token = "YOUR_JWT_TOKEN"
   Invoke-RestMethod -Uri "http://localhost:5000/api/gkg/sync" -Method Post `
     -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
     -Body '{"bootstrap":true}'
   ```

   **Example (curl):**
   ```bash
   curl -s -X POST "http://localhost:5000/api/gkg/sync" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bootstrap":true}'
   ```

3. **Sync one project**  
   `POST /api/gkg/sync` with body `{ "projectId": "<project-uuid>" }`.  
   Expect `{ jobId, status: "enqueued", type: "gkg-sync-project", projectId }`.  
   After the job runs, in Neo4j:
   - One `Project` with `adpa_id = <project-uuid>`.
   - One or more `Document` nodes with `BELONGS_TO` to that Project.
   - `SemanticUnit` nodes (e.g. Requirement, Risk, Stakeholder) with `BELONGS_TO` Project and `EXTRACTED_FROM` Document where `document_id` is set.

   **Example (PowerShell):**
   ```powershell
   $token = "YOUR_JWT_TOKEN"
   $projectId = "YOUR-PROJECT-UUID"
   Invoke-RestMethod -Uri "http://localhost:5000/api/gkg/sync" -Method Post `
     -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
     -Body (@{ projectId = $projectId } | ConvertTo-Json)
   ```

   **Example (curl):**
   ```bash
   curl -s -X POST "http://localhost:5000/api/gkg/sync" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"projectId":"YOUR-PROJECT-UUID"}'
   ```

4. **Inspect in Neo4j**  
   In Neo4j Browser or Aura:

   ```cypher
   MATCH (n) RETURN n LIMIT 25;
   ```

   Or by label / structure:

   ```cypher
   MATCH (p:Project) RETURN p LIMIT 5;
   MATCH (d:Document)-[:BELONGS_TO]->(p:Project) RETURN d, p LIMIT 10;
   MATCH (u:SemanticUnit)-[:BELONGS_TO]->(p:Project) RETURN u.adpa_entity_type, count(*) AS cnt ORDER BY cnt DESC;
   ```

   You should see projects, documents, and SemanticUnits by type.

5. **Post-extraction**  
   Run a full extraction for a project that has Neo4j configured. When the extraction parent job completes, a `gkg-sync-project` job for that project should be enqueued (check worker logs or queue UI).

---

## 4. Future Implementation

Planned extensions (not yet built):

| Area | Description |
|------|-------------|
| **Phase 5 – ECS / governance** | Ingest Authority, Evidence, TemporalRange, GovernanceRule; relationships IN_DOMAIN, GOVERNED_BY, TRACES_TO, CONFLICTS_WITH. Depends on ECS/DME pipelines. |
| **TRACES_TO / CONFLICTS_WITH** | Derive trace and conflict edges between SemanticUnits (e.g. requirement ↔ test, requirement ↔ risk) from ADPA or from analysis. |
| **Scenario generator** | Use the graph for “what-if” or scenario traversal (e.g. impact of changing a milestone or retiring a stakeholder). |
| **Scheduled sync** | Cron or recurring job for incremental or full re-sync using `updated_at` / `synced_at`. |
| **gkg-sync-entity-type** | Optional job type to sync one project + one entity type for parallelism. |
| **Read API** | Endpoints to query the GKG (e.g. “all units in domain X”, “dependencies of project P”) for UI or integrations. |

These remain design/backlog until product and pipeline priorities are set.

---

## 5. Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEO4J_URI` or `NEO4J_URL` | Neo4j connection URI (e.g. `neo4j+s://xxxx.databases.neo4j.io` for Aura). |
| `NEO4J_USERNAME` or `NEO4J_USER` | Username (default `neo4j`). |
| `NEO4J_PASSWORD` | Password. |
| `NEO4J_DATABASE` | Database name (default `neo4j`). |
| `NEO4J_CONNECT_TIMEOUT_MS` | Connectivity timeout in ms (default 15000). Useful when Aura is still starting. |

When `NEO4J_URI` is unset, all GKG features are disabled and the server runs without Neo4j.

---

## 6. Troubleshooting: GKG Jobs Stuck “Pending”

GKG jobs (`gkg-bootstrap`, `gkg-sync-project`, `gkg-sync-document`) are handled by the **same Node process** that runs the API. There is no separate worker binary. When the server starts, it imports `queueService`, which registers Rabbit consumers for the `gkg-sync` queue. If jobs show as “Pending” or “orphaned” in queue-stats:

1. **Restart the backend**  
   Ensure the server process that serves the API has been restarted after GKG was added. That process must load `queueService` and connect to Rabbit so the `gkg-sync` consumer is active.

2. **RabbitMQ**  
   The backend uses `RABBITMQ_URL` (default `amqp://localhost`). Confirm RabbitMQ is running and that the backend uses the same URL. If the API and queues use different brokers or URLs, jobs will stay pending.

3. **Retry after restart**  
   After restarting the backend, use “Retry” on the stuck jobs in the queue-stats UI, or call `POST /api/gkg/sync` again with `{ "bootstrap": true }` or `{ "projectId": "<uuid>" }`. New jobs will be consumed as long as the backend is running and connected to Rabbit.

---

## 7. Troubleshooting: Neo4j Stays Empty (Counts Zero)

If jobs are enqueued and the UI shows "GKG bootstrap job enqueued" / "GKG project sync job enqueued", but `/ai-analytics/gkg` or Neo4j Aura shows zero projects/documents/units:

1. **Confirm jobs are processed**  
   In backend logs, look for:
   - `[GKG] Processing gkg-bootstrap` then `[GKG] Bootstrap completed`
   - `[GKG] Processing gkg-sync-project` then `[GKG] Sync project completed`  
   If you never see "Processing" or "completed", the consumer may not be running (see §6) or messages are on a different broker.

2. **Run schema init once**  
   From `server/`: `npm run init-gkg-schema`. This creates constraints and indexes and seeds `GovernanceDomain` and `MaturityLevel`. Without it, MERGE still works but constraints improve reliability. Safe to run repeatedly.

3. **Check Neo4j connectivity**  
   Call `/api/queue-stats` (or your health endpoint) and ensure `dependencies.neo4j` is not `"disabled"`. If the circuit is open, `getNeo4jDriver()` returns null and GKG jobs fail with "Neo4j not configured or unavailable". Restart the backend after Neo4j (e.g. Aura) is reachable.

4. **Refresh the GKG dashboard**  
   Open `/ai-analytics/gkg` and click **Refresh**. The summary is read from Neo4j at request time; if sync completed after the page load, refresh to see updated counts and top projects.
