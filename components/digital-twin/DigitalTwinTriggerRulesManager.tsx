"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Plus, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinTriggerRule } from "@/lib/digital-twin-types";
import { CreateTriggerRuleDialog } from "./CreateTriggerRuleDialog";

interface DigitalTwinTriggerRulesManagerProps {
  projectId: string;
}

export function DigitalTwinTriggerRulesManager({
  projectId,
}: DigitalTwinTriggerRulesManagerProps) {
  const [rules, setRules] = useState<DigitalTwinTriggerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ rules: DigitalTwinTriggerRule[] }>(
        `/digital-twin/triggers/rules?projectId=${encodeURIComponent(projectId)}`
      );
      setRules(res?.rules ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load rules";
      toast.error(msg);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchRules();
  }, [projectId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Trigger rules
          </CardTitle>
          <CardDescription>
            Rules that create document triggers when state/events match.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRules} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm mb-2">No trigger rules yet.</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create first rule
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant={r.is_active ? "default" : "secondary"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-muted-foreground">{r.trigger_type}</span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered {r.trigger_count} times
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CreateTriggerRuleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        onCreated={fetchRules}
      />
    </Card>
  );
}
