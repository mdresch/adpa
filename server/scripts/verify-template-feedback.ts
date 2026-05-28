import 'dotenv/config';
import { documentGenerationService } from '../src/services/documentGenerationService';
import { pool, connectDatabase } from '../src/database/connection';
import { v4 as uuidv4 } from 'uuid';

async function verifyFeedbackLoop() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDatabase();

    // 1. Get project
    const projectRes = await pool.query('SELECT id, name FROM projects ORDER BY updated_at DESC LIMIT 1');
    if (projectRes.rows.length === 0) {
      console.log('❌ No projects found.');
      return;
    }
    const project = projectRes.rows[0];
    console.log(`Using project: ${project.name} (${project.id})`);

    // 2. Get User Stories template
    const templateRes = await pool.query("SELECT id, name FROM templates WHERE name = 'User Stories' LIMIT 1");
    if (templateRes.rows.length === 0) {
      console.log('❌ User Stories template not found in database.');
      return;
    }
    const template = templateRes.rows[0];
    console.log(`Using template: ${template.name} (${template.id})`);

    // Get current template profile
    const profileRes = await pool.query('SELECT * FROM template_entity_profile WHERE template_id = $1', [template.id]);
    const profile = profileRes.rows[0];
    console.log('Current template_entity_profile total_documents:', profile ? profile.total_documents : 0);
    console.log('Current template_entity_profile total_entities:', profile ? profile.total_entities : 0);
    console.log('Current template_entity_profile.avg_entity_counts:', profile ? JSON.stringify(profile.avg_entity_counts, null, 2) : '{}');

    // 3. Create a dummy job
    const jobId = uuidv4();
    const userId = '42ca7333-b37e-4e1b-bd50-ac04abd7e682'; // Standard system/admin seed user ID or active user ID
    
    console.log(`Creating dummy generation job: ${jobId}`);
    await pool.query(
      `INSERT INTO jobs (id, type, status, data, created_by, project_id)
       VALUES ($1, 'ai-generate', 'processing', $2, $3, $4)`,
      [jobId, JSON.stringify({ jobId, projectId: project.id, userId }), userId, project.id]
    );

    // 4. Trigger document generation
    console.log('🚀 Triggering document generation (Mistral fallback expected/supported)...');
    const genResult = await documentGenerationService.generateDocument({
      jobId,
      projectId: project.id,
      userId,
      templateId: template.id,
      userPrompt: 'Generate a short user story document for testing the feedback loop.',
      provider: 'google',
      model: 'gemini-1.5-flash',
      temperature: 0.7,
    });

    console.log('✅ Document generation finished. Document ID:', genResult.documentId);

    // 5. Query document counts and template profile updates
    const docRes = await pool.query(
      'SELECT id, entity_counts, inferred_primary_domain FROM documents WHERE id = $1',
      [genResult.documentId]
    );
    const generatedDoc = docRes.rows[0];
    console.log('\n📄 Generated Document Purpose & Counts:');
    console.log('=======================================');
    console.log('Document ID:', generatedDoc?.id);
    console.log('Document entity_counts:', JSON.stringify(generatedDoc?.entity_counts, null, 2));
    console.log('Document inferred_primary_domain:', generatedDoc?.inferred_primary_domain);
    console.log('=======================================');

    // 6. Check updated template stats
    const updatedTemplateRes = await pool.query("SELECT avg_entity_counts FROM template_entity_profile WHERE template_id = $1", [template.id]);
    const updatedTemplate = updatedTemplateRes.rows[0];
    console.log('\n📊 Updated template_entity_profile.avg_entity_counts:');
    console.log('=======================================');
    console.log(JSON.stringify(updatedTemplate?.avg_entity_counts, null, 2));
    console.log('=======================================');

    // 7. Check updated template profile
    const updatedProfileRes = await pool.query('SELECT * FROM template_entity_profile WHERE template_id = $1', [template.id]);
    const updatedProfile = updatedProfileRes.rows[0];
    console.log('\n📈 Updated template_entity_profile:');
    console.log('=======================================');
    console.log('Total Documents:', updatedProfile?.total_documents);
    console.log('Total Entities:', updatedProfile?.total_entities);
    console.log('Primary Knowledge Domain:', updatedProfile?.primary_knowledge_domain);
    console.log('Primary Performance Domain:', updatedProfile?.primary_performance_domain);
    console.log('Knowledge Domain Coverage:', JSON.stringify(updatedProfile?.knowledge_domain_coverage, null, 2));
    console.log('=======================================');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
    process.exit(0);
  }
}

verifyFeedbackLoop();
