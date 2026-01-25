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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { PlatformType } from "@/lib/digital-twin-types";

const PLATFORMS: PlatformType[] = ["iTwin", "AzureDT", "Generic"];

interface RegisterAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onRegistered: () => void;
}

export function RegisterAssetDialog({
  open,
  onOpenChange,
  projectId,
  onRegistered,
}: RegisterAssetDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [platformType, setPlatformType] = useState<PlatformType>("Generic");
  const [platformInstanceUrl, setPlatformInstanceUrl] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setName("");
    setExternalId("");
    setPlatformType("Generic");
    setPlatformInstanceUrl("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !externalId.trim()) {
      toast.error("Name and External ID are required");
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post<{ asset: unknown }>("/digital-twin/assets", {
        projectId,
        name: name.trim(),
        external_id: externalId.trim(),
        platform_type: platformType,
        platform_instance_url: platformInstanceUrl.trim() || null,
        description: description.trim() || null,
      });
      toast.success("Asset registered");
      reset();
      onRegistered();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to register asset";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Digital Twin Asset</DialogTitle>
          <DialogDescription>
            Add a physical asset from iTwin, Azure Digital Twins, or a generic source.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HVAC Unit A-1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="externalId">External ID</Label>
            <Input
              id="externalId"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="Platform-specific asset ID"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={platformType}
              onValueChange={(v) => setPlatformType(v as PlatformType)}
            >
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
            <Label htmlFor="platformInstanceUrl">Platform instance URL (optional)</Label>
            <Input
              id="platformInstanceUrl"
              value={platformInstanceUrl}
              onChange={(e) => setPlatformInstanceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
