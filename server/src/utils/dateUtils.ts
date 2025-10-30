/**
 * Date Utility Functions
 * Helper functions for date parsing, validation, and conversion
 */

import { logger } from './logger'

/**
 * Validates if a string is a valid date in YYYY-MM-DD format
 */
export function isValidDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false
  
  // Check format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  
  // Check if it's a real date
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * Converts quarter-based dates (e.g., "2025-Q4") to standard date format (YYYY-MM-DD)
 * Uses the last day of the quarter as the date
 * 
 * @param dateStr - Date string in format "YYYY-Q[1-4]" or "YYYY-MM-DD"
 * @returns Formatted date string (YYYY-MM-DD) or null if invalid
 * 
 * @example
 * convertQuarterDate("2025-Q4") // returns "2025-12-31"
 * convertQuarterDate("2025-Q1") // returns "2025-03-31"
 * convertQuarterDate("2025-06-15") // returns "2025-06-15"
 * convertQuarterDate("invalid") // returns null
 */
export function convertQuarterDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  
  // Check for quarter format (YYYY-Q[1-4])
  const quarterMatch = dateStr.match(/^(\d{4})-Q([1-4])$/)
  if (quarterMatch) {
    const year = quarterMatch[1]
    const quarter = quarterMatch[2]
    
    // Map quarters to last day of quarter
    const quarterEndDates: Record<string, string> = {
      '1': '03-31', // Q1: Jan-Mar
      '2': '06-30', // Q2: Apr-Jun
      '3': '09-30', // Q3: Jul-Sep
      '4': '12-31'  // Q4: Oct-Dec
    }
    
    return `${year}-${quarterEndDates[quarter]}`
  }
  
  // Already in YYYY-MM-DD format - validate it
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return isValidDate(dateStr) ? dateStr : null
  }
  
  // Invalid format
  logger.warn(`[DATE-UTILS] Invalid date format: ${dateStr}`)
  return null
}

/**
 * Adds days to a date and returns formatted string
 * 
 * @param dateStr - Base date in YYYY-MM-DD format
 * @param days - Number of days to add (can be negative)
 * @returns New date string in YYYY-MM-DD format
 * 
 * @example
 * addDays("2025-01-01", 30) // returns "2025-01-31"
 * addDays("2025-01-15", -5) // returns "2025-01-10"
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * Gets the current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Ensures a date string is valid, providing a default if not
 * 
 * @param dateStr - Date string to validate
 * @param defaultDate - Default date to use if invalid (defaults to current date)
 * @returns Valid date string in YYYY-MM-DD format
 */
export function ensureValidDate(
  dateStr: string | undefined,
  defaultDate?: string
): string {
  if (dateStr && isValidDate(dateStr)) {
    return dateStr
  }
  return defaultDate || getCurrentDate()
}

