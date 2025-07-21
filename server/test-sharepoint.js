const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// Test SharePoint connection endpoint
app.post('/api/integrations/sharepoint/test', async (req, res) => {
  try {
    console.log('SharePoint test endpoint hit!')
    console.log('Request body:', req.body)
    
    const { tenantId, clientId, clientSecret } = req.body

    if (!tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: tenantId, clientId, clientSecret' 
      })
    }

    // Test Azure authentication directly
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    
    const params = new URLSearchParams()
    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)
    params.append('scope', 'https://graph.microsoft.com/.default')
    params.append('grant_type', 'client_credentials')

    console.log('Attempting Azure authentication...')
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    console.log('Azure authentication successful!')

    // Test Graph API access
    console.log('Testing Graph API access...')
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/sites?$top=5', {
      headers: { 'Authorization': 'Bearer ' + response.data.access_token }
    })

    const sites = graphResponse.data.value || []
    console.log(`Found ${sites.length} SharePoint sites`)

    res.json({ 
      success: true, 
      message: 'SharePoint connection successful',
      sitesFound: sites.length,
      sites: sites.map(site => ({
        id: site.id,
        name: site.displayName || site.name,
        webUrl: site.webUrl
      }))
    })

  } catch (error) {
    console.error('SharePoint connection test failed:', error.response?.data || error.message)
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error_description || error.message || 'Connection test failed' 
    })
  }
})

// Mock integrations endpoint
app.get('/api/integrations', (req, res) => {
  console.log('Mock integrations endpoint hit')
  res.json([
    {
      id: 'sharepoint-1',
      name: 'Microsoft SharePoint',
      type: 'sharepoint',
      is_active: false,
      configuration: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ])
})

// Mock SharePoint sites endpoint
app.get('/api/integrations/sharepoint/:id/sites', (req, res) => {
  console.log(`Mock sites endpoint hit for integration ${req.params.id}`)
  res.json({
    success: true,
    sites: [
      {
        id: 'site-1',
        name: 'Requirements Gathering Agent',
        webUrl: 'https://cbadmin.sharepoint.com/sites/RequirementsGatheringAgent'
      },
      {
        id: 'site-2',
        name: 'My Portfolio Menno',
        webUrl: 'https://cbadmin.sharepoint.com/sites/MyPortfolioMenno'
      }
    ]
  })
})

// Mock SharePoint drives endpoint
app.get('/api/integrations/sharepoint/:id/sites/:siteId/drives', (req, res) => {
  console.log(`Mock drives endpoint hit for site ${req.params.siteId}`)
  res.json({
    success: true,
    drives: [
      {
        id: 'drive-1',
        name: 'Documents',
        webUrl: 'https://cbadmin.sharepoint.com/sites/test/Shared%20Documents'
      }
    ]
  })
})

// Mock SharePoint files endpoint
app.get('/api/integrations/sharepoint/:id/drives/:driveId/files', (req, res) => {
  console.log(`Mock files endpoint hit for drive ${req.params.driveId}`)
  res.json({
    success: true,
    files: [
      {
        id: 'file-1',
        name: 'Sample Document.docx',
        webUrl: 'https://cbadmin.sharepoint.com/sites/test/Shared%20Documents/Sample%20Document.docx',
        size: 12345,
        lastModified: new Date().toISOString()
      }
    ]
  })
})

// Mock SharePoint sync endpoint
app.post('/api/integrations/sharepoint/:id/sync', (req, res) => {
  console.log(`Mock sync endpoint hit for integration ${req.params.id}`)
  res.json({
    success: true,
    message: 'Sync started successfully',
    jobId: 'sync-job-123'
  })
})

// Mock SharePoint search endpoint
app.get('/api/integrations/sharepoint/:id/search', (req, res) => {
  console.log(`Mock search endpoint hit for integration ${req.params.id}, query: ${req.query.query}`)
  res.json({
    success: true,
    results: [
      {
        id: 'result-1',
        title: 'Sample Search Result',
        webUrl: 'https://cbadmin.sharepoint.com/sites/test/result1',
        snippet: 'This is a sample search result snippet...'
      }
    ]
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test SharePoint server running on port ${PORT}`)
  console.log(`📊 SharePoint test endpoint: http://localhost:${PORT}/api/integrations/sharepoint/test`)
  console.log(`🔗 Mock integrations endpoint: http://localhost:${PORT}/api/integrations`)
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`)
  console.log('')
  console.log('Ready to test SharePoint integration!')
})
