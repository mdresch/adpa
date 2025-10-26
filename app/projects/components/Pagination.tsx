/**
 * Pagination Component
 * Page navigation controls with item count display
 */

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { PaginationState } from "../types"

interface PaginationProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
  loading: boolean
  hasProjects: boolean
}

export function Pagination({
  pagination,
  onPageChange,
  loading,
  hasProjects
}: PaginationProps) {
  // Don't show pagination if loading, no projects, or only 1 page
  if (loading || !hasProjects || pagination.pages <= 1) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="flex items-center justify-between"
    >
      {/* Item count display */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
        {pagination.total} projects
      </div>

      {/* Page controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Page {pagination.page} of {pagination.pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
        >
          Next
        </Button>
      </div>
    </motion.div>
  )
}

