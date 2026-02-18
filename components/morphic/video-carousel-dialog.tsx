'use client'
import { useEffect, useRef, useState } from 'react'
import type { SerperSearchResultItem } from '@/lib/morphic/types'
import { Carousel, type CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

interface VideoCarouselDialogProps { children: React.ReactNode; videos: SerperSearchResultItem[]; query: string; initialIndex?: number }

export function VideoCarouselDialog({ children, videos, query, initialIndex = 0 }: VideoCarouselDialogProps) {
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(initialIndex + 1)
    const [count, setCount] = useState(0)
    const videoRefs = useRef<(HTMLIFrameElement | null)[]>([])

    useEffect(() => {
        if (api) {
            setCount(api.scrollSnapList().length)
            setCurrent(api.selectedScrollSnap() + 1)
            api.on('select', () => {
                const newCurrent = api.selectedScrollSnap() + 1
                if (current !== undefined && videoRefs.current[current - 1]) {
                    videoRefs.current[current - 1]?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
                }
                setCurrent(newCurrent)
            })
        }
    }, [api, current])

    useEffect(() => { if (api) api.scrollTo(initialIndex, false) }, [api, initialIndex])

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-auto">
                <DialogHeader><DialogTitle>Search Videos</DialogTitle><DialogDescription className="text-sm">{query}</DialogDescription></DialogHeader>
                <div className="py-4">
                    <Carousel setApi={setApi} className="w-full bg-muted max-h-[60vh]" opts={{ startIndex: initialIndex }}>
                        <CarouselContent>
                            {videos.map((video, idx) => {
                                const videoId = video.link.split('v=')[1]
                                return (
                                    <CarouselItem key={idx}>
                                        <div className="p-1 flex items-center justify-center h-full">
                                            <iframe ref={el => { videoRefs.current[idx] = el }} src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`} className="w-full aspect-video" title={video.title} allowFullScreen />
                                        </div>
                                    </CarouselItem>
                                )
                            })}
                        </CarouselContent>
                        <div className="absolute inset-8 flex items-center justify-between p-4 pointer-events-none">
                            <CarouselPrevious className="w-10 h-10 rounded-full shadow-sm pointer-events-auto" /><CarouselNext className="w-10 h-10 rounded-full shadow-sm pointer-events-auto" />
                        </div>
                    </Carousel>
                    <div className="py-2 text-center text-sm text-muted-foreground">{current} of {count}</div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
