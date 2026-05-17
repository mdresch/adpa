"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { Users } from "lucide-react"

interface TeamComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

// Deterministic pastel background per name
const AVATAR_COLORS = [
  "bg-violet-200 text-violet-800",
  "bg-blue-200 text-blue-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-pink-200 text-pink-800",
  "bg-cyan-200 text-cyan-800",
  "bg-rose-200 text-rose-800",
  "bg-indigo-200 text-indigo-800",
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  active: "bg-emerald-500",
  away: "bg-yellow-400",
  busy: "bg-red-500",
  offline: "bg-slate-300",
}

export function TeamComponent({ props, data }: TeamComponentProps) {
  const title = (props.title as string) || "Team Members"
  const layout = (props.layout as string) || "grid" // "grid" | "list"

  const members = data.map((item) => ({
    name: (item.name || item.title || item.label || "Unknown") as string,
    role: (item.role || item.position || item.title || "") as string,
    avatar: (item.avatar || item.image || item.photo || null) as string | null,
    status: (item.status || item.availability || "") as string,
    email: (item.email || "") as string,
    badge: (item.badge || item.tag || item.department || null) as string | null,
  }))

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            {title}
          </CardTitle>
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-900">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          layout === "list" ? (
            // List layout
            <ul className="space-y-3">
              {members.map((member, idx) => (
                <li key={idx}>
                  {idx > 0 && <Separator className="mb-3" />}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10">
                        {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                        <AvatarFallback className={avatarColor(member.name)}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      {member.status && STATUS_DOT[member.status.toLowerCase()] && (
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                            STATUS_DOT[member.status.toLowerCase()]
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{member.name}</p>
                      {member.role && (
                        <p className="text-xs text-slate-500 truncate">{member.role}</p>
                      )}
                      {member.email && (
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      )}
                    </div>
                    {member.badge && (
                      <Badge variant="outline" className="flex-shrink-0 text-xs">
                        {member.badge}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            // Grid layout (default)
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {members.map((member, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center hover:bg-slate-50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                      <AvatarFallback className={`text-base font-semibold ${avatarColor(member.name)}`}>
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    {member.status && STATUS_DOT[member.status.toLowerCase()] && (
                      <span
                        className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                          STATUS_DOT[member.status.toLowerCase()]
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="font-semibold text-sm text-slate-900 truncate">{member.name}</p>
                    {member.role && (
                      <p className="text-xs text-slate-500 truncate">{member.role}</p>
                    )}
                    {member.badge && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {member.badge}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No team members to display
          </div>
        )}
      </CardContent>
    </Card>
  )
}
