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
  const jobId = '8dcbe6a4-39d2-4f31-a613-0c50b77531d8';
  const jobResult = await pool.query(`
    SELECT data->'llm_insights'->'requests' as requests
    FROM jobs 
    WHERE id = $1
  `, [jobId]);

  if (jobResult.rows.length === 0) {
    console.log("Job not found");
    await pool.end();
    return;
  }

  const requests = jobResult.rows[0].requests || [];
  const draftingRequests = requests.filter((r: any) => r.phase === 'drafting').sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  
  console.log(`Found ${draftingRequests.length} drafting sections.`);

  let rawMarkdown = "";
  for (const req of draftingRequests) {
    console.log(`Adding ${req.label} (len: ${req.response?.length || 0})`);
    rawMarkdown += (req.response || "").trim() + "\n\n";
  }

  console.log("Concatenated raw length:", rawMarkdown.length);

  const cleanedMarkdown = validateAndCleanMarkdown(rawMarkdown);
  console.log("After validateAndCleanMarkdown length:", cleanedMarkdown.length);

  console.log("--- PARSING AND PROCESSING ---");
  const parseResult = await InlineEntityParserService.parseAndProcess({
    projectId: '9ad00240-4dd8-4e83-9333-89515c2422f0',
    userId: '42ca7333-b37e-4e1b-bd50-ac04abd7e682',
    documentId: '7a437bae-9c5d-4f75-bc55-aa12ceba29ca',
    markdown: cleanedMarkdown
  });

  console.log("Final cleanedMarkdown length:", parseResult.cleanedMarkdown.length);
  console.log("Final cleanedMarkdown preview (first 1000 chars):\n", parseResult.cleanedMarkdown.substring(0, 1000));
  console.log("Final cleanedMarkdown end preview (last 500 chars):\n", parseResult.cleanedMarkdown.substring(parseResult.cleanedMarkdown.length - 500));

  await pool.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
