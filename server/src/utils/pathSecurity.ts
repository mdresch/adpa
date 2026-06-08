/**
 * Path Security Utilities
 * Provides secure path handling to prevent path traversal vulnerabilities
 */

import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Allowed characters in filenames
 * Only alphanumeric, dots, hyphens, underscores, and spaces
 */
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._\s\-]+$/

/** readdir / single path segment: no separators or parent hops */
const SINGLE_SEGMENT_REGEX = /^[^/\\]+$/

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
  // nosemgrep: javascript.express.security.audit.path-traversal.path-traversal, javascript.node.security.path-traversal
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const normalizedPath = path.normalize(path.resolve(resolvedPath))
  // nosemgrep: javascript.express.security.audit.path-traversal.path-traversal, javascript.node.security.path-traversal
  // eslint-disable-next-line security/detect-non-literal-fs-filename
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
 * Resolves a single filesystem entry name under a parent directory (e.g. readdir).
 * Rejects separators, `.`, and `..` before joining.
 */
export function resolveSafeChildPath(parentDir: string, childName: string): string | null {
  if (!childName || childName === '.' || childName === '..' || !SINGLE_SEGMENT_REGEX.test(childName)) {
    return null
  }

  // nosemgrep: javascript.express.security.audit.path-traversal.path-traversal, javascript.node.security.path-traversal
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const resolvedParent = path.resolve(parentDir)
  // nosemgrep: javascript.express.security.audit.path-traversal.path-traversal, javascript.node.security.path-traversal
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const resolvedChild = path.resolve(path.join(resolvedParent, childName))

  if (!isPathContained(resolvedChild, resolvedParent)) {
    return null
  }

  return resolvedChild
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

  // nosemgrep: javascript.express.security.audit.path-traversal.path-traversal, javascript.node.security.path-traversal
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const resolvedParent = path.resolve(parentDir)
  // nosemgrep: javascript.express.security.audit.path-traversal.path-traversal, javascript.node.security.path-traversal
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const resolvedPath = path.resolve(path.join(resolvedParent, sanitized))

  if (!isPathContained(resolvedPath, resolvedParent)) {
    return null
  }

  return resolvedPath
}

/**
 * Writes Google application credentials to a fixed path under the OS temp directory.
 * Used by serverless hosts that supply credentials via environment variable.
 */
export function ensureGoogleApplicationCredentialsFile(base64Contents: string): string {
  const credentialsDir = resolveSafeChildPath(os.tmpdir(), 'adpa-documenso')
  if (!credentialsDir) {
    throw new Error('Invalid credentials directory path')
  }

  const credentialsPath = resolveSafeChildPath(credentialsDir, 'google-application-credentials.json')
  if (!credentialsPath) {
    throw new Error('Invalid credentials file path')
  }

  if (!fs.existsSync(credentialsPath)) {
    const contents = new Uint8Array(Buffer.from(base64Contents, 'base64'))
    fs.mkdirSync(credentialsDir, { recursive: true, mode: 0o700 })
    // nosemgrep: javascript.express.security.audit.path-traversal.path-traversal, javascript.node.security.path-traversal
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(credentialsPath, contents, { mode: 0o600 })
  }

  return credentialsPath
}
