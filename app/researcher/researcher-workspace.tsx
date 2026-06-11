'use client'

import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import { AnimatePresence, motion } from 'framer-motion'
import {
  getApiBaseUrl,
  ApiClient,
  RtmRequirement,
  AmendmentProposalRequest,
  ResearchAdvice,
} from '@/lib/api'
import { ClientRtmTable } from '@/components/researcher/client-rtm-table'
import { ProposeAmendmentDialog } from '@/components/researcher/propose-amendment-dialog'
import { NotificationCenter } from '@/components/notification-center'
import { toast } from 'sonner'
import {
  ShieldCheck,
  ExternalLink,
  Database,
  Layers,
  History,
  Activity,
  Sparkles,
} from 'lucide-react'

const api = new ApiClient(getApiBaseUrl())

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUPERSEDED'

export default function ResearcherWorkspace() {
  const [selectedRequirement, setSelectedRequirement] = useState<RtmRequirement | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [aiAdvice, setAiAdvice] = useState<ResearchAdvice | null>(null)
  const [researchingId, setResearchingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const { data: requirements, mutate, error, isLoading } = useSWR(
    '/ritual/rtm/ledger',
    () => api.getRtmLedger()
  )

  const activeCount = useMemo(
    () => requirements?.filter((r) => r.status === 'ACTIVE').length ?? 0,
    [requirements]
  )
  const supersededCount = useMemo(
    () => requirements?.filter((r) => r.status === 'SUPERSEDED').length ?? 0,
    [requirements]
  )
  const totalCount = requirements?.length ?? 0

  const filteredRequirements = useMemo(() => {
    if (!requirements) return []
    if (statusFilter === 'ALL') return requirements
    return requirements.filter((r) => r.status === statusFilter)
  }, [requirements, statusFilter])

  const handleProposeChange = (req: RtmRequirement) => {
    setAiAdvice(null)
    setSelectedRequirement(req)
    setIsDialogOpen(true)
  }

  const handleAiResearch = async (requirementId: string) => {
    setResearchingId(requirementId)
    const target = requirements?.find((r: RtmRequirement) => r.id === requirementId)
    if (target) setSelectedRequirement(target)

    try {
      const advice = await api.getRtmResearchAdvice(requirementId)
      setAiAdvice(advice)
      setIsDialogOpen(true)
      toast.success('AI Consulting Complete', {
        description: 'Evolutionary research advice is now available in the proposal dialog.',
      })
    } catch {
      toast.error('Research Advisor Unavailable', {
        description: 'The Intelligence Tier ritual failed or was gated.',
      })
    } finally {
      setResearchingId(null)
    }
  }

  const handleSubmitProposal = async (proposal: AmendmentProposalRequest) => {
    const promise = api.proposeRtmAmendment(proposal)

    toast.promise(promise, {
      loading: 'Drafting high-integrity proposal...',
      success: (result) => {
        void mutate()
        return `Amendment Intent ${result.id.substring(0, 8)} is now PENDING review.`
      },
      error: (err) => {
        console.error('Proposal failed:', err)
        return 'G5 Authorization Violation: Adhere to RPAS-CM taxonomy.'
      },
    })

    try {
      await promise
    } catch {
      // Errors surfaced via toast.promise
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-primary/20">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="rotate-3 rounded-lg bg-primary p-1.5 shadow-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Researcher Command Center
              </h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1 text-emerald-500">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" /> RPAS
                  CLOUD MASTER SECURED
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                Next.js Expansion Tier ($G5$)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <Database className="h-3.5 w-3.5" />
              RTM LEDGER v2.0-CSR
            </div>
            <NotificationCenter />
            <a
              href="/"
              target="_blank"
              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
              title="Open Management Portal (Governor Only)"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] space-y-8 p-6 lg:p-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`group relative overflow-hidden rounded-2xl border bg-white p-6 text-left shadow-sm transition-all ${
              statusFilter === 'ALL'
                ? 'border-primary bg-primary/[0.01] ring-2 ring-primary/10'
                : 'border-slate-200 hover:shadow-md'
            }`}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
              <Layers className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalCount}</div>
            <div className="mt-1 flex items-center justify-between text-sm font-semibold uppercase tracking-widest text-slate-400">
              <span>Total Artifacts</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                  statusFilter === 'ALL'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {totalCount}
              </span>
            </div>
            {statusFilter === 'ALL' ? (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`group relative overflow-hidden rounded-2xl border bg-white p-6 text-left shadow-sm transition-all ${
              statusFilter === 'ACTIVE'
                ? 'border-emerald-500 bg-emerald-50/[0.05] ring-2 ring-emerald-500/10'
                : 'border-slate-200 hover:shadow-md'
            }`}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
              <Activity className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{activeCount}</div>
            <div className="mt-1 flex items-center justify-between text-sm font-semibold uppercase tracking-widest text-slate-400">
              <span>Active Baseline</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeCount}
              </span>
            </div>
            {statusFilter === 'ACTIVE' ? (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('SUPERSEDED')}
            className={`group relative overflow-hidden rounded-2xl border bg-white p-6 text-left shadow-sm transition-all ${
              statusFilter === 'SUPERSEDED'
                ? 'border-amber-500 bg-amber-50/[0.05] ring-2 ring-amber-500/10'
                : 'border-slate-200 hover:shadow-md'
            }`}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
              <History className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{supersededCount}</div>
            <div className="mt-1 flex items-center justify-between text-sm font-semibold uppercase tracking-widest text-slate-400">
              <span>Superseded Context</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                  statusFilter === 'SUPERSEDED'
                    ? 'bg-amber-500/20 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {supersededCount}
              </span>
            </div>
            {statusFilter === 'SUPERSEDED' ? (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500" />
            ) : null}
          </button>

          <div className="relative overflow-hidden rounded-2xl border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
            <div className="absolute -right-2 -top-2 p-2">
              <Sparkles className="h-16 w-16 -rotate-12 animate-pulse text-white/10" />
            </div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold tracking-tight">CLOUD MASTER</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-300">
              Status: RPAS-CM Certified
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Requirement Traceability Workspace
            </h2>
            <p className="max-w-2xl text-sm font-medium text-slate-500">
              Showing <strong>{filteredRequirements.length}</strong> parameters out of{' '}
              {totalCount}. Analysis of superseded artifacts is encouraged to inform
              high-integrity amendment proposals.
            </p>
          </div>

          {statusFilter !== 'ALL' ? (
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="shrink-0 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-300"
            >
              Reset Filter
            </button>
          ) : null}
        </div>

        <div className="min-h-[520px]">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full space-y-6"
              >
                <div className="h-14 w-full animate-pulse rounded-xl bg-slate-200/60" />
                <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/40 shadow-xl ring-1 ring-slate-200/50">
                  <div className="h-12 w-full animate-pulse border-b border-slate-200/50 bg-slate-100/80" />
                  {[...Array(5)].map((_, idx) => (
                    <div
                      key={`skeleton-row-${idx}`}
                      className="h-16 w-full animate-pulse border-b border-slate-100 bg-slate-50/80 last:border-b-0"
                      style={{ animationDelay: `${idx * 75}ms` }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center rounded-2xl border border-red-100 bg-red-50 p-8 text-center"
            >
              <p className="mb-2 font-bold text-red-900">Ledger Resolution Failed</p>
              <p className="text-sm italic text-red-600">
                Ensure Orchestrator (apiservice) is active in the Aspire mesh.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`table-${statusFilter}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <ClientRtmTable
                requirements={filteredRequirements}
                onPropose={handleProposeChange}
                onAiResearch={handleAiResearch}
                researchingId={researchingId}
              />
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ProposeAmendmentDialog
        requirement={selectedRequirement}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setTimeout(() => {
            setSelectedRequirement(null)
            setAiAdvice(null)
          }, 200)
        }}
        onSubmit={handleSubmitProposal}
        aiAdvice={aiAdvice}
      />
    </div>
  )
}
