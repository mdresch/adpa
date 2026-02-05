"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RAGControlPanel;
const react_1 = __importDefault(require("react"));
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const badge_1 = require("@/components/ui/badge");
const tabs_1 = require("@/components/ui/tabs");
const progress_1 = require("@/components/ui/progress");
const alert_1 = require("@/components/ui/alert");
const lucide_react_1 = require("lucide-react");
function DocumentUpload({ onUpload, uploading, uploadProgress }) {
    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files || []);
        onUpload(files);
    };
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Upload className="h-5 w-5"/>
          Document Upload
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <lucide_react_1.Upload className="h-12 w-12 mx-auto text-gray-400 mb-4"/>
          <p className="text-sm text-gray-600 mb-2">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Supports PDF, DOCX, TXT, MD files
          </p>
          <input type="file" multiple accept=".pdf,.docx,.txt,.md" onChange={handleFileSelect} disabled={uploading} className="hidden" id="file-upload"/>
          <label htmlFor="file-upload">
            <button_1.Button variant="outline" disabled={uploading} className="cursor-pointer">
              Select Files
            </button_1.Button>
          </label>
        </div>
        
        {uploading && (<div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing documents...</span>
              <span>{uploadProgress}%</span>
            </div>
            <progress_1.Progress value={uploadProgress}/>
          </div>)}
      </card_1.CardContent>
    </card_1.Card>);
}
function SearchTesting({ onSearch, searchResults, searching }) {
    const [query, setQuery] = react_1.default.useState('');
    const [maxResults, setMaxResults] = react_1.default.useState(5);
    const [includeReranking, setIncludeReranking] = react_1.default.useState(false);
    const handleSearch = () => {
        if (query.trim()) {
            onSearch(query, maxResults, includeReranking);
        }
    };
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Search className="h-5 w-5"/>
          Search Testing
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Query</label>
          <textarea_1.Textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter your search query..." rows={3}/>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Results</label>
            <input_1.Input type="number" value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} min="1" max="20"/>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="reranking" checked={includeReranking} onChange={(e) => setIncludeReranking(e.target.checked)}/>
              <label htmlFor="reranking" className="text-sm">
                Include Reranking
              </label>
            </div>
          </div>
        </div>
        
        <button_1.Button onClick={handleSearch} disabled={searching || !query.trim()} className="w-full">
          {searching ? 'Searching...' : 'Search'}
        </button_1.Button>
        
        {searchResults.length > 0 && (<div className="space-y-2">
            <h4 className="font-medium">Results ({searchResults.length})</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((result, index) => (<div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <badge_1.Badge variant="outline">
                      Score: {result.score?.toFixed(3) || 'N/A'}
                    </badge_1.Badge>
                    <badge_1.Badge variant="outline">
                      Doc: {result.documentId?.substring(0, 8)}...
                    </badge_1.Badge>
                  </div>
                  <p className="text-sm text-gray-700">
                    {result.content?.substring(0, 200)}...
                  </p>
                </div>))}
            </div>
          </div>)}
      </card_1.CardContent>
    </card_1.Card>);
}
function PerformanceMetrics({ metrics, onRunTest }) {
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Zap className="h-5 w-5"/>
          Performance Metrics
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Embedding Time</label>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.embeddings?.averageEmbeddingTime || 0}ms
            </div>
            <button_1.Button size="sm" variant="outline" onClick={() => onRunTest('embedding')}>
              Test
            </button_1.Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Time</label>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.search?.averageLatency || 0}ms
            </div>
            <button_1.Button size="sm" variant="outline" onClick={() => onRunTest('search')}>
              Test
            </button_1.Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">RAG Time</label>
            <div className="text-2xl font-bold text-purple-600">
              {metrics?.rag?.averageResponseTime || 0}ms
            </div>
            <button_1.Button size="sm" variant="outline" onClick={() => onRunTest('rag')}>
              Test
            </button_1.Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Success Rate</label>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.embeddings?.successRate || 0}%
            </div>
            <progress_1.Progress value={metrics?.embeddings?.successRate || 0} className="mt-2"/>
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
function SystemStatus({ systemHealth }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600';
            case 'warning': return 'text-yellow-600';
            case 'error': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.BarChart3 className="h-5 w-5"/>
          System Status
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">MongoDB Atlas</span>
            <badge_1.Badge className={getStatusColor('healthy')}>
              ● Connected
            </badge_1.Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Embedding Service</span>
            <badge_1.Badge className={getStatusColor('healthy')}>
              ● Active
            </badge_1.Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Vector Search</span>
            <badge_1.Badge className={getStatusColor('healthy')}>
              ● Operational
            </badge_1.Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">LLM Service</span>
            <badge_1.Badge className={getStatusColor('warning')}>
              ● Rate Limited
            </badge_1.Badge>
          </div>
        </div>
        
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span>Memory Usage</span>
            <span>{systemHealth?.memoryUsage || 0}%</span>
          </div>
          <progress_1.Progress value={systemHealth?.memoryUsage || 0}/>
          
          <div className="flex justify-between text-sm">
            <span>API Rate Limit</span>
            <span>
              {systemHealth?.apiRateLimits?.current || 0}/
              {systemHealth?.apiRateLimits?.limit || 0}
            </span>
          </div>
          <progress_1.Progress value={(systemHealth?.apiRateLimits?.current || 0) /
            (systemHealth?.apiRateLimits?.limit || 1) * 100}/>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
function RAGControlPanel() {
    const [uploading, setUploading] = react_1.default.useState(false);
    const [uploadProgress, setUploadProgress] = react_1.default.useState(0);
    const [searching, setSearching] = react_1.default.useState(false);
    const [searchResults, setSearchResults] = react_1.default.useState([]);
    const [metrics, setMetrics] = react_1.default.useState(null);
    const [systemHealth, setSystemHealth] = react_1.default.useState(null);
    react_1.default.useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);
    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/dashboard/metrics');
            const data = await response.json();
            setMetrics(data.metrics);
            setSystemHealth(data.metrics.system);
        }
        catch (error) {
            console.error('Failed to fetch metrics:', error);
        }
    };
    const handleDocumentUpload = async (files) => {
        setUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('documents', file));
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const result = await response.json();
                setUploadProgress(100);
                setTimeout(() => {
                    setUploading(false);
                    setUploadProgress(0);
                    fetchMetrics(); // Refresh metrics
                }, 1000);
            }
        }
        catch (error) {
            console.error('Upload failed:', error);
            setUploading(false);
            setUploadProgress(0);
        }
    };
    const handleSearch = async (query, maxResults, includeReranking) => {
        setSearching(true);
        setSearchResults([]);
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    maxResults,
                    includeReranking
                })
            });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.results || []);
            }
        }
        catch (error) {
            console.error('Search failed:', error);
        }
        finally {
            setSearching(false);
        }
    };
    const handleRunTest = async (type) => {
        try {
            const response = await fetch('/api/dashboard/test-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, iterations: 5 })
            });
            if (response.ok) {
                const data = await response.json();
                console.log(`Performance test results for ${type}:`, data.results);
                fetchMetrics(); // Refresh metrics
            }
        }
        catch (error) {
            console.error('Performance test failed:', error);
        }
    };
    return (<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">RAG Control Panel</h1>
        <div className="flex items-center space-x-4">
          <button_1.Button variant="outline" size="sm">
            <lucide_react_1.Settings className="h-4 w-4 mr-2"/>
            Settings
          </button_1.Button>
        </div>
      </div>

      <alert_1.Alert>
        <lucide_react_1.Brain className="h-4 w-4"/>
        <alert_1.AlertDescription>
          Interactive control panel for managing your RAG pipeline. Upload documents, test search functionality, 
          and monitor performance in real-time.
        </alert_1.AlertDescription>
      </alert_1.Alert>

      <tabs_1.Tabs defaultValue="upload" className="space-y-4">
        <tabs_1.TabsList className="grid w-full grid-cols-4">
          <tabs_1.TabsTrigger value="upload">Upload</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="search">Search</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="performance">Performance</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="status">System Status</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DocumentUpload onUpload={handleDocumentUpload} uploading={uploading} uploadProgress={uploadProgress}/>
            
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Recent Uploads</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">
                    No recent uploads. Upload some documents to see them here.
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="search" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SearchTesting onSearch={handleSearch} searchResults={searchResults} searching={searching}/>
            
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Search Analytics</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {metrics?.search?.totalQueries || 0}
                      </div>
                      <div className="text-sm text-gray-500">Total Queries</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {metrics?.search?.averageLatency || 0}ms
                      </div>
                      <div className="text-sm text-gray-500">Avg Latency</div>
                    </div>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="performance" className="space-y-4">
          <PerformanceMetrics metrics={metrics} onRunTest={handleRunTest}/>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="status" className="space-y-4">
          <SystemStatus systemHealth={systemHealth}/>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>
    </div>);
}
//# sourceMappingURL=ControlPanel.js.map