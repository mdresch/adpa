'use client'

import React from 'react'

import { Card } from './ui/card'

interface VideoSearchResult {
    title: string
    url: string
    thumbnail?: string
    duration?: string
    author?: string
}

interface VideoSearchResultsProps {
    results: VideoSearchResult[]
}

export function VideoSearchResults({ results }: VideoSearchResultsProps) {
    if (results.length === 0) return null

    return (
        <div className="flex flex-wrap -m-1">
            {results.map((result, index) => (
                <div key={index} className="w-1/2 md:w-1/4 p-1">
                    <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-full group"
                    >
                        <Card className="h-full overflow-hidden hover:bg-muted/50 transition-colors">
                            <div className="aspect-video relative bg-muted overflow-hidden">
                                {result.thumbnail ? (
                                    <img
                                        src={result.thumbnail}
                                        alt={result.title}
                                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <span className="text-muted-foreground">Video</span>
                                    </div>
                                )}
                                {result.duration && (
                                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">
                                        {result.duration}
                                    </div>
                                )}
                            </div>
                            <div className="p-2">
                                <p className="text-xs font-medium line-clamp-2 leading-tight">
                                    {result.title}
                                </p>
                                {result.author && (
                                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                        {result.author}
                                    </p>
                                )}
                            </div>
                        </Card>
                    </a>
                </div>
            ))}
        </div>
    )
}

export function createVideoSearchResults(searchResults: any, query: string): VideoSearchResult[] {
    return (searchResults.videos || []).map((video: any) => ({
        title: video.title || query,
        url: video.url,
        thumbnail: video.thumbnail || video.image,
        duration: video.duration,
        author: video.author || video.publisher
    }))
}
