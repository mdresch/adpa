/**
 * ProjectCard Component
 * Individual project card with progress, team info, and action menu
 */

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FolderOpen,
  Calendar,
  FileText,
  Users,
  Clock,
  MoreHorizontal,
  Edit,
  Wand2,
  FileUp,
  Archive,
  Trash2,
} from "@/components/ui/icons-shim"
import { AnimatedGridItem } from "@/components/animated-layout"
import { getStatusColor, getPriorityColor, getProjectProgress } from "../utils/helpers"
import type { ProjectCardProps } from "../types"

export function ProjectCard({
  project,
  index,
  onEdit,
  onDelete,
  onArchive,
  onGenerateDocument,
  onUploadDocument
}: ProjectCardProps) {
  const progress = getProjectProgress(project)
  const documentsCount = (project as any).document_count || 0

  return (
    <AnimatedGridItem>
      <Card className="glass border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden">
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <CardHeader className="relative">
          {/* Icon and Badges */}
          <div className="flex items-start justify-between">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
            >
              <FolderOpen className="h-6 w-6 text-white" />
            </motion.div>
            
            {/* Status Badges */}
            <div className="flex flex-col space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
              >
                <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.4, type: "spring" }}
              >
                <Badge variant="outline" className="border-slate-300 dark:border-slate-600">
                  {project.framework}
                </Badge>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.5, type: "spring" }}
              >
                <Badge className={getPriorityColor(project.priority)}>{project.priority}</Badge>
              </motion.div>
            </div>
          </div>
          
          {/* Project Title */}
          <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
              {project.name}
            </Link>
          </CardTitle>
          
          {/* Project Description */}
          <CardDescription className="line-clamp-2 text-slate-600 dark:text-slate-300">
            {project.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">Progress</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.6 }}
                className="font-bold text-blue-600 dark:text-blue-400"
              >
                {progress}%
              </motion.span>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: index * 0.1 + 0.7, duration: 0.8 }}
            >
              <Progress value={progress} className="h-3 bg-slate-100 dark:bg-slate-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: index * 0.1 + 0.8, duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                />
              </Progress>
            </motion.div>
          </div>

          {/* Timeline and Documents Count */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.9 }}
              className="space-y-1"
            >
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                <Calendar className="h-3 w-3" />
                <span>Timeline</span>
              </div>
              <p className="font-medium text-xs text-slate-700 dark:text-slate-200">
                {project.start_date && new Date(project.start_date).toLocaleDateString()} -{" "}
                {project.end_date && new Date(project.end_date).toLocaleDateString()}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 1.0 }}
              className="space-y-1"
            >
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                <FileText className="h-3 w-3" />
                <span>Documents</span>
              </div>
              <p className="font-medium text-slate-700 dark:text-slate-200">
                {documentsCount} files
              </p>
            </motion.div>
          </div>

          {/* Team Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 1.1 }}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
              <Users className="h-3 w-3" />
              <span className="text-sm">Team</span>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm text-slate-700 dark:text-slate-200">
                {project.team_members?.length || 0} members
              </p>
              {(project as any).owner_name && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manager: {(project as any).owner_name}
                </p>
              )}
            </div>
          </motion.div>

          {/* Last Activity and Actions Menu */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Last activity: {new Date((project as any).last_activity || project.updated_at).toLocaleDateString()}
              </span>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 1.2, type: "spring" }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass border-0 shadow-xl">
                  <DropdownMenuItem 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => onEdit(project)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => onGenerateDocument(project)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Document
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => onUploadDocument(project)}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload Document
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => onArchive(project.id)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => onDelete(project.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </AnimatedGridItem>
  )
}

