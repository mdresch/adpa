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

const TRIGGER_TYPES = [
  "state_change",
  "attribute_change",
  "threshold_breach",
  "scheduled",
  "manual",
] as const;

interface CreateTriggerRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

export function CreateTriggerRuleDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: CreateTriggerRuleDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<(typeof TRIGGER_TYPES)[number]>("state_change");
  const [description, setDescription] = useState("");
  const [ruleConfigJson, setRuleConfigJson] = useState("{}");

  const reset = () => {
    setName("");
    setTriggerType("state_change");
    setDescription("");
    setRuleConfigJson("{}");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    let rule_config: Record<string, unknown> = {};
    try {
      rule_config = JSON.parse(ruleConfigJson || "{}");
    } catch {
      toast.error("rule_config must be valid JSON");
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post<{ rule: unknown }>("/digital-twin/triggers/rules", {
        projectId,
        name: name.trim(),
        trigger_type: triggerType,
        description: description.trim() || null,
        rule_config,
        is_active: true,
      });
      toast.success("Trigger rule created");
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create trigger rule</DialogTitle>
          <DialogDescription>
            Define a rule that creates document triggers when state/events match.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HVAC maintenance alert"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Trigger type</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as (typeof TRIGGER_TYPES)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-desc">Description (optional)</Label>
            <Textarea
              id="rule-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When to fire..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-config">rule_config (JSON, optional)</Label>
            <Textarea
              id="rule-config"
              value={ruleConfigJson}
              onChange={(e) => setRuleConfigJson(e.target.value)}
              placeholder='{"event_type": "state_change", ...}'
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
