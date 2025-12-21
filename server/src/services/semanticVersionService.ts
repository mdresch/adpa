/**
 * Semantic Versioning Service
 * 
 * Handles semantic version management for documents.
 * Format: MAJOR.MINOR.PATCH
 * 
 * - MAJOR: Breaking changes, complete restructure
 * - MINOR: AI regeneration, significant content updates
 * - PATCH: Manual edits, typo fixes
 */

import { logger } from '../utils/logger'

export interface SemanticVersion {
  major: number
  minor: number
  patch: number
}

export type VersionIncrementType = 'major' | 'minor' | 'patch'

/**
 * Parse semantic version string to object
 */
export function parseSemanticVersion(version: string): SemanticVersion {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  return { major, minor, patch }
}

/**
 * Convert semantic version object to string
 */
export function formatSemanticVersion(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`
}

/**
 * Increment semantic version
 * 
 * @param currentVersion - Current version string (e.g., "1.2.3")
 * @param incrementType - Type of increment (major, minor, patch)
 * @returns New version string
 */
export function incrementVersion(
  currentVersion: string,
  incrementType: VersionIncrementType
): string {
  const version = parseSemanticVersion(currentVersion)

  switch (incrementType) {
    case 'major':
      return `${version.major + 1}.0.0`
    case 'minor':
      return `${version.major}.${version.minor + 1}.0`
    case 'patch':
      return `${version.major}.${version.minor}.${version.patch + 1}`
    default:
      logger.warn(`Unknown version increment type: ${incrementType}`)
      return currentVersion
  }
}

/**
 * Compare two semantic versions
 * 
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const version1 = parseSemanticVersion(v1)
  const version2 = parseSemanticVersion(v2)

  if (version1.major !== version2.major) {
    return version1.major - version2.major
  }
  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor
  }
  return version1.patch - version2.patch
}

/**
 * Check if a version is valid
 */
export function isValidVersion(version: string): boolean {
  const regex = /^\d+\.\d+\.\d+$/
  return regex.test(version)
}

/**
 * Get next version for AI regeneration (defaults to minor increment)
 */
export function getNextAIVersion(currentVersion: string): string {
  return incrementVersion(currentVersion, 'minor')
}

/**
 * Get next version for manual edit (defaults to patch increment)
 */
export function getNextManualVersion(currentVersion: string): string {
  return incrementVersion(currentVersion, 'patch')
}

/**
 * Get next version for template change (defaults to major increment)
 */
export function getNextTemplateVersion(currentVersion: string): string {
  return incrementVersion(currentVersion, 'major')
}

export const semanticVersionService = {
  parse: parseSemanticVersion,
  format: formatSemanticVersion,
  increment: incrementVersion,
  compare: compareVersions,
  isValid: isValidVersion,
  getNextAIVersion,
  getNextManualVersion,
  getNextTemplateVersion
}

