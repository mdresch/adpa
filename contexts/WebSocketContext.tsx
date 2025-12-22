"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Socket } from "socket.io-client"
import { apiClient } from "@/lib/api"
import { useAuth } from "./AuthContext"
import { toast } from "sonner"

const WS_JOINED_ROOMS_KEY = 'ws_joined_rooms'

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
  emit: (event: string, data: any) => void
  on: (event: string, callback: (data: any) => void) => void
  off: (event: string, callback?: (data: any) => void) => void
  // Map of room -> status ('joined' | 'pending' | 'failed') for UI
  roomStatuses: Record<string, "joined" | "pending" | "failed">
  getRoomStatus: (room: string) => "joined" | "pending" | "failed" | undefined
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

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
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(() => {
    try {
      if (typeof window === 'undefined') return new Set()
      const raw = sessionStorage.getItem(WS_JOINED_ROOMS_KEY)
      if (!raw) return new Set()
      const arr = JSON.parse(raw) as string[]
      return new Set(arr)
    } catch (e) {
      return new Set()
    }
  })
  // Room statuses (joined | pending | failed) persisted in sessionStorage
  const [roomStatuses, setRoomStatuses] = useState<Record<string, "joined" | "pending" | "failed">>(() => {
    try {
      if (typeof window === 'undefined') return {}
      const raw = sessionStorage.getItem(WS_JOINED_ROOMS_KEY + ':status')
      if (!raw) return {}
      return JSON.parse(raw) as Record<string, "joined" | "pending" | "failed">
    } catch (e) {
      return {}
    }
  })

  const getRoomStatus = (room: string) => roomStatuses[room]

  // Retry bookkeeping
  const joinAttemptsRef = React.useRef<Record<string, number>>(
    typeof window !== 'undefined'
      ? ((): Record<string, number> => {
          try {
            const raw = sessionStorage.getItem(WS_JOINED_ROOMS_KEY + ':attempts')
            return raw ? JSON.parse(raw) : {}
          } catch (e) {
            return {}
          }
        })()
      : {}
  )
  const retryTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout> | null>>({})

  const MAX_JOIN_RETRIES = 5
  const BASE_RETRY_DELAY_MS = 1000

  const persistAttempts = () => {
    try {
      if (typeof window === 'undefined') return
      sessionStorage.setItem(WS_JOINED_ROOMS_KEY + ':attempts', JSON.stringify(joinAttemptsRef.current))
    } catch (e) {
      // ignore
    }
  }

  const persistStatuses = (nextStatuses?: Record<string, "joined" | "pending" | "failed">) => {
    try {
      if (typeof window === 'undefined') return
      sessionStorage.setItem(WS_JOINED_ROOMS_KEY + ':status', JSON.stringify(nextStatuses ?? roomStatuses))
    } catch (e) {
      // ignore
    }
  }

  const scheduleJoinRetry = (room: string) => {
    const attempts = joinAttemptsRef.current[room] || 0
    if (attempts >= MAX_JOIN_RETRIES) {
      setRoomStatuses(prev => {
        const next: Record<string, "joined" | "pending" | "failed"> = { ...prev, [room]: "failed" }
        persistStatuses(next)
        return next
      })
      return
    }

    const nextAttempt = attempts + 1
    joinAttemptsRef.current[room] = nextAttempt
    persistAttempts()

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, nextAttempt - 1)
    if (retryTimersRef.current[room]) {
      try { clearTimeout(retryTimersRef.current[room] as any) } catch (e) {}
    }
    retryTimersRef.current[room] = setTimeout(() => {
      try {
        if (socket && socket.connected) {
          // mark pending
          setRoomStatuses(prev => {
            const next: Record<string, "joined" | "pending" | "failed"> = { ...prev, [room]: 'pending' as "pending" }
            persistStatuses(next)
            return next
          })
          socket.emit('join', room)
        } else {
          // will try again on next connect
        }
      } catch (e) {
        // ignore
      }
    }, delay)
  }
  const { isAuthenticated, user, token } = useAuth()

  useEffect(() => {
    // Only connect when we have a token and a user
    if (token && isAuthenticated && user) {
      // Ensure previous socket is cleaned up
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }

      // Connect WebSocket when user is authenticated and token is present
      const socketInstance = apiClient.connectWebSocket()
      setSocket(socketInstance)

      // Set up event listeners
      socketInstance.on("connect", () => {
        setIsConnected(true)
        console.log("WebSocket connected")
        // Auto-rejoin rooms persisted in sessionStorage (avoid stale closure on joinedRooms)
        try {
          if (typeof window === 'undefined') return
          const raw = sessionStorage.getItem(WS_JOINED_ROOMS_KEY)
          if (!raw) return
          const rooms = JSON.parse(raw) as string[]
          rooms.forEach(r => {
            try {
              socketInstance.emit('join', r)
            } catch (e) {
              // ignore per-room error
            }
          })
        } catch (e) {
          // ignore
        }
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

      // Track recent status updates to prevent spam
      const recentStatusUpdates = new Map<string, number>()
      
      socketInstance.on("job:status", (data) => {
        if (data.userId === user.id) {
          // Only show status toast for significant milestones (0%, 25%, 50%, 75%, 100%)
          // or if it's been more than 10 seconds since last status update for this job
          const jobKey = `job-status-${data.jobId}`
          const now = Date.now()
          const lastUpdate = recentStatusUpdates.get(jobKey) || 0
          const progress = data.progress || 0
          const isMilestone = progress === 0 || progress === 25 || progress === 50 || progress === 75 || progress === 100
          const timeSinceLastUpdate = now - lastUpdate
          
          // Only show toast for milestones or if it's been 10+ seconds
          if (isMilestone || timeSinceLastUpdate > 10000) {
            recentStatusUpdates.set(jobKey, now)
            toast.info(`Job ${data.status}`, {
              description: `Progress: ${progress}%`,
              duration: 3000, // Shorter duration for status updates
            })
          }
        }
      })

      // Track recent job notifications to prevent duplicate toasts
      const recentJobNotifications = new Set<string>()
      
      socketInstance.on("job:completed", (data) => {
        if (data.userId === user.id) {
          // Deduplicate: only show toast if we haven't shown it recently for this job
          const notificationKey = `job-completed-${data.jobId}`
          if (!recentJobNotifications.has(notificationKey)) {
            recentJobNotifications.add(notificationKey)
            toast.success("Job completed successfully!", {
              description: `Job ID: ${data.jobId}`,
            })
            // Remove from set after 5 seconds to allow re-notification if needed
            setTimeout(() => recentJobNotifications.delete(notificationKey), 5000)
          }
        }
      })

      socketInstance.on("job:failed", (data) => {
        if (data.userId === user.id) {
          // Deduplicate: only show toast if we haven't shown it recently for this job
          const notificationKey = `job-failed-${data.jobId}`
          if (!recentJobNotifications.has(notificationKey)) {
            recentJobNotifications.add(notificationKey)
            toast.error("Job failed", {
              description: data.error || `Job ID: ${data.jobId}`,
            })
            // Remove from set after 5 seconds to allow re-notification if needed
            setTimeout(() => recentJobNotifications.delete(notificationKey), 5000)
          }
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

      // Drift detection notifications
      socketInstance.on("drift:detected", (data) => {
        const severityLabels = {
          critical: "🔴 Critical",
          high: "🟠 High",
          medium: "🟡 Medium",
          low: "🔵 Low",
        }
        const severityLabel = severityLabels[data.severity as keyof typeof severityLabels] || data.severity
        
        toast.warning(`${severityLabel} Drift Detected`, {
          description: `${data.documentTitle || "Document"} has ${data.driftCount} baseline drift${data.driftCount !== 1 ? "s" : ""}`,
          duration: 10000,
        })
      })

      // Global JWT error handler to stop retry storms
      socketInstance.on("join:error", (err: any) => {
        if (err.code === 'JWT_INVALID' || err.message?.includes('Invalid or expired token')) {
          // This is a global handler for auto-rejoin failures
          console.error('JWT authentication failed, forcing logout')
          toast.error('Session expired', {
            description: 'Please log in again to continue',
          })
          // Clear all persisted rooms
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(WS_JOINED_ROOMS_KEY)
              sessionStorage.removeItem(WS_JOINED_ROOMS_KEY + ':status')
              sessionStorage.removeItem(WS_JOINED_ROOMS_KEY + ':attempts')
            }
          } catch (e) {
            // ignore
          }
          // Disconnect and redirect to login
          socketInstance.disconnect()
          setTimeout(() => {
            // Using replace to avoid XSS and prevent back navigation
            window.location.replace('/auth/login')
          }, 2000)
        }
      })

      socketInstance.on("security:alert", (data) => {
        toast.warning("Security Alert", {
          description: data.message,
        })
      })

      return () => {
        try {
          socketInstance.disconnect()
        } catch (e) {
          // ignore
        }
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
  // Re-run when token, isAuthenticated, or user change
  }, [token, isAuthenticated, user])

  const joinRoom = React.useCallback((room: string) => {
    if (!socket || !isConnected) {
      return
    }

    // Prevent duplicate joins - check if already joined or pending
    if (joinedRooms.has(room)) {
      // Already joined, skip
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_WS === 'true') {
        console.log(`[WS] Skipping duplicate join for room: ${room}`)
      }
      return
    }

    // Check if there's already a pending join attempt
    if (roomStatuses[room] === 'pending') {
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_WS === 'true') {
        console.log(`[WS] Join already pending for room: ${room}`)
      }
      return
    }

    // Mark as pending
    setRoomStatuses(prev => {
      const next = { ...prev, [room]: 'pending' as const }
      persistStatuses(next)
      return next
    })

    // Emit join and wait for server acknowledgement events (join:ok / join:error)
    socket.emit("join", room)

    // Track if we've already handled this join attempt to prevent duplicate toasts
    let handled = false

    const handleOk = (data: any) => {
      if (data?.room === room && !handled) {
        handled = true
        // Only log in debug mode to avoid console spam
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_WS === 'true') {
          console.log(`Joined room: ${room}`)
        }
        socket.off("join:ok", handleOk)
        socket.off("join:error", handleError)
        // Mark room as joined for auto-rejoin and persist
        setJoinedRooms(prev => {
          const next = new Set(prev)
          next.add(room)
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(WS_JOINED_ROOMS_KEY, JSON.stringify(Array.from(next)))
            }
          } catch (e) {
            // ignore
          }
          return next
        })
        setRoomStatuses(prev => {
          const next = { ...prev, [room]: 'joined' as const }
          persistStatuses(next)
          return next
        })
      }
    }

    const handleError = (err: any) => {
      if (err?.room === room && !handled) {
        handled = true
        socket.off("join:ok", handleOk)
        socket.off("join:error", handleError)
        
        // Mark as failed
        setRoomStatuses(prev => {
          const next = { ...prev, [room]: 'failed' as const }
          persistStatuses(next)
          return next
        })

        // Check if this is a JWT auth error
        if (err.code === 'JWT_INVALID' || err.message?.includes('Invalid or expired token')) {
          // Force logout on JWT errors to prevent retry storms
          toast.error('Session expired', {
            description: 'Please log in again to continue',
          })
          // Clear persisted rooms to prevent auto-rejoin loop
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(WS_JOINED_ROOMS_KEY)
              sessionStorage.removeItem(WS_JOINED_ROOMS_KEY + ':status')
              sessionStorage.removeItem(WS_JOINED_ROOMS_KEY + ':attempts')
            }
          } catch (e) {
            // ignore
          }
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/auth/login'
          }, 2000)
        } else {
          // Only show error toast if not already failed (prevent duplicate toasts)
          const currentStatus = roomStatuses[room]
          if (currentStatus !== 'failed') {
            toast.error(`Failed to join ${room}: ${err.message || 'access denied'}`, {
              id: `join-error-${room}`, // Use toast ID to prevent duplicates
            })
            console.warn(`Join denied for room ${room}:`, err)
          }
        }
      }
    }

    // Register one-time listeners with a safety timeout
    socket.on("join:ok", handleOk)
    socket.on("join:error", handleError)

    // Remove listeners after 8s to avoid leaks
    const timeout = setTimeout(() => {
      if (!handled) {
        handled = true
        try {
          socket.off("join:ok", handleOk)
          socket.off("join:error", handleError)
        } catch (e) {
          // ignore
        }
        // Mark as failed if timeout
        setRoomStatuses(prev => {
          if (prev[room] === 'pending') {
            const next = { ...prev, [room]: 'failed' as const }
            persistStatuses(next)
            return next
          }
          return prev
        })
      }
    }, 8000)

    // Clear timeout when socket disconnects
    socket.once("disconnect", () => clearTimeout(timeout))
  }, [socket, isConnected, joinedRooms, roomStatuses])

  const leaveRoom = React.useCallback((room: string) => {
    if (!socket || !isConnected) {
      return
    }

    socket.emit("leave", room)

    const handleOk = (data: any) => {
      if (data?.room === room) {
        // Only log in debug mode to avoid console spam
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_WS === 'true') {
          console.log(`Left room: ${room}`)
        }
        socket.off("leave:ok", handleOk)
        socket.off("leave:error", handleError)
        // Remove from joinedRooms and persist
        setJoinedRooms(prev => {
          const next = new Set(prev)
          next.delete(room)
          try {
            if (typeof window !== 'undefined') {
              const arr = Array.from(next)
              if (arr.length === 0) sessionStorage.removeItem(WS_JOINED_ROOMS_KEY)
              else sessionStorage.setItem(WS_JOINED_ROOMS_KEY, JSON.stringify(arr))
            }
          } catch (e) {
            // ignore
          }
          return next
        })
        // Update room status
        setRoomStatuses(prev => {
          const next = { ...prev }
          delete next[room]
          persistStatuses(next)
          return next
        })
      }
    }

    const handleError = (err: any) => {
      if (err?.room === room) {
        console.warn(`Leave error for room ${room}:`, err)
        socket.off("leave:ok", handleOk)
        socket.off("leave:error", handleError)
      }
    }

    socket.on("leave:ok", handleOk)
    socket.on("leave:error", handleError)

    const timeout = setTimeout(() => {
      try {
        socket.off("leave:ok", handleOk)
        socket.off("leave:error", handleError)
      } catch (e) {
        // ignore
      }
    }, 8000)

    socket.once("disconnect", () => clearTimeout(timeout))
  }, [socket, isConnected])

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
  roomStatuses,
  getRoomStatus,
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

// Hook for drift detection notifications
export function useDriftDetection(projectId?: string) {
  const { joinRoom, leaveRoom, on, off } = useWebSocket()
  const [driftAlerts, setDriftAlerts] = useState<any[]>([])

  useEffect(() => {
    if (projectId) {
      const room = `project:${projectId}`
      joinRoom(room)

      const handleDriftDetected = (data: any) => {
        setDriftAlerts(prev => [data, ...prev.slice(0, 9)]) // Keep last 10 alerts
      }

      on("drift:detected", handleDriftDetected)

      return () => {
        leaveRoom(room)
        off("drift:detected", handleDriftDetected)
      }
    }
  }, [projectId, joinRoom, leaveRoom, on, off])

  return driftAlerts
}
