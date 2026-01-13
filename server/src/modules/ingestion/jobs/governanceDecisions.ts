import { Extractor } from './extractor'
import { ensureDir, writeJsonl, defaultInputDir, defaultOutputDir } from './utils'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { connectDatabase, getDatabasePool } from '../../../database/connection'
import { saveGovernanceDecisions } from '../../../services/extraction/entities/governance_decisions/saveGovernanceDecisions'
import type { GovernanceDecision } from '../../../services/extraction/entities/governance_decisions/types'

const ENTITY = 'governance'
const INPUT_DIR = process.env.GOV_DEC_INPUT_DIR || defaultInputDir(ENTITY)
const OUTPUT_DIR = process.env.GOV_DEC_OUTPUT_DIR || defaultOutputDir()
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'governance_decisions.jsonl')

function isTextFile(filename: string) {
  return ['.md', '.txt'].includes(path.extname(filename).toLowerCase())
}

class GovernanceDecisionsExtractor implements Extractor {
  async run(): Promise<void> {
    await ensureDir(INPUT_DIR)
    await ensureDir(OUTPUT_DIR)

    let files: string[] = []
    try {
      files = await fs.readdir(INPUT_DIR)
    } catch (err) {
      console.warn(`GovernanceDecisions: input dir not found: ${INPUT_DIR}`)
      return
    }

    // Load optional manifest mapping filenames -> { document_id, project_id }
    let manifest: Record<string, { document_id?: string; project_id?: string }> | null = null
    const manifestPaths = [
      path.join(INPUT_DIR, 'manifest.json'),
      path.join(process.cwd(), 'data', 'ingestion_inputs', 'manifest.json')
    ]

    for (const mp of manifestPaths) {
      try {
        const mcontent = await fs.readFile(mp, 'utf8')
        manifest = JSON.parse(mcontent)
        break
      } catch (e) {
        // ignore missing manifest
      }
    }

    const defaultProject = process.env.INGEST_DEFAULT_PROJECT_ID || null

    const groups: Map<string, GovernanceDecision[]> = new Map()
    let extracted = 0
    for (const file of files) {
      if (!isTextFile(file)) continue
      const filePath = path.join(INPUT_DIR, file)
      const content = await fs.readFile(filePath, 'utf8')
      const lines = content.split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Heuristic: lines starting with "Decision:" or containing "decide"/"decided" or numbered decisions
        const pattern = /(^Decision:)|\bdecid(e|ed|es)\b|^\d+\.|^-\s+Decision/i
        if (pattern.test(line)) {
          const id = uuidv4()
          const title = line.replace(/^(Decision:\s*)/i, '').trim()
          const record = {
            id,
            project_id: defaultProject, // may be null; DB table requires NOT NULL — caller should set env
            name: title || `Decision ${id}`,
            description: line,
            source: file,
            extraction_metadata: {
              sourcePath: filePath,
              lineNumber: i + 1,
              extractedAt: new Date().toISOString(),
            },
          }

          // Attach source_document_id/project_id from manifest when available
          const fileKey = file
          if (manifest && manifest[fileKey]) {
            record.source_document_id = manifest[fileKey].document_id || record.source_document_id
            record.project_id = manifest[fileKey].project_id || record.project_id
          }

          // Always write JSONL backup containing project_id and source_document_id (if available)
          await writeJsonl(OUTPUT_FILE, record)

          // Collect for DB persistence if project_id available
          if (record.project_id) {
            const proj = record.project_id
            if (!groups.has(proj)) groups.set(proj, [])
            const arr = groups.get(proj) as GovernanceDecision[]
            arr.push({
              decision_id: record.id,
              description: record.description,
              outcome: null,
              decision_makers: [],
              decision_date: null,
              implementation_status: null,
              source_document_id: record.source_document_id || null,
            })
          }

          extracted += 1
        }
      }
    }

    console.log(`GovernanceDecisions: finished. Extracted ${extracted} items (jsonl backup: ${OUTPUT_FILE})`)

    // Attempt to persist grouped entities to DB using canonical save function
    if (groups.size > 0) {
      try {
        await connectDatabase()
        const pool = getDatabasePool()

        for (const [projectId, entities] of groups.entries()) {
          let client: any = null
          try {
            client = await pool.connect()

            // Find a document id to derive created_by
            const docId = entities.find(e => e.source_document_id)?.source_document_id || null
            let userId = process.env.INGEST_CREATED_BY || null

            if (docId) {
              try {
                const res = await client.query('SELECT created_by, updated_by FROM documents WHERE id = $1', [docId])
                if (res && res.rows && res.rows[0]) {
                  // Prefer updated_by if present (file was updated), otherwise fall back to created_by
                  userId = res.rows[0].updated_by || res.rows[0].created_by || userId
                }
              } catch (qerr) {
                console.warn('GovernanceDecisions: failed to query document created_by/updated_by', qerr?.message || qerr)
              }
            }

            if (!userId) {
              console.warn(`GovernanceDecisions: no created_by available for project ${projectId}, skipping DB save`) 
              continue
            }

            const result = await saveGovernanceDecisions(client, projectId, userId, entities)
            console.log(`GovernanceDecisions: persisted ${result.saved} items for project ${projectId}`)
          } catch (err) {
            console.warn('GovernanceDecisions: DB persistence failed for project', projectId, err?.message || err)
          } finally {
            try { client?.release() } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('GovernanceDecisions: DB connection failed, skipped persistence', err?.message || err)
      }
    }
  }
}

export default new GovernanceDecisionsExtractor()
