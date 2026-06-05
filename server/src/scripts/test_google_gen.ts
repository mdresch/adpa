import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { connectDatabase, pool } from '../database/connection';
import { documentGenerationService } from '../services/documentGenerationService';
import { initializeRegistry } from '../services/extraction/ExtractionRegistry';

async function run() {
  try {
    await connectDatabase();
    await initializeRegistry();
    
    // Fetch a project and template
    console.log('Fetching a project...');
    const projectRes = await pool.query('SELECT id, name FROM projects LIMIT 1');
    if (projectRes.rows.length === 0) {
      console.error('No projects found in database.');
      process.exit(1);
    }
    const project = projectRes.rows[0];
    console.log(`Using project: ${project.name} (${project.id})`);

    console.log('Fetching a template...');
    const templateRes = await pool.query("SELECT id, name FROM templates WHERE name ILIKE '%Business Case%' AND deleted_at IS NULL LIMIT 1");
    const template = templateRes.rows.length > 0 ? templateRes.rows[0] : null;
    if (template) {
      console.log(`Using template: ${template.name} (${template.id})`);
    } else {
      console.log('Business Case template not found, fetching any template.');
      const fallbackRes = await pool.query('SELECT id, name FROM templates WHERE deleted_at IS NULL LIMIT 1');
      if (fallbackRes.rows.length > 0) {
        console.log(`Using template: ${fallbackRes.rows[0].name} (${fallbackRes.rows[0].id})`);
      }
    }
    
    const resolvedTemplateId = template?.id || (await pool.query('SELECT id FROM templates LIMIT 1')).rows[0]?.id;
    const userId = '42ca7333-b37e-4e1b-bd50-ac04abd7e682'; // Menno Drescher

    console.log('Starting test generation with Google Gemini...');
    const result = await documentGenerationService.generateDocument({
      projectId: project.id,
      templateId: resolvedTemplateId,
      userPrompt: 'Generate a comprehensive Business Case for ADPA runtime compiler integration.',
      provider: 'google',
      model: 'gemini-3.5-flash',
      userId,
    });
    
    console.log('SUCCESS!');
    console.log(`Final document length: ${result.content.length} characters`);
    
    console.log('Headings in output:');
    result.content.split('\n').forEach((line: string) => {
      if (line.startsWith('#')) {
        console.log(`  ${line}`);
      }
    });

    process.exit(0);
  } catch (err) {
    console.error('GENERATION FAILED WITH ERROR:');
    console.error(err);
    process.exit(1);
  }
}

run();
