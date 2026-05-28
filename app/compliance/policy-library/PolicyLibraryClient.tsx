"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, ShieldAlert, ShieldCheck, Activity, CheckCircle, XCircle } from "lucide-react"

type PolicyStats = {
  total: number
  active: number
  candidate: number
  deprecated: number
}

type Policy = {
  id: string
  rule_code: string
  title: string
  description: string
  status: 'ACTIVE' | 'CANDIDATE' | 'DEPRECATED'
  version: number
  telemetry_metrics: {
    falsePositiveCount: number
    userOverrideCount: number
    totalRuns: number
  }
  target_document_types?: string[]
  domain_tags?: string[]
  updated_at: string
}

export function PolicyLibraryClient() {
  const [stats, setStats] = useState<PolicyStats | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, policiesRes] = await Promise.all([
        fetch('/api/v1/policy-library/stats'),
        fetch('/api/v1/policy-library')
      ])

      if (!statsRes.ok || !policiesRes.ok) throw new Error('Failed to fetch data')

      const statsData = await statsRes.json()
      const policiesData = await policiesRes.json()

      setStats(statsData)
      setPolicies(policiesData)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/policy-library/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      
      // Optimistic update
      setPolicies(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as any } : p))
      fetchData() // refresh stats
    } catch (err: any) {
      console.error(err)
      alert('Failed to update policy status')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/> Active</Badge>
      case 'CANDIDATE': return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700"><ShieldAlert className="w-3 h-3 mr-1"/> Candidate</Badge>
      case 'DEPRECATED': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Deprecated</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Candidates</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.candidate || 0}</div>
            <p className="text-xs text-muted-foreground pt-1">Require sandbox or human review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deprecated</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deprecated || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Library Registry</CardTitle>
          <CardDescription>All governance rules tracked by the autonomous compliance engine.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Overrides</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No policies found in the library.
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-mono text-xs">{policy.rule_code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{policy.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mb-1">{policy.description}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(!policy.target_document_types || policy.target_document_types.length === 0) && (!policy.domain_tags || policy.domain_tags.length === 0) && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4 bg-muted/30">All Documents</Badge>
                        )}
                        {policy.target_document_types?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">{tag}</Badge>
                        ))}
                        {policy.domain_tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] py-0 h-4 bg-purple-50 text-purple-700 border-purple-200">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(policy.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {policy.telemetry_metrics?.userOverrideCount || 0} <span className="text-xs text-muted-foreground">manual overrides</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {policy.status === 'CANDIDATE' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleUpdateStatus(policy.id, 'ACTIVE')}>
                            Promote
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleUpdateStatus(policy.id, 'DEPRECATED')}>
                            Reject
                          </Button>
                        </>
                      )}
                      {policy.status === 'ACTIVE' && (
                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleUpdateStatus(policy.id, 'DEPRECATED')}>
                          Deprecate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
