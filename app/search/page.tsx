"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Folder,
  Settings,
  Clock,
  Tag,
  Star,
  Eye,
  Download,
  Share,
  MoreHorizontal,
  ChevronRight,
  X,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { getApiUrl } from "@/lib/api-url"
import { toast } from '@/lib/notify'
import { debounce } from "lodash"
import { SkeletonLine } from "@/components/ui/skeleton"

interface SearchResult {
  id: string
  type: "project" | "document" | "template" | "user"
  title: string
  description: string
  content_preview: string
  author: string
  created_at: string
  updated_at: string
  tags: string[]
  framework?: string
  status?: string
  relevance_score: number
  project_id?: string // For documents
  project_name?: string // For documents
}

interface SearchFilters {
  type: string[]
  framework: string[]
  author: string[]
  date_range: {
    start?: string
    end?: string
  }
  tags: string[]
}

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth()
  const { isConnected } = useWebSocket()
  const router = useRouter()
  
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    type: [],
    framework: [],
    author: [],
    date_range: {},
    tags: [],
  })
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("relevance")
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchMode, setSearchMode] = useState<"semantic" | "keyword" | "hybrid">("semantic")
  const [showHistory, setShowHistory] = useState(false)
  const [searchHistory, setSearchHistory] = useState<Array<{query: string, timestamp: number, filters?: SearchFilters}>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<{
    autocomplete: string[]
    popular: string[]
    recent: string[]
  }>({
    autocomplete: [],
    popular: [],
    recent: []
  })
  const [suggestionIndex, setSuggestionIndex] = useState(-1)
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null)
  
  // Filter options from API - start empty to prevent hydration mismatch
  const [availableFrameworks, setAvailableFrameworks] = useState<string[]>([])
  const [availableAuthors, setAvailableAuthors] = useState<Array<{id: string, name: string, email: string}>>([])
  const [filtersLoaded, setFiltersLoaded] = useState(false)

  // Save search to history (defined early so it can be used in performSearch)
  const saveToHistory = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return
    
    try {
      const historyItem = {
        query: searchQuery.trim(),
        timestamp: Date.now(),
        filters: searchFilters
      }
      
      // Remove duplicates and add to front
      setSearchHistory(prev => {
        const updatedHistory = [
          historyItem,
          ...prev.filter(h => h.query !== historyItem.query)
        ].slice(0, 20) // Keep last 20
        localStorage.setItem('search_history', JSON.stringify(updatedHistory))
        return updatedHistory
      })
    } catch (error) {
      console.error('[SEARCH] Failed to save search history:', error)
    }
  }, [])

  const performSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      // Don't search if query is empty and no filters
      if (!searchQuery.trim() && activeFilters.length === 0) {
        console.log('[SEARCH] Empty query, clearing results')
        setResults([])
        setTotalResults(0)
        setLoading(false)
        return
      }

      // Require minimum query length
      if (searchQuery.trim().length < 2) {
        console.log('[SEARCH] Query too short, clearing results')
        setResults([])
        setTotalResults(0)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Real API call
        const token = localStorage.getItem('auth_token')
        if (!token) {
          console.error('[SEARCH] No auth token')
          toast.error('Authentication required')
          setLoading(false)
          return
        }

        const searchUrl = getApiUrl('/search')
        console.log('[SEARCH] ====== NEW SEARCH ======')
        console.log('[SEARCH] Calling API:', searchUrl)
        console.log('[SEARCH] Query:', searchQuery)
        console.log('[SEARCH] Mode:', searchMode)
        console.log('[SEARCH] Filters:', searchFilters)
        
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            query: searchQuery,
            types: searchFilters.type.length > 0 ? searchFilters.type : undefined,
            frameworks: searchFilters.framework.length > 0 ? searchFilters.framework : undefined,
            authors: searchFilters.author.length > 0 ? searchFilters.author : undefined,
            tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
            dateRange: Object.keys(searchFilters.date_range).length > 0 ? searchFilters.date_range : undefined,
            limit: 50,
            offset: (currentPage - 1) * 50,
            sortBy,
            useSemanticSearch: searchMode === 'semantic' || searchMode === 'hybrid',
            searchMode: searchMode
          })
        })
        
        console.log('[SEARCH] Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[SEARCH] Error response:', errorText)
          let errorData = {}
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // Not JSON, use text as message
          }
          throw new Error((errorData as any).message || `Search request failed: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('[SEARCH] Response data:', data)
        console.log('[SEARCH] Results count:', data.results?.length || 0)
        console.log('[SEARCH] First result:', data.results?.[0])
        
        if (data.success && data.results) {
          // Results are already filtered by the API
          const filteredResults = data.results || []
          
          console.log('[SEARCH] ✅ Setting results:', filteredResults.length, 'results')
          console.log('[SEARCH] Results:', filteredResults)
          setResults(filteredResults)
          setTotalResults(data.total || filteredResults.length)
          
          // Store searchId for tracking clicks
          if ((data as any).searchId) {
            setCurrentSearchId((data as any).searchId)
          }
          
          // Save to search history
          saveToHistory(searchQuery, searchFilters)
          
          // Show cache hit notification
          if (data.cached) {
            toast.success('Results loaded from cache', { duration: 2000 })
          }
        } else {
          console.error('[SEARCH] ❌ API returned unsuccessful response:', data)
          throw new Error(data.error || 'Search failed')
        }
        
      } catch (error: any) {
        console.error('[SEARCH] ❌ Search failed:', error)
        console.error('[SEARCH] Error details:', {
          message: error.message,
          stack: error.stack
        })
        toast.error(error.message || "Search failed. Please try again.")
        setResults([])
        setTotalResults(0)
      } finally {
        setLoading(false)
      }
    }, 300),
    [sortBy, activeFilters, currentPage, searchMode, saveToHistory]
  )

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('search_history')
      if (saved) {
        const history = JSON.parse(saved)
        setSearchHistory(history.slice(0, 20)) // Keep last 20 searches
        // Update recent suggestions from history
        setSuggestions(prev => ({
          ...prev,
          recent: history.slice(0, 5).map((h: any) => h.query)
        }))
      }
    } catch (error) {
      console.error('[SEARCH] Failed to load search history:', error)
    }
  }, [])

  // Fetch search suggestions
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.trim().length < 1) {
        // Show popular and recent when query is empty
        setSuggestions(prev => ({
          ...prev,
          autocomplete: []
        }))
        setShowSuggestions(true)
        return
      }

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const suggestionsUrl = getApiUrl(`/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=10`)
        const response = await fetch(suggestionsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.suggestions) {
            setSuggestions({
              autocomplete: data.suggestions.autocomplete || [],
              popular: data.suggestions.popular || [],
              recent: searchHistory.slice(0, 5).map(h => h.query)
            })
            setShowSuggestions(true)
            setSuggestionIndex(-1)
          }
        }
      } catch (error) {
        console.error('[SEARCH] Failed to fetch suggestions:', error)
      }
    }, 200),
    [searchHistory]
  )


  // Load search from history
  const loadFromHistory = useCallback((historyItem: {query: string, filters?: SearchFilters}) => {
    setQuery(historyItem.query)
    if (historyItem.filters) {
      setFilters(historyItem.filters)
      // Update active filters
      const active: string[] = []
      Object.entries(historyItem.filters).forEach(([key, value]) => {
        if (key === 'date_range') return
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => active.push(`${key}:${v}`))
        }
      })
      setActiveFilters(active)
    }
    setShowHistory(false)
  }, [])

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([])
    localStorage.removeItem('search_history')
    setShowHistory(false)
  }, [])

  // Load popular suggestions on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const loadPopularSuggestions = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const suggestionsUrl = getApiUrl('/search/suggestions?limit=10')
        const response = await fetch(suggestionsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.suggestions) {
            setSuggestions(prev => ({
              ...prev,
              popular: data.suggestions.popular || []
            }))
          }
        }
      } catch (error) {
        console.error('[SEARCH] Failed to load popular suggestions:', error)
      }
    }

    loadPopularSuggestions()
  }, [])

  // Load filter options on mount (client-side only to prevent hydration issues)
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return
    
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[SEARCH] Auth still loading, waiting...')
      return
    }
    
    // If no user after loading, still try to load filters (might be public endpoint or token in apiClient)
    if (!user) {
      console.log('[SEARCH] No user found, but attempting to load filters anyway (might have token in apiClient)')
    }
    
    const loadFilterOptions = async () => {
      try {
        console.log('[SEARCH] Fetching filter options (public endpoint, no auth required)')
        try {
          // Try apiClient first (handles auth automatically if available)
          const data = await apiClient.get('/search/filters')
          
          console.log('[SEARCH] Filter API response data:', data)
          
          if (data.success && data.frameworks !== undefined) {
            console.log('[SEARCH] ✅ Loaded filter options:', {
              frameworks: data.frameworks?.length || 0,
              authors: data.authors?.length || 0,
              frameworksList: data.frameworks,
              authorsList: data.authors
            })
            setAvailableFrameworks(data.frameworks || [])
            setAvailableAuthors(data.authors || [])
            setFiltersLoaded(true)
          } else {
            console.error('[SEARCH] ❌ Filter API returned unexpected format:', data)
            setFiltersLoaded(true) // Still mark as loaded to prevent infinite loading
          }
        } catch (apiError: any) {
          console.error('[SEARCH] ❌ Failed to load filter options via apiClient:', apiError)
          // Fallback to fetch (no auth required - public endpoint)
          try {
            const response = await fetch(getApiUrl('/search/filters'), {
              headers: {
                'Content-Type': 'application/json'
              }
            })
            
            if (response.ok) {
              const fetchData = await response.json()
              if (fetchData.success) {
                console.log('[SEARCH] ✅ Loaded filters via fetch fallback:', {
                  frameworks: fetchData.frameworks?.length || 0,
                  authors: fetchData.authors?.length || 0
                })
                setAvailableFrameworks(fetchData.frameworks || [])
                setAvailableAuthors(fetchData.authors || [])
                setFiltersLoaded(true)
                return
              }
            } else {
              console.error('[SEARCH] ❌ Fetch fallback failed with status:', response.status)
            }
          } catch (fetchError) {
            console.error('[SEARCH] ❌ Fetch fallback also failed:', fetchError)
          }
          setFiltersLoaded(true) // Still mark as loaded to prevent infinite loading
        }
      } catch (error: any) {
        console.error('[SEARCH] ❌ Error loading filter options:', error)
        setFiltersLoaded(true) // Still mark as loaded to prevent infinite loading
      }
    }

    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      loadFilterOptions()
    }, 100)

    return () => clearTimeout(timer)
  }, [user, authLoading]) // Re-run when user or auth loading state changes

  useEffect(() => {
    performSearch(query, filters)
  }, [query, filters, performSearch])

  const addFilter = (type: keyof SearchFilters, value: string) => {
    if (type === "date_range") return // Handle separately
    
    const currentValues = filters[type] as string[]
    if (!currentValues.includes(value)) {
      setFilters({
        ...filters,
        [type]: [...currentValues, value],
      })
      setActiveFilters([...activeFilters, `${type}:${value}`])
    }
  }

  const removeFilter = (filterKey: string) => {
    const [type, value] = filterKey.split(":")
    const currentValues = filters[type as keyof SearchFilters] as string[]
    
    setFilters({
      ...filters,
      [type]: currentValues.filter(v => v !== value),
    })
    setActiveFilters(activeFilters.filter(f => f !== filterKey))
  }

  const clearAllFilters = () => {
    setFilters({
      type: [],
      framework: [],
      author: [],
      date_range: {},
      tags: [],
    })
    setActiveFilters([])
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "project": return <Folder className="h-4 w-4" />
      case "document": return <FileText className="h-4 w-4" />
      case "template": return <Settings className="h-4 w-4" />
      case "user": return <User className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getResultColor = (type: string) => {
    switch (type) {
      case "project": return "text-blue-500"
      case "document": return "text-green-500"
      case "template": return "text-purple-500"
      case "user": return "text-orange-500"
      default: return "text-gray-500"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Track result click
  const trackResultClick = async (result: SearchResult, position: number, actionType: 'view' | 'download' | 'share' = 'view') => {
    if (!currentSearchId) return
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      await fetch(getApiUrl('/search/track-click'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          searchId: currentSearchId,
          resultId: result.id,
          resultType: result.type,
          resultTitle: result.title,
          resultPosition: position,
          relevanceScore: result.relevance_score,
          actionType
        })
      })
    } catch (error) {
      console.error('[SEARCH] Failed to track result click:', error)
    }
  }

  const handleResultClick = (result: SearchResult, position: number) => {
    // Track click
    trackResultClick(result, position, 'view')
    
    switch (result.type) {
      case "project":
        router.push(`/projects/${result.id}`)
        break
      case "document":
        if (result.project_id) {
          router.push(`/projects/${result.project_id}/documents/${result.id}`)
        } else {
          router.push(`/documents/${result.id}`)
        }
        break
      case "template":
        router.push(`/templates/${result.id}`)
        break
      case "user":
        router.push(`/users/${result.id}`)
        break
    }
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <Search className="h-8 w-8 text-blue-500" />
                      Advanced Search
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Search across projects, documents, templates, and users
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-muted-foreground">
                      {isConnected ? 'Live search' : 'Offline'}
                    </span>
                  </div>
                </motion.div>

                {/* Search Bar */}
                <AnimatedCard>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search projects, documents, templates, and users..."
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value)
                            setShowHistory(false)
                            fetchSuggestions(e.target.value)
                          }}
                          onFocus={() => {
                            if (query.length === 0 && searchHistory.length > 0) {
                              setShowHistory(true)
                            } else if (query.length > 0) {
                              setShowSuggestions(true)
                            }
                          }}
                          onBlur={() => {
                            // Delay to allow click on suggestion
                            setTimeout(() => {
                              setShowHistory(false)
                              setShowSuggestions(false)
                            }, 200)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const totalSuggestions = [
                                ...suggestions.autocomplete,
                                ...(query.length === 0 ? [...suggestions.popular, ...suggestions.recent] : [])
                              ].length
                              if (totalSuggestions > 0) {
                                setSuggestionIndex(prev => 
                                  prev < totalSuggestions - 1 ? prev + 1 : prev
                                )
                                setShowSuggestions(true)
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              setSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
                            } else if (e.key === 'Enter' && suggestionIndex >= 0) {
                              e.preventDefault()
                              const allSuggestions = [
                                ...suggestions.autocomplete,
                                ...(query.length === 0 ? [...suggestions.popular, ...suggestions.recent] : [])
                              ]
                              if (allSuggestions[suggestionIndex]) {
                                setQuery(allSuggestions[suggestionIndex])
                                setShowSuggestions(false)
                                setSuggestionIndex(-1)
                              }
                            } else if (e.key === 'Escape') {
                              setShowSuggestions(false)
                              setShowHistory(false)
                              setSuggestionIndex(-1)
                            }
                          }}
                          className="pl-10 pr-4 py-3 text-lg"
                        />
                        {/* Search Suggestions Dropdown */}
                        {(showSuggestions || showHistory) && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                            {/* Autocomplete Suggestions */}
                            {showSuggestions && query.length > 0 && suggestions.autocomplete.length > 0 && (
                              <>
                                <div className="p-2 border-b">
                                  <span className="text-xs font-medium text-muted-foreground">Suggestions</span>
                                </div>
                                {suggestions.autocomplete.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    onClick={async () => {
                                      // Track suggestion click
                                      try {
                                        const token = localStorage.getItem('auth_token')
                                        if (token) {
                                          await fetch(getApiUrl('/search/track-suggestion'), {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({
                                              suggestionText: suggestion,
                                              suggestionType: 'autocomplete',
                                              queryBefore: query,
                                              queryAfter: suggestion
                                            })
                                          })
                                        }
                                      } catch (error) {
                                        console.error('[SEARCH] Failed to track suggestion click:', error)
                                      }
                                      
                                      setQuery(suggestion)
                                      setShowSuggestions(false)
                                      setSuggestionIndex(-1)
                                    }}
                                    className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 ${
                                      suggestionIndex === idx ? 'bg-muted' : ''
                                    }`}
                                  >
                                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{suggestion}</span>
                                  </button>
                                ))}
                              </>
                            )}
                            
                            {/* Popular Searches (when query is empty) */}
                            {showSuggestions && query.length === 0 && suggestions.popular.length > 0 && (
                              <>
                                <div className="p-2 border-b flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">Popular Searches</span>
                                </div>
                                {suggestions.popular.map((suggestion, idx) => {
                                  const absoluteIdx = idx
                                  return (
                                    <button
                                      key={idx}
                                      onClick={async () => {
                                        // Track suggestion click
                                        try {
                                          const token = localStorage.getItem('auth_token')
                                          if (token) {
                                            await fetch(getApiUrl('/search/track-suggestion'), {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                              },
                                              body: JSON.stringify({
                                                suggestionText: suggestion,
                                                suggestionType: 'popular',
                                                queryBefore: '',
                                                queryAfter: suggestion
                                              })
                                            })
                                          }
                                        } catch (error) {
                                          console.error('[SEARCH] Failed to track suggestion click:', error)
                                        }
                                        
                                        setQuery(suggestion)
                                        setShowSuggestions(false)
                                        setSuggestionIndex(-1)
                                      }}
                                      className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 ${
                                        suggestionIndex === absoluteIdx ? 'bg-muted' : ''
                                      }`}
                                    >
                                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                      <span className="truncate">{suggestion}</span>
                                    </button>
                                  )
                                })}
                              </>
                            )}
                            
                            {/* Recent Searches */}
                            {(showHistory || (showSuggestions && query.length === 0)) && searchHistory.length > 0 && (
                              <>
                                <div className="p-2 border-b flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation()
                                      clearHistory()
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Clear
                                  </Button>
                                </div>
                                {searchHistory.map((item, idx) => {
                                  const absoluteIdx = suggestions.popular.length + idx
                                  return (
                                    <button
                                      key={idx}
                                      onClick={async () => {
                                        // Track suggestion click
                                        try {
                                          const token = localStorage.getItem('auth_token')
                                          if (token) {
                                            await fetch(getApiUrl('/search/track-suggestion'), {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                              },
                                              body: JSON.stringify({
                                                suggestionText: item.query,
                                                suggestionType: 'recent',
                                                queryBefore: query,
                                                queryAfter: item.query
                                              })
                                            })
                                          }
                                        } catch (error) {
                                          console.error('[SEARCH] Failed to track suggestion click:', error)
                                        }
                                        
                                        loadFromHistory(item)
                                        setShowSuggestions(false)
                                        setShowHistory(false)
                                        setSuggestionIndex(-1)
                                      }}
                                      className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between group ${
                                        suggestionIndex === absoluteIdx ? 'bg-muted' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate">{item.query}</span>
                                      </div>
                                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                      </span>
                                    </button>
                                  )
                                })}
                              </>
                            )}
                            
                            {/* Empty State */}
                            {showSuggestions && query.length > 0 && suggestions.autocomplete.length === 0 && (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No suggestions found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="date">Date Modified</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={searchMode} onValueChange={(value: "semantic" | "keyword" | "hybrid") => setSearchMode(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semantic">🧠 Semantic</SelectItem>
                          <SelectItem value="keyword">🔤 Keyword</SelectItem>
                          <SelectItem value="hybrid">⚡ Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Active Filters */}
                    {activeFilters.length > 0 && (
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">Active filters:</span>
                        {activeFilters.map((filter) => (
                          <Badge key={filter} variant="secondary" className="flex items-center gap-1">
                            {filter.replace(":", ": ")}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeFilter(filter)}
                            />
                          </Badge>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-xs"
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Filters Sidebar */}
                  <div className="lg:col-span-1 space-y-4">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Filter className="h-5 w-5" />
                          Filters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Content Type Filter */}
                        <div>
                          <Label className="text-sm font-medium">Content Type</Label>
                          <div className="mt-2 space-y-2">
                            {["project", "document", "template", "user"].map((type) => (
                              <Button
                                key={type}
                                variant={filters.type.includes(type) ? "default" : "outline"}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => addFilter("type", type)}
                              >
                                {getResultIcon(type)}
                                <span className="ml-2 capitalize">{type}s</span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Framework Filter */}
                        <div>
                          <Label className="text-sm font-medium">Framework</Label>
                          {!filtersLoaded ? (
                            <div className="mt-2 text-sm text-muted-foreground">Loading frameworks...</div>
                          ) : availableFrameworks.length > 0 ? (
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                              {availableFrameworks.map((framework) => (
                                <Button
                                  key={framework}
                                  variant={filters.framework.includes(framework) ? "default" : "outline"}
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => addFilter("framework", framework)}
                                >
                                  {framework}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-muted-foreground">No frameworks available</div>
                          )}
                        </div>

                        {/* Author Filter */}
                        <div>
                          <Label className="text-sm font-medium">Author</Label>
                          {!filtersLoaded ? (
                            <div className="mt-2 text-sm text-muted-foreground">Loading authors...</div>
                          ) : availableAuthors.length > 0 ? (
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                              {availableAuthors.map((author) => (
                                <Button
                                  key={author.id}
                                  variant={filters.author.includes(author.name) ? "default" : "outline"}
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => addFilter("author", author.name)}
                                >
                                  <User className="h-4 w-4" />
                                  <span className="ml-2">{author.name}</span>
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-muted-foreground">No authors available</div>
                          )}
                        </div>

                        {/* Tag Filter */}
                        <div>
                          <Label className="text-sm font-medium">Tags</Label>
                          {results.length > 0 ? (() => {
                            const availableTags = Array.from(
                              new Set(results.flatMap(r => r.tags))
                            ).sort()
                            return availableTags.length > 0 ? (
                              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                {availableTags.map((tag) => (
                                  <Button
                                    key={tag}
                                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => addFilter("tags", tag)}
                                  >
                                    <Tag className="h-4 w-4" />
                                    <span className="ml-2">{tag}</span>
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 text-sm text-muted-foreground">No tags found</div>
                            )
                          })() : (
                            <div className="mt-2 text-sm text-muted-foreground">Search to see tags</div>
                          )}
                        </div>

                        {/* Date Range Presets */}
                        <div>
                          <Label className="text-sm font-medium">Date Range</Label>
                          <div className="mt-2 space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                const end = new Date().toISOString()
                                const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                                setFilters({
                                  ...filters,
                                  date_range: { start, end }
                                })
                                setActiveFilters([...activeFilters.filter(f => !f.startsWith('date_range:')), 'date_range:last7days'])
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="ml-2">Last 7 days</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                const end = new Date().toISOString()
                                const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                                setFilters({
                                  ...filters,
                                  date_range: { start, end }
                                })
                                setActiveFilters([...activeFilters.filter(f => !f.startsWith('date_range:')), 'date_range:last30days'])
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="ml-2">Last 30 days</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                const end = new Date().toISOString()
                                const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
                                setFilters({
                                  ...filters,
                                  date_range: { start, end }
                                })
                                setActiveFilters([...activeFilters.filter(f => !f.startsWith('date_range:')), 'date_range:last90days'])
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="ml-2">Last 90 days</span>
                            </Button>
                            {Object.keys(filters.date_range).length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={() => {
                                  setFilters({
                                    ...filters,
                                    date_range: {}
                                  })
                                  setActiveFilters(activeFilters.filter(f => !f.startsWith('date_range:')))
                                }}
                              >
                                Clear date filter
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </div>

                  {/* Search Results */}
                  <div className="lg:col-span-3 space-y-4">
                    {/* Results Header */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {loading ? "Searching..." : `${totalResults} results found`}
                      </div>
                    </div>

                    {/* Results List */}
                    <div className="space-y-4">
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i: any) => (
                            <Card key={i} className="animate-pulse">
                              <CardContent className="p-6">
                                        <div className="space-y-3">
                                          <SkeletonLine className="w-3/4" />
                                          <SkeletonLine className="w-1/2" />
                                          <SkeletonLine className="w-full" />
                                          <SkeletonLine className="w-2/3" />
                                        </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : results.length > 0 ? (
                        results.map((result, idx) => (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card 
                              className="hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => handleResultClick(result, idx + 1)}
                            >
                              <CardContent className="p-6">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={getResultColor(result.type)}>
                                        {getResultIcon(result.type)}
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
                                          {result.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                          {result.description}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="capitalize">
                                        {result.type}
                                      </Badge>
                                      {result.framework && (
                                        <Badge variant="secondary">
                                          {result.framework}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {result.content_preview}
                                  </p>

                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {result.author}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Updated {formatDate(result.updated_at)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {result.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Star className={`h-3 w-3 ${result.relevance_score > 0.7 ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                                      Relevance: {Math.round(result.relevance_score * 100)}%
                                      {searchMode === 'semantic' && result.relevance_score > 0.8 && (
                                        <Badge variant="secondary" className="ml-2 text-xs">High Match</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation()
                                          trackResultClick(result, idx + 1, 'view')
                                          handleResultClick(result, idx + 1)
                                        }}
                                        title="View"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      {result.type === 'document' && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation()
                                            trackResultClick(result, idx + 1, 'download')
                                            // Download document
                                            if (result.project_id) {
                                              window.open(`/api/documents/${result.id}/download`, '_blank')
                                            }
                                          }}
                                          title="Download"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation()
                                          trackResultClick(result, idx + 1, 'share')
                                          // Copy link to clipboard
                                          const url = result.type === 'document' && result.project_id
                                            ? `${window.location.origin}/projects/${result.project_id}/documents/${result.id}`
                                            : result.type === 'project'
                                            ? `${window.location.origin}/projects/${result.id}`
                                            : result.type === 'template'
                                            ? `${window.location.origin}/templates/${result.id}`
                                            : `${window.location.origin}/users/${result.id}`
                                          navigator.clipboard.writeText(url)
                                          toast.success('Link copied to clipboard')
                                        }}
                                        title="Share"
                                      >
                                        <Share className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))
                      ) : (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No results found</h3>
                            <p className="text-muted-foreground">
                              Try adjusting your search terms or filters to find what you're looking for.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
