"use client"

import React, { useEffect } from "react"
import { useWebSocket } from "@/contexts/WebSocketContext"

export function ProjectSocketRoom({ 
  projectId, 
  children 
}: { 
  projectId: string, 
  children: React.ReactNode 
}) {
  const { joinRoom, leaveRoom } = useWebSocket()

  useEffect(() => {
    if (!projectId || projectId === 'undefined') return
    const room = `project:${projectId}`
    joinRoom(room)

    return () => {
      leaveRoom(room)
    }
  }, [projectId, joinRoom, leaveRoom])

  return <>{children}</>
}
