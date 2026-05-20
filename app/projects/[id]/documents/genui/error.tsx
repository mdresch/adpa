"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentGenUIError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    console.error("[DocumentGenUI]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-slate-950 text-slate-100">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Generative UI workspace failed to load</h2>
      <p className="text-sm text-slate-400 max-w-md text-center">
        {error.message || "An unexpected error occurred while rendering the document workspace."}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
        <Button asChild>
          <Link href={`/projects/${projectId}/documents`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to documents
          </Link>
        </Button>
      </div>
    </div>
  );
}
