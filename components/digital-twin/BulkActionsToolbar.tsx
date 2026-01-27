"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, Download, Zap, X } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import { useRouter, useSearchParams } from "next/navigation";

interface BulkActionsToolbarProps {
  assetIds: string[];
  projectId: string;
  onActionComplete?: () => void;
}

export function BulkActionsToolbar({
  assetIds,
  projectId,
  onActionComplete,
}: BulkActionsToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState<string | null>(null);

  const clearSelection = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("assetIds");
    params.delete("assetId");
    params.delete("mode");
    params.set("tab", "assets");
    router.push(`/projects/${projectId}/digital-twins?${params.toString()}`);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${assetIds.length} selected asset(s)? This is a soft delete.`)) return;
    
    try {
      setProcessing("delete");
      const results = await Promise.allSettled(
        assetIds.map(id => apiClient.delete(`/digital-twin/assets/${id}`))
      );
      
      const succeeded = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      if (succeeded > 0) {
        toast.success(`Deleted ${succeeded} asset(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} asset(s)`);
      }
      
      clearSelection();
      onActionComplete?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete assets";
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkSync = async () => {
    try {
      setProcessing("sync");
      // TODO: Implement bulk sync API endpoint
      toast.info("Bulk sync feature coming soon");
      // const results = await Promise.allSettled(
      //   assetIds.map(id => apiClient.post(`/digital-twin/assets/${id}/sync`))
      // );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to sync assets";
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkExport = async () => {
    try {
      setProcessing("export");
      // TODO: Implement bulk export
      toast.info("Bulk export feature coming soon");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to export assets";
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleApplyTriggerRule = () => {
    // Navigate to triggers tab with selected assets
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "triggers");
    params.set("assetIds", assetIds.join(","));
    router.push(`/projects/${projectId}/digital-twins?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-sm">
          {assetIds.length} asset{assetIds.length !== 1 ? "s" : ""} selected
        </Badge>
        <span className="text-sm text-muted-foreground">
          Hold Ctrl/Cmd to select multiple assets
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkSync}
          disabled={!!processing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${processing === "sync" ? "animate-spin" : ""}`} />
          Sync Selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkExport}
          disabled={!!processing}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyTriggerRule}
          disabled={!!processing}
        >
          <Zap className="h-4 w-4 mr-2" />
          Apply Trigger Rule
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleBulkDelete}
          disabled={!!processing}
        >
          <Trash2 className={`h-4 w-4 mr-2 ${processing === "delete" ? "animate-spin" : ""}`} />
          Delete Selected
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          disabled={!!processing}
        >
          <X className="h-4 w-4 mr-2" />
          Clear Selection
        </Button>
      </div>
    </div>
  );
}
