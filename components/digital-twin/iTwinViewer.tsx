/**
 * iTwin Viewer Component
 * Embeds Bentley iTwin.js viewer for 3D iModel visualization
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md - Visualization section
 * @see https://www.itwinjs.org/learning/tutorials/ for iTwin.js documentation
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "@/lib/notify";

interface iTwinViewerProps {
  itwinId?: string;
  imodelId?: string;
  assetId?: string;
  assetName?: string;
}

/**
 * iTwin Viewer Component
 * 
 * Note: This component requires iTwin.js packages to be installed:
 * - @itwin/viewer-react
 * - @itwin/itwinui-react (optional, for Bentley-aligned UI)
 * 
 * Environment variables required (Bentley standard naming):
 * - IMJS_AUTH_CLIENT_CLIENT_ID (or NEXT_PUBLIC_ITWIN_CLIENT_ID for Next.js compatibility)
 * - IMJS_AUTH_CLIENT_SCOPES (or defaults to "itwins:read imodels:read")
 * - IMJS_AUTH_CLIENT_REDIRECT_URI (or NEXT_PUBLIC_ITWIN_REDIRECT_URI)
 * - IMJS_ITWIN_ID (optional, can be passed as prop)
 * - IMJS_IMODEL_ID (optional, can be passed as prop)
 */
export function ITwinViewer({ itwinId, imodelId, assetId, assetName }: iTwinViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [viewerInitialized, setViewerInitialized] = useState(false);

  useEffect(() => {
    if (!itwinId || !imodelId) {
      setError("iTwin ID and iModel ID are required to view iModel");
      setLoading(false);
      return;
    }

    initializeViewer();

    return () => {
      // Cleanup viewer on unmount
      if (viewerRef.current) {
        viewerRef.current.innerHTML = "";
      }
    };
  }, [itwinId, imodelId]);

  const initializeViewer = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if iTwin.js is available
      // Note: In production, these would be imported at the top
      // For now, we'll use dynamic imports and handle the case where packages aren't installed
      try {
        // Dynamic import of iTwin.js viewer
        // This will fail if packages aren't installed, which is expected
        const { Viewer } = await import("@itwin/viewer-react");
        const { IModelApp } = await import("@itwin/core-frontend");
        const { AuthorizationClient } = await import("@itwin/core-common");

        // Initialize iTwin App
        // Support both Bentley standard (IMJS_*) and Next.js (NEXT_PUBLIC_*) env vars
        const clientId = 
          process.env.IMJS_AUTH_CLIENT_CLIENT_ID || 
          process.env.NEXT_PUBLIC_ITWIN_CLIENT_ID || 
          "";
        const redirectUri = 
          process.env.IMJS_AUTH_CLIENT_REDIRECT_URI || 
          process.env.NEXT_PUBLIC_ITWIN_REDIRECT_URI || 
          `${window.location.origin}/signin-callback`;
        const scopes = 
          process.env.IMJS_AUTH_CLIENT_SCOPES || 
          "itwins:read imodels:read";

        if (!IModelApp.initialized) {
          await IModelApp.startup({
            authorizationClient: new AuthorizationClient({
              clientId,
              redirectUri,
              scope: scopes,
            }),
          });
        }

        setAuthenticated(true);
        setViewerInitialized(true);
        setLoading(false);
      } catch (importError: any) {
        // iTwin.js packages not installed - show helpful message
        if (importError.message?.includes("Cannot find module") || importError.code === "MODULE_NOT_FOUND") {
          setError(
            "iTwin.js packages not installed. Please install: @itwin/viewer-react, @itwin/core-frontend, @itwin/core-common"
          );
        } else {
          setError(`Failed to initialize iTwin viewer: ${importError.message}`);
        }
        setLoading(false);
      }
    } catch (err: any) {
      setError(`Failed to initialize viewer: ${err.message}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Initializing iTwin Viewer...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>iTwin Viewer Error</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
              {error.includes("not installed") && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">To install iTwin.js packages:</p>
                  <code className="block p-2 bg-muted rounded text-xs">
                    pnpm add @itwin/viewer-react @itwin/core-frontend @itwin/core-common @itwin/itwinui-react
                  </code>
                  <p className="text-sm text-muted-foreground mt-2">
                    Also ensure environment variables are set:
                    <br />
                    NEXT_PUBLIC_ITWIN_CLIENT_ID=your_client_id
                    <br />
                    NEXT_PUBLIC_ITWIN_REDIRECT_URI={window.location.origin}/signin-callback
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
          {itwinId && imodelId && (
            <div className="mt-4">
              <Button
                variant="outline"
                asChild
                className="w-full"
              >
                <a
                  href={`https://www.itwinjs.org/viewer?itwinId=${itwinId}&imodelId=${imodelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Bentley iTwin Viewer (External)
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!viewerInitialized) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading iModel...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full">
        <div className="relative w-full h-[600px] bg-muted">
          {/* iTwin Viewer will be rendered here */}
          <div ref={viewerRef} className="w-full h-full" id="itwin-viewer-container" />
          
          {/* Fallback: If viewer doesn't render, show message */}
          {viewerRef.current && viewerRef.current.children.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 p-6">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Viewer container ready. iTwin.js viewer will render here once packages are installed.
                </p>
                {itwinId && imodelId && (
                  <Button variant="outline" asChild>
                    <a
                      href={`https://www.itwinjs.org/viewer?itwinId=${itwinId}&imodelId=${imodelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Bentley iTwin Viewer (External)
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simplified iTwin Viewer using iframe approach (fallback)
 * This works without installing iTwin.js packages by using Bentley's hosted viewer
 */
export function iTwinViewerIframe({ itwinId, imodelId, assetName }: iTwinViewerProps) {
  if (!itwinId || !imodelId) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>iModel Information Required</AlertTitle>
            <AlertDescription>
              iTwin ID and iModel ID are required to view the iModel. Please configure these in the asset settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Use Bentley's hosted viewer URL
  // Note: This requires proper authentication setup
  const viewerUrl = `https://www.itwinjs.org/viewer?itwinId=${itwinId}&imodelId=${imodelId}`;

  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full">
        <div className="relative w-full h-[600px] bg-muted border rounded-lg overflow-hidden">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={`iTwin Viewer - ${assetName || 'iModel'}`}
            allow="fullscreen"
            allowFullScreen
          />
          <div className="absolute top-2 right-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
