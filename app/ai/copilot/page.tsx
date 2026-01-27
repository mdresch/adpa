"use client"

import { useState } from "react"

export default function CopilotPoCPage() {
  const [message, setMessage] = useState("")
  const [responses, setResponses] = useState<Array<{id:number,text:string}>>([])
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const data = await res.json()
      if (data && data.success && data.data) {
        setResponses(prev => [{ id: Date.now(), text: data.data.content }, ...prev])
      } else if (data && data.error) {
        setResponses(prev => [{ id: Date.now(), text: `Error: ${data.error}` }, ...prev])
      }
      setMessage("")
    } catch (e: any) {
      setResponses(prev => [{ id: Date.now(), text: `Request failed: ${e?.message || e}` }, ...prev])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Copilot SDK PoC Chat</h2>
      <div className="mb-4">
        <textarea
          className="w-full border rounded p-2"
          rows={4}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ask something to the Copilot PoC..."
        />
        <div className="mt-2">
          <button className="px-4 py-2 bg-primary text-white rounded" onClick={send} disabled={loading}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Responses</h3>
        <div className="space-y-3">
          {responses.map(r => (
            <div key={r.id} className="p-3 border rounded bg-gray-50">{r.text}</div>
          ))}
          {responses.length === 0 && <div className="text-muted-foreground">No responses yet.</div>}
        </div>
      </div>
    </div>
  )
}
