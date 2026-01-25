"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Hash, RefreshCw, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinAssetState } from "@/lib/digital-twin-types";

interface DigitalTwinStateViewerProps {
  assetId: string;
}

export function DigitalTwinStateViewer({ assetId }: DigitalTwinStateViewerProps) {
  const [current, setCurrent] = useState<DigitalTwinAssetState | null>(null);
  const [history, setHistory] = useState<DigitalTwinAssetState[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchState = async () => {
    try {
      setLoading(true);
      const [curSettled, histSettled] = await Promise.allSettled([
        apiClient.get<{ state: DigitalTwinAssetState | null }>(
          `/digital-twin/assets/${assetId}/current-state`
        ),
        apiClient.get<{ states: DigitalTwinAssetState[] }>(
          `/digital-twin/assets/${assetId}/history?limit=20`
        ),
      ]);
      const curRes = curSettled.status === "fulfilled" ? curSettled.value : null;
      const histRes = histSettled.status === "fulfilled" ? histSettled.value : null;
      setCurrent(curRes?.state ?? null);
      setHistory(histRes?.states ?? []);
      if (curSettled.status === "rejected" && histSettled.status === "rejected") {
        toast.error("Failed to load state");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load state";
      toast.error(msg);
      setCurrent(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) fetchState();
  }, [assetId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            State
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!current && history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            State
          </CardTitle>
          <CardDescription>No state snapshots yet for this asset.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const state = current ?? history[0];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            State v{state.state_version}
          </CardTitle>
          <CardDescription>
            {state.state_hash && (
              <span className="flex items-center gap-1 font-mono text-xs">
                <Hash className="h-3 w-3" />
                {state.state_hash.slice(0, 16)}…
              </span>
            )}
            {state.changed_fields?.length > 0 && (
              <span className="ml-2">Changed: {state.changed_fields.join(", ")}</span>
            )}
          </CardDescription>
        </div>
        <Badge variant={state.is_current ? "default" : "secondary"}>
          {state.is_current ? "Current" : "History"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[280px] rounded-md border p-3 font-mono text-sm">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(state.state_snapshot, null, 2)}
          </pre>
        </ScrollArea>
        {history.length > 1 && (
          <div>
            <p className="text-sm font-medium mb-2">History</p>
            <div className="flex flex-wrap gap-2">
              {history.map((s) => (
                <Badge
                  key={s.id}
                  variant={s.is_current ? "default" : "outline"}
                  className="cursor-default"
                >
                  v{s.state_version}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
