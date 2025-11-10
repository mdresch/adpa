import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function findUnicornProject() {
  try {
    // Search for Unicorn COAS project
    const projects = await pool.query(`
      SELECT 
        id, name, description, framework, 
        created_by, created_at
      FROM projects 
      WHERE name ILIKE '%unicorn%' OR name ILIKE '%coas%'
      ORDER BY created_at DESC
    `);

    console.log('\n🦄 Unicorn / COAS Projects:\n');
    
    if (projects.rows.length === 0) {
      console.log('No projects found matching "Unicorn" or "COAS"');
      console.log('\nYou need to create a new assessment for ADPA Unicorn COAS.');
    } else {
      projects.rows.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Description: ${p.description || 'N/A'}`);
        console.log(`   Framework: ${p.framework}`);
        console.log(`   Created: ${p.created_at}`);
        console.log('');
      });

      // Check for batches in these projects
      const projectIds = projects.rows.map(p => p.id);
      const batches = await pool.query(`
        SELECT 
          ub.id as batch_id,
          ub.project_id,
          ub.status,
          ub.total_files,
          ub.successful_files,
          ub.created_at,
          p.name as project_name
        FROM upload_batches ub
        JOIN projects p ON ub.project_id = p.id
        WHERE ub.project_id = ANY($1)
        ORDER BY ub.created_at DESC
      `, [projectIds]);

      if (batches.rows.length > 0) {
        console.log('\n📦 Upload Batches for these projects:\n');
        batches.rows.forEach((b, idx) => {
          console.log(`${idx + 1}. ${b.project_name}`);
          console.log(`   Batch ID: ${b.batch_id}`);
          console.log(`   Status: ${b.status}`);
          console.log(`   Documents: ${b.successful_files}/${b.total_files}`);
          console.log(`   Created: ${b.created_at}`);
          console.log('');
        });
      } else {
        console.log('\n📦 No upload batches found for these projects.');
        console.log('You can upload documents directly to the project or create a new assessment.');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findUnicornProject();

