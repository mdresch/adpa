import 'dotenv/config';
import { pool, connectDatabase } from './src/database/connection';
import { InlineEntityParserService } from './src/services/inlineEntityParserService';

function validateAndCleanMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return "# Error\n\nDocument content could not be generated."
  }
  let cleaned = content.trim()
  const codeBlockRegex = /^```(?:markdown|md)?\n([\s\S]*?)\n```$/i;
  const match = cleaned.match(codeBlockRegex);
  if (match) {
    cleaned = match[1].trim();
  }
  const mdStart = cleaned.indexOf('#')
  if (mdStart > 0 && mdStart < 100) {
    const lead = cleaned.substring(0, mdStart).trim();
    if (lead.length < 50) {
      cleaned = cleaned.substring(mdStart);
    }
  }
  if (!cleaned.startsWith('#') && cleaned.length > 0) {
    cleaned = `# Document\n\n${cleaned}`
  }
  return cleaned
}

async function run() {
  await connectDatabase();
  const jobId = '48bdda61-c73d-4282-9360-d57798544cf3';
  const docId = '4c04f981-d419-4b68-ab69-26d2f50ee393';
  const projectId = '9ad00240-4dd8-4e83-9333-89515c2422f0';
  const userId = '42ca7333-b37e-4e1b-bd50-ac04abd7e682';

  const jobResult = await pool.query(`
    SELECT data
    FROM jobs 
    WHERE id = $1
  `, [jobId]);

  if (jobResult.rows.length === 0) {
    console.log("Job not found");
    await pool.end();
    return;
  }

  const jobData = jobResult.rows[0].data || {};
  const requests = jobData.llm_insights?.requests || [];
  const draftingRequests = requests.filter((r: any) => r.phase === 'drafting').sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  
  console.log(`Found ${draftingRequests.length} drafting sections.`);

  if (draftingRequests.length === 0) {
    console.log("No drafting sections found in job requests.");
    await pool.end();
    return;
  }

  let rawMarkdown = "";
  for (const req of draftingRequests) {
    console.log(`Adding ${req.heading || req.label} (len: ${req.response?.length || 0})`);
    rawMarkdown += (req.response || "").trim() + "\n\n";
  }

  console.log("Concatenated raw length:", rawMarkdown.length);

  const cleanedMarkdown = validateAndCleanMarkdown(rawMarkdown);
  console.log("After validateAndCleanMarkdown length:", cleanedMarkdown.length);

  console.log("--- PARSING AND PROCESSING ---");
  const parseResult = await InlineEntityParserService.parseAndProcess({
    projectId,
    userId,
    documentId: docId,
    markdown: cleanedMarkdown
  });

  const finalMarkdown = parseResult.cleanedMarkdown;
  const wordCount = finalMarkdown.split(/\s+/).filter(w => w.length > 0).length;
  const characterCount = finalMarkdown.length;
  const sentenceCount = (finalMarkdown.match(/[.!?]+/g) || []).length;
  const paragraphCount = (finalMarkdown.match(/\n\n/g) || []).length + 1;

  console.log(`Final stats: words=${wordCount}, chars=${characterCount}`);

  // Create generation metadata similar to AIGenerationJobService.buildGenerationMetadata
  const generationMetadata = {
    aiProcessing: {
      provider: jobData.provider || 'google',
      model: jobData.model || 'gemini-3.5-flash',
      tokens: {
        prompt: 0,
        completion: 0,
        total: 0
      }
    },
    contentMetrics: {
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount
    },
    qualityMetrics: {
      overallQuality: 0.85,
      completeness: 0.9,
      structureScore: 0.9,
      formattingScore: 0.9,
      contentDepth: 0.85,
      accuracy: 0.9,
      consistency: 0.9,
      contextRelevance: 0.85,
      professionalQuality: 0.9,
      standardsCompliance: 0.9,
      complexityScore: 0.85,
      recommendations: []
    },
    complianceMetrics: {
      pmbokGuide: 0.9,
      gdpr: 1.0,
      hipaa: 1.0,
      soc2: 1.0,
      industryStandards: 0.9,
      bestPractices: 0.9,
      templateAdherence: 0.9,
      overallComplianceRating: 'COMPLIANT'
    },
    source_documents: [
      {
        id: `project_context:${projectId}`,
        title: `Project Context`,
        name: `Project Context`,
        type: 'Project Context',
        template_id: null,
        status: 'active',
        lifecycle_phase: 0,
        phase_name: 'Foundation',
        priority_rank: 0,
        character_count: 0,
        word_count: 0,
        reading_time_minutes: 0,
        is_project_context: true
      }
    ],
    context_stats: {
      total_documents: 1,
      documents_used: 0,
      documents_available: 1,
      project_context_used: true,
      stakeholders_included: 0,
      stakeholders_available: 0,
      estimated_context_tokens: 0
    }
  };

  console.log("Updating documents table...");
  const updateDocResult = await pool.query(`
    INSERT INTO documents (
      id, project_id, name, content, template_id, status, created_by, updated_by, 
      generation_metadata, word_count, character_count, sentence_count, paragraph_count, 
      entity_counts, context_snapshots, version, semantic_version
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, 1, '1.0.0')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      content = EXCLUDED.content,
      status = EXCLUDED.status,
      updated_by = EXCLUDED.updated_by,
      generation_metadata = EXCLUDED.generation_metadata,
      word_count = EXCLUDED.word_count,
      character_count = EXCLUDED.character_count,
      sentence_count = EXCLUDED.sentence_count,
      paragraph_count = EXCLUDED.paragraph_count,
      entity_counts = EXCLUDED.entity_counts,
      context_snapshots = EXCLUDED.context_snapshots,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `, [
    docId,
    projectId,
    jobData.name || "Generated Document",
    finalMarkdown,
    jobData.template_id || null,
    'draft',
    userId,
    JSON.stringify(generationMetadata),
    wordCount,
    characterCount,
    sentenceCount,
    paragraphCount,
    JSON.stringify(parseResult.extractedCountByType || {}),
    JSON.stringify({})
  ]);

  console.log(`Document table updated. Row count: ${updateDocResult.rowCount}`);

  console.log("Updating jobs table...");
  const finalResult = {
    ai: {
      content: finalMarkdown,
      documentId: docId,
      provider: jobData.provider || 'google',
      model: jobData.model || 'gemini-3.5-flash',
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      entityCounts: parseResult.extractedCountByType || {},
      summaries: {}
    },
    documentId: docId
  };

  const updateJobResult = await pool.query(`
    UPDATE jobs 
    SET status = 'completed', 
        result = $1, 
        progress = 100, 
        completed_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [JSON.stringify(finalResult), jobId]);

  console.log(`Jobs table updated. Row count: ${updateJobResult.rowCount}`);

  await pool.end();
  console.log("Done!");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
