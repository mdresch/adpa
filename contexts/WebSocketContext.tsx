"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Socket } from "socket.io-client"
import { apiClient } from "@/lib/api"
import { useAuth } from "./AuthContext"
import { toast } from "sonner"

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
  emit: (event: string, data: any) => void
  on: (event: string, callback: (data: any) => void) => void
  off: (event: string, callback?: (data: any) => void) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect WebSocket when user is authenticated
      const socketInstance = apiClient.connectWebSocket()
      setSocket(socketInstance)

      // Set up event listeners
      socketInstance.on("connect", () => {
        setIsConnected(true)
        console.log("WebSocket connected")
      })

      socketInstance.on("disconnect", () => {
        setIsConnected(false)
        console.log("WebSocket disconnected")
      })

      socketInstance.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error)
        setIsConnected(false)
      })

      // Global event handlers
      socketInstance.on("notification", (data) => {
        toast.info(data.message, {
          description: data.description,
        })
      })

      socketInstance.on("job:status", (data) => {
        if (data.userId === user.id) {
          toast.info(`Job ${data.status}`, {
            description: `Progress: ${data.progress}%`,
          })
        }
      })

      socketInstance.on("job:completed", (data) => {
        if (data.userId === user.id) {
          toast.success("Job completed successfully!", {
            description: `Job ID: ${data.jobId}`,
          })
        }
      })

      socketInstance.on("job:failed", (data) => {
        if (data.userId === user.id) {
          toast.error("Job failed", {
            description: data.error || `Job ID: ${data.jobId}`,
          })
        }
      })

      socketInstance.on("document:updated", (data) => {
        toast.info("Document updated", {
          description: `${data.documentName} was updated by ${data.updatedBy}`,
        })
      })

      socketInstance.on("project:updated", (data) => {
        toast.info("Project updated", {
          description: `${data.projectName} was updated`,
        })
      })

      socketInstance.on("security:alert", (data) => {
        toast.warning("Security Alert", {
          description: data.message,
        })
      })

      return () => {
        socketInstance.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    } else {
      // Disconnect when user is not authenticated
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, user])

  const joinRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit("join", room)
      console.log(`Joined room: ${room}`)
    }
  }

  const leaveRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit("leave", room)
      console.log(`Left room: ${room}`)
    }
  }

  const emit = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data)
    }
  }

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback)
    }
  }

  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback)
      } else {
        socket.off(event)
      }
    }
  }

  const value: WebSocketContextType = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    emit,
    on,
    off,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

// Hook for project-specific real-time updates
export function useProjectUpdates(projectId: string) {
  const { joinRoom, leaveRoom, on, off } = useWebSocket()
  const [updates, setUpdates] = useState<any[]>([])

  useEffect(() => {
    if (projectId) {
      const room = `project:${projectId}`
      joinRoom(room)

      const handleUpdate = (data: any) => {
        setUpdates(prev => [data, ...prev.slice(0, 49)]) // Keep last 50 updates
      }

      on("project:update", handleUpdate)
      on("document:update", handleUpdate)
      on("team:update", handleUpdate)

      return () => {
        leaveRoom(room)
        off("project:update", handleUpdate)
        off("document:update", handleUpdate)
        off("team:update", handleUpdate)
      }
    }
  }, [projectId, joinRoom, leaveRoom, on, off])

  return updates
}

// Hook for job status updates
export function useJobUpdates() {
  const { on, off } = useWebSocket()
  const [jobUpdates, setJobUpdates] = useState<Record<string, any>>({})

  useEffect(() => {
    const handleJobStatus = (data: any) => {
      setJobUpdates(prev => ({
        ...prev,
        [data.jobId]: data,
      }))
    }

    const handleJobCompleted = (data: any) => {
      setJobUpdates(prev => ({
        ...prev,
        [data.jobId]: { ...data, status: "completed" },
      }))
    }

    const handleJobFailed = (data: any) => {
      setJobUpdates(prev => ({
        ...prev,
        [data.jobId]: { ...data, status: "failed" },
      }))
    }

    on("job:status", handleJobStatus)
    on("job:completed", handleJobCompleted)
    on("job:failed", handleJobFailed)

    return () => {
      off("job:status", handleJobStatus)
      off("job:completed", handleJobCompleted)
      off("job:failed", handleJobFailed)
    }
  }, [on, off])

  return jobUpdates
}

// Hook for document collaboration
export function useDocumentCollaboration(documentId: string) {
  const { joinRoom, leaveRoom, on, off, emit } = useWebSocket()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [documentUpdates, setDocumentUpdates] = useState<any[]>([])

  useEffect(() => {
    if (documentId) {
      const room = `document:${documentId}`
      joinRoom(room)

      const handleUserJoined = (data: any) => {
        setCollaborators(prev => [...prev.filter(c => c.id !== data.user.id), data.user])
      }

      const handleUserLeft = (data: any) => {
        setCollaborators(prev => prev.filter(c => c.id !== data.user.id))
      }

      const handleDocumentUpdate = (data: any) => {
        setDocumentUpdates(prev => [data, ...prev.slice(0, 19)]) // Keep last 20 updates
      }

      on("user:joined", handleUserJoined)
      on("user:left", handleUserLeft)
      on("document:updated", handleDocumentUpdate)

      return () => {
        leaveRoom(room)
        off("user:joined", handleUserJoined)
        off("user:left", handleUserLeft)
        off("document:updated", handleDocumentUpdate)
      }
    }
  }, [documentId, joinRoom, leaveRoom, on, off])

  const broadcastCursorPosition = (position: { x: number; y: number }) => {
    emit("cursor:move", { documentId, position })
  }

  const broadcastTextSelection = (selection: { start: number; end: number }) => {
    emit("text:select", { documentId, selection })
  }

  return {
    collaborators,
    documentUpdates,
    broadcastCursorPosition,
    broadcastTextSelection,
  }
}
