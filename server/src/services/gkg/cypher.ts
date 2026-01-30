/**
 * GKG Cypher statements for idempotent MERGE (Phase 0-4).
 * See docs/07-architecture/GKG_INGESTION_DESIGN.md §6.
 */

export const CYPHER = {
  /** Phase 0: GovernanceDomain */
  mergeGovernanceDomain:
    "MERGE (d:GovernanceDomain {code: $code}) ON CREATE SET d.name = $name ON MATCH SET d.name = $name",

  /** Phase 0: MaturityLevel */
  mergeMaturityLevel:
    "MERGE (m:MaturityLevel {level: $level}) ON CREATE SET m.name = $name, m.criteria_summary = $criteria ON MATCH SET m.name = $name, m.criteria_summary = $criteria",

  /** Phase 0.5: Program (when project has program_id) */
  mergeProgram:
    "MERGE (g:Program {adpa_id: $programId}) ON CREATE SET g.name = $name, g.description = $description, g.status = $status, g.created_at = $createdAt ON MATCH SET g.name = $name, g.description = $description, g.status = $status",

  /** Phase 1: Project BELONGS_TO Program */
  mergeProjectBelongsToProgram:
    "MATCH (g:Program {adpa_id: $programId}), (p:Project {adpa_id: $projectId}) MERGE (p)-[:BELONGS_TO]->(g)",

  /** Phase 1: Project */
  mergeProject:
    "MERGE (p:Project {adpa_id: $projectId}) ON CREATE SET p.name = $name, p.created_at = $createdAt ON MATCH SET p.name = $name, p.created_at = $createdAt",

  /** Phase 2: Document */
  mergeDocument:
    "MERGE (d:Document {adpa_id: $documentId}) ON CREATE SET d.project_id = $projectId, d.template_type = $templateType, d.title = $title, d.status = $status, d.created_at = $createdAt ON MATCH SET d.project_id = $projectId, d.template_type = $templateType, d.title = $title, d.status = $status",

  /** Phase 2: Document BELONGS_TO Project */
  mergeDocumentBelongsTo:
    "MATCH (p:Project {adpa_id: $projectId}), (d:Document {adpa_id: $documentId}) MERGE (d)-[:BELONGS_TO]->(p)",

  /** Phase 2.2: Template (templates table; document was generated from this template) */
  mergeTemplate:
    "MERGE (t:Template {adpa_id: $templateId}) ON CREATE SET t.name = $name, t.framework = $framework, t.created_at = $createdAt ON MATCH SET t.name = $name, t.framework = $framework",

  /** Phase 2.2: Document GENERATED_FROM Template */
  mergeDocumentGeneratedFrom:
    "MATCH (d:Document {adpa_id: $documentId}), (t:Template {adpa_id: $templateId}) MERGE (d)-[:GENERATED_FROM]->(t)",

  /** Phase 2.5: Task (project_tasks) */
  mergeTask:
    "MERGE (t:Task {adpa_id: $taskId}) ON CREATE SET t.project_id = $projectId, t.task_name = $taskName, t.summary = $summary, t.status = $status, t.entity_type = $entityType, t.wbs_code = $wbsCode, t.created_at = $createdAt ON MATCH SET t.project_id = $projectId, t.task_name = $taskName, t.summary = $summary, t.status = $status, t.entity_type = $entityType, t.wbs_code = $wbsCode",

  /** Phase 2.5: Task BELONGS_TO Project */
  mergeTaskBelongsToProject:
    "MATCH (p:Project {adpa_id: $projectId}), (t:Task {adpa_id: $taskId}) MERGE (t)-[:BELONGS_TO]->(p)",

  /** Phase 3: SemanticUnit */
  mergeSemanticUnit: `MERGE (u:SemanticUnit {adpa_entity_type: $entityType, adpa_id: $adpaId})
ON CREATE SET u.project_id = $projectId, u.document_id = $documentId, u.summary = $summary, u.payload = $payload, u.synced_at = datetime()
ON MATCH SET u.project_id = $projectId, u.document_id = $documentId, u.summary = $summary, u.payload = $payload, u.synced_at = datetime()`,

  /** Phase 3: SemanticUnit BELONGS_TO Project */
  mergeUnitBelongsTo:
    "MATCH (p:Project {adpa_id: $projectId}), (u:SemanticUnit {adpa_entity_type: $entityType, adpa_id: $adpaId}) MERGE (u)-[:BELONGS_TO]->(p)",

  /** Phase 3: SemanticUnit EXTRACTED_FROM Document (run only when documentId is not null) */
  mergeUnitExtractedFrom:
    "MATCH (d:Document {adpa_id: $documentId}), (u:SemanticUnit {adpa_entity_type: $entityType, adpa_id: $adpaId}) MERGE (u)-[:EXTRACTED_FROM]->(d)",

  /** Phase 4: Project DEPENDS_ON Project */
  mergeDependsOn:
    "MATCH (a:Project {adpa_id: $sourceProjectId}), (b:Project {adpa_id: $targetProjectId}) MERGE (a)-[:DEPENDS_ON]->(b)",
} as const

export const GOVERNANCE_DOMAINS = [
  "Integration", "Scope", "Schedule", "Cost", "Quality",
  "Resource", "Communications", "Risk", "Procurement", "Stakeholder",
]

export const MATURITY_LEVELS: { level: number; name: string; criteria: string }[] = [
  { level: 1, name: "Initial", criteria: "Ad hoc" },
  { level: 2, name: "Developing", criteria: "Defined processes" },
  { level: 3, name: "Defined", criteria: "Standardized" },
  { level: 4, name: "Managed", criteria: "Measured and controlled" },
  { level: 5, name: "Optimizing", criteria: "Continuously improved" },
]
