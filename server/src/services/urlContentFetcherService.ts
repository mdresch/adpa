/**
 * URL Content Fetcher Service
 * 
 * Fetches content from URLs and converts it to Markdown for use as project context.
 * Handles HTML extraction, content cleaning, and Markdown conversion.
 * 
 * @module urlContentFetcherService
 */

import axios, { AxiosError } from 'axios'
import TurndownService from 'turndown'
import { logger } from '../utils/logger'

// Initialize Turndown for HTML → Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  codeBlockStyle: 'fenced'
})

// Configure Turndown to preserve more structure
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: (content) => `~~${content}~~`
})

export interface UrlFetchResult {
  content: string // Markdown content
  title: string
  metadata: {
    originalUrl: string
    fetchedAt: string
    contentType: string
    wordCount: number
    characterCount: number
    fetchDuration: number // milliseconds
  }
}

export interface UrlFetchOptions {
  timeout?: number // milliseconds, default 30000
  maxContentSize?: number // bytes, default 5MB
  userAgent?: string
  followRedirects?: boolean
}

/**
 * Validates URL to ensure it's safe to fetch
 */
function validateUrl(url: string): void {
  try {
    const urlObj = new URL(url)
    
    // Block localhost and private IPs
    const hostname = urlObj.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      throw new Error('URL points to localhost or private IP address')
    }
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed')
    }
  } catch (error: any) {
    if (error.message.includes('Invalid URL')) {
      throw new Error('Invalid URL format')
    }
    throw error
  }
}

/**
 * Extracts main content from HTML by removing navigation, ads, etc.
 * Uses simple heuristics since we don't have cheerio/jsdom
 */
function extractMainContent(html: string): { content: string; title: string } {
  // Remove script and style tags
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  
  // Remove common navigation elements
  content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  
  // Remove common ad/analytics elements
  content = content.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
  content = content.replace(/class="[^"]*ad[^"]*"/gi, '')
  content = content.replace(/id="[^"]*ad[^"]*"/gi, '')
  
  // Try to extract title
  const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled'
  
  // Try to find main content area
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  
  if (mainMatch) {
    content = mainMatch[1]
  } else if (articleMatch) {
    content = articleMatch[1]
  }
  
  return { content, title }
}

/**
 * Counts words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Fetches content from URL and converts to Markdown
 */
export class UrlContentFetcherService {
  /**
   * Fetch and convert URL content to Markdown
   */
  async fetchAndConvert(
    url: string,
    options: UrlFetchOptions = {}
  ): Promise<UrlFetchResult> {
    const startTime = Date.now()
    
    try {
      // Validate URL
      validateUrl(url)
      
      // Configure fetch options
      const timeout = options.timeout || 30000
      const maxContentSize = options.maxContentSize || 5 * 1024 * 1024 // 5MB default
      const userAgent = options.userAgent || 'Mozilla/5.0 (compatible; ADPA-ContextFetcher/1.0)'
      
      logger.info('Fetching URL content', { url, timeout })
      
      // Fetch HTML content
      const response = await axios.get(url, {
        timeout,
        maxContentLength: maxContentSize,
        maxBodyLength: maxContentSize,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        validateStatus: (status) => status >= 200 && status < 400,
        maxRedirects: options.followRedirects !== false ? 5 : 0,
      })
      
      if (response.data.length > maxContentSize) {
        throw new Error(`Content size (${response.data.length} bytes) exceeds maximum (${maxContentSize} bytes)`)
      }
      
      const contentType = response.headers['content-type'] || 'text/html'
      
      // Check if content is HTML
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        // If it's plain text, return as-is (converted to Markdown format)
        if (contentType.includes('text/plain')) {
          const text = typeof response.data === 'string' ? response.data : String(response.data)
          const wordCount = countWords(text)
          
          return {
            content: text,
            title: url.split('/').pop() || 'Untitled',
            metadata: {
              originalUrl: url,
              fetchedAt: new Date().toISOString(),
              contentType,
              wordCount,
              characterCount: text.length,
              fetchDuration: Date.now() - startTime,
            },
          }
        }
        
        throw new Error(`Unsupported content type: ${contentType}. Only HTML and plain text are supported.`)
      }
      
      // Extract main content and title
      const html = typeof response.data === 'string' ? response.data : String(response.data)
      const { content: mainContent, title } = extractMainContent(html)
      
      // Convert HTML to Markdown
      const markdown = turndownService.turndown(mainContent || html)
      
      if (!markdown || markdown.trim().length === 0) {
        throw new Error('Failed to extract meaningful content from URL')
      }
      
      const wordCount = countWords(markdown)
      const fetchDuration = Date.now() - startTime
      
      logger.info('URL content fetched and converted', {
        url,
        title,
        wordCount,
        characterCount: markdown.length,
        fetchDuration,
      })
      
      return {
        content: markdown,
        title: title || url.split('/').pop() || 'Untitled',
        metadata: {
          originalUrl: url,
          fetchedAt: new Date().toISOString(),
          contentType,
          wordCount,
          characterCount: markdown.length,
          fetchDuration,
        },
      }
    } catch (error: any) {
      const fetchDuration = Date.now() - startTime
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError
        
        if (axiosError.code === 'ECONNABORTED') {
          throw new Error(`Request timeout after ${options.timeout || 30000}ms`)
        }
        
        if (axiosError.response) {
          throw new Error(`HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`)
        }
        
        if (axiosError.request) {
          throw new Error('Network error: Unable to reach URL')
        }
      }
      
      logger.error('URL fetch failed', {
        url,
        error: error.message,
        fetchDuration,
      })
      
      throw new Error(`Failed to fetch URL: ${error.message}`)
    }
  }
  
  /**
   * Validate URL without fetching
   */
  async validateUrl(url: string): Promise<{ valid: boolean; error?: string }> {
    try {
      validateUrl(url)
      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }
}

// Export singleton instance
export const urlContentFetcherService = new UrlContentFetcherService()
