#!/usr/bin/env node

/**
 * KnowledgeBase Embeddings Generator
 * Simple script to generate embeddings for knowledge base entries
 */

import 'dotenv/config.js'
import { Pool } from 'pg'
import https from 'https'
import chalk from 'chalk'

// Configure database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
})

// Voyage AI API configuration
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_MODEL = process.env.VOYAGE_EMBEDDING_MODEL || 'voyage-4-large'
const BATCH_SIZE = 10

if (!VOYAGE_API_KEY) {
  console.error('❌ VOYAGE_API_KEY not configured in .env')
  process.exit(1)
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [KB-EMBEDDINGS]`
  
  switch (type) {
    case 'success':
      console.log(`${chalk.green(prefix)} ${chalk.green('✓')} ${message}`)
      break
    case 'error':
      console.log(`${chalk.red(prefix)} ${chalk.red('✗')} ${message}`)
      break
    case 'warn':
      console.log(`${chalk.yellow(prefix)} ${chalk.yellow('⚠')} ${message}`)
      break
    case 'info':
    default:
      console.log(`${chalk.blue(prefix)} ${chalk.cyan('ℹ')} ${message}`)
      break
  }
}

async function callVoyageAPI(texts) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL
    })

    const options = {
      hostname: 'api.voyageai.com',
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${VOYAGE_API_KEY}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data)
            resolve(result.data)
          } catch (err) {
            reject(new Error(`Failed to parse Voyage API response: ${err.message}`))
          }
        } else {
          reject(new Error(`Voyage API error: ${res.statusCode} - ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function generateEmbeddings() {
  let client
  
  try {
    log('Starting knowledge base embeddings generation...')
    log(`Using model: ${VOYAGE_MODEL}`)
    
    // Connect to database
    log('Connecting to database...')
    client = await pool.connect()
    log('Database connection established', 'success')

    // Get KB entries without embeddings
    log('Fetching knowledge base entries...')
    const result = await client.query(`
      SELECT id, title, description
      FROM knowledge_base_entries
      WHERE embedding IS NULL
      ORDER BY created_at ASC
    `)

    const entries = result.rows
    log(`Found ${entries.length} entries without embeddings`, 'info')

    if (entries.length === 0) {
      log('All knowledge base entries already have embeddings', 'warn')
      return true
    }

    // Process in batches
    let processedCount = 0
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE)
      log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)}...`)

      // Prepare text for embedding
      const texts = batch.map(entry => {
        // Combine title and description for embedding
        const parts = [entry.title, entry.description].filter(Boolean)
        return parts.join(' ')
      })

      try {
        // Call Voyage API
        const embeddings = await callVoyageAPI(texts)

        // Store embeddings in database
        for (let j = 0; j < batch.length; j++) {
          const entry = batch[j]
          const embedding = embeddings[j].embedding
          
          // Store as vector string for pgvector
          const vectorStr = `[${embedding.join(',')}]`
          
          await client.query(`
            UPDATE knowledge_base_entries 
            SET embedding = $1::vector,
                embedding_model = $2,
                embedding_generated_at = NOW()
            WHERE id = $3
          `, [vectorStr, VOYAGE_MODEL, entry.id])
          
          processedCount++
        }

        log(`✓ Batch completed (${processedCount}/${entries.length})`, 'success')
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        log(`Failed to process batch: ${err.message}`, 'error')
        throw err
      }
    }

    // Verify results
    log('Verifying embeddings...')
    const verification = await client.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings
      FROM knowledge_base_entries
    `)

    const { total, with_embeddings } = verification.rows[0]
    log(`Knowledge Base Status: ${with_embeddings}/${total} entries have embeddings`, 'success')

    console.log('')
    log('═══════════════════════════════════════════════════════════════════')
    log('Embeddings generation completed successfully!', 'success')
    log('═══════════════════════════════════════════════════════════════════')
    console.log('')
    log(`Generated ${processedCount} embeddings using ${VOYAGE_MODEL}`)
    log('Ready for semantic search queries!')

    return true

  } catch (error) {
    log(`Embedding generation failed: ${error.message}`, 'error')
    if (error.statusCode) {
      log(`API Status: ${error.statusCode}`, 'error')
    }
    throw error
    
  } finally {
    if (client) {
      await client.release()
    }
    await pool.end()
  }
}

// Run generation
generateEmbeddings()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('')
    console.error(chalk.red('EMBEDDING GENERATION FAILED'))
    console.error(error)
    process.exit(1)
  })
