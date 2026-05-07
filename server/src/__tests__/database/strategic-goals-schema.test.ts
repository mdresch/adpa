/**
 * Test: Strategic Goals schema (SC-84)
 *
 * Validates that strategic goal storage + linkage + OKR key results are present,
 * plus analytics views.
 */

import { pool } from "../../database/connection"

describe("Strategic Goals Database Schema (SC-84)", () => {
  test("should have strategic_goals table", async () => {
    const result = await pool!.query(`
      SELECT to_regclass('public.strategic_goals') IS NOT NULL as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("should have project_strategic_goals table", async () => {
    const result = await pool!.query(`
      SELECT to_regclass('public.project_strategic_goals') IS NOT NULL as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("should have strategic_key_results table", async () => {
    const result = await pool!.query(`
      SELECT to_regclass('public.strategic_key_results') IS NOT NULL as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("should have project_strategic_alignment view", async () => {
    const result = await pool!.query(`
      SELECT to_regclass('public.project_strategic_alignment') IS NOT NULL as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })

  test("should have strategic_goals_progress view", async () => {
    const result = await pool!.query(`
      SELECT to_regclass('public.strategic_goals_progress') IS NOT NULL as exists
    `)
    expect(result.rows[0].exists).toBe(true)
  })
})

