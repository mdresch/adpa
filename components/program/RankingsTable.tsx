"use client"

/**
 * Rankings Table Component
 * Displays project rankings with priority tiers and scores
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Edit, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Ranking {
  project_id: string
  project_name: string
  program_id?: string | null
  program_name?: string | null
  total_score: number
  rank: number
  priority_tier: 'Critical' | 'High' | 'Medium' | 'Low'
  criteria_count: number
  last_scored_at?: string | null
}

interface RankingsTableProps {
  rankings: Ranking[]
  onProjectClick?: (projectId: string) => void
  showActions?: boolean
}

export function RankingsTable({
  rankings,
  onProjectClick,
  showActions = false
}: RankingsTableProps) {
  const getPriorityTierColor = (tier: string) => {
    switch (tier) {
      case 'Critical':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'High':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20'
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'Low':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Rankings Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No projects have been scored yet. Start scoring projects to see rankings.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Tier</TableHead>
                <TableHead className="text-center">Criteria</TableHead>
                <TableHead className="text-center">Last Scored</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((ranking) => (
                <TableRow
                  key={ranking.project_id}
                  className={onProjectClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => onProjectClick?.(ranking.project_id)}
                >
                  <TableCell className="font-bold">
                    #{ranking.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{ranking.project_name}</span>
                      {ranking.program_name && (
                        <span className="text-xs text-muted-foreground">
                          {ranking.program_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-lg">
                        {typeof ranking.total_score === 'number' 
                          ? ranking.total_score.toFixed(2) 
                          : parseFloat(ranking.total_score || '0').toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 5.00</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={getPriorityTierColor(ranking.priority_tier)}
                    >
                      {ranking.priority_tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">
                      {ranking.criteria_count} / 5
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(ranking.last_scored_at)}
                    </span>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onProjectClick?.(ranking.project_id)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Score
                        </Button>
                        <Link href={`/projects/${ranking.project_id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

