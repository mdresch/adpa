/**
 * Timezone and Date Format Utility Functions
 * 
 * Provides utilities for converting UTC timestamps to user's local timezone
 * and formatting dates according to user preferences (timezone and date format)
 * 
 * Created: November 19, 2025
 */

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

/**
 * Common IANA timezones for user selection
 */
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/Stockholm', label: 'Stockholm' },
  { value: 'Europe/Zurich', label: 'Zurich' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'Mumbai, New Delhi' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
]

/**
 * Get user's browser timezone (fallback if not set in preferences)
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Convert UTC timestamp to user's timezone
 * 
 * @param utcDate UTC date string or Date object
 * @param timezone IANA timezone name (defaults to UTC)
 * @returns Formatted date string in user's timezone
 */
export function formatDateInTimezone(
  utcDate: string | Date,
  timezone: string = 'UTC'
): string {
  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return utcDate.toString()
  }
}

/**
 * Format date for display with timezone indicator
 * 
 * @param utcDate UTC date string or Date object
 * @param timezone IANA timezone name (defaults to UTC)
 * @param format Format style: 'short' | 'medium' | 'long' | 'full'
 * @returns Formatted date string with timezone
 */
export function formatDateWithTimezone(
  utcDate: string | Date,
  timezone: string = 'UTC',
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      dateStyle: format,
      timeStyle: format,
    }
    
    return new Intl.DateTimeFormat('en-US', formatOptions).format(date)
  } catch (error) {
    console.error('Error formatting date with timezone:', error)
    return utcDate.toString()
  }
}

/**
 * Get timezone abbreviation (e.g., EST, PST, CET)
 * 
 * @param timezone IANA timezone name
 * @param date Optional date to get timezone for (defaults to now)
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(
  timezone: string = 'UTC',
  date: Date = new Date()
): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    })
    
    const parts = formatter.formatToParts(date)
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')
    return timeZoneName?.value || timezone
  } catch {
    return timezone
  }
}

/**
 * Validate IANA timezone name
 * 
 * @param timezone Timezone string to validate
 * @returns true if valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to create a formatter with this timezone
    Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Format date according to user's preferred format
 * 
 * @param date Date to format
 * @param format Date format preference (MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatDateByPreference(date: Date | string, format: DateFormat = 'MM/DD/YYYY'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`
  }
}

/**
 * Format date and time according to user's preferences
 * 
 * @param date Date to format
 * @param timezone User's timezone preference
 * @param dateFormat User's date format preference
 * @param includeTime Whether to include time in the output
 * @returns Formatted date/time string
 */
export function formatDateTimeByPreferences(
  date: Date | string,
  timezone: string = 'UTC',
  dateFormat: DateFormat = 'MM/DD/YYYY',
  includeTime: boolean = true
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  try {
    // Convert to user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(includeTime && {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    })
    
    const parts = formatter.formatToParts(d)
    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    const hour = includeTime ? parts.find(p => p.type === 'hour')?.value || '' : ''
    const minute = includeTime ? parts.find(p => p.type === 'minute')?.value || '' : ''
    
    // Format date according to preference
    let dateStr = ''
    switch (dateFormat) {
      case 'DD/MM/YYYY':
        dateStr = `${day}/${month}/${year}`
        break
      case 'YYYY-MM-DD':
        dateStr = `${year}-${month}-${day}`
        break
      case 'MM/DD/YYYY':
      default:
        dateStr = `${month}/${day}/${year}`
        break
    }
    
    if (includeTime) {
      return `${dateStr} ${hour}:${minute}`
    }
    
    return dateStr
  } catch (error) {
    console.error('Error formatting date:', error)
    return formatDateByPreference(d, dateFormat)
  }
}

/**
 * Common date format options for user selection
 */
export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string; example: string }> = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US Format)', example: '11/19/2025' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)', example: '19/11/2025' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Format)', example: '2025-11-19' },
]

