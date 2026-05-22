"use client"

import { useEffect, useRef } from "react"
import { useThread, useThreadList } from "@openuidev/react-headless"

/**
 * Keeps OpenUI FullScreen internal thread state aligned with the ADPA sidebar selection.
 * Must render inside FullScreen (ChatProvider).
 */
export function OpenUIChatThreadSync({ activeThreadId }: { activeThreadId: string }) {
  const selectThread = useThreadList((s) => s.selectThread)
  const switchToNewThread = useThreadList((s) => s.switchToNewThread)
  const selectedThreadId = useThreadList((s) => s.selectedThreadId)
  const isRunning = useThread((s) => s.isRunning)
  const lastExternalId = useRef<string | undefined>(undefined)

  useEffect(() => {
    // selectThread() cancels the in-flight stream and reloads messages from the API.
    // Never sync while the assistant response is still streaming.
    if (isRunning) {
      return
    }

    if (activeThreadId === lastExternalId.current) {
      return
    }
    lastExternalId.current = activeThreadId

    if (activeThreadId) {
      if (selectedThreadId !== activeThreadId) {
        selectThread(activeThreadId)
      }
      return
    }

    if (selectedThreadId) {
      switchToNewThread()
    }
  }, [activeThreadId, isRunning, selectThread, selectedThreadId, switchToNewThread])

  return null
}
