/**
 * Standards Compliance Page
 * SC-28: Standards Compliance & Governance Framework Foundation
 * 
 * Main landing page for the compliance module
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CompliancePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/compliance/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
