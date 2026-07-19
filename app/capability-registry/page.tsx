"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient, type CapabilityRegistryListItem } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/lib/notify"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout } from "@/components/animated-layout"
import { ExternalLink, ShieldCheck } from "lucide-react"

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending_department_approval: "secondary",
  pending_re_approval: "secondary",
  disabled: "destructive",
  draft: "outline",
}

function governorPortalCapabilitiesUrl(): string | null {
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL?.trim().replace(/\/$/, "")
  return orchestratorUrl ? `${orchestratorUrl}/capabilities` : null
}

export default function CapabilityRegistryPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [capabilities, setCapabilities] = useState<CapabilityRegistryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please log in to access this page")
      router.push("/auth/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchCapabilities = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.getCapabilityRegistry()
        setCapabilities(response.capabilities || [])
      } catch (err: any) {
        const message = err?.message || "Failed to load the capability register"
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    fetchCapabilities()
  }, [isAuthenticated])

  const portalUrl = governorPortalCapabilitiesUrl()

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Capability Register</h1>
                  <p className="text-muted-foreground mt-1">
                    Every governed module your departments own, and its current activation status. This is a
                    read-only discovery view -- promotions, overrides, and break-glass exceptions are decided in
                    the Governor Portal.
                  </p>
                </div>
                {portalUrl && (
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline whitespace-nowrap"
                  >
                    Open in Governor Portal
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {error && (
                <Card className="mb-4 border-destructive/50">
                  <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
                </Card>
              )}

              {loading ? (
                <p className="text-muted-foreground">Loading&hellip;</p>
              ) : capabilities.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-muted-foreground text-sm">
                    No governed modules found for your departments.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {capabilities.map((capability) => (
                    <Card key={capability.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                              {capability.moduleId}
                            </CardTitle>
                            <CardDescription>Portfolio {capability.portfolioId}</CardDescription>
                          </div>
                          <Badge variant={STATUS_BADGE_VARIANT[capability.activationStatus] ?? "outline"}>
                            {capability.activationStatus}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <div>
                          <span className="text-muted-foreground">Platform operator: </span>
                          {capability.platformOperator}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Functional owner: </span>
                          {capability.functionalOwnerDepartment ?? "Unassigned"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Control definition owner: </span>
                          {capability.controlDefinitionOwnerDepartment ?? "Unassigned"}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
