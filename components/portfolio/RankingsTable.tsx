'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, TrendingUp } from 'lucide-react';
import { toast } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';

interface Ranking {
  project_id: string;
  project_name: string;
  total_score: number;
  rank: number;
  criteria_scored: number;
  last_scored_at: string;
  status: string;
  budget: number;
}

type SortField = keyof Ranking;

export function RankingsTable() {
  const { token, isAuthenticated } = useAuth();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRankings();
  }, [token, isAuthenticated]);

  async function loadRankings() {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/portfolio/rankings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rankings');
      }

      const data = await response.json();
      setRankings(data.rankings || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rankings';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const sortedRankings = [...rankings].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * multiplier;
    }
    return String(aVal).localeCompare(String(bVal)) * multiplier;
  });

  function getRankBadge(rank: number) {
    if (rank <= 3) return <Badge variant="default">Top {rank}</Badge>;
    if (rank <= 10) return <Badge variant="secondary">#{rank}</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  }

  function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'planning':
        return 'secondary';
      case 'on-hold':
        return 'destructive';
      default:
        return 'secondary';
    }
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  }

  function navigateToProject(projectId: string) {
    window.location.href = `/projects/${projectId}`;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Please sign in to view portfolio rankings.
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Portfolio Rankings</h2>
          <Button onClick={loadRankings} variant="outline">
            Retry
          </Button>
        </div>
        <div className="text-center py-12 text-destructive">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Portfolio Rankings</h2>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Loading rankings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Rankings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sortedRankings.length} project{sortedRankings.length !== 1 ? 's' : ''} scored
          </p>
        </div>
        <Button onClick={loadRankings} variant="outline">
          Refresh
        </Button>
      </div>

      {sortedRankings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No projects have been scored yet.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rank')}
                    className="h-auto p-0 hover:bg-transparent"
                  >
                    Rank
                    {sortField === 'rank' && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('project_name')}
                    className="h-auto p-0 hover:bg-transparent"
                  >
                    Project
                    {sortField === 'project_name' && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('total_score')}
                    className="h-auto p-0 hover:bg-transparent ml-auto"
                  >
                    Score
                    {sortField === 'total_score' && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Criteria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Last Scored</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRankings.map((ranking) => (
                <TableRow
                  key={ranking.project_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigateToProject(ranking.project_id)}
                >
                  <TableCell className="font-medium">
                    {getRankBadge(ranking.rank)}
                  </TableCell>
                  <TableCell className="font-medium">{ranking.project_name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-lg font-bold">
                        {ranking.total_score.toFixed(2)}
                      </span>
                      {ranking.rank <= 3 && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{ranking.criteria_scored} scored</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(ranking.status)}>
                      {ranking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${formatNumber(ranking.budget)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(ranking.last_scored_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
