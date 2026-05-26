import * as dotenv from 'dotenv';
import { connectDatabase, pool } from '../database/connection';

dotenv.config();

async function run() {
  console.log("Connecting database...");
  await connectDatabase();
  
  // Find a project
  const projResult = await pool.query('SELECT id, owner_id FROM projects LIMIT 1');
  if (projResult.rows.length === 0) {
    console.error("No projects found!");
    process.exit(1);
  }
  const { id: projectId, owner_id: ownerId } = projResult.rows[0];
  console.log(`Found project ID: ${projectId}, owner ID: ${ownerId}`);
  
  try {
    const type = 'reference_document';
    const title = 'Test Document';
    const content = 'Test Content';
    const itemId = 'c9a0c1de-aa27-6325-53bc-81a22d87651c'; // mock uuid
    
    console.log("Attempting insert...");
    const insert = await pool.query(
      `INSERT INTO project_context_items (
        id, project_id, type, title, content, is_active, priority, created_by
      ) VALUES ($1,$2,$3,$4,$5,true,0,$6)
      RETURNING *`,
      [itemId, projectId, type, title, content, ownerId]
    );
    console.log("INSERT SUCCESSFUL! Row:", insert.rows[0]);
    
    // Clean up
    await pool.query('DELETE FROM project_context_items WHERE id = $1', [itemId]);
    console.log("Cleanup successful.");
  } catch (error: any) {
    console.error("INSERT FAILED:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("Stack:", error.stack);
  }
  
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
