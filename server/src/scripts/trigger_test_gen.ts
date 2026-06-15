import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

import { connectDatabase, pool } from '../database/connection';

async function run() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    
    console.log('Fetching a project...');
    const projectRes = await pool.query('SELECT id, name FROM projects LIMIT 1');
    if (projectRes.rows.length === 0) {
      console.error('No projects found in database.');
      process.exit(1);
    }
    const project = projectRes.rows[0];
    console.log(`Using project: ${project.name} (${project.id})`);

    console.log('Fetching a template...');
    const templateRes = await pool.query('SELECT id, name FROM templates WHERE deleted_at IS NULL LIMIT 1');
    const template = templateRes.rows.length > 0 ? templateRes.rows[0] : null;
    if (template) {
      console.log(`Using template: ${template.name} (${template.id})`);
    } else {
      console.log('No templates found, proceeding without template.');
    }

    const userId = '42ca7333-b37e-4e1b-bd50-ac04abd7e682'; // Menno Drescher
    
    // We import the service AFTER connecting the DB just in case it does some eager initialization
    const { documentGenerationService } = await Promise.resolve().then(() => require());
    const { initializeRegistry } = await Promise.resolve().then(() => require());

    console.log('Initializing Extraction Registry...');
    await initializeRegistry();

    console.log('Starting test generation...');
    const result = await documentGenerationService.generateDocument({
      projectId: project.id,
      templateId: template?.id,
      userPrompt: 'Generate a short project update with some entities like risks and stakeholders.',
      provider: 'mistral',
      model: 'mistral-large-latest',
      userId,
    });
    
    console.log('SUCCESS!');
    console.log('--- CONTENT PREVIEW ---');
    console.log(result.content.substring(0, 1000));
    console.log('--- END PREVIEW ---');
    
    // Check if entities were extracted
    // The service logs should show this, but we can't easily see them here.
    // However, if the H8 tags are in the content, we know the prompt worked.
    if (result.content.includes('########')) {
      console.log('INFO: H8 tags found in output. Entity extraction prompt is being followed.');
    } else {
      console.log('WARNING: No H8 tags found in output.');
    }

    process.exit(0);
  } catch (err) {
    console.error('GENERATION FAILED WITH ERROR:');
    console.error(err);
    process.exit(1);
  }
}

run();
