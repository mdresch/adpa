import { Request, Response, Router } from "express"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { AIProviderTestSuite } from "../modules/ai/AIProviderTestSuite"
import { randomUUID } from "crypto"

const router = Router()
const testSuite = new AIProviderTestSuite()

// 1. Run full test suite on all providers
router.post("/run-full-suite", async (req: Request, res: Response) => {
    try {
        logger.info("[TestingSuite] Running full test suite on all active providers")
        const results = await testSuite.runFullTestSuite()
        res.json({ success: true, results })
    } catch (error) {
        logger.error("[TestingSuite] Error running full test suite", error)
        res.status(500).json({ error: "Failed to run full test suite" })
    }
})

// 2. Get health dashboard data
router.get("/health-dashboard", async (req: Request, res: Response) => {
    try {
        logger.info("[TestingSuite] Fetching health dashboard statistics")

        // Get latest metrics for all active providers
        const { rows } = await pool.query(`
      SELECT m.*
      FROM ai_provider_health_metrics m
      INNER JOIN (
        SELECT provider_id, MAX(last_tested) as m_tested
        FROM ai_provider_health_metrics
        GROUP BY provider_id
      ) latest ON m.provider_id = latest.provider_id AND m.last_tested = latest.m_tested
    `)

        res.json(rows)
    } catch (error) {
        logger.error("[TestingSuite] Error fetching health dashboard", error)
        res.status(500).json({ error: "Failed to load health metrics" })
    }
})

// 3. Test a specific provider
router.post("/test/:providerId", async (req: Request, res: Response) => {
    try {
        const { providerId } = req.params
        logger.info(`[TestingSuite] Running individual test on provider ${providerId}`)

        const providerResult = await pool.query("SELECT * FROM ai_providers WHERE id = $1", [providerId])
        if (providerResult.rows.length === 0) {
            return res.status(404).json({ error: "Provider not found" })
        }

        const provider = providerResult.rows[0]
        const metrics = await testSuite.testProvider(provider)
        res.json({ success: true, metrics })
    } catch (error) {
        logger.error(`[TestingSuite] Error testing provider ${req.params.providerId}`, error)
        res.status(500).json({ error: "Test failed" })
    }
})

// 4. Get test history for a provider
router.get("/test-history/:providerId", async (req: Request, res: Response) => {
    try {
        const { providerId } = req.params
        const limit = parseInt((req.query.limit as string) || "50", 10)
        const testType = req.query.testType as string | undefined

        let query = "SELECT * FROM ai_provider_test_results WHERE provider_id = $1"
        const values: any[] = [providerId]

        if (testType) {
            query += " AND test_type = $2"
            values.push(testType)
        }

        query += ` ORDER BY timestamp DESC LIMIT $${values.length + 1}`
        values.push(limit)

        const { rows } = await pool.query(query, values)
        res.json(rows)
    } catch (error) {
        logger.error(`[TestingSuite] Error fetching test history for ${req.params.providerId}`, error)
        res.status(500).json({ error: "Failed to fetch history" })
    }
})

// 5. Get aggregated statistics
router.get("/statistics/:providerId", async (req: Request, res: Response) => {
    try {
        const { providerId } = req.params
        const daysBack = parseInt((req.query.daysBack as string) || "7", 10)

        // Fallback if the SQL function drops or is missing - calculate aggregations explicitly
        const { rows } = await pool.query(`
      SELECT 
        test_type,
        COUNT(*) as total_tests,
        AVG(score) as avg_score,
        AVG(response_time) as avg_latency,
        SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as pass_rate
      FROM ai_provider_test_results
      WHERE provider_id = $1 AND timestamp >= NOW() - INTERVAL '1 day' * $2
      GROUP BY test_type
    `, [providerId, daysBack])

        res.json(rows)
    } catch (error) {
        logger.error(`[TestingSuite] Error fetching stats for ${req.params.providerId}`, error)
        res.status(500).json({ error: "Failed to query statistics" })
    }
})

// 6. Configure test settings
router.post("/configure/:providerId", async (req: Request, res: Response) => {
    try {
        const { providerId } = req.params
        const { testTypes, timeoutMs, retryAttempts, batchSize, testPrompts } = req.body

        // Upsert configuration
        await pool.query(`
      INSERT INTO ai_provider_test_configs 
        (provider_id, test_types, timeout_ms, retry_attempts, batch_size, test_prompts)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (provider_id) DO UPDATE SET
        test_types = $2,
        timeout_ms = $3,
        retry_attempts = $4,
        batch_size = $5,
        test_prompts = $6
    `, [
            providerId,
            JSON.stringify(testTypes || ["connectivity", "response_time", "content_quality"]),
            timeoutMs || 30000,
            retryAttempts || 3,
            batchSize || 5,
            JSON.stringify(testPrompts || {})
        ])

        res.json({ success: true })
    } catch (error) {
        logger.error(`[TestingSuite] Error configuring ${req.params.providerId}`, error)
        res.status(500).json({ error: "Failed to save configuration" })
    }
})

// 7. Get configuration
router.get("/config/:providerId", async (req: Request, res: Response) => {
    try {
        const { providerId } = req.params
        const { rows } = await pool.query("SELECT * FROM ai_provider_test_configs WHERE provider_id = $1", [providerId])

        // Provide defaults if not expressly configured
        if (rows.length === 0) {
            return res.json({
                provider_id: providerId,
                test_types: ["connectivity", "response_time"],
                timeout_ms: 30000,
                retry_attempts: 3,
                batch_size: 5,
                test_prompts: {
                    simple: "Hello, how are you?",
                    technical: "Analyze the time complexity of binary search."
                }
            })
        }

        res.json(rows[0])
    } catch (error) {
        logger.error(`[TestingSuite] Error reading config for ${req.params.providerId}`, error)
        res.status(500).json({ error: "Failed to read configuration" })
    }
})

export default router
