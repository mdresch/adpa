'use client'

import ProgramDashboardV0 from '@/components/program/ProgramDashboardV0'

interface ProgramDashboardPageProps {
  params: { id: string }
}

export default function ProgramDashboardPage({ params }: ProgramDashboardPageProps) {
  return <ProgramDashboardV0 programId={params.id} />
}

