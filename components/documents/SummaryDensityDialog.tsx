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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SummaryDensityDialog: React.FC<SummaryDensityDialogProps> = ({
  projectId,
  documentId,
  documentTitle,
  fullRawContent,
  open,
  onOpenChange
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<Record<string, MilestoneData> | null>(null);
  const [densityLevel, setDensityLevel] = useState<number>(60); // Default middle ground core view
  const [activeText, setActiveText] = useState<string>('');

  useEffect(() => {
    if (!open) return;

    async function fetchSnapshots() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/documents/${documentId}/versions`);
        if (!res.ok) throw new Error('Failed to fetch versions');
        const data: SummaryResponse = await res.json();
        
        // Inject the full 100% text as the anchor point of our scale map
        setSnapshots({
          ...data.milestones,
          p100: { summary: fullRawContent, timestamp: new Date().toISOString() }
        });
      } catch (err) {
        console.error('Failed loading multi-scale snapshots map:', err);
        // Fallback to just the 100% version if API fails
        setSnapshots({
          p100: { summary: fullRawContent, timestamp: new Date().toISOString() }
        } as any);
      } finally {
        setLoading(false);
      }
    }
    fetchSnapshots();
  }, [projectId, documentId, fullRawContent, open]);

  // Handle textual layout transitions whenever the density slider increments
  useEffect(() => {
    if (!snapshots) return;

    const level = densityLevel;
    if (level <= 20) setActiveText(snapshots.p20?.summary || snapshots.p100?.summary || '');
    else if (level <= 40) setActiveText(snapshots.p40?.summary || snapshots.p100?.summary || '');
    else if (level <= 60) setActiveText(snapshots.p60?.summary || snapshots.p100?.summary || '');
    else if (level <= 80) setActiveText(snapshots.p80?.summary || snapshots.p100?.summary || '');
    else setActiveText(snapshots.p100?.summary || '');
  }, [densityLevel, snapshots]);

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

        {loading ? (
          <div className="flex h-64 items-center justify-center space-x-2 text-zinc-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Compiling multi-scale summaries payload...</span>
          </div>
        ) : (
          <>
            {/* Control Module: The Context Compaction Slider */}
            <div className="space-y-4 bg-zinc-900/50 p-6 border border-zinc-800 rounded-xl shadow-inner">
              <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" /> Information Density State</span>
                <span className="text-emerald-400 font-bold text-sm">{densityLevel}% Compression</span>
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
            <div className="flex flex-col space-y-3 flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> 
                  Runtime Output Content Payload:
                </span>
                {snapshots?.[`p${densityLevel}`]?.timestamp && (
                  <span className="text-[10px] text-zinc-600 font-mono">
                    Generated: {new Date(snapshots[`p${densityLevel}`].timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden relative group">
                <ScrollArea className="h-full max-h-[500px]">
                  <div className="p-8 font-sans text-sm leading-relaxed whitespace-pre-wrap select-text selection:bg-emerald-500/30 text-zinc-300">
                    {activeText || 'No text segment parsed for this scale barrier.'}
                  </div>
                </ScrollArea>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
