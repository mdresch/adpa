import { NextResponse } from "next/server"
import { getAuthenticatedUser, forbiddenResponse, unauthorizedResponse } from "@/lib/auth-utils"
// Removed: This route imported backend-only code and cannot run in the Next.js API context.
// Please POST directly to the backend Express API for portfolio criteria.
  name?: string
  description?: string | null
  weight?: number
  min_score?: number
  max_score?: number
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const result = await pool.query(
      `
      SELECT id, name, description, weight, min_score, max_score, is_active
      FROM public.portfolio_criteria
      WHERE is_active = true
      ORDER BY name ASC
      `
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    logger.error("GET /api/portfolio/criteria failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()
  if (!(user.role === "admin" || user.role === "super_admin")) return forbiddenResponse()

  await connectDatabase()

  try {
    const body = (await req.json()) as CreateCriterionBody
    const name = body?.name?.trim()
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const weight = typeof body.weight === "number" ? body.weight : 1.0
    const minScore = typeof body.min_score === "number" ? body.min_score : 1
    const maxScore = typeof body.max_score === "number" ? body.max_score : 5

    if (!Number.isFinite(weight) || weight <= 0) {
      return NextResponse.json({ error: "weight must be a positive number" }, { status: 400 })
    }
    if (!Number.isInteger(minScore) || !Number.isInteger(maxScore) || minScore < 1 || maxScore < minScore) {
      return NextResponse.json({ error: "invalid score range" }, { status: 400 })
    }

    const result = await pool.query(
      `
      INSERT INTO public.portfolio_criteria (name, description, weight, min_score, max_score)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, weight, min_score, max_score, is_active, created_at, updated_at
      `,
      [name, body.description ?? null, weight, minScore, maxScore]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    logger.error("POST /api/portfolio/criteria failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

