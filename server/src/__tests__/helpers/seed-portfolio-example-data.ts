import { v4 as uuidv4 } from "uuid"
import type { Pool } from "pg"
import { testCriteria, testProjects } from "../fixtures/portfolio-test-data"

export type SeededPortfolioExampleData = {
  runId: string
  userId: string
  criteriaByName: Record<string, string>
  projectByName: Record<string, string>
}

export async function seedPortfolioExampleData(pool: Pool): Promise<SeededPortfolioExampleData> {
  const runId = uuidv4()
  const userId = uuidv4()

  await pool.query(
    `INSERT INTO public.users (id, email, password_hash, role, name)
     VALUES ($1, $2, 'x', 'admin', 'SC82 Admin')
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email`,
    [userId, `sc82-admin-${runId}@example.com`]
  )

  const criteriaByName: Record<string, string> = {}
  for (const c of testCriteria) {
    const name = `${c.name} [SC82 ${runId}]`
    const r = await pool.query<{ id: string }>(
      `
      INSERT INTO public.portfolio_criteria (name, description, weight, min_score, max_score, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
      `,
      [name, c.description, c.weight, c.min_score, c.max_score]
    )
    criteriaByName[c.name] = r.rows[0].id
  }

  const projectByName: Record<string, string> = {}
  for (const p of testProjects) {
    const name = `${p.name} [SC82 ${runId}]`
    const pr = await pool.query<{ id: string }>(
      `
      INSERT INTO public.projects (id, name, description, status, budget, owner_id, created_by, framework)
      VALUES ($1, $2, $3, $4, $5, $6, $6, 'ADPA')
      RETURNING id
      `,
      [uuidv4(), name, p.description, p.status, p.budget, userId]
    )
    projectByName[p.name] = pr.rows[0].id

    for (const [criterionName, scoreData] of Object.entries(p.scores)) {
      const criterionId = criteriaByName[criterionName]
      await pool.query(
        `
        INSERT INTO public.portfolio_scores (project_id, criterion_id, score, rationale, scored_by)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [pr.rows[0].id, criterionId, scoreData.score, scoreData.rationale, userId]
      )
    }
  }

  await pool.query("select public.refresh_portfolio_rankings();")

  return { runId, userId, criteriaByName, projectByName }
}

export async function cleanupPortfolioExampleData(pool: Pool, data: SeededPortfolioExampleData): Promise<void> {
  const projectIds = Object.values(data.projectByName)
  const criterionIds = Object.values(data.criteriaByName)

  if (projectIds.length > 0) {
    await pool.query(`DELETE FROM public.portfolio_scores WHERE project_id = ANY($1)`, [projectIds])
    await pool.query(`DELETE FROM public.projects WHERE id = ANY($1)`, [projectIds])
  }

  if (criterionIds.length > 0) {
    await pool.query(`DELETE FROM public.portfolio_criteria WHERE id = ANY($1)`, [criterionIds])
  }

  await pool.query(`DELETE FROM public.users WHERE id = $1`, [data.userId])

  await pool.query("select public.refresh_portfolio_rankings();").catch(() => {
    /* best-effort */
  })
}

