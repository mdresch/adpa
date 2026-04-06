import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
  const seedPath = path.join(process.cwd(), 'data/seeds/pmbok', runId);
  
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed path not found: ${seedPath}`);
    return;
  }

  // Files to process
  const files = ['project_charter.json', 'business_case.json', 'ideation_summary.json'];
  const entities: PMEntity[] = [];

  for (const file of files) {
    const filePath = path.join(seedPath, file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Map JSON to Entities
      if (file === 'project_charter.json') {
        data.stakeholders?.forEach((s: any) => entities.push({ type: 'stakeholder', name: s.name, value: s }));
        data.risks?.forEach((r: any) => entities.push({ type: 'risk_definition', name: r.description.substring(0, 50), value: r }));
        data.deliverables?.forEach((d: string) => entities.push({ type: 'deliverable', name: d, value: { description: d } }));
      }
      // Add more mappers for other files...
    }
  }

  console.log(`Mapped ${entities.length} entities for sync.`);
  
  // TODO: Database Injection Logic
  // This would use the Drizzle ORM to insert into `playbook_extracted_entities`
  // await db.insert(playbookExtractedEntities).values(entities.map(e => ({
  //   id: uuidv4(),
  //   playbook_id: documentId,
  //   entity_type: e.type,
  //   entity_name: e.name,
  //   entity_value: e.value,
  //   extraction_confidence: 1.0,
  // })));

  return entities;
}

// Example usage:
// syncEntities('adpa_lifecycle_v4', 'doc-uuid-here');
