"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ExternalLink, Activity, Database, Trash2, Eye } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/lib/notify";
import type { DigitalTwinAsset } from "@/lib/digital-twin-types";

interface DigitalTwinAssetCardProps {
  asset: DigitalTwinAsset;
  projectId: string;
  onUpdate: () => void;
}

const syncStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  paused: "secondary",
  error: "destructive",
  disconnected: "outline",
};

export function DigitalTwinAssetCard({
  asset,
  projectId,
  onUpdate,
}: DigitalTwinAssetCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleting, setDeleting] = useState(false);
  
  // Check if this asset is currently selected (single or multi-select)
  const singleAssetId = searchParams.get("assetId");
  const multiAssetIds = searchParams.get("assetIds")?.split(",").filter(Boolean) || [];
  const isSelected = singleAssetId === asset.id || multiAssetIds.includes(asset.id);
  const isMultiSelectMode = multiAssetIds.length > 0 || (singleAssetId && searchParams.get("mode") === "bulk");

  const handleDelete = async () => {
    if (!confirm(`Delete asset "${asset.name}"? This is a soft delete.`)) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/digital-twin/assets/${asset.id}`);
      toast.success("Asset deleted");
      onUpdate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete asset";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle selection if clicking on buttons, links, checkbox, or dropdown menu
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[role="menu"]') ||
      target.closest('[role="checkbox"]') ||
      target.closest('input[type="checkbox"]')
    ) {
      return;
    }
    
    // Check if Ctrl/Cmd key is pressed (multi-select mode)
    const isMultiSelect = e.ctrlKey || e.metaKey;
    const params = new URLSearchParams(searchParams.toString());
    
    if (isMultiSelect || isMultiSelectMode) {
      // Multi-select mode: toggle this asset in the list
      const currentIds = multiAssetIds.length > 0 ? multiAssetIds : (singleAssetId ? [singleAssetId] : []);
      
      if (isSelected) {
        // Remove from selection
        const newIds = currentIds.filter(id => id !== asset.id);
        params.delete("assetId");
        if (newIds.length === 0) {
          params.delete("assetIds");
          params.delete("mode");
          params.delete("tab");
        } else if (newIds.length === 1) {
          // Switch back to single selection
          params.delete("assetIds");
          params.delete("mode");
          params.set("assetId", newIds[0]);
        } else {
          params.set("assetIds", newIds.join(","));
          params.set("mode", "bulk");
        }
      } else {
        // Add to selection
        const newIds = [...currentIds, asset.id];
        params.delete("assetId");
        params.set("assetIds", newIds.join(","));
        params.set("mode", "bulk");
        if (!params.get("tab")) {
          params.set("tab", "assets");
        }
      }
    } else {
      // Single selection mode: replace current selection
      if (isSelected) {
        // Deselect: remove assetId from URL
        params.delete("assetId");
        params.delete("assetIds");
        params.delete("mode");
        params.delete("tab");
      } else {
        // Select: replace with this asset (single selection)
        params.delete("assetIds");
        params.delete("mode");
        params.set("assetId", asset.id);
        if (!params.get("tab")) {
          params.set("tab", "assets");
        }
      }
    }
    
    router.push(`/projects/${projectId}/digital-twins?${params.toString()}`);
  };

  const handleCheckboxChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentIds = multiAssetIds.length > 0 ? multiAssetIds : (singleAssetId ? [singleAssetId] : []);
    
    if (checked) {
      // Add to selection
      const newIds = [...currentIds, asset.id];
      params.delete("assetId");
      if (newIds.length === 1) {
        // Single selection
        params.set("assetId", newIds[0]);
        params.delete("assetIds");
        params.delete("mode");
      } else {
        // Multi-select
        params.set("assetIds", newIds.join(","));
        params.set("mode", "bulk");
      }
      if (!params.get("tab")) {
        params.set("tab", "assets");
      }
    } else {
      // Remove from selection
      const newIds = currentIds.filter(id => id !== asset.id);
      params.delete("assetId");
      if (newIds.length === 0) {
        params.delete("assetIds");
        params.delete("mode");
        params.delete("tab");
      } else if (newIds.length === 1) {
        // Switch back to single selection
        params.delete("assetIds");
        params.delete("mode");
        params.set("assetId", newIds[0]);
      } else {
        params.set("assetIds", newIds.join(","));
        params.set("mode", "bulk");
      }
    }
    router.push(`/projects/${projectId}/digital-twins?${params.toString()}`);
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all ${
        isSelected ? "ring-2 ring-primary shadow-md" : ""
      } ${isMultiSelectMode ? "hover:ring-1 hover:ring-primary/50" : ""}`}
      onClick={handleCardClick}
      title={isMultiSelectMode ? "Hold Ctrl/Cmd to select multiple" : "Click to select asset"}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="mr-1"
            />
            <span className="font-medium">{asset.name}</span>
            <Badge variant={syncStatusVariant[asset.sync_status] ?? "outline"} className="text-xs">
              {asset.sync_status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {asset.platform_type} · {asset.external_id}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}/digital-twins?assetId=${asset.id}&tab=state`}>
                <Database className="h-4 w-4 mr-2" />
                View State
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}/digital-twins?assetId=${asset.id}&tab=events`}>
                <Activity className="h-4 w-4 mr-2" />
                View Events
              </Link>
            </DropdownMenuItem>
            {asset.platform_type === 'iTwin' && (
              <DropdownMenuItem asChild>
                <Link href={`/projects/${projectId}/digital-twins?assetId=${asset.id}&tab=viewer`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View iModel
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        {asset.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{asset.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>State v{asset.current_state_version}</span>
          {asset.last_synced_at && (
            <span>Synced {new Date(asset.last_synced_at).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1" 
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/projects/${projectId}/digital-twins?assetId=${asset.id}&tab=state`}>
              <Database className="h-4 w-4 mr-2" />
              State
            </Link>
          </Button>
          {asset.platform_type === 'iTwin' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1" 
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/projects/${projectId}/digital-twins?assetId=${asset.id}&tab=viewer`}>
                <Eye className="h-4 w-4 mr-2" />
                iModel
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
