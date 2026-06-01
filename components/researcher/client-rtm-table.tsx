'use client'

import React, { useState } from 'react'
import { 
  CheckCircle2, 
  History, 
  ArrowUpRight, 
  Filter, 
  ShieldCheck,
  Search,
  Sparkles,
  Loader2
} from 'lucide-react'
import { RtmRequirement } from '@/lib/api'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ClientRtmTableProps {
  requirements: RtmRequirement[]
  onPropose: (req: RtmRequirement) => void
  onAiResearch: (requirementId: string) => void
  researchingId: string | null
}

export function ClientRtmTable({ requirements, onPropose, onAiResearch, researchingId }: ClientRtmTableProps) {
  const [showBaselineOnly, setShowBaselineOnly] = useState(false) // Default to Full Ledger in Researcher View
  const [search, setSearch] = useState('')

  const visibleRequirements = requirements.filter(req => {
    const matchesSearch = req.description.toLowerCase().includes(search.toLowerCase()) ||
                          req.domain.toLowerCase().includes(search.toLowerCase())
    const matchesBaseline = !showBaselineOnly || req.status === 'ACTIVE'
    return matchesSearch && matchesBaseline
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search requirements or domains..."
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50">
            <input
              type="checkbox"
              id="baselineToggle"
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={showBaselineOnly}
              onChange={(e) => setShowBaselineOnly(e.target.checked)}
            />
            <label htmlFor="baselineToggle" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
              Current Baseline Only
            </label>
          </div>
          
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded border border-slate-100">
            {visibleRequirements.length} Artifacts
          </div>
        </div>
      </div>

      <div className="overflow-hidden bg-white/40 backdrop-blur-xl rounded-2xl border border-white/40 shadow-xl ring-1 ring-slate-200/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Requirement Detail</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Identity</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {visibleRequirements.map((req) => (
              <tr 
                key={req.id} 
                className={cn(
                  "group hover:bg-white/60 transition-colors",
                  req.status === 'SUPERSEDED' && "bg-slate-50/30 opacity-80"
                )}
              >
                <td className="px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-1 p-2 rounded-lg shrink-0",
                      req.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                    )}>
                      {req.status === 'ACTIVE' ? <CheckCircle2 className="h-4 w-4" /> : <History className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className={cn(
                        "text-base font-medium text-slate-900 leading-snug",
                        req.status === 'SUPERSEDED' && "line-through text-slate-400"
                      )}>
                        {req.description}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {req.domain}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                          {req.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700">
                      <ShieldCheck className="h-3 w-3" />
                      <span className="text-[10px] font-mono font-bold tracking-tight">
                        {req.csr_version || 'LEGACY_V0'}
                      </span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 font-mono tracking-tighter">
                      STAMP: {req.executed_at ? new Date(req.executed_at).toISOString().split('T')[0] : 'PRE-RPAS'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm",
                    req.status === 'ACTIVE' 
                      ? "bg-emerald-500 text-white" 
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  )}>
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full animate-pulse",
                      req.status === 'ACTIVE' ? "bg-white" : "bg-amber-500"
                    )} />
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                  {req.status === 'ACTIVE' ? (
                    <>
                      <button
                        onClick={() => onAiResearch(req.id)}
                        disabled={researchingId !== null}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20 hover:bg-primary/20 active:scale-95 transition-all shadow-sm",
                          researchingId !== null && "opacity-50 cursor-not-allowed"
                        )}
                        title="Invoke RPAS-CM AI Research Advisor"
                      >
                        {researchingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        AI Research
                      </button>
                      <button
                        onClick={() => onPropose(req)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 active:scale-95 transition-all shadow-md hover:shadow-lg"
                      >
                        Propose
                        <ArrowUpRight className="h-4 w-4 opacity-70" />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-300 italic">Audit Log Only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {visibleRequirements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No matching artifacts</h3>
            <p className="text-slate-500 max-w-xs mt-2">
              Adjust your search or toggle "Current Baseline Only" to explore the historical ledger.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
