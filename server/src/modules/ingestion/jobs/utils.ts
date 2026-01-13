import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJsonl(filePath: string, obj: unknown): Promise<void> {
  const line = JSON.stringify(obj) + '\n';
  await fs.appendFile(filePath, line, 'utf8');
}

export function defaultInputDir(entity: string): string {
  return path.join(process.cwd(), 'data', 'ingestion_inputs', entity);
}

export function defaultOutputDir(): string {
  return path.join(process.cwd(), 'data', 'ingested');
}
