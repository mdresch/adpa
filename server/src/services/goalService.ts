import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { AIService } from './aiService'
import * as taskService from './taskManagementService'

export interface ProjectGoal {
  id?: string
  projectId: string
  title: string
  description?: string
  successCriteria?: string
  targetValue?: number
  currentValue?: number
  unit?: string
  businessQuarter?: string
  targetDate?: Date
  status?: 'draft' | 'active' | 'achieved' | 'at-risk' | 'behind' | 'cancelled'
  category?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  progressPercentage?: number
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
  achievedAt?: Date
}

export interface GoalMilestone {
  id?: string
  goalId: string
  title: string
  description?: string
  targetDate?: Date
  status?: 'pending' | 'completed' | 'missed' | 'cancelled'
  linkedTaskIds?: string[]
  createdAt?: Date
  updatedAt?: Date
  completedAt?: Date
}

export interface CreateGoalInput {
  projectId: string
  title: string
  description?: string
  targetDate?: Date
  category?: string
  priority?: string
  businessQuarter?: string
  successCriteria?: string
  targetValue?: number
}

const aiService = new AIService()

/**
 * Create a new goal
 */
export async function createGoal(
  input: CreateGoalInput,
  userId: string
): Promise<ProjectGoal> {
  try {
    const result = await pool.query(`
      INSERT INTO project_goals (
        project_id,
        title,
        description,
        target_date,
        category,
        priority,
        business_quarter,
        success_criteria,
        target_value,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      input.projectId,
      input.title,
      input.description,
      input.targetDate,
      input.category,
      input.priority || 'medium',
      input.businessQuarter,
      input.successCriteria,
      input.targetValue,
      'draft',
      userId
    ])
    
    return result.rows[0] as ProjectGoal
  } catch (error) {
    logger.error('createGoal error', { error, input })
    throw error
  }
}

/**
 * Get goals for a project
 */
export async function getProjectGoals(projectId: string): Promise<ProjectGoal[]> {
  try {
    const result = await pool.query(`
      SELECT * FROM project_goals WHERE project_id = $1 ORDER BY target_date ASC
    `, [projectId])
    
    return result.rows as ProjectGoal[]
  } catch (error) {
    logger.error('getProjectGoals error', { error, projectId })
    throw error
  }
}

/**
 * Get goal by ID with milestones
 */
export async function getGoalById(goalId: string): Promise<ProjectGoal & { milestones: GoalMilestone[] } | null> {
  try {
    const goalResult = await pool.query(`
      SELECT * FROM project_goals WHERE id = $1
    `, [goalId])
    
    if (goalResult.rows.length === 0) return null
    
    const milestoneResult = await pool.query(`
      SELECT * FROM goal_milestones WHERE goal_id = $1 ORDER BY target_date ASC
    `, [goalId])
    
    return {
      ...goalResult.rows[0],
      milestones: milestoneResult.rows
    }
  } catch (error) {
    logger.error('getGoalById error', { error, goalId })
    throw error
  }
}

/**
 * Decompose a goal into tasks using AI
 * This is the "Meta Task" feature where a high-level goal is broken down into a concrete plan
 */
export async function decomposeGoal(
  goalId: string,
  userId: string
): Promise<{ tasksCreated: number; plan: string }> {
  try {
    const goal = await getGoalById(goalId)
    if (!goal) throw new Error('Goal not found')
    
    // 1. Research existing project context (tasks, project summary, etc.)
    const projectResult = await pool.query('SELECT name, description FROM projects WHERE id = $1', [goal.projectId])
    const project = projectResult.rows[0]
    
    // 2. Call AI Service to generate decomposition plan
    const prompt = `
      You are an expert Project Manager. Decompose the following high-level project goal into a set of actionable tasks (WBS).
      
      Project: ${project.name}
      Project Description: ${project.description}
      
      Goal: ${goal.title}
      Goal Description: ${goal.description}
      Success Criteria: ${goal.successCriteria}
      Target Date: ${goal.targetDate}
      
      Please provide a structured plan in JSON format:
      {
        "plan_summary": "High-level strategy",
        "tasks": [
          {
            "name": "Task Name",
            "description": "Task description",
            "estimated_hours": 8,
            "priority": "medium",
            "phase": "Project Planning"
          }
        ]
      }
    `
    
    const aiResponse = await aiService.generateWithFallback({
      provider: 'openai', // Default provider
      model: 'gpt-4o',
      prompt: prompt,
      system_prompt: 'You are an expert in PMBOK and project execution. Respond ONLY with valid JSON.'
    })
    
    const decomposition = JSON.parse(aiResponse.content)
    let tasksCreatedCount = 0
    
    // 3. Create tasks in the database
    if (decomposition.tasks && Array.isArray(decomposition.tasks)) {
      for (const taskData of decomposition.tasks) {
        await taskService.createTask({
          projectId: goal.projectId,
          taskName: taskData.name,
          description: taskData.description,
          estimatedHours: taskData.estimated_hours,
          priority: taskData.priority,
          phase: taskData.phase,
          goalId: goalId // Link back to the goal
        }, userId)
        
        tasksCreatedCount++
      }
    }
    
    logger.info('Goal decomposition successful', { goalId, userId, tasksCreated: tasksCreatedCount })
    
    return {
      tasksCreated: tasksCreatedCount,
      plan: decomposition.plan_summary
    }
  } catch (error) {
    logger.error('decomposeGoal error', { error, goalId })
    throw error
  }
}
