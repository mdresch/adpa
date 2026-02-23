'use client'
import Image from 'next/image'
import { PlusCircle } from 'lucide-react'
import type { SerperSearchResultItem } from '@/lib/morphic/types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Card, CardContent } from './ui/card'
import { VideoCarouselDialog } from './video-carousel-dialog'

interface VideoResultGridProps { videos: SerperSearchResultItem[]; query: string; displayMode: 'chat' | 'artifact' }

export function VideoResultGrid({ videos, query, displayMode }: VideoResultGridProps) {
    const itemsToMap = displayMode === 'chat' ? videos.slice(0, 4) : videos
    return (
        <div className={displayMode === 'chat' ? 'flex flex-wrap' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
            {itemsToMap.map((video, index) => {
                const baseUrl = video.imageUrl ? video.imageUrl.split('?')[0] : ''
                const showOverlay = displayMode === 'chat' && index === 3 && videos.length > 4
                return (
                    <VideoCarouselDialog key={video.link || index} videos={videos} query={query} initialIndex={index}>
                        <div className={`relative cursor-pointer ${displayMode === 'chat' ? 'w-1/2 md:w-1/4 p-1' : ''}`}>
                            <Card className="flex-1 min-h-40 overflow-hidden rounded-lg border hover:shadow-xs transition-shadow">
                                <CardContent className="p-0">
                                    {baseUrl && <div className="relative w-full aspect-video bg-muted"><Image src={baseUrl} alt={video.title} fill className="object-cover" /></div>}
                                    <div className="p-2">
                                        <p className="text-xs line-clamp-2 mb-1 font-semibold">{video.title}</p>
                                        <div className="flex items-center space-x-2">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={`https://www.google.com/s2/favicons?domain=${new URL(video.link).hostname}`} alt={video.channel || video.source} />
                                                <AvatarFallback>{new URL(video.link).hostname[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="text-xs text-muted-foreground opacity-60 truncate">{video.channel || video.source || new URL(video.link).hostname}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            {showOverlay && <div className="absolute inset-0 bg-black/30 rounded-md flex items-center justify-center text-white/80"><PlusCircle size={24} /></div>}
                        </div>
                    </VideoCarouselDialog>
                )
            })}
        </div>
    )
}
