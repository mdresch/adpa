/**
 * Helper utilities for Projects page
 * Functions for status colors, priority colors, and progress calculation
 */

import type { Project } from "@/lib/api"

/**
 * Get color classes for project status badge
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
    case "planning":
      return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
    case "completed":
      return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
    case "on-hold":
      return "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
    default:
      return "bg-gradient-to-r from-slate-500 to-gray-500 text-white"
  }
}

/**
 * Get color classes for project priority badge
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "text-red-500 bg-red-50 dark:bg-red-900/20"
    case "medium":
      return "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
    case "low":
      return "text-green-500 bg-green-50 dark:bg-green-900/20"
    default:
      return "text-slate-500 bg-slate-50 dark:bg-slate-900/20"
  }
}

/**
 * Calculate project progress based on start and end dates
 * Returns percentage (0-100)
 */
export function getProjectProgress(project: Project): number {
  const startDate = new Date(project.start_date || Date.now())
  const endDate = new Date(project.end_date || Date.now())
  const now = new Date()
  
  if (now < startDate) return 0
  if (now > endDate) return 100
  
  const totalDays = endDate.getTime() - startDate.getTime()
  const elapsedDays = now.getTime() - startDate.getTime()
  return Math.round((elapsedDays / totalDays) * 100)
}

