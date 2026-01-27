"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { PlatformType } from "@/lib/digital-twin-types";

const PLATFORMS: PlatformType[] = ["iTwin", "AzureDT", "Generic"];
const SYNC_MODES = ["realtime", "polling", "batch", "manual"] as const;

interface CreateIngestionSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

export function CreateIngestionSourceDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: CreateIngestionSourceDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [platformType, setPlatformType] = useState<PlatformType>("Generic");
  const [syncMode, setSyncMode] = useState<(typeof SYNC_MODES)[number]>("manual");
  const [connectionConfigJson, setConnectionConfigJson] = useState("{}");

  const reset = () => {
    setName("");
    setPlatformType("Generic");
    setSyncMode("manual");
    setConnectionConfigJson("{}");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    let connection_config: Record<string, unknown> = {};
    try {
      connection_config = JSON.parse(connectionConfigJson || "{}");
    } catch {
      toast.error("connection_config must be valid JSON");
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post<{ source: unknown }>("/digital-twin/ingestion/sources", {
        projectId,
        name: name.trim(),
        platform_type: platformType,
        sync_mode: syncMode,
        connection_config,
        poll_interval_seconds: 60,
        is_active: false,
      });
      toast.success("Ingestion source created");
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create source");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create ingestion source</DialogTitle>
          <DialogDescription>
            Add a connector config for iTwin, Azure DT, or a generic platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-name">Name</Label>
            <Input
              id="source-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iTwin Project Alpha"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platformType} onValueChange={(v) => setPlatformType(v as PlatformType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sync mode</Label>
            <Select value={syncMode} onValueChange={(v) => setSyncMode(v as (typeof SYNC_MODES)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="connection-config">connection_config (JSON, optional)</Label>
            <Textarea
              id="connection-config"
              value={connectionConfigJson}
              onChange={(e) => setConnectionConfigJson(e.target.value)}
              placeholder='{"url": "...", "apiKey": "..."}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
