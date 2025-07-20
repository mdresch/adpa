import dotenv from "dotenv"

// Load test environment variables
dotenv.config({ path: ".env.test" })

// Set test environment
process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "test-jwt-secret"
process.env.DB_NAME = "adpa_test_db"

// Increase timeout for database operations
jest.setTimeout(30000)
