"use client"

import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { CalendarDays } from "lucide-react"
import { useState } from "react"

interface CalendarComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

interface CalendarEvent {
  date: Date
  label: string
  variant: "default" | "destructive"
}

export function CalendarComponent({ props, data }: CalendarComponentProps) {
  const title = (props.title as string) || "Schedule"
  const [selected, setSelected] = useState<Date | undefined>(undefined)

  // Parse data items into events: { date, label, type? }
  const events: CalendarEvent[] = data
    .map((item) => {
      const raw = (item.date || item.due || item.deadline || item.start || item.scheduled) as string
      if (!raw) return null
      const parsed = new Date(raw)
      if (isNaN(parsed.getTime())) return null
      const type = (item.type || item.priority || "") as string
      return {
        date: parsed,
        label: (item.label || item.title || item.name || raw) as string,
        variant: ["urgent", "critical", "overdue", "deadline"].includes(type.toLowerCase())
          ? "destructive"
          : "default",
      } satisfies CalendarEvent
    })
    .filter((e): e is CalendarEvent => e !== null)

  // Dates that have events (for modifier styling)
  const eventDates = events.map((e) => e.date)

  const selectedEvents = selected
    ? events.filter(
        (e) =>
          e.date.toDateString() === selected.toDateString()
      )
    : []

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          {title}
          {events.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-900">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={{ hasEvent: eventDates }}
          modifiersClassNames={{
            hasEvent:
              "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-blue-500 relative",
          }}
          className="rounded-xl border border-slate-200"
        />

        {/* Event list for selected date or all upcoming */}
        <div className="flex-1 min-w-0">
          {selected && selectedEvents.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <ul className="space-y-2">
                {selectedEvents.map((e, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        e.variant === "destructive" ? "bg-red-500" : "bg-blue-500"
                      }`}
                    />
                    {e.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : events.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                All events
              </p>
              <ul className="space-y-2">
                {events.slice(0, 8).map((e, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        e.variant === "destructive" ? "bg-red-500" : "bg-blue-500"
                      }`}
                    />
                    <span className="text-slate-500 min-w-16 text-xs">
                      {e.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span className="truncate">{e.label}</span>
                  </li>
                ))}
                {events.length > 8 && (
                  <p className="pl-2 text-xs text-slate-400">+{events.length - 8} more</p>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No events scheduled</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
