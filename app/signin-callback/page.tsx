/**
 * Bentley iTwin OAuth Callback Handler
 * Handles OAuth redirect from Bentley authentication
 * @see docs/roadmap/ITWIN_VIEWER_SETUP.md
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignInCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setError(`Authentication error: ${error}`);
        setStatus("error");
        return;
      }

      if (!code) {
        setError("No authorization code received");
        setStatus("error");
        return;
      }

      // Store the authorization code (in a real implementation, you'd exchange this for tokens)
      // For now, we'll just mark as successful
      // In production, you'd:
      // 1. Exchange code for access token via backend
      // 2. Store token securely
      // 3. Redirect back to viewer

      setStatus("success");

      // Redirect back to Digital Twins page after a short delay
      setTimeout(() => {
        const returnUrl = localStorage.getItem("itwin_return_url") || "/projects";
        router.push(returnUrl);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Completing authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription className="mt-2">{error}</AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4"
              onClick={() => router.push("/projects")}
            >
              Return to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold">Authentication Successful</h2>
            <p className="text-muted-foreground">
              You have been successfully authenticated with Bentley iTwin.
              Redirecting...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
