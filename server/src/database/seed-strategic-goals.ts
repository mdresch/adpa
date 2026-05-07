/**
 * Seed Strategic Goals (SC-84)
 *
 * Inserts sample strategic goals with key results.
 * Safe to re-run: it won’t duplicate goals with the same title.
 */

import { connectDatabase, getDatabasePool } from "./connection"
import { logger } from "../utils/logger"

type SeedKeyResult = {
  description: string
  target_value: number
  unit: string
}

type SeedGoal = {
  title: string
  description: string
  category: string
  target_date: string
  priority: number
  key_results: SeedKeyResult[]
}

const sampleGoals: SeedGoal[] = [
  {
    title: "Increase Market Share by 15%",
    description: "Expand into new geographic markets and acquire 15% additional market share",
    category: "Growth",
    target_date: "2026-12-31",
    priority: 10,
    key_results: [
      { description: "Enter 3 new markets", target_value: 3, unit: "markets" },
      { description: "Acquire 50,000 new customers", target_value: 50000, unit: "customers" },
    ],
  },
  {
    title: "Reduce Operational Costs by 20%",
    description: "Implement automation and process improvements to reduce operational overhead",
    category: "Efficiency",
    target_date: "2026-06-30",
    priority: 8,
    key_results: [
      { description: "Automate 80% of manual processes", target_value: 80, unit: "%" },
      { description: "Reduce headcount by 10%", target_value: 10, unit: "%" },
    ],
  },
]

export async function seedStrategicGoals(): Promise<void> {
  await connectDatabase()
  const db = getDatabasePool()

  for (const goal of sampleGoals) {
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM public.strategic_goals WHERE title = $1 LIMIT 1`,
      [goal.title]
    )

    let goalId: string
    if (existing.rows.length > 0) {
      goalId = existing.rows[0].id
      await db.query(
        `
        UPDATE public.strategic_goals
        SET description = $2,
            category = $3,
            target_date = $4,
            priority = $5
        WHERE id = $1
        `,
        [goalId, goal.description, goal.category, goal.target_date, goal.priority]
      )
    } else {
      const inserted = await db.query<{ id: string }>(
        `
        INSERT INTO public.strategic_goals (title, description, category, target_date, priority)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        `,
        [goal.title, goal.description, goal.category, goal.target_date, goal.priority]
      )
      goalId = inserted.rows[0].id
    }

    for (const kr of goal.key_results) {
      const krExists = await db.query<{ id: string }>(
        `
        SELECT id
        FROM public.strategic_key_results
        WHERE goal_id = $1 AND description = $2
        LIMIT 1
        `,
        [goalId, kr.description]
      )

      if (krExists.rows.length === 0) {
        await db.query(
          `
          INSERT INTO public.strategic_key_results (goal_id, description, target_value, unit)
          VALUES ($1, $2, $3, $4)
          `,
          [goalId, kr.description, kr.target_value, kr.unit]
        )
      }
    }
  }

  logger.info("✅ Strategic goals seeded successfully")
}

if (require.main === module) {
  seedStrategicGoals().catch((err) => {
    logger.error("❌ Strategic goals seeding failed", err)
    process.exit(1)
  })
}

