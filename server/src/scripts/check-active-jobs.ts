import dotenv from "dotenv"
import path from "path"

// Load env variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

import { Pool } from "pg"

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log("=== Querying Active / Recent Jobs ===")
    
    // Query currently active jobs
    const activeResult = await pool.query(`
      SELECT id, type, status, progress, message, created_at, updated_at, error, payload
      FROM jobs
      WHERE status IN ('pending', 'processing', 'active', 'running')
      ORDER BY updated_at DESC
      LIMIT 10
    `)
    
    console.log(`\nFound ${activeResult.rows.length} active/running jobs:`)
    activeResult.rows.forEach((job, i) => {
      console.log(`\n[Job #${i+1}] ID: ${job.id}`)
      console.log(`  Type: ${job.type}`)
      console.log(`  Status: ${job.status}`)
      console.log(`  Progress: ${job.progress}%`)
      console.log(`  Message: ${job.message}`)
      console.log(`  Created At: ${job.created_at}`)
      console.log(`  Updated At: ${job.updated_at}`)
      if (job.error) console.log(`  Error: ${job.error}`)
      
      // Print interesting keys of payload
      if (job.payload) {
        const payloadObj = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload
        console.log(`  Payload Keys:`, Object.keys(payloadObj))
        if (payloadObj.name) console.log(`  Document Name:`, payloadObj.name)
        if (payloadObj.template_name) console.log(`  Template Name:`, payloadObj.template_name)
      }
    })

    // Query recently completed/failed jobs
    const recentResult = await pool.query(`
      SELECT id, type, status, progress, message, updated_at, error
      FROM jobs
      WHERE status NOT IN ('pending', 'processing', 'active', 'running')
      ORDER BY updated_at DESC
      LIMIT 5
    `)

    console.log(`\nRecently finished/failed jobs:`)
    recentResult.rows.forEach((job, i) => {
      console.log(`  - ID: ${job.id} | Type: ${job.type} | Status: ${job.status} | Progress: ${job.progress}% | Message: ${job.message} | Updated: ${job.updated_at}`)
      if (job.error) console.log(`    Error: ${job.error}`)
    })

  } catch (err: any) {
    console.error("Query failed:", err.message)
  } finally {
    await pool.end()
  }
}

run()
