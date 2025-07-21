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
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { debounce } from "lodash"

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
  const { user } = useAuth()
  const { isConnected } = useWebSocket()
  
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

  // Mock data for demonstration
  const mockResults: SearchResult[] = [
    {
      id: "1",
      type: "project",
      title: "Enterprise Architecture Modernization",
      description: "Comprehensive modernization of legacy systems using TOGAF framework",
      content_preview: "This project aims to modernize our enterprise architecture by implementing TOGAF best practices...",
      author: "John Smith",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-20T15:30:00Z",
      tags: ["modernization", "legacy", "enterprise"],
      framework: "TOGAF",
      status: "active",
      relevance_score: 0.95,
    },
    {
      id: "2",
      type: "document",
      title: "Security Architecture Guidelines",
      description: "Comprehensive security guidelines for enterprise applications",
      content_preview: "These guidelines provide a framework for implementing security controls across all enterprise applications...",
      author: "Sarah Johnson",
      created_at: "2024-01-10T09:00:00Z",
      updated_at: "2024-01-18T11:45:00Z",
      tags: ["security", "guidelines", "compliance"],
      framework: "SABSA",
      relevance_score: 0.87,
    },
    {
      id: "3",
      type: "template",
      title: "Business Capability Assessment Template",
      description: "Template for assessing business capabilities and maturity",
      content_preview: "This template helps organizations assess their current business capabilities and identify areas for improvement...",
      author: "Mike Davis",
      created_at: "2024-01-05T14:20:00Z",
      updated_at: "2024-01-12T16:10:00Z",
      tags: ["assessment", "capabilities", "business"],
      framework: "TOGAF",
      relevance_score: 0.82,
    },
  ]

  const performSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim() && activeFilters.length === 0) {
        setResults([])
        setTotalResults(0)
        return
      }

      try {
        setLoading(true)
        
        // Mock search - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 500))
        
        let filteredResults = mockResults.filter(result => {
          const matchesQuery = !searchQuery.trim() || 
            result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.content_preview.toLowerCase().includes(searchQuery.toLowerCase())
          
          const matchesType = searchFilters.type.length === 0 || searchFilters.type.includes(result.type)
          const matchesFramework = searchFilters.framework.length === 0 || 
            (result.framework && searchFilters.framework.includes(result.framework))
          const matchesAuthor = searchFilters.author.length === 0 || searchFilters.author.includes(result.author)
          
          return matchesQuery && matchesType && matchesFramework && matchesAuthor
        })

        // Sort results
        if (sortBy === "relevance") {
          filteredResults.sort((a, b) => b.relevance_score - a.relevance_score)
        } else if (sortBy === "date") {
          filteredResults.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        } else if (sortBy === "title") {
          filteredResults.sort((a, b) => a.title.localeCompare(b.title))
        }

        setResults(filteredResults)
        setTotalResults(filteredResults.length)
        
      } catch (error) {
        console.error("Search failed:", error)
        toast.error("Search failed")
      } finally {
        setLoading(false)
      }
    }, 300),
    [sortBy, activeFilters]
  )

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
                          onChange={(e) => setQuery(e.target.value)}
                          className="pl-10 pr-4 py-3 text-lg"
                        />
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
                          <div className="mt-2 space-y-2">
                            {["TOGAF", "SABSA", "ZACHMAN", "FEAF"].map((framework) => (
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
                        </div>

                        {/* Author Filter */}
                        <div>
                          <Label className="text-sm font-medium">Author</Label>
                          <div className="mt-2 space-y-2">
                            {["John Smith", "Sarah Johnson", "Mike Davis"].map((author) => (
                              <Button
                                key={author}
                                variant={filters.author.includes(author) ? "default" : "outline"}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => addFilter("author", author)}
                              >
                                <User className="h-4 w-4" />
                                <span className="ml-2">{author}</span>
                              </Button>
                            ))}
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
                          {[1, 2, 3].map((i) => (
                            <Card key={i} className="animate-pulse">
                              <CardContent className="p-6">
                                <div className="space-y-3">
                                  <div className="h-4 bg-muted rounded w-3/4"></div>
                                  <div className="h-3 bg-muted rounded w-1/2"></div>
                                  <div className="h-3 bg-muted rounded w-full"></div>
                                  <div className="h-3 bg-muted rounded w-2/3"></div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : results.length > 0 ? (
                        results.map((result) => (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

                                  <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Star className="h-3 w-3" />
                                      Relevance: {Math.round(result.relevance_score * 100)}%
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="sm">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm">
                                        <Share className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
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
