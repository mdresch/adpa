'use client'

import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Send, AlertTriangle, HelpCircle, Sparkles, Wand2 } from 'lucide-react'
import { RtmRequirement, AmendmentProposalRequest, ResearchAdvice } from '@/lib/api'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ProposeAmendmentDialogProps {
  requirement: RtmRequirement | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (request: AmendmentProposalRequest) => void
  aiAdvice?: ResearchAdvice | null
}

export function ProposeAmendmentDialog({ 
  requirement, 
  isOpen, 
  onClose, 
  onSubmit,
  aiAdvice
}: ProposeAmendmentDialogProps) {
  const [description, setDescription] = useState('')
  const [justification, setJustification] = useState('')
  const [type, setType] = useState<'REPLACEMENT' | 'EXPANSION'>('REPLACEMENT')
  const [subType, setSubType] = useState('Scope Refinement')

  // Reset or pre-fill when requirement/advice changes
  useEffect(() => {
    if (requirement) {
      setDescription(requirement.description)
      setJustification('')
      setType('REPLACEMENT')
    }
  }, [requirement])

  const applyAiAdvice = () => {
    if (!aiAdvice) return
    setDescription(aiAdvice.suggested_description)
    setJustification(aiAdvice.justification)
    setType(aiAdvice.amendment_type as 'REPLACEMENT' | 'EXPANSION')
    setSubType(aiAdvice.amendment_sub_type)
  }

  if (!requirement) return null

  const handleApply = () => {
    onSubmit({
      requirement_id: requirement.id,
      proposed_description: description || requirement.description,
      justification,
      amendment_type: type,
      amendment_sub_type: subType
    })
    // Reset state
    setDescription('')
    setJustification('')
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-0 overflow-hidden animate-in zoom-in-95 duration-200">
          
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">Propose RTM Amendment</Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 font-medium">Drafting Proposal for artifact {requirement.id.substring(0,8)}</Dialog.Description>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* Context Notice */}
            <div className="flex gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold uppercase tracking-tight overflow-hidden block mb-1">RPAS-CM Advisory Guardrail</span>
                This action creates a <span className="font-bold">PENDING</span> proposal only. It will not mutate the RTM until a Governor approves and applies the ritual in the Management Portal.
              </div>
            </div>

            {/* AI Advice Card */}
            {aiAdvice && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                  <Wand2 className="h-3.5 w-3.5" />
                  RPAS-CM Research Advice
                </div>
                
                <div className="text-sm font-medium text-slate-900 line-clamp-2 italic">
                  "{aiAdvice.suggested_description}"
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-tighter">
                      {aiAdvice.amendment_type} : Conf {Math.round(aiAdvice.confidence_score * 100)}%
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 italic text-truncate max-w-[150px]">
                      Lin: {aiAdvice.analysis_context}
                    </span>
                  </div>
                  
                  <button 
                    onClick={applyAiAdvice}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                  >
                    Apply AI Advice
                  </button>
                </div>
              </div>
            )}

            {/* Current Reference */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Original Requirement Reference</label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm italic text-slate-600">
                "{requirement.description}"
              </div>
            </div>

            {/* Taxonomy Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setType('REPLACEMENT')}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all",
                  type === 'REPLACEMENT' ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" : "bg-white border-slate-100 hover:border-slate-300"
                )}
              >
                <div className="text-sm font-bold text-slate-900 mb-1">Replacement</div>
                <div className="text-xs text-slate-500 leading-tight">This amendment should supersede the original requirement.</div>
              </div>
              <div 
                onClick={() => setType('EXPANSION')}
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all",
                  type === 'EXPANSION' ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" : "bg-white border-slate-100 hover:border-slate-300"
                )}
              >
                <div className="text-sm font-bold text-slate-900 mb-1">Expansion</div>
                <div className="text-xs text-slate-500 leading-tight">This amendment adds context without voiding the original.</div>
              </div>
            </div>

            {/* Content Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Proposed Description</label>
                <textarea 
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-slate-300"
                  rows={3}
                  placeholder="Enter the updated requirement text..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                  Justification
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                </label>
                <textarea 
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-slate-300"
                  rows={3}
                  placeholder="Explain why this change is required (Evidence, Audit, Compliance)..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Amendment Sub-Type</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                >
                  <option>Scope Refinement</option>
                  <option>Regulatory Compliance</option>
                  <option>Technical Constraint</option>
                  <option>Business Logic Update</option>
                  <option>Edge Case Definition</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply}
              disabled={!justification}
              className="px-8 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              Draft Proposal
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
