import 'dotenv/config';
import { documentGenerationService } from '../src/services/documentGenerationService';
import { pool, connectDatabase } from '../src/database/connection';
import { v4 as uuidv4 } from 'uuid';

async function run() {
  try {
    await connectDatabase();

    // 1. Get a valid project ID
    const projectRes = await pool.query('SELECT id, name FROM projects ORDER BY updated_at DESC LIMIT 1');
    if (projectRes.rows.length === 0) {
      console.log('No projects found.');
      return;
    }
    const project = projectRes.rows[0];
    console.log(`Using project: ${project.name} (${project.id})`);

    // 2. Get the User Stories template
    const templateRes = await pool.query("SELECT id, name FROM templates WHERE name = 'User Stories' LIMIT 1");
    const templateId = templateRes.rows.length > 0 ? templateRes.rows[0].id : undefined;
    console.log('Using Template:', templateRes.rows[0]?.name, 'ID:', templateId);

    // 3. Create a dummy job in the jobs table
    const jobId = uuidv4();
    const userId = '42ca7333-b37e-4e1b-bd50-ac04abd7e682';
    
    console.log(`Creating dummy job in database with ID: ${jobId}`);
    await pool.query(
      `INSERT INTO jobs (id, type, status, data, created_by, project_id)
       VALUES ($1, 'ai-generate', 'processing', $2, $3, $4)`,
      [jobId, JSON.stringify({ jobId, projectId: project.id, userId }), userId, project.id]
    );

    // 4. Run document generation
    console.log('Starting document generation...');
    const result = await documentGenerationService.generateDocument({
      jobId,
      projectId: project.id,
      userId,
      templateId,
      userPrompt: 'Generate a short project overview for testing.',
      provider: 'google',
      model: 'gemini-1.5-flash',
      temperature: 0.7,
    });

    console.log('Generation completed.');

    // 5. Inspect the job data in the database
    const jobRes = await pool.query('SELECT id, data, result FROM jobs WHERE id = $1', [jobId]);
    if (jobRes.rows.length > 0) {
      const job = jobRes.rows[0];
      console.log('==================================================');
      console.log('INSPECTING DUMMY JOB POST-GENERATION:');
      console.log('Job ID:', job.id);
      console.log('Job Data keys:', Object.keys(job.data || {}));
      console.log('Job llm_insights:', JSON.stringify(job.data?.llm_insights, null, 2));
      console.log('==================================================');
    } else {
      console.log('Dummy job not found!');
    }

  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
    process.exit(0);
  }
}

run();
