"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { debounce } from "lodash"
import { apiClient, Project } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/lib/notify"
import { trackFilterUsage, trackPageEngagement } from "@/lib/analytics/clarity"

import { ProjectsHeader } from "./components/ProjectsHeader"
import { ProjectsGrid } from "./components/ProjectsGrid"
import { EmptyState } from "./components/EmptyState"
import { Pagination } from "./components/Pagination"
import { CreateProjectModal } from "./components/dialogs/CreateProjectModal"
import { EditProjectModal } from "./components/dialogs/EditProjectModal"
import { GenerateDocumentModal } from "./components/dialogs/GenerateDocumentModal"
import { UploadDocumentModal } from "./components/dialogs/UploadDocumentModal"
import { consumeAutoCreateProjectDraft } from "./utils/project-draft"
import type { NewProjectForm, PaginationState } from "./types"

type ActiveModal = "CREATE" | "EDIT" | "GENERATE" | "UPLOAD" | null

export default function ProjectsWorkspace() {
  const { isAuthenticated } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 9,
    total: 0,
    pages: 0,
  })

  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [createInitialForm, setCreateInitialForm] = useState<NewProjectForm | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      const params: Record<string, string | number | undefined> = {
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm || undefined,
      }

      const response = await apiClient.getProjects(params)
      setProjects(response.projects || [])
      setPagination(
        response.pagination || { page: 1, limit: pagination.limit, total: 0, pages: 0 }
      )
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, pagination.page, pagination.limit, statusFilter, searchTerm])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value)
        setPagination((p) => ({ ...p, page: 1 }))
      }, 450),
    []
  )

  useEffect(() => {
    return () => debouncedSetSearch.cancel()
  }, [debouncedSetSearch])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      debouncedSetSearch(value)
    },
    [debouncedSetSearch]
  )

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status)
    setPagination((p) => ({ ...p, page: 1 }))
  }, [])

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = a.last_activity
        ? new Date(a.last_activity).getTime()
        : a.updated_at
          ? new Date(a.updated_at).getTime()
          : 0
      const bTime = b.last_activity
        ? new Date(b.last_activity).getTime()
        : b.updated_at
          ? new Date(b.updated_at).getTime()
          : 0
      return bTime - aTime
    })
  }, [projects])

  useEffect(() => {
    if (statusFilter !== "all") {
      trackFilterUsage("status", statusFilter, pagination.total)
    }
    if (searchTerm.trim()) {
      trackFilterUsage("search", searchTerm, pagination.total)
    }
  }, [statusFilter, searchTerm, pagination.total])

  useEffect(() => {
    const startTime = Date.now()
    let interactionCount = 0
    const handleInteraction = () => {
      interactionCount++
    }

    document.addEventListener("click", handleInteraction)
    document.addEventListener("scroll", handleInteraction)

    return () => {
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("scroll", handleInteraction)
      trackPageEngagement("/projects", Math.floor((Date.now() - startTime) / 1000), interactionCount)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const draftForm = consumeAutoCreateProjectDraft()
    if (draftForm) {
      setCreateInitialForm(draftForm)
      setActiveModal("CREATE")
      toast.success("Business case loaded! Review and complete the project details.")
    }
  }, [isAuthenticated])

  const closeModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeModal = useCallback(() => {
    setActiveModal(null)
    if (closeModalTimerRef.current) clearTimeout(closeModalTimerRef.current)
    closeModalTimerRef.current = setTimeout(() => {
      setSelectedProject(null)
      setCreateInitialForm(null)
      closeModalTimerRef.current = null
    }, 200)
  }, [])

  useEffect(() => {
    return () => {
      if (closeModalTimerRef.current) clearTimeout(closeModalTimerRef.current)
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access projects.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ProjectsHeader
        searchTerm={searchInput}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onCreateClick={() => setActiveModal("CREATE")}
        projectsCount={loading ? "..." : pagination.total}
      />

      <ProjectsGrid
        projects={sortedProjects}
        loading={loading}
        onEdit={(project) => {
          setSelectedProject(project)
          setActiveModal("EDIT")
        }}
        onDelete={async (projectId) => {
          if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            return
          }
          try {
            await apiClient.deleteProject(projectId)
            toast.success("Project deleted successfully!")
            fetchProjects()
          } catch (error) {
            console.error("Failed to delete project:", error)
            toast.error("Failed to delete project")
          }
        }}
        onArchive={async (projectId) => {
          try {
            await apiClient.updateProject(projectId, { status: "archived" })
            toast.success("Project archived successfully!")
            fetchProjects()
          } catch (error) {
            console.error("Failed to archive project:", error)
            toast.error("Failed to archive project")
          }
        }}
        onGenerateDocument={(project) => {
          setSelectedProject(project)
          setActiveModal("GENERATE")
        }}
        onUploadDocument={(project) => {
          setSelectedProject(project)
          setActiveModal("UPLOAD")
        }}
      />

      {!loading && sortedProjects.length === 0 && (
        <EmptyState
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onCreateClick={() => setActiveModal("CREATE")}
        />
      )}

      <Pagination
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        loading={loading}
        hasProjects={sortedProjects.length > 0}
      />

      <CreateProjectModal
        isOpen={activeModal === "CREATE"}
        onClose={closeModal}
        onSuccess={fetchProjects}
        initialForm={createInitialForm}
      />

      <EditProjectModal
        project={selectedProject}
        isOpen={activeModal === "EDIT"}
        onClose={closeModal}
        onSuccess={fetchProjects}
      />

      <GenerateDocumentModal
        project={selectedProject}
        isOpen={activeModal === "GENERATE"}
        onClose={closeModal}
      />

      <UploadDocumentModal
        project={selectedProject}
        isOpen={activeModal === "UPLOAD"}
        onClose={closeModal}
        onSuccess={fetchProjects}
      />
    </div>
  )
}
