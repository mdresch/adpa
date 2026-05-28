import React from "react"
import { 
  Users, AlertTriangle, Box, Flag, Shield, Briefcase, FileText, 
  CheckCircle2, ListTodo, Award, Lightbulb, Target, Layers, 
  Activity, TrendingUp, Cpu, Users2, Calendar, ClipboardCheck, 
  BarChart3, RefreshCw, Zap
} from "lucide-react"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"

interface EntityPillProps {
  type: string
  data: Record<string, any>
}

// Map entity types to specific colors and icons
const getEntityConfig = (type: string) => {
  const t = type.toLowerCase()
  
  if (t === "stakeholders") return { icon: Users, colorClass: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200" }
  if (t === "risks") return { icon: AlertTriangle, colorClass: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200" }
  if (t === "deliverables") return { icon: Box, colorClass: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200" }
  if (t === "milestones") return { icon: Flag, colorClass: "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200" }
  if (t === "constraints") return { icon: Shield, colorClass: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200" }
  if (t === "requirements") return { icon: CheckCircle2, colorClass: "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200" }
  if (t === "resources") return { icon: Briefcase, colorClass: "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200" }
  
  // Expanded types for User Stories & Strategy
  if (t === "activities" || t === "work_items") return { icon: ListTodo, colorClass: "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200" }
  if (t === "success_criteria" || t === "scope_verification") return { icon: Award, colorClass: "bg-emerald-100 text-green-800 border-emerald-300 hover:bg-emerald-200" }
  if (t === "best_practices" || t === "opportunities") return { icon: Lightbulb, colorClass: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" }
  if (t === "scope_items") return { icon: Target, colorClass: "bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200" }
  if (t === "phases" || t === "project_iterations") return { icon: Layers, colorClass: "bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200" }
  if (t === "performance_measurements" || t === "earned_value_metrics") return { icon: TrendingUp, colorClass: "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200" }
  if (t === "technologies") return { icon: Cpu, colorClass: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200" }
  if (t === "team_agreements") return { icon: Users2, colorClass: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 hover:bg-fuchsia-200" }
  if (t === "capacity_plans") return { icon: Calendar, colorClass: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200" }
  if (t === "risk_responses") return { icon: Zap, colorClass: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200" }
  
  return { icon: FileText, colorClass: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200" }
}


export function EntityPill({ type, data }: EntityPillProps) {
  const { icon: Icon, colorClass } = getEntityConfig(type)

  // Derive a display name if possible, falling back to the entity type
  const displayName = data.name || data.title || type

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="inline-block mx-1">
          <Badge
            variant="outline"
            className={`cursor-pointer transition-colors flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border ${colorClass}`}
          >
            <Icon className="w-3 h-3" />
            <span>{displayName}</span>
          </Badge>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 shadow-lg border-gray-200" side="top" align="start">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-semibold capitalize flex items-center gap-2 text-gray-900">
            <Icon className="w-4 h-4 text-gray-500" />
            {type.replace(/_/g, " ")}
          </h4>
        </div>
        <div className="space-y-1.5 text-sm max-h-[400px] overflow-y-auto">
          <NestedObjectRenderer data={data} />
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

function NestedObjectRenderer({ data, depth = 0 }: { data: Record<string, any>; depth?: number }) {
  return (
    <div className={`space-y-1 ${depth > 0 ? "pl-2 ml-1 border-l-2 border-gray-100" : ""}`}>
      {Object.entries(data).map(([key, value]) => {
        if (value === undefined || value === null || value === "") return null

        const isObject = typeof value === "object" && value !== null
        const isArray = Array.isArray(value)

        return (
          <div key={key} className={`py-1 ${depth === 0 ? "border-b border-gray-100 last:border-0" : ""}`}>
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-500 font-medium capitalize text-xs">
                {key.replace(/_/g, " ")}
              </span>
              {isObject ? (
                isArray ? (
                  <div className="space-y-1 mt-1">
                    {value.map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-1.5 rounded text-xs text-gray-800 break-words">
                        {typeof item === "object" && item !== null ? <NestedObjectRenderer data={item} depth={depth + 1} /> : String(item)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 bg-gray-50 p-1.5 rounded">
                    <NestedObjectRenderer data={value} depth={depth + 1} />
                  </div>
                )
              ) : (
                <span className="text-gray-800 break-words text-xs">
                  {String(value)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
