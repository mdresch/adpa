import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Search, Brain, Zap, BarChart3, Settings } from 'lucide-react';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
  uploading: boolean;
  uploadProgress: number;
}

function DocumentUpload({ onUpload, uploading, uploadProgress }: DocumentUploadProps) {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    onUpload(files);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Supports PDF, DOCX, TXT, MD files
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" disabled={uploading} className="cursor-pointer">
              Select Files
            </Button>
          </label>
        </div>
        
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing documents...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SearchTestingProps {
  onSearch: (query: string, maxResults: number, includeReranking: boolean) => void;
  searchResults: any[];
  searching: boolean;
}

function SearchTesting({ onSearch, searchResults, searching }: SearchTestingProps) {
  const [query, setQuery] = React.useState('');
  const [maxResults, setMaxResults] = React.useState(5);
  const [includeReranking, setIncludeReranking] = React.useState(false);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query, maxResults, includeReranking);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Query</label>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Results</label>
            <Input
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              min="1"
              max="20"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reranking"
                checked={includeReranking}
                onChange={(e) => setIncludeReranking(e.target.checked)}
              />
              <label htmlFor="reranking" className="text-sm">
                Include Reranking
              </label>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleSearch} 
          disabled={searching || !query.trim()}
          className="w-full"
        >
          {searching ? 'Searching...' : 'Search'}
        </Button>
        
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Results ({searchResults.length})</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">
                      Score: {result.score?.toFixed(3) || 'N/A'}
                    </Badge>
                    <Badge variant="outline">
                      Doc: {result.documentId?.substring(0, 8)}...
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">
                    {result.content?.substring(0, 200)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PerformanceMetricsProps {
  metrics: any;
  onRunTest: (type: string) => void;
}

function PerformanceMetrics({ metrics, onRunTest }: PerformanceMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Embedding Time</label>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.embeddings?.averageEmbeddingTime || 0}ms
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRunTest('embedding')}
            >
              Test
            </Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Time</label>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.search?.averageLatency || 0}ms
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRunTest('search')}
            >
              Test
            </Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">RAG Time</label>
            <div className="text-2xl font-bold text-purple-600">
              {metrics?.rag?.averageResponseTime || 0}ms
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRunTest('rag')}
            >
              Test
            </Button>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Success Rate</label>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.embeddings?.successRate || 0}%
            </div>
            <Progress value={metrics?.embeddings?.successRate || 0} className="mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SystemStatusProps {
  systemHealth: any;
}

function SystemStatus({ systemHealth }: SystemStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">MongoDB Atlas</span>
            <Badge className={getStatusColor('healthy')}>
              ● Connected
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Embedding Service</span>
            <Badge className={getStatusColor('healthy')}>
              ● Active
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Vector Search</span>
            <Badge className={getStatusColor('healthy')}>
              ● Operational
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">LLM Service</span>
            <Badge className={getStatusColor('warning')}>
              ● Rate Limited
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span>Memory Usage</span>
            <span>{systemHealth?.memoryUsage || 0}%</span>
          </div>
          <Progress value={systemHealth?.memoryUsage || 0} />
          
          <div className="flex justify-between text-sm">
            <span>API Rate Limit</span>
            <span>
              {systemHealth?.apiRateLimits?.current || 0}/
              {systemHealth?.apiRateLimits?.limit || 0}
            </span>
          </div>
          <Progress 
            value={
              (systemHealth?.apiRateLimits?.current || 0) / 
              (systemHealth?.apiRateLimits?.limit || 1) * 100
            } 
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RAGControlPanel() {
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState([]);
  const [metrics, setMetrics] = React.useState(null);
  const [systemHealth, setSystemHealth] = React.useState(null);

  React.useEffect(() => {
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
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const handleDocumentUpload = async (files: File[]) => {
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
    } catch (error) {
      console.error('Upload failed:', error);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSearch = async (query: string, maxResults: number, includeReranking: boolean) => {
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
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleRunTest = async (type: string) => {
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
    } catch (error) {
      console.error('Performance test failed:', error);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">RAG Control Panel</h1>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          Interactive control panel for managing your RAG pipeline. Upload documents, test search functionality, 
          and monitor performance in real-time.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DocumentUpload
              onUpload={handleDocumentUpload}
              uploading={uploading}
              uploadProgress={uploadProgress}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">
                    No recent uploads. Upload some documents to see them here.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SearchTesting
              onSearch={handleSearch}
              searchResults={searchResults}
              searching={searching}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Search Analytics</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMetrics
            metrics={metrics}
            onRunTest={handleRunTest}
          />
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <SystemStatus systemHealth={systemHealth} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
