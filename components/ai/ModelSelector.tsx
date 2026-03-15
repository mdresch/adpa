import { useState } from "react";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, CheckCircle, Layers } from "lucide-react";
import { ModelCard } from "./ModelCard";

export interface ModelSelectorProps {
  taskType: "chat" | "extraction" | "completion" | "embedding" | "code";
  value: string; // selected model ID or chain ID
  onChange: (modelId: string, chainId?: string) => void;
  showFallbackOptions?: boolean;
  allowChainSelection?: boolean;
  models?: Array<any>; // Should be AIModel[]
  fallbackChains?: Array<any>; // Should be FallbackChain[]
}

export function ModelSelector({
  taskType,
  value,
  onChange,
  showFallbackOptions = true,
  allowChainSelection = true,
  models = [],
  fallbackChains = [],
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedModel = models.find((m) => m.id === value);
  const selectedChain = fallbackChains.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedModel ? (
            <span className="flex items-center gap-2">
              <ModelCard model={selectedModel} isSelected small />
            </span>
          ) : selectedChain ? (
            <span className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {selectedChain.name} <span className="ml-2 text-xs text-muted-foreground">(Fallback Chain)</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select Model...</span>
          )}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <Command>
          <CommandInput placeholder="Search models or chains..." />
          <CommandList>
            <CommandGroup heading="Models">
              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.display_name || model.name}
                  onSelect={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-2">
                    <ModelCard model={model} small isSelected={model.id === value} />
                    {model.id === value && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {showFallbackOptions && allowChainSelection && fallbackChains.length > 0 && (
              <CommandGroup heading="Fallback Chains">
                {fallbackChains.map((chain) => (
                  <CommandItem
                    key={chain.id}
                    value={chain.name}
                    onSelect={() => {
                      onChange(chain.id, chain.id);
                      setOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      {chain.name}
                      {chain.id === value && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
