import { pool } from "../database/connection"

describe("Database Sandbox", () => {
  it("should rollback changes after each test (part 1)", async () => {
    // 1. Check if a uniquely named user exists (it shouldn't)
    const testEmail = "sandbox_test@example.com"
    const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [testEmail])
    expect(checkUser.rows.length).toBe(0)
    
    // 2. Create the user
    await pool.query("INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)", 
      [testEmail, "sandbox_hash", "Sandbox User"])
    
    // 3. Verify user exists in THIS test
    const checkUserAgain = await pool.query("SELECT * FROM users WHERE email = $1", [testEmail])
    expect(checkUserAgain.rows.length).toBe(1)
  })

  it("should not see changes from previous test (part 2)", async () => {
    // 1. Check if the user from the previous test exists (it shouldn't due to rollback)
    const testEmail = "sandbox_test@example.com"
    const checkUser = await pool.query("SELECT * FROM users WHERE email = $1", [testEmail])
    expect(checkUser.rows.length).toBe(0)
  })
})
