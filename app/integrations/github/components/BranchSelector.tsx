"use client"

import { useState, useEffect } from "react"
import { GitBranch, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Branch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

interface BranchSelectorProps {
  apiToken: string
  owner: string
  repo: string
  onSelect: (branch: Branch) => void
  selectedBranch?: Branch
  defaultBranch?: string
}

export function BranchSelector({ 
  apiToken, 
  owner, 
  repo, 
  onSelect, 
  selectedBranch,
  defaultBranch = "main"
}: BranchSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (apiToken && owner && repo) {
      fetchBranches()
    }
  }, [apiToken, owner, repo])

  const fetchBranches = async () => {
    if (!apiToken || !owner || !repo) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
        headers: {
          Authorization: `token ${apiToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      setBranches(data)

      // Auto-select default branch if no branch is selected
      if (!selectedBranch && data.length > 0) {
        const defaultBranchObj = data.find((b: Branch) => b.name === defaultBranch) || data[0]
        onSelect(defaultBranchObj)
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error)
      setError("Failed to fetch branches. Please check your repository access.")
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (branch: Branch) => {
    onSelect(branch)
    setOpen(false)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <div className="text-sm text-muted-foreground">Loading branches...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedBranch ? (
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                {selectedBranch.name}
                {selectedBranch.protected && (
                  <Badge variant="secondary" className="text-xs">
                    Protected
                  </Badge>
                )}
              </div>
            ) : (
              "Select branch..."
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search branches..." />
            <CommandEmpty>No branches found.</CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.name}
                  value={branch.name}
                  onSelect={() => handleSelect(branch)}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedBranch?.name === branch.name ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <GitBranch className="h-4 w-4" />
                    <span>{branch.name}</span>
                    {branch.name === defaultBranch && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {branch.protected && (
                      <Badge variant="secondary" className="text-xs">
                        Protected
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedBranch && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">Latest commit:</span>
                <span className="ml-2 font-mono text-muted-foreground">
                  {selectedBranch.commit.sha.substring(0, 7)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedBranch.name === defaultBranch && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}
                {selectedBranch.protected && (
                  <Badge variant="secondary" className="text-xs">
                    Protected
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
