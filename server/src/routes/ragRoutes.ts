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

export default router
