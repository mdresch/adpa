import aiSearchRAGService from '../../services/aiSearchRAGService'
import type { SearchResult } from '../../services/searchService'
import GKGEnrichedSearchService from '../../services/gkgEnrichedSearch'
import {
  searchPortfolios,
  searchPrograms,
  searchProjects,
  searchDocuments,
  searchProjectTasks,
  searchChecklistItems,
  searchTodos,
  searchTemplates,
  searchUsers,
  searchKnowledgeBase
} from '../../services/searchService'

jest.mock('../../services/searchService', () => ({
  searchPortfolios: jest.fn(),
  searchPrograms: jest.fn(),
  searchProjects: jest.fn(),
  searchDocuments: jest.fn(),
  searchProjectTasks: jest.fn(),
  searchChecklistItems: jest.fn(),
  searchTodos: jest.fn(),
  searchTemplates: jest.fn(),
  searchUsers: jest.fn(),
  searchKnowledgeBase: jest.fn()
}))

jest.mock('../../services/gkgEnrichedSearch', () => ({
  __esModule: true,
  default: {
    enrichResults: jest.fn(),
    getSuggestedFollowUps: jest.fn()
  }
}))

jest.mock('../../services/aiService', () => ({
  aiService: {
    generateWithFallback: jest.fn()
  }
}))

const mockedSearchProjects = searchProjects as jest.MockedFunction<typeof searchProjects>
const mockedSearchDocuments = searchDocuments as jest.MockedFunction<typeof searchDocuments>
const mockedSearchPortfolios = searchPortfolios as jest.MockedFunction<typeof searchPortfolios>
const mockedSearchPrograms = searchPrograms as jest.MockedFunction<typeof searchPrograms>
const mockedSearchTasks = searchProjectTasks as jest.MockedFunction<typeof searchProjectTasks>
const mockedSearchChecklistItems = searchChecklistItems as jest.MockedFunction<typeof searchChecklistItems>
const mockedSearchTodos = searchTodos as jest.MockedFunction<typeof searchTodos>
const mockedSearchTemplates = searchTemplates as jest.MockedFunction<typeof searchTemplates>
const mockedSearchUsers = searchUsers as jest.MockedFunction<typeof searchUsers>
const mockedSearchKnowledgeBase = searchKnowledgeBase as jest.MockedFunction<typeof searchKnowledgeBase>
const mockedGkgService = GKGEnrichedSearchService as jest.Mocked<typeof GKGEnrichedSearchService>

function buildResult(overrides: Partial<SearchResult>): SearchResult {
  return {
    id: overrides.id ?? 'result-1',
    type: overrides.type ?? 'project',
    title: overrides.title ?? 'Untitled',
    description: overrides.description ?? 'Description',
    content_preview: overrides.content_preview ?? 'Preview',
    author: overrides.author ?? 'Author',
    author_id: overrides.author_id ?? 'author-1',
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    tags: overrides.tags ?? [],
    framework: overrides.framework,
    status: overrides.status,
    relevance_score: overrides.relevance_score ?? 0.5,
    project_id: overrides.project_id,
    project_name: overrides.project_name
  }
}

describe('aiSearchRAGService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSearchPortfolios.mockResolvedValue([])
    mockedSearchPrograms.mockResolvedValue([])
    mockedSearchProjects.mockResolvedValue([])
    mockedSearchDocuments.mockResolvedValue([])
    mockedSearchTasks.mockResolvedValue([])
    mockedSearchChecklistItems.mockResolvedValue([])
    mockedSearchTodos.mockResolvedValue([])
    mockedSearchTemplates.mockResolvedValue([])
    mockedSearchUsers.mockResolvedValue([])
    mockedSearchKnowledgeBase.mockResolvedValue([])
    mockedGkgService.enrichResults.mockImplementation(async results => results as any)
    mockedGkgService.getSuggestedFollowUps.mockResolvedValue(['follow up'])
  })

  it('filters stale items when requested, scores results, and enforces prompt token budgets', async () => {
    const fresh = buildResult({
      id: 'fresh-project',
      title: 'Fresh Project',
      description: 'Fresh and complete context',
      content_preview: 'A detailed preview with enough content to be useful.',
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      relevance_score: 0.75
    })

    const stale = buildResult({
      id: 'stale-project',
      title: 'Stale Project',
      description: 'This item should be filtered when stale content is excluded.',
      content_preview: 'Old preview',
      updated_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      relevance_score: 0.99
    })

    const limited = buildResult({
      id: 'limited-project',
      title: 'Limited Project',
      description: '',
      content_preview: '',
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      relevance_score: 0.7
    })

    mockedSearchProjects.mockResolvedValue([fresh, stale, limited])

    const response = await aiSearchRAGService.assembleContext({
      query: 'project context',
      types: ['project'],
      includeStale: false,
      maxContextItems: 3,
      maxPromptTokens: 120,
      limit: 10
    }, 'user-1')

    expect(response.totalResults).toBe(2)
    expect(response.results.map(result => result.id)).toEqual(['fresh-project', 'limited-project'])
    expect(response.sources.length).toBeGreaterThanOrEqual(1)
    expect(response.sources[0]).toMatchObject({
      id: 'fresh-project',
      isFresh: true
    })
    expect(response.sources.map(source => source.id)).toEqual(expect.arrayContaining(['fresh-project']))
    expect(response.results[0].compositeScore).toBeGreaterThan(response.results[1].compositeScore)
    expect(response.results[1].validationWarnings).toContain('limited_content')
    expect(response.metrics.filteredOutCount).toBe(1)
    expect(response.metrics.staleItemCount).toBe(1)
    expect(response.metrics.tokenBudget).toBe(120)
    expect(response.metrics.tokenCount).toBeLessThanOrEqual(120)
    expect(response.metrics.truncationApplied).toBe(true)
    expect(response.contextPrompt).toContain('Fresh Project')
    expect(response.contextPrompt).not.toContain('Stale Project')
  })
})
