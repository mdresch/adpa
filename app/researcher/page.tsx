'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { getApiBaseUrl, ApiClient, RtmRequirement, AmendmentProposalRequest, ResearchAdvice } from '@/lib/api'
import { ClientRtmTable } from '@/components/researcher/client-rtm-table'
import { ProposeAmendmentDialog } from '@/components/researcher/propose-amendment-dialog'
import { toast } from 'sonner'
import { 
  ShieldCheck, 
  ExternalLink, 
  Database, 
  Layers, 
  History,
  Activity,
  Zap,
  Sparkles
} from 'lucide-react'

const api = new ApiClient(getApiBaseUrl())

export default function ResearcherDashboard() {
  const [selectedRequirement, setSelectedRequirement] = useState<RtmRequirement | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [aiAdvice, setAiAdvice] = useState<ResearchAdvice | null>(null)
  const [isResearching, setIsResearching] = useState(false)

  // SWR for RTM Ledger - RPAS-CM Certified
  const { data: requirements, mutate, error, isLoading } = useSWR(
    '/ritual/rtm/ledger',
    () => api.getRtmLedger()
  )

  const handleProposeChange = (req: RtmRequirement) => {
    setAiAdvice(null)
    setSelectedRequirement(req)
    setIsDialogOpen(true)
  }

  const handleAiResearch = async (requirementId: string) => {
    setIsResearching(true)
    const target = requirements?.find((r: RtmRequirement) => r.id === requirementId)
    if (target) setSelectedRequirement(target)
    
    try {
      const advice = await api.getRtmResearchAdvice(requirementId)
      setAiAdvice(advice)
      setIsDialogOpen(true)
      toast.success('AI Consulting Complete', {
        description: 'Evolutionary research advice is now available in the proposal dialog.'
      })
    } catch (err) {
      toast.error('Research Advisor Unavailable', {
        description: 'The Intelligence Tier ritual failed or was gated.'
      })
    } finally {
      setIsResearching(false)
    }
  }

  const handleSubmitProposal = async (proposal: AmendmentProposalRequest) => {
    try {
      const result = await api.proposeRtmAmendment(proposal)
      toast.success('Proposal Drafted Successfully', {
        description: `Amendment Intent ${result.id.substring(0,8)} is now PENDING Governor review.`
      })
      mutate() // Refresh the local state if needed
    } catch (err) {
      console.error('Proposal failed:', err)
      toast.error('G5 Authorization Violation', {
        description: 'Ensure the proposal adheres to RPAS-CM taxonomy.'
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-primary/20">
      
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-1.5 rounded-lg shadow-lg rotate-3">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Researcher Command Center</h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="text-emerald-500 flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> RPAS CLOUD MASTER SECURED
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" /> 
                Next.js Expansion Tier ($G5$)
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200 text-xs font-medium text-slate-600">
              <Database className="h-3.5 w-3.5" />
              RTM LEDGER v2.0-CSR
            </div>
            <a 
              href="/" 
              target="_blank" 
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              title="Open Management Portal (Governor Only)"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">
        
        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{requirements?.length || 0}</div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">Total Artifacts</div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {requirements?.filter(r => r.status === 'ACTIVE').length || 0}
            </div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">Active Baseline</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <History className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {requirements?.filter(r => r.status === 'SUPERSEDED').length || 0}
            </div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">Superseded Context</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2">
              <Zap className="h-12 w-12 text-primary/5 -rotate-12" />
            </div>
            <div className="h-10 w-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-lg font-bold text-slate-900">CLOUD MASTER</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Status: RPAS-CM Certified</div>
          </div>
        </div>

        {/* Workspace Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Requirement Traceability Workspace</h2>
          <p className="text-slate-500 text-sm max-w-2xl font-medium">
            Explore the full RTM Historical Ledger. Analysis of superseded artifacts is encouraged to inform high-integrity amendment proposals.
          </p>
        </div>

        {/* Main Interface */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="h-12 w-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
            <div className="text-sm font-bold tracking-widest uppercase">Consulting RPAS Ledger...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center flex flex-col items-center">
            <p className="text-red-900 font-bold mb-2">Ledger Resolution Failed</p>
            <p className="text-red-600 text-sm italic">Ensure Orchestrator (apiservice) is active in the Aspire mesh.</p>
          </div>
        ) : (
          <ClientRtmTable 
            requirements={requirements || []} 
            onPropose={handleProposeChange}
            onAiResearch={handleAiResearch}
            isResearching={isResearching}
          />
        )}

      </main>

      {/* Ritual Layer */}
      <ProposeAmendmentDialog 
        requirement={selectedRequirement}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmitProposal}
        aiAdvice={aiAdvice}
      />

    </div>
  )
}
