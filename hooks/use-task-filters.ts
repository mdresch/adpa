"use client"

import { useState, useMemo } from "react"
import { Task } from "./use-tasks"

export interface TaskFilters {
  status: string
  role: string
  assignedTo: string
  search: string
}

export function useTaskFilters(tasks: Task[]) {
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    role: 'all',
    assignedTo: 'all',
    search: '',
  })

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const roles = new Set<string>()
    const assigneesMap = new Map<string, { id: string; name: string }>()

    tasks.forEach(task => {
      if (task.required_role_name) {
        roles.add(task.required_role_name)
      }
      if (task.assigned_user_id && task.assigned_user_name) {
        // Use Map to ensure unique assignees by ID
        assigneesMap.set(task.assigned_user_id, {
          id: task.assigned_user_id,
          name: task.assigned_user_name,
        })
      }
    })

    return {
      roles: Array.from(roles).sort(),
      assignees: Array.from(assigneesMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [tasks])

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false
      }

      // Role filter
      if (filters.role !== 'all' && task.required_role_name !== filters.role) {
        return false
      }

      // Assigned to filter
      if (filters.assignedTo !== 'all') {
        if (filters.assignedTo === 'unassigned' && task.assigned_user_id) {
          return false
        }
        if (filters.assignedTo !== 'unassigned' && task.assigned_user_id !== filters.assignedTo) {
          return false
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesTaskName = task.task_name.toLowerCase().includes(searchLower)
        const matchesTaskNumber = task.task_number.toLowerCase().includes(searchLower)
        const matchesWbsCode = task.wbs_code?.toLowerCase().includes(searchLower)
        const matchesDescription = task.description?.toLowerCase().includes(searchLower)
        
        if (!matchesTaskName && !matchesTaskNumber && !matchesWbsCode && !matchesDescription) {
          return false
        }
      }

      return true
    })
  }, [tasks, filters])

  return {
    filters,
    setFilters,
    filteredTasks,
    filterOptions,
  }
}

