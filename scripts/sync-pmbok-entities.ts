import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { connectDatabase, getDatabasePool } from '../server/src/database/connection';

/**
 * Syncs PMBOK entities from the Python orchestrator's JSON output 
 * directly into the ADPA database representation.
 */
interface PMEntity {
  type: string;
  name: string;
  value: any;
}

async function syncEntities(runId: string, documentId: string) {
  const seedPath = path.join(process.cwd(), 'output', runId);
  
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed path not found: ${seedPath}`);
    return;
  }

  const files = ['project_charter.json'];
  const entities: PMEntity[] = [];

  for (const file of files) {
    const filePath = path.join(seedPath, file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (file === 'project_charter.json') {
        data.stakeholders?.forEach((s: any) => entities.push({ type: 'role', name: s.name || s.role || 'Stakeholder', value: s }));
        data.risks?.forEach((r: any) => entities.push({ type: 'risk_definition', name: (r.description || r.name || '').substring(0, 50) || 'Risk', value: r }));
        data.deliverables?.forEach((d: any) => entities.push({ type: 'tool', name: typeof d === 'string' ? d.substring(0, 50) : (d.name || d.description || '').substring(0, 50) || 'Deliverable', value: typeof d === 'string' ? { description: d } : d }));
      }
    }
  }

  console.log(`Mapped ${entities.length} entities for sync.`);
  if (entities.length === 0) return entities;

  await connectDatabase();
  const pool = getDatabasePool();
  try {
      // Find an existing user for FK constraint
      const userRes = await pool.query("SELECT id FROM users LIMIT 1");
      if (userRes.rows.length === 0) {
          throw new Error("No users found in database to fulfill foreign key constraints!");
      }
      const userId = userRes.rows[0].id;

      // Create stub playbook
      const playbookRes = await pool.query(
          "INSERT INTO playbook_templates (id, name, purpose, severity_model, escalation_rules, actions, status, version_major, version_minor, version_micro, drift_detection_enabled, review_workflow_state, created_by, usage_count, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 0, 0, false, 'draft', $8, 0, false) ON CONFLICT (id) DO NOTHING RETURNING id",
          [documentId, "Auto-Extracted V5 Playbook", "Sync from V5 AI Run", '{"levels":[], "classification_rules":[], "escalation_thresholds":[]}', '[]', '[]', 'draft', userId]
      );
      
      // Create version
      const versionId = uuidv4();
      await pool.query(
          "INSERT INTO playbook_versions (id, playbook_id, version_major, version_minor, version_micro, content, change_type, created_by) VALUES ($1, $2, 1, 0, 0, $3, 'structural', $4)",
          [versionId, documentId, '{}', userId]
      );

      for (const e of entities) {
          await pool.query(
              `INSERT INTO playbook_extracted_entities 
               (id, playbook_id, version_id, entity_type, entity_name, entity_value, extraction_confidence)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [uuidv4(), documentId, versionId, e.type, e.name, JSON.stringify(e.value), 1.0]
          );
      }
      console.log(`Successfully injected ${entities.length} entities into DB!`);
  } catch(err) {
      console.error("Failed to insert entities:", err);
  } finally {
      process.exit(0);
  }

  return entities;
}

const docId = uuidv4();
console.log(`Syncing into document ID: ${docId}`);
syncEntities('adpa_lifecycle_v5', docId);
