"use client";

import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface HistoryPoint {
  timestamp: string;
  score: number;
}

interface SparklineProps {
  history: HistoryPoint[];
  status: string | null;
}

export const ControlTrendSparkline = memo(({ history, status }: SparklineProps) => {
  if (!history || history.length < 2) {
    return <div className="text-xs text-slate-400 italic text-center">Awaiting data points...</div>;
  }

  const getChartColor = () => {
    if (status === "INEFFECTIVE") return { stroke: "#f43f5e", fill: "#ffe4e6" }; // Rose
    if (status === "PARTIALLY_EFFECTIVE") return { stroke: "#f59e0b", fill: "#fef3c7" }; // Amber
    return { stroke: "#10b981", fill: "#d1fae5" }; // Emerald
  };

  const colors = getChartColor();

  return (
    <div className="h-10 w-32 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`grad-${status}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.fill} stopOpacity={0.6}/>
              <stop offset="95%" stopColor={colors.fill} stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="score"
            stroke={colors.stroke}
            strokeWidth={1.5}
            fillOpacity={1}
            fill={`url(#grad-${status})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

ControlTrendSparkline.displayName = "ControlTrendSparkline";

interface GovernanceMapping {
  framework: string;
  section: string;
  label: string;
  auditImpact: string;
}

interface Rule {
  id: string;
  rule_code: string;
  title: string;
  document_type: string;
  control_effectiveness_score: number | null;
  control_effectiveness_status: "HIGHLY_EFFECTIVE" | "EFFECTIVE" | "PARTIALLY_EFFECTIVE" | "INEFFECTIVE" | null;
  last_effectiveness_update: string | null;
  telemetry: {
    totalInvocations: number;
    userOverrideCount: number;
    successfulPatches: number;
    averageComplianceScore: number;
  };
  effectiveness_history: HistoryPoint[];
  governanceMappings?: GovernanceMapping[]; // Injected by your async translation layer
}

export default function PolicyLibraryDashboard() {
  const [viewMode, setViewMode] = useState<"developer" | "cobit">("developer");
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch('/api/v1/policy-library');
        const data = await res.json();
        setRules(data);
      } catch (err) {
        console.error("Failed loading policy library runtime metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: Rule['control_effectiveness_status']) => {
    switch (status) {
      case "HIGHLY_EFFECTIVE":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium">HIGHLY EFFECTIVE</Badge>;
      case "EFFECTIVE":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-medium">EFFECTIVE</Badge>;
      case "PARTIALLY_EFFECTIVE":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black">PARTIALLY EFFECTIVE</Badge>;
      case "INEFFECTIVE":
        return <Badge variant="destructive" className="animate-pulse font-black">INEFFECTIVE</Badge>;
      default:
        return <Badge variant="secondary">INITIALIZING (COLD START)</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Structural Abstract Toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">ADPA Policy Compiler & Governance Registry</h1>
          <p className="text-sm text-slate-500 mt-1">Runtime governance enforcement loop and continuous control verification.</p>
        </div>
        
        <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as any)} className="w-[300px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="developer">👨💻 Developer View</TabsTrigger>
            <TabsTrigger value="cobit">👔 COBIT 2019 Audit</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Top Level Strategic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Governance Stance</CardTitle>
            <Shield className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Continuous</div>
            <p className="text-xs text-slate-400 mt-1">Zero-sampling execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Critical Control Deficiencies</CardTitle>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {rules.filter(r => r.control_effectiveness_status === "INEFFECTIVE").length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Requires architectural optimization</p>
          </CardContent>
        </Card>
        
        {/* ... Additional metadata metric cards ... */}
      </div>

      {/* Primary Registry Grid Section */}
      <Card className="shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle>{viewMode === "developer" ? "Technical Rule Telemetry" : "COBIT 2019 Control Objective Alignment"}</CardTitle>
          <CardDescription>
            {viewMode === "developer" 
              ? "Displays raw compilation data, code-level execution contexts, and engineer bypass metrics."
              : "Maps runtime execution loop performance to standardized ITGI management goals and control statements."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {viewMode === "developer" ? (
                <TableRow>
                  <TableHead className="w-[120px]">Rule Code</TableHead>
                  <TableHead>Target Context</TableHead>
                  <TableHead className="text-center">Total Invocations</TableHead>
                  <TableHead className="text-center">User Bypasses</TableHead>
                  <TableHead className="text-right">Remediation Rate</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead className="w-[140px]">COBIT 2019 Ref</TableHead>
                  <TableHead className="w-[120px]">Internal Code</TableHead>
                  <TableHead>Control Objective Statement & Audit Impact</TableHead>
                  <TableHead className="w-[150px] text-center">Maturity Trend (30d)</TableHead>
                  <TableHead className="w-[180px] text-center">Effectiveness Rating</TableHead>
                  <TableHead className="w-[100px] text-right">Score</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400 animate-pulse">Querying database infrastructure logs...</TableCell></TableRow>
              ) : rules.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No active control boundaries registered in the compiler engine.</TableCell></TableRow>
              ) : (
                rules.map((rule) => (
                  <React.Fragment key={rule.id}>
                    {viewMode === "developer" ? (
                      /* Developer View Row Configuration */
                      <TableRow className="hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold text-slate-700">{rule.rule_code}</TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">{rule.title}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{rule.document_type}</div>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-800">{rule.telemetry.totalInvocations}</TableCell>
                        <TableCell className="text-center text-amber-600 font-medium">{rule.telemetry.userOverrideCount}</TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {rule.telemetry.userOverrideCount > 0 
                            ? `${((rule.telemetry.successfulPatches / rule.telemetry.userOverrideCount) * 100).toFixed(1)}%`
                            : "100.0%"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      /* COBIT 2019 Auditor View Row Configuration */
                      <TableRow className="hover:bg-slate-50/50 border-b">
                        <TableCell className="font-mono font-bold text-indigo-700 bg-indigo-50/30 px-2 rounded text-center">
                          {/* Fallback mock display if mapping isn't fully expanded in database row */}
                          {rule.governanceMappings?.[0]?.section || "MEA01.03"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{rule.rule_code}</TableCell>
                        <TableCell className="pr-4">
                          <div className="font-semibold text-slate-900">
                            {rule.governanceMappings?.[0]?.label || `Monitor and Assess Conformance: ${rule.title}`}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-dashed">
                            <span className="font-bold text-slate-700">Audit Evidence Statement: </span>
                            {rule.governanceMappings?.[0]?.auditImpact || "Validates design architecture parameters against target organizational data control restrictions autonomously before code commit."}
                          </p>
                        </TableCell>
                        <TableCell className="align-middle text-center">
                          <ControlTrendSparkline 
                            history={rule.effectiveness_history} 
                            status={rule.control_effectiveness_status} 
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle">{getStatusBadge(rule.control_effectiveness_status)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800 text-sm">
                          {rule.control_effectiveness_score !== null 
                            ? rule.control_effectiveness_score.toFixed(3) 
                            : "1.000"}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
