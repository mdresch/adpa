/**
 * iTwin iModel Viewer Page
 * Full-page viewer for Bentley iTwin iModels
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md - Visualization section
 */

"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { ITwinViewer } from "@/components/digital-twin/iTwinViewer";
import { apiClient } from "@/lib/api";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DigitalTwinAsset } from "@/lib/digital-twin-types";

export default function iTwinViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const assetId = searchParams.get("assetId");
  const itwinId = searchParams.get("itwinId");
  const imodelId = searchParams.get("imodelId");

  const [asset, setAsset] = useState<DigitalTwinAsset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (assetId) {
      fetchAsset();
    } else {
      setLoading(false);
    }
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const response = await apiClient.get<{ asset: DigitalTwinAsset }>(
        `/digital-twin/assets/${assetId}`
      );
      setAsset(response.asset);
      
      // Extract iTwin/iModel IDs from asset metadata or platform_instance_url
      // These could be stored in metadata or derived from platform_instance_url
      if (response.asset.metadata) {
        const metadata = response.asset.metadata as Record<string, unknown>;
        // iTwin/iModel IDs might be in metadata
      }
    } catch (error) {
      console.error("Failed to fetch asset:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get iTwin/iModel IDs from search params or asset metadata
  const finalItwinId = itwinId || (asset?.metadata as any)?.itwinId || (asset?.platform_instance_url?.match(/itwinId=([^&]+)/)?.[1]);
  const finalImodelId = imodelId || (asset?.metadata as any)?.imodelId || (asset?.platform_instance_url?.match(/imodelId=([^&]+)/)?.[1]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/projects/${projectId}/digital-twins${assetId ? `?assetId=${assetId}` : ''}`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Digital Twins
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {asset ? `${asset.name} - iModel Viewer` : "iTwin iModel Viewer"}
            </h1>
            {asset && (
              <p className="text-sm text-muted-foreground">
                {asset.platform_type} · {asset.external_id}
              </p>
            )}
          </div>
        </div>
        {finalItwinId && finalImodelId && (
          <Button variant="outline" asChild>
            <a
              href={`https://www.itwinjs.org/viewer?itwinId=${finalItwinId}&imodelId=${finalImodelId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        )}
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="space-y-4 w-full max-w-md px-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        ) : (
          <ITwinViewer
            itwinId={finalItwinId}
            imodelId={finalImodelId}
            assetId={assetId || undefined}
            assetName={asset?.name}
          />
        )}
      </div>
    </div>
  );
}
