"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinEvent } from "@/lib/digital-twin-types";

interface DigitalTwinEventDetailsProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
  skipped: "secondary",
};

export function DigitalTwinEventDetails({
  eventId,
  open,
  onOpenChange,
}: DigitalTwinEventDetailsProps) {
  const [event, setEvent] = useState<DigitalTwinEvent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !eventId) {
      setEvent(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<{ event: DigitalTwinEvent }>(
          `/digital-twin/events/${eventId}`
        );
        if (!cancelled) setEvent(res?.event ?? null);
      } catch (e: unknown) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load event");
          setEvent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Event details</DialogTitle>
          <DialogDescription>
            Payload, processing status, and metadata.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : !event ? (
          <p className="text-sm text-muted-foreground py-4">No event data.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[event.processing_status] ?? "outline"}>
                {event.processing_status}
              </Badge>
              <span className="text-sm font-medium">{event.event_type}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(event.event_timestamp ?? event.created_at).toLocaleString()}
              </span>
            </div>
            {event.processing_error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {event.processing_error}
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1">Payload</p>
              <ScrollArea className="h-[220px] rounded-md border p-3 font-mono text-sm">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(event.event_payload ?? {}, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
