"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Globe, 
  Database, 
  Filter, 
  ArrowRight, 
  ExternalLink, 
  FileText,
  Clock,
  LayoutGrid,
  List,
  Loader2
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"
import { SearchResults } from "@/components/morphic/search-results"

export interface DiscoveryHubProps {
  mode?: 'search' | 'library'
}

export function DiscoveryHub({ mode = 'search' }: DiscoveryHubProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [source, setSource] = useState<'all' | 'internal' | 'external'>(mode === 'library' ? 'internal' : 'all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)
    try {
      const response: any = await apiClient.post('/search/discovery', { 
        query: mode === 'library' ? `${query} template pattern` : query, 
        source,
        limit: 12
      })
      
      // Adapt results to Morphic SearchResultItem format if needed
      const adaptedResults = response.data.results.map((r: any) => ({
        title: r.title,
        content: r.content,
        url: r.url || "#",
        source: r.source
      }))
      
      setResults(adaptedResults)
    } catch (error) {
      console.error("Discovery search failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-background/40 backdrop-blur-xl">
        <CardContent className="p-8">
          <div className="max-w-3xl mx-auto space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Project Discovery Hub
              </h2>
              <p className="text-muted-foreground">
                Semantic search across internal repositories, documentation, and industry benchmarks.
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search for domain knowledge, project patterns, or external best practices..."
                className="pl-12 pr-32 py-8 bg-background/50 border-primary/20 focus-visible:ring-primary rounded-2xl text-lg shadow-inner"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button type="submit" size="lg" className="rounded-xl px-6" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Discover"}
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-center space-x-4">
              <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
                <Button 
                  variant={source === 'all' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSource('all')}
                  className="rounded-md px-4"
                >
                  All Sources
                </Button>
                <Button 
                  variant={source === 'internal' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSource('internal')}
                  className="rounded-md px-4"
                >
                  <Database className="h-3.5 w-3.5 mr-2" />
                  Internal
                </Button>
                <Button 
                  variant={source === 'external' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSource('external')}
                  className="rounded-md px-4"
                >
                  <Globe className="h-3.5 w-3.5 mr-2" />
                  Web
                </Button>
              </div>
              
              <div className="w-px h-6 bg-border mx-2" />
              
              <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
                <Button 
                  variant={view === 'grid' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setView('grid')}
                  className="px-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                  variant={view === 'list' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setView('list')}
                  className="px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
              Discovery Results
              <Badge variant="secondary" className="ml-3 font-mono">{results.length}</Badge>
            </h3>
          </div>
          
          <div className={cn(
            "rounded-xl border border-primary/10 bg-background/40 backdrop-blur-md p-6 overflow-hidden",
            isLoading && "opacity-50 pointer-events-none grayscale transition-all"
          )}>
            <SearchResults 
              results={results} 
              displayMode={view} 
            />
          </div>
        </div>
      )}

      {results.length === 0 && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <Card className="bg-muted/10 border-dashed border-2 hover:bg-muted/20 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <h4 className="font-semibold text-sm">Documentation Benchmarks</h4>
              <p className="text-xs text-muted-foreground">Compare your project against internal process assets and PMBOK standards.</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/10 border-dashed border-2 hover:bg-muted/20 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
                <Database className="h-6 w-6 text-purple-500" />
              </div>
              <h4 className="font-semibold text-sm">Semantic Asset Registry</h4>
              <p className="text-xs text-muted-foreground">Find reusable templates, logic blocks, and architectures across past projects.</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/10 border-dashed border-2 hover:bg-muted/20 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-amber-500/10 rounded-full group-hover:bg-amber-500/20 transition-colors">
                <Globe className="h-6 w-6 text-amber-500" />
              </div>
              <h4 className="font-semibold text-sm">Market Intelligence</h4>
              <p className="text-xs text-muted-foreground">Pull real-time insights from across the web to inform project strategy.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
