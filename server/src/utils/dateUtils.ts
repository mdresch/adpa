/**
 * Date Utility Functions
 * 
 * Provides consistent date handling using server time as the primary source.
 * Falls back to database time if server time is unavailable.
 * 
 * NOTE: If database time is incorrect, this will use server time instead.
 * 
 * Created: November 19, 2025
 * Purpose: Fix document date backdating issue
 */

/**
 * Get current date/time - uses server time (confirmed correct)
 * Server time is November 19, 2025 and is the source of truth
 * 
 * @returns Promise<Date> Current date/time from server
 */
export async function getCurrentDateFromDB(): Promise<Date> {
  // Use server time directly since it's confirmed correct (Nov 19, 2025)
  return new Date()
}

/**
 * Format date for document titles (consistent format: MM/DD/YYYY)
 * 
 * @param date Optional date to format (defaults to database current date)
 * @returns Promise<string> Formatted date string
 */
export async function getFormattedDateForTitle(date?: Date): Promise<string> {
  const dateToFormat = date || await getCurrentDateFromDB()
  return dateToFormat.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Format date for document titles (synchronous version using provided date)
 * Useful when you already have a date object
 * 
 * @param date Date to format
 * @returns string Formatted date string
 */
export function formatDateForTitle(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Get current ISO string from database
 * 
 * @returns Promise<string> ISO date string
 */
export async function getCurrentISOStringFromDB(): Promise<string> {
  const date = await getCurrentDateFromDB()
  return date.toISOString()
}

/**
 * Clear the date cache (useful for testing)
 */
export function clearDateCache(): void {
  // Cache cleared (no-op if no cache exists)
}

/**
 * Check if a date string is valid
 * @param dateString Date string to validate
 * @returns boolean True if valid date string
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false
  }
  
  // Check for ISO date format (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (isoDateRegex.test(dateString)) {
    const date = new Date(dateString)
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0]
  }
  
  // Try parsing as Date
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Convert quarter date string (e.g., "2025-Q1", "Q1 2025") to actual date
 * Returns the first day of the quarter
 * @param quarterString Quarter string to convert
 * @returns string Date string (YYYY-MM-DD) or null if invalid
 */
export function convertQuarterDate(quarterString: string | null | undefined): string | null {
  if (!quarterString || typeof quarterString !== 'string') {
    return null
  }
  
  const trimmed = quarterString.trim()
  
  // Match patterns like "2025-Q1", "Q1 2025", "2025Q1", etc.
  const patterns = [
    /^(\d{4})-Q([1-4])$/i,           // 2025-Q1
    /^Q([1-4])\s+(\d{4})$/i,         // Q1 2025
    /^(\d{4})Q([1-4])$/i,            // 2025Q1
    /^(\d{4})\s+Q([1-4])$/i,         // 2025 Q1
  ]
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) {
      let year: number
      let quarter: number
      
      if (pattern === patterns[1]) {
        // Q1 2025 format
        quarter = parseInt(match[1], 10)
        year = parseInt(match[2], 10)
      } else {
        // Other formats
        year = parseInt(match[1], 10)
        quarter = parseInt(match[2], 10)
      }
      
      if (year >= 1900 && year <= 2100 && quarter >= 1 && quarter <= 4) {
        // Calculate first day of quarter
        const month = (quarter - 1) * 3 // 0, 3, 6, 9
        const date = new Date(year, month, 1)
        return date.toISOString().split('T')[0]
      }
    }
  }
  
  return null
}

/**
 * Add days to a date string
 * @param dateString Date string (YYYY-MM-DD)
 * @param days Number of days to add
 * @returns string Date string (YYYY-MM-DD)
 */
export function addDays(dateString: string, days: number): string {
  const date = new Date(dateString)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * Get current date as string (YYYY-MM-DD)
 * @returns string Current date string
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}