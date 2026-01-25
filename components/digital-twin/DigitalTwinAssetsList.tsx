"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, RefreshCw, Loader2, Box, Layers, CheckSquare, Square } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinAsset } from "@/lib/digital-twin-types";
import { DigitalTwinAssetCard } from "./DigitalTwinAssetCard";
import { RegisterAssetDialog } from "./RegisterAssetDialog";
import { BulkActionsToolbar } from "./BulkActionsToolbar";

interface DigitalTwinAssetsListProps {
  projectId: string;
}

export function DigitalTwinAssetsList({ projectId }: DigitalTwinAssetsListProps) {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<DigitalTwinAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  
  // Get selected asset IDs (single or multi)
  const singleAssetId = searchParams.get("assetId");
  const multiAssetIds = searchParams.get("assetIds")?.split(",").filter(Boolean) || [];
  const selectedAssetIds = multiAssetIds.length > 0 ? multiAssetIds : (singleAssetId ? [singleAssetId] : []);
  const isMultiSelectMode = multiAssetIds.length > 0 || searchParams.get("mode") === "bulk";

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ assets: DigitalTwinAsset[] }>(
        `/digital-twin/assets?projectId=${encodeURIComponent(projectId)}`
      );
      setAssets(res?.assets ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load assets";
      toast.error(msg);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchAssets();
  }, [projectId]);

  const handleRegistered = () => {
    setRegisterOpen(false);
    fetchAssets();
  };

  const toggleMultiSelectMode = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isMultiSelectMode) {
      // Switch to single selection mode
      params.delete("mode");
      if (selectedAssetIds.length > 0) {
        // Keep first selected asset
        params.delete("assetIds");
        params.set("assetId", selectedAssetIds[0]);
      } else {
        params.delete("assetIds");
        params.delete("assetId");
      }
    } else {
      // Switch to multi-select mode
      params.set("mode", "bulk");
      if (singleAssetId) {
        params.delete("assetId");
        params.set("assetIds", singleAssetId);
      }
    }
    router.push(`/projects/${projectId}/digital-twins?${params.toString()}`);
  };

  const handleSelectAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    const allIds = assets.map(a => a.id);
    params.delete("assetId");
    params.set("assetIds", allIds.join(","));
    params.set("mode", "bulk");
    params.set("tab", "assets");
    router.push(`/projects/${projectId}/digital-twins?${params.toString()}`);
  };

  const handleDeselectAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("assetId");
    params.delete("assetIds");
    params.delete("mode");
    params.set("tab", "assets");
    router.push(`/projects/${projectId}/digital-twins?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Digital Twin Assets
          </CardTitle>
          <CardDescription>
            Physical assets linked to iTwin, Azure DT, or generic platforms.
            {isMultiSelectMode && " Multi-select mode: Hold Ctrl/Cmd to select multiple."}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {isMultiSelectMode && selectedAssetIds.length > 0 && (
            <>
              {selectedAssetIds.length < assets.length ? (
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  <Square className="h-4 w-4 mr-2" />
                  Deselect All
                </Button>
              )}
            </>
          )}
          <Button
            variant={isMultiSelectMode ? "default" : "outline"}
            size="sm"
            onClick={toggleMultiSelectMode}
          >
            {isMultiSelectMode ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Multi-Select
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Multi-Select
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAssets}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button size="sm" onClick={() => setRegisterOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register asset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedAssetIds.length > 1 && (
          <BulkActionsToolbar
            assetIds={selectedAssetIds}
            projectId={projectId}
            onActionComplete={fetchAssets}
          />
        )}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Box className="h-12 w-12 mb-4 opacity-50" />
            <p className="mb-2">No Digital Twin assets yet</p>
            <p className="text-sm mb-4">
              Register an asset to start receiving events and state snapshots.
            </p>
            <Button onClick={() => setRegisterOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register first asset
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((a) => (
                <DigitalTwinAssetCard
                  key={a.id}
                  asset={a}
                  projectId={projectId}
                  onUpdate={fetchAssets}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
      <RegisterAssetDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        projectId={projectId}
        onRegistered={handleRegistered}
      />
    </Card>
  );
}
