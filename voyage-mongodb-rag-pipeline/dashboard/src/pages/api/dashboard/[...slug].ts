import { NextApiRequest, NextApiResponse } from 'next'

// Proxy to backend dashboard API
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    const { query, ...queryParams } = req.query
    
    // Build the backend URL
    let targetUrl = `${backendUrl}/api/dashboard`
    
    if (query) {
      const queryString = new URLSearchParams(queryParams as any).toString()
      targetUrl += `?${queryString}`
    }
    
    // Make request to backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward any other headers
        ...Object.fromEntries(
          Object.entries(req.headers).filter(([key]) => 
            !['host', 'connection', 'accept-encoding', 'accept'].includes(key.toLowerCase())
          )
        )
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })
    
    const data = await response.json()
    
    // Return the response with same status
    res.status(response.status).json(data)
    
  } catch (error) {
    console.error('Dashboard API proxy error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to connect to backend service' 
    })
  }
}
