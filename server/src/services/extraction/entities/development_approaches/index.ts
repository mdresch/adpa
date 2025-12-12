/**
 * Development Approaches Entity Module
 * 
 * Exports extraction and persistence functions for development_approaches entity.
 * Note: This is project-level metadata (ONE record per project).
 */

export * from './types'
export { extractDevelopmentApproaches } from './extractDevelopmentApproaches'
export { saveDevelopmentApproaches } from './saveDevelopmentApproaches'

