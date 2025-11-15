/**
 * Environment Variable Utility for Documenso Signing Integration
 * Replaces @documenso/lib/utils/env for ADPA compatibility
 */

/**
 * Get environment variable value
 * @param key - Environment variable key
 * @returns Environment variable value or undefined
 */
export const env = (key: string): string | undefined => {
  return process.env[key];
};

