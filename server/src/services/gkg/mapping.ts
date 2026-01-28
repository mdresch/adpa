/**
 * ADPA table -> GKG SemanticUnit mapping.
 * Used for Phase 3 sync: summary column and document_id column per entity type.
 * See docs/07-architecture/GKG_INGESTION_DESIGN.md §5.
 */

export interface EntityMapping {
  adpaTable: string
  gkgEntityType: string
  /** Column(s) to use for SemanticUnit.summary; first non-null wins, truncated to 500 */
  summaryColumns: string[]
  /** Column for source document (EXTRACTED_FROM); null when table has no document link */
  documentIdColumn: string | null
}

const SUMMARY_MAX = 500

/** ADPA table -> GKG mapping. Tables not in this map fall back to table-to-PascalCase + id/project_id/source_document_id when present. */
export const ENTITY_MAPPINGS: EntityMapping[] = [
  { adpaTable: "requirements", gkgEntityType: "Requirement", summaryColumns: ["title", "name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "risks", gkgEntityType: "Risk", summaryColumns: ["title", "name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "stakeholders", gkgEntityType: "Stakeholder", summaryColumns: ["name"], documentIdColumn: null },
  { adpaTable: "milestones", gkgEntityType: "Milestone", summaryColumns: ["name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "constraints", gkgEntityType: "Constraint", summaryColumns: ["title", "name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "governance_decisions", gkgEntityType: "GovernanceDecision", summaryColumns: ["description", "decision_id"], documentIdColumn: "source_document_id" },
  { adpaTable: "action_items", gkgEntityType: "ActionItem", summaryColumns: ["title", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "deliverables", gkgEntityType: "Deliverable", summaryColumns: ["name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "phases", gkgEntityType: "Phase", summaryColumns: ["name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "activities", gkgEntityType: "Activity", summaryColumns: ["name", "title", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "work_items", gkgEntityType: "WorkItem", summaryColumns: ["title", "name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "scope_baseline", gkgEntityType: "ScopeBaseline", summaryColumns: ["name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "wbs_nodes", gkgEntityType: "WBSNode", summaryColumns: ["name", "code", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "budget_baseline", gkgEntityType: "BudgetBaseline", summaryColumns: ["name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "schedule_baseline", gkgEntityType: "ScheduleBaseline", summaryColumns: ["name", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "best_practices", gkgEntityType: "BestPractice", summaryColumns: ["title", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "success_criteria", gkgEntityType: "SuccessCriteria", summaryColumns: ["description", "name"], documentIdColumn: "source_document_id" },
  { adpaTable: "opportunities", gkgEntityType: "Opportunity", summaryColumns: ["title", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "issue_log", gkgEntityType: "Issue", summaryColumns: ["title", "description"], documentIdColumn: "source_document_id" },
  { adpaTable: "extracted_dt_assets", gkgEntityType: "DTAsset", summaryColumns: ["name", "description"], documentIdColumn: "source_document_id" },
]

/** Map from ADPA table name to EntityMapping. */
const BY_TABLE = new Map<string, EntityMapping>()
ENTITY_MAPPINGS.forEach((m) => BY_TABLE.set(m.adpaTable, m))

/** Default summary columns when table is not in ENTITY_MAPPINGS. */
const DEFAULT_SUMMARY_COLUMNS = ["title", "name", "description"]

/** Default document ID column when table has it. */
const DEFAULT_DOCUMENT_ID_COLUMN = "source_document_id"

export function getEntityMapping(adpaTable: string): EntityMapping {
  const known = BY_TABLE.get(adpaTable)
  if (known) return known
  const pascal = adpaTable.replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase())
  return {
    adpaTable,
    gkgEntityType: pascal,
    summaryColumns: DEFAULT_SUMMARY_COLUMNS,
    documentIdColumn: DEFAULT_DOCUMENT_ID_COLUMN,
  }
}

export function getSummaryFromRow(row: Record<string, unknown>, summaryColumns: string[]): string {
  for (const col of summaryColumns) {
    const v = row[col]
    if (v != null && typeof v === "string" && v.trim()) {
      const s = v.trim()
      return s.length > SUMMARY_MAX ? s.slice(0, SUMMARY_MAX) + "…" : s
    }
  }
  return ""
}
