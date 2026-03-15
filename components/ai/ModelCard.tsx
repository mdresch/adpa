import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, DollarSign, CheckCircle, XCircle } from "lucide-react";
import type { FC } from "react";

export interface ModelCardProps {
  model: {
    id: string;
    name: string;
    display_name?: string;
    provider: { name: string; iconUrl?: string };
    is_active: boolean;
    cost_per_1k_input_tokens?: number;
    quality_score?: number; // 1-5
    context_length?: number;
    last_used?: string;
    success_rate?: number;
  };
  small?: boolean;
  isSelected?: boolean;
  isInChain?: boolean;
  showMetrics?: boolean;
  onSelect?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
}

export const ModelCard: FC<ModelCardProps> = ({
  model,
  small,
  isSelected,
  isInChain,
  showMetrics,
  onSelect,
  onConfigure,
  onRemove,
}) => {
  const displayName = model.display_name || model.name;
  const providerInitial = model.provider.name?.[0] ?? "?";
  const providerIcon = model.provider.iconUrl ? (
    <img
      src={model.provider.iconUrl}
      alt={model.provider.name}
      className="w-8 h-8 rounded-full bg-white/30"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
      {providerInitial}
    </div>
  );

  if (small) {
    return (
      <div className="flex items-center gap-2">
        <div className="shrink-0">
          {model.provider.iconUrl ? (
            <img
              src={model.provider.iconUrl}
              alt={model.provider.name}
              className="w-6 h-6 rounded-full bg-white/30"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
              {providerInitial}
            </div>
          )}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground">{model.provider.name}</span>
        </div>
        {isInChain && (
          <Badge variant="secondary" className="ml-2">
            In Chain
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={`relative transition-shadow glass ${isSelected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="flex flex-row items-center gap-4">
        {providerIcon}
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {displayName}
            {model.is_active ? (
              <Badge
                variant="secondary"
                className="ml-2 border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="ml-2 border-destructive/30 bg-destructive/10 text-destructive"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Inactive
              </Badge>
            )}
            {isInChain && <Badge variant="secondary" className="ml-2">In Chain</Badge>}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {model.provider.name} &bull; Context: {model.context_length || "?"} tokens
          </CardDescription>
        </div>
        {onRemove && (
          <Button size="icon" variant="ghost" onClick={onRemove} className="ml-2 text-destructive"><XCircle /></Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-row items-center gap-4 py-2">
        <div className="flex flex-col items-center">
          <span className="text-xs">Cost</span>
          <span className="flex items-center gap-1">
            {model.cost_per_1k_input_tokens !== undefined ? (
              <>
                {[...Array(getCostTier(model.cost_per_1k_input_tokens))].map((_, i) => (
                  <DollarSign key={i} className="w-4 h-4 text-amber-500" />
                ))}
              </>
            ) : "?"}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs">Quality</span>
          <span className="flex items-center gap-1">
            {typeof model.quality_score === "number" ? (
              [...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < (model.quality_score ?? 0) ? "text-yellow-400" : "text-muted-foreground"}`} />
              ))
            ) : "?"}
          </span>
        </div>
        {showMetrics && (
          <div className="flex flex-col items-center">
            <span className="text-xs">Success</span>
            <span className="text-sm font-medium">{model.success_rate !== undefined ? `${Math.round(model.success_rate * 100)}%` : "-"}</span>
          </div>
        )}
        {onSelect && (
          <Button size="sm" variant={isSelected ? "default" : "outline"} onClick={onSelect} className="ml-auto">
            {isSelected ? "Selected" : "Select"}
          </Button>
        )}
        {onConfigure && (
          <Button size="icon" variant="ghost" onClick={onConfigure} className="ml-2"><Star /></Button>
        )}
      </CardContent>
    </Card>
  );
};

function getCostTier(cost: number) {
  if (cost < 0.002) return 1;
  if (cost < 0.02) return 2;
  return 3;
}
