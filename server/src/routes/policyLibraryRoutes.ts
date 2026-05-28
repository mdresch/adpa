import { Router, Request, Response } from 'express'
import { pool } from '../database/connection'
import { logger } from '../utils/logger'

const router = Router()

// GET /api/v1/policy-library/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'CANDIDATE' THEN 1 END) as candidate_count,
        COUNT(CASE WHEN status = 'DEPRECATED' THEN 1 END) as deprecated_count
      FROM policy_library
    `)
    
    // Parse numeric counts from string (pg returns COUNT as string)
    const stats = {
      total: parseInt(result.rows[0].total) || 0,
      active: parseInt(result.rows[0].active_count) || 0,
      candidate: parseInt(result.rows[0].candidate_count) || 0,
      deprecated: parseInt(result.rows[0].deprecated_count) || 0
    }
    
    res.json(stats)
  } catch (error) {
    logger.error('Failed to fetch policy library stats', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/v1/policy-library
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.rule_code,
        r.title,
        r.description,
        r.status,
        r.target_document_types,
        r.control_effectiveness_score,
        r.control_effectiveness_status,
        r.last_effectiveness_update,
        r.telemetry_metrics,
        COALESCE(h.history, '[]'::json) as effectiveness_history
      FROM policy_library r
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'timestamp', hist.recorded_at,
          'score', hist.new_score
        )) as history
        FROM (
          SELECT recorded_at, new_score
          FROM rule_control_effectiveness
          WHERE rule_code = r.rule_code
          ORDER BY recorded_at DESC
          LIMIT 30
        ) hist
      ) h ON true
      ORDER BY 
        CASE r.status 
          WHEN 'CANDIDATE' THEN 1 
          WHEN 'ACTIVE' THEN 2 
          WHEN 'DEPRECATED' THEN 3 
          ELSE 4 
        END,
        r.last_effectiveness_update DESC NULLS LAST,
        r.id DESC
    `
    const result = await pool.query(query)

    // Dynamic Framework Translation Layer
    const enrichedRules = result.rows.map(row => {
      // Safely parse out raw JSONB values to ensure the frontend doesn't crash on nulls
      const totalInvocations = Number(row.telemetry_metrics?.totalRuns || 0);
      const userOverrideCount = Number(row.telemetry_metrics?.userOverrideCount || 0);
      const successfulPatches = Number(row.telemetry_metrics?.successfulPatches || 0);
      const averageComplianceScore = Number(row.telemetry_metrics?.averageComplianceScore || 1.0);
      const document_type = Array.isArray(row.target_document_types) && row.target_document_types.length > 0 
        ? row.target_document_types.join(', ') 
        : 'All Documents';

      // Reverse history so Recharts plots oldest (left) to newest (right)
      const effectiveness_history = Array.isArray(row.effectiveness_history) 
        ? row.effectiveness_history.reverse() 
        : [];

      return {
        id: row.id,
        rule_code: row.rule_code,
        title: row.title,
        description: row.description,
        status: row.status,
        document_type: document_type,
        control_effectiveness_score: row.control_effectiveness_score !== null ? Number(row.control_effectiveness_score) : null,
        control_effectiveness_status: row.control_effectiveness_status,
        last_effectiveness_update: row.last_effectiveness_update,
        telemetry: {
          totalInvocations,
          userOverrideCount,
          successfulPatches,
          averageComplianceScore
        },
        effectiveness_history,
        // Injected Multi-Framework Mappings based on Rule Categories
        governanceMappings: [
          {
            framework: "COBIT 2019",
            section: row.rule_code.includes("SEC") ? "DSS05.02" : "MEA01.03",
            label: row.rule_code.includes("SEC") 
              ? `Managed Security Services: Connectivity Security (${row.title})`
              : `Managed Performance & Conformance: Quality Isolation (${row.title})`,
            auditImpact: `Autonomously forces runtime compilation constraints onto '${document_type}' generation loops, neutralizing policy drift before file serialization.`
          }
        ]
      };
    });

    res.status(200).json(enrichedRules);
  } catch (error) {
    logger.error("❌ Failed to pull enriched policy library data:", error);
    res.status(500).json({ error: "Internal Server Error processing compliance logs." });
  }
})

// PUT /api/v1/policy-library/:id/status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!['ACTIVE', 'CANDIDATE', 'DEPRECATED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const result = await pool.query(`
      UPDATE policy_library 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' })
    }

    logger.info(`Updated policy ${id} status to ${status}`)
    res.json(result.rows[0])
  } catch (error) {
    logger.error(`Failed to update policy status: ${error}`)
    res.status(500).json({ error: 'Failed to update policy status' })
  }
})

export default router
