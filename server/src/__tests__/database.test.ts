import { pool } from "../database/connection"

describe("Database Tests", () => {
  afterAll(async () => {
    await pool.end()
  })

  test("should connect to test database", async () => {
    const result = await pool.query("SELECT 1 as test")
    expect(result.rows[0].test).toBe(1)
  })

  test("should have users table", async () => {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `)
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].table_name).toBe('users')
  })

  test("should have projects table", async () => {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'projects'
    `)
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].table_name).toBe('projects')
  })

  test("should have documents table", async () => {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'documents'
    `)
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].table_name).toBe('documents')
  })
})
