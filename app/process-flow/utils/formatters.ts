// Utility functions for process-flow page
// Extracted for reusability and cleaner code

/**
 * Format numbers consistently to avoid hydration errors
 */
export const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

/**
 * Format last modified date in human-readable format
 */
export const formatLastModified = (date: string | Date | undefined): string => {
  if (!date) return 'Unknown'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

/**
 * Calculate processing duration in seconds
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  return (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
}

/**
 * Estimate tokens from text content (rough approximation: 1 token ≈ 4 characters)
 */
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

/**
 * Calculate percentage with safety checks
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (!total || total === 0) return 0
  return Math.min(100, Math.max(0, (value / total) * 100))
}

/**
 * Format duration in human-readable format
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

