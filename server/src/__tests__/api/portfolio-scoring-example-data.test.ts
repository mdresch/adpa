/**
 * SC-82: Validate portfolio scoring + ranking with realistic example data.
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

import { GET as getRankings } from "@/app/api/portfolio/rankings/route"
import { POST as postScore } from "@/app/api/portfolio/scores/route"
import { POST as postBulkScores } from "@/app/api/portfolio/scores/bulk/route"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { connectDatabase, pool } from "@/server/src/database/connection"
import dotenv from "dotenv"
import path from "path"
import { testCriteria } from "../fixtures/portfolio-test-data"
import { cleanupPortfolioExampleData, seedPortfolioExampleData } from "../helpers/seed-portfolio-example-data"

const mockAuth = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>

describe("Portfolio scoring example data (SC-82)", () => {
  let seeded: Awaited<ReturnType<typeof seedPortfolioExampleData>>

  beforeAll(async () => {
    dotenv.config({ path: path.resolve(process.cwd(), ".env") })
    dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
    dotenv.config({ path: path.resolve(process.cwd(), "server/.env") })
    await connectDatabase()
    seeded = await seedPortfolioExampleData(pool)
    mockAuth.mockResolvedValue({ id: seeded.userId, email: "sc82@example.com", role: "admin", permissions: {} })
  })

  afterAll(async () => {
    try {
      await cleanupPortfolioExampleData(pool, seeded)
    } catch {
      /* ignore */
    }
  })

  test("rankings compute weighted totals (Alpha) and ordering (Beta > Alpha)", async () => {
    const res = await getRankings(new Request("http://localhost/api/portfolio/rankings?limit=50&offset=0"))
    expect(res.status).toBe(200)
    const body = await res.json()

    const rankings = body.rankings as Array<{ project_name: string; total_score: string | number; rank: number }>
    const alpha = rankings.find((r) => r.project_name.startsWith("Project Alpha [SC82"))
    const beta = rankings.find((r) => r.project_name.startsWith("Project Beta [SC82"))

    expect(alpha).toBeTruthy()
    expect(beta).toBeTruthy()

    // Alpha expected:
    // Strategic Alignment: 5 * 1.5 = 7.5
    // ROI Potential: 4 * 1.3 = 5.2
    // Risk Level: 3 * 1.0 = 3.0
    // Resource Availability: 4 * 1.2 = 4.8
    // Total: 20.5
    expect(Number(alpha!.total_score)).toBeCloseTo(20.5, 1)

    // Ranking order (per current DB view: sum(score * weight), no inversion)
    const topTwo = rankings.slice(0, 2).map((r) => r.project_name)
    expect(topTwo[0]).toContain("Project Beta [SC82")
    expect(topTwo[1]).toContain("Project Alpha [SC82")
  })

  test("score range validation rejects > max", async () => {
    const projectId = seeded.projectByName["Project Alpha"]
    const criterionId = seeded.criteriaByName["Strategic Alignment"]

    const res = await postScore(
      new Request("http://localhost/api/portfolio/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, criterion_id: criterionId, score: 10, rationale: "invalid" }),
      })
    )
    expect(res.status).toBe(400)
  })

  test("bulk scoring updates scores and refreshes rankings", async () => {
    const projectId = seeded.projectByName["Project Delta"]
    const criterionId = seeded.criteriaByName["ROI Potential"]

    // Delta baseline ROI score is 2; update to 5.
    const bulkRes = await postBulkScores(
      new Request("http://localhost/api/portfolio/scores/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          scores: [{ criterion_id: criterionId, score: 5, rationale: "updated for test" }],
        }),
      })
    )
    expect(bulkRes.status).toBe(200)

    const rankRes = await getRankings(new Request("http://localhost/api/portfolio/rankings?limit=50&offset=0"))
    const body = await rankRes.json()
    const rankings = body.rankings as Array<{ project_id: string; project_name: string; total_score: string | number }>
    const delta = rankings.find((r) => r.project_id === projectId)
    expect(delta).toBeTruthy()

    // Delta expected total after update:
    // Strategic Alignment: 4 * 1.5 = 6.0
    // ROI Potential: 5 * 1.3 = 6.5  (updated)
    // Risk Level: 2 * 1.0 = 2.0
    // Resource Availability: 3 * 1.2 = 3.6
    // Total: 18.1
    expect(Number(delta!.total_score)).toBeCloseTo(18.1, 1)
  })

  test("fixture criteria weights match expected test assumptions", () => {
    const byName = Object.fromEntries(testCriteria.map((c) => [c.name, c.weight]))
    expect(byName["Strategic Alignment"]).toBe(1.5)
    expect(byName["ROI Potential"]).toBe(1.3)
    expect(byName["Risk Level"]).toBe(1.0)
    expect(byName["Resource Availability"]).toBe(1.2)
  })
})

