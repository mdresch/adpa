"use client"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { GalleryHorizontal } from "lucide-react"

interface CarouselComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function CarouselComponent({ props, data }: CarouselComponentProps) {
  const title = (props.title as string) || "Gallery"
  const orientation = (props.orientation as "horizontal" | "vertical") || "horizontal"

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <GalleryHorizontal className="h-5 w-5 text-pink-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Carousel opts={{ align: "start" }} orientation={orientation} className="w-full">
            <CarouselContent>
              {data.map((item, idx) => (
                <CarouselItem key={idx} className="md:basis-1/2 lg:basis-1/3">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow h-full">
                    {item.label && (
                      <Badge variant="secondary" className="mb-3 bg-pink-100 text-pink-900">
                        {item.label}
                      </Badge>
                    )}
                    {item.title && (
                      <p className="font-semibold text-slate-900 mb-2">{item.title}</p>
                    )}
                    {item.description && (
                      <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                    )}
                    {item.value && (
                      <p className="mt-3 text-2xl font-bold text-pink-700">{item.value}</p>
                    )}
                    {Object.entries(item)
                      .filter(([k]) => !["title", "description", "label", "value"].includes(k))
                      .map(([key, val]) => (
                        <div key={key} className="mt-2 text-xs text-slate-500">
                          <span className="font-medium">{key}:</span> {String(val)}
                        </div>
                      ))}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No items to display in carousel
          </div>
        )}
      </CardContent>
    </Card>
  )
}
