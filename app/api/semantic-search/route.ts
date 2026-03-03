import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils'
import { searchDocuments, type UniversalSearchRequest } from '@/server/src/services/searchService'
import { connectDatabase } from '@/server/src/database/connection'
import { logger } from '@/server/src/utils/logger'

type SearchMode = 'semantic' | 'keyword' | 'hybrid'

function toSearchMode(value: string | null): SearchMode {
  if (value === 'semantic' || value === 'keyword' || value === 'hybrid') {
    return value
  }
  return 'hybrid'
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  // Initialize database connection (safe to call multiple times)
  await connectDatabase()

  try {
    const body = await req.json()
    const query = typeof body?.query === 'string' ? body.query.trim() : ''

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const limitRaw = Number(body?.limit)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20
    const searchMode = toSearchMode(typeof body?.searchMode === 'string' ? body.searchMode : null)

    const request: UniversalSearchRequest = {
      query,
      limit,
      useSemanticSearch: searchMode !== 'keyword',
      searchMode,
      frameworks: Array.isArray(body?.frameworks) ? body.frameworks : undefined,
      authors: Array.isArray(body?.authors) ? body.authors : undefined,
      dateRange: body?.dateRange,
      tags: Array.isArray(body?.tags) ? body.tags : undefined,
    }

    const results = await searchDocuments(request, user.id)

    return NextResponse.json({
      results,
      meta: {
        mode: searchMode,
        total: results.length,
      },
    })
  } catch (error: any) {
    logger.error('[SEMANTIC-SEARCH] Failed:', error)
    return NextResponse.json({ error: error.message || 'Failed to search' }, { status: 500 })
  }
}
