"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Layers, Database, Activity, Zap, Settings, ChevronRight, Eye, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { DigitalTwinAssetsList } from "@/components/digital-twin/DigitalTwinAssetsList";
import { DigitalTwinStateViewer } from "@/components/digital-twin/DigitalTwinStateViewer";
import { DigitalTwinEventsList } from "@/components/digital-twin/DigitalTwinEventsList";
import { DigitalTwinTriggerRulesManager } from "@/components/digital-twin/DigitalTwinTriggerRulesManager";
import { DigitalTwinDocumentTriggersList } from "@/components/digital-twin/DigitalTwinDocumentTriggersList";
import { DigitalTwinIngestionSourceSetup } from "@/components/digital-twin/DigitalTwinIngestionSourceSetup";
import { iTwinViewerIframe } from "@/components/digital-twin/iTwinViewer";

export default function DigitalTwinsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const assetId = searchParams.get("assetId") ?? undefined;
  const assetIds = searchParams.get("assetIds")?.split(",").filter(Boolean) || [];
  const isMultiSelect = assetIds.length > 0 || searchParams.get("mode") === "bulk";
  const tab = searchParams.get("tab") || "assets";
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);

  // Fetch asset when assetId changes to check platform_type
  useEffect(() => {
    if (assetId) {
      fetchAssetForViewer();
    } else {
      setSelectedAsset(null);
      setLoadingAsset(false);
    }
  }, [assetId]);

  const fetchAssetForViewer = async () => {
    try {
      setLoadingAsset(true);
      const { apiClient } = await import("@/lib/api");
      const response = await apiClient.get<{ asset: any }>(`/digital-twin/assets/${assetId}`);
      setSelectedAsset(response.asset);
    } catch (error) {
      console.error("Failed to fetch asset:", error);
      setSelectedAsset(null);
    } finally {
      setLoadingAsset(false);
    }
  };

  // Check if viewer tab should be enabled
  const canViewiModel = assetId && selectedAsset?.platform_type === "iTwin";
  
  // Determine tooltip message for disabled iModel Viewer tab
  const getViewerTooltipMessage = (): string => {
    if (isMultiSelect) {
      return "iModel Viewer is only available for single asset selection. Please select only one asset.";
    }
    
    if (!assetId) {
      return "Select an asset from the Assets tab to view its iModel.";
    }
    
    if (loadingAsset) {
      return "Loading asset information...";
    }
    
    if (!selectedAsset) {
      return "Failed to load asset information. Please try again.";
    }
    
    if (selectedAsset.platform_type !== "iTwin") {
      return `This asset is a ${selectedAsset.platform_type} asset. iModel Viewer is only available for iTwin platform assets.`;
    }
    
    // If we get here, the asset is iTwin type but the tab is still disabled
    // This shouldn't happen based on canViewiModel logic, but provide a fallback message
    return "iModel Viewer is not available for this asset. Please check the asset configuration.";
  };

  const setTab = (value: string) => {
    const u = new URLSearchParams(searchParams.toString());
    u.set("tab", value);
    router.push(`/projects/${projectId}/digital-twins?${u.toString()}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Layers className="h-8 w-8" />
            Digital Twins
          </h1>
          <p className="text-muted-foreground mt-1">
            Assets, events, state snapshots, and document triggers
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/projects/${projectId}`}>
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Project
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TooltipProvider>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="assets">
              <Layers className="h-4 w-4 mr-2" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="state" disabled={!assetId || isMultiSelect}>
              <Database className="h-4 w-4 mr-2" />
              State
            </TabsTrigger>
            <TabsTrigger value="events" disabled={!assetId || isMultiSelect}>
              <Activity className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="triggers">
              <Zap className="h-4 w-4 mr-2" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="ingestion">
              <Settings className="h-4 w-4 mr-2" />
              Ingestion
            </TabsTrigger>
            {(!canViewiModel || isMultiSelect) ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <TabsTrigger value="viewer" disabled={true}>
                      <Eye className="h-4 w-4 mr-2" />
                      iModel Viewer
                    </TabsTrigger>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{getViewerTooltipMessage()}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <TabsTrigger value="viewer">
                <Eye className="h-4 w-4 mr-2" />
                iModel Viewer
              </TabsTrigger>
            )}
          </TabsList>
        </TooltipProvider>

        <TabsContent value="assets" className="space-y-4">
          <DigitalTwinAssetsList projectId={projectId} />
        </TabsContent>

        <TabsContent value="state" className="space-y-4">
          {assetId ? (
            <DigitalTwinStateViewer assetId={assetId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select an asset from the Assets tab to view its state.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {assetId ? (
            <DigitalTwinEventsList assetId={assetId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select an asset from the Assets tab to view its events.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <DigitalTwinTriggerRulesManager projectId={projectId} />
          <DigitalTwinDocumentTriggersList projectId={projectId} assetId={assetId} />
        </TabsContent>

        <TabsContent value="ingestion" className="space-y-4">
          <DigitalTwinIngestionSourceSetup projectId={projectId} />
        </TabsContent>

        <TabsContent value="viewer" className="space-y-4">
          {assetId ? (
            <iTwinViewerWrapper assetId={assetId} projectId={projectId} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select an iTwin asset from the Assets tab to view its iModel.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Wrapper component to fetch asset and extract iTwin/iModel IDs
function iTwinViewerWrapper({ assetId, projectId }: { assetId: string; projectId: string }) {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAsset();
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/digital-twin/assets/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      const data = await response.json();
      setAsset(data.asset);
    } catch (error) {
      console.error('Failed to fetch asset:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading asset information...</p>
        </CardContent>
      </Card>
    );
  }

  if (!asset || asset.platform_type !== 'iTwin') {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          This asset is not an iTwin asset. iModel viewer is only available for iTwin platform assets.
        </CardContent>
      </Card>
    );
  }

  // Extract iTwin/iModel IDs from asset metadata or platform_instance_url
  const metadata = asset.metadata || {};
  const itwinId = metadata.itwinId || (asset.platform_instance_url?.match(/itwinId=([^&]+)/)?.[1]);
  const imodelId = metadata.imodelId || (asset.platform_instance_url?.match(/imodelId=([^&]+)/)?.[1]);

  if (!itwinId || !imodelId) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">
            iTwin ID and iModel ID are required to view the iModel.
          </p>
          <p className="text-sm text-muted-foreground">
            Please configure these in the asset settings or metadata.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <iTwinViewerIframe
      itwinId={itwinId}
      imodelId={imodelId}
      assetId={assetId}
      assetName={asset.name}
    />
  );
}
