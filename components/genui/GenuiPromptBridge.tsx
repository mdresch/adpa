"use client"

import { useEffect, useRef } from "react"
import { useThread } from "@openuidev/react-headless"

/**
 * Sends a user prompt into the OpenUI FullScreen thread (must render inside ChatProvider).
 */
export function GenuiPromptBridge({
  prompt,
  onSent,
}: {
  prompt: string | null
  onSent: () => void
}) {
  const processMessage = useThread((s) => s.processMessage)
  const isRunning = useThread((s) => s.isRunning)
  const consumedPromptRef = useRef<string | null>(null)

  useEffect(() => {
    const text = prompt?.trim()
    if (!text || isRunning) return
    if (consumedPromptRef.current === text) return

    consumedPromptRef.current = text
    onSent()

    void processMessage({ role: "user", content: text }).finally(() => {
      if (consumedPromptRef.current === text) {
        consumedPromptRef.current = null
      }
    })
  }, [prompt, isRunning, processMessage, onSent])

  return null
}
