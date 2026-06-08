/**
 * Path Security Utilities
 * Provides secure path handling to prevent path traversal vulnerabilities
 */

import path from 'path'

/**
 * Allowed characters in filenames
 * Only alphanumeric, dots, hyphens, underscores, and spaces
 */
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._\s\-]+$/

/**
 * Sanitizes a filename to prevent path traversal attacks
 * @param filename - The filename to sanitize (from user input)
 * @returns The sanitized filename or null if invalid
 */
export function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') {
    return null
  }

  // Extract just the basename to remove any directory components
  const basename = path.basename(filename)

  // Reject if basename differs from original (contains directory separators)
  if (basename !== filename) {
    return null
  }

  // Normalize to handle .. and . in the filename
  const normalized = path.normalize(basename)

  // Final check: ensure normalized version is still just a filename
  if (normalized !== basename || !SAFE_FILENAME_REGEX.test(normalized)) {
    return null
  }

  return normalized
}

/**
 * Validates that a resolved path stays within a parent directory
 * @param resolvedPath - The fully resolved path
 * @param parentDir - The parent directory that should contain the path
 * @returns true if the path is safely contained within parentDir
 */
export function isPathContained(resolvedPath: string, parentDir: string): boolean {
  // Normalize both paths to handle .. and .
  const normalizedPath = path.normalize(path.resolve(resolvedPath))
  const normalizedParent = path.normalize(path.resolve(parentDir))

  // Ensure parent path ends with separator for proper prefix matching
  const parentWithSep = normalizedParent.endsWith(path.sep) 
    ? normalizedParent 
    : `${normalizedParent}${path.sep}`

  // Path must either be exactly the parent or start with parent + separator
  return normalizedPath === normalizedParent || 
         normalizedPath.startsWith(parentWithSep)
}

/**
 * Creates a safe file path by joining components and validating containment
 * @param parentDir - The parent directory
 * @param filename - The filename (will be sanitized)
 * @returns The safe full path or null if invalid
 */
export function createSafePath(parentDir: string, filename: string): string | null {
  const sanitized = sanitizeFilename(filename)
  if (!sanitized) {
    return null
  }

  const fullPath = path.join(parentDir, sanitized)
  const resolvedPath = path.resolve(fullPath)
  const resolvedParent = path.resolve(parentDir)

  if (!isPathContained(resolvedPath, resolvedParent)) {
    return null
  }

  return resolvedPath
}
