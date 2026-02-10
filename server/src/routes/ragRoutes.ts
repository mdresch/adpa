import express from 'express'
import { ragService } from '../services/ragService'
import { logger } from '../utils/logger'

const router = express.Router()

// POST /api/rag/ingest
router.post('/ingest', async (req, res) => {
    try {
        const { document_id } = req.body
        if (!document_id) {
            return res.status(400).json({ error: 'document_id is required' })
        }

        const result = await ragService.ingestDocument(document_id)
        res.json(result)
    } catch (error: any) {
        logger.error(`Error in /api/rag/ingest: ${error.message}`)
        res.status(500).json({ error: error.message })
    }
})

// POST /api/rag/query
router.post('/query', async (req, res) => {
    try {
        const { query, topK, filter } = req.body
        if (!query) {
            return res.status(400).json({ error: 'query is required' })
        }

        const results = await ragService.query(query, topK || 5, filter || {})
        res.json({ results })
    } catch (error: any) {
        logger.error(`Error in /api/rag/query: ${error.message}`)
        res.status(500).json({ error: error.message })
    }
})

// POST /api/rag/sync-all
router.post('/sync-all', async (req, res) => {
    try {
        const { pool } = require('../database/connection')

        // Get all documents
        const result = await pool.query('SELECT id, name FROM documents ORDER BY created_at DESC')
        const documents = result.rows

        logger.info(`Starting bulk RAG sync for ${documents.length} documents`)
        console.log(`\n🚀 Starting RAG sync for ${documents.length} documents...\n`)

        const results = {
            total: documents.length,
            succeeded: 0,
            failed: 0,
            errors: [] as any[]
        }

        // Process each document with rate limiting
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i]
            try {
                await ragService.ingestDocument(doc.id)
                results.succeeded++
                logger.info(`✅ Synced document ${i + 1}/${documents.length}: ${doc.name} (${doc.id})`)
                console.log(`✅ [${i + 1}/${documents.length}] Synced: ${doc.name}`)
            } catch (error: any) {
                results.failed++
                results.errors.push({
                    document_id: doc.id,
                    document_name: doc.name,
                    error: error.message
                })
                logger.error(`❌ Failed to sync document ${doc.name}: ${error.message}`)
                console.error(`❌ [${i + 1}/${documents.length}] Failed: ${doc.name} - ${error.message}`)
            }

            // Rate limiting: Wait 1 second between documents to avoid overwhelming the API
            // With payment method, limits are much higher (300 RPM standard tier)
            if (i < documents.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        logger.info(`Bulk RAG sync complete: ${results.succeeded} succeeded, ${results.failed} failed`)
        console.log(`\n✅ RAG sync complete: ${results.succeeded} succeeded, ${results.failed} failed\n`)
        res.json(results)
    } catch (error: any) {
        logger.error(`Error in /api/rag/sync-all: ${error.message}`)
        res.status(500).json({ error: error.message })
    }
})

// POST /api/rag/extract-entities/batch
router.post('/extract-entities/batch', async (req, res) => {
    try {
        const { pool } = require('../database/connection')

        // Get all documents that need extraction
        const result = await pool.query('SELECT id, title FROM documents ORDER BY created_at DESC')
        const documents = result.rows

        logger.info(`Starting batch entity extraction for ${documents.length} documents`)

        // Return immediately to not block the UI
        res.json({
            message: `Started batch extraction for ${documents.length} documents`,
            total: documents.length
        })

            // Process in background
            ; (async () => {
                const results = {
                    total: documents.length,
                    triggered: 0,
                    failed: 0,
                    errors: [] as any[]
                }

                const BATCH_DELAY = 2000; // 2 seconds between calls to avoid rate limits

                // Get Edge Function URL and Key from env or DB settings would be better, 
                // but for now we'll use the public URL knowing the trigger handles auth securely usually,
                // or we can use the anon public key if RLS allows.
                // Actually, the best way is to trigger the function via HTTP request essentially mocking what the DB trigger does,
                // OR simpler: just update a timestamp in the row to fire the trigger?
                // "UPDATE documents SET updated_at = NOW() WHERE id = ..." -> This might fire update triggers? 
                // Our start trigger was ON INSERT.

                // Let's call the Edge Function directly using fetch
                const EDGE_FUNCTION_URL = 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor';
                const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

                if (!SERVICE_KEY) {
                    logger.error('Missing SUPABASE_SERVICE_ROLE_KEY for batch extraction');
                    return;
                }

                for (let i = 0; i < documents.length; i++) {
                    const doc = documents[i]
                    try {
                        await fetch(EDGE_FUNCTION_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${SERVICE_KEY}`
                            },
                            body: JSON.stringify({ document_id: doc.id })
                        });

                        results.triggered++
                        logger.info(`Triggered extraction for doc ${i + 1}/${documents.length}: ${doc.title}`)
                    } catch (error: any) {
                        results.failed++
                        results.errors.push({ id: doc.id, title: doc.title, error: error.message })
                        logger.error(`Failed to trigger extraction for ${doc.title}: ${error.message}`)
                    }

                    if (i < documents.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
                    }
                }

                logger.info(`Batch extraction complete: ${results.triggered} triggered`)
            })()

    } catch (error: any) {
        logger.error(`Error in /api/rag/extract-entities/batch: ${error.message}`)
        if (!res.headersSent) {
            res.status(500).json({ error: error.message })
        }
    }
})

export default router
