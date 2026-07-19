'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Network, 
  BookOpen, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Layers
} from 'lucide-react';

interface Agent {
  agent_id: string;
  role_id: string;
  name: string;
  classification: { domain: string; tier: string; criticality: string };
  authority: { standards: string[]; decision_scope: string[]; escalation_path: string[] };
  responsibilities: { id: string; description: string; success_criteria?: string[] }[];
  capabilities: string[];
  knowledge_base: { skb_id: string };
}

interface PmbokMapping {
  [process: string]: { primary_agent: string; supporting_agents: string[] };
}

export default function AgentGovernancePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [mapping, setMapping] = useState<PmbokMapping>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/agents/registry');
        const data = await res.json();
        
        setAgents(data.agents || []);
        setMapping(data.processMapping || {});
      } catch (err) {
        console.error('Failed to load agent governance data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      const agent = agents.find(a => a.agent_id === selectedAgentId);
      setSelectedAgent(agent || null);
    }
  }, [selectedAgentId, agents]);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.role_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-slate-900 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="text-blue-600 w-8 h-8" />
            Agent Governance Framework
          </h1>
          <p className="text-slate-500 mt-1">
            Deterministic Role-Driven Execution Model & PMBOK Knowledge Mapping
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search agents or roles..." 
            className="pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Agent Registry */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">
            <Cpu className="w-4 h-4" />
            Active Agent Registry
          </div>
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {filteredAgents.map(agent => (
              <button
                key={agent.agent_id}
                onClick={() => setSelectedAgentId(agent.agent_id)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                  selectedAgentId === agent.agent_id 
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                    {agent.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    {agent.role_id} • {agent.agent_id}
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 transition-transform ${selectedAgentId === agent.agent_id ? 'translate-x-1 text-blue-600' : 'text-slate-300 group-hover:text-blue-400'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details & Knowledge Graph */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedAgent ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Network className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700">No Agent Selected</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">
                Select an agent from the registry to inspect its authority, responsibilities, and knowledge mapping.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Agent Identity Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedAgent.classification.criticality === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedAgent.classification.criticality} Criticality
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 p-3 rounded-2xl text-white">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedAgent.name}</h2>
                    <p className="text-slate-500 font-mono text-sm">{selectedAgent.role_id} • {selectedAgent.agent_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                      <Layers className="w-3 h-3" />
                      Governance Tier
                    </div>
                    <div className="text-lg font-semibold text-slate-800">{selectedAgent.classification.tier}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                      <Shield className="w-3 h-3" />
                      Domain
                    </div>
                    <div className="text-lg font-semibold text-slate-800">{selectedAgent.classification.domain}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                      <BookOpen className="w-3 h-3" />
                      Auth Framework
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAgent.authority.standards.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Responsibilities */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Responsibilities
                  </h3>
                  <div className="space-y-4">
                    {selectedAgent.responsibilities.map(resp => (
                      <div key={resp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-sm font-medium text-slate-800">{resp.description}</div>
                        {resp.success_criteria && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {resp.success_criteria.map(crit => (
                              <span key={crit} className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full font-medium">
                                {crit}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Knowledge Base */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Semantic Knowledge Base
                  </h3>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
                    <div className="text-xs font-bold text-blue-400 uppercase mb-1">Knowledge ID</div>
                    <div className="text-lg font-mono font-bold text-blue-700">{selectedAgent.knowledge_base.skb_id}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 border-b border-slate-100">
                      <span className="text-sm text-slate-500">Ontology Layer</span>
                      <span className="text-sm font-medium text-slate-800">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-2 border-b border-slate-100">
                      <span className="text-sm text-slate-500">Authority Sources</span>
                      <span className="text-sm font-medium text-slate-800">{selectedAgent.authority.standards.length} Linked</span>
                    </div>
                    <div className="flex items-center justify-between p-2">
                      <span className="text-sm text-slate-500">Isolation Level</span>
                      <span className="text-sm font-medium text-slate-800">Role-Scoped</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PMBOK Process Network */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5 text-purple-500" />
                  PMBOK Process Network
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(mapping).filter(([_, val]) => 
                    val.primary_agent === selectedAgent.agent_id || 
                    val.supporting_agents.includes(selectedAgent.agent_id)
                  ).map(([process, roles]) => {
                    const isPrimary = roles.primary_agent === selectedAgent.agent_id;
                    return (
                      <div key={process} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full ${isPrimary ? 'bg-purple-600' : 'bg-purple-300'}`} />
                        <div>
                          <div className="text-sm font-bold text-slate-800">{process}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {isPrimary ? 'Primary Owner' : 'Supporting Role'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {Object.entries(mapping).filter(([_, val]) => 
                  val.primary_agent === selectedAgent.agent_id || 
                  val.supporting_agents.includes(selectedAgent.agent_id)
                ).length === 0 && (
                  <div className="text-center p-8 text-slate-400 text-sm italic">
                    No PMBOK processes currently mapped to this agent.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
