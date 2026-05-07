/**
 * Test: Portfolio Prioritization Database Schema (SC-78)
 *
 * Verifies foundational schema objects exist:
 * - portfolio_criteria
 * - portfolio_scores
 * - portfolio_rankings (materialized view)
 * - refresh_portfolio_rankings() function
 */

import { pool } from "../../database/connection"

describe("Portfolio Prioritization Database Schema (SC-78)", () => {
  test("should have portfolio_criteria table", async () => {
    const result = await pool!.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'portfolio_criteria'
      ) as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("should have portfolio_scores table", async () => {
    const result = await pool!.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'portfolio_scores'
      ) as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("should have portfolio_rankings materialized view", async () => {
    const result = await pool!.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE schemaname = 'public'
          AND matviewname = 'portfolio_rankings'
      ) as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("should have refresh_portfolio_rankings() function", async () => {
    const result = await pool!.query(`
      SELECT to_regprocedure('public.refresh_portfolio_rankings()') IS NOT NULL as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("refresh_portfolio_rankings() should execute successfully", async () => {
    await expect(pool!.query(`SELECT public.refresh_portfolio_rankings();`)).resolves.toBeTruthy()
  })
})

