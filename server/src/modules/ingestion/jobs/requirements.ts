import { Extractor } from './extractor';
import fs from 'fs/promises';
import path from 'path';

const INPUT_DIR = process.env.REQ_INPUT_DIR || path.join(process.cwd(), 'data', 'ingestion_inputs', 'requirements');
const OUTPUT_DIR = process.env.REQ_OUTPUT_DIR || path.join(process.cwd(), 'data', 'ingested');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'requirements.jsonl');

function ensureDirSync(dir: string): Promise<void> {
  return fs.mkdir(dir, { recursive: true }) as Promise<void>;
}

function isTextFile(filename: string) {
  return ['.md', '.txt'].includes(path.extname(filename).toLowerCase());
}

class RequirementsExtractor implements Extractor {
  async run(): Promise<void> {
    await ensureDirSync(INPUT_DIR);
    await ensureDirSync(OUTPUT_DIR);

    let files: string[] = [];
    try {
      files = await fs.readdir(INPUT_DIR);
    } catch (err) {
      console.warn(`RequirementsExtractor: input dir not found: ${INPUT_DIR}`);
      return;
    }

    let extracted = 0;
    for (const file of files) {
      if (!isTextFile(file)) continue;
      const filePath = path.join(INPUT_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple heuristic to detect requirements
        const reqPattern = /(REQ[-_\s]?\d+)|\brequirement\b|\bmust\b|^[-*]\s.+/i;
        if (reqPattern.test(line)) {
          const idMatch = line.match(/REQ[-_\s]?(\d+)/i);
          const id = idMatch ? `REQ-${idMatch[1]}` : `AUTO-${Date.now()}-${extracted}`;
          const record = {
            id,
            text: line.replace(/^[-*]\s*/, ''),
            sourceFile: file,
            sourcePath: filePath,
            lineNumber: i + 1,
            extractedAt: new Date().toISOString(),
          };
          const json = JSON.stringify(record);
          await fs.appendFile(OUTPUT_FILE, json + '\n', 'utf8');
          extracted += 1;
        }
      }
    }

    console.log(`RequirementsExtractor: finished. Extracted ${extracted} items to ${OUTPUT_FILE}`);
  }
}

export default new RequirementsExtractor();
