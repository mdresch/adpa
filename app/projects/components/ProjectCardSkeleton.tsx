"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SkeletonLine } from "@/components/ui/skeleton"
import { AnimatedGridItem } from "@/components/animated-layout"

export function ProjectCardSkeleton() {
  return (
    <AnimatedGridItem>
      <Card className="glass border-0 shadow-lg overflow-hidden h-full">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between">
            {/* Icon Placeholder */}
            <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl w-12 h-12 animate-pulse" />
            
            {/* Badges Placeholder */}
            <div className="flex flex-col space-y-2">
              <SkeletonLine className="h-5 w-16 rounded-full" />
              <SkeletonLine className="h-5 w-20 rounded-full" />
              <SkeletonLine className="h-5 w-14 rounded-full" />
            </div>
          </div>
          
          {/* Title Placeholder */}
          <SkeletonLine className="h-7 w-3/4" />
          
          {/* Description Placeholder */}
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-5/6" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar Placeholder */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <SkeletonLine className="h-4 w-16" />
              <SkeletonLine className="h-4 w-8" />
            </div>
            <SkeletonLine className="h-3 w-full rounded-full" />
          </div>

          {/* Timeline and Documents Placeholder */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <SkeletonLine className="h-3 w-12" />
              <SkeletonLine className="h-3 w-20" />
            </div>
            <div className="space-y-2">
              <SkeletonLine className="h-3 w-12" />
              <SkeletonLine className="h-3 w-16" />
            </div>
          </div>

          {/* Team Info Placeholder */}
          <div className="space-y-2">
            <SkeletonLine className="h-3 w-10" />
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-32" />
          </div>

          {/* Footer Placeholder */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-8 w-8 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </AnimatedGridItem>
  )
}
