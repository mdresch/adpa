'use client'

import dynamic from 'next/dynamic'
import { ShieldCheck } from 'lucide-react'

const ResearcherWorkspace = dynamic(() => import('./researcher-workspace'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] text-slate-400">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary p-1.5 shadow-lg">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <span className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Loading Researcher Command Center…
        </span>
      </div>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
    </div>
  ),
})

export default function ResearcherPage() {
  return <ResearcherWorkspace />
}
