"use client"

import { useState, useEffect } from "react"
import { 
  Folder, 
  File, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Download,
  Eye,
  Calendar,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GitHubContent {
  name: string
  path: string
  sha: string
  size: number
  type: "file" | "dir" | "symlink" | "submodule"
  content?: string
  encoding?: string
  download_url?: string
  html_url: string
  git_url: string
  url: string
}

interface FileExplorerProps {
  apiToken: string
  owner: string
  repo: string
  branch?: string
  initialPath?: string
  onFileSelect?: (file: GitHubContent) => void
  showPreview?: boolean
}

interface TreeNode extends GitHubContent {
  children?: TreeNode[]
  expanded?: boolean
  loading?: boolean
}

export function FileExplorer({ 
  apiToken, 
  owner, 
  repo, 
  branch = "main",
  initialPath = "",
  onFileSelect,
  showPreview = true
}: FileExplorerProps) {
  const [loading, setLoading] = useState(false)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [selectedFile, setSelectedFile] = useState<GitHubContent | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (apiToken && owner && repo) {
      loadDirectory(initialPath)
    }
  }, [apiToken, owner, repo, branch, initialPath])

  const loadDirectory = async (path: string = "", parentNode?: TreeNode) => {
    if (!apiToken || !owner || !repo) return

    try {
      setLoading(!parentNode) // Only show main loading for root
      if (parentNode) {
        parentNode.loading = true
        setTree([...tree])
      }
      setError(null)

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ""}`
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${apiToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      const contents = Array.isArray(data) ? data : [data]

      // Sort: directories first, then files
      const sortedContents = contents.sort((a, b) => {
        if (a.type === "dir" && b.type !== "dir") return -1
        if (a.type !== "dir" && b.type === "dir") return 1
        return a.name.localeCompare(b.name)
      })

      if (parentNode) {
        parentNode.children = sortedContents
        parentNode.expanded = true
        parentNode.loading = false
        setTree([...tree])
      } else {
        setTree(sortedContents)
      }
    } catch (error) {
      console.error("Failed to load directory:", error)
      setError("Failed to load directory contents.")
      if (parentNode) {
        parentNode.loading = false
        setTree([...tree])
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleDirectory = async (node: TreeNode) => {
    if (node.type !== "dir") return

    if (node.expanded) {
      node.expanded = false
      node.children = undefined
      setTree([...tree])
    } else {
      await loadDirectory(node.path, node)
    }
  }

  const selectFile = async (file: GitHubContent) => {
    if (file.type !== "file") return

    setSelectedFile(file)
    onFileSelect?.(file)

    if (showPreview && file.size < 1024 * 1024) { // Only preview files < 1MB
      await loadFileContent(file)
    }
  }

  const loadFileContent = async (file: GitHubContent) => {
    if (!apiToken || !owner || !repo) return

    try {
      const response = await fetch(file.url, {
        headers: {
          Authorization: `token ${apiToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const data = await response.json()
      if (data.content && data.encoding === "base64") {
        const content = atob(data.content)
        setFileContent(content)
      }
    } catch (error) {
      console.error("Failed to load file content:", error)
      setFileContent("Failed to load file content")
    }
  }

  const getFileIcon = (file: GitHubContent) => {
    if (file.type === "dir") {
      return <Folder className="h-4 w-4 text-blue-500" />
    }

    const extension = file.name.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "md":
      case "txt":
      case "json":
      case "yaml":
      case "yml":
        return <FileText className="h-4 w-4 text-green-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const renderTreeNode = (node: TreeNode, level: number = 0) => (
    <div key={node.path} className="select-none">
      <div
        className={`flex items-center gap-2 p-2 hover:bg-accent/50 cursor-pointer rounded-md ${
          selectedFile?.path === node.path ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => node.type === "dir" ? toggleDirectory(node) : selectFile(node)}
      >
        {node.type === "dir" && (
          <div className="flex items-center">
            {node.loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : node.expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
        {getFileIcon(node)}
        <span className="flex-1 truncate">{node.name}</span>
        {node.type === "file" && (
          <span className="text-xs text-muted-foreground">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
      {node.expanded && node.children && (
        <div>
          {node.children.map((child) => renderTreeNode(child, level + 1))}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* File Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Repository Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {tree.map((node) => renderTreeNode(node))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* File Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              File Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{selectedFile.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedFile.html_url, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View on GitHub
                    </Button>
                    {selectedFile.download_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedFile.download_url!, "_blank")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>

                {fileContent && (
                  <div className="border rounded-md">
                    <div className="bg-muted px-3 py-2 border-b">
                      <span className="text-sm font-medium">Content</span>
                    </div>
                    <ScrollArea className="h-64">
                      <pre className="p-3 text-sm overflow-x-auto">
                        <code>{fileContent}</code>
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No File Selected</h3>
                <p className="text-muted-foreground">
                  Select a file from the tree to preview its contents
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
