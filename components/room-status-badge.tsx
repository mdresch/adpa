"use client"

import React from "react"
import { useWebSocket } from "@/contexts/WebSocketContext"

interface Props {
  room: string
  className?: string
}

export default function RoomStatusBadge({ room, className = "" }: Props) {
  const { getRoomStatus } = useWebSocket()
  const status = getRoomStatus(room)

  const label = status === "joined" ? "Joined" : status === "pending" ? "Pending" : status === "failed" ? "Failed" : "Unknown"
  const dotClass = status === "joined" ? "bg-emerald-500" : status === "pending" ? "bg-amber-500 animate-pulse" : status === "failed" ? "bg-rose-500" : "bg-gray-400"

  return (
    <div className={`flex items-center gap-3 ${className}`} title={`${room}: ${label}`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} aria-hidden />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate">{room}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    </div>
  )
}
