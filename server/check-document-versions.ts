import { pool, connectDatabase } from './src/database/connection';

async function checkVersions() {
  await connectDatabase();
  const docId = '4c04f981-d419-4b68-ab69-26d2f50ee393';
  
  // Query document_versions
  const versions = await pool.query(
    `SELECT id, version, semantic_version, change_description, change_type, created_at, word_count, length(content) as content_len 
     FROM document_versions 
     WHERE document_id = $1 
     ORDER BY version ASC`,
    [docId]
  );
  
  console.log(`=== DOCUMENT VERSIONS FOR ${docId} ===`);
  console.log(`Found ${versions.rows.length} versions.`);
  versions.rows.forEach(v => {
    console.log(`Version ${v.version} (v${v.semantic_version}) | Type: ${v.change_type} | Created: ${v.created_at} | Content Length: ${v.content_len} | Word Count: ${v.word_count}`);
  });

  // Query audit trail
  const audits = await pool.query(
    `SELECT id, action_type, performed_by, created_at, event_type, metadata
     FROM document_audit_trail 
     WHERE document_id = $1 
     ORDER BY created_at ASC`,
    [docId]
  );

  console.log(`\n=== AUDIT TRAIL FOR ${docId} ===`);
  console.log(`Found ${audits.rows.length} audit entries.`);
  audits.rows.forEach(a => {
    console.log(`Action: ${a.action_type} | Event: ${a.event_type} | Performed By: ${a.performed_by} | Created: ${a.created_at} | Metadata: ${JSON.stringify(a.metadata)}`);
  });

  await pool.end();
}

checkVersions().catch(e => {
  console.error(e);
  process.exit(1);
});
