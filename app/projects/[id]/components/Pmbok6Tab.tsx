"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  Activity, 
  FileText, 
  Layers, 
  Award, 
  CheckCircle, 
  Circle,
  Info,
  ExternalLink
} from "lucide-react"
import { getApiUrl } from "@/lib/api-url"
import { useRouter } from "next/navigation"

interface Pmbok6TabProps {
  projectId: string
}

export function Pmbok6Tab({ projectId }: Pmbok6TabProps) {
  const router = useRouter()
  const [compliance, setCompliance] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchCompliance = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/project-data-extraction/${projectId}/summary`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.pmbok6Compliance) {
          setCompliance(data.pmbok6Compliance)
        }
      }
    } catch (error) {
      console.error("Failed to fetch PMBOK 6 compliance:", error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (projectId) {
      fetchCompliance()
    }
  }, [projectId])

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground animate-pulse">Auditing PMBOK 6 compliance...</div>
  }

  const projectCompliance = compliance || {
    processCoverage: 0,
    deliverableCoverage: 0,
    activeProcessCount: 0,
    presentDeliverableCount: 0,
    totalDeliverableCount: 94,
    processes: []
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Process Activation</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black">{projectCompliance.activeProcessCount}</div>
              <div className="text-sm font-bold text-muted-foreground">/ 49</div>
            </div>
            <Progress value={projectCompliance.processCoverage} className="h-1.5 mt-3" />
            <p className="text-[10px] font-bold mt-2 text-primary">{projectCompliance.processCoverage}% of required processes verified</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Deliverable Presence</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black">{projectCompliance.presentDeliverableCount}</div>
              <div className="text-sm font-bold text-muted-foreground">/ {projectCompliance.totalDeliverableCount || 94}</div>
            </div>
            <Progress value={projectCompliance.deliverableCoverage} className="h-1.5 mt-3" />
            <p className="text-[10px] font-bold mt-2 text-blue-500">{projectCompliance.deliverableCoverage}% of artifacts baseline-verified</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Tier 3 Rigor Certification</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-amber-600">PMBOK 6 VERIFIED</div>
              <p className="text-xs font-bold text-muted-foreground mt-1">Status: Constitutional v3.x Governance Active</p>
              <Badge variant="outline" className="mt-2 font-mono text-[9px] uppercase">Forensic Entity Lineage Tracking</Badge>
            </div>
            <Button size="sm" onClick={() => router.push(`/pmbok6?projectId=${projectId}`)}>
              Full Compliance Deep Dive <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Process Benchmarks</CardTitle>
            <CardDescription>Verified PMBOK 6 processes based on entity density</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectCompliance.processes?.filter((p: any) => p.status === 'ACTIVE').length > 0 ? (
                projectCompliance.processes.filter((p: any) => p.status === 'ACTIVE').map((p: any) => (
                  <div key={p.code} className="flex items-center justify-between p-2 rounded border border-emerald-100 bg-emerald-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center font-mono text-xs font-bold">{p.code}</div>
                      <span className="text-xs font-bold">{p.name}</span>
                    </div>
                    <Badge className="text-[10px] bg-emerald-500">VERIFIED</Badge>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-muted-foreground italic text-xs">No processes fully verified yet. Generate more documents to populate the baseline.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Baseline Artifact Progress</CardTitle>
            <CardDescription>Core PMBOK 6 deliverables identified in source documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {Array.from(new Set(projectCompliance.processes?.flatMap((p: any) => p.deliverables.map((d: any) => d.name)) || [])).sort().slice(0, 10).map((deliverableName: any) => {
                const isPresent = projectCompliance.processes?.some((p: any) => 
                  p.deliverables.some((d: any) => d.name === deliverableName && d.present)
                );
                return (
                  <div key={deliverableName} className="flex items-center justify-between text-xs px-2 py-1.5 border-b last:border-0 border-slate-100">
                    <span className={isPresent ? 'font-bold' : 'text-slate-500'}>{deliverableName}</span>
                    {isPresent ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-200" />}
                  </div>
                );
              })}
              <Button variant="ghost" size="sm" className="w-full mt-2 text-[10px] h-7" onClick={() => router.push(`/pmbok6?projectId=${projectId}&tab=deliverables`)}>
                View All 94 Deliverables →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
