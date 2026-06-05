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
  return cleaned;
}

async function debugShrinkage() {
  // We still connect to database to get the job log content, but we will run the parser offline
  await connectDatabase();
  const jobId = '48bdda61-c73d-4282-9360-d57798544cf3';
  const r = await pool.query(
    `SELECT data FROM jobs WHERE id = $1`,
    [jobId]
  );
  await pool.end(); // close pool immediately as we don't need it anymore

  if (r.rows.length === 0) {
    console.log("Job not found");
    return;
  }

  const jobData = r.rows[0].data || {};
  const requests = jobData.llm_insights?.requests || [];
  const drafting = requests
    .filter((x: any) => x.phase === 'drafting')
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  let rawMarkdown = "";
  for (const req of drafting) {
    rawMarkdown += (req.response || "").trim() + "\n\n";
  }

  console.log("Raw Markdown Length:", rawMarkdown.length);
  const cleaned = validateAndCleanMarkdown(rawMarkdown);
  console.log("Cleaned Markdown Length:", cleaned.length);

  // Let's run a line-by-line comparison
  const linesBefore = cleaned.split(/\r?\n/);
  console.log("Lines before parser:", linesBefore.length);

  // Directly bypass savers by overriding the imported module
  const orchestrator = require('./src/services/extraction/ExtractionOrchestrator');
  orchestrator.saveSingleEntityType = async () => {};
  
  try {
    const entityService = require('./src/services/entityExtractionService');
    entityService.entityExtractionService.storeEntities = async () => {};
  } catch (e) {}

  const parseResult = await InlineEntityParserService.parseAndProcess({
    projectId: '9ad00240-4dd8-4e83-9333-89515c2422f0',
    userId: '42ca7333-b37e-4e1b-bd50-ac04abd7e682',
    documentId: '4c04f981-d419-4b68-ab69-26d2f50ee393',
    markdown: cleaned
  });

  const linesAfter = parseResult.cleanedMarkdown.split(/\r?\n/);
  console.log("Lines after parser:", linesAfter.length);
  console.log("Parsed Markdown Length:", parseResult.cleanedMarkdown.length);

  // Let's find what was removed
  let diffCount = 0;
  for (let i = 0; i < Math.min(linesBefore.length, linesAfter.length); i++) {
    if (linesBefore[i] !== linesAfter[i]) {
      console.log(`\nFirst mismatch at line ${i + 1}:`);
      console.log(`BEFORE: ${linesBefore[i].substring(0, 150)}`);
      console.log(`AFTER : ${linesAfter[i].substring(0, 150)}`);
      diffCount++;
      break;
    }
  }

  if (diffCount === 0 && linesBefore.length !== linesAfter.length) {
    console.log(`\nLength mismatch. Before: ${linesBefore.length} lines, After: ${linesAfter.length} lines.`);
    console.log(`Extra lines in Before starting at line ${linesAfter.length}:`);
    for (let k = linesAfter.length; k < Math.min(linesAfter.length + 10, linesBefore.length); k++) {
      console.log(`Line ${k + 1}: ${linesBefore[k].substring(0, 100)}`);
    }
  }
}

debugShrinkage().catch(e => {
  console.error(e);
  process.exit(1);
});
