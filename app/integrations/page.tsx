"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

/** Full UI lives in `integrations-workspace.tsx` (~2.7k lines). Thin route shell for faster route registration and first compile. */
const IntegrationsWorkspace = dynamic(() => import("./integrations-workspace"), {
  ssr: false,
  loading: () => (
    <IntegrationsRouteShell
      message="Loading integrations…"
      hint="First visit after restart can take a minute while Turbopack compiles the workspace. Watch the terminal for ○ Compiling … → GET /integrations 200."
    />
  ),
})

function IntegrationsRouteShell({
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
                <Link href="/integrations/confluence">Confluence setup</Link>
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

export default function IntegrationsPage() {
  return <IntegrationsWorkspace />
}
