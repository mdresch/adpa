import { faker } from "@faker-js/faker"
import { pool } from "../database/connection"

/**
 * Factory for creating test users.
 */
export async function createTestUser(overrides: any = {}) {
  const user = {
    email: overrides.email || faker.internet.email(),
    password_hash: overrides.password_hash || "test-password-hash",
    name: overrides.name || faker.person.fullName(),
    role: overrides.role || "user",
    ...overrides
  }

  const result = await pool.query(
    "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *",
    [user.email, user.password_hash, user.name, user.role]
  )

  return result.rows[0]
}

/**
 * Factory for creating test projects.
 */
export async function createTestProject(overrides: any = {}) {
  const project = {
    name: overrides.name || faker.company.name() + " Project",
    description: overrides.description || faker.lorem.paragraph(),
    framework: overrides.framework || "PMBOKv6",
    status: overrides.status || "active",
    priority: overrides.priority || "medium",
    owner_id: overrides.owner_id,
    ...overrides
  }

  // If owner_id is not provided, create a user first
  if (!project.owner_id) {
    const user = await createTestUser()
    project.owner_id = user.id
  }

  const result = await pool.query(
    "INSERT INTO projects (name, description, framework, status, priority, owner_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *",
    [project.name, project.description, project.framework, project.status, project.priority, project.owner_id]
  )

  return result.rows[0]
}

/**
 * Factory for creating test documents.
 */
export async function createTestDocument(overrides: any = {}) {
  const document = {
    name: overrides.name || faker.system.fileName(),
    project_id: overrides.project_id,
    content: overrides.content || { sections: [] },
    template_id: overrides.template_id,
    status: overrides.status || "draft",
    created_by: overrides.created_by,
    ...overrides
  }

  // If project_id or created_by is not provided, ensure they exist
  if (!document.project_id) {
    const project = await createTestProject()
    document.project_id = project.id
    if (!document.created_by) document.created_by = project.owner_id
  }

  if (!document.created_by) {
    const user = await createTestUser()
    document.created_by = user.id
  }

  const result = await pool.query(
    "INSERT INTO documents (name, project_id, content, template_id, status, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *",
    [document.name, document.project_id, JSON.stringify(document.content), document.template_id, document.status, document.created_by]
  )

  return result.rows[0]
}
