import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function checkExtractedEntities() {
  try {
    await connectDatabase();
    
    // Find the latest User Stories document ID
    const docRes = await pool.query(
      `SELECT id, name FROM documents WHERE name = 'User Stories' ORDER BY created_at DESC LIMIT 1`
    );
    
    if (docRes.rows.length === 0) {
      console.log("No User Stories documents found.");
      return;
    }
    
    const docId = docRes.rows[0].id;
    console.log(`Analyzing User Stories Document (ID: ${docId})...`);
    
    // Query entity_extractions using correct document_id column
    const entitiesRes = await pool.query(
      `SELECT entity_type, COUNT(*) as count
       FROM entity_extractions
       WHERE document_id = $1
       GROUP BY entity_type`,
      [docId]
    );

    console.log("\nEXTRACTED ENTITIES FOR THIS DOCUMENT:");
    console.log("=====================================");
    if (entitiesRes.rows.length === 0) {
      console.log("No entities currently linked to this document in the database.");
    } else {
      for (const row of entitiesRes.rows) {
        console.log(`- Type: ${row.entity_type} (Count: ${row.count})`);
      }
    }
    console.log("=====================================");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkExtractedEntities();
