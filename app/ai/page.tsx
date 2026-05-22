"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

/** Full UI lives in `ai-workspace.tsx` (~1k lines). This file only splits the route for faster first compile. */
const AIWorkspace = dynamic(() => import("./ai-workspace"), {
  ssr: false,
  loading: () => (
    <AIWorkspaceRouteShell message="Loading AI workspace…" hint="First visit after restart can take 1–3 minutes while Turbopack compiles. Watch the terminal for ○ Compiling … → GET /ai 200." />
  ),
})

function AIWorkspaceRouteShell({
  message,
  hint,
}: {
  message: string
  hint?: string
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex flex-1 items-center justify-center overflow-y-auto p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">{message}</p>
            {hint ? <p className="mt-3 max-w-md text-sm text-muted-foreground">{hint}</p> : null}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/openui-chat">Open OpenUI Chat (lighter)</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects">Projects</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AIPage() {
  return <AIWorkspace />
}
