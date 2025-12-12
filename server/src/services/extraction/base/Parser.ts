/**
 * Parser
 * 
 * Handles parsing of AI responses, including JSON extraction, cleanup, and error recovery.
 * Handles markdown-wrapped JSON, control characters, unescaped quotes, and incomplete JSON.
 */

import { logger } from '../../../utils/logger'

/**
 * Parse AI response (handles both JSON and markdown-wrapped JSON)
 * Includes fixes for common JSON malformation issues
 */
export function parseAIResponse(content: string): any {
  logger.debug('[EXTRACTION-PARSE] Starting JSON parsing', {
    originalLength: content.length,
    originalPreview: content.substring(0, 200),
    hasCodeBlocks: content.includes('```'),
    startsWithBrace: content.trim().startsWith('{'),
    startsWithBracket: content.trim().startsWith('[')
  })
  
  let cleanedContent = content.trim()
  
  // Remove markdown code blocks if present
  if (cleanedContent.includes('```')) {
    logger.debug('[EXTRACTION-PARSE] Detected markdown code blocks, extracting JSON')
    cleanedContent = extractJsonFromCodeBlock(cleanedContent)
  }
  
  logger.debug('[EXTRACTION-PARSE] Attempting direct JSON parse', {
    cleanedLength: cleanedContent.length,
    cleanedPreview: cleanedContent.substring(0, 300),
    firstChar: cleanedContent[0],
    lastChar: cleanedContent[cleanedContent.length - 1]
  })
  
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(cleanedContent)
    logger.debug('[EXTRACTION-PARSE] Direct parse successful', {
      parsedType: typeof parsed,
      isArray: Array.isArray(parsed),
      keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : []
    })
    return parsed
  } catch (parseError: any) {
    // Try to fix common JSON issues
    logger.debug('[EXTRACTION-PARSE] JSON parse error, attempting fixes', {
      error: parseError.message,
      contentLength: cleanedContent.length
    })
    
    try {
      // Apply fixes for common issues
      let fixed = cleanedContent
      
      // Fix trailing commas
      fixed = fixed
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas before } or ]
        .replace(/,(\s*,)/g, ',') // Remove duplicate commas
      
      // Fix control characters and unescaped quotes
      const isControlCharError = parseError.message.includes('control character')
      const isUnescapedQuoteError = parseError.message.includes("Expected ',' or '}' after property value") || 
                                    parseError.message.includes("Unterminated string") ||
                                    parseError.message.includes("Unexpected token")
      
      if (isControlCharError || isUnescapedQuoteError) {
        fixed = fixControlCharactersAndQuotes(fixed)
      }
      
      // Try parsing fixed version
      const parsed = JSON.parse(fixed)
      logger.debug('[EXTRACTION-PARSE] Parse successful after fixes')
      return parsed
    } catch (fixError: any) {
      // Try to salvage incomplete JSON
      if (fixError.message.includes('Unterminated string')) {
        const salvaged = salvageIncompleteJson(cleanedContent)
        if (salvaged) {
          try {
            return JSON.parse(salvaged)
          } catch {
            // Fall through to error
          }
        }
      }
      
      // If all else fails, log and throw
      logger.error('[EXTRACTION-PARSE] Failed to parse JSON after all fixes', {
        originalError: parseError.message,
        fixError: fixError.message,
        contentPreview: cleanedContent.substring(0, 500)
      })
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }
  }
}

/**
 * Extract JSON from markdown code blocks
 */
function extractJsonFromCodeBlock(content: string): string {
  const firstCodeBlockStart = content.indexOf('```')
  if (firstCodeBlockStart === -1) return content
  
  // Find the end of the opening marker (```json or just ```)
  let codeBlockStart = firstCodeBlockStart + 3 // Skip opening ```
  // Skip optional language identifier (json, etc.)
  while (codeBlockStart < content.length && 
         content[codeBlockStart] !== '\n' && 
         content[codeBlockStart] !== '`') {
    codeBlockStart++
  }
  // Skip newline if present
  if (codeBlockStart < content.length && content[codeBlockStart] === '\n') {
    codeBlockStart++
  }
  
  // Find the LAST closing ``` (in case there are multiple code blocks)
  let codeBlockEnd = content.lastIndexOf('```')
  if (codeBlockEnd !== -1 && codeBlockEnd > codeBlockStart) {
    // Extract content between code block markers
    return content.substring(codeBlockStart, codeBlockEnd).trim()
  } else {
    // No closing marker found - might be incomplete JSON
    return content.substring(codeBlockStart).trim()
  }
}

/**
 * Fix control characters and unescaped quotes in JSON
 */
function fixControlCharactersAndQuotes(content: string): string {
  let result = ''
  let inString = false
  let escapeNext = false
  let lastChar = ''
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const charCode = char.charCodeAt(0)
    
    // Handle escape sequences
    if (escapeNext) {
      result += char
      escapeNext = false
      lastChar = char
      continue
    }
    
    // Check for backslash (start of escape sequence)
    if (char === '\\') {
      result += char
      escapeNext = true
      lastChar = char
      continue
    }
    
    // Check for quote (start/end of string)
    if (char === '"') {
      if (inString) {
        // We're inside a string - check if this quote is a delimiter or content
        if (lastChar === '\\') {
          // Already escaped quote - keep as is
          result += char
        } else {
          // Check if this is the end of the string (followed by JSON structure markers)
          let isStringEnd = false
          let lookAheadPos = i + 1
          
          // Skip whitespace
          while (lookAheadPos < content.length && /\s/.test(content[lookAheadPos])) {
            lookAheadPos++
          }
          
          if (lookAheadPos < content.length) {
            const nextNonWhitespace = content[lookAheadPos]
            // Only treat as delimiter if followed by clear JSON structure markers
            if (nextNonWhitespace === ':' || nextNonWhitespace === ',' || 
                nextNonWhitespace === '}' || nextNonWhitespace === ']' ||
                nextNonWhitespace === '\n') {
              isStringEnd = true
            }
          } else {
            // End of content - this is the closing quote
            isStringEnd = true
          }
          
          if (isStringEnd) {
            // This is the string delimiter
            inString = false
            result += char
          } else {
            // This is an unescaped quote within string content - escape it
            result += '\\"'
          }
        }
      } else {
        // Outside string - this is a string delimiter
        inString = true
        result += char
      }
      lastChar = char
      continue
    }
    
    // If we're inside a string literal, escape control characters
    if (inString) {
      // Check for control characters (0x00-0x1F) except already escaped ones
      if (charCode >= 0x00 && charCode <= 0x1F) {
        // Escape common control characters
        if (char === '\n') {
          result += '\\n'
        } else if (char === '\r') {
          result += '\\r'
        } else if (char === '\t') {
          result += '\\t'
        } else if (char === '\b') {
          result += '\\b'
        } else if (char === '\f') {
          result += '\\f'
        } else {
          // Escape other control characters as Unicode
          result += '\\u' + ('0000' + charCode.toString(16)).slice(-4)
        }
      } else {
        result += char
      }
    } else {
      result += char
    }
    
    lastChar = char
  }
  
  return result
}

/**
 * Salvage incomplete JSON by closing incomplete strings and structures
 */
function salvageIncompleteJson(content: string): string | null {
  // Find the last incomplete string
  const lastQuoteIndex = content.lastIndexOf('"')
  if (lastQuoteIndex === -1) return null
  
  // Check if we're inside a string (odd number of quotes before this position)
  let quoteCount = 0
  for (let i = 0; i < lastQuoteIndex; i++) {
    if (content[i] === '"' && (i === 0 || content[i - 1] !== '\\')) {
      quoteCount++
    }
  }
  
  // If odd number of quotes, we're inside an incomplete string
  if (quoteCount % 2 === 1) {
    // Close the string
    let salvaged = content.substring(0, lastQuoteIndex + 1)
    
    // Close incomplete objects/arrays
    let openBraces = 0
    let openBrackets = 0
    for (let i = 0; i < salvaged.length; i++) {
      if (salvaged[i] === '{' && (i === 0 || salvaged[i - 1] !== '\\')) openBraces++
      if (salvaged[i] === '}' && (i === 0 || salvaged[i - 1] !== '\\')) openBraces--
      if (salvaged[i] === '[' && (i === 0 || salvaged[i - 1] !== '\\')) openBrackets++
      if (salvaged[i] === ']' && (i === 0 || salvaged[i - 1] !== '\\')) openBrackets--
    }
    
    // Close arrays first, then objects
    while (openBrackets > 0) {
      salvaged += ']'
      openBrackets--
    }
    while (openBraces > 0) {
      salvaged += '}'
      openBraces--
    }
    
    return salvaged
  }
  
  return null
}

/**
 * Coerce value to number if possible
 */
export function coerceNumber(value: any): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Coerce value to integer if possible
 */
export function coerceInteger(value: any): number | null {
  if (typeof value === 'number') return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Coerce value to array if it's not already
 */
export function coerceArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined) return []
  return [value]
}

/**
 * Normalize string (trim, lowercase)
 */
export function normalizeString(value: any): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

