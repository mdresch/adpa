'use client';

import React from 'react';
import { createPatch } from 'diff';
import { parseDiff, Diff, Hunk, Decoration } from 'react-diff-view';
import 'react-diff-view/style/index.css';

interface DracoDiffProps {
  oldText: string;
  newText: string;
  ruleCode: string;
}

export default function DracoDiffViewer({ oldText, newText, ruleCode }: DracoDiffProps) {
  const patchString = createPatch(ruleCode, oldText || '', newText || '', 'Production Prompt', 'Arbitrator Compromise');
  const cleanPatch = patchString
    .split('\n')
    .filter(line => !line.startsWith('Index: ') && !line.startsWith('====='))
    .join('\n');
  const files = parseDiff(cleanPatch);

  if (!files || files.length === 0) {
    return <div className="text-xs text-slate-500 p-4 font-mono">No prompt adjustments detected.</div>;
  }

  const [{ hunks }] = files;

  if (!hunks || hunks.length === 0) {
    return <div className="text-xs text-slate-500 p-4 font-mono">No prompt adjustments detected.</div>;
  }

  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950 overflow-hidden font-mono text-xs">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 text-slate-400 font-semibold text-left">
        🧬 Policy Differential Comparison
      </div>
      <div className="p-2 overflow-x-auto text-left">
        <Diff viewType="split" hunks={hunks} className="w-full">
          {(hunks) => hunks.map((hunk) => (
            <React.Fragment key={hunk.content}>
              <Decoration>
                <div className="bg-slate-900 text-slate-500 text-[10px] px-2 py-0.5">{hunk.content}</div>
              </Decoration>
              <Hunk hunk={hunk} />
            </React.Fragment>
          ))}
        </Diff>
      </div>
      <style jsx global>{`
        .diff-code-edit { background-color: rgba(16, 185, 129, 0.15) !important; color: #34d399 !important; }
        .diff-code-delete { background-color: rgba(239, 68, 68, 0.15) !important; color: #f87171 !important; }
        .diff-line-num { background-color: #020617 !important; color: #475569 !important; border-right: 1px solid #1e293b !important; }
      `}</style>
    </div>
  );
}
