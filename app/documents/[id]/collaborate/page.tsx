"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Users,
  MessageCircle,
  Save,
  Share,
  Eye,
  Edit,
  Clock,
  User,
  Send,
  FileText,
  History,
  Settings,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { useParams } from "next/navigation"

interface CollaborationUser {
  id: string
  name: string
  email: string
  avatar?: string
  cursor_position?: number
  last_seen: string
  is_editing: boolean
}

interface Comment {
  id: string
  user: CollaborationUser
  content: string
  position: number
  created_at: string
  resolved: boolean
  replies: Comment[]
}

interface DocumentVersion {
  id: string
  content: string
  author: CollaborationUser
  created_at: string
  changes_summary: string
}

export default function DocumentCollaborationPage() {
  const { user } = useAuth()
  const { isConnected, socket } = useWebSocket()
  const params = useParams()
  const documentId = params.id as string
  
  const [document, setDocument] = useState<any>(null)
  const [content, setContent] = useState("")
  const [collaborators, setCollaborators] = useState<CollaborationUser[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [newComment, setNewComment] = useState("")
  const [showComments, setShowComments] = useState(true)
  const [showVersions, setShowVersions] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Mock data for demonstration
  const mockCollaborators: CollaborationUser[] = [
    {
      id: "1",
      name: "John Smith",
      email: "john@company.com",
      avatar: "/avatars/john.jpg",
      last_seen: new Date().toISOString(),
      is_editing: true,
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah@company.com",
      avatar: "/avatars/sarah.jpg",
      last_seen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      is_editing: false,
    },
  ]

  const mockComments: Comment[] = [
    {
      id: "1",
      user: mockCollaborators[1],
      content: "This section needs more detail about the security requirements.",
      position: 150,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      resolved: false,
      replies: [],
    },
    {
      id: "2",
      user: mockCollaborators[0],
      content: "Great point! I'll add more information about authentication protocols.",
      position: 150,
      created_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      resolved: false,
      replies: [],
    },
  ]

  const mockVersions: DocumentVersion[] = [
    {
      id: "v3",
      content: "Current version content...",
      author: mockCollaborators[0],
      created_at: new Date().toISOString(),
      changes_summary: "Added security architecture section",
    },
    {
      id: "v2",
      content: "Previous version content...",
      author: mockCollaborators[1],
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      changes_summary: "Updated business requirements",
    },
  ]

  useEffect(() => {
    fetchDocument()
    setCollaborators(mockCollaborators)
    setComments(mockComments)
    setVersions(mockVersions)
  }, [documentId])

  useEffect(() => {
    if (socket && isConnected) {
      // Join document collaboration room
      socket.emit("join_document", { documentId, userId: user?.id })

      // Listen for real-time updates
      socket.on("document_updated", handleDocumentUpdate)
      socket.on("user_joined", handleUserJoined)
      socket.on("user_left", handleUserLeft)
      socket.on("cursor_moved", handleCursorMoved)
      socket.on("comment_added", handleCommentAdded)

      return () => {
        socket.off("document_updated")
        socket.off("user_joined")
        socket.off("user_left")
        socket.off("cursor_moved")
        socket.off("comment_added")
        socket.emit("leave_document", { documentId, userId: user?.id })
      }
    }
  }, [socket, isConnected, documentId, user?.id])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      // Mock document data
      const mockDocument = {
        id: documentId,
        title: "Enterprise Security Architecture",
        content: `# Enterprise Security Architecture

## Overview
This document outlines the comprehensive security architecture for our enterprise systems, focusing on defense-in-depth strategies and zero-trust principles.

## Security Domains

### 1. Identity and Access Management
- Multi-factor authentication requirements
- Role-based access control (RBAC)
- Privileged access management (PAM)

### 2. Network Security
- Network segmentation strategies
- Firewall configurations
- Intrusion detection and prevention

### 3. Data Protection
- Data classification framework
- Encryption standards
- Data loss prevention (DLP)

### 4. Application Security
- Secure development lifecycle
- Code review processes
- Vulnerability management

## Implementation Timeline
Phase 1: Identity and Access Management (Q1 2024)
Phase 2: Network Security Enhancements (Q2 2024)
Phase 3: Data Protection Implementation (Q3 2024)
Phase 4: Application Security Integration (Q4 2024)

## Compliance Requirements
- SOC 2 Type II
- ISO 27001
- GDPR compliance
- Industry-specific regulations`,
        author: "John Smith",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: new Date().toISOString(),
        framework: "SABSA",
        status: "draft",
      }
      
      setDocument(mockDocument)
      setContent(mockDocument.content)
    } catch (error) {
      console.error("Failed to fetch document:", error)
      toast.error("Failed to load document")
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpdate = (data: any) => {
    setContent(data.content)
    toast.info(`Document updated by ${data.author}`)
  }

  const handleUserJoined = (user: CollaborationUser) => {
    setCollaborators(prev => [...prev.filter(u => u.id !== user.id), user])
    toast.info(`${user.name} joined the document`)
  }

  const handleUserLeft = (userId: string) => {
    setCollaborators(prev => prev.filter(u => u.id !== userId))
  }

  const handleCursorMoved = (data: { userId: string; position: number }) => {
    setCollaborators(prev => prev.map(u => 
      u.id === data.userId ? { ...u, cursor_position: data.position } : u
    ))
  }

  const handleCommentAdded = (comment: Comment) => {
    setComments(prev => [...prev, comment])
    toast.info(`New comment from ${comment.user.name}`)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    
    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument(newContent)
    }, 2000)

    // Emit real-time update
    if (socket && isConnected) {
      socket.emit("document_update", {
        documentId,
        content: newContent,
        userId: user?.id,
      })
    }
  }

  const saveDocument = async (contentToSave?: string) => {
    try {
      setSaving(true)
      // Mock save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success("Document saved")
    } catch (error) {
      console.error("Failed to save document:", error)
      toast.error("Failed to save document")
    } finally {
      setSaving(false)
    }
  }

  const addComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: `comment_${Date.now()}`,
      user: {
        id: user?.id || "",
        name: user?.name || "",
        email: user?.email || "",
        last_seen: new Date().toISOString(),
        is_editing: false,
      },
      content: newComment,
      position: textareaRef.current?.selectionStart || 0,
      created_at: new Date().toISOString(),
      resolved: false,
      replies: [],
    }

    setComments(prev => [...prev, comment])
    setNewComment("")

    // Emit comment to other users
    if (socket && isConnected) {
      socket.emit("add_comment", { documentId, comment })
    }

    toast.success("Comment added")
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading document...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden">
            <div className="h-full flex">
              {/* Main Editor */}
              <div className="flex-1 flex flex-col">
                {/* Document Header */}
                <div className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{document?.title}</h1>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {document?.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Last updated {formatTimeAgo(document?.updated_at)}
                        </span>
                        <Badge variant="outline">{document?.framework}</Badge>
                        <Badge variant={document?.status === "published" ? "default" : "secondary"}>
                          {document?.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {isConnected ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {isConnected ? "Connected" : "Offline"}
                        </span>
                      </div>
                      {saving && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                          Saving...
                        </div>
                      )}
                      <Button onClick={() => saveDocument()} variant="outline" size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>

                  {/* Active Collaborators */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-muted-foreground">Active collaborators:</span>
                    <div className="flex items-center gap-1">
                      {collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="relative">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={collaborator.avatar} />
                            <AvatarFallback className="text-xs">
                              {collaborator.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          {collaborator.is_editing && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border border-background"></div>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {collaborators.length} online
                    </span>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 p-4">
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full resize-none border-0 focus:ring-0 text-sm font-mono"
                    placeholder="Start writing..."
                  />
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-80 border-l bg-muted/30">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showComments ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowComments(true)
                        setShowVersions(false)
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Comments ({comments.length})
                    </Button>
                    <Button
                      variant={showVersions ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowVersions(true)
                        setShowComments(false)
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      Versions
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {showComments && (
                    <div className="p-4 space-y-4">
                      {/* Add Comment */}
                      <div className="space-y-2">
                        <Label>Add Comment</Label>
                        <Textarea
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                        />
                        <Button onClick={addComment} size="sm" className="w-full">
                          <Send className="h-4 w-4 mr-2" />
                          Add Comment
                        </Button>
                      </div>

                      <Separator />

                      {/* Comments List */}
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <Card key={comment.id} className="p-3">
                            <div className="flex items-start gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={comment.user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {comment.user.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{comment.user.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(comment.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" className="text-xs">
                                    Reply
                                  </Button>
                                  {!comment.resolved && (
                                    <Button variant="ghost" size="sm" className="text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolve
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {showVersions && (
                    <div className="p-4 space-y-3">
                      {versions.map((version) => (
                        <Card key={version.id} className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{version.id}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(version.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={version.author.avatar} />
                                <AvatarFallback className="text-xs">
                                  {version.author.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{version.author.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{version.changes_summary}</p>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs">
                                Restore
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
