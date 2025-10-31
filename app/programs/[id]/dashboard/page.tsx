'use client'

import { use } from 'react'
import ProgramDashboardV0 from '@/components/program/ProgramDashboardV0'

export default function ProgramDashboardPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  
  return <ProgramDashboardV0 programId={id} />
}

