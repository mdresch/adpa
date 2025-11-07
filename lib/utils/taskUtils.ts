/**
 * Task-related utility functions
 * Shared utilities for task management components
 */

/**
 * Safely parse hours from various input types
 * Handles numbers, strings, null, undefined
 * @param value - The value to parse as hours
 * @returns Parsed hours as number (0 if invalid)
 */
export function parseHours(value: number | string | undefined | null): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''))
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format hours for display
 * @param hours - Number of hours
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with 'h' suffix
 */
export function formatHours(hours: number | undefined | null, decimals: number = 1): string {
  const parsed = parseHours(hours)
  return `${parsed.toFixed(decimals)}h`
}

/**
 * Calculate percentage of hours used
 * @param actual - Actual hours spent
 * @param estimated - Estimated hours
 * @returns Percentage (0-100+) or 0 if no estimate
 */
export function calculateHoursPercentage(actual: number | string | undefined | null, estimated: number | string | undefined | null): number {
  const actualHours = parseHours(actual)
  const estimatedHours = parseHours(estimated)
  
  if (estimatedHours === 0) return 0
  return Math.round((actualHours / estimatedHours) * 100)
}

