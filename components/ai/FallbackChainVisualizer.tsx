import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Timer, Repeat, CheckCircle } from "lucide-react";
import type { FC } from "react";

export interface FallbackChainVisualizerProps {
  chain: {
    id: string;
    name: string;
    entries: Array<{
      id: string;
      model: { name: string; display_name?: string; provider: { name: string; iconUrl?: string } };
      timeout_ms?: number;
      retry_attempts?: number;
      success_rate?: number;
    }>;
  };
}

export const FallbackChainVisualizer: FC<FallbackChainVisualizerProps> = ({ chain }) => {
  return (
    <Card className="glass p-4">
      <CardContent className="flex flex-row items-center gap-4 overflow-x-auto">
        {chain.entries.map((entry, idx) => (
          <div key={entry.id} className="flex flex-col items-center min-w-[120px]">
            <div className="flex items-center gap-2 mb-1">
              {entry.model.provider.iconUrl ? (
                <img src={entry.model.provider.iconUrl} alt={entry.model.provider.name} className="w-6 h-6 rounded-full bg-white/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                  {entry.model.provider.name[0]}
                </div>
              )}
              <span className="font-semibold text-sm">{entry.model.display_name || entry.model.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="w-4 h-4" /> {entry.timeout_ms || 30000}ms
              <Repeat className="w-4 h-4 ml-2" /> {entry.retry_attempts || 1}x
            </div>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs">{entry.success_rate !== undefined ? `${Math.round(entry.success_rate * 100)}%` : "-"}</span>
            </div>
            {idx < chain.entries.length - 1 && (
              <ArrowRight className="w-6 h-6 text-primary mx-2" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
