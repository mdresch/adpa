"use client";
import React, { useEffect, useState } from "react";
import clsx from "clsx";

// Types
export type PmbokProcessStatus = "not_started" | "in_progress" | "completed" | "failed";
export interface PmbokProcessGanttItem {
  code: string;
  name: string;
  group: string;
  start: string | null;
  end: string | null;
  status: PmbokProcessStatus;
  result?: string;
}

// Gantt bar color by status
const statusColor = {
  not_started: "bg-gray-200",
  in_progress: "bg-blue-400 animate-pulse",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

// Main Gantt Chart Component
export const PmbokGanttChart: React.FC<{ processes: PmbokProcessGanttItem[] }> = ({ processes }) => {
  // Find min/max for time axis
  const times = processes.flatMap(p => [p.start, p.end].filter(Boolean).map(t => new Date(t!)));
  const minTime = times.length ? Math.min(...times.map(t => t.getTime())) : Date.now();
  const maxTime = times.length ? Math.max(...times.map(t => t.getTime())) : Date.now() + 1000 * 60 * 60;
  const timeSpan = maxTime - minTime || 1;

  // Expand/collapse state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-1 text-left">Process</th>
            <th className="px-2 py-1 text-left">Group</th>
            <th className="px-2 py-1 text-left">Gantt</th>
            <th className="px-2 py-1 text-left">Start</th>
            <th className="px-2 py-1 text-left">End</th>
            <th className="px-2 py-1 text-left">Status</th>
            <th className="px-2 py-1 text-left">Result</th>
          </tr>
        </thead>
        <tbody>
          {processes.map(proc => {
            // Gantt bar position/width
            const startPct = proc.start ? ((new Date(proc.start).getTime() - minTime) / timeSpan) * 100 : 0;
            const endPct = proc.end ? ((new Date(proc.end).getTime() - minTime) / timeSpan) * 100 : startPct + 5;
            const widthPct = Math.max(endPct - startPct, 2);
            return (
              <React.Fragment key={proc.code}>
                <tr className="border-b">
                  <td className="px-2 py-1 whitespace-nowrap">{proc.code} {proc.name}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{proc.group}</td>
                  <td className="px-2 py-1">
                    <div className="relative h-6 w-full bg-gray-100 rounded">
                      <div
                        className={clsx("absolute h-6 rounded", statusColor[proc.status])}
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                        title={proc.status}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1 text-xs">{proc.start ? new Date(proc.start).toLocaleTimeString() : "--"}</td>
                  <td className="px-2 py-1 text-xs">{proc.end ? new Date(proc.end).toLocaleTimeString() : "--"}</td>
                  <td className="px-2 py-1">
                    <span className={clsx("px-2 py-1 rounded text-xs font-bold", {
                      "bg-gray-300": proc.status === "not_started",
                      "bg-blue-200": proc.status === "in_progress",
                      "bg-green-200": proc.status === "completed",
                      "bg-red-200": proc.status === "failed",
                    })}>{proc.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-2 py-1">
                    <button
                      className="text-blue-600 underline text-xs"
                      onClick={() => setExpanded(e => ({ ...e, [proc.code]: !e[proc.code] }))}
                    >
                      {expanded[proc.code] ? "Hide" : "Show"}
                    </button>
                  </td>
                </tr>
                {expanded[proc.code] && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="px-4 py-2 text-xs font-mono whitespace-pre-wrap">
                      {proc.result || <span className="italic text-gray-400">No result yet</span>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Dynamic Gantt page loading from backend API
export default function PmbokGanttPage() {
  const [processes, setProcesses] = useState<PmbokProcessGanttItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/pmbok-processes")
      .then(res => res.json())
      .then(data => {
        setProcesses(data);
        setLoading(false);
      });
  }, []);
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">PMBOK Process Gantt Progress</h2>
      {loading ? <div>Loading...</div> : <PmbokGanttChart processes={processes} />}
    </div>
  );
}
