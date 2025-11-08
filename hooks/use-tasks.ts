"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api"

export interface Task {
  id: string
  project_id: string
  task_number: string
  wbs_code?: string
  task_name: string
  description?: string
  estimated_hours?: number
  actual_hours?: number
  start_date?: string
  end_date?: string
  required_role_id?: string
  required_role_name?: string
  assigned_user_id?: string
  assigned_user_name?: string
  status: 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  progress_percentage: number
  source_document_id?: string
  source_entity_id?: string
  imported_from_wbs?: boolean
  created_at: string
  updated_at?: string
  dependencies?: TaskDependency[]
  assigned_resources?: TaskResource[]
}

export interface TaskDependency {
  id: string
  predecessor_task_id: string
  successor_task_id: string
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lag_days: number
  predecessor_task?: {
    task_number: string
    task_name: string
  }
  successor_task?: {
    task_number: string
    task_name: string
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
      setTasks(response.data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'))
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

