import 'dotenv/config';
import { documentGenerationService } from '../src/services/documentGenerationService';
import { pool, connectDatabase } from '../src/database/connection';

async function run() {
  try {
    await connectDatabase();

    // Get a valid project ID
    const projectRes = await pool.query('SELECT id, name FROM projects ORDER BY updated_at DESC LIMIT 1');
    if (projectRes.rows.length === 0) {
      console.log('No projects found.');
      return;
    }
    const project = projectRes.rows[0];
    console.log(`Using project: ${project.name} (${project.id})`);

    // We'll generate a dummy document using a specific template if we have one, or just prompt
    const templateRes = await pool.query('SELECT id, name FROM templates LIMIT 1');
    const templateId = templateRes.rows.length > 0 ? templateRes.rows[0].id : undefined;

    console.log('Template ID:', templateId);

    const result = await documentGenerationService.generateDocument({
      projectId: project.id,
      userId: '42ca7333-b37e-4e1b-bd50-ac04abd7e682', // A generic user ID
      name: 'Test Document Extraction ' + Date.now(),
      templateId,
      userPrompt: 'Generate a short project overview that includes key stakeholders (e.g. CEO John Doe, PM Jane Smith), a high impact budget risk, a $50k budget baseline, and a Phase 1 deliverable.',
      provider: 'google',
      model: 'gemini-1.5-pro', // or whatever is default
      temperature: 0.7,
    });

    console.log('Generation completed.');
    console.log('Content preview:', result.content.substring(0, 500));
    console.log('End of content:', result.content.substring(Math.max(0, result.content.length - 1000)));

  } catch (error) {
    console.error('Error generating document:', error);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
    process.exit(0);
  }
}

run();
