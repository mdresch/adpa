"use client"

import { useState, useEffect } from "react"
import { Search, Github } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Repository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
  html_url: string
  owner: {
    login: string
    avatar_url: string
  }
}

interface RepositorySelectorProps {
  apiToken: string
  onSelect: (repo: Repository) => void
  selectedRepo?: Repository
}

export function RepositorySelector({ apiToken, onSelect, selectedRepo }: RepositorySelectorProps) {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (apiToken) {
      fetchUserRepositories()
    }
  }, [apiToken])

  const fetchUserRepositories = async () => {
    if (!apiToken) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=10", {
        headers: {
          Authorization: `token ${apiToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      setRepositories(data)
    } catch (error) {
      console.error("Failed to fetch repositories:", error)
      setError("Failed to fetch repositories. Please check your API token.")
    } finally {
      setLoading(false)
    }
  }

  const searchRepositories = async () => {
    if (!apiToken || !searchQuery.trim()) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `token ${apiToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      setRepositories(data.items)
    } catch (error) {
      console.error("Failed to search repositories:", error)
      setError("Failed to search repositories. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchRepositories()
  }

  const handleSelect = (repo: Repository) => {
    onSelect(repo)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !apiToken}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </form>

      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : repositories.length > 0 ? (
          repositories.map((repo) => (
            <Card
              key={repo.id}
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                selectedRepo?.id === repo.id ? "border-primary" : ""
              }`}
              onClick={() => handleSelect(repo)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden">
                      <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium">{repo.full_name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {repo.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={repo.private ? "secondary" : "default"}>
                      {repo.private ? "Private" : "Public"}
                    </Badge>
                    {selectedRepo?.id === repo.id && (
                      <Badge variant="outline" className="bg-primary/10 border-primary">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <Github className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Repositories Found</h3>
            <p className="text-muted-foreground">
              {apiToken
                ? "Search for repositories or check your access permissions"
                : "Enter your GitHub API token to view repositories"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
