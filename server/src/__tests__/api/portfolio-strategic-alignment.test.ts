/**
 * SC-85: Next.js portfolio strategic alignment & goals API
 */

jest.mock("@/lib/auth-utils", () => {
  const { NextResponse } = require("next/server")
  return {
    getAuthenticatedUser: jest.fn(),
    unauthorizedResponse: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    forbiddenResponse: (message = "Insufficient permissions") =>
      NextResponse.json({ error: message }, { status: 403 }),
  }
})

import { GET as getAlignment, POST as postAlignment, DELETE as deleteAlignment } from "@/app/api/portfolio/strategic-alignment/route"
import { GET as getGoals, POST as postGoals } from "@/app/api/portfolio/goals/route"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { connectDatabase, pool } from "@/server/src/database/connection"
import dotenv from "dotenv"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const ownerUser = {
  id: "33333333-3333-3333-3333-333333333333",
  email: "sc85-owner@example.com",
  role: "user",
  permissions: {},
}

const adminUser = {
  id: "44444444-4444-4444-4444-444444444444",
  email: "sc85-admin@example.com",
  role: "admin",
  permissions: {},
}

describe("Portfolio strategic alignment API (SC-85)", () => {
  let testProjectId: string
  let goalIdA: string
  let goalIdB: string
  let titleA: string
  let titleB: string

  const mockAuth = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>

  beforeAll(async () => {
    dotenv.config({ path: path.resolve(process.cwd(), ".env") })
    dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
    dotenv.config({ path: path.resolve(process.cwd(), "server/.env") })
    await connectDatabase()

    testProjectId = uuidv4()
    goalIdA = uuidv4()
    goalIdB = uuidv4()
    titleA = `SC85 Goal A ${uuidv4()}`
    titleB = `SC85 Goal B ${uuidv4()}`

    await pool!.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, $2, 'x', 'user', 'SC85 Owner'),
              ($3, $4, 'x', 'admin', 'SC85 Admin')
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email`,
      [ownerUser.id, ownerUser.email, adminUser.id, adminUser.email]
    )

    await pool!.query(
      `INSERT INTO projects (id, name, owner_id, framework, created_by)
       VALUES ($1, 'SC85 Project', $2, 'ADPA', $2)
       ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id`,
      [testProjectId, ownerUser.id]
    )

    await pool!.query(
      `INSERT INTO strategic_goals (id, title, description, category, status, priority)
       VALUES ($1, $2, 'd', 'cat', 'active', 5),
              ($3, $4, 'd', 'cat', 'active', 3)`,
      [goalIdA, titleA, goalIdB, titleB]
    )
  })

  afterAll(async () => {
    try {
      await connectDatabase()
      await pool!.query("DELETE FROM project_strategic_goals WHERE project_id = $1", [testProjectId])
      await pool!.query("DELETE FROM strategic_key_results WHERE goal_id = ANY($1)", [[goalIdA, goalIdB]])
      await pool!.query("DELETE FROM strategic_goals WHERE id = ANY($1)", [[goalIdA, goalIdB]])
      await pool!.query("DELETE FROM projects WHERE id = $1", [testProjectId])
      await pool!.query("DELETE FROM users WHERE id = ANY($1)", [[ownerUser.id, adminUser.id]])
    } catch {
      /* ignore */
    }
  })

  beforeEach(() => {
    mockAuth.mockResolvedValue(ownerUser)
  })

  afterEach(async () => {
    await pool!.query("DELETE FROM project_strategic_goals WHERE project_id = $1", [testProjectId])
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(ownerUser)
  })

  test("GET alignment requires project_id or goal_id", async () => {
    const res = await getAlignment(new Request("http://localhost/api/portfolio/strategic-alignment"))
    expect(res.status).toBe(400)
  })

  test("POST alignment upserts and GET by project_id returns row", async () => {
    const postRes = await postAlignment(
      new Request("http://localhost/api/portfolio/strategic-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: testProjectId,
          goal_id: goalIdA,
          contribution_level: "high",
          alignment_score: 0.75,
          notes: "test note",
        }),
      })
    )
    expect(postRes.status).toBe(201)

    const getRes = await getAlignment(
      new Request(`http://localhost/api/portfolio/strategic-alignment?project_id=${testProjectId}`)
    )
    expect(getRes.status).toBe(200)
    const rows = await getRes.json()
    expect(rows.length).toBe(1)
    expect(rows[0].goal_title).toBe(titleA)
    expect(rows[0].contribution_level).toBe("high")
  })

  test("GET alignment by goal_id lists projects", async () => {
    await postAlignment(
      new Request("http://localhost/api/portfolio/strategic-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: testProjectId,
          goal_id: goalIdB,
          contribution_level: "low",
          alignment_score: 0.2,
        }),
      })
    )

    const getRes = await getAlignment(
      new Request(`http://localhost/api/portfolio/strategic-alignment?goal_id=${goalIdB}`)
    )
    expect(getRes.status).toBe(200)
    const rows = await getRes.json()
    expect(rows.some((r: { project_id: string }) => r.project_id === testProjectId)).toBe(true)
  })

  test("DELETE alignment removes link", async () => {
    await postAlignment(
      new Request("http://localhost/api/portfolio/strategic-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: testProjectId,
          goal_id: goalIdA,
          contribution_level: "medium",
          alignment_score: 0.5,
        }),
      })
    )

    const del = await deleteAlignment(
      new Request(
        `http://localhost/api/portfolio/strategic-alignment?project_id=${testProjectId}&goal_id=${goalIdA}`
      )
    )
    expect(del.status).toBe(200)

    const getRes = await getAlignment(
      new Request(`http://localhost/api/portfolio/strategic-alignment?project_id=${testProjectId}`)
    )
    const rows = await getRes.json()
    expect(rows.length).toBe(0)
  })

  test("POST alignment forbidden for non-member", async () => {
    mockAuth.mockResolvedValue({
      id: "99999999-9999-9999-9999-999999999999",
      email: "stranger@example.com",
      role: "user",
      permissions: {},
    })

    const res = await postAlignment(
      new Request("http://localhost/api/portfolio/strategic-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: testProjectId,
          goal_id: goalIdA,
          contribution_level: "medium",
          alignment_score: 0.5,
        }),
      })
    )
    expect(res.status).toBe(403)
  })

  test("GET goals returns seeded goals for admin context", async () => {
    mockAuth.mockResolvedValue(adminUser)
    const res = await getGoals(new Request("http://localhost/api/portfolio/goals?status=active"))
    expect(res.status).toBe(200)
    const rows = await res.json()
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.some((r: { id: string }) => r.id === goalIdA)).toBe(true)
  })

  test("POST goals creates goal and key results (admin)", async () => {
    mockAuth.mockResolvedValue(adminUser)
    const title = `SC85 new goal ${uuidv4()}`
    const res = await postGoals(
      new Request("http://localhost/api/portfolio/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: "x",
          category: "Growth",
          target_date: "2026-12-31",
          priority: 7,
          key_results: [{ description: "KR1", target_value: 100, unit: "%" }],
        }),
      })
    )
    expect(res.status).toBe(201)
    const row = await res.json()
    const gid = row.id as string
    const kr = await pool!.query("SELECT * FROM strategic_key_results WHERE goal_id = $1", [gid])
    expect(kr.rows.length).toBe(1)
    await pool!.query("DELETE FROM strategic_key_results WHERE goal_id = $1", [gid])
    await pool!.query("DELETE FROM strategic_goals WHERE id = $1", [gid])
  })

  test("POST goals forbidden for non-admin", async () => {
    mockAuth.mockResolvedValue(ownerUser)
    const res = await postGoals(
      new Request("http://localhost/api/portfolio/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "nope" }),
      })
    )
    expect(res.status).toBe(403)
  })
})
