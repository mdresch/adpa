/**
 * Formatting utilities for currency, percentages, and numbers
 */

/**
 * Format a number as USD currency
 * @param amount The amount to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  if (!amount && amount !== 0) {
    return '$0.00';
  }

  const num = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (num >= 1_000_000) {
    return `${sign}$${(num / 1_000_000).toFixed(decimals)}M`;
  }

  if (num >= 1_000) {
    return `${sign}$${(num / 1_000).toFixed(decimals)}K`;
  }

  return `${sign}$${num.toFixed(decimals)}`;
}

/**
 * Format a number as a percentage
 * @param value The value to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (!value && value !== 0) {
    return '0%';
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators
 * @param value The number to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (!value && value !== 0) {
    return '0';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format hours as hours and minutes
 * @param hours Total hours
 * @returns Formatted time string (e.g., "40h 30m")
 */
export function formatHours(hours: number): string {
  if (!hours && hours !== 0) {
    return '0h';
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}

/**
 * Format a date as a short date string
 * @param date The date to format
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(date: Date | string): string {
  if (!date) {
    return '';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date and time
 * @param date The date to format
 * @returns Formatted datetime string (e.g., "Jan 15, 2025 2:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  if (!date) {
    return '';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
