"use client"

import React, { useEffect, useRef, useState } from "react"
import { useWebSocket } from "@/contexts/WebSocketContext"
import RoomStatusBadge from "./room-status-badge"
import styles from './accordion.module.css'

const PANEL_COLLAPSED_KEY = 'ws_rooms_panel_collapsed'

export default function RoomStatusList() {
  const [mounted, setMounted] = useState(false)
  const ctx = useWebSocket() as any
  const { roomStatuses = {}, getRoomStatus, joinRoom, leaveRoom } = ctx

  const rooms = Object.keys(roomStatuses || {})

  const [collapsed, setCollapsed] = useState<boolean>(false)

  // Set mounted state after hydration
  useEffect(() => {
    setMounted(true)
    // Read from sessionStorage after mount
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(PANEL_COLLAPSED_KEY) === '1'
        setCollapsed(stored)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (collapsed) sessionStorage.setItem(PANEL_COLLAPSED_KEY, '1')
      else sessionStorage.removeItem(PANEL_COLLAPSED_KEY)
    } catch (e) {
      // ignore
    }
  }, [collapsed])

  const panelInnerRef = useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState<string | null>(null)

  useEffect(() => {
    // measure inner content height when expanded so we can animate height smoothly
    if (!collapsed) {
      const el = panelInnerRef.current
      if (el) {
        const h = el.scrollHeight
        setContentHeight(`${h}px`)
      }
    } else {
      // clear explicit height when collapsed
      setContentHeight(null)
    }
  }, [collapsed, rooms.length])

  // Don't render until mounted to prevent hydration errors
  if (!mounted) {
    return null
  }

  if (!rooms.length && !collapsed) return null

  // Render both pill and panel; animate panel open/close using max-height, opacity and transform
  return (
    <div className="relative">
      {/* Collapsed pill (visible when collapsed) */}
  <div className={`transition-opacity duration-200 ${collapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'} mb-2`}>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-full px-3 py-2 shadow-sm">
          <button
            aria-label="Open realtime rooms"
            onClick={() => setCollapsed(false)}
            className="inline-flex items-center gap-2 text-sm text-gray-700"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Realtime</span>
          </button>
        </div>
      </div>

      {/* Animated panel */}
  <div
    className={`bg-white border border-gray-100 rounded-md p-3 shadow-sm transform origin-bottom-right overflow-hidden ${collapsed ? styles.accordionContent : `${styles.accordionContent} ${styles.open}`}`}
    aria-hidden={collapsed ? "true" : "false"}
    data-content-height={contentHeight || ""}
  >
    <div ref={panelInnerRef}>
          <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Realtime Rooms</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollapsed(true)}
              aria-expanded={!collapsed ? "true" : "false"}
              className="inline-flex items-center px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-50"
            >
              Collapse
            </button>
          </div>
          </div>
          <div className="flex flex-col gap-3">
          {rooms.map(r => (
            <div key={r} className="flex items-center justify-between gap-4">
              <RoomStatusBadge room={r} />
              <div className="flex items-center gap-2">
                {getRoomStatus(r) === 'failed' ? (
                  <button
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => joinRoom(r)}
                  >
                    Retry
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100"
                    onClick={() => leaveRoom(r)}
                  >
                    Leave
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  )
}
