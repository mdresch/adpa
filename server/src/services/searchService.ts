/**
 * Universal Search Service
 * Provides semantic and keyword search across projects, documents, templates, and users
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { ContextRetrievalService } from '../modules/contextRetrieval/contextRetrievalService'
import { getQdrantConfig } from '../modules/contextRetrieval/config/qdrantConfig'
import type { ContextRetrievalRequest } from '../modules/contextRetrieval/types'

export interface UniversalSearchRequest {
  query: string
  types?: string[] // Filter: ['portfolio','program','project','document','task','checklist_item','todo','template','user']
  frameworks?: string[]
  authors?: string[] // Filter by author names
  tags?: string[] // Filter by tags
  dateRange?: { start?: string; end?: string }
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'title'
  useSemanticSearch?: boolean // Default: true
  searchMode?: 'semantic' | 'keyword' | 'hybrid' // Search mode: semantic, keyword, or hybrid
}

export interface SearchResult {
  id: string
  type: 'portfolio' | 'program' | 'project' | 'document' | 'task' | 'checklist_item' | 'todo' | 'template' | 'user'
  title: string
  description: string
  content_preview: string
  author: string
  author_id: string
  created_at: string
  updated_at: string
  tags: string[]
  framework?: string
  status?: string
  relevance_score: number
  project_id?: string // For documents
  project_name?: string // For documents
}

const OPEN_TODO_STATUSES = new Set([
  'planned',
  'scheduled',
  'in-progress',
  'in_progress',
  'on-hold',
  'on_hold',
  'blocked',
  'pending',
  'open',
  'todo'
])

function isTodoStatus(status?: string): boolean {
  if (!status) return true
  return OPEN_TODO_STATUSES.has(status.toLowerCase())
}

export async function searchPortfolios(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    let query = `
      SELECT
        pg.id,
        pg.portfolio_name as title,
        pg.description,
        pg.status,
        pg.created_at,
        pg.updated_at,
        u.name as author,
        u.id as author_id
      FROM portfolio_governance pg
      LEFT JOIN users u ON pg.owner_id = u.id
      WHERE (pg.portfolio_name ILIKE $1 OR coalesce(pg.description, '') ILIKE $1)
        AND (
          pg.owner_id = $2
          OR pg.created_by = $2
          OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin')
        )
    `

    const params: any[] = [`%${request.query}%`, userId]
    let paramCount = 2

    if (request.authors && request.authors.length > 0) {
      paramCount++
      query += ` AND u.name = ANY($${paramCount}::text[])`
      params.push(request.authors)
    }

    if (request.dateRange?.start) {
      paramCount++
      query += ` AND pg.created_at >= $${paramCount}`
      params.push(request.dateRange.start)
    }

    if (request.dateRange?.end) {
      paramCount++
      query += ` AND pg.created_at <= $${paramCount}`
      params.push(request.dateRange.end)
    }

    query += ` ORDER BY pg.updated_at DESC LIMIT $${++paramCount}`
    params.push(request.limit || 20)

    const result = await pool.query(query, params)
    const queryLower = request.query.toLowerCase()

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'portfolio' as const,
      title: row.title || 'Untitled Portfolio',
      description: row.description || '',
      content_preview: (row.description || '').substring(0, 200),
      author: row.author || 'Unknown',
      author_id: row.author_id || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.status ? [row.status] : [],
      status: row.status,
      relevance_score: calculateKeywordRelevance(
        { title: row.title || '', description: row.description || '' },
        queryLower
      )
    }))
  } catch (error: any) {
    logger.error('[SEARCH-PORTFOLIOS] Search failed:', error)
    return []
  }
}

export async function searchPrograms(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    let query = `
      SELECT
        pr.id,
        pr.name as title,
        pr.description,
        pr.status,
        pr.created_at,
        pr.updated_at,
        u.name as author,
        u.id as author_id
      FROM programs pr
      LEFT JOIN users u ON pr.owner_id = u.id
      WHERE (pr.name ILIKE $1 OR coalesce(pr.description, '') ILIKE $1)
        AND (
          pr.owner_id = $2
          OR EXISTS (
            SELECT 1
            FROM projects p
            WHERE p.program_id = pr.id
              AND (
                p.owner_id = $2
                OR $2::text = ANY(SELECT jsonb_array_elements_text(p.team_members))
              )
          )
          OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin')
        )
    `

    const params: any[] = [`%${request.query}%`, userId]
    let paramCount = 2

    if (request.frameworks && request.frameworks.length > 0) {
      paramCount++
      query += `
        AND EXISTS (
          SELECT 1 FROM projects p2
          WHERE p2.program_id = pr.id
            AND p2.framework = ANY($${paramCount}::text[])
        )
      `
      params.push(request.frameworks)
    }

    if (request.authors && request.authors.length > 0) {
      paramCount++
      query += ` AND u.name = ANY($${paramCount}::text[])`
      params.push(request.authors)
    }

    if (request.dateRange?.start) {
      paramCount++
      query += ` AND pr.created_at >= $${paramCount}`
      params.push(request.dateRange.start)
    }

    if (request.dateRange?.end) {
      paramCount++
      query += ` AND pr.created_at <= $${paramCount}`
      params.push(request.dateRange.end)
    }

    query += ` ORDER BY pr.updated_at DESC LIMIT $${++paramCount}`
    params.push(request.limit || 20)

    const result = await pool.query(query, params)
    const queryLower = request.query.toLowerCase()

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'program' as const,
      title: row.title || 'Untitled Program',
      description: row.description || '',
      content_preview: (row.description || '').substring(0, 200),
      author: row.author || 'Unknown',
      author_id: row.author_id || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.status ? [row.status] : [],
      status: row.status,
      relevance_score: calculateKeywordRelevance(
        { title: row.title || '', description: row.description || '' },
        queryLower
      )
    }))
  } catch (error: any) {
    logger.error('[SEARCH-PROGRAMS] Search failed:', error)
    return []
  }
}

export async function searchProjectTasks(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    let query = `
      SELECT
        t.id,
        t.task_name as title,
        t.description,
        t.status,
        t.priority,
        t.phase,
        t.category,
        t.created_at,
        t.updated_at,
        p.id as project_id,
        p.name as project_name,
        p.framework,
        u.name as author,
        u.id as author_id
      FROM project_tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.task_name ILIKE $1 OR coalesce(t.description, '') ILIKE $1 OR coalesce(t.wbs_code, '') ILIKE $1)
        AND (
          p.owner_id = $2
          OR $2::text = ANY(SELECT jsonb_array_elements_text(p.team_members))
          OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin')
        )
    `

    const params: any[] = [`%${request.query}%`, userId]
    let paramCount = 2

    if (request.frameworks && request.frameworks.length > 0) {
      paramCount++
      query += ` AND p.framework = ANY($${paramCount}::text[])`
      params.push(request.frameworks)
    }

    if (request.authors && request.authors.length > 0) {
      paramCount++
      query += ` AND u.name = ANY($${paramCount}::text[])`
      params.push(request.authors)
    }

    if (request.dateRange?.start) {
      paramCount++
      query += ` AND t.created_at >= $${paramCount}`
      params.push(request.dateRange.start)
    }

    if (request.dateRange?.end) {
      paramCount++
      query += ` AND t.created_at <= $${paramCount}`
      params.push(request.dateRange.end)
    }

    query += ` ORDER BY t.updated_at DESC LIMIT $${++paramCount}`
    params.push(request.limit || 20)

    const result = await pool.query(query, params)
    const queryLower = request.query.toLowerCase()

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'task' as const,
      title: row.title || 'Untitled Task',
      description: row.description || '',
      content_preview: (row.description || '').substring(0, 200),
      author: row.author || 'Unknown',
      author_id: row.author_id || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: [row.priority, row.phase, row.category].filter(Boolean),
      framework: row.framework,
      status: row.status,
      project_id: row.project_id,
      project_name: row.project_name,
      relevance_score: calculateKeywordRelevance(
        { title: row.title || '', description: row.description || '' },
        queryLower
      )
    }))
  } catch (error: any) {
    logger.error('[SEARCH-TASKS] Search failed:', error)
    return []
  }
}

export async function searchChecklistItems(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    let query = `
      SELECT
        ci.id,
        ci.item_name as title,
        ci.description,
        CASE
          WHEN ci.is_completed = TRUE THEN 'completed'
          WHEN ci.is_blocked = TRUE THEN 'blocked'
          ELSE 'pending'
        END as status,
        ci.priority,
        ci.category,
        ci.created_at,
        ci.updated_at,
        t.id as task_id,
        t.task_name,
        p.id as project_id,
        p.name as project_name,
        p.framework,
        COALESCE(au.name, u.name) as author,
        COALESCE(au.id, u.id) as author_id
      FROM checklist_items ci
      JOIN project_tasks t ON ci.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON ci.created_by = u.id
      LEFT JOIN users au ON ci.assigned_user_id = au.id
      WHERE (ci.item_name ILIKE $1 OR coalesce(ci.description, '') ILIKE $1)
        AND (
          p.owner_id = $2
          OR $2::text = ANY(SELECT jsonb_array_elements_text(p.team_members))
          OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin')
        )
    `

    const params: any[] = [`%${request.query}%`, userId]
    let paramCount = 2

    if (request.frameworks && request.frameworks.length > 0) {
      paramCount++
      query += ` AND p.framework = ANY($${paramCount}::text[])`
      params.push(request.frameworks)
    }

    if (request.authors && request.authors.length > 0) {
      paramCount++
      query += ` AND COALESCE(au.name, u.name) = ANY($${paramCount}::text[])`
      params.push(request.authors)
    }

    if (request.dateRange?.start) {
      paramCount++
      query += ` AND ci.created_at >= $${paramCount}`
      params.push(request.dateRange.start)
    }

    if (request.dateRange?.end) {
      paramCount++
      query += ` AND ci.created_at <= $${paramCount}`
      params.push(request.dateRange.end)
    }

    query += ` ORDER BY ci.updated_at DESC LIMIT $${++paramCount}`
    params.push(request.limit || 20)

    const result = await pool.query(query, params)
    const queryLower = request.query.toLowerCase()

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'checklist_item' as const,
      title: row.title || 'Untitled Checklist Item',
      description: row.description || '',
      content_preview: `${row.task_name || 'Task'} • ${(row.description || '').substring(0, 160)}`,
      author: row.author || 'Unknown',
      author_id: row.author_id || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: [row.priority, row.category].filter(Boolean),
      framework: row.framework,
      status: row.status,
      project_id: row.project_id,
      project_name: row.project_name,
      relevance_score: calculateKeywordRelevance(
        { title: row.title || '', description: row.description || '' },
        queryLower
      )
    }))
  } catch (error: any) {
    logger.error('[SEARCH-CHECKLIST] Search failed:', error)
    return []
  }
}

export async function searchTodos(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    const [tasks, checklistItems] = await Promise.all([
      searchProjectTasks({ ...request, limit: Math.max(request.limit || 20, 50) }, userId),
      searchChecklistItems({ ...request, limit: Math.max(request.limit || 20, 50) }, userId)
    ])

    const taskTodos = tasks
      .filter(task => isTodoStatus(task.status))
      .map(task => ({
        ...task,
        id: `todo-task-${task.id}`,
        type: 'todo' as const,
        title: `[Task] ${task.title}`,
        content_preview: task.content_preview || task.description,
        tags: [...task.tags, 'task']
      }))

    const checklistTodos = checklistItems
      .filter(item => isTodoStatus(item.status))
      .map(item => ({
        ...item,
        id: `todo-checklist-${item.id}`,
        type: 'todo' as const,
        title: `[Checklist] ${item.title}`,
        content_preview: item.content_preview || item.description,
        tags: [...item.tags, 'checklist']
      }))

    return [...taskTodos, ...checklistTodos]
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, request.limit || 20)
  } catch (error: any) {
    logger.error('[SEARCH-TODOS] Search failed:', error)
    return []
  }
}

// Initialize ContextRetrievalService with default config
// Include Qdrant if configured
const qdrantConfig = getQdrantConfig()
const contextRetrieval = new ContextRetrievalService(
  {
    model: 'text-embedding-ada-002',
    embeddingDimensions: 1536,
    similarityThreshold: 0.3,
    maxTokens: 8000,
    temperature: 0,
    topK: 50,
    includeContext: true,
    useCache: true,
    cacheExpiry: 3600
  },
  {
    weights: {
      semanticSimilarity: 0.6,
      keywordMatch: 0.4,
      freshness: 0.1,
      authority: 0.2,
      popularity: 0.1,
      userPreference: 0.1,
      contextRelevance: 0.1
    },
    normalization: {
      minScore: 0,
      maxScore: 1,
      boostFactors: {}
    },
    thresholds: {
      highRelevance: 0.8,
      mediumRelevance: 0.5,
      lowRelevance: 0.3
    }
  },
  qdrantConfig || undefined
)

/**
 * Search projects using semantic or keyword search
 */
export async function searchProjects(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    let query = `
      SELECT 
        p.id,
        p.name as title,
        p.description,
        p.status,
        p.framework,
        p.created_at,
        p.updated_at,
        u.name as author,
        u.id as author_id
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE (
        p.owner_id = $1 
        OR $1::text = ANY(SELECT jsonb_array_elements_text(p.team_members))
        OR EXISTS (SELECT 1 FROM users WHERE id = $1 AND role = 'admin')
      )
    `
    
    const params: any[] = [userId]
    let paramCount = 1
    
    // Always filter by query (semantic search will rerank, but we still need initial filtering)
    if (request.query && request.query.trim()) {
      paramCount++
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
      params.push(`%${request.query}%`)
    }
    
    // Framework filter
    if (request.frameworks && request.frameworks.length > 0) {
      paramCount++
      query += ` AND p.framework = ANY($${paramCount}::text[])`
      params.push(request.frameworks)
    }
    
    // Author filter
    if (request.authors && request.authors.length > 0) {
      paramCount++
      query += ` AND u.name = ANY($${paramCount}::text[])`
      params.push(request.authors)
    }
    
    // Date range filter
    if (request.dateRange?.start) {
      paramCount++
      query += ` AND p.created_at >= $${paramCount}`
      params.push(request.dateRange.start)
    }
    if (request.dateRange?.end) {
      paramCount++
      query += ` AND p.created_at <= $${paramCount}`
      params.push(request.dateRange.end)
    }
    
    query += ` ORDER BY p.updated_at DESC LIMIT $${++paramCount}`
    params.push(request.limit || 20)
    
    const result = await pool.query(query, params)
    
    // Transform to SearchResult format
    let projects = result.rows.map(row => ({
      id: row.id,
      type: 'project' as const,
      title: row.title || 'Untitled Project',
      description: row.description || '',
      content_preview: (row.description || '').substring(0, 200),
      author: row.author || 'Unknown',
      author_id: row.author_id || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: [], // Projects don't have tags column
      framework: row.framework,
      status: row.status,
      relevance_score: 0.5 // Will be calculated below
    }))
    
    // Calculate relevance scores
    if (projects.length > 0 && request.query && request.query.trim()) {
      const queryLower = request.query.toLowerCase()
      const searchMode = request.searchMode || (request.useSemanticSearch ? 'semantic' : 'keyword')
      
      if (searchMode === 'hybrid') {
        // Hybrid mode: combine semantic and keyword scores
        projects = projects.map(project => {
          const keywordScore = calculateKeywordRelevance(project, queryLower)
          const semanticScore = keywordScore // For now, use keyword as semantic proxy (will be enhanced later)
          const recencyBoost = calculateRecencyBoost(project.updated_at)
          const frameworkMatch = request.frameworks?.includes(project.framework) || false
          
          return {
            ...project,
            relevance_score: calculateHybridScore(semanticScore, keywordScore, recencyBoost, frameworkMatch)
          }
        })
      } else if (searchMode === 'semantic' || request.useSemanticSearch) {
        // Semantic search (currently using keyword as proxy)
        projects = projects.map(project => ({
          ...project,
          relevance_score: calculateKeywordRelevance(project, queryLower)
        }))
      } else {
        // Keyword search
        projects = projects.map(project => ({
          ...project,
          relevance_score: calculateKeywordRelevance(project, queryLower)
        }))
      }
    } else {
      // No query or no results - set default relevance
      projects = projects.map(project => ({
        ...project,
        relevance_score: 0.5
      }))
    }
    
    // Apply tag filter if specified
    if (request.tags && request.tags.length > 0) {
      projects = projects.filter(project => 
        project.tags.some(tag => request.tags!.includes(tag))
      )
    }
    
    return projects
    
  } catch (error: any) {
    logger.error('[SEARCH-PROJECTS] Search failed:', error)
    return []
  }
}

/**
 * Search documents using semantic search (RAG-powered) or keyword search
 */
export async function searchDocuments(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    // Use semantic search if enabled
    if (request.useSemanticSearch) {
      // Get user's projects for context
      const userProjectsResult = await pool.query(
        `SELECT id FROM projects WHERE owner_id = $1 OR $1::text = ANY(SELECT jsonb_array_elements_text(team_members))`,
        [userId]
      )
      const projectIds = userProjectsResult.rows.map((r: any) => r.id)
      
      if (projectIds.length === 0) {
        return []
      }
      
      // Search across all user's projects
      const allResults: SearchResult[] = []
      
      for (const projectId of projectIds.slice(0, 10)) { // Limit to 10 projects for performance
        try {
          const chunks = await contextRetrieval.searchChunks({
            projectId,
            query: request.query,
            topK: Math.floor((request.limit || 20) / projectIds.length) || 5
          })
          
          // Get document metadata for each chunk
          const documentIds = [...new Set(chunks.map(c => c.document_id))]
          
          if (documentIds.length > 0) {
            let docsQuery = `
              SELECT 
                d.id,
                d.title,
                d.content,
                d.status,
                d.framework,
                d.created_at,
                d.updated_at,
                d.project_id,
                p.name as project_name,
                u.name as author,
                u.id as author_id
              FROM documents d
              LEFT JOIN projects p ON d.project_id = p.id
              LEFT JOIN users u ON d.created_by = u.id
              WHERE d.id = ANY($1::uuid[])
                AND d.deleted_at IS NULL
            `
            const docsParams: any[] = [documentIds]
            let docsParamCount = 1
            
            // Apply framework filter
            if (request.frameworks && request.frameworks.length > 0) {
              docsParamCount++
              docsQuery += ` AND d.framework = ANY($${docsParamCount}::text[])`
              docsParams.push(request.frameworks)
            }
            
            // Apply author filter
            if (request.authors && request.authors.length > 0) {
              docsParamCount++
              docsQuery += ` AND u.name = ANY($${docsParamCount}::text[])`
              docsParams.push(request.authors)
            }
            
            const docsResult = await pool.query(docsQuery, docsParams)
            
            const docsMap = new Map(docsResult.rows.map((r: any) => [r.id, r]))
            
            // Convert chunks to search results
            const docResults = chunks.map(chunk => {
              const doc = docsMap.get(chunk.document_id)
              if (!doc) return null
              
              return {
                id: chunk.document_id,
                type: 'document' as const,
                title: chunk.title || doc.title || 'Untitled Document',
                description: doc.content?.substring(0, 150) || '',
                content_preview: chunk.content.substring(0, 200),
                author: doc.author || 'Unknown',
                author_id: doc.author_id || '',
                created_at: doc.created_at,
                updated_at: doc.updated_at,
                tags: [],
                framework: doc.framework,
                status: doc.status,
                relevance_score: chunk.score,
                project_id: doc.project_id,
                project_name: doc.project_name
              }
            }).filter((r): r is SearchResult => r !== null)
            
            allResults.push(...docResults)
          }
        } catch (error: any) {
          logger.warn(`[SEARCH-DOCUMENTS] Failed to search project ${projectId}:`, error.message)
        }
      }
      
      // Deduplicate by document ID
      const uniqueResults = Array.from(
        new Map(allResults.map(r => [r.id, r])).values()
      )
      
      // Apply hybrid scoring if needed
      const searchMode = request.searchMode || (request.useSemanticSearch ? 'semantic' : 'keyword')
      if (searchMode === 'hybrid') {
        const queryLower = request.query.toLowerCase()
        uniqueResults.forEach(result => {
          const keywordScore = calculateKeywordRelevance(
            { title: result.title, description: result.description },
            queryLower
          )
          const semanticScore = result.relevance_score // Already calculated from semantic search
          const recencyBoost = calculateRecencyBoost(result.updated_at)
          const frameworkMatch = request.frameworks?.includes(result.framework) || false
          
          result.relevance_score = calculateHybridScore(
            semanticScore,
            keywordScore,
            recencyBoost,
            frameworkMatch
          )
        })
      }
      
      // Sort by relevance
      uniqueResults.sort((a, b) => b.relevance_score - a.relevance_score)
      
      // Apply tag filter if specified
      let filteredResults = uniqueResults
      if (request.tags && request.tags.length > 0) {
        filteredResults = uniqueResults.filter(result => 
          result.tags.some(tag => request.tags!.includes(tag))
        )
      }
      
      return filteredResults.slice(0, request.limit || 20)
    }
    
    // Fallback: Keyword search
    let query = `
      SELECT 
        d.id,
        d.title,
        d.content,
        d.status,
        d.framework,
        d.created_at,
        d.updated_at,
        d.project_id,
        p.name as project_name,
        u.name as author,
        u.id as author_id
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.deleted_at IS NULL
        AND (d.title ILIKE $1 OR d.content ILIKE $1)
        AND (
          d.project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = $2 
            OR $2::text = ANY(SELECT jsonb_array_elements_text(team_members))
          )
          OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin')
        )
    `
    
    const params: any[] = [
      `%${request.query}%`,
      userId
    ]
    let paramCount = 2
    
    // Framework filter
    if (request.frameworks && request.frameworks.length > 0) {
      paramCount++
      query += ` AND d.framework = ANY($${paramCount}::text[])`
      params.push(request.frameworks)
    }
    
    // Author filter
    if (request.authors && request.authors.length > 0) {
      paramCount++
      query += ` AND u.name = ANY($${paramCount}::text[])`
      params.push(request.authors)
    }
    
    query += ` ORDER BY d.updated_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
    params.push(request.limit || 20)
    params.push(request.offset || 0)
    
    const result = await pool.query(query, params)
    
    const queryLower = request.query.toLowerCase()
    const searchMode = request.searchMode || 'keyword'
    
    let results = result.rows.map((row: any) => {
      const keywordScore = calculateKeywordRelevance(
        { title: row.title || '', description: row.content || '' },
        queryLower
      )
      
      let relevanceScore = keywordScore
      if (searchMode === 'hybrid') {
        // For keyword search fallback, hybrid uses keyword + recency + framework
        const recencyBoost = calculateRecencyBoost(row.updated_at)
        const frameworkMatch = request.frameworks?.includes(row.framework) || false
        relevanceScore = calculateHybridScore(keywordScore, keywordScore, recencyBoost, frameworkMatch)
      }
      
      return {
        id: row.id,
        type: 'document' as const,
        title: row.title || 'Untitled Document',
        description: (row.content || '').substring(0, 150),
        content_preview: (row.content || '').substring(0, 200),
        author: row.author || 'Unknown',
        author_id: row.author_id || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags: [],
        framework: row.framework,
        status: row.status,
        relevance_score: relevanceScore,
        project_id: row.project_id,
        project_name: row.project_name
      }
    })
    
    // Apply tag filter if specified
    if (request.tags && request.tags.length > 0) {
      results = results.filter(result => 
        result.tags.some(tag => request.tags!.includes(tag))
      )
    }
    
    return results
    
  } catch (error: any) {
    logger.error('[SEARCH-DOCUMENTS] Search failed:', error)
    return []
  }
}

/**
 * Search templates
 */
export async function searchTemplates(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    let query = `
      SELECT 
        t.id,
        t.name as title,
        t.description,
        t.framework,
        t.category,
        t.created_at,
        t.updated_at,
        u.name as author,
        u.id as author_id
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.deleted_at IS NULL
    `
    
    const params: any[] = []
    let paramCount = 0
    
    if (!request.useSemanticSearch) {
      paramCount++
      query += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`
      params.push(`%${request.query}%`)
    }
    
    if (request.frameworks && request.frameworks.length > 0) {
      paramCount++
      query += ` AND t.framework = ANY($${paramCount}::text[])`
      params.push(request.frameworks)
    }
    
    // Author filter
    if (request.authors && request.authors.length > 0) {
      paramCount++
      query += ` AND u.name = ANY($${paramCount}::text[])`
      params.push(request.authors)
    }
    
    query += ` ORDER BY t.updated_at DESC LIMIT $${++paramCount}`
    params.push(request.limit || 20)
    
    const result = await pool.query(query, params)
    
    const queryLower = request.query.toLowerCase()
    const searchMode = request.searchMode || (request.useSemanticSearch ? 'semantic' : 'keyword')
    
    let results = result.rows.map((row: any) => {
      const keywordScore = calculateKeywordRelevance(
        { title: row.title || '', description: row.description || '' },
        queryLower
      )
      
      let relevanceScore = keywordScore
      if (searchMode === 'hybrid') {
        const recencyBoost = calculateRecencyBoost(row.updated_at)
        const frameworkMatch = request.frameworks?.includes(row.framework) || false
        relevanceScore = calculateHybridScore(keywordScore, keywordScore, recencyBoost, frameworkMatch)
      } else if (request.useSemanticSearch) {
        relevanceScore = 0.5 // Placeholder for semantic
      }
      
      return {
        id: row.id,
        type: 'template' as const,
        title: row.title || 'Untitled Template',
        description: row.description || '',
        content_preview: (row.description || '').substring(0, 200),
        author: row.author || 'Unknown',
        author_id: row.author_id || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags: row.category ? [row.category] : [],
        framework: row.framework,
        relevance_score: relevanceScore
      }
    })
    
    // Apply tag filter if specified
    if (request.tags && request.tags.length > 0) {
      results = results.filter(result => 
        result.tags.some(tag => request.tags!.includes(tag))
      )
    }
    
    return results
    
  } catch (error: any) {
    logger.error('[SEARCH-TEMPLATES] Search failed:', error)
    return []
  }
}

/**
 * Search users
 */
export async function searchUsers(
  request: UniversalSearchRequest,
  userId: string
): Promise<SearchResult[]> {
  try {
    const query = `
      SELECT 
        u.id,
        u.name as title,
        u.email,
        u.role,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.is_active = true
        AND (u.name ILIKE $1 OR u.email ILIKE $1)
      ORDER BY u.name ASC
      LIMIT $2
    `
    
    const result = await pool.query(query, [
      `%${request.query}%`,
      request.limit || 20
    ])
    
    const queryLower = request.query.toLowerCase()
    const searchMode = request.searchMode || 'keyword'
    
    let results = result.rows.map((row: any) => {
      const keywordScore = calculateKeywordRelevance(
        { title: row.title || '', description: row.email || '' },
        queryLower
      )
      
      let relevanceScore = keywordScore
      if (searchMode === 'hybrid') {
        const recencyBoost = calculateRecencyBoost(row.updated_at)
        relevanceScore = calculateHybridScore(keywordScore, keywordScore, recencyBoost, false)
      }
      
      return {
        id: row.id,
        type: 'user' as const,
        title: row.title || row.email || 'Unknown User',
        description: row.email || '',
        content_preview: `Role: ${row.role || 'user'}`,
        author: row.title || row.email || 'Unknown',
        author_id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags: row.role ? [row.role] : [],
        status: row.role,
        relevance_score: relevanceScore
      }
    })
    
    // Apply tag filter if specified
    if (request.tags && request.tags.length > 0) {
      results = results.filter(result => 
        result.tags.some(tag => request.tags!.includes(tag))
      )
    }
    
    return results
    
  } catch (error: any) {
    logger.error('[SEARCH-USERS] Search failed:', error)
    return []
  }
}

/**
 * Calculate semantic relevance score for results
 */
async function calculateSemanticRelevance(
  results: SearchResult[],
  query: string,
  entityType: string
): Promise<SearchResult[]> {
  try {
    // For now, use simple keyword-based relevance
    // Full semantic scoring would require embedding generation for each result
    const queryLower = query.toLowerCase()
    
    return results.map(result => ({
      ...result,
      relevance_score: calculateKeywordRelevance(result, queryLower)
    }))
  } catch (error: any) {
    logger.error('[SEARCH] Semantic relevance calculation failed:', error)
    return results.map(r => ({ ...r, relevance_score: 0.5 }))
  }
}

/**
 * Calculate keyword-based relevance score
 */
function calculateKeywordRelevance(
  item: { title: string; description?: string },
  queryLower: string
): number {
  const titleLower = item.title.toLowerCase()
  const descLower = (item.description || '').toLowerCase()
  
  let score = 0
  
  // Exact title match
  if (titleLower === queryLower) {
    score += 1.0
  }
  // Title starts with query
  else if (titleLower.startsWith(queryLower)) {
    score += 0.8
  }
  // Title contains query
  else if (titleLower.includes(queryLower)) {
    score += 0.6
  }
  // Description contains query
  else if (descLower.includes(queryLower)) {
    score += 0.4
  }
  
  // Word matches
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
  const titleWords = titleLower.split(/\s+/)
  const descWords = descLower.split(/\s+/)
  
  queryWords.forEach(word => {
    if (titleWords.includes(word)) score += 0.2
    if (descWords.includes(word)) score += 0.1
  })
  
  return Math.min(1.0, score)
}

/**
 * Calculate recency boost (0-1 scale, favors newer content)
 */
function calculateRecencyBoost(updatedAt: string): number {
  const now = Date.now()
  const updated = new Date(updatedAt).getTime()
  const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24)
  
  // Boost decreases over time
  // 0 days = 1.0, 30 days = 0.5, 90 days = 0.1, 365+ days = 0.0
  if (daysSinceUpdate <= 7) return 1.0
  if (daysSinceUpdate <= 30) return 0.8
  if (daysSinceUpdate <= 90) return 0.5
  if (daysSinceUpdate <= 180) return 0.3
  if (daysSinceUpdate <= 365) return 0.1
  return 0.0
}

/**
 * Calculate hybrid search score combining multiple signals
 * Formula: (0.6 × Semantic) + (0.2 × Keyword) + (0.1 × Recency) + (0.1 × Framework Match)
 */
function calculateHybridScore(
  semanticScore: number,
  keywordScore: number,
  recencyBoost: number,
  frameworkMatch: boolean
): number {
  const semanticWeight = 0.6
  const keywordWeight = 0.2
  const recencyWeight = 0.1
  const frameworkWeight = 0.1
  
  return (
    semanticWeight * semanticScore +
    keywordWeight * keywordScore +
    recencyWeight * recencyBoost +
    frameworkWeight * (frameworkMatch ? 1 : 0)
  )
}

