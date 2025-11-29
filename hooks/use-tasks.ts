"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api"

export interface Task {
  id: string
  project_id?: string
  projectId?: string
  parent_task_id?: string
  parentTaskId?: string
  task_number?: string
  taskNumber?: string
  wbs_code?: string
  wbsCode?: string
  task_name?: string
  taskName?: string
  description?: string
  estimated_hours?: number
  estimatedHours?: number
  estimated_duration_days?: number
  estimatedDurationDays?: number
  estimated_cost?: number
  estimatedCost?: number
  actual_hours?: number
  actualHours?: number
  actual_cost?: number
  actualCost?: number
  start_date?: string
  end_date?: string
  plannedStartDate?: string | Date
  plannedEndDate?: string | Date
  actualStartDate?: string | Date
  actualEndDate?: string | Date
  required_role_id?: string
  requiredRoleId?: string
  required_role_name?: string
  requiredRoleName?: string
  required_skills?: string[]
  requiredSkills?: string[]
  required_resource_count?: number
  requiredResourceCount?: number
  assigned_user_id?: string
  assignedUserId?: string
  assigned_user_name?: string
  assignedUserName?: string
  status: 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' | 'scheduled' | 'in-progress' | 'on-hold' | 'cancelled'
  progress_percentage?: number
  percentComplete?: number
  priority?: 'low' | 'medium' | 'high' | 'critical'
  phase?: string
  category?: string
  deliverables?: string[]
  acceptance_criteria?: string
  acceptanceCriteria?: string
  source_document_id?: string
  sourceDocumentId?: string
  source_document_title?: string
  sourceDocumentTitle?: string
  source_entity_id?: string
  sourceEntityId?: string
  imported_from_wbs?: boolean
  importedFromWbs?: boolean
  created_at?: string
  createdAt?: string | Date
  updated_at?: string
  updatedAt?: string | Date
  completed_at?: string
  completedAt?: string | Date
  dependencies?: TaskDependency[]
  assigned_resources?: TaskResource[]
  assignedResources?: TaskResource[]
}

export interface TaskDependency {
  id: string
  predecessor_task_id?: string
  predecessorTaskId?: string
  successor_task_id?: string
  successorTaskId?: string
  dependency_type?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  dependencyType?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish' | 'finishToStart' | 'startToStart' | 'finishToFinish' | 'startToFinish'
  lag_days?: number
  lagDays?: number
  predecessor_task?: {
    task_number?: string
    taskNumber?: string
    task_name?: string
    taskName?: string
  }
  predecessorTask?: {
    task_number?: string
    taskNumber?: string
    task_name?: string
    taskName?: string
  }
  successor_task?: {
    task_number?: string
    taskNumber?: string
    task_name?: string
    taskName?: string
  }
  successorTask?: {
    task_number?: string
    taskNumber?: string
    task_name?: string
    taskName?: string
  }
}

export interface TaskResource {
  id: string
  task_id: string
  user_id: string
  user_name: string
  role_id?: string
  role_name?: string
  allocation_percentage: number
}

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get<{ success: boolean; data: Task[] }>(
        `/tasks/project/${projectId}`
      )
      // Normalize task rows from API/view to ensure a consistent `id` field.
      const rawTasks = response.data || []
      const normalized = rawTasks.map((t: any) => ({
        // keep existing keys, and ensure `id` exists from either `id` or `task_id`
        ...t,
        id: t.id || t.task_id || t.taskId || null,
      }))
      setTasks(normalized)
    } catch (err: any) {
      console.error('Error fetching tasks:', err)
      // Preserve the original error object (may include .status) so callers can react (401/403 handling)
      if (err instanceof Error) {
        // attach status if present
        ;(err as any).status = (err as any).status || (err?.response?.status)
        setError(err)
      } else {
        const e = new Error('Failed to fetch tasks') as any
        e.status = err?.status || err?.response?.status
        setError(e)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
  }
}

export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get<{ success: boolean; data: Task }>(
        `/tasks/${taskId}`
      )
      setTask(response.data)
    } catch (err) {
      console.error('Error fetching task:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch task'))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  return {
    task,
    loading,
    error,
    refetch: fetchTask,
  }
}

export function useTaskMutations(projectId: string, onSuccess?: () => void) {
  const [updating, setUpdating] = useState(false)

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      setUpdating(true)
      await apiClient.put(`/tasks/${taskId}`, data)
      onSuccess?.()
      return { success: true }
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }

  const assignResource = async (taskId: string, userId: string, roleId?: string, allocationPercentage: number = 100) => {
    try {
      setUpdating(true)
      await apiClient.post(`/tasks/${taskId}/assign`, {
        user_id: userId,
        role_id: roleId,
        allocation_percentage: allocationPercentage,
      })
      onSuccess?.()
      return { success: true }
    } catch (error) {
      console.error('Error assigning resource:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }

  const unassignResource = async (taskId: string, userId: string) => {
    try {
      setUpdating(true)
      await apiClient.delete(`/tasks/${taskId}/assign/${userId}`)
      onSuccess?.()
      return { success: true }
    } catch (error) {
      console.error('Error unassigning resource:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }

  const logHours = async (taskId: string, hours: number, date: string, notes?: string) => {
    try {
      setUpdating(true)
      await apiClient.post(`/tasks/${taskId}/log-hours`, {
        actual_hours: hours,
        date,
        notes,
      })
      onSuccess?.()
      return { success: true }
    } catch (error) {
      console.error('Error logging hours:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      setUpdating(true)
      await apiClient.delete(`/tasks/${taskId}`)
      onSuccess?.()
      return { success: true }
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }

  return {
    updateTask,
    assignResource,
    unassignResource,
    logHours,
    deleteTask,
    updating,
  }
}

