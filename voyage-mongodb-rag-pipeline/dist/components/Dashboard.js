"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RAGDashboard;
const react_1 = __importStar(require("react"));
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const progress_1 = require("@/components/ui/progress");
const tabs_1 = require("@/components/ui/tabs");
const recharts_1 = require("recharts");
function RAGDashboard() {
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    const [realtimeData, setRealtimeData] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [selectedTimeRange, setSelectedTimeRange] = (0, react_1.useState)('1h');
    (0, react_1.useEffect)(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
    }, []);
    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/dashboard/metrics');
            const data = await response.json();
            setMetrics(data.metrics);
            // Update realtime data
            setRealtimeData(prev => {
                const newData = [...prev, {
                        timestamp: new Date().toLocaleTimeString(),
                        embeddingLatency: data.embeddings.averageEmbeddingTime,
                        searchLatency: data.search.averageLatency,
                        ragLatency: data.rag.averageResponseTime,
                        queriesPerSecond: Math.random() * 10 // Mock data
                    }];
                return newData.slice(-20); // Keep last 20 data points
            });
            setLoading(false);
        }
        catch (error) {
            console.error('Failed to fetch metrics:', error);
            setLoading(false);
        }
    };
    if (loading) {
        return (<div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>);
    }
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    return (<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">RAG Pipeline Dashboard</h1>
        <div className="flex items-center space-x-4">
          <badge_1.Badge variant="outline" className="text-green-600">
            ● System Healthy
          </badge_1.Badge>
          <select value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)} className="px-3 py-1 border rounded-md">
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Total Documents</card_1.CardTitle>
            <div className="h-4 w-4 text-blue-600">📄</div>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{metrics?.embeddings.totalDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.embeddings.totalChunks || 0} chunks generated
            </p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Avg Query Time</card_1.CardTitle>
            <div className="h-4 w-4 text-green-600">⚡</div>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{metrics?.rag.averageResponseTime || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              Last 100 queries
            </p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">Success Rate</card_1.CardTitle>
            <div className="h-4 w-4 text-green-600">✅</div>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{metrics?.embeddings.successRate || 0}%</div>
            <progress_1.Progress value={metrics?.embeddings.successRate || 0} className="mt-2"/>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">API Rate Limit</card_1.CardTitle>
            <div className="h-4 w-4 text-orange-600">📊</div>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {metrics?.system.apiRateLimits.current || 0}/{metrics?.system.apiRateLimits.limit || 0}
            </div>
            <progress_1.Progress value={(metrics?.system.apiRateLimits.current || 0) / (metrics?.system.apiRateLimits.limit || 1) * 100} className="mt-2"/>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Detailed Analytics */}
      <tabs_1.Tabs defaultValue="performance" className="space-y-4">
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="performance">Performance</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="embeddings">Embeddings</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="search">Search Analytics</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="system">System Health</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Response Time Trends</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <recharts_1.ResponsiveContainer width="100%" height={300}>
                  <recharts_1.LineChart data={realtimeData}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                    <recharts_1.XAxis dataKey="timestamp"/>
                    <recharts_1.YAxis />
                    <recharts_1.Tooltip />
                    <recharts_1.Line type="monotone" dataKey="embeddingLatency" stroke="#8884d8" name="Embedding (ms)"/>
                    <recharts_1.Line type="monotone" dataKey="searchLatency" stroke="#82ca9d" name="Search (ms)"/>
                    <recharts_1.Line type="monotone" dataKey="ragLatency" stroke="#ffc658" name="RAG (ms)"/>
                  </recharts_1.LineChart>
                </recharts_1.ResponsiveContainer>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Query Volume</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <recharts_1.ResponsiveContainer width="100%" height={300}>
                  <recharts_1.BarChart data={realtimeData}>
                    <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                    <recharts_1.XAxis dataKey="timestamp"/>
                    <recharts_1.YAxis />
                    <recharts_1.Tooltip />
                    <recharts_1.Bar dataKey="queriesPerSecond" fill="#8884d8"/>
                  </recharts_1.BarChart>
                </recharts_1.ResponsiveContainer>
              </card_1.CardContent>
            </card_1.Card>
          </div>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="embeddings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Embedding Statistics</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Processing Speed:</span>
                  <span className="font-medium">{metrics?.embeddings.processingSpeed || 0} docs/min</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Embedding Time:</span>
                  <span className="font-medium">{metrics?.embeddings.averageEmbeddingTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-medium">{metrics?.embeddings.successRate || 0}%</span>
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Document Types</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <recharts_1.ResponsiveContainer width="100%" height={200}>
                  <recharts_1.PieChart>
                    <recharts_1.Pie data={[
            { name: 'PDF', value: 400 },
            { name: 'DOCX', value: 300 },
            { name: 'TXT', value: 200 },
            { name: 'MD', value: 100 }
        ]} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                      {[
            { name: 'PDF', value: 400 },
            { name: 'DOCX', value: 300 },
            { name: 'TXT', value: 200 },
            { name: 'MD', value: 100 }
        ].map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>))}
                    </recharts_1.Pie>
                    <recharts_1.Tooltip />
                  </recharts_1.PieChart>
                </recharts_1.ResponsiveContainer>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Chunk Distribution</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <recharts_1.ResponsiveContainer width="100%" height={200}>
                  <recharts_1.BarChart data={[
            { size: 'Small', count: 120 },
            { size: 'Medium', count: 80 },
            { size: 'Large', count: 40 }
        ]}>
                    <recharts_1.XAxis dataKey="size"/>
                <recharts_1.YAxis />
                <recharts_1.Tooltip />
                <recharts_1.Bar dataKey="count" fill="#82ca9d"/>
              </recharts_1.BarChart>
            </recharts_1.ResponsiveContainer>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </tabs_1.TabsContent>

    <tabs_1.TabsContent value="search" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Search Performance</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Queries:</span>
              <span className="font-medium">{metrics?.search.totalQueries || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Latency:</span>
              <span className="font-medium">{metrics?.search.averageLatency || 0}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Result Relevance:</span>
              <span className="font-medium">{metrics?.search.resultRelevance || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Cache Hit Rate:</span>
              <span className="font-medium">{metrics?.search.cacheHitRate || 0}%</span>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Query Categories</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <recharts_1.ResponsiveContainer width="100%" height={200}>
              <recharts_1.PieChart>
                <recharts_1.Pie data={[
            { name: 'Project Management', value: 35 },
            { name: 'Technical', value: 25 },
            { name: 'Business', value: 20 },
            { name: 'General', value: 20 }
        ]} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                  {[
            { name: 'Project Management', value: 35 },
            { name: 'Technical', value: 25 },
            { name: 'Business', value: 20 },
            { name: 'General', value: 20 }
        ].map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>))}
                </recharts_1.Pie>
                <recharts_1.Tooltip />
              </recharts_1.PieChart>
            </recharts_1.ResponsiveContainer>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </tabs_1.TabsContent>

    <tabs_1.TabsContent value="system" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>System Resources</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Memory Usage</span>
                <span>{metrics?.system.memoryUsage || 0}%</span>
              </div>
              <progress_1.Progress value={metrics?.system.memoryUsage || 0}/>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span>Database Connections</span>
                <span>{metrics?.system.databaseConnections || 0}</span>
              </div>
              <progress_1.Progress value={(metrics?.system.databaseConnections || 0) / 10 * 100}/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>API Status</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>MongoDB Atlas:</span>
              <badge_1.Badge variant="outline" className="text-green-600">Connected</badge_1.Badge>
            </div>
            <div className="flex justify-between">
              <span>Mistral AI:</span>
              <badge_1.Badge variant="outline" className="text-green-600">Active</badge_1.Badge>
            </div>
            <div className="flex justify-between">
              <span>Google AI:</span>
              <badge_1.Badge variant="outline" className="text-yellow-600">Limited</badge_1.Badge>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Recent Activity</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Last Embedding:</span>
                <span>2 min ago</span>
              </div>
              <div className="flex justify-between">
                <span>Last Search:</span>
                <span>30 sec ago</span>
              </div>
              <div className="flex justify-between">
                <span>Last RAG Query:</span>
                <span>1 min ago</span>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </tabs_1.TabsContent>
  </tabs_1.Tabs>
    </div>);
}
//# sourceMappingURL=Dashboard.js.map