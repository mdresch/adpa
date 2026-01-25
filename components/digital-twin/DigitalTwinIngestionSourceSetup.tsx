"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, RefreshCw, Plus, Play, Pause } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinIngestionSource } from "@/lib/digital-twin-types";
import { CreateIngestionSourceDialog } from "./CreateIngestionSourceDialog";

interface DigitalTwinIngestionSourceSetupProps {
  projectId: string;
}

export function DigitalTwinIngestionSourceSetup({
  projectId,
}: DigitalTwinIngestionSourceSetupProps) {
  const [sources, setSources] = useState<DigitalTwinIngestionSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ sources: DigitalTwinIngestionSource[] }>(
        `/digital-twin/ingestion/sources?projectId=${encodeURIComponent(projectId)}`
      );
      setSources(res?.sources ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load sources";
      toast.error(msg);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchSources();
  }, [projectId]);

  const handleStart = async (id: string) => {
    try {
      await apiClient.post(`/digital-twin/ingestion/sources/${id}/start`);
      toast.success("Sync started");
      fetchSources();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start");
    }
  };

  const handlePause = async (id: string) => {
    try {
      await apiClient.post(`/digital-twin/ingestion/sources/${id}/pause`);
      toast.success("Sync paused");
      fetchSources();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to pause");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ingestion sources
          </CardTitle>
          <CardDescription>
            Connector config for iTwin, Azure DT, or generic platforms.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSources} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add source
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm mb-2">No ingestion sources yet.</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add first source
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="outline">{s.platform_type}</Badge>
                    <Badge variant={s.is_active ? "default" : "secondary"}>
                      {s.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.sync_mode} · {s.sync_status}
                  </p>
                </div>
                <div className="flex gap-2">
                  {s.is_active ? (
                    <Button variant="outline" size="sm" onClick={() => handlePause(s.id)}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleStart(s.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CreateIngestionSourceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        onCreated={fetchSources}
      />
    </Card>
  );
}
