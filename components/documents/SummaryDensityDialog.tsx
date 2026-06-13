"use client";

import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Award, Layers, Eye, RefreshCw, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MilestoneData {
  summary: string;
  timestamp: string;
}

interface SummaryResponse {
  documentId: string;
  milestones: {
    p20: MilestoneData;
    p40: MilestoneData;
    p60: MilestoneData;
    p80: MilestoneData;
  };
}

interface SummaryDensityDialogProps {
  projectId: string;
  documentId: string;
  documentTitle: string;
  fullRawContent: string;
  contextSnapshots?: Record<string, { summary?: string; timestamp?: string | null }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SummaryDensityDialog: React.FC<SummaryDensityDialogProps> = ({
  projectId,
  documentId,
  documentTitle,
  fullRawContent,
  contextSnapshots,
  open,
  onOpenChange
}) => {
  const [snapshots, setSnapshots] = useState<Record<string, MilestoneData> | null>(null);
  const [densityLevel, setDensityLevel] = useState<number>(60); // Default middle ground core view
  const [activeText, setActiveText] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    
    // Inject the full 100% text as the anchor point of our scale map
    const mappedSnapshots: Record<string, MilestoneData> = {
      p100: { summary: fullRawContent, timestamp: new Date().toISOString() }
    };

    // If the document already has pre-computed context snapshots from generation, merge them
    if (contextSnapshots) {
      if (contextSnapshots.p80?.summary) mappedSnapshots.p80 = { summary: contextSnapshots.p80.summary, timestamp: contextSnapshots.p80.timestamp || new Date().toISOString() };
      if (contextSnapshots.p60?.summary) mappedSnapshots.p60 = { summary: contextSnapshots.p60.summary, timestamp: contextSnapshots.p60.timestamp || new Date().toISOString() };
      if (contextSnapshots.p40?.summary) mappedSnapshots.p40 = { summary: contextSnapshots.p40.summary, timestamp: contextSnapshots.p40.timestamp || new Date().toISOString() };
      if (contextSnapshots.p20?.summary) mappedSnapshots.p20 = { summary: contextSnapshots.p20.summary, timestamp: contextSnapshots.p20.timestamp || new Date().toISOString() };
    }

    setSnapshots(mappedSnapshots);
  }, [fullRawContent, contextSnapshots, open]);

  // Simulated extraction logic to provide visual feedback if API snapshots fail
  const getSimulatedSummary = (text: string, level: number) => {
    if (!text || level >= 100) return text || '';
    // Split into sentences roughly
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= 1) return text;
    
    // Calculate how many sentences to keep based on density percentage
    const targetCount = Math.max(1, Math.ceil(sentences.length * (level / 100)));
    return sentences.slice(0, targetCount).join(' ');
  };

  // Handle textual layout transitions whenever the density slider increments
  useEffect(() => {
    if (!snapshots) return;

    const level = densityLevel;
    
    // Try to extract from the snapshot payload
    let snapshotText = '';
    if (level <= 20) snapshotText = snapshots.p20?.summary || '';
    else if (level <= 40) snapshotText = snapshots.p40?.summary || '';
    else if (level <= 60) snapshotText = snapshots.p60?.summary || '';
    else if (level <= 80) snapshotText = snapshots.p80?.summary || '';
    
    // If the specific snapshot doesn't exist (e.g. API failed), simulate the compression locally
    if (snapshotText && snapshotText !== fullRawContent) {
      setActiveText(snapshotText);
    } else {
      setActiveText(getSimulatedSummary(fullRawContent, level));
    }
  }, [densityLevel, snapshots, fullRawContent]);

  const getCompressionLabel = (val: number) => {
    if (val <= 20) return { label: '20% Token-Optimized Capsule', variant: 'warning' as const };
    if (val <= 40) return { label: '40% Structural Boundary View', variant: 'default' as const };
    if (val <= 60) return { label: '60% Governance Logic Baseline', variant: 'secondary' as const };
    if (val <= 80) return { label: '80% High-Density Narrative', variant: 'outline' as const };
    return { label: '100% Full Audit Specification', variant: 'success' as const };
  };

  const badgeMeta = getCompressionLabel(densityLevel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-6 bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Award className="text-emerald-400 h-6 w-6" />
                Context Snapshot Compactor
              </DialogTitle>
              <DialogDescription className="text-zinc-400 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                {documentTitle}
              </DialogDescription>
            </div>
            <Badge variant={badgeMeta.variant === 'success' ? 'default' : badgeMeta.variant as any} className="font-mono">
              {badgeMeta.label}
            </Badge>
          </div>
        </DialogHeader>

        <>
          {/* Control Module: The Context Compaction Slider */}
            <div className="space-y-4 bg-zinc-900/50 p-6 border border-zinc-800 rounded-xl shadow-inner">
              <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" /> Information Density State</span>
                <span className="text-emerald-400 font-extrabold text-sm animate-in fade-in tabular-nums">{densityLevel}% Compression</span>
              </div>
              
              <Slider
                value={[densityLevel]}
                min={20}
                max={100}
                step={20}
                onValueChange={(vals) => setDensityLevel(vals[0])}
                className="py-2"
              />
              
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1 uppercase tracking-wider">
                <span>20% Capsule</span>
                <span>40% Boundary</span>
                <span>60% Baseline</span>
                <span>80% Narrative</span>
                <span>100% Full Spec</span>
              </div>
            </div>

            {/* Active Output Render Block */}
            <div className="flex flex-col space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> 
                  Runtime Output Content Payload:
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-zinc-400 font-mono font-semibold tabular-nums">
                    {activeText.length.toLocaleString()} characters
                  </span>
                  {snapshots?.[`p${densityLevel}`]?.timestamp && (
                    <span className="text-[10px] text-zinc-600 font-mono">
                      Generated: {new Date(snapshots[`p${densityLevel}`].timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="relative group w-full">
                <textarea
                  readOnly
                  value={activeText}
                  placeholder="No text segment parsed for this scale barrier."
                  className="h-64 w-full resize-none overflow-y-auto border border-zinc-800 bg-zinc-900/50 p-6 font-sans text-sm leading-relaxed text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-700 focus-visible:ring-0 focus-visible:outline-none rounded-xl"
                />
              </div>
            </div>
          </>
      </DialogContent>
    </Dialog>
  );
};
