export const dynamic = "force-dynamic"

import { Suspense } from "react"

import { OpenUIChatShell } from "@/components/openui-chat/openui-chat-shell"

export default function OpenUIChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-600">Loading OpenUI chat…</div>}>
      <OpenUIChatShell />
    </Suspense>
  )
}