/**
 * EmptyState Component
 * Displays a message when no projects are found
 */

import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { FolderOpen, Plus, Sparkles } from "@/components/ui/icons-shim"
import type { EmptyStateProps } from "../types"

export function EmptyState({
  searchTerm,
  statusFilter,
  onCreateClick
}: EmptyStateProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl inline-block mb-6"
      >
        <FolderOpen className="h-16 w-16 text-slate-400 mx-auto" />
      </motion.div>
      
      <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
        No projects found
      </h3>
      
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {searchTerm || statusFilter !== "all"
          ? "Try adjusting your search or filter criteria to find what you're looking for"
          : "Create your first project to get started with document automation"}
      </p>
      
      {!searchTerm && statusFilter === "all" && (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={onCreateClick}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Project
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            </DialogTrigger>
          </Dialog>
        </motion.div>
      )}
    </motion.div>
  )
}

