import request from "supertest"
import { app } from "../server"
import { pool } from "../database/connection"

describe("Authentication", () => {
  beforeAll(async () => {
    // Setup test database
    await pool.query("DELETE FROM users WHERE email LIKE '%test%'")
  })

  afterAll(async () => {
    // Cleanup
    await pool.query("DELETE FROM users WHERE email LIKE '%test%'")
    await pool.end()
  })

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const userData = {
        email: "test@example.com",
        password: "Test123!@#",
        name: "Test User",
        role: "user"
      }

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty("message", "User created successfully")
      expect(response.body).toHaveProperty("user")
      expect(response.body).toHaveProperty("token")
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.name).toBe(userData.name)
      expect(response.body.user).not.toHaveProperty("password_hash")
    })

    it("should not register user with existing email", async () => {
      const userData = {
        email: "test@example.com",
        password: "Test123!@#",
        name: "Test User 2",
        role: "user"
      }

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400)

      expect(response.body).toHaveProperty("error", "User already exists")
    })

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty("error", "Validation failed")
    })
  })

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "Test123!@#"
      }

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200)

      expect(response.body).toHaveProperty("message", "Login successful")
      expect(response.body).toHaveProperty("user")
      expect(response.body).toHaveProperty("token")
      expect(response.body.user.email).toBe(loginData.email)
    })

    it("should not login with invalid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongpassword"
      }

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401)

      expect(response.body).toHaveProperty("error", "Invalid credentials")
    })

    it("should not login with non-existent user", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "Test123!@#"
      }

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401)

      expect(response.body).toHaveProperty("error", "Invalid credentials")
    })
  })

  describe("GET /api/auth/me", () => {
    let authToken: string

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "Test123!@#"
        })

      authToken = loginResponse.body.token
    })

    it("should get current user with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("user")
      expect(response.body.user.email).toBe("test@example.com")
    })

    it("should not get user without token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .expect(401)

      expect(response.body).toHaveProperty("error", "Access token required")
    })

    it("should not get user with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(403)

      expect(response.body).toHaveProperty("error", "Invalid token")
    })
  })
})
