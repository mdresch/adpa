"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinEvent } from "@/lib/digital-twin-types";
import { DigitalTwinEventDetails } from "./DigitalTwinEventDetails";

interface DigitalTwinEventsListProps {
  assetId: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
  skipped: "secondary",
};

export function DigitalTwinEventsList({ assetId }: DigitalTwinEventsListProps) {
  const [events, setEvents] = useState<DigitalTwinEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsEventId, setDetailsEventId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ events: DigitalTwinEvent[] }>(
        `/digital-twin/events?assetId=${encodeURIComponent(assetId)}&limit=50`
      );
      setEvents(res?.events ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load events";
      toast.error(msg);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) fetchEvents();
  }, [assetId]);

  const handleRetry = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/digital-twin/events/${eventId}/retry`);
      toast.success("Retry queued");
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    }
  };

  const openDetails = (eventId: string) => {
    setDetailsEventId(eventId);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Events
          </CardTitle>
          <CardDescription>Event log for this asset.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No events yet. Ingest events via API or connectors.
          </p>
        ) : (
          <ScrollArea className="h-[320px]">
            <ul className="space-y-2">
              {events.map((e) => (
                <li
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetails(e.id)}
                  onKeyDown={(ev) => ev.key === "Enter" && openDetails(e.id)}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.event_type}</span>
                      <Badge variant={statusVariant[e.processing_status] ?? "outline"}>
                        {e.processing_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(e.event_timestamp ?? e.created_at).toLocaleString()}
                    </p>
                  </div>
                  {e.processing_status === "failed" && (
                    <Button variant="outline" size="sm" onClick={(ev) => handleRetry(ev, e.id)}>
                      Retry
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
      <DigitalTwinEventDetails
        eventId={detailsEventId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </Card>
  );
}
