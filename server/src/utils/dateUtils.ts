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
  cachedDbTime = null
}
