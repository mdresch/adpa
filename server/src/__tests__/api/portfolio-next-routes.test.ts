/**
 * SC-79: Integration tests for Next.js App Router portfolio API
 * (/api/portfolio/criteria, scores, scores/bulk, rankings)
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

import { GET as getCriteria, POST as postCriteria } from "@/app/api/portfolio/criteria/route"
import { GET as getScores, POST as postScore } from "@/app/api/portfolio/scores/route"
import { POST as postBulkScores } from "@/app/api/portfolio/scores/bulk/route"
import { GET as getRankings } from "@/app/api/portfolio/rankings/route"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { connectDatabase, pool } from "@/server/src/database/connection"
import dotenv from "dotenv"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const adminUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "sc79-portfolio-admin@example.com",
  role: "admin",
  permissions: {},
}

const plainUser = {
  id: "22222222-2222-2222-2222-222222222222",
  email: "sc79-portfolio-user@example.com",
  role: "user",
  permissions: {},
}

describe("Portfolio Next API (SC-79)", () => {
  let testProjectId: string
  let testCriterionId: string
  const criterionName = `SC79 criterion ${uuidv4()}`

  const mockAuth = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>

  beforeAll(async () => {
    dotenv.config({ path: path.resolve(process.cwd(), ".env") })
    dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
    dotenv.config({ path: path.resolve(process.cwd(), "server/.env") })
    await connectDatabase()
    testProjectId = uuidv4()

    await pool!.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, $2, 'x', 'admin', 'SC79 Admin'),
              ($3, $4, 'x', 'user', 'SC79 User')
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email`,
      [adminUser.id, adminUser.email, plainUser.id, plainUser.email]
    )

    await pool!.query(
      `INSERT INTO projects (id, name, owner_id, framework, created_by)
       VALUES ($1, 'SC79 Portfolio Project', $2, 'ADPA', $2)
       ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id, framework = EXCLUDED.framework`,
      [testProjectId, adminUser.id]
    )

    const cr = await pool!.query(
      `INSERT INTO public.portfolio_criteria (name, description, weight, min_score, max_score)
       VALUES ($1, 'test', 1.0, 1, 5)
       RETURNING id`,
      [criterionName]
    )
    testCriterionId = cr.rows[0].id
  })

  afterAll(async () => {
    try {
      await connectDatabase()
      await pool!.query("DELETE FROM public.portfolio_scores WHERE project_id = $1", [testProjectId])
      await pool!.query("DELETE FROM public.portfolio_criteria WHERE id = $1", [testCriterionId])
      await pool!.query("DELETE FROM projects WHERE id = $1", [testProjectId])
      await pool!.query("DELETE FROM users WHERE id = ANY($1)", [[adminUser.id, plainUser.id]])
    } catch {
      /* DB unavailable — skip cleanup */
    }
  })

  beforeEach(() => {
    mockAuth.mockResolvedValue(adminUser)
  })

  afterEach(async () => {
    await pool!.query("DELETE FROM public.portfolio_scores WHERE project_id = $1", [testProjectId])
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminUser)
  })

  test("GET /api/portfolio/criteria returns active criteria including seeded row", async () => {
    const res = await getCriteria(new Request("http://localhost/api/portfolio/criteria"))
    expect(res.status).toBe(200)
    const rows = await res.json()
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.some((r: { id: string }) => r.id === testCriterionId)).toBe(true)
  })

  test("POST /api/portfolio/criteria validates name", async () => {
    const res = await postCriteria(
      new Request("http://localhost/api/portfolio/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  " }),
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/name/i)
  })

  test("POST /api/portfolio/criteria forbids non-admin", async () => {
    mockAuth.mockResolvedValue(plainUser)
    const res = await postCriteria(
      new Request("http://localhost/api/portfolio/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Not allowed" }),
      })
    )
    expect(res.status).toBe(403)
  })

  test("POST /api/portfolio/criteria creates criterion", async () => {
    const name = `SC79 create ${uuidv4()}`
    const res = await postCriteria(
      new Request("http://localhost/api/portfolio/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: "d", weight: 1.2, min_score: 1, max_score: 5 }),
      })
    )
    expect(res.status).toBe(201)
    const row = await res.json()
    expect(row.name).toBe(name)
    await pool!.query("DELETE FROM public.portfolio_criteria WHERE id = $1", [row.id])
  })

  test("GET /api/portfolio/scores requires project_id", async () => {
    const res = await getScores(new Request("http://localhost/api/portfolio/scores"))
    expect(res.status).toBe(400)
  })

  test("POST /api/portfolio/scores rejects out-of-range score", async () => {
    const res = await postScore(
      new Request("http://localhost/api/portfolio/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: testProjectId,
          criterion_id: testCriterionId,
          score: 99,
        }),
      })
    )
    expect(res.status).toBe(400)
  })

  test("POST /api/portfolio/scores upserts and GET returns joined rows", async () => {
    const postRes = await postScore(
      new Request("http://localhost/api/portfolio/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: testProjectId,
          criterion_id: testCriterionId,
          score: 4,
          rationale: "integration",
        }),
      })
    )
    expect(postRes.status).toBe(201)

    const getRes = await getScores(
      new Request(`http://localhost/api/portfolio/scores?project_id=${testProjectId}`)
    )
    expect(getRes.status).toBe(200)
    const scores = await getRes.json()
    expect(scores.length).toBe(1)
    expect(scores[0].criterion_name).toBe(criterionName)
    expect(scores[0].score).toBe(4)
  })

  test("POST /api/portfolio/scores/bulk upserts multiple criteria", async () => {
    const nameA = `SC79 bulk A ${uuidv4()}`
    const nameB = `SC79 bulk B ${uuidv4()}`
    const ins = await pool!.query(
      `INSERT INTO public.portfolio_criteria (name, weight, min_score, max_score)
       VALUES ($1, 1, 1, 5), ($2, 1, 1, 5)
       RETURNING id`,
      [nameA, nameB]
    )
    const idA = ins.rows[0].id
    const idB = ins.rows[1].id

    try {
      const res = await postBulkScores(
        new Request("http://localhost/api/portfolio/scores/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: testProjectId,
            scores: [
              { criterion_id: idA, score: 3, rationale: "a" },
              { criterion_id: idB, score: 5, rationale: "b" },
            ],
          }),
        })
      )
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true })

      const count = await pool!.query(
        `SELECT COUNT(*)::int AS n FROM public.portfolio_scores WHERE project_id = $1`,
        [testProjectId]
      )
      expect(count.rows[0].n).toBe(2)
    } finally {
      await pool!.query("DELETE FROM public.portfolio_scores WHERE project_id = $1", [testProjectId])
      await pool!.query("DELETE FROM public.portfolio_criteria WHERE id = ANY($1)", [[idA, idB]])
    }
  })

  test("GET /api/portfolio/rankings returns pagination shape", async () => {
    const res = await getRankings(new Request("http://localhost/api/portfolio/rankings?limit=10&offset=0"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.rankings)).toBe(true)
    expect(typeof body.total).toBe("number")
    expect(body.limit).toBe(10)
    expect(body.offset).toBe(0)
  })

  test("unauthenticated requests return 401", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await getCriteria(new Request("http://localhost/api/portfolio/criteria"))
    expect(res.status).toBe(401)
  })
})
