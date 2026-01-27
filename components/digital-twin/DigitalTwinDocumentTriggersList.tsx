"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, RefreshCw, ExternalLink } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinDocumentTrigger } from "@/lib/digital-twin-types";

interface DigitalTwinDocumentTriggersListProps {
  projectId: string;
  assetId?: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
  cancelled: "secondary",
};

export function DigitalTwinDocumentTriggersList({
  projectId,
  assetId,
}: DigitalTwinDocumentTriggersListProps) {
  const [triggers, setTriggers] = useState<DigitalTwinDocumentTrigger[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTriggers = async () => {
    try {
      setLoading(true);
      const q = assetId
        ? `assetId=${encodeURIComponent(assetId)}`
        : `projectId=${encodeURIComponent(projectId)}&limit=100`;
      const res = await apiClient.get<{ triggers: DigitalTwinDocumentTrigger[] }>(
        `/digital-twin/triggers?${q}`
      );
      setTriggers(res?.triggers ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load document triggers";
      toast.error(msg);
      setTriggers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId || assetId) fetchTriggers();
  }, [projectId, assetId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document triggers
          </CardTitle>
          <CardDescription>
            Fired when rules match; link to generated documents.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTriggers} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : triggers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No document triggers yet. Create rules and process events to generate triggered docs.
          </p>
        ) : (
          <ScrollArea className="h-[240px]">
            <ul className="space-y-2">
              {triggers.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[t.status] ?? "outline"}>{t.status}</Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(t.triggered_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Asset {t.asset_id.slice(0, 8)}…
                      {t.event_id && ` · Event ${t.event_id.slice(0, 8)}…`}
                    </p>
                  </div>
                  {t.document_id && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/projects/${projectId}/documents/${t.document_id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View doc
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
