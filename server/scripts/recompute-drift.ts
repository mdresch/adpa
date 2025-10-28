/*
 * Recompute Drift
 * Compares latest project state to last baseline and inserts drift findings/root causes (simplified).
 */
import { pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function main(): Promise<void> {
  const client = await pool.connect()
  try {
    logger.info('Recomputing baseline drift...')

    const projects = await client.query(`SELECT id FROM projects`)
    let inserted = 0
    for (const p of projects.rows) {
      const projectId: string = p.id
      const baseline = await client.query(
        `SELECT * FROM baselines WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [projectId]
      )
      if (baseline.rows.length === 0) continue
      const b = baseline.rows[0]

      // Example: detect schedule variance via milestones
      const ms = await client.query(
        `SELECT COALESCE(AVG(variance_days),0) AS avg_var FROM milestones WHERE project_id = $1`,
        [projectId]
      )
      const avgVar = Number(ms.rows[0]?.avg_var ?? 0)

      if (Math.abs(avgVar) >= 1) {
        await client.query(
          `INSERT INTO baseline_drift_findings (
             project_id, category, severity, status, detected_at, impact_area, variance_value, variance_units, description
           ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)`,
          [
            projectId,
            'schedule',
            avgVar > 5 ? 'high' : avgVar > 2 ? 'medium' : 'low',
            'open',
            'timeline',
            Math.round(avgVar),
            'days',
            'Average milestone variance differs from baseline expectations.'
          ]
        )
        inserted++
      }
    }

    logger.info('Drift recompute completed', { inserted })
  } catch (err: any) {
    logger.error('Drift recompute failed', { error: err.message })
    process.exitCode = 1
  } finally {
    client.release()
  }
}

if (require.main === module) {
  main().then(() => process.exit()).catch(() => process.exit(1))
}


