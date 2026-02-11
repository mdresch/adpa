import Link from 'next/link'
import ProjectDashboardV0 from '@/components/project/ProjectDashboardV0'
import { Button } from '@/components/ui/button'

interface ProjectDashboardPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { id } = await params

  if (!id || id === 'undefined') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-muted-foreground">Invalid project.</p>
        <Button asChild variant="outline">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  return <ProjectDashboardV0 projectId={id} />
}

