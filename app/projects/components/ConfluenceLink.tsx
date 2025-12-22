"use client"

import React from 'react'

export function ConfluenceLink({ url }: { url?: string | null }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
      title="View in Confluence"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h4v2h-2v8h-2V7zm-5 0h4v2H8v8H6V7z" />
      </svg>
      View in Confluence
    </a>
  )
}
